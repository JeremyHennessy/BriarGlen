import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const live = process.argv.includes('--live');
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
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });

    let loaded = false, lastError;
    for (let attempt = 1; attempt <= (live ? 48 : 1); attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        await page.goto(`${target}${sep}logistics18=${Date.now()}-${attempt}`, { waitUntil:'domcontentloaded', timeout:15000 });
        await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getStonepineIntegrationState && window.__BRIAR_GLENDebug?.getBuildInfo), { timeout:7000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (live && attempt < 48) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: Build 18+ runtime unavailable: ${lastError?.message || 'unknown'}`);

    await page.evaluate(() => localStorage.removeItem('briar-glen-vslice-v1'));
    await page.reload({ waitUntil:'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getStonepineIntegrationState));

    const build = await page.evaluate(() => window.__BRIAR_GLENDebug.getBuildInfo());
    if (!(Number.parseFloat(build.version) >= 18) || build.saveKey !== 'briar-glen-vslice-v1') {
      throw new Error(`${vp.name}: incorrect Build 18+ metadata ${JSON.stringify(build)}`);
    }

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({
        contractComplete:true, patrolComplete:true,
        fenCrossingOpened:true, fenDiscovered:true, fenWardenDefeated:true, fenCacheClaimed:true,
        stonepinePassOpened:true, stonepineDiscovered:true, stonepineBossDefeated:true, stonepineCacheClaimed:true,
        boardContractsCompleted:0, activeBoardContract:null,
      });
      d.setPlayer({ coins:200 });
      d.setInventory({ resin:0, binding:0, iron:0, hide:0, tonic:0, oil:0, mooncap:0 });
      d.openBoard();
    });
    await page.waitForFunction(() => document.querySelector('[data-contract-id="stonepine_quarry_patrol"]'));
    if (!(await page.locator('#board2-panel').isVisible())) throw new Error(`${vp.name}: Contract Board did not open`);
    const boardBox = await page.locator('#board2-panel').boundingBox();
    if (!boardBox || boardBox.x < -2 || boardBox.y < -2 || boardBox.x + boardBox.width > vp.width + 2 || boardBox.y + boardBox.height > vp.height + 2) {
      throw new Error(`${vp.name}: Board outside viewport ${JSON.stringify(boardBox)}`);
    }
    if (await page.locator('#board2-grid .board2-card').count() < 4) throw new Error(`${vp.name}: Stonepine job was not added as fourth Board option`);

    await page.locator('[data-contract-id="stonepine_quarry_patrol"] [data-stonepine-work-action]').click();
    let state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineIntegrationState());
    if (!state.work.active || state.work.kills !== 0 || state.work.ready) throw new Error(`${vp.name}: Stonepine job did not activate ${JSON.stringify(state.work)}`);
    if (await page.locator('#board2-grid [data-accept]:not([disabled])').count()) throw new Error(`${vp.name}: base Board jobs remained selectable during Stonepine job`);
    await page.evaluate(() => window.__BRIAR_GLENDebug.closeBoard());

    await page.reload({ waitUntil:'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getStonepineIntegrationState));
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineIntegrationState());
    if (!state.work.active) throw new Error(`${vp.name}: active Stonepine job did not persist reload`);

    await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      d.setInventory({ resin:2 });
      d.setThreat('ridgehorn',{ hp:20,dead:false,hurt:0 });
      d.defeatStonepineThreat('ridgehorn');
      d.setThreat('quarrywisp',{ hp:20,dead:false,hurt:0 });
      d.defeatStonepineThreat('quarrywisp');
    });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineIntegrationState());
    if (state.work.kills !== 2 || !state.work.ready || state.inventory.resin !== 2) {
      throw new Error(`${vp.name}: Stonepine work progress incorrect ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.openBoard());
    await page.waitForFunction(() => document.querySelector('#board2-active [data-build18-active="stonepine"]'));
    const beforeTurnin = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineIntegrationState());
    await page.locator('#board2-active [data-stonepine-work-action]').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineIntegrationState());
    if (state.work.active || state.work.completed !== 1 || state.boardCompleted !== 1 || state.count !== 1 ||
        state.coins - beforeTurnin.coins !== 135 || state.inventory.resin !== 0 || state.inventory.binding - beforeTurnin.inventory.binding !== 1) {
      throw new Error(`${vp.name}: Stonepine job turn-in accounting incorrect ${JSON.stringify({ beforeTurnin, state })}`);
    }
    await page.evaluate(() => window.__BRIAR_GLENDebug.closeBoard());

    await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      d.setPlayer({ coins:500 });
      d.setInventory({ resin:0,binding:0,iron:0,hide:0,tonic:0,oil:0,mooncap:0 });
      d.teleport(-335,-205);
      d.interact();
      d.refreshStonepineSupply();
    });
    await page.waitForFunction(() => !document.getElementById('stonepine-supply-manifest')?.hidden && document.querySelector('[data-stone-buy="stone_iron_bar"]'));
    const tradeBox = await page.locator('#trade-panel').boundingBox();
    if (!tradeBox || tradeBox.x < -2 || tradeBox.y < -2 || tradeBox.x + tradeBox.width > vp.width + 2 || tradeBox.y + tradeBox.height > vp.height + 2) {
      throw new Error(`${vp.name}: Rowan panel outside viewport ${JSON.stringify(tradeBox)}`);
    }
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineIntegrationState());
    if (state.supply.epoch !== 1 || state.supply.cycle !== 'quarry' || JSON.stringify(state.supply.offers) !== JSON.stringify(['stone_iron_bar','stone_hide_roll','stone_binding'])) {
      throw new Error(`${vp.name}: Quarry Repair rotation incorrect ${JSON.stringify(state.supply)}`);
    }

    await page.locator('[data-stone-buy="stone_iron_bar"]').click();
    await page.locator('[data-stone-buy="stone_binding"]').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineIntegrationState());
    if (state.coins !== 265 || state.inventory.iron !== 1 || state.inventory.binding !== 1 || state.supply.coinsSpent !== 235) {
      throw new Error(`${vp.name}: Quarry stock accounting incorrect ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.setInventory({ resin:2, hide:1 }));
    await page.locator('[data-stone-service]').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineIntegrationState());
    if (state.coins !== 200 || state.inventory.resin !== 0 || state.inventory.hide !== 0 || state.inventory.tonic !== 2 || state.inventory.oil !== 2 || state.supply.services !== 1 || state.supply.coinsSpent !== 300) {
      throw new Error(`${vp.name}: Pitch-Sealed Pack accounting incorrect ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.setInventory({ resin:2, iron:1 }));
    await page.locator('[data-stone-commission]').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineIntegrationState());
    if (state.coins !== 320 || state.inventory.resin !== 0 || state.inventory.iron !== 0 || state.inventory.binding !== 2 || state.inventory.mooncap !== 1 || !state.supply.commissionDone || state.supply.commissions !== 1) {
      throw new Error(`${vp.name}: Quarry commission incorrect ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      d.setProgress({ boardContractsCompleted:2 });
      d.refreshStonepineSupply();
    });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineIntegrationState());
    if (state.supply.epoch !== 2 || state.supply.cycle !== 'highland' || state.supply.commissionDone || state.supply.purchases.stone_iron_bar || !state.supply.offers.includes('resin_bundle')) {
      throw new Error(`${vp.name}: Highland rotation/reset incorrect ${JSON.stringify(state.supply)}`);
    }

    await page.locator('[data-stone-buy="resin_bundle"]').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineIntegrationState());
    if (state.coins !== 200 || state.inventory.resin !== 2 || state.supply.coinsSpent !== 420 || !state.supply.purchases.resin_bundle) {
      throw new Error(`${vp.name}: Highland Resin stock accounting incorrect ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.setInventory({ resin:3, tonic:1 }));
    await page.locator('[data-stone-commission]').click();
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineIntegrationState());
    if (state.coins !== 290 || state.inventory.resin !== 0 || state.inventory.tonic !== 0 || state.inventory.hide !== 1 || state.supply.commissions !== 2 || !state.supply.commissionDone) {
      throw new Error(`${vp.name}: Highland commission incorrect ${JSON.stringify(state)}`);
    }

    await page.locator('#trade-close').click();
    await page.evaluate(() => window.__BRIAR_GLENDebug.openJournal());
    await page.waitForFunction(() => document.getElementById('journal-milestones')?.innerText?.includes('Stonepine Quarry Patrols completed: 1') && document.getElementById('journal-milestones')?.innerText?.includes('Stonepine market: 420 c spent • 2 commissions'));
    await page.evaluate(() => window.__BRIAR_GLENDebug.closeWardenBook());

    await page.locator('#inventory-strip').click();
    await page.waitForFunction(() => !document.getElementById('inventory-panel')?.hidden);
    if ((await page.locator('#panel-resin-count').textContent())?.trim() !== '0') throw new Error(`${vp.name}: Resin satchel count not synchronized`);
    await page.locator('#inventory-close').click();

    await page.reload({ waitUntil:'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getStonepineIntegrationState));
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineIntegrationState());
    if (state.work.active || state.work.completed !== 1 || state.boardCompleted !== 2 || state.count !== 1 ||
        state.supply.epoch !== 2 || state.supply.cycle !== 'highland' || state.supply.coinsSpent !== 420 || state.supply.commissions !== 2 || state.supply.services !== 1 ||
        !state.supply.purchases.resin_bundle || !state.supply.commissionDone || state.coins !== 290) {
      throw new Error(`${vp.name}: Stonepine logistics did not persist ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.openBoard());
    await page.waitForFunction(() => document.querySelector('[data-contract-id="stonepine_quarry_patrol"]'));
    if (await page.locator('#board2-grid .board2-card').count() < 4) throw new Error(`${vp.name}: Stonepine work card missing after reload`);
    await page.evaluate(() => window.__BRIAR_GLENDebug.closeBoard());

    const overflow = await page.evaluate(() => ({ sw:document.documentElement.scrollWidth, iw:innerWidth, sh:document.documentElement.scrollHeight, ih:innerHeight }));
    if (overflow.sw > overflow.iw + 1 || overflow.sh > overflow.ih + 1) throw new Error(`${vp.name}: logistics UI caused browser overflow ${JSON.stringify(overflow)}`);
    if (errors.length) throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);

    console.log(`PASS ${vp.name}: Stonepine Quarry Patrol + two-cycle Rowan manifest + Resin sinks + mixed commissions persistent`);
    await context.close();
  }
} finally {
  await browser.close();
}
