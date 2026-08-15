import { chromium } from 'playwright';

const target = process.argv[2];
const live = process.argv.includes('--live');
if (!target) throw new Error('Usage: node tests/world-smoke.mjs <url> [--live]');

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
        await page.goto(`${target}${sep}worldSmoke=${Date.now()}-${attempt}`, {
          waitUntil: 'domcontentloaded', timeout: 15000,
        });
        await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getWorldState), { timeout: 6000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: Build 5.5 runtime never became available: ${lastError?.message || 'unknown'}`);

    await page.waitForTimeout(500);
    let world = await page.evaluate(() => window.__BRIAR_GLENDebug.getWorldState());
    if (world.zone !== 'BRIAR GLEN') throw new Error(`${vp.name}: expected town spawn, got ${world.zone}`);
    if (world.bounds.minY > -1100) throw new Error(`${vp.name}: north world bound was not expanded: ${world.bounds.minY}`);
    if (world.settlement.npcCount < 4 || world.settlement.tavernCount < 1 || world.settlement.cottageCount < 2 || world.settlement.lampCount < 6) {
      throw new Error(`${vp.name}: settlement expansion incomplete: ${JSON.stringify(world.settlement)}`);
    }

    const firstNpc = world.settlement.npcs[0];
    await page.waitForTimeout(450);
    world = await page.evaluate(() => window.__BRIAR_GLENDebug.getWorldState());
    const movedNpc = world.settlement.npcs.find(n => n.name === firstNpc.name);
    if (!movedNpc || Math.hypot(movedNpc.x - firstNpc.x, movedNpc.y - firstNpc.y) < 2) {
      throw new Error(`${vp.name}: settlement NPC did not move`);
    }

    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ patrolComplete: true, groveDiscovered: false, grovekeeperDefeated: false, groveCacheClaimed: false });
      d.teleport(155, -115);
      d.interact();
    });
    world = await page.evaluate(() => window.__BRIAR_GLENDebug.getWorldState());
    if (!world.grove.discovered) throw new Error(`${vp.name}: Mooncap Grove sign did not discover route`);

    await page.evaluate(() => window.__BRIAR_GLENDebug.teleport(470, -650));
    await page.waitForTimeout(180);
    const stateInGrove = await page.evaluate(() => window.__BRIAR_GLENDebug.getState());
    if (stateInGrove.zone !== 'MOONCAP GROVE') throw new Error(`${vp.name}: grove zone transition failed: ${stateInGrove.zone}`);

    const grovePixels = await page.evaluate(() => {
      const canvas = document.querySelector('#game');
      const ctx = canvas.getContext('2d');
      const colors = new Set();
      const sx = Math.max(1, Math.floor(canvas.width / 12));
      const sy = Math.max(1, Math.floor(canvas.height / 8));
      for (let y = Math.floor(sy/2); y < canvas.height; y += sy) {
        for (let x = Math.floor(sx/2); x < canvas.width; x += sx) {
          const p = ctx.getImageData(x,y,1,1).data;
          colors.add(`${p[0]},${p[1]},${p[2]},${p[3]}`);
        }
      }
      return colors.size;
    });
    if (grovePixels < 10) throw new Error(`${vp.name}: Mooncap Grove canvas appears insufficiently rendered (${grovePixels} colors)`);

    const beforeKeeper = await page.evaluate(() => window.__BRIAR_GLENDebug.getState());
    await page.evaluate(() => window.__BRIAR_GLENDebug.defeatGrovekeeper());
    world = await page.evaluate(() => window.__BRIAR_GLENDebug.getWorldState());
    const afterKeeper = await page.evaluate(() => window.__BRIAR_GLENDebug.getState());
    if (!world.grove.keeperDefeated || !world.grove.keeperDead) throw new Error(`${vp.name}: Grovekeeper defeat did not persist in runtime`);
    if (afterKeeper.player.coins < beforeKeeper.player.coins + 35) throw new Error(`${vp.name}: Grovekeeper bonus missing`);

    const beforeCache = await page.evaluate(() => window.__BRIAR_GLENDebug.getState());
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.teleport(650, -850);
      d.interact();
    });
    world = await page.evaluate(() => window.__BRIAR_GLENDebug.getWorldState());
    const afterCache = await page.evaluate(() => window.__BRIAR_GLENDebug.getState());
    if (!world.grove.cacheClaimed) throw new Error(`${vp.name}: Old Warden Cache was not claimed`);
    if (afterCache.player.coins !== beforeCache.player.coins + 90) throw new Error(`${vp.name}: Warden Cache coin reward incorrect`);
    if (afterCache.player.inventory.tonic !== beforeCache.player.inventory.tonic + 1) throw new Error(`${vp.name}: Warden Cache tonic reward incorrect`);
    if (afterCache.player.inventory.hide !== beforeCache.player.inventory.hide + 1) throw new Error(`${vp.name}: Warden Cache hide reward incorrect`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getWorldState), { timeout: 6000 });
    world = await page.evaluate(() => window.__BRIAR_GLENDebug.getWorldState());
    if (!world.grove.discovered || !world.grove.keeperDefeated || !world.grove.cacheClaimed || !world.grove.keeperDead) {
      throw new Error(`${vp.name}: grove progression failed reload persistence: ${JSON.stringify(world.grove)}`);
    }

    if (runtimeErrors.length) throw new Error(`${vp.name}: runtime errors after world expansion tests:\n${runtimeErrors.join('\n')}`);
    console.log(`PASS ${vp.name}: settlement + Mooncap Grove world expansion active`);
    await context.close();
  }
} finally {
  await browser.close();
}