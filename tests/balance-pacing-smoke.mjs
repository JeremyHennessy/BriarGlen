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

try {
  for (const vp of viewports) {
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    await context.addInitScript(()=>localStorage.removeItem('briar-glen-run-metrics-v1'));
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});

    let loaded=false,lastError;
    for(let attempt=1;attempt<=(live?48:1);attempt++){
      try{
        const sep=target.includes('?')?'&':'?';
        await page.goto(`${target}${sep}balance22=${Date.now()}-${attempt}`,{waitUntil:'domcontentloaded',timeout:15000});
        await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getBalanceState&&window.__BRIAR_GLENDebug?.getBuildInfo),{timeout:7000});
        loaded=true;break;
      }catch(error){lastError=error;if(live&&attempt<48)await sleep(5000);}
    }
    if(!loaded)throw new Error(`${vp.name}: Build 22 balance runtime unavailable: ${lastError?.message||'unknown'}`);

    const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
    if(build.version!=='22'||build.label!=='Balance & Pacing'||build.runtime!=='canonical-manifest-hooks-v1')throw new Error(`${vp.name}: incorrect Build 22 metadata ${JSON.stringify(build)}`);

    let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.resetBalanceMetrics());
    const expectedBaseline={
      profile:'vertical-slice-balanced-v1',
      player:{startHp:100,startCoins:100,speed:245,wornSwordDamage:24,reinforcedSwordDamage:38},
      weapons:{bowDamage:18,staffDamage:24},
      enemies:{wolfHp:52,wolfDamage:9,boarHp:70,boarDamage:11,emberbackHp:320},
      economy:{emberbackCoins:75,firstContractCoins:150,healingTonicHeal:45,wardenOilBonus:.15},
      progression:{briarleafRequired:3,copperRequired:3},
    };
    if(JSON.stringify(state.baseline)!==JSON.stringify(expectedBaseline))throw new Error(`${vp.name}: verified balance baseline drifted ${JSON.stringify(state.baseline)}`);
    if(Object.keys(state.targets).length!==9||state.targets.briarleaf.min!==120||state.targets.stonepine.max!==4800)throw new Error(`${vp.name}: pacing target bands incorrect`);

    await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      d.setBalanceActiveSeconds(180);
      d.setInventory({herb:3});
      d.setProgress({step:1});
    });
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getBalanceState().pace.briarleaf.status==='target');
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBalanceState());
    if(state.metrics.milestones.briarleaf<180||state.metrics.milestones.briarleaf>181||state.pace.briarleaf.status!=='target'||state.nextMilestone!=='copper'){
      throw new Error(`${vp.name}: Briarleaf milestone timing incorrect ${JSON.stringify(state.pace.briarleaf)}`);
    }
    if(state.metrics.itemsGained.herb<3)throw new Error(`${vp.name}: material-gain observer missed Briarleaf ${JSON.stringify(state.metrics.itemsGained)}`);

    const beforeKill=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBalanceState());
    await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      d.setThreat('wolf',{hp:1,dead:false,hurt:0});
      d.damageIdentityThreat('wolf',1,'sword');
    });
    await sleep(120);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBalanceState());
    if(state.metrics.damageDealt-beforeKill.metrics.damageDealt!==1||state.metrics.weaponDamage.sword-beforeKill.metrics.weaponDamage.sword!==1||state.metrics.kills-beforeKill.metrics.kills!==1||state.metrics.killsByType.wolf!==1||state.metrics.coinsEarned-beforeKill.metrics.coinsEarned!==6){
      throw new Error(`${vp.name}: damage/kill/coin telemetry incorrect ${JSON.stringify({before:beforeKill.metrics,after:state.metrics})}`);
    }

    const beforeSpend=state.metrics.coinsSpent;
    await page.evaluate(()=>window.__BRIAR_GLENDebug.setPlayer({coins:window.__BRIAR_GLENDebug.getState().player.coins-10}));
    await sleep(100);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBalanceState());
    if(state.metrics.coinsSpent-beforeSpend!==10)throw new Error(`${vp.name}: coin-spend telemetry incorrect ${JSON.stringify(state.metrics)}`);

    const beforeDamage=state.metrics.damageTaken;
    await page.evaluate(()=>window.__BRIAR_GLENDebug.setPlayer({hp:87,maxHp:100}));
    await sleep(90);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBalanceState());
    if(state.metrics.damageTaken-beforeDamage!==13)throw new Error(`${vp.name}: damage-taken telemetry incorrect ${JSON.stringify(state.metrics)}`);

    await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      d.setPlayer({hp:10,maxHp:100});
      d.teleport(1100,0);
    });
    await sleep(80);
    await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      d.setPlayer({hp:100});
      d.teleport(-720,30);
    });
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getBalanceState().metrics.deaths>=1);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBalanceState());
    if(state.metrics.deaths!==1)throw new Error(`${vp.name}: recovery/death telemetry incorrect ${JSON.stringify(state.metrics)}`);

    await page.evaluate(()=>window.__BRIAR_GLENDebug.openJournal());
    await page.waitForFunction(()=>document.getElementById('journal-balance-metrics')?.innerText?.includes('Balance & Pacing'));
    const card=await page.locator('#journal-balance-metrics').boundingBox();
    if(!card||card.x<-2||card.x+card.width>vp.width+2)throw new Error(`${vp.name}: balance journal card outside viewport ${JSON.stringify(card)}`);
    const journalText=await page.locator('#journal-balance-metrics').innerText();
    for(const text of ['Active field time','Coin flow','pacing milestones'])if(!journalText.includes(text))throw new Error(`${vp.name}: balance journal missing ${text}`);
    await page.evaluate(()=>window.__BRIAR_GLENDebug.closeWardenBook());

    const runtime=await page.evaluate(()=>window.__BRIAR_GLENDebug.getRuntimeArchitectureState());
    for(const [type,id] of [['beforeDamageEnemy','build22-damage-start'],['afterDamageEnemy','build22-damage-end'],['afterKillEnemy','build22-kill'],['afterUpdate','build22-balance-observer']]){
      if(!runtime.hooks[type].some(h=>h.id===id))throw new Error(`${vp.name}: balance hook ${id} missing from ${type}`);
    }

    await page.evaluate(()=>window.__BRIAR_GLENDebug.flushBalanceMetrics());
    const persistedBefore=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBalanceState());
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getBalanceState));
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBalanceState());
    if(state.metrics.damageDealt<persistedBefore.metrics.damageDealt||state.metrics.deaths!==1||state.metrics.milestones.briarleaf<180||state.pace.briarleaf.status!=='target'){
      throw new Error(`${vp.name}: balance telemetry did not persist ${JSON.stringify(state)}`);
    }

    await page.evaluate(()=>sessionStorage.setItem('briar-glen-start-intent','new'));
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getBalanceState));
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBalanceState());
    if(state.metrics.deaths!==0||state.metrics.damageDealt!==0||state.metrics.coinsEarned!==0||state.metrics.milestones.briarleaf!==undefined){
      throw new Error(`${vp.name}: New Game did not reset local balance metrics ${JSON.stringify(state.metrics)}`);
    }

    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: balance UI caused browser overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: local balance telemetry + pacing targets + Journal report persistent without baseline drift`);
    await context.close();
  }
} finally { await browser.close(); }
