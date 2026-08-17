import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const viewports = [
  { name:'phone-landscape', width:932, height:430, touch:true },
  { name:'phone-portrait', width:430, height:932, touch:true },
  { name:'desktop', width:1440, height:900, touch:false },
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const artifactDir = path.resolve('test-artifacts/build26');
fs.mkdirSync(artifactDir, { recursive:true });
const browser = await chromium.launch({ headless:true });

function withParam(url,key,value){
  const sep=url.includes('?')?'&':'?';
  return `${url}${sep}${key}=${encodeURIComponent(value)}`;
}

async function assertBrowserPaintsSources(page,vpName){
  const report=await page.evaluate(async()=>{
    const paths=['assets/v24/cottage-authored.webp','assets/v24/tall-tree-authored.webp','assets/v24/pine-tree-authored.webp'];
    const out={};
    for(const src of paths){
      const image=new Image();
      image.src=`${src}?decode26=${Date.now()}-${Math.random()}`;
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
  await page.goto(withParam(url,'greenwayRun',`${Date.now()}-${label}`),{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getAuthoredArtState&&window.__BRIAR_GLENDebug?.getBuildInfo),{timeout:7000});
  await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getAuthoredArtState();return s.ready||s.failed;},{timeout:7000});
}

function assertBuild26State(state,vp){
  if(state.failed||!state.productionDefault||state.rollbackRequested||state.build25ScopeRequested||!state.expanded||!state.requested||!state.enabled||!state.ready||state.mode!=='authored-greenway')throw new Error(`${vp.name}: Build 26 Greenway default inactive ${JSON.stringify(state)}`);
  if(state.cottageTargets?.length!==2)throw new Error(`${vp.name}: Build 26 must target Warden + Willow cottages ${JSON.stringify(state.cottageTargets)}`);
  if(state.heroTreeTargets?.length!==2)throw new Error(`${vp.name}: Build 25 Warden tree pair drifted ${JSON.stringify(state.heroTreeTargets)}`);
  if(state.willowTreeTargets?.length!==2)throw new Error(`${vp.name}: Willow cluster must target two trees ${JSON.stringify(state.willowTreeTargets)}`);
  if(state.meadowTreeTargets?.length!==2)throw new Error(`${vp.name}: Meadow Road must target two trees ${JSON.stringify(state.meadowTreeTargets)}`);
  if(state.greenwayTreeTargets?.length!==6)throw new Error(`${vp.name}: Greenway must contain exactly six authored trees ${JSON.stringify(state.greenwayTreeTargets)}`);
  if(new Set(state.greenwayTreeTargets.map(t=>`${Math.round(t.x)},${Math.round(t.y)}`)).size!==6)throw new Error(`${vp.name}: Greenway tree selection contains duplicates ${JSON.stringify(state.greenwayTreeTargets)}`);
  if(JSON.stringify(state.baseline)!==JSON.stringify(state.current))throw new Error(`${vp.name}: Greenway rollout mutated gameplay entities ${JSON.stringify(state)}`);
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
    if(build.version!=='26'||build.label!=='Briar Glen Greenway')throw new Error(`${vp.name}: incorrect Build 26 metadata ${JSON.stringify(build)}`);
    const decode=await assertBrowserPaintsSources(page,vp.name);
    let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    assertBuild26State(state,vp);

    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(-575,-330));
    await sleep(350);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    assertBuild26State(state,vp);
    const warden=state.drawSites?.['cottage:-575,-365'];
    if(!warden||warden.variant!=='warden'||warden.draws<1)throw new Error(`${vp.name}: approved Warden House draw drifted ${JSON.stringify(warden)}`);

    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(-905,300));
    await sleep(400);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    const willow=state.drawSites?.['cottage:-905,330'];
    if(!willow||willow.variant!=='willow'||willow.draws<1)throw new Error(`${vp.name}: Willow Cottage authored draw missing ${JSON.stringify(state.drawSites)}`);
    if(willow.size.w<90||willow.size.w>160||willow.size.h<90||willow.size.h>160)throw new Error(`${vp.name}: Willow Cottage scale outside Greenway range ${JSON.stringify(willow)}`);
    await page.screenshot({path:path.join(artifactDir,`${vp.name}-willow.png`),fullPage:false});

    const meadowTarget=state.meadowTreeTargets[0];
    await page.evaluate(({x,y})=>window.__BRIAR_GLENDebug.teleport(x,y),meadowTarget);
    await sleep(400);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    const meadowKey=`tree:${Math.round(meadowTarget.x)},${Math.round(meadowTarget.y)}`;
    const meadowSite=state.drawSites?.[meadowKey];
    if(!meadowSite||meadowSite.variant!=='greenway-tree'||meadowSite.draws<1)throw new Error(`${vp.name}: Meadow Road authored tree missing ${meadowKey} ${JSON.stringify(state.drawSites)}`);
    if(meadowSite.size.w>135||meadowSite.size.h>135)throw new Error(`${vp.name}: Meadow Road tree too visually dominant ${JSON.stringify(meadowSite)}`);
    await page.screenshot({path:path.join(artifactDir,`${vp.name}-meadow.png`),fullPage:false});

    const off=await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setAuthoredArtEnabled(false);return d.getAuthoredArtState();});
    const drawsAtDisable=off.draws;
    if(off.enabled)throw new Error(`${vp.name}: Greenway debug toggle failed to disable`);
    await sleep(160);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    if(state.enabled||state.draws!==drawsAtDisable)throw new Error(`${vp.name}: disabled Greenway renderer continued drawing`);
    await page.evaluate(()=>window.__BRIAR_GLENDebug.setAuthoredArtEnabled(true));
    await sleep(180);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    if(!state.enabled||state.draws<=drawsAtDisable)throw new Error(`${vp.name}: Greenway renderer did not restore`);

    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: Greenway caused browser overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: Build 26 runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Build 26 Willow + Meadow Greenway active ${JSON.stringify(decode)}`);
    await context.close();
  }
}finally{
  await browser.close();
}
