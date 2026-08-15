import { chromium } from 'playwright';

const target = process.argv[2];
const live = process.argv.includes('--live');
if (!target) throw new Error('Usage: node tests/controls-smoke.mjs <url> [--live]');

const viewports = [
  { name: 'phone-landscape', width: 932, height: 430, touch: true },
  { name: 'phone-portrait', width: 430, height: 932, touch: true },
  { name: 'desktop', width: 1440, height: 900, touch: false },
];

const browser = await chromium.launch({ headless: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function projectedDelta(before, after) {
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  return { x: (dx - dy) * .78, y: (dx + dy) * .39 };
}

try {
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.touch,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on('console', msg => {
      if (msg.type() === 'error') runtimeErrors.push(`console: ${msg.text()}`);
    });

    const attempts = live ? 48 : 1;
    let loaded = false;
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        await page.goto(`${target}${sep}controls=${Date.now()}-${attempt}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
        await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getControlState), { timeout: 6000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: controls runtime unavailable: ${lastError?.message || 'unknown'}`);

    await page.evaluate(() => {
      localStorage.removeItem('briar-glen-vslice-v1');
      const d = window.__BRIAR_GLENDebug;
      d.teleport(-120, 500);
      d.setPlayer({ hp: 100, dashCd: 0, dashTimer: 0 });
    });

    const control = await page.evaluate(() => window.__BRIAR_GLENDebug.getControlState());
    if (control.touchAction.shell !== 'none' || control.touchAction.pad !== 'none' || control.touchAction.controls !== 'none') {
      throw new Error(`${vp.name}: game surface still permits browser touch gestures: ${JSON.stringify(control.touchAction)}`);
    }
    if (Math.abs((control.visualScale || 1) - 1) > .01) {
      throw new Error(`${vp.name}: initial browser visual scale is not 1: ${control.visualScale}`);
    }

    const gestureBlocked = await page.evaluate(() => {
      const event = new Event('gesturestart', { bubbles: true, cancelable: true });
      const allowed = document.dispatchEvent(event);
      return { allowed, defaultPrevented: event.defaultPrevented };
    });
    if (gestureBlocked.allowed || !gestureBlocked.defaultPrevented) {
      throw new Error(`${vp.name}: Safari gesturestart is not blocked`);
    }

    let before = await page.evaluate(() => {
      const p = window.__BRIAR_GLENDebug.getState().player;
      return { x: p.x, y: p.y };
    });

    if (vp.touch) {
      const pad = await page.locator('#move-pad').boundingBox();
      if (!pad) throw new Error(`${vp.name}: movement pad missing`);
      await page.mouse.move(pad.x + pad.width / 2 + pad.width * .28, pad.y + pad.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(280);
      await page.mouse.up();
    } else {
      await page.keyboard.down('KeyD');
      await page.waitForTimeout(280);
      await page.keyboard.up('KeyD');
    }

    let after = await page.evaluate(() => {
      const p = window.__BRIAR_GLENDebug.getState().player;
      return { x: p.x, y: p.y };
    });
    let delta = projectedDelta(before, after);
    if (delta.x < 25 || Math.abs(delta.y) > 8) {
      throw new Error(`${vp.name}: right movement is not screen-aligned: ${JSON.stringify(delta)}`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.teleport(-120, 500));
    before = await page.evaluate(() => {
      const p = window.__BRIAR_GLENDebug.getState().player;
      return { x: p.x, y: p.y };
    });

    if (vp.touch) {
      const pad = await page.locator('#move-pad').boundingBox();
      await page.mouse.move(pad.x + pad.width / 2, pad.y + pad.height / 2 - pad.height * .28);
      await page.mouse.down();
      await page.waitForTimeout(280);
      await page.mouse.up();
    } else {
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(280);
      await page.keyboard.up('KeyW');
    }

    after = await page.evaluate(() => {
      const p = window.__BRIAR_GLENDebug.getState().player;
      return { x: p.x, y: p.y };
    });
    delta = projectedDelta(before, after);
    if (delta.y > -25 || Math.abs(delta.x) > 8) {
      throw new Error(`${vp.name}: up movement is not screen-aligned: ${JSON.stringify(delta)}`);
    }

    if (runtimeErrors.length) throw new Error(`${vp.name}: runtime errors:\n${runtimeErrors.join('\n')}`);
    console.log(`PASS ${vp.name}: screen-aligned movement + browser zoom guards active`);
    await context.close();
  }
} finally {
  await browser.close();
}
