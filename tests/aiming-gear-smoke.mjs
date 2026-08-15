import { chromium } from 'playwright';

const target = process.argv[2];
const live = process.argv.includes('--live');
if (!target) throw new Error('Usage: node tests/aiming-gear-smoke.mjs <url> [--live]');

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
        await page.goto(`${target}${sep}aimGear=${Date.now()}-${attempt}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
        await page.waitForFunction(() => Boolean(
          window.__BRIAR_GLENDebug?.getAimState &&
          window.__BRIAR_GLENDebug?.getGearState &&
          window.__BRIAR_GLENDebug?.getControlState
        ), { timeout: 6000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: Build 7 runtime unavailable: ${lastError?.message || 'unknown'}`);

    await page.evaluate(() => {
      localStorage.removeItem('briar-glen-vslice-v1');
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({
        groveDiscovered: true,
        grovekeeperDefeated: false,
        groveCacheClaimed: false,
        groveRelicOwned: false,
        groveRelicEquipped: false,
        wardenBootsOwned: false,
        wardenBootsEquipped: false,
      });
      d.teleport(100, -230);
      d.setPlayer({ hp: 100, attackCd: 0, dashCd: 0, dashTimer: 0, facingX: -1, facingY: 0 });
      d.selectWeapon('bow');
    });

    if (vp.touch) {
      // Mobile ranged attack should acquire the nearby Briar Wolf despite facing away.
      await page.locator('#attack-btn').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 7 });
      await page.waitForTimeout(80);
      const aim = await page.evaluate(() => window.__BRIAR_GLENDebug.getAimState());
      const state = await page.evaluate(() => window.__BRIAR_GLENDebug.getState());
      if (aim.mode !== 'auto' || !aim.target || aim.target.dead) {
        throw new Error(`${vp.name}: mobile auto aim failed to acquire a target: ${JSON.stringify(aim)}`);
      }
      if (!state.enemies.some(e => e.type === 'wolf' && !e.dead && e.hp < e.maxHp)) {
        throw new Error(`${vp.name}: auto-aimed bow did not damage its target`);
      }
      const p = state.player;
      const tx = aim.target.x - p.x;
      const ty = aim.target.y - p.y;
      const td = Math.hypot(tx, ty) || 1;
      const dot = aim.facing.x * tx / td + aim.facing.y * ty / td;
      if (dot < .97) throw new Error(`${vp.name}: auto aim did not face target: dot=${dot}`);

      // Sword receives the same close-range assistance.
      await page.evaluate(() => {
        const d = window.__BRIAR_GLENDebug;
        d.teleport(105, -230);
        d.setPlayer({ attackCd: 0, facingX: -1, facingY: 0 });
        d.selectWeapon('sword');
      });
      const beforeWolf = await page.evaluate(() => {
        const wolf = window.__BRIAR_GLENDebug.getState().enemies
          .filter(e => e.type === 'wolf' && !e.dead)
          .sort((a,b) => Math.hypot(a.x-105,a.y+230)-Math.hypot(b.x-105,b.y+230))[0];
        return wolf?.hp;
      });
      await page.locator('#attack-btn').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 8 });
      await page.waitForTimeout(60);
      const afterWolf = await page.evaluate(() => {
        const wolf = window.__BRIAR_GLENDebug.getState().enemies
          .filter(e => e.type === 'wolf' && !e.dead)
          .sort((a,b) => Math.hypot(a.x-105,a.y+230)-Math.hypot(b.x-105,b.y+230))[0];
        return wolf?.hp;
      });
      if (!(Number.isFinite(beforeWolf) && Number.isFinite(afterWolf) && afterWolf < beforeWolf)) {
        throw new Error(`${vp.name}: sword aim assist did not connect (${beforeWolf} -> ${afterWolf})`);
      }
    } else {
      // Desktop aiming should follow the mouse, independent of movement/facing.
      await page.evaluate(() => {
        const d = window.__BRIAR_GLENDebug;
        d.teleport(-120, 500);
        d.setPlayer({ attackCd: 0, facingX: -1, facingY: 0 });
        d.selectWeapon('bow');
      });
      await page.mouse.move(vp.width / 2 + 220, vp.height / 2);
      await page.waitForTimeout(30);
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);
      const aim = await page.evaluate(() => window.__BRIAR_GLENDebug.getAimState());
      if (aim.mode !== 'mouse' || !aim.mouseActive || aim.facingScreen.x < .9 || Math.abs(aim.facingScreen.y) > .08) {
        throw new Error(`${vp.name}: desktop mouse aim is not screen-right aligned: ${JSON.stringify(aim)}`);
      }
    }

    // Fresh Grovekeeper defeat grants/equips the named ranged relic.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({
        grovekeeperDefeated: false,
        groveRelicOwned: false,
        groveRelicEquipped: false,
      });
      d.defeatGrovekeeper();
    });
    let gear = await page.evaluate(() => window.__BRIAR_GLENDebug.getGearState());
    if (!gear.relic.owned || !gear.relic.equipped || gear.bowDamage !== 22 || gear.staffDamage !== 29 || gear.staffSplash !== 92) {
      throw new Error(`${vp.name}: Grovekeeper Thorn reward/effect failed: ${JSON.stringify(gear)}`);
    }

    // Exercise the actual satchel equip control.
    await page.locator('#inventory-strip').click();
    if (!(await page.locator('#inventory-panel').isVisible())) throw new Error(`${vp.name}: satchel did not open for gear`);
    await page.locator('#toggle-relic-btn').click();
    gear = await page.evaluate(() => window.__BRIAR_GLENDebug.getGearState());
    if (gear.relic.equipped || gear.bowDamage !== 18 || gear.staffDamage !== 24) {
      throw new Error(`${vp.name}: relic unequip failed: ${JSON.stringify(gear)}`);
    }
    await page.locator('#toggle-relic-btn').click();
    await page.locator('#inventory-close').click();

    // Warden Cache keeps its old rewards and also grants/equips Trail Boots.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ grovekeeperDefeated: true, groveCacheClaimed: false, wardenBootsOwned: false, wardenBootsEquipped: false });
      d.teleport(650, -850);
      d.interact();
    });
    gear = await page.evaluate(() => window.__BRIAR_GLENDebug.getGearState());
    if (!gear.boots.owned || !gear.boots.equipped || gear.speed !== 274) {
      throw new Error(`${vp.name}: Warden Trail Boots reward/effect failed: ${JSON.stringify(gear)}`);
    }

    await page.locator('#inventory-strip').click();
    await page.locator('#toggle-boots-btn').click();
    gear = await page.evaluate(() => window.__BRIAR_GLENDebug.getGearState());
    if (gear.boots.equipped || gear.speed !== 245) {
      throw new Error(`${vp.name}: boots unequip failed: ${JSON.stringify(gear)}`);
    }
    await page.locator('#toggle-boots-btn').click();
    await page.locator('#inventory-close').click();

    // Named gear ownership and equipped state must persist.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getGearState), { timeout: 6000 });
    gear = await page.evaluate(() => window.__BRIAR_GLENDebug.getGearState());
    if (!gear.relic.owned || !gear.relic.equipped || !gear.boots.owned || !gear.boots.equipped ||
        gear.speed !== 274 || gear.bowDamage !== 22 || gear.staffDamage !== 29) {
      throw new Error(`${vp.name}: named gear persistence failed: ${JSON.stringify(gear)}`);
    }

    if (runtimeErrors.length) throw new Error(`${vp.name}: runtime errors:\n${runtimeErrors.join('\n')}`);
    console.log(`PASS ${vp.name}: improved aiming + named equipment progression active`);
    await context.close();
  }
} finally {
  await browser.close();
}
