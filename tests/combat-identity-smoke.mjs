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
        await page.goto(`${target}${sep}combat15=${Date.now()}-${attempt}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getCombatIdentityState && window.__BRIAR_GLENDebug?.getBuildInfo), { timeout: 7000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (live && attempt < 48) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: Build 15 runtime unavailable: ${lastError?.message || 'unknown'}`);

    await page.evaluate(() => localStorage.removeItem('briar-glen-vslice-v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getCombatIdentityState));

    const build = await page.evaluate(() => window.__BRIAR_GLENDebug.getBuildInfo());
    if (build.version !== '15' || build.label !== 'Enemy & Combat Identity' || build.saveKey !== 'briar-glen-vslice-v1') {
      throw new Error(`${vp.name}: incorrect Build 15 metadata ${JSON.stringify(build)}`);
    }

    const roles = await page.evaluate(() => window.__BRIAR_GLENDebug.getCombatIdentityState().enemies.map(e => [e.type, e.role]));
    const roleMap = Object.fromEntries(roles);
    for (const type of ['wolf','boar','mireling','bogstalker','grovekeeper','boss','fenwarden']) {
      if (!roleMap[type]) throw new Error(`${vp.name}: missing combat role for ${type}`);
    }

    const sword = await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setThreat('boar', { hp: 70, dead: false, hurt: 0 });
      d.forceEnemyTactic('boar', 'boar-charge');
      const beforeCounters = d.getCombatIdentityState().counters.interrupts;
      const result = d.damageIdentityThreat('boar', 24, 'sword');
      const after = d.getCombatIdentityState();
      return { result, beforeCounters, after };
    });
    if (!sword.result?.hit || sword.result.before - sword.result.after !== 24 || sword.after.counters.interrupts !== sword.beforeCounters + 1 || sword.result.state?.mode !== 'stagger') {
      throw new Error(`${vp.name}: sword interrupt identity incorrect ${JSON.stringify(sword)}`);
    }

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setThreat('boar', { hp: 70, dead: false, hurt: 0, x: 950, y: 235 });
      d.teleport(1180, 235);
      d.forceEnemyTactic('boar', 'boar-charge');
      d.teleport(1180, 420);
    });
    await sleep(660);
    const bow = await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      const beforeCounters = d.getCombatIdentityState().counters.countershots;
      const stateBefore = d.getCombatIdentityState().enemies.find(e => e.type === 'boar');
      const result = d.damageIdentityThreat('boar', 20, 'bow');
      const after = d.getCombatIdentityState();
      return { stateBefore, result, beforeCounters, after };
    });
    if (bow.stateBefore?.state?.mode !== 'dash' || bow.result.before - bow.result.after !== 25 || bow.after.counters.countershots !== bow.beforeCounters + 1) {
      throw new Error(`${vp.name}: bow countershot identity incorrect ${JSON.stringify(bow)}`);
    }

    const staff = await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setThreat('bogstalker', { hp: 118, dead: false, hurt: 0 });
      d.forceEnemyTactic('bogstalker', 'bog-ambush');
      const before = d.getCombatIdentityState();
      const beforeEnemy = before.enemies.find(e => e.type === 'bogstalker');
      const result = d.damageIdentityThreat('bogstalker', 10, 'staff');
      const after = d.getCombatIdentityState();
      const afterEnemy = after.enemies.find(e => e.type === 'bogstalker');
      return { beforeCounter: before.counters.snares, beforeEnemy, result, after, afterEnemy };
    });
    if (staff.result.before - staff.result.after !== 10 || staff.after.counters.snares !== staff.beforeCounter + 1 || !(staff.afterEnemy.state.timer > staff.beforeEnemy.state.timer)) {
      throw new Error(`${vp.name}: staff control identity incorrect ${JSON.stringify(staff)}`);
    }

    const mireSetup = await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ fenCrossingOpened: true, fenDiscovered: true });
      d.setPlayer({ hp: 100, maxHp: 100, invuln: 0 });
      d.setThreat('mireling', { hp: 78, dead: false, x: 1240, y: -1480 });
      d.teleport(1340, -1480);
      const before = d.getCombatIdentityState().counters.hazardHits;
      d.forceEnemyTactic('mireling', 'mire-bind');
      return { before };
    });
    await sleep(960);
    const mire = await page.evaluate(() => ({
      player: window.__BRIAR_GLENDebug.getState().player,
      identity: window.__BRIAR_GLENDebug.getCombatIdentityState(),
    }));
    if (mire.identity.counters.hazardHits <= mireSetup.before || mire.identity.playerRoot <= 0 || mire.player.hp >= 100) {
      throw new Error(`${vp.name}: Mireling bind/root did not resolve ${JSON.stringify(mire)}`);
    }

    const rootedStart = await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(-100, 300);
      d.setCombatRoot(1);
      return d.getState().player;
    });
    await page.keyboard.down('KeyD');
    await sleep(220);
    await page.keyboard.up('KeyD');
    const rootedEnd = await page.evaluate(() => window.__BRIAR_GLENDebug.getState().player);
    const rootedDistance = Math.hypot(rootedEnd.x - rootedStart.x, rootedEnd.y - rootedStart.y);

    const freeStart = await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(-100, 300);
      d.setCombatRoot(0);
      return d.getState().player;
    });
    await page.keyboard.down('KeyD');
    await sleep(220);
    await page.keyboard.up('KeyD');
    const freeEnd = await page.evaluate(() => window.__BRIAR_GLENDebug.getState().player);
    const freeDistance = Math.hypot(freeEnd.x - freeStart.x, freeEnd.y - freeStart.y);
    if (!(rootedDistance < freeDistance * .45)) {
      throw new Error(`${vp.name}: combat root did not materially slow movement rooted=${rootedDistance} free=${freeDistance}`);
    }

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(520, -700);
      d.setThreat('grovekeeper', { hp: 150, dead: false });
      d.forceEnemyTactic('grovekeeper', 'grove-root');
    });
    await sleep(710);
    const grove = await page.evaluate(() => window.__BRIAR_GLENDebug.getCombatIdentityState());
    if (grove.hazards.filter(h => h.label === 'ROOT ERUPTION').length < 3) {
      throw new Error(`${vp.name}: Grovekeeper root pattern missing ${JSON.stringify(grove.hazards)}`);
    }

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setThreat('fenwarden', { hp: 90, dead: false, x: 1450, y: -1760 });
      d.teleport(1660, -1760);
      d.forceEnemyTactic('fenwarden', 'warden-surge');
      d.teleport(1660, -1950);
    });
    await sleep(540);
    const warden = await page.evaluate(() => window.__BRIAR_GLENDebug.getCombatIdentityState().enemies.find(e => e.type === 'fenwarden'));
    if (!warden?.state || !['dash','recover'].includes(warden.state.mode) || warden.state.kind !== 'warden-surge') {
      throw new Error(`${vp.name}: Drowned Warden phase-two surge missing ${JSON.stringify(warden)}`);
    }

    await page.evaluate(() => window.__BRIAR_GLENDebug.openJournal());
    await page.waitForFunction(() => document.getElementById('journal-threat-notes')?.innerText?.includes('Briar Wolf'));
    const cardBox = await page.locator('#journal-threat-notes').boundingBox();
    if (!cardBox || cardBox.x < -2 || cardBox.x + cardBox.width > vp.width + 2) {
      throw new Error(`${vp.name}: Threat Notes outside viewport ${JSON.stringify(cardBox)}`);
    }
    const threatText = await page.locator('#journal-threat-notes').innerText();
    for (const name of ['Briar Wolf','Hollow Boar','Mireling','Bog Stalker','Grovekeeper','Drowned Warden']) {
      if (!threatText.includes(name)) throw new Error(`${vp.name}: Threat Notes missing ${name}`);
    }
    await page.evaluate(() => window.__BRIAR_GLENDebug.closeWardenBook());

    if (errors.length) throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: distinct enemy tactics + sword interrupts + bow countershots + staff control + boss patterns active`);
    await context.close();
  }
} finally {
  await browser.close();
}