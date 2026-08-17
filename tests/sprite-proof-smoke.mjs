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
const artifactDir = path.resolve('test-artifacts/build25');
fs.mkdirSync(artifactDir, { recursive:true });
const browser = await chromium.launch({ headless:true });

function withParam(url, key, value) {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${key}=${encodeURIComponent(value)}`;
}

async function canvasSignature(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const step = Math.max(4, Math.floor((canvas.width * canvas.height) / 18000)) * 4;
    let hash = 2166136261 >>> 0;
    for (let i=0;i<data.length;i+=step) {
      hash ^= data[i]; hash = Math.imul(hash,16777619) >>> 0;
      hash ^= data[i+1]; hash = Math.imul(hash,16777619) >>> 0;
      hash ^= data[i+2]; hash = Math.imul(hash,16777619) >>> 0;
    }
    return hash;
  });
}

async function assertBrowserPaintsSources(page, vpName) {
  const report = await page.evaluate(async () => {
    const paths = [
      'assets/v24/cottage-authored.webp',
      'assets/v24/tall-tree-authored.webp',
      'assets/v24/pine-tree-authored.webp',
    ];
    const out = {};
    for (const src of paths) {
      const image = new Image();
      image.src = `${src}?decode-control=${Date.now()}-${Math.random()}`;
      await image.decode();
      const c = document.createElement('canvas');
      c.width = 160; c.height = 160;
      const g = c.getContext('2d');
      const x = (160 - image.naturalWidth) / 2;
      const y = (160 - image.naturalHeight) / 2;
      g.clearRect(0,0,160,160);
      g.drawImage(image,x,y);
      const patch = g.getImageData(74,74,12,12).data;
      let alpha=0,rgb=0,visible=0;
      for(let i=0;i<patch.length;i+=4){
        rgb += patch[i]+patch[i+1]+patch[i+2];
        alpha += patch[i+3];
        if(patch[i+3]>32)visible++;
      }
      out[src]={width:image.naturalWidth,height:image.naturalHeight,alpha,rgb,visible};
    }
    return out;
  });
  for(const [src,info] of Object.entries(report)){
    if(info.width<64||info.height<64||info.visible<20||info.alpha<3000||info.rgb<1000){
      throw new Error(`${vpName}: Chromium source decode/paint failed ${src} ${JSON.stringify(info)}`);
    }
  }
  return report;
}

function assertHeroState(state, vp) {
  if(state.failed||!state.productionDefault||state.rollbackRequested||!state.requested||!state.enabled||!state.ready||state.mode!=='authored-hero-cluster'){
    throw new Error(`${vp.name}: Build 25 authored default not active ${JSON.stringify(state)}`);
  }
  if(Object.keys(state.loadedAssets).sort().join(',')!=='cottage,pine_tree,tall_tree'){
    throw new Error(`${vp.name}: authored asset set incomplete ${JSON.stringify(state.loadedAssets)}`);
  }
  if(!Array.isArray(state.heroTreeTargets)||state.heroTreeTargets.length!==2){
    throw new Error(`${vp.name}: Build 25 must target exactly two authored trees ${JSON.stringify(state.heroTreeTargets)}`);
  }
  const targetAssets=state.heroTreeTargets.map(t=>t.asset).sort().join(',');
  if(targetAssets!=='pine_tree,tall_tree')throw new Error(`${vp.name}: hero tree family incorrect ${JSON.stringify(state.heroTreeTargets)}`);
  if(state.heroTreeTargets.some(t=>(t.x+t.y)<-1070))throw new Error(`${vp.name}: authored tree selected too deep behind Warden House ${JSON.stringify(state.heroTreeTargets)}`);
}

try {
  for(const vp of viewports){
    let authoredSignature=0;

    // Build 25 production default: approved authored cluster is active without a query flag.
    {
      const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
      page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
      await page.goto(withParam(target,'build25Default',`${Date.now()}-${vp.name}`),{waitUntil:'domcontentloaded',timeout:15000});
      await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getAuthoredArtState&&window.__BRIAR_GLENDebug?.getBuildInfo),{timeout:7000});
      await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getAuthoredArtState();return s.ready||s.failed;},{timeout:7000});

      const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
      if(build.version!=='25'||build.label!=='Briar Glen Art Rollout')throw new Error(`${vp.name}: incorrect Build 25 metadata ${JSON.stringify(build)}`);
      const decodeReport=await assertBrowserPaintsSources(page,vp.name);
      let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
      assertHeroState(state,vp);

      await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(-575,-330));
      await sleep(500);
      state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
      assertHeroState(state,vp);
      if(state.draws<1||state.replacements.cottage<1)throw new Error(`${vp.name}: Warden House authored sprite did not draw ${JSON.stringify(state)}`);
      const warden=state.drawSites?.['cottage:-575,-365'];
      if(!warden||warden.asset!=='cottage'||warden.draws<1)throw new Error(`${vp.name}: Warden House draw site missing ${JSON.stringify(state.drawSites)}`);
      if(warden.screen.x<-30||warden.screen.x>vp.width+30||warden.screen.y<-30||warden.screen.y>vp.height+30)throw new Error(`${vp.name}: Warden House outside viewport ${JSON.stringify(warden)}`);
      if(warden.size.w<100||warden.size.w>185||warden.size.h<100||warden.size.h>185)throw new Error(`${vp.name}: Warden House scale escaped approved range ${JSON.stringify(warden)}`);
      const treeSites=Object.entries(state.drawSites).filter(([key])=>key.startsWith('tree:')).map(([,site])=>site);
      if(treeSites.length<1||treeSites.length>2||treeSites.some(site=>site.size.w>145||site.size.h>145))throw new Error(`${vp.name}: authored tree density/scale escaped approved range ${JSON.stringify(treeSites)}`);
      if(JSON.stringify(state.baseline)!==JSON.stringify(state.current))throw new Error(`${vp.name}: authored rollout mutated gameplay entities ${JSON.stringify(state)}`);

      authoredSignature=await canvasSignature(page);
      await page.screenshot({path:path.join(artifactDir,`${vp.name}-authored.png`),fullPage:false});

      const offState=await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setAuthoredArtEnabled(false);return d.getAuthoredArtState();});
      const drawsAtDisable=offState.draws;
      if(offState.enabled)throw new Error(`${vp.name}: debug authored-art toggle did not disable`);
      await sleep(180);
      state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
      if(state.enabled||state.draws!==drawsAtDisable)throw new Error(`${vp.name}: disabled authored renderer kept drawing ${JSON.stringify(state)}`);
      await page.evaluate(()=>window.__BRIAR_GLENDebug.setAuthoredArtEnabled(true));
      await sleep(220);
      state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
      if(!state.enabled||state.draws<=drawsAtDisable)throw new Error(`${vp.name}: authored renderer did not restore ${JSON.stringify(state)}`);
      if(errors.length)throw new Error(`${vp.name}: authored default runtime errors:\n${errors.join('\n')}`);
      console.log(`PASS ${vp.name}: Build 25 authored default active ${JSON.stringify(decodeReport)}`);
      await context.close();
    }

    // Explicit rollback / A-B path: preserve the exact prior Canvas renderer.
    {
      const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
      page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
      let url=withParam(target,'canvasArt','1');
      url=withParam(url,'build25Rollback',`${Date.now()}-${vp.name}`);
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
      await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getAuthoredArtState&&window.__BRIAR_GLENDebug?.getBuildInfo),{timeout:7000});
      const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
      if(build.version!=='25')throw new Error(`${vp.name}: rollback path lost Build 25 metadata ${JSON.stringify(build)}`);
      await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(-575,-330));
      await sleep(500);
      const state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
      if(!state.productionDefault||!state.rollbackRequested||state.requested||state.enabled||!state.ready||state.mode!=='build23-canvas'||state.draws!==0||Object.keys(state.loadedAssets).length!==0){
        throw new Error(`${vp.name}: ?canvasArt=1 did not restore prior Canvas renderer ${JSON.stringify(state)}`);
      }
      if(JSON.stringify(state.baseline)!==JSON.stringify(state.current))throw new Error(`${vp.name}: rollback path mutated gameplay entities`);
      const rollbackSignature=await canvasSignature(page);
      if(rollbackSignature===authoredSignature)throw new Error(`${vp.name}: authored default and Canvas rollback produced identical frame signatures`);
      await page.screenshot({path:path.join(artifactDir,`${vp.name}-canvas.png`),fullPage:false});
      const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
      if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: Build 25 caused browser overflow ${JSON.stringify(overflow)}`);
      if(errors.length)throw new Error(`${vp.name}: Canvas rollback runtime errors:\n${errors.join('\n')}`);
      console.log(`PASS ${vp.name}: ?canvasArt=1 restores prior Canvas presentation`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
