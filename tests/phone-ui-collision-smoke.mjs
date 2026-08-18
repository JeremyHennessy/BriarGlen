import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const viewports = [
  { name:'compact-landscape', width:667, height:375 },
  { name:'phone-landscape', width:844, height:390 },
  { name:'compact-portrait', width:375, height:667 },
  { name:'phone-portrait', width:390, height:844 },
];
const browser = await chromium.launch({ headless:true });
const inside = (box, vp) => box && box.x >= -1 && box.y >= -1 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1;
const overlaps = (a, b) => a && b && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const chromeSelectors = [
  '.hud33-status', '.hud33-objective', '#onboarding37-prompt', '#hud33-notification',
  '#inventory-strip', '#hud33-combat', '#combat36-readiness', '#warden-map-btn',
  '#move-pad', '#interact-btn', '#weapon-btn', '#potion-btn', '#skill-btn',
  '#dash-btn', '#attack-btn', '#context-prompt', '#rotate-note', '#reset-btn',
];

async function visibleBoxes(page) {
  const boxes = [];
  for (const selector of chromeSelectors) {
    const locator = page.locator(selector);
    if (await locator.count() && await locator.isVisible()) boxes.push({ selector, box:await locator.boundingBox() });
  }
  return boxes;
}

async function assertNoChromeCollisions(page, vp, phase) {
  const boxes = await visibleBoxes(page);
  for (const item of boxes) if (!inside(item.box, vp)) throw new Error(`${vp.name} ${phase}: ${item.selector} outside viewport`);
  for (let i=0; i<boxes.length; i++) for (let j=i+1; j<boxes.length; j++) {
    if (overlaps(boxes[i].box, boxes[j].box)) throw new Error(`${vp.name} ${phase}: ${boxes[i].selector} overlaps ${boxes[j].selector}`);
  }
}

async function assertBlockingPanel(page, vp, id, open, close) {
  await open();
  await page.waitForFunction(panelId => !document.getElementById(panelId)?.hidden, id, { timeout:2000 });
  const panel = page.locator(`#${id}`);
  if (!inside(await panel.boundingBox(), vp)) throw new Error(`${vp.name}: #${id} outside safe viewport`);
  const state = await page.evaluate(() => window.__BRIAR_GLENDebug.getPhoneUi39State());
  if (!state.oneBlockingWindow || state.openPanels.length !== 1) throw new Error(`${vp.name}: stacked blocking windows ${JSON.stringify(state.openPanels)}`);
  for (const selector of ['#hud','#touch-controls','#warden-map-btn','#hud33-combat','#combat36-readiness','#onboarding37-prompt','#reset-btn']) {
    const locator = page.locator(selector);
    if (await locator.count() && await locator.isVisible()) throw new Error(`${vp.name}: ${selector} remains visible behind #${id}`);
  }
  await close();
  await page.waitForFunction(panelId => document.getElementById(panelId)?.hidden, id, { timeout:2000 });
}

try {
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport:{width:vp.width,height:vp.height}, hasTouch:true, deviceScaleFactor:1 });
    await context.addInitScript(() => {
      localStorage.removeItem('briar-glen-vslice-v1');
      localStorage.removeItem('briar-glen-context-guide-v37');
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${target}${target.includes('?')?'&':'?'}build39=${Date.now()}-${vp.name}`, { waitUntil:'domcontentloaded', timeout:15000 });
    await page.waitForFunction(() => window.__BRIAR_GLENDebug?.getPhoneUi39State?.().cssLoaded, null, { timeout:7000 });

    const build = await page.evaluate(() => window.__BRIAR_GLENDebug.getBuildInfo());
    if (build.version !== '39' || build.saveKey !== 'briar-glen-vslice-v1' || build.schema !== 1) throw new Error(`${vp.name}: wrong Build 39 metadata ${JSON.stringify(build)}`);
    if ((await page.evaluate(() => window.__BRIAR_GLENDebug.getPhoneUi39State())).rotateNoticeVisible) throw new Error(`${vp.name}: persistent rotation notice still competes with gameplay UI`);

    await assertNoChromeCollisions(page, vp, 'contextual prompt');
    await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug, player=d.getState().player;
      d.teleport(player.x+80, player.y);
    });
    await page.waitForFunction(() => window.__BRIAR_GLENDebug.getContextualOnboardingState().active !== 'move', null, { timeout:2000 });
    await page.evaluate(() => window.__BRIAR_GLENDebug.enqueueNotification33('Field notice','area',{duration:5000}));
    await page.waitForFunction(() => !document.getElementById('hud33-notification').hidden);
    await page.evaluate(() => {
      const prompt=document.getElementById('context-prompt');
      prompt.textContent='USE • Test interaction';
      prompt.hidden=false;
    });
    await assertNoChromeCollisions(page, vp, 'notification and interaction');
    await page.evaluate(() => { document.getElementById('context-prompt').hidden=true; });

    await assertBlockingPanel(page, vp, 'inventory-panel',
      () => page.evaluate(() => window.__BRIAR_GLENDebug.toggleInventory(true)),
      () => page.evaluate(() => window.__BRIAR_GLENDebug.toggleInventory(false)));

    await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      d.setProgress({fenCacheClaimed:true,step:3,reinforcedPickaxe:true});
      d.teleport(-470,255);
      d.toggleInventory(true);
    });
    await page.keyboard.press('KeyK');
    let state = await page.evaluate(() => window.__BRIAR_GLENDebug.getPhoneUi39State());
    if (state.openPanels.length !== 1 || state.openPanels[0] !== 'inventory') throw new Error(`${vp.name}: keyboard opened a second window ${JSON.stringify(state.openPanels)}`);
    await page.evaluate(() => window.__BRIAR_GLENDebug.toggleInventory(false));

    await assertBlockingPanel(page, vp, 'craft-panel',
      () => page.evaluate(() => window.__BRIAR_GLENDebug.toggleCrafting(true)),
      () => page.evaluate(() => window.__BRIAR_GLENDebug.toggleCrafting(false)));
    await assertBlockingPanel(page, vp, 'warden-overlay',
      () => page.evaluate(() => window.__BRIAR_GLENDebug.openMap()),
      () => page.evaluate(() => window.__BRIAR_GLENDebug.closeWardenBook()));
    await assertBlockingPanel(page, vp, 'board2-panel',
      () => page.evaluate(() => window.__BRIAR_GLENDebug.openBoard()),
      () => page.evaluate(() => window.__BRIAR_GLENDebug.closeBoard()));
    await assertBlockingPanel(page, vp, 'trade-panel',
      () => page.evaluate(() => { const d=window.__BRIAR_GLENDebug; d.teleport(-335,-205); d.interact(); }),
      () => page.locator('#trade-close').click());

    const overflow = await page.evaluate(() => ({ sw:document.documentElement.scrollWidth, iw:innerWidth, sh:document.documentElement.scrollHeight, ih:innerHeight }));
    if (overflow.sw > overflow.iw + 1 || overflow.sh > overflow.ih + 1) throw new Error(`${vp.name}: document overflow ${JSON.stringify(overflow)}`);
    if (errors.length) throw new Error(`${vp.name}: runtime errors ${errors.join('; ')}`);
    console.log(`PASS ${vp.name}: HUD boxes separated + one blocking window + safe-area panel fit`);
    await context.close();
  }
} finally {
  await browser.close();
}
