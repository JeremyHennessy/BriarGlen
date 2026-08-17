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
const artifactDir=path.resolve('test-artifacts/build29');
fs.mkdirSync(artifactDir,{recursive:true});
const browser=await chromium.launch({headless:true});

function withParam(url,key,value){const sep=url.includes('?')?'&':'?';return `${url}${sep}${key}=${encodeURIComponent(value)}`;}

async function assertBrowserPaintsSources(page,vpName){
  const report=await page.evaluate(async()=>{
    const paths=['assets/v24/tall-tree-authored.webp','assets/v24/pine-tree-authored.webp'];
    const out={};
    for(const src of paths){
      const image=new Image();
      image.src=`${src}?decode29=${Date.now()}-${Math.random()}`;
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
  await page.goto(withParam(url,'stonepineRun',`${Date.now()}-${label}`),{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getAuthoredArtState&&window.__BRIAR_GLENDebug?.getBuildInfo),{timeout:7000});
  await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getAuthoredArtState();return s.ready||s.failed;},{timeout:7000});
}

function assertBuild29State(state,vp){
  if(state.failed||!state.productionDefault||state.rollbackRequested||state.build25ScopeRequested||state.build26ScopeRequested||state.build27ScopeRequested||state.build28ScopeRequested||!state.expanded||!state.groveExpanded||!state.fenExpanded||!state.stonepineExpanded||!state.requested||!state.enabled||!state.ready||state.mode!=='authored-stonepine-timberline')throw new Error(`${vp.name}: Build 29 Stonepine default inactive ${JSON.stringify(state)}`);
  if(state.cottageTargets?.length!==2)throw new Error(`${vp.name}: Build 29 cottage baseline drifted ${JSON.stringify(state.cottageTargets)}`);
  if(state.greenwayTreeTargets?.length!==6||state.groveTreeTargets?.length!==4||state.fenTreeTargets?.length!==4)throw new Error(`${vp.name}: approved prior authored tree baselines drifted ${JSON.stringify(state)}`);
  if(state.stonepineTreeTargets?.length!==4)throw new Error(`${vp.name}: Stonepine Timberline must target exactly four Stonepine trees ${JSON.stringify(state.stonepineTreeTargets)}`);
  if(state.authoredTreeTargets?.length!==18)throw new Error(`${vp.name}: total authored tree target count must be eighteen ${JSON.stringify(state.authoredTreeTargets)}`);
  if(new Set(state.authoredTreeTargets.map(t=>`${Math.round(t.x)},${Math.round(t.y)}`)).size!==18)throw new Error(`${vp.name}: authored tree target set contains duplicates ${JSON.stringify(state.authoredTreeTargets)}`);
  const anchors=state.stonepineTreeTargets.map(t=>t.anchor).sort().join(',');
  if(anchors!=='stonepine-camp-east,stonepine-pass-north,stonepine-quarry-east,stonepine-quarry-west')throw new Error(`${vp.name}: Stonepine target anchors drifted ${JSON.stringify(state.stonepineTreeTargets)}`);
  if(Object.keys(state.loadedStonepineAssets||{}).length!==2||Object.values(state.loadedStonepineAssets||{}).some(a=>!a.loaded))throw new Error(`${vp.name}: Stonepine authored sources not ready ${JSON.stringify(state.loadedStonepineAssets)}`);
  if(JSON.stringify(state.baseline)!==JSON.stringify(state.current))throw new Error(`${vp.name}: Stonepine rollout mutated gameplay entities ${JSON.stringify(state)}`);
}

function sitesFor(state,targets){
  return targets.map(t=>state.drawSites?.[`stonepineTree:${Math.round(t.x)},${Math.round(t.y)}`]).filter(Boolean);
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
    if(build.version!=='29'||build.label!=='Stonepine Timberline')throw new Error(`${vp.name}: incorrect Build 29 metadata ${JSON.stringify(build)}`);
    const decode=await assertBrowserPaintsSources(page,vp.name);
    let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    assertBuild29State(state,vp);

    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(2550,-1410));
    await sleep(430);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    assertBuild29State(state,vp);
    const passTargets=state.stonepineTreeTargets.filter(t=>String(t.anchor).includes('pass')||String(t.anchor).includes('camp'));
    const passSites=sitesFor(state,passTargets);
    if(passSites.length<1||passSites.some(site=>site.variant!=='stonepine-timberline-tree'||site.draws<1||site.size.w<55||site.size.w>145||site.size.h<55||site.size.h>145))throw new Error(`${vp.name}: Stonepine Pass/camp timberline did not render cleanly ${JSON.stringify(passSites)}`);
    await page.screenshot({path:path.join(artifactDir,`${vp.name}-stonepine-pass.png`),fullPage:false});

    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(3190,-1740));
    await sleep(430);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    assertBuild29State(state,vp);
    const quarryTargets=state.stonepineTreeTargets.filter(t=>String(t.anchor).includes('quarry'));
    const quarrySites=sitesFor(state,quarryTargets);
    if(quarrySites.length<1||quarrySites.some(site=>site.variant!=='stonepine-timberline-tree'||site.draws<1||site.size.w>145||site.size.h>145))throw new Error(`${vp.name}: Stonepine quarry timberline did not render cleanly ${JSON.stringify(quarrySites)}`);
    await page.screenshot({path:path.join(artifactDir,`${vp.name}-stonepine-quarry.png`),fullPage:false});

    const off=await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setAuthoredArtEnabled(false);return d.getAuthoredArtState();});
    const drawsAtDisable=off.stonepineDraws;
    if(off.enabled)throw new Error(`${vp.name}: Stonepine debug toggle failed to disable`);
    await sleep(160);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    if(state.enabled||state.stonepineDraws!==drawsAtDisable)throw new Error(`${vp.name}: disabled Stonepine renderer continued drawing`);
    await page.evaluate(()=>window.__BRIAR_GLENDebug.setAuthoredArtEnabled(true));
    await sleep(180);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    if(!state.enabled||state.stonepineDraws<=drawsAtDisable)throw new Error(`${vp.name}: Stonepine renderer did not restore`);

    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: Stonepine Timberline caused browser overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: Build 29 runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Build 29 Stonepine Pass + quarry timberline active ${JSON.stringify(decode)}`);
    await context.close();
  }
}finally{await browser.close();}
