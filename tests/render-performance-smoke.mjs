import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless:true });

async function frameSample(page, frames=180) {
  return page.evaluate(async count => {
    const samples=[];
    let last=performance.now();
    for(let i=0;i<count;i++) {
      await new Promise(requestAnimationFrame);
      const now=performance.now();
      samples.push(now-last);
      last=now;
    }
    samples.sort((a,b)=>a-b);
    const avg=samples.reduce((a,b)=>a+b,0)/samples.length;
    const p95=samples[Math.min(samples.length-1,Math.floor(samples.length*.95))];
    return {avg,p95,max:samples[samples.length-1],frames:samples.length};
  }, frames);
}

async function run(viewport) {
  const context=await browser.newContext({viewport,hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${target}${target.includes('?')?'&':'?'}renderPerf=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>{const d=window.__BRIAR_GLENDebug,s=d?.getGeneratedArtState?.();return Boolean(s?.ready&&!s.failed&&d?.isGeneratedArtEnabled?.());},null,{timeout:8000});

  // Let the world settle, then measure the diagnostic footprint before and after live NPC movement.
  await page.waitForTimeout(1200);
  const before=await page.evaluate(()=>window.__BRIAR_GLENDebug.getGeneratedArtState());

  // Instrument only the heavyweight debug snapshot. Rendering should use isGeneratedArtEnabled().
  await page.evaluate(()=>{
    const d=window.__BRIAR_GLENDebug;
    const prior=d.getGeneratedArtState;
    window.__briarPerfHeavyStateCalls=0;
    d.getGeneratedArtState=(...args)=>{window.__briarPerfHeavyStateCalls++;return prior(...args);};
  });

  const frames=await frameSample(page,180);
  await page.waitForTimeout(1800);
  const calls=await page.evaluate(()=>window.__briarPerfHeavyStateCalls||0);
  const after=await page.evaluate(()=>window.__BRIAR_GLENDebug.getGeneratedArtState());

  const entityCap=after.entityCounts.objects+after.entityCounts.resources+after.entityCounts.enemies+8;
  if(calls>2) throw new Error(`heavy generated-art state snapshot leaked into render hot path: ${calls} calls`);
  if(after.drawSiteCount>entityCap) throw new Error(`draw-site diagnostics unbounded: ${after.drawSiteCount} > ${entityCap}`);
  if(after.drawSiteCount-before.drawSiteCount>8) throw new Error(`draw-site diagnostics grew during stationary play: ${before.drawSiteCount} -> ${after.drawSiteCount}`);
  // Headless CI is noisy; this is a floor against catastrophic regressions, not a 60-fps certification.
  if(frames.avg>34 || frames.p95>55) throw new Error(`render cadence regressed: ${JSON.stringify(frames)}`);
  if(errors.length) throw new Error(`runtime errors: ${errors.join('; ')}`);

  console.log(`PASS ${viewport.width}x${viewport.height}: avg=${frames.avg.toFixed(2)}ms p95=${frames.p95.toFixed(2)}ms heavyStateCalls=${calls} drawSites=${after.drawSiteCount}`);
  await context.close();
}

try {
  await run({width:844,height:390});
  await run({width:390,height:844});
} finally {
  await browser.close();
}
