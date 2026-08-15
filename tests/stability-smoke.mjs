import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const live = process.argv.includes('--live');
const viewports = [
  ['phone-landscape', 932, 430, true],
  ['phone-portrait', 430, 932, true],
  ['desktop', 1440, 900, false],
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const browser = await chromium.launch({ headless: true });

try {
  for (const [name, width, height, touch] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('requestfailed', request => {
      const url = request.url();
      if (url.includes('/BriarGlen/') || url.includes('127.0.0.1:4173')) {
        errors.push(`requestfailed: ${url} • ${request.failure()?.errorText || 'unknown'}`);
      }
    });

    let loaded = false;
    let lastError;
    for (let attempt = 1; attempt <= (live ? 48 : 1); attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        await page.goto(`${target}${sep}stability=${Date.now()}-${attempt}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getBuildInfo && window.__BRIAR_GLENDebug?.getBoardState), { timeout: 7000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (live && attempt < 48) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${name}: Build 12.1 runtime unavailable: ${lastError?.message || 'unknown'}`);

    const state = await page.evaluate(() => {
      const info = window.__BRIAR_GLENDebug.getBuildInfo();
      const scriptSources = [...document.querySelectorAll('script[src]')].map(script => script.getAttribute('src'));
      const styleHrefs = [...document.styleSheets].map(sheet => sheet.href || '').filter(Boolean);
      return {
        info,
        dataBuild: document.documentElement.dataset.briarGlenBuild,
        hasContractRuntime: Boolean(window.__BRIAR_GLENDebug.getBoardState),
        releaseScriptCount: scriptSources.filter(src => src?.includes('17-release-info.js')).length,
        contractScriptCount: scriptSources.filter(src => src?.includes('16-contract-board.js')).length,
        hasV12Style: styleHrefs.some(href => href.includes('styles-v12.css')),
      };
    });

    if (state.info.version !== '12.1' || state.info.label !== 'Stability Pass' || state.info.saveKey !== 'briar-glen-vslice-v1') {
      throw new Error(`${name}: incorrect build metadata ${JSON.stringify(state.info)}`);
    }
    if (state.dataBuild !== '12.1') throw new Error(`${name}: document build marker missing`);
    if (!state.hasContractRuntime || state.contractScriptCount !== 1 || !state.hasV12Style) {
      throw new Error(`${name}: dynamic V12 runtime/style did not load exactly once: ${JSON.stringify(state)}`);
    }
    if (state.releaseScriptCount !== 1) throw new Error(`${name}: release metadata loaded ${state.releaseScriptCount} times`);
    if (errors.length) throw new Error(`${name}: runtime/resource errors:\n${errors.join('\n')}`);

    console.log(`PASS ${name}: Build 12.1 release metadata + runtime integrity active`);
    await context.close();
  }
} finally {
  await browser.close();
}
