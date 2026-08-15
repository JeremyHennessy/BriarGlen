import { chromium } from 'playwright';

const target = process.argv[2];
const live = process.argv.includes('--live');
if (!target) throw new Error('Usage: node tests/smoke.mjs <url> [--live]');

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
    page.on('console', msg => {
      if (msg.type() === 'error') runtimeErrors.push(`console: ${msg.text()}`);
    });
    page.on('requestfailed', req => {
      const url = req.url();
      if (url.includes('/BriarGlen/') || url.startsWith('http://127.0.0.1:')) {
        runtimeErrors.push(`requestfailed: ${url} (${req.failure()?.errorText || 'unknown'})`);
      }
    });

    const attempts = live ? 48 : 1;
    let loaded = false;
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        await page.goto(`${target}${sep}smoke=${Date.now()}-${attempt}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
        await page.waitForFunction(() => {
          const canvas = document.querySelector('#game');
          return Boolean(window.__BRIAR_GLENDebug?.getEconomyState && canvas && canvas.width > 0 && canvas.height > 0);
        }, { timeout: 6000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: game runtime never became available: ${lastError?.message || 'unknown error'}`);

    await page.waitForTimeout(700);
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('#game');
      const hud = document.querySelector('#hud');
      const ctx = canvas.getContext('2d');
      const state = window.__BRIAR_GLENDebug.getState();
      const doc = document.documentElement;
      const distinct = new Set();
      const sx = Math.max(1, Math.floor(canvas.width / 12));
      const sy = Math.max(1, Math.floor(canvas.height / 8));
      for (let y = Math.floor(sy / 2); y < canvas.height; y += sy) {
        for (let x = Math.floor(sx / 2); x < canvas.width; x += sx) {
          const p = ctx.getImageData(x, y, 1, 1).data;
          distinct.add(`${p[0]},${p[1]},${p[2]},${p[3]}`);
        }
      }
      return {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        hudVisible: getComputedStyle(hud).display !== 'none',
        overflowX: doc.scrollWidth - innerWidth,
        overflowY: doc.scrollHeight - innerHeight,
        distinctCanvasColors: distinct.size,
        state,
      };
    });

    if (runtimeErrors.length) throw new Error(`${vp.name}: runtime errors:\n${runtimeErrors.join('\n')}`);
    if (!result.hudVisible) throw new Error(`${vp.name}: HUD is hidden`);
    if (result.canvasWidth < vp.width || result.canvasHeight < vp.height) {
      throw new Error(`${vp.name}: canvas is undersized (${result.canvasWidth}x${result.canvasHeight})`);
    }
    if (result.overflowX > 2 || result.overflowY > 2) {
      throw new Error(`${vp.name}: document overflow detected (${result.overflowX}, ${result.overflowY})`);
    }
    if (result.distinctCanvasColors < 6) {
      throw new Error(`${vp.name}: canvas appears blank or insufficiently rendered (${result.distinctCanvasColors} sampled colors)`);
    }
    if (!result.state?.player || result.state.zone !== 'BRIAR GLEN') {
      throw new Error(`${vp.name}: invalid initial game state: ${JSON.stringify(result.state)}`);
    }

    // Build 2 input regression.
    if (vp.touch) {
      const before = result.state.player.weaponType;
      await page.locator('#weapon-btn').click();
      const after = await page.evaluate(() => window.__BRIAR_GLENDebug.getState().player.weaponType);
      if (before === after) throw new Error(`${vp.name}: touch weapon cycle did not change weapon`);
    } else {
      await page.keyboard.press('Digit2');
      const weapon = await page.evaluate(() => window.__BRIAR_GLENDebug.getState().player.weaponType);
      if (weapon !== 'bow') throw new Error(`${vp.name}: desktop weapon hotkey failed (${weapon})`);
    }

    // Build 3 satchel interaction.
    await page.locator('#inventory-strip').click();
    if (!(await page.locator('#inventory-panel').isVisible())) throw new Error(`${vp.name}: satchel did not open`);
    await page.locator('#inventory-close').click();
    if (await page.locator('#inventory-panel').isVisible()) throw new Error(`${vp.name}: satchel did not close`);

    // Gather a real Mooncap node.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setInventory({ herb: 0, mooncap: 0, tonic: 0, hide: 0 });
      d.teleport(40, 270);
      d.interact();
    });
    let state = await page.evaluate(() => window.__BRIAR_GLENDebug.getState());
    if (state.player.inventory.mooncap !== 1) throw new Error(`${vp.name}: Mooncap gather failed: ${JSON.stringify(state.player.inventory)}`);

    // Brew a Healing Tonic at Mira using Briarleaf + the gathered Mooncap.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setInventory({ herb: 1 });
      d.teleport(-650, 260);
      d.interact();
    });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getState());
    if (state.player.inventory.tonic !== 1 || state.player.inventory.herb !== 0 || state.player.inventory.mooncap !== 0) {
      throw new Error(`${vp.name}: alchemy recipe failed: ${JSON.stringify(state.player.inventory)}`);
    }

    // Use the actual platform control for the tonic.
    await page.evaluate(() => window.__BRIAR_GLENDebug.setPlayer({ hp: 40 }));
    if (vp.touch) await page.locator('#potion-btn').click();
    else await page.keyboard.press('KeyQ');
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getState());
    if (state.player.hp !== 85 || state.player.inventory.tonic !== 0) {
      throw new Error(`${vp.name}: Healing Tonic control failed: hp=${state.player.hp}, tonic=${state.player.inventory.tonic}`);
    }

    // Verify a world loot drop is collected into the satchel.
    await page.evaluate(() => window.__BRIAR_GLENDebug.spawnLoot('hide', 1));
    await page.waitForTimeout(120);
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getState());
    if (state.player.inventory.hide < 1) throw new Error(`${vp.name}: Beast Hide loot pickup failed`);

    // Exercise the second contract acceptance and turn-in state machine.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ contractComplete: true, patrolActive: false, patrolComplete: false, patrolKills: 0 });
      d.setInventory({ hide: 2 });
      d.teleport(-615, -118);
      d.interact();
    });
    let rpg = await page.evaluate(() => window.__BRIAR_GLENDebug.getRPGState());
    if (!rpg.patrol.active || rpg.patrol.complete) throw new Error(`${vp.name}: Hollow Patrol was not accepted`);

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ patrolKills: 3 });
      d.interact();
    });
    rpg = await page.evaluate(() => window.__BRIAR_GLENDebug.getRPGState());
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getState());
    if (!rpg.patrol.complete || rpg.patrol.active) throw new Error(`${vp.name}: Hollow Patrol did not complete`);
    if (state.player.inventory.tonic < 1) throw new Error(`${vp.name}: Hollow Patrol reward tonic missing`);

    // Build 4: open Rowan's real trader interaction.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setPlayer({ coins: 500, hp: 85, dashCd: 0, dashTimer: 0 });
      d.setInventory({ hide: 2 });
      d.teleport(-335, -205);
      d.interact();
    });
    if (!(await page.locator('#trade-panel').isVisible())) throw new Error(`${vp.name}: Rowan trader did not open`);
    const tradeBox = await page.locator('#trade-panel').boundingBox();
    if (!tradeBox || tradeBox.x < -2 || tradeBox.y < -2 || tradeBox.x + tradeBox.width > vp.width + 2 || tradeBox.y + tradeBox.height > vp.height + 2) {
      throw new Error(`${vp.name}: trader panel is outside viewport: ${JSON.stringify(tradeBox)}`);
    }

    await page.locator('#buy-vest-btn').click();
    let economy = await page.evaluate(() => window.__BRIAR_GLENDebug.getEconomyState());
    if (!economy.gear.vest || economy.maxHp !== 125 || economy.coins !== 320) {
      throw new Error(`${vp.name}: Copperguard Vest purchase failed: ${JSON.stringify(economy)}`);
    }

    await page.locator('#buy-charm-btn').click();
    economy = await page.evaluate(() => window.__BRIAR_GLENDebug.getEconomyState());
    if (!economy.gear.charm || economy.coins !== 180) {
      throw new Error(`${vp.name}: Rootstep Charm purchase failed: ${JSON.stringify(economy)}`);
    }

    const tonicBefore = economy.tonic;
    await page.locator('#buy-tonic-btn').click();
    economy = await page.evaluate(() => window.__BRIAR_GLENDebug.getEconomyState());
    if (economy.coins !== 140 || economy.tonic !== tonicBefore + 1) {
      throw new Error(`${vp.name}: trader tonic purchase failed: ${JSON.stringify(economy)}`);
    }

    await page.locator('#sell-hide-btn').click();
    economy = await page.evaluate(() => window.__BRIAR_GLENDebug.getEconomyState());
    if (economy.coins !== 162 || economy.hide !== 1) {
      throw new Error(`${vp.name}: Beast Hide sale failed: ${JSON.stringify(economy)}`);
    }
    await page.locator('#trade-close').click();

    // Charm must alter the actual dash cooldown.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setPlayer({ dashCd: 0, dashTimer: 0 });
      d.dash();
    });
    economy = await page.evaluate(() => window.__BRIAR_GLENDebug.getEconomyState());
    if (Math.abs(economy.dashCd - 0.82) > 0.02) {
      throw new Error(`${vp.name}: Rootstep Charm did not alter dodge cooldown: ${economy.dashCd}`);
    }

    // Purchases are permanent: reload and verify equipment reapplies from the shared save state.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getEconomyState), { timeout: 6000 });
    economy = await page.evaluate(() => window.__BRIAR_GLENDebug.getEconomyState());
    if (!economy.gear.vest || !economy.gear.charm || economy.maxHp !== 125) {
      throw new Error(`${vp.name}: permanent gear did not survive reload: ${JSON.stringify(economy)}`);
    }

    if (runtimeErrors.length) throw new Error(`${vp.name}: runtime errors after economy tests:\n${runtimeErrors.join('\n')}`);
    console.log(`PASS ${vp.name}: ${result.canvasWidth}x${result.canvasHeight}, ${result.distinctCanvasColors} canvas colors, Build 4 economy + equipment active`);
    await context.close();
  }
} finally {
  await browser.close();
}