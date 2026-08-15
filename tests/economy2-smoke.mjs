import { chromium } from 'playwright';

const target = process.argv[2];
const live = process.argv.includes('--live');
if (!target) throw new Error('Usage: node tests/economy2-smoke.mjs <url> [--live]');

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
        await page.goto(`${target}${sep}economy14=${Date.now()}-${attempt}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getMarketState && window.__BRIAR_GLENDebug?.getBuildInfo), { timeout: 7000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (live && attempt < 48) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: Build 14+ economy runtime unavailable: ${lastError?.message || 'unknown'}`);

    await page.evaluate(() => localStorage.removeItem('briar-glen-vslice-v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getMarketState));

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
        boardContractsCompleted: 0,
      });
      d.setPlayer({ coins: 1000 });
      d.setInventory({ herb: 0, mooncap: 0, ore: 0, hide: 0, tonic: 0, oil: 0, iron: 0, mossglass: 0, binding: 0 });
      d.teleport(-335, -205);
      d.interact();
      d.refreshMarket();
    });

    if (!(await page.locator('#trade-panel').isVisible())) throw new Error(`${vp.name}: Rowan trade panel did not open`);
    const box = await page.locator('#trade-panel').boundingBox();
    if (!box || box.x < -2 || box.y < -2 || box.x + box.width > vp.width + 2 || box.y + box.height > vp.height + 2) {
      throw new Error(`${vp.name}: Rowan market panel outside viewport: ${JSON.stringify(box)}`);
    }

    let state = await page.evaluate(() => window.__BRIAR_GLENDebug.getMarketState());
    if (state.cycle !== 'road' || state.epoch !== 0 || JSON.stringify(state.offers) !== JSON.stringify(['briarleaf_parcel','mooncap_pouch','warden_binding'])) {
      throw new Error(`${vp.name}: road rotation incorrect: ${JSON.stringify(state)}`);
    }
    if (await page.locator('#market14-stock .market14-card').count() !== 3) throw new Error(`${vp.name}: expected three rotating stock cards`);
    if (await page.locator('#market14-services .market14-card').count() !== 4) throw new Error(`${vp.name}: expected four market services`);

    await page.locator('[data-market-buy="briarleaf_parcel"]').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getMarketState());
    if (state.coins !== 940 || state.inventory.herb !== 3 || state.coinsSpent !== 60 || !state.purchases.briarleaf_parcel) {
      throw new Error(`${vp.name}: Briarleaf Parcel accounting incorrect: ${JSON.stringify(state)}`);
    }
    await page.locator('[data-market-buy="warden_binding"]').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getMarketState());
    if (state.coins !== 850 || state.inventory.binding !== 1 || state.coinsSpent !== 150) {
      throw new Error(`${vp.name}: Warden Binding purchase incorrect: ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.setInventory({ hide: 1, mooncap: 1 }));
    await page.locator('[data-market-service="expedition_assembly"]').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getMarketState());
    if (state.coins !== 850 || state.inventory.binding !== 0 || state.inventory.hide !== 0 || state.inventory.herb !== 2 || state.inventory.mooncap !== 0 || state.inventory.tonic !== 2 || state.inventory.oil !== 2 || state.serviceUses !== 1) {
      throw new Error(`${vp.name}: Expedition Pack Assembly incorrect: ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.setInventory({ herb: 3, tonic: 1 }));
    await page.locator('[data-market-commission]').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getMarketState());
    if (!state.commissionDone || state.ordersCompleted !== 1 || state.coins !== 905 || state.inventory.herb !== 0 || state.inventory.tonic !== 0 || state.inventory.hide !== 1) {
      throw new Error(`${vp.name}: Roadwarden commission incorrect: ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ boardContractsCompleted: 1 });
      d.refreshMarket();
    });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getMarketState());
    if (state.cycle !== 'hollow' || state.epoch !== 1 || state.commissionDone || state.purchases.briarleaf_parcel || !state.offers.includes('copper_crate')) {
      throw new Error(`${vp.name}: Hollow rotation/restock incorrect: ${JSON.stringify(state)}`);
    }

    await page.locator('[data-market-buy="copper_crate"]').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getMarketState());
    if (state.coins !== 820 || state.inventory.ore !== 3 || state.coinsSpent !== 235) throw new Error(`${vp.name}: Copper Crate incorrect`);
    await page.locator('[data-market-service="iron_refine"]').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getMarketState());
    if (state.coins !== 745 || state.inventory.ore !== 0 || state.inventory.iron !== 1 || state.coinsSpent !== 310 || state.serviceUses !== 2) {
      throw new Error(`${vp.name}: Deepvein Refinement incorrect: ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.setInventory({ ore: 3, hide: 1 }));
    await page.locator('[data-market-commission]').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getMarketState());
    if (state.ordersCompleted !== 2 || state.coins !== 815 || state.inventory.ore !== 0 || state.inventory.hide !== 0 || state.inventory.mooncap !== 1) {
      throw new Error(`${vp.name}: Hollow Repair commission incorrect: ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ boardContractsCompleted: 2 });
      d.refreshMarket();
    });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getMarketState());
    if (state.cycle !== 'fen' || state.epoch !== 2 || !state.offers.includes('mossglass_case') || state.commission !== 'fen_survey_case') {
      throw new Error(`${vp.name}: Fen rotation incorrect: ${JSON.stringify(state)}`);
    }

    await page.locator('[data-market-buy="mossglass_case"]').click();
    await page.locator('[data-market-buy="oil_case"]').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getMarketState());
    if (state.coins !== 590 || state.inventory.mossglass !== 2 || state.inventory.oil !== 3 || state.coinsSpent !== 535) {
      throw new Error(`${vp.name}: Fen stock purchases incorrect: ${JSON.stringify(state)}`);
    }
    await page.locator('[data-market-commission]').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getMarketState());
    if (state.ordersCompleted !== 3 || state.coins !== 685 || state.inventory.mossglass !== 0 || state.inventory.oil !== 2 || state.inventory.iron !== 2 || !state.commissionDone) {
      throw new Error(`${vp.name}: Fen Survey commission incorrect: ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.openJournal());
    await page.waitForFunction(() => document.getElementById('journal-milestones')?.innerText?.includes('Rowan market: 535 c spent • 3 commissions'));
    await page.evaluate(() => window.__BRIAR_GLENDebug.closeWardenBook());

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getMarketState));
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getMarketState());
    if (state.epoch !== 2 || state.cycle !== 'fen' || state.coinsSpent !== 535 || state.ordersCompleted !== 3 || state.serviceUses !== 2 || !state.purchases.mossglass_case || !state.purchases.oil_case || !state.commissionDone || state.coins !== 685) {
      throw new Error(`${vp.name}: market progression did not persist: ${JSON.stringify(state)}`);
    }

    const build = await page.evaluate(() => window.__BRIAR_GLENDebug.getBuildInfo());
    if (!(Number.parseFloat(build.version) >= 14) || build.saveKey !== 'briar-glen-vslice-v1') {
      throw new Error(`${vp.name}: Build 14+ release metadata incorrect: ${JSON.stringify(build)}`);
    }
    if (errors.length) throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);

    console.log(`PASS ${vp.name}: rotating Rowan stock + coin sinks + specialty binding + mixed-reward commissions persistent`);
    await context.close();
  }
} finally {
  await browser.close();
}