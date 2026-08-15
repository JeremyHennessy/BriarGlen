import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const live = process.argv.includes('--live');
const viewports = [
  { name: 'phone-landscape', width: 932, height: 430, touch: true },
  { name: 'phone-portrait', width: 430, height: 932, touch: true },
  { name: 'desktop', width: 1440, height: 900, touch: false },
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const browser = await chromium.launch({ headless: true });

try {
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });

    let loaded = false, lastError;
    for (let attempt = 1; attempt <= (live ? 48 : 1); attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        await page.goto(`${target}${sep}feedback16=${Date.now()}-${attempt}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getFeedbackTuningState && window.__BRIAR_GLENDebug?.projectPoint), { timeout: 7000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (live && attempt < 48) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: feedback tuning runtime unavailable: ${lastError?.message || 'unknown'}`);

    const build = await page.evaluate(() => window.__BRIAR_GLENDebug.getBuildInfo());
    if (build.version !== '16') throw new Error(`${vp.name}: feedback tuning not attached to Build 16 ${JSON.stringify(build)}`);

    await page.evaluate(() => window.__BRIAR_GLENDebug.setCameraShake(12));
    await sleep(35);
    const shakeProbe = await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      const samples = Array.from({ length: 20 }, () => d.projectPoint(-620, 35));
      return { tuning: d.getFeedbackTuningState(), samples };
    });

    if (shakeProbe.tuning.rawShake <= 0) throw new Error(`${vp.name}: shake probe never reached tuned renderer`);
    if (shakeProbe.tuning.renderedAmplitude > 1.55) {
      throw new Error(`${vp.name}: tuned shake amplitude still too high ${JSON.stringify(shakeProbe.tuning)}`);
    }

    const xs = shakeProbe.samples.map(p => p.x), ys = shakeProbe.samples.map(p => p.y);
    const spreadX = Math.max(...xs) - Math.min(...xs);
    const spreadY = Math.max(...ys) - Math.min(...ys);
    if (spreadX > 0.001 || spreadY > 0.001) {
      throw new Error(`${vp.name}: per-object camera jitter remains spread=${spreadX},${spreadY}`);
    }

    // Measure only the shake component itself, not ordinary camera-follow motion.
    const frameShift = Math.hypot(shakeProbe.tuning.frameX, shakeProbe.tuning.frameY);
    if (frameShift > 1.95) throw new Error(`${vp.name}: whole-screen shake displacement still excessive: ${frameShift}`);

    const haptic = await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      const before = d.getFeedbackTuningState().hapticCalls;
      d.testHaptic(35);
      const after = d.getFeedbackTuningState();
      return { before, after };
    });
    if (haptic.after.hapticCalls !== haptic.before + 1 || haptic.after.lastHapticMs !== 18) {
      throw new Error(`${vp.name}: haptic tuning incorrect ${JSON.stringify(haptic)}`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.setCameraShake(0));
    await sleep(80);
    const settled = await page.evaluate(() => window.__BRIAR_GLENDebug.getFeedbackTuningState());
    if (settled.renderedAmplitude > .05) throw new Error(`${vp.name}: camera did not settle after shake cleared ${JSON.stringify(settled)}`);

    if (errors.length) throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: coherent low-amplitude camera shake + softened haptics active`);
    await context.close();
  }
} finally {
  await browser.close();
}
