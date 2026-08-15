import { chromium } from 'playwright';

const target = process.argv[2];
const live = process.argv.includes('--live');
if (!target) throw new Error('Usage: node tests/fen-smoke.mjs <url> [--live]');

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
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
    });

    const attempts = live ? 48 : 1;
    let loaded = false;
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        await page.goto(`${target}${sep}fen=${Date.now()}-${attempt}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
        await page.waitForFunction(
          () => Boolean(window.__BRIAR_GLENDebug?.getFenState),
          { timeout: 6000 }
        );
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await sleep(5000);
      }
    }
    if (!loaded) {
      throw new Error(`${vp.name}: Fen runtime unavailable: ${lastError?.message || 'unknown'}`);
    }

    await page.evaluate(() => localStorage.removeItem('briar-glen-vslice-v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => Boolean(window.__BRIAR_GLENDebug?.getFenState),
      { timeout: 6000 }
    );

    let state = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (state.crossingOpened || state.discovered || state.wardenDefeated || state.cacheClaimed) {
      throw new Error(`${vp.name}: Fen should start locked: ${JSON.stringify(state)}`);
    }
    if (state.enemies.filter(e => e.type === 'mireling').length !== 2 ||
        !state.enemies.some(e => e.type === 'bogstalker') ||
        !state.enemies.some(e => e.type === 'fenwarden')) {
      throw new Error(`${vp.name}: Fen encounter roster missing: ${JSON.stringify(state.enemies)}`);
    }

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({
        reinforcedPickaxe: true,
        temperedSword: false,
        briarstringBow: false,
        moonrootStaff: false,
      });
      d.teleport(1050, -1200);
      d.interact();
    });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (state.crossingOpened) throw new Error(`${vp.name}: crossing opened without masterwork weapon`);

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ reinforcedPickaxe: true, temperedSword: true });
      d.teleport(1050, -1200);
      d.interact();
    });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (!state.crossingOpened || !state.discovered || !state.mapDiscovered) {
      throw new Error(`${vp.name}: crossing did not open and chart: ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(1210, -1370);
      d.interact();
    });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (state.mossglass !== 1 || state.zone !== 'MOSSWATER FEN') {
      throw new Error(`${vp.name}: Mossglass/Fen zone failed: ${JSON.stringify(state)}`);
    }

    const beforeBossCoins = await page.evaluate(() => window.__BRIAR_GLENDebug.getState().player.coins);
    const defeated = await page.evaluate(() => window.__BRIAR_GLENDebug.defeatFenWarden());
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    const afterBossCoins = await page.evaluate(() => window.__BRIAR_GLENDebug.getState().player.coins);
    if (!defeated || !state.wardenDefeated || afterBossCoins !== beforeBossCoins + 76) {
      throw new Error(`${vp.name}: Drowned Warden reward failed`);
    }

    const beforeCache = await page.evaluate(() => ({
      player: window.__BRIAR_GLENDebug.getState().player,
      fen: window.__BRIAR_GLENDebug.getFenState(),
    }));
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(1515, -1830);
      d.interact();
    });
    const afterCache = await page.evaluate(() => ({
      player: window.__BRIAR_GLENDebug.getState().player,
      fen: window.__BRIAR_GLENDebug.getFenState(),
    }));
    if (!afterCache.fen.cacheClaimed ||
        afterCache.player.coins !== beforeCache.player.coins + 160 ||
        (afterCache.player.inventory.oil || 0) !== (beforeCache.player.inventory.oil || 0) + 2 ||
        afterCache.fen.mossglass !== beforeCache.fen.mossglass + 2) {
      throw new Error(`${vp.name}: reliquary reward incorrect: ${JSON.stringify(afterCache)}`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.interact());
    const afterSecondClaim = await page.evaluate(() => ({
      player: window.__BRIAR_GLENDebug.getState().player,
      fen: window.__BRIAR_GLENDebug.getFenState(),
    }));
    if (afterSecondClaim.player.coins !== afterCache.player.coins ||
        afterSecondClaim.fen.mossglass !== afterCache.fen.mossglass) {
      throw new Error(`${vp.name}: reliquary rewarded twice`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.openMap());
    const fenMapLabel = await page.locator('#map-marker-fen .marker-label').textContent();
    const discoveryCount = await page.locator('#map-discovery-count').textContent();
    if (fenMapLabel?.trim() !== 'MOSSWATER FEN' || !discoveryCount?.includes('/ 7')) {
      throw new Error(`${vp.name}: Fen map integration missing: ${fenMapLabel} / ${discoveryCount}`);
    }
    await page.evaluate(() => window.__BRIAR_GLENDebug.openJournal());
    const journalText = await page.locator('#journal-places').innerText();
    if (!journalText.includes('Mosswater Fen')) {
      throw new Error(`${vp.name}: Fen missing from Warden Journal`);
    }
    await page.evaluate(() => window.__BRIAR_GLENDebug.closeWardenBook());

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => Boolean(window.__BRIAR_GLENDebug?.getFenState),
      { timeout: 6000 }
    );
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (!state.crossingOpened || !state.discovered || !state.wardenDefeated ||
        !state.cacheClaimed || state.mossglass !== afterCache.fen.mossglass) {
      throw new Error(`${vp.name}: Fen progression did not persist: ${JSON.stringify(state)}`);
    }

    if (errors.length) {
      throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    }
    console.log(`PASS ${vp.name}: Mosswater Fen + gate + Mossglass + Drowned Warden + reliquary persistent`);
    await context.close();
  }
} finally {
  await browser.close();
}
