import { chromium } from 'playwright';

const target = process.argv[2];
const live = process.argv.includes('--live');
if (!target) throw new Error('Usage: node tests/map-journal-smoke.mjs <url> [--live]');

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
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });

    const attempts = live ? 48 : 1;
    let loaded = false;
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        await page.goto(`${target}${sep}mapjournal=${Date.now()}-${attempt}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getJournalState), { timeout: 6000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: map/journal runtime unavailable: ${lastError?.message || 'unknown'}`);

    await page.evaluate(() => localStorage.removeItem('briar-glen-vslice-v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getJournalState), { timeout: 6000 });

    let state = await page.evaluate(() => window.__BRIAR_GLENDebug.getJournalState());
    if (!state.discoveries.briar) throw new Error(`${vp.name}: Briar Glen should be charted at start`);
    if (state.discoveries.grove) throw new Error(`${vp.name}: Grove should not be charted on a fresh save`);

    await page.evaluate(() => window.__BRIAR_GLENDebug.openMap());
    if (!(await page.locator('#warden-overlay').isVisible())) throw new Error(`${vp.name}: map overlay did not open`);
    const box = await page.locator('#warden-overlay').boundingBox();
    if (!box || box.x < -2 || box.y < -2 || box.x + box.width > vp.width + 2 || box.y + box.height > vp.height + 2) {
      throw new Error(`${vp.name}: map overlay outside viewport: ${JSON.stringify(box)}`);
    }

    const before = await page.evaluate(() => window.__BRIAR_GLENDebug.getState().player);
    await page.keyboard.down('KeyW'); await sleep(220); await page.keyboard.up('KeyW');
    const after = await page.evaluate(() => window.__BRIAR_GLENDebug.getState().player);
    if (Math.hypot(after.x - before.x, after.y - before.y) > 2) throw new Error(`${vp.name}: player moved while map was open`);
    await page.evaluate(() => window.__BRIAR_GLENDebug.closeWardenBook());

    for (const [x, y] of [[-100, 0], [800, 0], [1600, 0]]) {
      await page.evaluate(([px, py]) => window.__BRIAR_GLENDebug.teleport(px, py), [x, y]);
      await sleep(100);
    }
    await page.evaluate(() => window.__BRIAR_GLENDebug.setProgress({ groveDiscovered: true, shortcutUnlocked: true }));
    await page.waitForFunction(() => {
      const discoveries = window.__BRIAR_GLENDebug.getJournalState().discoveries;
      return ['briar','meadow','hollow','den','grove','rootway'].every(key => discoveries[key]);
    }, { timeout: 3000 });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getJournalState());
    for (const key of ['briar','meadow','hollow','den','grove','rootway']) {
      if (!state.discoveries[key]) throw new Error(`${vp.name}: ${key} was not charted`);
    }
    if (state.discoveredCount !== 6) throw new Error(`${vp.name}: expected 6 charted locations, got ${state.discoveredCount}`);

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({
        contractComplete: true, patrolComplete: true, grovekeeperDefeated: true, groveCacheClaimed: true,
        reinforcedPickaxe: true, temperedSword: true, briarstringBow: true, moonrootStaff: true,
        gearVest: true, gearCharm: true, groveRelicOwned: true, wardenBootsOwned: true,
      });
      d.setInventory({ mooncap: 2, oil: 1 });
      d.openJournal();
    });
    if (!(await page.locator('#warden-journal-view').isVisible())) throw new Error(`${vp.name}: journal tab did not open`);
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getJournalState());
    if (!state.milestones.every(m => m.complete)) throw new Error(`${vp.name}: journal milestones incomplete: ${JSON.stringify(state.milestones)}`);
    if (!state.recipes.every(r => r.known)) throw new Error(`${vp.name}: journal recipes incomplete: ${JSON.stringify(state.recipes)}`);
    const owned = state.gear.filter(g => g.owned).length;
    if (owned !== state.gear.length) throw new Error(`${vp.name}: journal gear record incomplete: ${owned}/${state.gear.length}`);
    await page.evaluate(() => window.__BRIAR_GLENDebug.closeWardenBook());

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getJournalState), { timeout: 6000 });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getJournalState());
    if (state.discoveredCount !== 6) throw new Error(`${vp.name}: map discoveries did not persist after reload: ${JSON.stringify(state.discoveries)}`);

    if (errors.length) throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: discovery map + Warden Journal active and persistent`);
    await context.close();
  }
} finally {
  await browser.close();
}
