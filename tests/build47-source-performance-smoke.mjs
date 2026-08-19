import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const views=[{name:'landscape',width:844,height:390},{name:'portrait',width:390,height:844}];

async function sample(vp,rollback=false){
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const sep=target.includes('?')?'&':'?';
  await page.goto(`${target}${sep}${rollback?'sourceArt47=0&':''}build47perf=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:15000});
  if(!rollback){
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug?.getSourceArt47State?.().ready&&window.__BRIAR_GLENDebug?.getGroundV2State?.().ready,{timeout:10000});
    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(2800,-1500));
  }
  await page.waitForTimeout(900);
  const frames=await page.evaluate(()=>new Promise(resolve=>{
    const a=[];let last=performance.now();function f(t){a.push(t-last);last=t;if(a.length>=180)resolve(a.slice(10));else requestAnimationFrame(f);}requestAnimationFrame(f);
  }));
  const state=await page.evaluate(()=>({source:window.__BRIAR_GLENDebug?.getSourceArt47State?.(),ground:window.__BRIAR_GLENDebug?.getGroundV2State?.(),guard:window.__BRIAR_GLENDebug?.getSourceArt47LayerGuard?.()}));
  if(errors.length)throw new Error(`${vp.name}: runtime errors ${errors.join('; ')}`);
  await context.close();
  frames.sort((a,b)=>a-b);return{avg:frames.reduce((a,b)=>a+b,0)/frames.length,p95:frames[Math.floor(frames.length*.95)],state};
}

try{
  for(const vp of views){
    const on=await sample(vp,false),off=await sample(vp,true);
    if(!on.state.source?.enabled||!on.state.guard?.legacyLayersSuppressed||on.state.source.totalDraws<1)throw new Error(`${vp.name}: Build47 source layer not active ${JSON.stringify(on.state)}`);
    if(on.state.ground?.sourceMode!=='build47-physical-tiles')throw new Error(`${vp.name}: physical terrain not active ${JSON.stringify(on.state.ground)}`);
    if(on.avg>34||on.p95>55)throw new Error(`${vp.name}: Build47 absolute render cadence regressed ${JSON.stringify(on)}`);
    if(on.avg-off.avg>2.5||on.p95-off.p95>5.0)throw new Error(`${vp.name}: Build47 source layer regression too high on=${JSON.stringify(on)} off=${JSON.stringify(off)}`);
    console.log(`PASS ${vp.name}: Build47 avg ${on.avg.toFixed(2)}ms p95 ${on.p95.toFixed(2)}ms; rollback delta avg +${(on.avg-off.avg).toFixed(2)} p95 +${(on.p95-off.p95).toFixed(2)}`);
  }
}finally{await browser.close();}
