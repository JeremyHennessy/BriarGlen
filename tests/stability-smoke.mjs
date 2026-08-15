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
        await page.waitForFunction(() => {
          if (!window.__BRIAR_GLENDebug?.getBuildInfo || !window.__BRIAR_GLENDebug?.getBoardState) return false;
          const info = window.__BRIAR_GLENDebug.getBuildInfo();
          return Boolean(info?.version && document.documentElement.dataset.briarGlenBuild === info.version);
        }, { timeout: 7000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (live && attempt < 48) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${name}: release runtime unavailable: ${lastError?.message || 'unknown'}`);

    const state = await page.evaluate(() => {
      const info = window.__BRIAR_GLENDebug.getBuildInfo();
      const scriptSources = [...document.querySelectorAll('script[src]')].map(script => script.getAttribute('src'));
      const styleHrefs = [...document.styleSheets].map(sheet => sheet.href || '').filter(Boolean);
      return {
        info,
        dataBuild: document.documentElement.dataset.briarGlenBuild,
        hasContractRuntime: Boolean(window.__BRIAR_GLENDebug.getBoardState),
        releaseScriptCount: scriptSources.filter(src => /release-info\.js(?:[?#].*)?$/i.test(src || '')).length,
        baseReleaseScriptCount: scriptSources.filter(src => src?.includes('17-release-info.js')).length,
        contractScriptCount: scriptSources.filter(src => src?.includes('16-contract-board.js')).length,
        hasV12Style: styleHrefs.some(href => href.includes('styles-v12.css')),
      };
    });

    if (!state.info.version || state.info.saveKey !== 'briar-glen-vslice-v1') {
      throw new Error(`${name}: invalid build metadata ${JSON.stringify(state.info)}`);
    }
    if (state.dataBuild !== state.info.version) throw new Error(`${name}: document build marker does not match release metadata`);
    if (!state.hasContractRuntime || state.contractScriptCount !== 1 || !state.hasV12Style) {
      throw new Error(`${name}: dynamic V12 runtime/style did not load exactly once: ${JSON.stringify(state)}`);
    }
    if (state.baseReleaseScriptCount !== 1 || state.releaseScriptCount < 1) {
      throw new Error(`${name}: release metadata chain invalid: ${JSON.stringify(state)}`);
    }
    if (errors.length) throw new Error(`${name}: runtime/resource errors:\n${errors.join('\n')}`);

    console.log(`PASS ${name}: release ${state.info.version} metadata + runtime integrity active`);
    await context.close();
  }
} finally {
  await browser.close();
}
