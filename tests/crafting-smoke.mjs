import { chromium } from 'playwright';

const target = process.argv[2];
const live = process.argv.includes('--live');
if (!target) throw new Error('Usage: node tests/crafting-smoke.mjs <url> [--live]');

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
        await page.goto(`${target}${sep}crafting=${Date.now()}-${attempt}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getCraftingState), { timeout: 6000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: crafting runtime unavailable: ${lastError?.message || 'unknown'}`);

    await page.evaluate(() => localStorage.removeItem('briar-glen-vslice-v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getCraftingState), { timeout: 6000 });

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setPlayer({ reinforced: true, coins: 500, oilTimer: 0 });
      d.setProgress({
        contractComplete: true,
        patrolComplete: true,
        groveDiscovered: true,
        grovekeeperDefeated: true,
        groveCacheClaimed: true,
        reinforcedPickaxe: false,
        temperedSword: false,
        briarstringBow: false,
        moonrootStaff: false,
      });
      d.setInventory({ ore: 3, hide: 2, herb: 0, mooncap: 0, tusk: 1, iron: 0, oil: 0 });
    });

    let crafting = await page.evaluate(() => window.__BRIAR_GLENDebug.getCraftingState());
    if (crafting.deepveinNodes !== 3) throw new Error(`${vp.name}: expected 3 Deepvein nodes, got ${crafting.deepveinNodes}`);

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(825, -470);
      d.interact();
    });
    crafting = await page.evaluate(() => window.__BRIAR_GLENDebug.getCraftingState());
    if (crafting.materials.iron !== 0) throw new Error(`${vp.name}: Deepvein mined without Reinforced Pickaxe`);

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(-470, 255);
      d.interact();
    });
    if (!(await page.locator('#craft-panel').isVisible())) throw new Error(`${vp.name}: masterwork forge did not open`);
    const box = await page.locator('#craft-panel').boundingBox();
    if (!box || box.x < -2 || box.y < -2 || box.x + box.width > vp.width + 2 || box.y + box.height > vp.height + 2) {
      throw new Error(`${vp.name}: craft panel outside viewport: ${JSON.stringify(box)}`);
    }

    await page.locator('#craft-pickaxe-btn').click();
    crafting = await page.evaluate(() => window.__BRIAR_GLENDebug.getCraftingState());
    if (!crafting.pickaxe || crafting.materials.ore !== 0 || crafting.materials.hide !== 0) {
      throw new Error(`${vp.name}: Reinforced Pickaxe recipe failed: ${JSON.stringify(crafting)}`);
    }
    await page.locator('#craft-close').click();

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(825, -470);
      d.interact();
    });
    crafting = await page.evaluate(() => window.__BRIAR_GLENDebug.getCraftingState());
    if (crafting.materials.iron !== 1) throw new Error(`${vp.name}: Deepvein mining failed after pickaxe craft`);

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setInventory({ iron: 6, ore: 5, hide: 3, herb: 3, mooncap: 3, tusk: 1, oil: 0 });
      d.teleport(-470, 255);
      d.interact();
    });
    await page.locator('#craft-sword-upgrade-btn').click();
    await page.locator('#craft-bow-upgrade-btn').click();
    await page.locator('#craft-staff-upgrade-btn').click();
    await page.locator('#craft-oil-btn').click();

    crafting = await page.evaluate(() => window.__BRIAR_GLENDebug.getCraftingState());
    if (!crafting.upgrades.sword || !crafting.upgrades.bow || !crafting.upgrades.staff) {
      throw new Error(`${vp.name}: masterwork weapon progression incomplete: ${JSON.stringify(crafting.upgrades)}`);
    }
    if (crafting.materials.oil !== 1) throw new Error(`${vp.name}: Warden Oil craft failed`);
    await page.locator('#craft-close').click();

    await page.locator('#inventory-strip').click();
    if (!(await page.locator('#inventory-panel').isVisible())) throw new Error(`${vp.name}: satchel did not open for oil`);
    await page.locator('#use-oil-btn').click();
    crafting = await page.evaluate(() => window.__BRIAR_GLENDebug.getCraftingState());
    if (crafting.materials.oil !== 0 || crafting.oilTimer < 44) {
      throw new Error(`${vp.name}: Warden Oil use failed: ${JSON.stringify(crafting)}`);
    }
    await page.locator('#inventory-close').click();

    await page.evaluate(() => window.__BRIAR_GLENDebug.selectWeapon('bow', false));
    const damage = await page.evaluate(() => window.__BRIAR_GLENDebug.previewDamage(18, 'bow'));
    if (damage !== 24) throw new Error(`${vp.name}: expected upgraded + oiled bow damage 24, got ${damage}`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getCraftingState), { timeout: 6000 });
    crafting = await page.evaluate(() => window.__BRIAR_GLENDebug.getCraftingState());
    if (!crafting.pickaxe || !crafting.upgrades.sword || !crafting.upgrades.bow || !crafting.upgrades.staff) {
      throw new Error(`${vp.name}: crafting progression did not persist: ${JSON.stringify(crafting)}`);
    }

    if (errors.length) throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Deepvein mining + masterwork weapons + Warden Oil active`);
    await context.close();
  }
} finally {
  await browser.close();
}
