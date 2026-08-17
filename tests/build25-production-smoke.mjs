import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const live = process.argv.includes('--live');
const viewports = [
  { name:'phone-landscape', width:932, height:430, touch:true },
  { name:'phone-portrait', width:430, height:932, touch:true },
  { name:'desktop', width:1440, height:900, touch:false },
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const browser = await chromium.launch({ headless:true });

function withParam(url,key,value){
  const sep=url.includes('?')?'&':'?';
  return `${url}${sep}${key}=${encodeURIComponent(value)}`;
}

async function openBuild25(page,url,label){
  let lastError;
  for(let attempt=1;attempt<=(live?48:1);attempt++){
    try{
      const attemptUrl=withParam(url,'build25Live',`${Date.now()}-${attempt}`);
      await page.goto(attemptUrl,{waitUntil:'domcontentloaded',timeout:15000});
      await page.waitForFunction(()=>{
        const d=window.__BRIAR_GLENDebug;
        if(!d?.getBuildInfo||!d?.getAuthoredArtState)return false;
        return d.getBuildInfo()?.version==='25';
      },{timeout:7000});
      await page.waitForFunction(()=>{
        const s=window.__BRIAR_GLENDebug.getAuthoredArtState();
        return s.ready||s.failed;
      },{timeout:7000});
      return;
    }catch(error){
      lastError=error;
      if(live&&attempt<48)await sleep(5000);
    }
  }
  throw new Error(`${label}: Build 25 production runtime unavailable: ${lastError?.message||'unknown'}`);
}

try{
  for(const vp of viewports){
    {
      const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
      page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
      page.on('requestfailed',r=>errors.push(`requestfailed: ${r.url()} • ${r.failure()?.errorText||'unknown'}`));
      await openBuild25(page,target,`${vp.name} default`);
      await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(-575,-330));
      await sleep(450);
      const state=await page.evaluate(()=>({build:window.__BRIAR_GLENDebug.getBuildInfo(),art:window.__BRIAR_GLENDebug.getAuthoredArtState()}));
      if(state.build.version!=='25'||state.build.label!=='Briar Glen Art Rollout')throw new Error(`${vp.name}: incorrect release metadata ${JSON.stringify(state.build)}`);
      if(state.art.failed||!state.art.productionDefault||state.art.rollbackRequested||!state.art.enabled||!state.art.ready||state.art.mode!=='authored-hero-cluster')throw new Error(`${vp.name}: authored production default inactive ${JSON.stringify(state.art)}`);
      if(state.art.replacements.cottage<1||state.art.draws<1||state.art.heroTreeTargets?.length!==2)throw new Error(`${vp.name}: approved Warden hero cluster did not render ${JSON.stringify(state.art)}`);
      if(JSON.stringify(state.art.baseline)!==JSON.stringify(state.art.current))throw new Error(`${vp.name}: production art mutated gameplay entities`);
      const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
      if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: Build 25 default overflow ${JSON.stringify(overflow)}`);
      if(errors.length)throw new Error(`${vp.name}: Build 25 default errors:\n${errors.join('\n')}`);
      console.log(`PASS ${vp.name}: Build 25 authored Warden cluster is production default`);
      await context.close();
    }

    {
      const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
      page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
      let rollbackUrl=withParam(target,'canvasArt','1');
      await openBuild25(page,rollbackUrl,`${vp.name} rollback`);
      await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(-575,-330));
      await sleep(300);
      const state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getAuthoredArtState());
      if(!state.productionDefault||!state.rollbackRequested||state.requested||state.enabled||!state.ready||state.mode!=='build23-canvas'||state.draws!==0||Object.keys(state.loadedAssets).length!==0)throw new Error(`${vp.name}: ?canvasArt=1 rollback failed ${JSON.stringify(state)}`);
      if(JSON.stringify(state.baseline)!==JSON.stringify(state.current))throw new Error(`${vp.name}: rollback path mutated gameplay entities`);
      if(errors.length)throw new Error(`${vp.name}: rollback runtime errors:\n${errors.join('\n')}`);
      console.log(`PASS ${vp.name}: ?canvasArt=1 restores prior Canvas renderer`);
      await context.close();
    }
  }
}finally{
  await browser.close();
}
