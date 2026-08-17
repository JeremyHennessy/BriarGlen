import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const viewports = [
  { name:'phone-landscape', width:932, height:430, touch:true },
  { name:'phone-portrait', width:430, height:932, touch:true },
  { name:'desktop', width:1440, height:900, touch:false },
];
const outRoot = 'test-artifacts/review';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const browser = await chromium.launch({ headless:true });

async function snap(page, vp, name) {
  const dir = path.join(outRoot, vp.name);
  await mkdir(dir, { recursive:true });
  await page.screenshot({ path:path.join(dir, `${name}.png`), fullPage:false });
}

async function waitRuntime(page) {
  await page.waitForFunction(() => Boolean(
    window.__BRIAR_GLENDebug?.getState &&
    window.__BRIAR_GLENDebug?.getBuildInfo &&
    window.__BRIAR_GLENDebug?.getBoardState &&
    window.__BRIAR_GLENDebug?.getMarketState &&
    window.__BRIAR_GLENDebug?.getCraftingState &&
    window.__BRIAR_GLENDebug?.getJournalState &&
    window.__BRIAR_GLENDebug?.getFinalPolishState
  ), { timeout:8000 });
  await page.waitForTimeout(300);
}

async function closePanels(page) {
  await page.evaluate(() => window.__BRIAR_GLENDebug?.closeWardenBook?.());
  for (const id of ['inventory-close','trade-close','craft-close','board2-close','polish23-complete-close']) {
    const button = page.locator(`#${id}`);
    if (await button.count() && await button.isVisible().catch(() => false)) await button.click();
  }
  await page.waitForTimeout(80);
}

function representativeProgress() {
  return {
    contractComplete:true,
    patrolComplete:true,
    groveDiscovered:true,
    grovekeeperDefeated:true,
    groveCacheClaimed:true,
    shortcutUnlocked:true,
    reinforcedPickaxe:true,
    temperedSword:true,
    briarstringBow:true,
    moonrootStaff:true,
    gearVest:true,
    gearCharm:true,
    groveRelicOwned:true,
    wardenBootsOwned:true,
    fenCrossingOpened:true,
    fenDiscovered:true,
    fenWardenDefeated:true,
    fenCacheClaimed:true,
    stonepinePassOpened:true,
    stonepineDiscovered:true,
    stonepineBossDefeated:true,
    stonepineCacheClaimed:true,
    boardContractsCompleted:3,
    activeBoardContract:null,
  };
}

try {
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport:{ width:vp.width, height:vp.height },
      hasTouch:vp.touch,
      deviceScaleFactor:1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

    await page.goto(`${target}?reviewCapture=${Date.now()}`, { waitUntil:'domcontentloaded', timeout:15000 });
    await waitRuntime(page);
    await page.evaluate(() => localStorage.removeItem('briar-glen-vslice-v1'));
    await page.reload({ waitUntil:'domcontentloaded' });
    await waitRuntime(page);

    const build = await page.evaluate(() => window.__BRIAR_GLENDebug.getBuildInfo());
    if (build.version !== '30' || build.runtime !== 'canonical-manifest-hooks-v1') {
      throw new Error(`${vp.name}: audit expected Build 30 canonical runtime, got ${JSON.stringify(build)}`);
    }

    // Fresh-state HUD / controls / onboarding.
    await snap(page, vp, '01-fresh-hud-and-controls');

    // Representative Satchel, equipment, consumables and masterwork state.
    await page.evaluate(progress => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress(progress);
      d.setPlayer({ coins:685, hp:100, maxHp:125 });
      d.setInventory({ herb:5, mooncap:4, ore:7, iron:3, hide:6, tusk:1, tonic:3, oil:2, mossglass:2, resin:2, binding:1 });
    }, representativeProgress());
    await page.locator('#inventory-strip').click();
    await page.waitForFunction(() => !document.getElementById('inventory-panel')?.hidden);
    await snap(page, vp, '02-satchel-equipment-masterwork');
    await closePanels(page);

    // Rowan market, including rotating stock/services/commission layer.
    await page.evaluate(progress => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress(progress);
      d.setPlayer({ coins:1000 });
      d.setInventory({ herb:3, mooncap:2, ore:3, iron:2, hide:2, tonic:2, oil:2, mossglass:2, resin:2, binding:1 });
      d.teleport(-335,-205);
      d.interact();
      d.refreshMarket?.();
    }, representativeProgress());
    await page.waitForFunction(() => !document.getElementById('trade-panel')?.hidden);
    await snap(page, vp, '03-rowan-market');
    await closePanels(page);

    // Alden masterwork forge.
    await page.evaluate(progress => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ ...progress, reinforcedPickaxe:false, temperedSword:false, briarstringBow:false, moonrootStaff:false });
      d.setInventory({ ore:5, iron:6, hide:4, herb:3, mooncap:3, tusk:1, oil:0 });
      d.teleport(-470,255);
      d.interact();
    }, representativeProgress());
    await page.waitForFunction(() => !document.getElementById('craft-panel')?.hidden);
    await snap(page, vp, '04-alden-masterwork-forge');
    await closePanels(page);

    // Contract Board 2.0.
    await page.evaluate(progress => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ ...progress, activeBoardContract:null, boardContractsCompleted:3, boardContractCounts:{} });
      d.setPlayer({ coins:500 });
      d.setInventory({ ore:3, herb:3, tonic:1, mossglass:2, oil:1 });
      d.teleport(-615,-118);
      d.interact();
    }, representativeProgress());
    await page.waitForFunction(() => !document.getElementById('board2-panel')?.hidden);
    await snap(page, vp, '05-contract-board');
    await closePanels(page);

    // Chart the world through the same real discovery paths used by regression tests.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      for (const [x,y] of [[-100,0],[800,0],[1600,0],[1210,-1370],[2390,-1450]]) d.teleport(x,y);
      d.setProgress({
        groveDiscovered:true, shortcutUnlocked:true,
        fenCrossingOpened:true, fenDiscovered:true,
        stonepinePassOpened:true, stonepineDiscovered:true,
      });
      d.openMap();
    });
    await page.waitForFunction(() => document.getElementById('warden-overlay') && !document.getElementById('warden-overlay').hidden);
    await snap(page, vp, '06-discovery-map');

    await page.evaluate(progress => {
      const d = window.__BRIAR_GLENDebug;
      d.closeWardenBook();
      d.setProgress(progress);
      d.setInventory({ mooncap:2, oil:1, resin:2, mossglass:2 });
      d.openJournal();
    }, representativeProgress());
    await page.waitForFunction(() => document.getElementById('warden-journal-view') && !document.getElementById('warden-journal-view').hidden);
    await snap(page, vp, '07-warden-journal');
    await closePanels(page);

    // Area-title / route readability presentation.
    await page.evaluate(() => window.__BRIAR_GLENDebug.teleport(1050,20));
    await page.waitForFunction(() => {
      const el=document.getElementById('polish23-area');
      return el && getComputedStyle(el).display !== 'none' && el.textContent.includes('COPPER HOLLOW');
    }, { timeout:3000 });
    await snap(page, vp, '08-copper-hollow-area-moment');

    // Interaction/pickup ribbon in Stonepine.
    await page.evaluate(progress => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ ...progress, stonepineBossDefeated:false, stonepineCacheClaimed:false });
      d.setInventory({ resin:0 });
      d.teleport(2485,-1335);
      d.interact();
    }, representativeProgress());
    await page.waitForFunction(() => {
      const el=document.getElementById('polish23-pickup');
      return el && getComputedStyle(el).display !== 'none';
    }, { timeout:3000 });
    await snap(page, vp, '09-stonepine-pickup-feedback');

    // Final vertical-slice completion presentation.
    await page.evaluate(progress => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({ ...progress, stonepineBossDefeated:true, stonepineCacheClaimed:false });
      d.teleport(3255,-1900);
      d.interact();
    }, representativeProgress());
    await page.waitForFunction(() => window.__BRIAR_GLENDebug.getFinalPolishState().completionOpen, { timeout:3000 });
    await snap(page, vp, '10-vertical-slice-complete');
    await closePanels(page);

    // Three actual weapon/HUD states for label and control comparison.
    await page.evaluate(() => { const d=window.__BRIAR_GLENDebug; d.teleport(450,0); d.selectWeapon('sword',false); });
    await sleep(120); await snap(page, vp, '11-weapon-sword');
    await page.evaluate(() => window.__BRIAR_GLENDebug.selectWeapon('bow',false));
    await sleep(120); await snap(page, vp, '12-weapon-bow');
    await page.evaluate(() => window.__BRIAR_GLENDebug.selectWeapon('staff',false));
    await sleep(120); await snap(page, vp, '13-weapon-staff');

    const overflow = await page.evaluate(() => ({ sw:document.documentElement.scrollWidth, iw:innerWidth, sh:document.documentElement.scrollHeight, ih:innerHeight }));
    if (overflow.sw > overflow.iw + 1 || overflow.sh > overflow.ih + 1) throw new Error(`${vp.name}: capture caused browser overflow ${JSON.stringify(overflow)}`);
    if (errors.length) throw new Error(`${vp.name}: runtime errors during capture:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: captured 13 Build 30 UI/feature states without runtime mutation`);
    await context.close();
  }
} finally {
  await browser.close();
}
