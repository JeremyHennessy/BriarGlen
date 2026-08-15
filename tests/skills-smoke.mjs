import { chromium } from 'playwright';

const target = process.argv[2];
const live = process.argv.includes('--live');
if (!target) throw new Error('Usage: node tests/skills-smoke.mjs <url> [--live]');

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
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on('console', msg => { if (msg.type() === 'error') runtimeErrors.push(`console: ${msg.text()}`); });

    const attempts = live ? 48 : 1;
    let loaded = false;
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        await page.goto(`${target}${sep}skills=${Date.now()}-${attempt}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
        await page.waitForFunction(() => Boolean(
          window.__BRIAR_GLENDebug?.getSkillState &&
          window.__BRIAR_GLENDebug?.getAimState &&
          window.__BRIAR_GLENDebug?.getControlState
        ), { timeout: 6000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: Build 8 runtime unavailable: ${lastError?.message || 'unknown'}`);

    if (vp.touch) {
      if (!(await page.locator('#skill-btn').isVisible())) throw new Error(`${vp.name}: SKILL button is hidden`);
      const box = await page.locator('#skill-btn').boundingBox();
      if (!box || box.x < -2 || box.y < -2 || box.x + box.width > vp.width + 2 || box.y + box.height > vp.height + 2) {
        throw new Error(`${vp.name}: SKILL button outside viewport: ${JSON.stringify(box)}`);
      }
    }

    const usePlatformSkill = async () => {
      if (vp.touch) {
        await page.locator('#skill-btn').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 41 });
      } else {
        await page.keyboard.press('KeyF');
      }
      await page.waitForTimeout(80);
    };

    // Sword: mobile should aim-assist even when facing away; desktop uses explicit facing.
    await page.evaluate(({ touch }) => {
      localStorage.removeItem('briar-glen-vslice-v1');
      const d = window.__BRIAR_GLENDebug;
      d.teleport(110, -230);
      d.setPlayer({ skillCd: 0, attackCd: 0, dashCd: 0, dashTimer: 0, facingX: touch ? -1 : 1, facingY: 0 });
      d.selectWeapon('sword');
    }, { touch: vp.touch });
    await page.waitForTimeout(40);
    const swordBefore = await page.evaluate(() => {
      const s = window.__BRIAR_GLENDebug.getState();
      return s.enemies.filter(e => e.type === 'wolf' && !e.dead)
        .sort((a,b) => Math.hypot(a.x-110,a.y+230)-Math.hypot(b.x-110,b.y+230))[0]?.hp;
    });
    await usePlatformSkill();
    let skill = await page.evaluate(() => window.__BRIAR_GLENDebug.getSkillState());
    const swordAfter = await page.evaluate(() => {
      const s = window.__BRIAR_GLENDebug.getState();
      return s.enemies.filter(e => e.type === 'wolf' && !e.dead)
        .sort((a,b) => Math.hypot(a.x-110,a.y+230)-Math.hypot(b.x-110,b.y+230))[0]?.hp;
    });
    if (skill.last.type !== 'cleave' || skill.last.hits < 1 || !(swordAfter < swordBefore) || skill.cooldown <= 3.2) {
      throw new Error(`${vp.name}: sword CLEAVE failed: before=${swordBefore}, after=${swordAfter}, ${JSON.stringify(skill)}`);
    }

    // Bow: Piercing Shot must damage a separate nearby wolf and report its hit.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(350, 230);
      d.setPlayer({ skillCd: 0, attackCd: 0, facingX: 1, facingY: 0 });
      d.selectWeapon('bow');
    });
    await page.waitForTimeout(40);
    const bowBefore = await page.evaluate(() => {
      const s = window.__BRIAR_GLENDebug.getState();
      return s.enemies.filter(e => e.type === 'wolf' && !e.dead)
        .sort((a,b) => Math.hypot(a.x-350,a.y-230)-Math.hypot(b.x-350,b.y-230))[0]?.hp;
    });
    await usePlatformSkill();
    skill = await page.evaluate(() => window.__BRIAR_GLENDebug.getSkillState());
    const bowAfter = await page.evaluate(() => {
      const s = window.__BRIAR_GLENDebug.getState();
      return s.enemies.filter(e => e.type === 'wolf' && !e.dead)
        .sort((a,b) => Math.hypot(a.x-350,a.y-230)-Math.hypot(b.x-350,b.y-230))[0]?.hp;
    });
    if (skill.last.type !== 'pierce' || skill.last.hits < 1 || skill.last.damage !== 30 || !(bowAfter < bowBefore)) {
      throw new Error(`${vp.name}: bow PIERCE failed: before=${bowBefore}, after=${bowAfter}, ${JSON.stringify(skill)}`);
    }

    // Staff: Briar Root must damage and root the nearby Hollow Boar.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(850, 235);
      d.setPlayer({ skillCd: 0, attackCd: 0, facingX: 1, facingY: 0 });
      d.selectWeapon('staff');
    });
    await page.waitForTimeout(40);
    const staffBefore = await page.evaluate(() => {
      const s = window.__BRIAR_GLENDebug.getState();
      return s.enemies.filter(e => e.type === 'boar' && !e.dead)
        .sort((a,b) => Math.hypot(a.x-850,a.y-235)-Math.hypot(b.x-850,b.y-235))[0]?.hp;
    });
    await usePlatformSkill();
    skill = await page.evaluate(() => window.__BRIAR_GLENDebug.getSkillState());
    const staffAfter = await page.evaluate(() => {
      const s = window.__BRIAR_GLENDebug.getState();
      return s.enemies.filter(e => e.type === 'boar' && !e.dead)
        .sort((a,b) => Math.hypot(a.x-850,a.y-235)-Math.hypot(b.x-850,b.y-235))[0]?.hp;
    });
    if (skill.last.type !== 'root' || skill.last.hits < 1 || skill.last.rooted < 1 || skill.last.damage !== 32 || !(staffAfter < staffBefore)) {
      throw new Error(`${vp.name}: staff ROOT failed: before=${staffBefore}, after=${staffAfter}, ${JSON.stringify(skill)}`);
    }

    if (runtimeErrors.length) throw new Error(`${vp.name}: runtime errors:\n${runtimeErrors.join('\n')}`);
    console.log(`PASS ${vp.name}: CLEAVE + PIERCE + ROOT weapon skills active`);
    await context.close();
  }
} finally {
  await browser.close();
}
