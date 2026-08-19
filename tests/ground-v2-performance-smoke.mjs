import { chromium } from 'playwright';
const target=process.argv[2]||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const views=[{name:'landscape',width:844,height:390},{name:'portrait',width:390,height:844}];
async function measure(vp,query=''){
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const sep=target.includes('?')?'&':'?';await page.goto(`${target}${sep}${query}${query?'&':''}gperf=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForTimeout(500);
  const frames=await page.evaluate(()=>new Promise(resolve=>{const out=[];let last=performance.now();function f(t){out.push(t-last);last=t;if(out.length>=180)resolve(out.slice(10));else requestAnimationFrame(f);}requestAnimationFrame(f);}));
  const ground=await page.evaluate(()=>window.__BRIAR_GLENDebug.getGroundV2State?.());
  if(errors.length)throw new Error(`${vp.name}: ${errors.join('; ')}`);
  await context.close();frames.sort((a,b)=>a-b);return{avg:frames.reduce((a,b)=>a+b,0)/frames.length,p95:frames[Math.floor(frames.length*.95)],ground};
}
try{
 for(const vp of views){
   const on=await measure(vp);const off=await measure(vp,'groundV2=0');
   if(!on.ground?.enabled||on.ground.assetCount!==49)throw new Error(`${vp.name}: Ground V2 unavailable ${JSON.stringify(on.ground)}`);
   if(on.ground.activeCache>on.ground.maxCache)throw new Error(`${vp.name}: unbounded cache ${JSON.stringify(on.ground)}`);
   if(on.avg-off.avg>1.5||on.p95-off.p95>3.0)throw new Error(`${vp.name}: ground regression too high on=${JSON.stringify(on)} off=${JSON.stringify(off)}`);
   console.log(`PASS ${vp.name}: Ground V2 avg +${(on.avg-off.avg).toFixed(2)}ms p95 +${(on.p95-off.p95).toFixed(2)}ms cache=${on.ground.activeCache}/${on.ground.maxCache}`);
 }
}finally{await browser.close();}
