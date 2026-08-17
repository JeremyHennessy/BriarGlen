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

function inside(box, vp) {
  return box && box.x >= -2 && box.y >= -2 && box.x + box.width <= vp.width + 2 && box.y + box.height <= vp.height + 2;
}

try {
  for (const vp of viewports) {
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    await context.addInitScript(() => {
      if (sessionStorage.getItem('briar-glen-onboarding-test-clean') === '1') return;
      localStorage.removeItem('briar-glen-vslice-v1');
      localStorage.removeItem('briar-glen-onboarding-v1');
      localStorage.removeItem('briar-glen-run-metrics-v1');
      localStorage.removeItem('briar-glen-audio-muted');
      sessionStorage.removeItem('briar-glen-start-intent');
      sessionStorage.setItem('briar-glen-onboarding-test-clean','1');
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});

    let loaded=false,lastError;
    for(let attempt=1;attempt<=(live?48:1);attempt++){
      try{
        const sep=target.includes('?')?'&':'?';
        await page.goto(`${target}${sep}onboarding=1&ob21=${Date.now()}-${attempt}`,{waitUntil:'domcontentloaded',timeout:15000});
        await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getOnboardingState&&window.__BRIAR_GLENDebug?.getBuildInfo),{timeout:7000});
        loaded=true;break;
      }catch(error){lastError=error;if(live&&attempt<48)await sleep(5000);}
    }
    if(!loaded)throw new Error(`${vp.name}: Build 21+ onboarding runtime unavailable: ${lastError?.message||'unknown'}`);

    const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
    if(Number.parseFloat(build.version)<21||build.runtime!=='canonical-manifest-hooks-v1')throw new Error(`${vp.name}: incorrect Build 21+ metadata ${JSON.stringify(build)}`);

    let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getOnboardingState());
    if(!state.startOpen||state.hadSave||state.automationBypass||!state.forceOnboarding)throw new Error(`${vp.name}: fresh title state incorrect ${JSON.stringify(state)}`);
    if(!(await page.locator('#onboarding21-start').isVisible()))throw new Error(`${vp.name}: start screen not visible`);
    if(!inside(await page.locator('.onboarding21-start-card').boundingBox(),vp))throw new Error(`${vp.name}: start card outside viewport`);
    if(!(await page.locator('#onboarding21-continue').isDisabled()))throw new Error(`${vp.name}: Continue should be disabled on a fresh game`);

    const startPos=await page.evaluate(()=>window.__BRIAR_GLENDebug.getState().player);
    await page.keyboard.down('KeyD'); await sleep(180); await page.keyboard.up('KeyD');
    const frozenPos=await page.evaluate(()=>window.__BRIAR_GLENDebug.getState().player);
    if(Math.hypot(frozenPos.x-startPos.x,frozenPos.y-startPos.y)>.5)throw new Error(`${vp.name}: game moved behind start screen`);

    await page.locator('#onboarding21-audio').click();
    let feel=await page.evaluate(()=>window.__BRIAR_GLENDebug.getFeelState());
    if(!feel.muted)throw new Error(`${vp.name}: title sound toggle did not mute`);
    await page.locator('#onboarding21-audio').click();
    feel=await page.evaluate(()=>window.__BRIAR_GLENDebug.getFeelState());
    if(feel.muted)throw new Error(`${vp.name}: title sound toggle did not restore sound`);

    await Promise.all([
      page.waitForNavigation({waitUntil:'domcontentloaded'}),
      page.locator('#onboarding21-new').click(),
    ]);
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug?.getOnboardingState?.().guide?.active===true);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getOnboardingState());
    if(state.startOpen||state.hadSave||state.guide.stage!=='move'||state.guide.complete)throw new Error(`${vp.name}: New Game did not enter a fresh move guide ${JSON.stringify(state)}`);
    if((await page.locator('#attack-btn').evaluate(el=>getComputedStyle(el).visibility))!=='hidden')throw new Error(`${vp.name}: attack should be concealed during movement lesson`);

    // Keep the real desktop/touch movement path under test, but wait for the actual movement lesson
    // transition instead of assuming 420ms of wall time always advances enough capped game-loop time.
    await page.keyboard.down('KeyD');
    try {
      await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().guide.stage==='gather',{timeout:3000});
    } finally {
      await page.keyboard.up('KeyD');
    }
    if((await page.locator('#interact-btn').evaluate(el=>getComputedStyle(el).visibility))!=='visible')throw new Error(`${vp.name}: USE was not revealed for gathering`);

    await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setInventory({herb:3});d.setProgress({step:1});});
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().guide.stage==='combat');
    if((await page.locator('#attack-btn').evaluate(el=>getComputedStyle(el).visibility))!=='visible')throw new Error(`${vp.name}: ATTACK was not revealed for combat`);

    await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setThreat('wolf',{hp:52,dead:false,hurt:0});d.damageIdentityThreat('wolf',1,'sword');});
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().guide.stage==='dodge');
    await page.keyboard.press('ShiftLeft');
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().guide.stage==='hollow');
    if((await page.locator('#dash-btn').evaluate(el=>getComputedStyle(el).visibility))!=='visible')throw new Error(`${vp.name}: DODGE was not revealed`);

    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(950,0));
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().guide.stage==='forge');
    await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setProgress({step:3});d.setPlayer({reinforced:true});});
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().guide.stage==='emberback');
    await page.evaluate(()=>window.__BRIAR_GLENDebug.setProgress({bossDefeated:true}));
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().guide.stage==='weapons');
    if((await page.locator('#weapon-btn').evaluate(el=>getComputedStyle(el).visibility))!=='visible')throw new Error(`${vp.name}: weapon cycle was not revealed`);

    await page.evaluate(()=>window.__BRIAR_GLENDebug.selectWeapon('bow'));
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().guide.stage==='satchel');
    if((await page.locator('#inventory-strip').evaluate(el=>getComputedStyle(el).visibility))!=='visible')throw new Error(`${vp.name}: Satchel was not revealed`);
    await page.locator('#inventory-strip').click();
    await page.waitForFunction(()=>!document.getElementById('inventory-panel').hidden&&window.__BRIAR_GLENDebug.getOnboardingState().guide.stage==='skills');
    await page.locator('#inventory-close').click();

    if(vp.touch){
      if((await page.locator('#skill-btn').evaluate(el=>getComputedStyle(el).visibility))!=='visible')throw new Error(`${vp.name}: SKILL was not revealed`);
      await page.locator('#skill-btn').click();
    }else{
      await page.keyboard.press('KeyF');
    }
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().guide.stage==='map');
    if((await page.locator('#warden-map-btn').evaluate(el=>getComputedStyle(el).visibility))!=='visible')throw new Error(`${vp.name}: MAP was not revealed`);
    await page.locator('#warden-map-btn').click();
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().guide.complete===true);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getOnboardingState());
    if(state.guide.active||state.guide.skipped||state.guide.transitions<9||!state.persisted?.complete)throw new Error(`${vp.name}: guide completion/persistence incorrect ${JSON.stringify(state)}`);
    await page.evaluate(()=>window.__BRIAR_GLENDebug.closeWardenBook());

    for(const selector of ['#attack-btn','#dash-btn','#weapon-btn','#skill-btn','#inventory-strip','#warden-map-btn']){
      if((await page.locator(selector).evaluate(el=>getComputedStyle(el).visibility))!=='visible')throw new Error(`${vp.name}: ${selector} stayed hidden after guide completion`);
    }

    // Recovery depends on two distinct afterUpdate snapshots: first low HP away from town, then
    // restored HP back in Briar Glen. Wait for the canonical runtime to observe the armed state
    // instead of assuming an 80ms wall-clock sleep necessarily contains an update under CI load.
    const recoveryArmDispatch=await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      d.setPlayer({hp:10,maxHp:100});
      d.teleport(1100,0);
      return d.getRuntimeArchitectureState().dispatchCounts.afterUpdate;
    });
    await page.waitForFunction(before=>window.__BRIAR_GLENDebug.getRuntimeArchitectureState().dispatchCounts.afterUpdate>before,recoveryArmDispatch,{timeout:3000});
    await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setPlayer({hp:100});d.teleport(-720,30);});
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().recoveryCount>=1,{timeout:3000});
    if(!(await page.locator('#onboarding21-recovery').isVisible()))throw new Error(`${vp.name}: recovery presentation did not appear`);

    const runtime=await page.evaluate(()=>window.__BRIAR_GLENDebug.getRuntimeArchitectureState());
    if(!runtime.hooks.beforeUpdate.some(h=>h.id==='build21-start-pause')||!runtime.hooks.afterUpdate.some(h=>h.id==='build21-guide-progress')||!runtime.hooks.beforeDamageEnemy.some(h=>h.id==='build21-first-combat')){
      throw new Error(`${vp.name}: onboarding did not use canonical hooks ${JSON.stringify(runtime.hooks)}`);
    }

    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getOnboardingState));
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getOnboardingState());
    if(!state.startOpen||!state.hadSave||!state.persisted?.complete)throw new Error(`${vp.name}: completed journey did not return to Continue screen ${JSON.stringify(state)}`);
    if(await page.locator('#onboarding21-continue').isDisabled())throw new Error(`${vp.name}: Continue disabled despite saved journey`);
    await page.locator('#onboarding21-continue').click();
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getOnboardingState());
    if(state.startOpen||state.guide.active)throw new Error(`${vp.name}: Continue did not resume established-player mode`);

    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: onboarding caused browser overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: start screen + progressive first-session guide + recovery presentation persistent`);
    await context.close();
  }
} finally { await browser.close(); }
