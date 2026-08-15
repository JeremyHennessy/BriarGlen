import { chromium } from 'playwright';

const target = process.argv[2];
const live = process.argv.includes('--live');
if (!target) throw new Error('Usage: node tests/contracts-smoke.mjs <url> [--live]');

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

    let loaded = false, lastError;
    for (let attempt = 1; attempt <= (live ? 48 : 1); attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        await page.goto(`${target}${sep}contracts=${Date.now()}-${attempt}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getBoardState), { timeout: 6000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (live && attempt < 48) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: Contract Board runtime unavailable: ${lastError?.message || 'unknown'}`);

    await page.evaluate(() => localStorage.removeItem('briar-glen-vslice-v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getBoardState), { timeout: 6000 });

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({
        contractComplete: true,
        patrolComplete: true,
        groveDiscovered: true,
        grovekeeperDefeated: true,
        groveCacheClaimed: true,
        reinforcedPickaxe: true,
        temperedSword: true,
        briarstringBow: true,
        moonrootStaff: true,
        fenDiscovered: true,
        fenCrossingOpened: true,
        fenWardenDefeated: true,
        fenCacheClaimed: true,
        activeBoardContract: null,
        boardContractsCompleted: 0,
        boardContractCounts: {},
      });
      d.setPlayer({ coins: 500 });
      d.setInventory({ ore: 0, herb: 0, tonic: 0, mossglass: 0, oil: 0 });
      d.teleport(-615, -118);
      d.interact();
    });

    if (!(await page.locator('#board2-panel').isVisible())) throw new Error(`${vp.name}: Contract Board did not open`);
    const box = await page.locator('#board2-panel').boundingBox();
    if (!box || box.x < -2 || box.y < -2 || box.x + box.width > vp.width + 2 || box.y + box.height > vp.height + 2) {
      throw new Error(`${vp.name}: Contract Board outside viewport: ${JSON.stringify(box)}`);
    }

    let state = await page.evaluate(() => window.__BRIAR_GLENDebug.getBoardState());
    if (state.offers.length !== 3 || !state.offers.includes('briar_cull') || !state.offers.includes('copper_order') || !state.offers.includes('mosswater_survey')) {
      throw new Error(`${vp.name}: initial offers incorrect: ${JSON.stringify(state.offers)}`);
    }
    if (await page.locator('.board2-card').count() !== 3) throw new Error(`${vp.name}: expected exactly 3 contract cards`);

    const beforePos = await page.evaluate(() => window.__BRIAR_GLENDebug.getState().player);
    await page.keyboard.down('KeyW');
    await sleep(180);
    await page.keyboard.up('KeyW');
    const afterPos = await page.evaluate(() => window.__BRIAR_GLENDebug.getState().player);
    if (Math.hypot(afterPos.x - beforePos.x, afterPos.y - beforePos.y) > 2) throw new Error(`${vp.name}: movement leaked through Contract Board`);

    // Copper delivery: accept through real UI, then reload to prove active work persists.
    await page.locator('[data-contract-id="copper_order"] .board2-accept').click();
    await page.locator('#board2-close').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getBoardState));
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getBoardState());
    if (state.active?.id !== 'copper_order') throw new Error(`${vp.name}: active Copper Order did not persist`);

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setInventory({ ore: 3 });
      d.teleport(-615, -118);
      d.interact();
    });
    const copperBefore = await page.evaluate(() => window.__BRIAR_GLENDebug.getBoardState());
    await page.locator('#board2-turnin').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getBoardState());
    if (state.active || state.completed !== 1 || state.coins !== copperBefore.coins + 95 || state.inventory.ore !== 0 || state.counts.copper_order !== 1) {
      throw new Error(`${vp.name}: Copper Order turn-in incorrect: ${JSON.stringify(state)}`);
    }

    // Rotation after one completion should surface Field Medicine while retaining Hunt and Fen survey.
    if (!state.offers.includes('field_medicine') || !state.offers.includes('briar_cull') || !state.offers.includes('mosswater_survey')) {
      throw new Error(`${vp.name}: rotated offers incorrect: ${JSON.stringify(state.offers)}`);
    }

    // Hunt: actual enemy death path increments the board contract.
    await page.locator('[data-contract-id="briar_cull"] .board2-accept').click();
    await page.locator('#board2-close').click();
    for (let i = 0; i < 3; i++) {
      const killed = await page.evaluate(() => window.__BRIAR_GLENDebug.defeatBoardThreat());
      if (!killed) throw new Error(`${vp.name}: unable to find qualifying threat ${i + 1}`);
    }
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getBoardState());
    if (state.active?.id !== 'briar_cull' || state.active.kills !== 3 || !state.active.ready) {
      throw new Error(`${vp.name}: hunt progress incorrect: ${JSON.stringify(state.active)}`);
    }
    const huntBeforeCoins = state.coins;
    const huntBeforeTonic = state.inventory.tonic;
    await page.evaluate(() => { const d=window.__BRIAR_GLENDebug; d.teleport(-615,-118); d.interact(); });
    await page.locator('#board2-turnin').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getBoardState());
    if (state.completed !== 2 || state.coins !== huntBeforeCoins + 80 || state.inventory.tonic !== huntBeforeTonic + 1 || state.counts.briar_cull !== 1) {
      throw new Error(`${vp.name}: hunt reward incorrect: ${JSON.stringify(state)}`);
    }

    // Fen survey: exact material consumption + mixed reward.
    await page.evaluate(() => window.__BRIAR_GLENDebug.setInventory({ mossglass: 2 }));
    await page.locator('[data-contract-id="mosswater_survey"] .board2-accept').click();
    const fenBefore = await page.evaluate(() => window.__BRIAR_GLENDebug.getBoardState());
    await page.locator('#board2-turnin').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getBoardState());
    if (state.completed !== 3 || state.coins !== fenBefore.coins + 150 || state.inventory.mossglass !== 0 || state.inventory.oil !== fenBefore.inventory.oil + 1 || state.counts.mosswater_survey !== 1) {
      throw new Error(`${vp.name}: Mosswater Survey reward incorrect: ${JSON.stringify(state)}`);
    }

    // Odd rotation exposes Field Medicine; accept it and verify Journal/current objective integration.
    await page.locator('[data-contract-id="field_medicine"] .board2-accept').click();
    await page.locator('#board2-close').click();
    await page.evaluate(() => window.__BRIAR_GLENDebug.openJournal());
    await page.waitForFunction(() => document.getElementById('journal-objective-title')?.textContent?.includes('Field Medicine'));
    const milestoneText = await page.locator('#journal-milestones').innerText();
    if (!milestoneText.includes('Warden Board jobs completed: 3')) throw new Error(`${vp.name}: board completion record missing from Journal`);
    await page.evaluate(() => window.__BRIAR_GLENDebug.closeWardenBook());

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getBoardState));
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getBoardState());
    if (state.active?.id !== 'field_medicine' || state.completed !== 3 || state.counts.copper_order !== 1 || state.counts.briar_cull !== 1 || state.counts.mosswater_survey !== 1) {
      throw new Error(`${vp.name}: board progression did not persist: ${JSON.stringify(state)}`);
    }

    if (errors.length) throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Contract Board 2.0 choices + persistence + hunt + delivery + Fen survey active`);
    await context.close();
  }
} finally {
  await browser.close();
}
