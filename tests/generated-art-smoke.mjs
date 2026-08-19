import { chromium } from 'playwright';
import fs from 'node:fs';

const target = process.argv[2];
if (!target) throw new Error('Usage: node tests/generated-art-smoke.mjs <url>');

fs.mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });

async function openPage(query = '') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  const sep = target.includes('?') ? '&' : '?';
  await page.goto(`${target}${sep}${query ? `${query}&` : ''}generatedArtSmoke=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getGeneratedArtState), { timeout: 7000 });
  return { context, page, errors };
}

try {
  {
    const { context, page, errors } = await openPage();
    await page.waitForFunction(() => { const s = window.__BRIAR_GLENDebug.getGeneratedArtState(); return s.ready || s.failed; }, { timeout: 7000 });
    let state = await page.evaluate(() => window.__BRIAR_GLENDebug.getGeneratedArtState());
    const build = await page.evaluate(() => window.__BRIAR_GLENDebug.getBuildInfo());
    if (build.version !== '41') throw new Error(`wrong Build 41 metadata: ${JSON.stringify(build)}`);
    if (state.failed) throw new Error(`generated art failed: ${state.failure}`);
    if (!state.requested || !state.enabled || !state.ready) throw new Error(`generated art not active: ${JSON.stringify(state)}`);
    if (!state.atlas.loaded || state.atlas.width !== 563 || state.atlas.height < 1100) throw new Error(`generated atlas invalid: ${JSON.stringify(state.atlas)}`);
    if (JSON.stringify(state.baseline) !== JSON.stringify(state.entityCounts)) throw new Error(`generated art mutated entity counts: ${JSON.stringify({ baseline:state.baseline,current:state.entityCounts })}`);
    if (state.uiIcons < 6) throw new Error(`expected generated UI icons, got ${state.uiIcons}`);

    await page.evaluate(() => window.__BRIAR_GLENDebug.teleport(-650, -250));
    await page.waitForTimeout(650);
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getGeneratedArtState());
    if (state.objectDraws < 1) throw new Error(`town generated object draw missing: ${JSON.stringify(state.replacements)}`);
    await page.screenshot({ path: 'artifacts/generated-art-town.png', fullPage: false });

    await page.evaluate(() => window.__BRIAR_GLENDebug.teleport(900, -140));
    await page.waitForTimeout(650);
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getGeneratedArtState());
    if (state.resourceDraws < 1) throw new Error(`generated resource draw missing: ${JSON.stringify(state.replacements)}`);
    await page.screenshot({ path: 'artifacts/generated-art-copper.png', fullPage: false });

    await page.evaluate(() => window.__BRIAR_GLENDebug.teleport(1900, 0));
    await page.waitForTimeout(650);
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getGeneratedArtState());
    if (state.enemyDraws < 1) throw new Error(`generated enemy draw missing: ${JSON.stringify(state.replacements)}`);
    await page.screenshot({ path: 'artifacts/generated-art-den.png', fullPage: false });

    if (errors.length) throw new Error(`runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS generated art default: ${state.draws} total draws; atlas ${state.atlas.width}x${state.atlas.height}; ${state.uiIcons} UI substitutions`);
    await context.close();
  }

  for (const query of ['artScope=build30', 'canvasArt=1', 'generatedArt=0']) {
    const { context, page, errors } = await openPage(query);
    const state = await page.evaluate(() => window.__BRIAR_GLENDebug.getGeneratedArtState());
    if (state.requested || state.enabled) throw new Error(`${query}: generated art should be inactive: ${JSON.stringify(state)}`);
    if (errors.length) throw new Error(`${query}: runtime errors:\n${errors.join('\n')}`);
    await context.close();
  }
  console.log('PASS generated art rollback scopes');
} finally {
  await browser.close();
}
