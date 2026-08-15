import { chromium } from 'playwright';

const target = process.argv[2];
const live = process.argv.includes('--live');
if (!target) throw new Error('Usage: node tests/fen-smoke.mjs <url> [--live]');
const viewports = [
  ['phone-landscape', 932, 430, true],
  ['phone-portrait', 430, 932, true],
  ['desktop', 1440, 900, false],
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });

try {
  for (const [name, width, height, touch] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

    let loaded = false, lastError;
    for (let attempt = 1; attempt <= (live ? 48 : 1); attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        await page.goto(`${target}${sep}fen=${Date.now()}-${attempt}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForFunction(() => !!window.__BRIAR_GLENDebug?.getFenState, { timeout: 6000 });
        loaded = true; break;
      } catch (e) {
        lastError = e;
        if (live && attempt < 48) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${name}: Fen runtime unavailable: ${lastError?.message || 'unknown'}`);

    await page.evaluate(() => localStorage.removeItem('briar-glen-vslice-v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__BRIAR_GLENDebug?.getFenState);

    let s = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (s.crossingOpened || s.discovered || s.wardenDefeated || s.cacheClaimed) {
      throw new Error(`${name}: Fen should start locked`);
    }
    if (s.enemies.filter(e => e.type === 'mireling').length !== 2 ||
        !s.enemies.some(e => e.type === 'bogstalker') ||
        !s.enemies.some(e => e.type === 'fenwarden')) {
      throw new Error(`${name}: Fen encounter roster missing`);
    }

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ reinforcedPickaxe: true, temperedSword: false, briarstringBow: false, moonrootStaff: false });
      d.teleport(1050, -1200); d.interact();
    });
    if ((await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState())).crossingOpened) {
      throw new Error(`${name}: crossing opened without masterwork weapon`);
    }

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ reinforcedPickaxe: true, temperedSword: true });
      d.teleport(1050, -1200); d.interact();
    });
    s = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (!s.crossingOpened || !s.discovered || !s.mapDiscovered) throw new Error(`${name}: crossing did not open/chart`);

    await page.evaluate(() => { const d=window.__BRIAR_GLENDebug; d.teleport(1210,-1370); d.interact(); });
    s = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (s.mossglass !== 1 || s.zone !== 'MOSSWATER FEN') throw new Error(`${name}: Mossglass/Fen zone failed`);

    const beforeBoss = await page.evaluate(() => window.__BRIAR_GLENDebug.getState().player.coins);
    const defeated = await page.evaluate(() => window.__BRIAR_GLENDebug.defeatFenWarden());
    s = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    const afterBoss = await page.evaluate(() => window.__BRIAR_GLENDebug.getState().player.coins);
    if (!defeated || !s.wardenDefeated || afterBoss !== beforeBoss + 76) throw new Error(`${name}: Drowned Warden reward failed`);

    const beforeCache = await page.evaluate(() => ({
      player: window.__BRIAR_GLENDebug.getState().player,
      fen: window.__BRIAR_GLENDebug.getFenState(),
    }));
    await page.evaluate(() => { const d=window.__BRIAR_GLENDebug; d.teleport(1515,-1830); d.interact(); });
    const afterCache = await page.evaluate(() => ({
      player: window.__BRIAR_GLENDebug.getState().player,
      fen: window.__BRIAR_GLENDebug.getFenState(),
    }));
    if (!afterCache.fen.cacheClaimed ||
        afterCache.player.coins !== beforeCache.player.coins + 160 ||
        (afterCache.player.inventory.oil || 0) !== (beforeCache.player.inventory.oil || 0) + 2 ||
        afterCache.fen.mossglass !== beforeCache.fen.mossglass + 2) {
      throw new Error(`${name}: reliquary reward incorrect`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.interact());
    const second = await page.evaluate(() => ({ p: window.__BRIAR_GLENDebug.getState().player, f: window.__BRIAR_GLENDebug.getFenState() }));
    if (second.p.coins !== afterCache.player.coins || second.f.mossglass !== afterCache.fen.mossglass) {
      throw new Error(`${name}: reliquary rewarded twice`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.openMap());
    await page.waitForFunction(() => document.querySelector('#map-marker-fen .marker-label')?.textContent?.trim() === 'MOSSWATER FEN');
    if (!(await page.locator('#map-discovery-count').textContent())?.includes('/ 7')) throw new Error(`${name}: Fen map count missing`);

    await page.evaluate(() => window.__BRIAR_GLENDebug.openJournal());
    await page.waitForFunction(() => document.getElementById('journal-places')?.innerText?.includes('Mosswater Fen'));
    await page.evaluate(() => window.__BRIAR_GLENDebug.closeWardenBook());

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__BRIAR_GLENDebug?.getFenState);
    s = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (!s.crossingOpened || !s.discovered || !s.wardenDefeated || !s.cacheClaimed || s.mossglass !== afterCache.fen.mossglass) {
      throw new Error(`${name}: Fen progression did not persist`);
    }
    if (errors.length) throw new Error(`${name}: runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${name}: Mosswater Fen + gate + Mossglass + Drowned Warden + reliquary persistent`);
    await context.close();
  }
} finally {
  await browser.close();
}
