import { chromium } from 'playwright';

const target = process.argv[2];
const live = process.argv.includes('--live');
if (!target) throw new Error('Usage: node tests/smoke.mjs <url> [--live]');

const viewports = [
  { name: 'phone-landscape', width: 932, height: 430, touch: true },
  { name: 'phone-portrait', width: 430, height: 932, touch: true },
  { name: 'desktop', width: 1440, height: 900, touch: false },
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const browser = await chromium.launch({ headless: true });

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
    page.on('requestfailed', req => {
      const url = req.url();
      if (url.includes('/BriarGlen/') || url.startsWith('http://127.0.0.1:')) {
        runtimeErrors.push(`requestfailed: ${url} (${req.failure()?.errorText || 'unknown'})`);
      }
    });

    const attempts = live ? 48 : 1;
    let loaded = false;
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        await page.goto(`${target}${sep}smoke=${Date.now()}-${attempt}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
        await page.waitForFunction(() => {
          const canvas = document.querySelector('#game');
          return Boolean(window.__BRIAR_GLENDebug && canvas && canvas.width > 0 && canvas.height > 0);
        }, { timeout: 6000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: game runtime never became available: ${lastError?.message || 'unknown error'}`);

    await page.waitForTimeout(700);
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('#game');
      const hud = document.querySelector('#hud');
      const ctx = canvas.getContext('2d');
      const state = window.__BRIAR_GLENDebug.getState();
      const doc = document.documentElement;
      const distinct = new Set();
      const sx = Math.max(1, Math.floor(canvas.width / 12));
      const sy = Math.max(1, Math.floor(canvas.height / 8));
      for (let y = Math.floor(sy / 2); y < canvas.height; y += sy) {
        for (let x = Math.floor(sx / 2); x < canvas.width; x += sx) {
          const p = ctx.getImageData(x, y, 1, 1).data;
          distinct.add(`${p[0]},${p[1]},${p[2]},${p[3]}`);
        }
      }
      return {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        hudVisible: getComputedStyle(hud).display !== 'none',
        overflowX: doc.scrollWidth - innerWidth,
        overflowY: doc.scrollHeight - innerHeight,
        distinctCanvasColors: distinct.size,
        state,
      };
    });

    if (runtimeErrors.length) throw new Error(`${vp.name}: runtime errors:\n${runtimeErrors.join('\n')}`);
    if (!result.hudVisible) throw new Error(`${vp.name}: HUD is hidden`);
    if (result.canvasWidth < vp.width || result.canvasHeight < vp.height) {
      throw new Error(`${vp.name}: canvas is undersized (${result.canvasWidth}x${result.canvasHeight})`);
    }
    if (result.overflowX > 2 || result.overflowY > 2) {
      throw new Error(`${vp.name}: document overflow detected (${result.overflowX}, ${result.overflowY})`);
    }
    if (result.distinctCanvasColors < 6) {
      throw new Error(`${vp.name}: canvas appears blank or insufficiently rendered (${result.distinctCanvasColors} sampled colors)`);
    }
    if (!result.state?.player || result.state.zone !== 'BRIAR GLEN') {
      throw new Error(`${vp.name}: invalid initial game state: ${JSON.stringify(result.state)}`);
    }

    if (vp.touch) {
      const before = result.state.player.weaponType;
      await page.locator('#weapon-btn').click();
      const after = await page.evaluate(() => window.__BRIAR_GLENDebug.getState().player.weaponType);
      if (before === after) throw new Error(`${vp.name}: touch weapon cycle did not change weapon`);
    } else {
      await page.keyboard.press('Digit2');
      const weapon = await page.evaluate(() => window.__BRIAR_GLENDebug.getState().player.weaponType);
      if (weapon !== 'bow') throw new Error(`${vp.name}: desktop weapon hotkey failed (${weapon})`);
    }

    console.log(`PASS ${vp.name}: ${result.canvasWidth}x${result.canvasHeight}, ${result.distinctCanvasColors} canvas colors, runtime active`);
    await context.close();
  }
} finally {
  await browser.close();
}
