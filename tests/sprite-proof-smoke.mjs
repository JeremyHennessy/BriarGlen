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
const artifactDir=path.resolve('test-artifacts/build30');
fs.mkdirSync(artifactDir,{recursive:true});
const browser=await chromium.launch({headless:true});

function withParam(url,key,value){const sep=url.includes('?')?'&':'?';return `${url}${sep}${key}=${encodeURIComponent(value)}`;}

async function assertBrowserPaintsSources(page,vpName){
  const report=await page.evaluate(async()=>{
    const paths=[
      'assets/v30/hollow-rock-authored.svg',
      'assets/v30/dead-tree-authored.svg',
      'assets/v30/copper-ore-authored.svg',
      'assets/v30/den-rock-authored.svg',
      'assets/v30/ember-cluster-authored.svg',
    ];
    const out={};
    for(const src of paths){
      const image=new Image();
      image.src=`${src}?decode30=${Date.now()}-${Math.random()}`;
      await image.decode();
      const c=document.createElement('canvas');c.width=180;c.height=180;
      const g=c.getContext('2d');
      const scale=Math.min(150/image.naturalWidth,150/image.naturalHeight);
      const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
      g.drawImage(image,(180-w)/2,(180-h)/2,w,h);
      const data=g.getImageData(0,0,180,180).data;
      let alpha=0,rgb=0,visible=0;
      for(let i=0;i<data.length;i+=4){
        if(data[i+3]>24){visible++;alpha+=data[i+3];rgb+=data[i]+data[i+1]+data[i+2];}
      }
      out[src]={width:image.naturalWidth,height:image.naturalHeight,alpha,rgb,visible};
    }
    return out;
  });
  for(const [src,info] of Object.entries(report)){
    if(info.width<80||info.height<80||info.visible<400||info.alpha<50000||info.rgb<25000)throw new Error(`${vpName}: Build 30 authored source decode failed ${src} ${JSON.stringify(info)}`);
  }
  return report;
}

async function openArt(page,url,label){
  await page.goto(withParam(url,'copperEmberRun',`${Date.now()}-${label}`),{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getAuthoredArtState&&window.__BRIAR_GLENDebug?.getBuildInfo),{timeout:7000});
  await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getAuthoredArtState();return s.ready||s.failed;},{timeout:9000});
}

function assertBuild30State(state,vp){
  if(state.failed||!state.productionDefault||state.rollbackRequested||state.build25ScopeRequested||state.build26ScopeRequested||state.build27ScopeRequested||state.build28ScopeRequested||state.build29ScopeRequested||!state.expanded||!state.groveExpanded||!state.fenExpanded||!state.stonepineExpanded||!state.hollowDenExpanded||!state.enabled||!state.ready||state.mode!=='authored-copper-ember')throw new Error(`${vp.name}: Build 30 Copper & Ember default inactive ${JSON.stringify(state)}`);
  if(state.authoredTreeTargets?.length!==18||state.stonepineTreeTargets?.length!==4)throw new Error(`${vp.name}: Build 29 tree baseline drifted ${JSON.stringify(state)}`);
  if(state.hollowDenObjectTargets?.length!==6||state.hollowOreTargets?.length!==2||state.authoredEnvironmentTargets?.length!==8)throw new Error(`${vp.name}: Build 30 environment target family incomplete ${JSON.stringify(state)}`);
  const anchors=state.authoredEnvironmentTargets.map(t=>t.anchor).sort().join(',');
  const expected='den-boss-ember,den-rootway-rock,den-threshold-ember,den-threshold-rock,hollow-copper-rock,hollow-dead-tree,hollow-ore-east,hollow-ore-west';
  if(anchors!==expected)throw new Error(`${vp.name}: Build 30 environment anchors drifted ${JSON.stringify(state.authoredEnvironmentTargets)}`);
  if(JSON.stringify(state.baseline)!==JSON.stringify(state.current))throw new Error(`${vp.name}: Copper & Ember mutated gameplay entities ${JSON.stringify(state)}`);
}

function siteFor(state,target){
  const prefix=target.kind==='resource'?'resource':'object';
  return state.drawSites?.[`${prefix}:${target.type}:${Math.round(target.x)},${Math.round(target.y)}`];
}

try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    page.on('requestfailed',r=>errors.push(`requestfailed: ${r.url()} • ${r.failure()?.errorText||'unknown'}`));
    await openArt(page,target,`${vp.name}-default`);
    const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
    if(build.version!=='30'||build.label!=='Copper & Ember')throw new Error(`${vp.name}: incorrect Build 30 metadata ${JSON.stringify(build)}`);
    const decode=await assertBrowserPaintsSources(page,vp.name);
    let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    assertBuild30State(state,vp);

    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(1030,0));
    await sleep(460);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    assertBuild30State(state,vp);
    const hollowTargets=state.authoredEnvironmentTargets.filter(t=>String(t.anchor).startsWith('hollow-'));
    const hollowSites=hollowTargets.map(t=>siteFor(state,t)).filter(Boolean);
    if(hollowSites.length<2||hollowSites.some(site=>site.draws<1||site.size.w>150||site.size.h>165))throw new Error(`${vp.name}: Copper Hollow authored props did not render cleanly ${JSON.stringify(hollowSites)}`);
    await page.screenshot({path:path.join(artifactDir,`${vp.name}-copper-hollow.png`),fullPage:false});

    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(1850,0));
    await sleep(460);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    assertBuild30State(state,vp);
    const denTargets=state.authoredEnvironmentTargets.filter(t=>String(t.anchor).startsWith('den-'));
    const denSites=denTargets.map(t=>siteFor(state,t)).filter(Boolean);
    if(denSites.length<2||denSites.some(site=>site.draws<1||site.size.w>150||site.size.h>150))throw new Error(`${vp.name}: Emberback Den authored props did not render cleanly ${JSON.stringify(denSites)}`);
    await page.screenshot({path:path.join(artifactDir,`${vp.name}-emberback-den.png`),fullPage:false});

    const off=await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setAuthoredArtEnabled(false);return d.getAuthoredArtState();});
    const drawsAtDisable=off.hollowDenDraws;
    if(off.enabled)throw new Error(`${vp.name}: Copper & Ember debug toggle failed to disable`);
    await sleep(180);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    if(state.enabled||state.hollowDenDraws!==drawsAtDisable)throw new Error(`${vp.name}: disabled Copper & Ember layer continued drawing`);
    await page.evaluate(()=>window.__BRIAR_GLENDebug.setAuthoredArtEnabled(true));
    await sleep(220);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
    if(!state.enabled||state.hollowDenDraws<=drawsAtDisable)throw new Error(`${vp.name}: Copper & Ember layer did not restore`);

    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: Build 30 caused browser overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: Build 30 runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Build 30 Copper Hollow + Emberback Den authored props active ${JSON.stringify(decode)}`);
    await context.close();
  }
}finally{await browser.close();}
