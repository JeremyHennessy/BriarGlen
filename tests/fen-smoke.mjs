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
    page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });

    const attempts = live ? 48 : 1;
    let loaded = false;
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        await page.goto(`${target}${sep}fen=${Date.now()}-${attempt}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getFenState), { timeout: 6000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: Fen runtime unavailable: ${lastError?.message || 'unknown'}`);

    await page.evaluate(() => localStorage.removeItem('briar-glen-vslice-v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getFenState), { timeout: 6000 });

    let fen = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (fen.crossingUnlocked || fen.discovered || fen.wardenDefeated || fen.sigil) {
      throw new Error(`${vp.name}: fresh Fen progression should be locked: ${JSON.stringify(fen)}`);
    }
    const types = fen.enemies.map(e => e.type);
    if (types.filter(t => t === 'mireling').length !== 2 || types.filter(t => t === 'spitter').length !== 2 || types.filter(t => t === 'fenwarden').length !== 1) {
      throw new Error(`${vp.name}: expected 2 Mirelings, 2 Reed Spitters and 1 Fen Warden: ${JSON.stringify(types)}`);
    }

    // Locked southern world boundary must hold before the crossing is restored.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(1080, 680);
    });
    const lockedStep = await page.evaluate(() => window.__BRIAR_GLENDebug.movePlayerDelta(0, 40));
    if (lockedStep.after.y >= 690) throw new Error(`${vp.name}: entered Mosswater Fen before crossing unlock: ${JSON.stringify(lockedStep)}`);

    // Crossing interaction rejects an ordinary tool, then opens with the reinforced pickaxe.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(1080, 585);
      d.setProgress({ reinforcedPickaxe: false, temperedSword: true, groveCacheClaimed: true });
      d.interact();
    });
    fen = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (fen.crossingUnlocked) throw new Error(`${vp.name}: crossing opened without Reinforced Pickaxe`);

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ reinforcedPickaxe: true, temperedSword: true, groveCacheClaimed: true });
      d.interact();
    });
    fen = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (!fen.crossingUnlocked) throw new Error(`${vp.name}: Old Warden Crossing failed to unlock`);

    // Discovery and zone identity.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(1050, 760);
      d.setPlayer({ hp: 125, maxHp: 125, invuln: 999, oilTimer: 0 });
    });
    await sleep(140);
    fen = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (!fen.discovered || !fen.mapDiscovered || fen.zone !== 'MOSSWATER FEN') {
      throw new Error(`${vp.name}: Fen discovery/zone failed: ${JSON.stringify(fen)}`);
    }

    // Actual collideMove wrapper: Trail Boots must materially reduce mire slowdown.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ wardenBootsOwned: false, wardenBootsEquipped: false });
      d.teleport(1000, 800);
    });
    const noBoots = await page.evaluate(() => window.__BRIAR_GLENDebug.movePlayerDelta(100, 0));
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ wardenBootsOwned: true, wardenBootsEquipped: true });
      d.teleport(1000, 800);
    });
    const withBoots = await page.evaluate(() => window.__BRIAR_GLENDebug.movePlayerDelta(100, 0));
    const slowMove = noBoots.after.x - noBoots.before.x;
    const bootMove = withBoots.after.x - withBoots.before.x;
    if (!(bootMove > slowMove + 15)) throw new Error(`${vp.name}: Trail Boots did not reduce mire slowdown: ${slowMove} vs ${bootMove}`);

    // Bog Amber uses the real interaction path and reinforced pickaxe gate.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ reinforcedPickaxe: true });
      d.teleport(820, 910);
      d.interact();
    });
    fen = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (fen.bogAmber !== 1) throw new Error(`${vp.name}: Bog Amber interaction failed: ${JSON.stringify(fen)}`);

    // Mireling debuff path.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setPlayer({ hp: 125, maxHp: 125, invuln: 0 });
      d.setProgress({ wardenBootsOwned: false, wardenBootsEquipped: false });
      d.hitWithMireling();
    });
    fen = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (fen.mireTimer < 1.4) throw new Error(`${vp.name}: Mireling did not apply mire slow: ${JSON.stringify(fen)}`);

    // Reed Spitter launches an actual projectile that resolves into a mire pool.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(1000, 835);
      d.setPlayer({ hp: 125, maxHp: 125, invuln: 0 });
      d.forceFenSpit();
    });
    await sleep(900);
    fen = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (fen.pools < 1) throw new Error(`${vp.name}: Reed Spitter projectile did not create a mire pool: ${JSON.stringify(fen)}`);

    // Fen Warden strongly resists a non-masterwork selected weapon, but not its masterwork version.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.selectWeapon('bow', false);
      d.setPlayer({ oilTimer: 0 });
      d.setProgress({ briarstringBow: false });
      d.resetFenWarden(280);
      d.damageFenWarden(20);
    });
    let boss = (await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState())).enemies.find(e => e.type === 'fenwarden');
    const resistedDamage = 280 - boss.hp;
    if (resistedDamage !== 8) throw new Error(`${vp.name}: expected non-masterwork Fen Warden damage 8, got ${resistedDamage}`);

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ briarstringBow: true });
      d.resetFenWarden(280);
      d.damageFenWarden(20);
    });
    boss = (await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState())).enemies.find(e => e.type === 'fenwarden');
    const masterworkDamage = 280 - boss.hp;
    if (masterworkDamage !== 24) throw new Error(`${vp.name}: expected masterwork Fen Warden damage 24, got ${masterworkDamage}`);

    // Defeat the miniboss through damageEnemy, then restore the Fenward Sigil with 3 Bog Amber.
    await page.evaluate(() => window.__BRIAR_GLENDebug.damageFenWarden(1000));
    fen = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (!fen.wardenDefeated) throw new Error(`${vp.name}: Fen Warden defeat did not persist into progression`);

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setInventory({ bogAmber: 3 });
      d.setProgress({
        mapDiscoveries: { briar:true, meadow:true, hollow:true, den:true, grove:true, rootway:true, fen:true },
        contractComplete:true, patrolComplete:true, grovekeeperDefeated:true, groveCacheClaimed:true,
        reinforcedPickaxe:true, temperedSword:true, briarstringBow:true, moonrootStaff:true,
        gearVest:true, gearCharm:true, groveRelicOwned:true, wardenBootsOwned:true, wardenBootsEquipped:true,
        fenCrossingUnlocked:true, fenDiscovered:true, fenWardenDefeated:true, fenwardSigilOwned:false,
      });
      d.teleport(1115, 1150);
      d.interact();
    });
    fen = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (!fen.sigil || fen.bogAmber !== 0) throw new Error(`${vp.name}: Fenward Sigil restoration failed: ${JSON.stringify(fen)}`);

    // Fenward Sigil must reduce actual hazard damage from 20 to 14.
    const damage = await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ fenwardSigilOwned: false });
      d.setPlayer({ hp: 100, maxHp: 125 });
      const full = d.takeFenHazard(20);
      d.setProgress({ fenwardSigilOwned: true });
      d.setPlayer({ hp: 100, maxHp: 125 });
      const reduced = d.takeFenHazard(20);
      return { full, reduced };
    });
    if (damage.full !== 20 || damage.reduced !== 14) throw new Error(`${vp.name}: Fenward Sigil mitigation wrong: ${JSON.stringify(damage)}`);

    // Build 10 map/journal must visibly extend to the new region without breaking the old field book.
    await page.evaluate(() => window.__BRIAR_GLENDebug.openMap());
    const marker = page.locator('#map-marker-fen .marker-label');
    if ((await marker.textContent()) !== 'MOSSWATER FEN') throw new Error(`${vp.name}: Mosswater Fen map marker not charted`);
    const countText = await page.locator('#map-discovery-count').textContent();
    if (!countText?.includes('7 / 7')) throw new Error(`${vp.name}: map count did not expand to 7 locations: ${countText}`);

    await page.evaluate(() => window.__BRIAR_GLENDebug.openJournal());
    const journalText = await page.locator('#warden-journal-view').innerText();
    for (const expected of ['Mosswater Fen', 'Fen Warden defeated', 'Fenward Sigil']) {
      if (!journalText.includes(expected)) throw new Error(`${vp.name}: journal missing ${expected}`);
    }
    await page.evaluate(() => window.__BRIAR_GLENDebug.closeWardenBook());

    // Save was written by the shrine interaction; all permanent Fen progression must survive reload.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ fenwardSigilOwned: true });
      // Trigger a save through the existing visibility-independent interaction path.
      d.teleport(1115, 1150);
      d.interact();
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getFenState), { timeout: 6000 });
    fen = await page.evaluate(() => window.__BRIAR_GLENDebug.getFenState());
    if (!fen.crossingUnlocked || !fen.discovered || !fen.wardenDefeated || !fen.sigil) {
      throw new Error(`${vp.name}: Fen progression did not survive reload: ${JSON.stringify(fen)}`);
    }

    if (errors.length) throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Mosswater Fen + mire hazards + new enemies + Fen Warden + Fenward Sigil active`);
    await context.close();
  }
} finally {
  await browser.close();
}
