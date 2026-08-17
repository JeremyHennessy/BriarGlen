import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless:true });
try {
  const context = await browser.newContext({ viewport:{width:1440,height:900}, hasTouch:false, deviceScaleFactor:1 });
  const page = await context.newPage();
  await page.goto(`${target}?hollowProbe=${Date.now()}`, { waitUntil:'domcontentloaded', timeout:15000 });
  await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getHollowDenArtState), { timeout:7000 });
  await page.evaluate(() => {
    const d=window.__BRIAR_GLENDebug;
    d.setHollowDenArtEnabled(true);
    d.teleport(1040,120);
  });
  await page.waitForTimeout(240);
  const start = await page.evaluate(() => window.__BRIAR_GLENDebug.getHollowDenArtState().frames);
  const samples=[];
  for (const elapsed of [100,200,300,420,600,800,1000,1400,1800,2400]) {
    const prior = samples.length ? samples.at(-1).elapsed : 0;
    await page.waitForTimeout(elapsed-prior);
    const state = await page.evaluate(() => window.__BRIAR_GLENDebug.getHollowDenArtState());
    samples.push({elapsed,frames:state.frames,delta:state.frames-start,frame:{...state.frame}});
  }
  console.log(`HOLLOW_CADENCE_PROBE ${JSON.stringify({start,samples})}`);
  const firstFive=samples.find(s=>s.delta>=5);
  if(!firstFive) throw new Error(`Hollow renderer failed to advance five frames within 2400ms: ${JSON.stringify(samples)}`);
  console.log(`PASS desktop: Hollow renderer advanced five frames by ${firstFive.elapsed}ms; fixed 420ms delta was ${samples.find(s=>s.elapsed===420)?.delta}`);
  await context.close();
} finally {
  await browser.close();
}
