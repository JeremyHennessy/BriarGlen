import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const viewports = [
  { name:'phone-landscape', width:932, height:430, touch:true },
  { name:'phone-portrait', width:430, height:932, touch:true },
  { name:'desktop', width:1440, height:900, touch:false },
];
const browser = await chromium.launch({ headless:true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const progress = {
  contractComplete:true, patrolComplete:true,
  groveDiscovered:true, grovekeeperDefeated:true, groveCacheClaimed:true, shortcutUnlocked:true,
  reinforcedPickaxe:true, temperedSword:true, briarstringBow:true, moonrootStaff:true,
  gearVest:true, gearCharm:true, groveRelicOwned:true, wardenBootsOwned:true,
  fenCrossingOpened:true, fenDiscovered:true, fenWardenDefeated:true, fenCacheClaimed:true,
  stonepinePassOpened:true, stonepineDiscovered:true, stonepineBossDefeated:true, stonepineCacheClaimed:true,
  boardContractsCompleted:3, activeBoardContract:null,
};

async function waitRuntime(page) {
  await page.waitForFunction(() => Boolean(
    window.__BRIAR_GLENDebug?.getState &&
    window.__BRIAR_GLENDebug?.getBuildInfo &&
    window.__BRIAR_GLENDebug?.getBoardState &&
    window.__BRIAR_GLENDebug?.getJournalState &&
    window.__BRIAR_GLENDebug?.getFinalPolishState
  ), { timeout:8000 });
  await page.waitForTimeout(250);
}

async function snap(page, vp, name) {
  const dir = path.join('test-artifacts/review', vp.name);
  await mkdir(dir, { recursive:true });
  await page.screenshot({ path:path.join(dir, `${name}.png`), fullPage:false });
}

async function closePanels(page) {
  await page.evaluate(() => window.__BRIAR_GLENDebug?.closeWardenBook?.());
  for (const id of ['inventory-close','trade-close','craft-close','board2-close','polish23-complete-close']) {
    const b=page.locator(`#${id}`);
    if (await b.count() && await b.isVisible().catch(() => false)) await b.click();
  }
  await page.waitForTimeout(60);
}

try {
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport:{width:vp.width,height:vp.height}, hasTouch:vp.touch, deviceScaleFactor:1 });
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if(m.type()==='error') errors.push(`console: ${m.text()}`); });
    await page.goto(`${target}?reviewExtra=${Date.now()}`, { waitUntil:'domcontentloaded', timeout:15000 });
    await waitRuntime(page);
    await page.evaluate(() => localStorage.removeItem('briar-glen-vslice-v1'));
    await page.reload({ waitUntil:'domcontentloaded' });
    await waitRuntime(page);
    const build=await page.evaluate(() => window.__BRIAR_GLENDebug.getBuildInfo());
    if(build.version!=='30') throw new Error(`${vp.name}: expected Build 30, got ${JSON.stringify(build)}`);

    // Alden Forge: the established smoke path requires the first sword reinforcement state.
    await page.evaluate(p => {
      const d=window.__BRIAR_GLENDebug;
      d.setPlayer({ reinforced:true, coins:500 });
      d.setProgress({ ...p, reinforcedPickaxe:false, temperedSword:false, briarstringBow:false, moonrootStaff:false });
      d.setInventory({ ore:5, iron:6, hide:4, herb:3, mooncap:3, tusk:1, oil:0 });
      d.teleport(-470,255); d.interact();
    }, progress);
    await page.waitForFunction(() => !document.getElementById('craft-panel')?.hidden, { timeout:4000 });
    await snap(page,vp,'04-alden-masterwork-forge');
    await closePanels(page);

    // Contract Board 2.0.
    await page.evaluate(p => {
      const d=window.__BRIAR_GLENDebug;
      d.setProgress({ ...p, activeBoardContract:null, boardContractsCompleted:3, boardContractCounts:{} });
      d.setPlayer({ coins:500 });
      d.setInventory({ ore:3, herb:3, tonic:1, mossglass:2, oil:1 });
      d.teleport(-615,-118); d.interact();
    }, progress);
    await page.waitForFunction(() => !document.getElementById('board2-panel')?.hidden, { timeout:4000 });
    await snap(page,vp,'05-contract-board');
    await closePanels(page);

    // Discovery map using real discovery coordinates from the established map/Fen/Stonepine tests.
    await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      for(const [x,y] of [[-100,0],[800,0],[1600,0],[1210,-1370],[2390,-1450]]) d.teleport(x,y);
      d.setProgress({ groveDiscovered:true, shortcutUnlocked:true, fenCrossingOpened:true, fenDiscovered:true, stonepinePassOpened:true, stonepineDiscovered:true });
      d.openMap();
    });
    await page.waitForFunction(() => !document.getElementById('warden-overlay')?.hidden, { timeout:4000 });
    await snap(page,vp,'06-discovery-map');

    // Journal with representative completed systems.
    await page.evaluate(p => {
      const d=window.__BRIAR_GLENDebug;
      d.closeWardenBook(); d.setProgress(p); d.setInventory({ mooncap:2, oil:1, resin:2, mossglass:2 }); d.openJournal();
    }, progress);
    await page.waitForFunction(() => !document.getElementById('warden-journal-view')?.hidden, { timeout:4000 });
    await snap(page,vp,'07-warden-journal');
    await closePanels(page);

    // Copper Hollow area title.
    const areaBefore=await page.evaluate(() => window.__BRIAR_GLENDebug.getFinalPolishState().areaShows);
    await page.evaluate(() => window.__BRIAR_GLENDebug.teleport(1050,20));
    await page.waitForFunction(before => window.__BRIAR_GLENDebug.getFinalPolishState().areaShows>before, areaBefore, { timeout:4000 });
    await snap(page,vp,'08-copper-hollow-area-moment');

    // Stonepine pickup ribbon.
    const pickupBefore=await page.evaluate(() => window.__BRIAR_GLENDebug.getFinalPolishState().pickupShows);
    await page.evaluate(p => {
      const d=window.__BRIAR_GLENDebug;
      d.setProgress({ ...p, stonepineBossDefeated:false, stonepineCacheClaimed:false });
      d.setInventory({ resin:0 }); d.teleport(2485,-1335); d.interact();
    }, progress);
    await page.waitForFunction(before => window.__BRIAR_GLENDebug.getFinalPolishState().pickupShows>before, pickupBefore, { timeout:4000 });
    await snap(page,vp,'09-stonepine-pickup-feedback');

    // Final vertical-slice completion presentation.
    await page.evaluate(p => {
      const d=window.__BRIAR_GLENDebug;
      d.setProgress({ ...p, stonepineBossDefeated:true, stonepineCacheClaimed:false });
      d.teleport(3255,-1900); d.interact();
    }, progress);
    await page.waitForFunction(() => window.__BRIAR_GLENDebug.getFinalPolishState().completionOpen, { timeout:4000 });
    await snap(page,vp,'10-vertical-slice-complete');
    await closePanels(page);

    // Three weapon/HUD states through the actual selection API.
    await page.evaluate(() => { const d=window.__BRIAR_GLENDebug; d.teleport(450,0); d.selectWeapon('sword',false); });
    await sleep(120); await snap(page,vp,'11-weapon-sword');
    await page.evaluate(() => window.__BRIAR_GLENDebug.selectWeapon('bow',false));
    await sleep(120); await snap(page,vp,'12-weapon-bow');
    await page.evaluate(() => window.__BRIAR_GLENDebug.selectWeapon('staff',false));
    await sleep(120); await snap(page,vp,'13-weapon-staff');

    const overflow=await page.evaluate(() => ({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1) throw new Error(`${vp.name}: overflow ${JSON.stringify(overflow)}`);
    if(errors.length) throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: captured remaining Build 30 UI/feature evidence`);
    await context.close();
  }
} finally {
  await browser.close();
}
