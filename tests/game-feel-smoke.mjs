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

    let loaded = false;
    let lastError;
    for (let attempt = 1; attempt <= (live ? 48 : 1); attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        await page.goto(`${target}${sep}feel=${Date.now()}-${attempt}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getFeelState && window.__BRIAR_GLENDebug?.getBuildInfo), { timeout: 7000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (live && attempt < 48) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: game-feel runtime unavailable: ${lastError?.message || 'unknown'}`);

    await page.evaluate(() => {
      localStorage.removeItem('briar-glen-vslice-v1');
      localStorage.removeItem('briar-glen-audio-muted');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getFeelState && window.__BRIAR_GLENDebug?.getBuildInfo));

    const info = await page.evaluate(() => window.__BRIAR_GLENDebug.getBuildInfo());
    const releaseNumber = Number.parseFloat(info.version);
    if (!Number.isFinite(releaseNumber) || releaseNumber < 13 || info.saveKey !== 'briar-glen-vslice-v1') {
      throw new Error(`${vp.name}: Build 13+ game-feel baseline unavailable ${JSON.stringify(info)}`);
    }

    const sound = page.locator('#sound-btn');
    if (!(await sound.isVisible())) throw new Error(`${vp.name}: sound control missing`);
    const box = await sound.boundingBox();
    if (!box || box.x < -1 || box.y < -1 || box.x + box.width > vp.width + 1 || box.y + box.height > vp.height + 1) {
      throw new Error(`${vp.name}: sound control outside viewport ${JSON.stringify(box)}`);
    }

    let feel = await page.evaluate(() => window.__BRIAR_GLENDebug.getFeelState());
    if (feel.muted) throw new Error(`${vp.name}: fresh audio preference should be unmuted`);

    await sound.click();
    feel = await page.evaluate(() => window.__BRIAR_GLENDebug.getFeelState());
    if (!feel.muted || await page.evaluate(() => localStorage.getItem('briar-glen-audio-muted')) !== '1') {
      throw new Error(`${vp.name}: mute control did not persist preference`);
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getFeelState));
    feel = await page.evaluate(() => window.__BRIAR_GLENDebug.getFeelState());
    if (!feel.muted) throw new Error(`${vp.name}: muted preference did not survive reload`);
    await page.locator('#sound-btn').click();
    feel = await page.evaluate(() => window.__BRIAR_GLENDebug.getFeelState());
    if (feel.muted) throw new Error(`${vp.name}: sound control did not unmute`);

    const attackResult = await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      const state = d.getState();
      const wolf = state.enemies.find(enemy => enemy.type === 'wolf' && !enemy.dead);
      d.teleport(wolf.x - 62, wolf.y);
      d.setPlayer({ attackCd: 0, facingX: 1, facingY: 0, reinforced: false, weaponType: 'sword' });
      const before = d.getState().enemies.reduce((sum, enemy) => sum + enemy.hp, 0);
      d.attack();
      const after = d.getState().enemies.reduce((sum, enemy) => sum + enemy.hp, 0);
      return { before, after, feel: d.getFeelState() };
    });
    if (attackResult.before - attackResult.after !== 24) {
      throw new Error(`${vp.name}: later release changed baseline sword damage: ${attackResult.before - attackResult.after}`);
    }
    if (attackResult.feel.impactsGenerated < 1 || attackResult.feel.hitStop <= 0 || !attackResult.feel.recentAudio.includes('sword') || !attackResult.feel.recentAudio.includes('hit')) {
      throw new Error(`${vp.name}: normal hit feedback missing ${JSON.stringify(attackResult.feel)}`);
    }

    const heavyResult = await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(900, 235);
      const beforeFeel = d.getFeelState();
      const hit = d.damageFeelTarget(45);
      return { beforeFeel, hit, afterFeel: d.getFeelState() };
    });
    if (!heavyResult.hit || heavyResult.hit.before - heavyResult.hit.after !== 45) {
      throw new Error(`${vp.name}: heavy feel probe altered requested damage ${JSON.stringify(heavyResult.hit)}`);
    }
    if (heavyResult.afterFeel.impactsGenerated <= heavyResult.beforeFeel.impactsGenerated || !heavyResult.afterFeel.recentAudio.includes('heavy-hit')) {
      throw new Error(`${vp.name}: heavy-hit feedback missing ${JSON.stringify(heavyResult.afterFeel)}`);
    }

    const deathResult = await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      const before = d.getFeelState().deathsGenerated;
      const kill = d.killFeelTarget();
      return { before, kill, feel: d.getFeelState() };
    });
    if (!deathResult.kill?.dead || deathResult.feel.deathsGenerated <= deathResult.before || !deathResult.feel.recentAudio.includes('kill')) {
      throw new Error(`${vp.name}: death feedback missing ${JSON.stringify(deathResult)}`);
    }

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(0, 0);
      d.setPlayer({ dashCd: 0, dashTimer: 0, facingX: 1, facingY: 0 });
      d.dash();
    });
    await page.keyboard.down('KeyD');
    await sleep(120);
    await page.keyboard.up('KeyD');
    feel = await page.evaluate(() => window.__BRIAR_GLENDebug.getFeelState());
    if (feel.afterimagesGenerated < 1 || !feel.recentAudio.includes('dash')) {
      throw new Error(`${vp.name}: dash afterimage/audio feedback missing ${JSON.stringify(feel)}`);
    }

    await sleep(230);
    const beforeSteps = await page.evaluate(() => window.__BRIAR_GLENDebug.getFeelState().stepEvents);
    await page.keyboard.down('KeyD');
    await sleep(460);
    await page.keyboard.up('KeyD');
    const afterMove = await page.evaluate(() => ({ feel: window.__BRIAR_GLENDebug.getFeelState(), player: window.__BRIAR_GLENDebug.getState().player }));
    if (afterMove.feel.stepEvents <= beforeSteps || !afterMove.feel.recentAudio.includes('step')) {
      throw new Error(`${vp.name}: movement cadence feedback missing ${JSON.stringify(afterMove.feel)}`);
    }

    await sleep(750);
    feel = await page.evaluate(() => window.__BRIAR_GLENDebug.getFeelState());
    if (feel.afterimages > 2 || feel.impacts > 2 || feel.deaths > 2) {
      throw new Error(`${vp.name}: game-feel effects did not decay ${JSON.stringify(feel)}`);
    }

    if (errors.length) throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Build 13+ audio routing + hit-stop + recoil/death FX + dash trails + movement cadence active`);
    await context.close();
  }
} finally {
  await browser.close();
}
