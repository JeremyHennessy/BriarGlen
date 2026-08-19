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
      await page.goto(`${url}${sep}assetVariantProof=${Date.now()}-${attempt}`,{waitUntil:'domcontentloaded',timeout:15000});
      await page.waitForFunction(()=>Boolean(
        window.__BRIAR_GLENDebug?.getAssetVariantState&&
        window.__BRIAR_GLENDebug?.getRegionalPropState&&
        window.__BRIAR_GLENDebug?.getGeneratedArtState&&
        window.__BRIAR_GLENDebug?.getWorldLayoutV2State
      ),{timeout:8000});
      return;
    }catch(e){last=e;if(live&&attempt<36)await sleep(5000);}
  }
  throw last;
}

try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    await open(page,target);
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getAssetVariantState().ready&&window.__BRIAR_GLENDebug.getRegionalPropState().ready,{timeout:8000});

    const architecture=await page.evaluate(()=>window.__BRIAR_GLENDebug.getRuntimeArchitectureState());
    if(JSON.stringify(architecture.wrappers)!==JSON.stringify(expectedWrappers))throw new Error(`${vp.name}: asset variant pass replaced canonical wrappers ${JSON.stringify(architecture.wrappers)}`);

    const baseline=await page.evaluate(()=>({v:window.__BRIAR_GLENDebug.getAssetVariantState(),p:window.__BRIAR_GLENDebug.getRegionalPropState()}));
    if(!baseline.v.enabled||!baseline.p.enabled)throw new Error(`${vp.name}: asset variants not enabled by default ${JSON.stringify(baseline)}`);
    if(JSON.stringify(baseline.v.baseline)!==JSON.stringify(baseline.v.current)||JSON.stringify(baseline.p.baseline)!==JSON.stringify(baseline.p.current))throw new Error(`${vp.name}: asset pass mutated gameplay entity counts`);

    const shots=[
      ['village',-720,30],
      ['grove-cache',650,-850],
      ['fen-gate',1050,-1200],
      ['stonepine-camp',2690,-1365],
      ['copper-work',1040,90],
    ];
    for(const [name,x,y] of shots){
      if(name==='grove-cache')await page.evaluate(()=>window.__BRIAR_GLENDebug.setProgress({grovekeeperDefeated:true,groveCacheClaimed:false}));
      if(name==='fen-gate')await page.evaluate(()=>window.__BRIAR_GLENDebug.setProgress({fenCrossingOpened:false,fenDiscovered:true}));
      if(name==='stonepine-camp')await page.evaluate(()=>window.__BRIAR_GLENDebug.setProgress({fenCrossingOpened:true,fenDiscovered:true,fenWardenDefeated:true,fenCacheClaimed:true,stonepinePassOpened:true,stonepineDiscovered:true}));
      await page.evaluate(([px,py])=>window.__BRIAR_GLENDebug.teleport(px,py),[x,y]);
      await sleep(260);
      await page.screenshot({path:`artifacts/asset-variants-${vp.name}-${name}.png`});
    }

    const active=await page.evaluate(()=>({v:window.__BRIAR_GLENDebug.getAssetVariantState(),p:window.__BRIAR_GLENDebug.getRegionalPropState()}));
    if(active.v.applied<5)throw new Error(`${vp.name}: too few deterministic variants applied ${JSON.stringify(active.v)}`);
    if(Object.keys(active.v.families).length<4)throw new Error(`${vp.name}: variant family coverage too low ${JSON.stringify(active.v.families)}`);
    if(active.v.overlayDraws<2||!active.v.overlays.chest||!active.v.overlays.signpost)throw new Error(`${vp.name}: stateful generated overlays missing ${JSON.stringify(active.v.overlays)}`);
    if(active.p.totalDraws<8||Object.keys(active.p.clusters).length<4)throw new Error(`${vp.name}: regional prop coverage too low ${JSON.stringify(active.p)}`);
    if(JSON.stringify(active.v.baseline)!==JSON.stringify(active.v.current)||JSON.stringify(active.p.baseline)!==JSON.stringify(active.p.current))throw new Error(`${vp.name}: asset variants changed gameplay entity counts after traversal`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);

    await context.close();
  }

  for(const query of ['assetVariants=0','generatedArt=0','canvasArt=1','artScope=build30']){
    const context=await browser.newContext({viewport:{width:932,height:430},hasTouch:true,deviceScaleFactor:1});
    const page=await context.newPage();
    const sep=target.includes('?')?'&':'?';
    await open(page,`${target}${sep}${query}`);
    await sleep(160);
    const state=await page.evaluate(()=>({v:window.__BRIAR_GLENDebug.getAssetVariantState?.(),p:window.__BRIAR_GLENDebug.getRegionalPropState?.(),g:window.__BRIAR_GLENDebug.getGeneratedArtState?.()}));
    if(state.v?.enabled||state.p?.enabled)throw new Error(`${query}: variant/dressing rollback failed ${JSON.stringify(state)}`);
    if(query==='assetVariants=0'&&!state.g?.enabled)throw new Error(`${query}: disabling variants also disabled base generated art`);
    await context.close();
  }

  console.log('PASS asset variants: deterministic families, stateful landmarks, regional props, canonical wrappers, rollback and mobile proof');
}finally{await browser.close();}
