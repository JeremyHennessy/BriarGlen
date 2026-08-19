import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const views=[{name:'landscape',width:844,height:390},{name:'portrait',width:390,height:844}];

async function sample(vp,mode='on'){
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const sep=target.includes('?')?'&':'?';
  const q=mode==='rollback'?'sourceArt47=0&':mode==='noSprites'?'sourceSprites47=0&':'';
  await page.goto(`${target}${sep}${q}build47perf=${Date.now()}-${vp.name}-${mode}`,{waitUntil:'domcontentloaded',timeout:15000});
  if(mode==='on')await page.waitForFunction(()=>window.__BRIAR_GLENDebug?.getSourceArt47State?.().ready&&window.__BRIAR_GLENDebug?.getGroundV2State?.().ready,{timeout:10000});
  else await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getSourceArt47State&&window.__BRIAR_GLENDebug?.getGroundV2State),{timeout:8000});
  await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(2800,-1500));
  await page.waitForTimeout(900);
  const frames=await page.evaluate(()=>new Promise(resolve=>{const a=[];let last=performance.now();function f(t){a.push(t-last);last=t;if(a.length>=180)resolve(a.slice(10));else requestAnimationFrame(f);}requestAnimationFrame(f);}));
  const state=await page.evaluate(()=>({source:window.__BRIAR_GLENDebug?.getSourceArt47State?.(),ground:window.__BRIAR_GLENDebug?.getGroundV2State?.(),guard:window.__BRIAR_GLENDebug?.getSourceArt47LayerGuard?.()}));
  if(errors.length)throw new Error(`${vp.name}/${mode}: runtime errors ${errors.join('; ')}`);
  await context.close();frames.sort((a,b)=>a-b);return{avg:frames.reduce((a,b)=>a+b,0)/frames.length,p95:frames[Math.floor(frames.length*.95)],state};
}

try{
  for(const vp of views){
    const on=await sample(vp,'on');
    const noSprites=await sample(vp,'noSprites');
    const rollback=await sample(vp,'rollback');
    console.log(`MEASURE ${vp.name}: on avg=${on.avg.toFixed(2)} p95=${on.p95.toFixed(2)} | noSprites avg=${noSprites.avg.toFixed(2)} p95=${noSprites.p95.toFixed(2)} | rollback avg=${rollback.avg.toFixed(2)} p95=${rollback.p95.toFixed(2)}`);
    if(!on.state.source?.enabled||!on.state.guard?.legacyLayersSuppressed||on.state.source.totalDraws<1)throw new Error(`${vp.name}: Build47 source layer not active ${JSON.stringify(on.state)}`);
    if(on.state.ground?.sourceMode!=='build47-physical-tiles')throw new Error(`${vp.name}: physical terrain not active ${JSON.stringify(on.state.ground)}`);
    if(noSprites.state.source?.enabled||!noSprites.state.guard?.legacyLayersSuppressed||noSprites.state.ground?.sourceMode!=='build47-physical-tiles')throw new Error(`${vp.name}: diagnostic source-sprite bypass invalid ${JSON.stringify(noSprites.state)}`);
    if(on.avg>34||on.p95>55)throw new Error(`${vp.name}: Build47 absolute render cadence regressed ${JSON.stringify({on,noSprites,rollback})}`);
    if(on.avg-rollback.avg>2.5||on.p95-rollback.p95>5.0)throw new Error(`${vp.name}: Build47 source layer regression too high ${JSON.stringify({on,noSprites,rollback})}`);
    console.log(`PASS ${vp.name}: Build47 source performance within guardrails`);
  }
}finally{await browser.close();}
