import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const live=process.argv.includes('--live');
const viewports=[
  {name:'phone-landscape',width:932,height:430,touch:true},
  {name:'phone-portrait',width:430,height:932,touch:true},
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
const expectedWrappers={update:'runtimeUpdate',draw:'runtimeDraw',interact:'runtimeInteract',damageEnemy:'runtimeDamageEnemy',killEnemy:'runtimeKillEnemy',updateUI:'runtimeUpdateUI'};

async function open(page,url){
  let last;
  for(let attempt=1;attempt<=(live?36:1);attempt++){
    try{
      const sep=url.includes('?')?'&':'?';
      await page.goto(`${url}${sep}landmarkStateProof=${Date.now()}-${attempt}`,{waitUntil:'domcontentloaded',timeout:15000});
      await page.waitForFunction(()=>Boolean(
        window.__BRIAR_GLENDebug?.getLandmarkStatePolish&&
        window.__BRIAR_GLENDebug?.getAssetVariantState&&
        window.__BRIAR_GLENDebug?.getGeneratedArtState&&
        window.__BRIAR_GLENDebug?.getWorldLayoutV2State
      ),{timeout:8000});
      return;
    }catch(e){last=e;if(live&&attempt<36)await sleep(5000);}
  }
  throw last;
}

async function shot(page,vp,name,x,y,progress={}){
  await page.evaluate(({x,y,progress})=>{
    const d=window.__BRIAR_GLENDebug;
    if(Object.keys(progress).length)d.setProgress(progress);
    d.teleport(x,y);
  },{x,y,progress});
  await sleep(260);
  await page.screenshot({path:`artifacts/landmark-state-${vp.name}-${name}.png`});
}

try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    await context.addInitScript(()=>{
      localStorage.removeItem('briar-glen-vslice-v1');
      localStorage.removeItem('briar-glen-onboarding-v1');
      localStorage.removeItem('briar-glen-run-metrics-v1');
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    await open(page,target);
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getLandmarkStatePolish().ready,{timeout:8000});

    const architecture=await page.evaluate(()=>window.__BRIAR_GLENDebug.getRuntimeArchitectureState());
    if(JSON.stringify(architecture.wrappers)!==JSON.stringify(expectedWrappers))throw new Error(`${vp.name}: Build 44 replaced canonical wrappers ${JSON.stringify(architecture.wrappers)}`);

    let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getLandmarkStatePolish());
    if(!state.enabled)throw new Error(`${vp.name}: Build 44 landmark polish not enabled by default ${JSON.stringify(state)}`);
    if(JSON.stringify(state.baseline)!==JSON.stringify(state.current))throw new Error(`${vp.name}: Build 44 mutated gameplay entity counts on load`);

    await shot(page,vp,'willow-cottage',-905,330);
    await shot(page,vp,'warden-house',-575,-365);

    await shot(page,vp,'grove-cache-ready',650,-850,{grovekeeperDefeated:true,groveCacheClaimed:false});
    await shot(page,vp,'grove-cache-claimed',650,-850,{grovekeeperDefeated:true,groveCacheClaimed:true});

    await shot(page,vp,'fen-gate-closed',1050,-1200,{reinforcedPickaxe:true,temperedSword:true,fenDiscovered:true,fenCrossingOpened:false});
    await shot(page,vp,'fen-gate-open',1050,-1200,{reinforcedPickaxe:true,temperedSword:true,fenDiscovered:true,fenCrossingOpened:true});

    await shot(page,vp,'stonepine-gate-closed',2240,-1500,{fenCacheClaimed:true,stonepineDiscovered:true,stonepinePassOpened:false});
    await shot(page,vp,'stonepine-gate-open',2240,-1500,{fenCacheClaimed:true,stonepineDiscovered:true,stonepinePassOpened:true});
    await shot(page,vp,'stonepine-camp',2690,-1365,{fenCacheClaimed:true,stonepinePassOpened:true,stonepineDiscovered:true});

    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getLandmarkStatePolish());
    if(!state.archetypes['cottage-left-annex']&&!state.archetypes['cottage-right-annex'])throw new Error(`${vp.name}: ordinary cottage annex silhouette never rendered ${JSON.stringify(state.archetypes)}`);
    if(!state.archetypes['warden-house-compact'])throw new Error(`${vp.name}: Warden House compact silhouette was not preserved ${JSON.stringify(state.archetypes)}`);
    for(const key of ['grove-cache-ready','grove-cache-claimed','fen-gate-closed','fen-gate-open','fen-open-wings','stonepine-gate-closed','stonepine-gate-open','stonepine-open-wings','stonepine-camp-silhouette']){
      if(!state.landmarks[key])throw new Error(`${vp.name}: landmark state ${key} was not rendered ${JSON.stringify(state.landmarks)}`);
    }
    if(JSON.stringify(state.baseline)!==JSON.stringify(state.current))throw new Error(`${vp.name}: Build 44 changed gameplay entity counts after traversal`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    await context.close();
  }

  for(const query of ['landmarkPolish=0','generatedArt=0','canvasArt=1','artScope=build30']){
    const context=await browser.newContext({viewport:{width:932,height:430},hasTouch:true,deviceScaleFactor:1});
    const page=await context.newPage();
    const sep=target.includes('?')?'&':'?';
    await open(page,`${target}${sep}${query}`);
    await sleep(180);
    const value=await page.evaluate(()=>({l:window.__BRIAR_GLENDebug.getLandmarkStatePolish?.(),g:window.__BRIAR_GLENDebug.getGeneratedArtState?.(),v:window.__BRIAR_GLENDebug.getAssetVariantState?.()}));
    if(value.l?.enabled)throw new Error(`${query}: Build 44 rollback failed ${JSON.stringify(value)}`);
    if(query==='landmarkPolish=0'&&(!value.g?.enabled||!value.v?.enabled))throw new Error(`${query}: landmark rollback disabled earlier approved art layers ${JSON.stringify(value)}`);
    await context.close();
  }

  console.log('PASS Build 44 landmarks: cottage silhouette composition, stateful cache/gates, canonical wrappers, rollback and phone proof');
}finally{await browser.close();}
