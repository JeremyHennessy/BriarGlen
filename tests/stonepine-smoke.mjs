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
        await page.goto(`${target}${sep}stone17=${Date.now()}-${attempt}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getStonepineState && window.__BRIAR_GLENDebug?.getBuildInfo), { timeout: 7000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (live && attempt < 48) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: Build 17+ Stonepine runtime unavailable: ${lastError?.message || 'unknown'}`);

    await page.evaluate(() => localStorage.removeItem('briar-glen-vslice-v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getStonepineState));

    const build = await page.evaluate(() => window.__BRIAR_GLENDebug.getBuildInfo());
    if (!(Number.parseFloat(build.version) >= 17) || build.saveKey !== 'briar-glen-vslice-v1') {
      throw new Error(`${vp.name}: incorrect Build 17+ metadata ${JSON.stringify(build)}`);
    }

    let state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineState());
    const enemyTypes = state.enemies.map(e => e.type);
    if (state.passOpened || state.discovered || state.bossDefeated || state.cacheClaimed || state.resinNodes !== 4) {
      throw new Error(`${vp.name}: fresh Stonepine progression incorrect ${JSON.stringify(state)}`);
    }
    if (enemyTypes.filter(t => t === 'ridgehorn').length !== 2 || enemyTypes.filter(t => t === 'quarrywisp').length !== 2 || enemyTypes.filter(t => t === 'quarrysentinel').length !== 1) {
      throw new Error(`${vp.name}: Stonepine enemy roster incorrect ${JSON.stringify(enemyTypes)}`);
    }

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(2240, -1500);
      d.interact();
    });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineState());
    if (state.passOpened) throw new Error(`${vp.name}: Stonepine Pass opened before Fen completion`);

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ fenCrossingOpened: true, fenDiscovered: true, fenWardenDefeated: true, fenCacheClaimed: true });
      d.teleport(2240, -1500); d.interact();
    });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineState());
    if (!state.passOpened) throw new Error(`${vp.name}: Stonepine Pass did not open after Fen completion`);

    await page.evaluate(() => window.__BRIAR_GLENDebug.teleport(2390, -1450));
    await sleep(120);
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineState());
    if (!state.discovered || !state.map || state.zone !== 'STONEPINE REACH') {
      throw new Error(`${vp.name}: Stonepine discovery/zone failed ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => { const d=window.__BRIAR_GLENDebug; d.teleport(2485,-1335); d.interact(); });
    await page.evaluate(() => { const d=window.__BRIAR_GLENDebug; d.teleport(2740,-1605); d.interact(); });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineState());
    if (state.inventory.resin !== 2) throw new Error(`${vp.name}: real Resin gathering incorrect ${JSON.stringify(state.inventory)}`);

    await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      d.setPlayer({ coins: 200 });
      d.setInventory({ tonic: 0, oil: 0 });
      d.teleport(2690,-1365);
      d.interact();
    });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineState());
    if (state.kits !== 1 || state.coins !== 145 || state.inventory.resin !== 0 || state.inventory.tonic !== 1 || state.inventory.oil !== 1) {
      throw new Error(`${vp.name}: Pitchwork Kit accounting incorrect ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.teleport(0, 0));
    await page.waitForFunction(() => !window.__BRIAR_GLENDebug.getStonepineState().scree[0].active, { timeout: 5000 });
    const screeSetup = await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      d.teleport(-720, 40);
      d.setPlayer({ hp: 100, maxHp: 100, invuln: 0 });
      const before=d.getStonepineState().counters.screeHits;
      return { before, triggered:d.triggerStonepineScree(0) };
    });
    if (!screeSetup.triggered) throw new Error(`${vp.name}: explicit scree trigger was not scheduled`);
    await page.waitForFunction(() => {
      const active = window.__BRIAR_GLENDebug.getStonepineState().scree[0].active;
      return active && !active.triggered && active.timer <= .12;
    }, { timeout: 5000 });
    await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      d.teleport(-720, 40);
      d.setPlayer({ hp: 100, maxHp: 100, invuln: 0 });
    });
    // Wait for the actual hazard event rather than wall-clock time. The game loop caps simulated dt,
    // so a loaded CI runner can advance less game time than an 850ms fixed sleep implies.
    await page.waitForFunction(expected => window.__BRIAR_GLENDebug.getStonepineState().counters.screeHits >= expected, screeSetup.before + 1, { timeout: 5000 });
    const screeAfter = await page.evaluate(() => ({ player:window.__BRIAR_GLENDebug.getState().player, stone:window.__BRIAR_GLENDebug.getStonepineState() }));
    if (screeAfter.stone.counters.screeHits !== screeSetup.before + 1 || screeAfter.player.hp !== 87) {
      throw new Error(`${vp.name}: scree hazard did not deal exact 13 damage ${JSON.stringify(screeAfter)}`);
    }

    await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      d.setThreat('ridgehorn',{ x:2530,y:-1470,hp:96,dead:false,hurt:0 });
      d.teleport(2750,-1470);
      d.forceStonepineTactic('ridgehorn','ridge-charge');
      d.teleport(2750,-1640);
    });
    // Wait for the actual committed charge rather than assuming 660ms wall-clock time always
    // advances the capped game loop through the Ridgehorn windup on a loaded CI runner.
    await page.waitForFunction(() => {
      const stone=window.__BRIAR_GLENDebug.getStonepineState();
      const ridge=stone.enemies.find(e=>e.type==='ridgehorn');
      return stone.counters.ridgeCharges >= 1 && ridge?.state && ['dash','stagger'].includes(ridge.state.mode);
    }, { timeout: 5000 });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineState());
    const ridge = state.enemies.find(e => e.type === 'ridgehorn');
    if (state.counters.ridgeCharges < 1 || !ridge?.state || !['dash','stagger'].includes(ridge.state.mode)) {
      throw new Error(`${vp.name}: Ridgehorn committed charge missing ${JSON.stringify(ridge)}`);
    }

    await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      d.teleport(-720,40);
      d.setThreat('quarrywisp',{ hp:68,dead:false,x:2820,y:-1280 });
      d.forceStonepineTactic('quarrywisp','wisp-shot');
    });
    // Wait for the actual committed ranged shot and live projectile rather than assuming a fixed
    // amount of wall-clock time equals the Wisp's simulated windup time under CI load.
    await page.waitForFunction(() => {
      const stone=window.__BRIAR_GLENDebug.getStonepineState();
      return stone.counters.wispShots >= 1 && stone.bolts >= 1;
    }, { timeout: 5000 });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineState());
    if (state.counters.wispShots < 1 || state.bolts < 1) {
      throw new Error(`${vp.name}: Quarry Wisp ranged shot missing ${JSON.stringify(state)}`);
    }

    await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      d.setProgress({ activeBoardContract:{ id:'briar_cull', kills:0 } });
      d.setThreat('ridgehorn',{ hp:20,dead:false,hurt:0 });
      d.defeatStonepineThreat('ridgehorn');
    });
    const board = await page.evaluate(() => window.__BRIAR_GLENDebug.getBoardState());
    if (board.active?.id !== 'briar_cull' || board.active.kills !== 1) {
      throw new Error(`${vp.name}: Stonepine threat did not count toward Cull the Briar ${JSON.stringify(board)}`);
    }

    const bossBefore = await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      d.setProgress({ activeBoardContract:null });
      d.setPlayer({ coins: 300 });
      d.setThreat('quarrysentinel',{ hp:290,dead:false,hurt:0 });
      const before=d.getStonepineState().coins;
      d.defeatStonepineBoss();
      return before;
    });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineState());
    if (!state.bossDefeated || state.coins - bossBefore !== 100) {
      throw new Error(`${vp.name}: Quarry Sentinel reward incorrect ${JSON.stringify(state)}`);
    }

    const cacheBefore = await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      const before=d.getStonepineState();
      d.teleport(3255,-1900);
      d.interact();
      return before;
    });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineState());
    if (!state.cacheClaimed || state.coins - cacheBefore.coins !== 140 || state.inventory.resin - cacheBefore.inventory.resin !== 2 || state.inventory.iron - cacheBefore.inventory.iron !== 1) {
      throw new Error(`${vp.name}: Stonepine Survey Cache reward incorrect ${JSON.stringify({before:cacheBefore,after:state})}`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.openMap());
    await page.waitForFunction(() =>
      document.querySelector('#map-marker-stonepine .marker-label')?.textContent === 'STONEPINE REACH' &&
      document.getElementById('map-discovery-count')?.textContent?.includes('/ 8 locations charted')
    );
    const mapText = await page.locator('#map-discovery-count').innerText();
    if (!mapText.includes('/ 8 locations charted')) throw new Error(`${vp.name}: map location total was not extended to 8: ${mapText}`);
    await page.evaluate(() => window.__BRIAR_GLENDebug.openJournal());
    await page.waitForFunction(() => document.getElementById('journal-places')?.innerText?.includes('Stonepine Reach'));
    const journal = await page.locator('#warden-journal-view').innerText();
    for (const text of ['Stonepine Reach','Pitchwork Kit','Quarry Sentinel defeated','Stonepine Survey Cache recovered']) {
      if (!journal.includes(text)) throw new Error(`${vp.name}: Stonepine Journal missing ${text}`);
    }
    const overlayBox = await page.locator('#warden-overlay').boundingBox();
    if (!overlayBox || overlayBox.x < -2 || overlayBox.y < -2 || overlayBox.x + overlayBox.width > vp.width + 2 || overlayBox.y + overlayBox.height > vp.height + 2) {
      throw new Error(`${vp.name}: Warden book outside viewport ${JSON.stringify(overlayBox)}`);
    }
    await page.evaluate(() => window.__BRIAR_GLENDebug.closeWardenBook());

    await page.reload({ waitUntil:'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getStonepineState));
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getStonepineState());
    if (!state.passOpened || !state.discovered || !state.bossDefeated || !state.cacheClaimed || state.kits !== 1 || state.inventory.resin !== 2 || !state.map) {
      throw new Error(`${vp.name}: Stonepine progression did not persist ${JSON.stringify(state)}`);
    }

    const overflow = await page.evaluate(() => ({ sw:document.documentElement.scrollWidth, iw:innerWidth, sh:document.documentElement.scrollHeight, ih:innerHeight }));
    if (overflow.sw > overflow.iw + 1 || overflow.sh > overflow.ih + 1) throw new Error(`${vp.name}: Stonepine caused browser overflow ${JSON.stringify(overflow)}`);
    if (errors.length) throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);

    console.log(`PASS ${vp.name}: Stonepine Reach + Resin economy + scree + Ridgehorn/Wisp + Quarry Sentinel + map persistence active`);
    await context.close();
  }
} finally {
  await browser.close();
}
