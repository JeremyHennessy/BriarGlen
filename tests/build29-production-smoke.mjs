import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const live=process.argv.includes('--live');
const viewports=[
  {name:'phone-landscape',width:932,height:430,touch:true},
  {name:'phone-portrait',width:430,height:932,touch:true},
  {name:'desktop',width:1440,height:900,touch:false},
];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const browser=await chromium.launch({headless:true});

function withParam(url,key,value){const sep=url.includes('?')?'&':'?';return `${url}${sep}${key}=${encodeURIComponent(value)}`;}

async function openBuild29Scope(page,url,label){
  let lastError;
  for(let attempt=1;attempt<=(live?48:1);attempt++){
    try{
      let scoped=withParam(url,'artScope','build29');
      scoped=withParam(scoped,'build29Recovery',`${Date.now()}-${attempt}`);
      await page.goto(scoped,{waitUntil:'domcontentloaded',timeout:15000});
      await page.waitForFunction(()=>{
        const d=window.__BRIAR_GLENDebug;
        return Boolean(d?.getBuildInfo&&d?.getAuthoredArtState&&Number.parseFloat(d.getBuildInfo()?.version)>=30);
      },{timeout:7000});
      await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getAuthoredArtState();return s.ready||s.failed;},{timeout:9000});
      return;
    }catch(error){lastError=error;if(live&&attempt<48)await sleep(5000);}
  }
  throw new Error(`${label}: Build 29 approved art scope unavailable ${lastError?.message||'unknown'}`);
}

try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    page.on('requestfailed',r=>errors.push(`requestfailed: ${r.url()} • ${r.failure()?.errorText||'unknown'}`));
    await openBuild29Scope(page,target,vp.name);
    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(2550,-1410));
    await sleep(470);
    const state=await page.evaluate(()=>({build:window.__BRIAR_GLENDebug.getBuildInfo(),art:window.__BRIAR_GLENDebug.getAuthoredArtState()}));
    if(Number.parseFloat(state.build.version)<30||state.build.saveKey!=='briar-glen-vslice-v1')throw new Error(`${vp.name}: newer release metadata unavailable ${JSON.stringify(state.build)}`);
    if(state.art.failed||!state.art.productionDefault||!state.art.build29ScopeRequested||state.art.hollowDenExpanded||!state.art.stonepineExpanded||!state.art.enabled||!state.art.ready||state.art.mode!=='authored-stonepine-timberline')throw new Error(`${vp.name}: approved Build 29 Stonepine scope did not recover ${JSON.stringify(state.art)}`);
    if(state.art.cottageTargets?.length!==2||state.art.greenwayTreeTargets?.length!==6||state.art.groveTreeTargets?.length!==4||state.art.fenTreeTargets?.length!==4||state.art.stonepineTreeTargets?.length!==4||state.art.authoredTreeTargets?.length!==18)throw new Error(`${vp.name}: Build 29 target family drifted ${JSON.stringify(state.art)}`);
    const pass=state.art.stonepineTreeTargets.find(t=>t.anchor==='stonepine-pass-north');
    const site=pass&&state.art.drawSites?.[`stonepineTree:${Math.round(pass.x)},${Math.round(pass.y)}`];
    if(!site||site.variant!=='stonepine-timberline-tree'||site.draws<1)throw new Error(`${vp.name}: Build 29 Stonepine Pass recovery draw missing ${JSON.stringify(state.art.drawSites)}`);
    if(JSON.stringify(state.art.baseline)!==JSON.stringify(state.art.current))throw new Error(`${vp.name}: Build 29 recovery mutated gameplay entities`);
    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: Build 29 recovery overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: Build 29 recovery errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Build 29 approved Stonepine Timberline remains recoverable`);
    await context.close();
  }
}finally{await browser.close();}
