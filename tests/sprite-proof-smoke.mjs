import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const viewports=[
  {name:'phone-landscape',width:932,height:430,touch:true},
  {name:'phone-portrait',width:430,height:932,touch:true},
  {name:'desktop',width:1440,height:900,touch:false},
];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const artifactDir=path.resolve('test-artifacts/build28');
fs.mkdirSync(artifactDir,{recursive:true});
const browser=await chromium.launch({headless:true});

function withParam(url,key,value){const sep=url.includes('?')?'&':'?';return `${url}${sep}${key}=${encodeURIComponent(value)}`;}

async function assertBrowserPaintsSources(page,vpName){
  const report=await page.evaluate(async()=>{
    const paths=['assets/v24/cottage-authored.webp','assets/v24/tall-tree-authored.webp','assets/v24/pine-tree-authored.webp'];
    const out={};
    for(const src of paths){
      const image=new Image();
      image.src=`${src}?decode28=${Date.now()}-${Math.random()}`;
      await image.decode();
      const c=document.createElement('canvas');c.width=160;c.height=160;
      const g=c.getContext('2d');
      g.drawImage(image,(160-image.naturalWidth)/2,(160-image.naturalHeight)/2);
      const patch=g.getImageData(74,74,12,12).data;
      let alpha=0,rgb=0,visible=0;
      for(let i=0;i<patch.length;i+=4){rgb+=patch[i]+patch[i+1]+patch[i+2];alpha+=patch[i+3];if(patch[i+3]>32)visible++;}
      out[src]={width:image.naturalWidth,height:image.naturalHeight,alpha,rgb,visible};
    }
    return out;
  });
  for(const [src,info] of Object.entries(report)){
    if(info.width<64||info.height<64||info.visible<20||info.alpha<3000||info.rgb<1000)throw new Error(`${vpName}: authored source decode failed ${src} ${JSON.stringify(info)}`);
  }
  return report;
}

async function openArt(page,url,label){
  await page.goto(withParam(url,'mosswaterRun',`${Date.now()}-${label}`),{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getAuthoredArtState&&window.__BRIAR_GLENDebug?.getBuildInfo),{timeout:7000});
  await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getAuthoredArtState();return s.ready||s.failed;},{timeout:7000});
}

function assertBuild28State(state,vp){
  if(state.failed||!state.productionDefault||state.rollbackRequested||state.build25ScopeRequested||state.build26ScopeRequested||state.build27ScopeRequested||!state.expanded||!state.groveExpanded||!state.fenExpanded||!state.requested||!state.enabled||!state.ready||state.mode!=='authored-mosswater-shroud')throw new Error(`${vp.name}: Build 28 Mosswater default inactive ${JSON.stringify(state)}`);
  if(state.cottageTargets?.length!==2)throw new Error(`${vp.name}: Build 28 cottage baseline drifted ${JSON.stringify(state.cottageTargets)}`);
  if(state.heroTreeTargets?.length!==2||state.greenwayTreeTargets?.length!==6||state.groveTreeTargets?.length!==4)throw new Error(`${vp.name}: approved prior tree baselines drifted ${JSON.stringify(state)}`);
  if(state.fenTreeTargets?.length!==4)throw new Error(`${vp.name}: Mosswater Shroud must target exactly four Fen trees ${JSON.stringify(state.fenTreeTargets)}`);
  if(state.authoredTreeTargets?.length!==14)throw new Error(`${vp.name}: total authored tree target count must be fourteen ${JSON.stringify(state.authoredTreeTargets)}`);
  if(new Set(state.authoredTreeTargets.map(t=>`${Math.round(t.x)},${Math.round(t.y)}`)).size!==14)throw new Error(`${vp.name}: authored tree target set contains duplicates ${JSON.stringify(state.authoredTreeTargets)}`);
  const anchors=state.fenTreeTargets.map(t=>t.anchor).sort().join(',');
  if(anchors!=='fen-crossing-deep,fen-crossing-west,fen-reliquary-east,fen-warden-north')throw new Error(`${vp.name}: Fen target anchors drifted ${JSON.stringify(state.fenTreeTargets)}`);
  if(JSON.stringify(state.baseline)!==JSON.stringify(state.current))throw new Error(`${vp.name}: Mosswater rollout mutated gameplay entities ${JSON.stringify(state)}`);
}

function sitesFor(state,targets){
  return targets.map(t=>state.drawSites?.[`fenTree:${Math.round(t.x)},${Math.round(t.y)}`]).filter(Boolean);
}

try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    await openArt(page,target,`${vp.name}-default`);
    const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
    if(build.version!=='28'||build.label!=='Mosswater Shroud')throw new Error(`${vp.name}: incorrect Build 28 metadata ${JSON.stringify(build)}`);
    const decode=await assertBrowserPaintsSources(page,vp.name);
    let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    assertBuild28State(state,vp);

    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(1090,-1375));
    await sleep(420);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    assertBuild28State(state,vp);
    const crossingTargets=state.fenTreeTargets.filter(t=>String(t.anchor).startsWith('fen-crossing'));
    const crossingSites=sitesFor(state,crossingTargets);
    if(crossingSites.length<1||crossingSites.some(site=>site.variant!=='fen-shroud-tree'||site.draws<1||site.size.w<55||site.size.w>125||site.size.h<55||site.size.h>125))throw new Error(`${vp.name}: Old Warden Crossing shroud did not render cleanly ${JSON.stringify(crossingSites)}`);
    await page.screenshot({path:path.join(artifactDir,`${vp.name}-fen-crossing.png`),fullPage:false});

    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(1640,-1660));
    await sleep(420);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    assertBuild28State(state,vp);
    const wardenTargets=state.fenTreeTargets.filter(t=>String(t.anchor).startsWith('fen-warden')||String(t.anchor).startsWith('fen-reliquary'));
    const wardenSites=sitesFor(state,wardenTargets);
    if(wardenSites.length<1||wardenSites.some(site=>site.variant!=='fen-shroud-tree'||site.draws<1||site.size.w>125||site.size.h>125))throw new Error(`${vp.name}: Drowned Warden/reliquary shroud did not render cleanly ${JSON.stringify(wardenSites)}`);
    await page.screenshot({path:path.join(artifactDir,`${vp.name}-fen-reliquary.png`),fullPage:false});

    const off=await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setAuthoredArtEnabled(false);return d.getAuthoredArtState();});
    const drawsAtDisable=off.draws;
    if(off.enabled)throw new Error(`${vp.name}: Mosswater debug toggle failed to disable`);
    await sleep(160);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    if(state.enabled||state.draws!==drawsAtDisable)throw new Error(`${vp.name}: disabled Mosswater renderer continued drawing`);
    await page.evaluate(()=>window.__BRIAR_GLENDebug.setAuthoredArtEnabled(true));
    await sleep(180);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    if(!state.enabled||state.draws<=drawsAtDisable)throw new Error(`${vp.name}: Mosswater renderer did not restore`);

    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: Mosswater Shroud caused browser overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: Build 28 runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Build 28 Old Warden Crossing + reliquary shroud active ${JSON.stringify(decode)}`);
    await context.close();
  }
}finally{await browser.close();}
