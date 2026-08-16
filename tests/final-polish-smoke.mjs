import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const live = process.argv.includes('--live');
const viewports = [
  { name:'phone-landscape', width:932, height:430, touch:true },
  { name:'phone-portrait', width:430, height:932, touch:true },
  { name:'desktop', width:1440, height:900, touch:false },
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const browser = await chromium.launch({ headless:true });

function inside(box, vp, tolerance = 2) {
  return !!box && box.x >= -tolerance && box.y >= -tolerance &&
    box.x + box.width <= vp.width + tolerance && box.y + box.height <= vp.height + tolerance;
}

try {
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport:{ width:vp.width, height:vp.height }, hasTouch:vp.touch, deviceScaleFactor:1,
    });
    await context.addInitScript(() => {
      localStorage.removeItem('briar-glen-vertical-slice-complete-v1');
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });

    let loaded = false, lastError;
    for (let attempt = 1; attempt <= (live ? 48 : 1); attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        await page.goto(`${target}${sep}polish23=${Date.now()}-${attempt}`, { waitUntil:'domcontentloaded', timeout:15000 });
        await page.waitForFunction(() => Boolean(
          window.__BRIAR_GLENDebug?.getFinalPolishState &&
          window.__BRIAR_GLENDebug?.getBuildInfo &&
          window.__BRIAR_GLENDebug?.getRuntimeArchitectureState
        ), { timeout:7000 });
        loaded = true;
        break;
      } catch (error) {
        lastError = error;
        if (live && attempt < 48) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: Build 23 final polish runtime unavailable: ${lastError?.message || 'unknown'}`);

    const build = await page.evaluate(() => window.__BRIAR_GLENDebug.getBuildInfo());
    if (build.version !== '23' || build.label !== 'Vertical Slice Polish' || build.runtime !== 'canonical-manifest-hooks-v1' || build.saveKey !== 'briar-glen-vslice-v1') {
      throw new Error(`${vp.name}: incorrect Build 23 metadata ${JSON.stringify(build)}`);
    }

    await page.waitForFunction(() => window.__BRIAR_GLENDebug.getFinalPolishState().cssLoaded);
    let state = await page.evaluate(() => window.__BRIAR_GLENDebug.getFinalPolishState());
    const entities = { ...state.entityCounts };
    const expectedBalance = {
      profile:'vertical-slice-balanced-v1',
      player:{startHp:100,startCoins:100,speed:245,wornSwordDamage:24,reinforcedSwordDamage:38},
      weapons:{bowDamage:18,staffDamage:24},
      enemies:{wolfHp:52,wolfDamage:9,boarHp:70,boarDamage:11,emberbackHp:320},
      economy:{emberbackCoins:75,firstContractCoins:150,healingTonicHeal:45,wardenOilBonus:.15},
      progression:{briarleafRequired:3,copperRequired:3},
    };
    if (state.style !== 'vertical-slice-polish-v1' || JSON.stringify(state.balance) !== JSON.stringify(expectedBalance)) {
      throw new Error(`${vp.name}: final polish changed verified balance or style identity ${JSON.stringify(state)}`);
    }

    // Real zone transition should surface the authored area-entry moment without changing world state.
    const areaBefore = state.areaShows;
    await page.evaluate(() => window.__BRIAR_GLENDebug.teleport(1050, 20));
    await page.waitForFunction(before => window.__BRIAR_GLENDebug.getFinalPolishState().areaShows > before, areaBefore);
    const area = page.locator('#polish23-area');
    if (!(await area.isVisible())) throw new Error(`${vp.name}: Copper Hollow area moment did not become visible`);
    const areaBox = await area.boundingBox();
    if (!inside(areaBox, vp)) throw new Error(`${vp.name}: area moment outside viewport ${JSON.stringify(areaBox)}`);
    const areaText = await area.innerText();
    if (!areaText.includes('COPPER HOLLOW') || !areaText.includes('OLD QUARRY WORKS')) throw new Error(`${vp.name}: area moment copy incomplete: ${areaText}`);

    // Stonepine should now have a final presentation layer: ambient highland marks + interact focus.
    await page.evaluate(() => {
      const d = window.__BRIAR_GLENDebug;
      d.setProgress({
        fenCrossingOpened:true, fenDiscovered:true, fenWardenDefeated:true, fenCacheClaimed:true,
        stonepinePassOpened:true, stonepineDiscovered:true, stonepineBossDefeated:false, stonepineCacheClaimed:false,
      });
      d.setInventory({ resin:0 });
      d.teleport(2485, -1335);
    });
    await page.waitForFunction(() => {
      const s = window.__BRIAR_GLENDebug.getFinalPolishState();
      return s.zone === 'STONEPINE REACH' && s.stonepineAmbientFrames >= 4 && s.stonepineAmbientMarks >= 4 && s.interactionFocusFrames >= 1;
    });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getFinalPolishState());
    if (JSON.stringify(state.entityCounts) !== JSON.stringify(entities)) throw new Error(`${vp.name}: final polish mutated world entities`);

    // Use the actual interaction path: Resin gain should generate the concise pickup ribbon.
    const pickupBefore = state.pickupShows;
    await page.evaluate(() => window.__BRIAR_GLENDebug.interact());
    await page.waitForFunction(before => {
      const s = window.__BRIAR_GLENDebug.getFinalPolishState();
      return s.pickupShows > before && (window.__BRIAR_GLENDebug.getState().player.inventory.resin || 0) === 1;
    }, pickupBefore);
    const pickup = page.locator('#polish23-pickup');
    if (!(await pickup.isVisible())) throw new Error(`${vp.name}: interaction pickup ribbon did not become visible`);
    const pickupText = await pickup.innerText();
    if (!pickupText.includes('Ironpine Resin +1')) throw new Error(`${vp.name}: Resin pickup ribbon incorrect: ${pickupText}`);
    const pickupBox = await pickup.boundingBox();
    if (!inside(pickupBox, vp)) throw new Error(`${vp.name}: pickup ribbon outside viewport ${JSON.stringify(pickupBox)}`);

    // Existing functional panels remain viewport-safe and gain a consistent presentation transition.
    await page.locator('#inventory-strip').click();
    await page.waitForFunction(() => !document.getElementById('inventory-panel')?.hidden);
    const panel = page.locator('#inventory-panel');
    const panelBox = await panel.boundingBox();
    if (!inside(panelBox, vp)) throw new Error(`${vp.name}: polished Satchel panel outside viewport ${JSON.stringify(panelBox)}`);
    const animationName = await panel.evaluate(el => getComputedStyle(el).animationName);
    if (!animationName.includes('polish23PanelIn')) throw new Error(`${vp.name}: final panel transition missing: ${animationName}`);
    await page.locator('#inventory-close').click();

    // The completed vertical slice gets a deliberate, dismissible end-cap without ending free play.
    await page.evaluate(() => window.__BRIAR_GLENDebug.triggerFinalPolishCompletion());
    await page.waitForFunction(() => !document.getElementById('polish23-complete')?.hidden);
    const completion = page.locator('#polish23-complete .polish23-complete-card');
    const completionBox = await completion.boundingBox();
    if (!inside(completionBox, vp)) throw new Error(`${vp.name}: completion presentation outside viewport ${JSON.stringify(completionBox)}`);
    const completionText = await completion.innerText();
    if (!completionText.includes('Vertical Slice Complete') || !completionText.includes('Return to Briar Glen')) {
      throw new Error(`${vp.name}: completion presentation copy incomplete: ${completionText}`);
    }
    await page.locator('#polish23-complete-close').click();
    if (await page.locator('#polish23-complete').isVisible()) throw new Error(`${vp.name}: completion presentation did not dismiss`);

    // Build 23 must use the canonical hook bus, never restart the historical wrapper chain.
    const runtime = await page.evaluate(() => window.__BRIAR_GLENDebug.getRuntimeArchitectureState());
    const requiredHooks = [
      ['beforeInteract','build23-interact-snapshot'],
      ['afterInteract','build23-interact-feedback'],
      ['afterUpdate','build23-zone-and-recovery'],
      ['afterDraw','build23-stonepine-atmosphere'],
      ['afterUpdateUI','build23-ui-state'],
    ];
    for (const [type, id] of requiredHooks) {
      if (!runtime.hooks[type]?.some(hook => hook.id === id)) throw new Error(`${vp.name}: final polish hook ${id} missing from ${type}`);
    }
    if (runtime.legacyLoaderScriptCount !== 0 || runtime.topLevelBootstrapCount !== 1) {
      throw new Error(`${vp.name}: canonical runtime regressed ${JSON.stringify(runtime)}`);
    }

    // User-requested softened feedback remains an explicit release gate.
    await page.evaluate(() => window.__BRIAR_GLENDebug.setCameraShake(12));
    await sleep(40);
    const feedback = await page.evaluate(() => window.__BRIAR_GLENDebug.getFeedbackTuningState());
    if (feedback.renderedAmplitude > 1.55 || Math.hypot(feedback.frameX, feedback.frameY) > 1.95) {
      throw new Error(`${vp.name}: final polish regressed gentler feedback ${JSON.stringify(feedback)}`);
    }
    await page.evaluate(() => window.__BRIAR_GLENDebug.setCameraShake(0));

    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getFinalPolishState());
    if (JSON.stringify(state.entityCounts) !== JSON.stringify(entities) || JSON.stringify(state.balance) !== JSON.stringify(expectedBalance)) {
      throw new Error(`${vp.name}: final polish caused world/balance drift`);
    }
    const overflow = await page.evaluate(() => ({ sw:document.documentElement.scrollWidth, iw:innerWidth, sh:document.documentElement.scrollHeight, ih:innerHeight }));
    if (overflow.sw > overflow.iw + 1 || overflow.sh > overflow.ih + 1) throw new Error(`${vp.name}: final polish caused browser overflow ${JSON.stringify(overflow)}`);
    if (errors.length) throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);

    console.log(`PASS ${vp.name}: final slice polish + area moments + Stonepine atmosphere + interaction feedback + completion presentation active`);
    await context.close();
  }
} finally {
  await browser.close();
}
