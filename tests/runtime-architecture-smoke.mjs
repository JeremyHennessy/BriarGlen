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
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    page.on('requestfailed',request=>errors.push(`requestfailed: ${request.url()} • ${request.failure()?.errorText||'unknown'}`));

    let loaded=false,lastError;
    for(let attempt=1;attempt<=(live?48:1);attempt++){
      try{
        const sep=target.includes('?')?'&':'?';
        await page.goto(`${target}${sep}runtime201=${Date.now()}-${attempt}`,{waitUntil:'domcontentloaded',timeout:15000});
        await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getRuntimeArchitectureState&&window.__BRIAR_GLENDebug?.getBuildInfo&&window.__BRIAR_GLEN_RUNTIME),{timeout:7000});
        loaded=true;break;
      }catch(error){lastError=error;if(live&&attempt<48)await sleep(5000);}
    }
    if(!loaded)throw new Error(`${vp.name}: Build 20.1+ runtime unavailable: ${lastError?.message||'unknown'}`);

    const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
    if(Number.parseFloat(build.version)<20.1||build.runtime!=='canonical-manifest-hooks-v1'||build.saveKey!=='briar-glen-vslice-v1'){
      throw new Error(`${vp.name}: incorrect 20.1+ runtime metadata ${JSON.stringify(build)}`);
    }

    let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getRuntimeArchitectureState());
    if(state.manifestId!=='briar-glen-runtime-v20.1'||state.manifestScripts<28||state.topLevelBootstrapCount!==1||state.managedScriptCount!==state.manifestScripts||state.legacyLoaderScriptCount!==0){
      throw new Error(`${vp.name}: canonical manifest state incorrect ${JSON.stringify(state)}`);
    }
    const expectedWrappers={update:'runtimeUpdate',draw:'runtimeDraw',interact:'runtimeInteract',damageEnemy:'runtimeDamageEnemy',killEnemy:'runtimeKillEnemy',updateUI:'runtimeUpdateUI'};
    if(JSON.stringify(state.wrappers)!==JSON.stringify(expectedWrappers))throw new Error(`${vp.name}: final runtime wrappers incorrect ${JSON.stringify(state.wrappers)}`);

    const scriptState=await page.evaluate(()=>{
      const sources=[...document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src'));
      const managed=[...document.querySelectorAll('script[data-runtime-managed="true"]')].map(s=>s.getAttribute('src'));
      return {
        sources, managed,
        unmanaged:sources.filter(src=>src!=='src/runtime/boot.js'&&!managed.includes(src)),
        duplicates:managed.filter((src,i)=>managed.indexOf(src)!==i),
        v12Style:[...document.styleSheets].filter(sheet=>(sheet.href||'').includes('styles-v12.css')).length,
      };
    });
    if(scriptState.unmanaged.length||scriptState.duplicates.length||scriptState.v12Style!==1){
      throw new Error(`${vp.name}: runtime assets not canonical ${JSON.stringify(scriptState)}`);
    }

    const hookProbe=await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      window.__runtimeTestCounts={beforeUpdate:0,afterUpdate:0,beforeDamage:0,afterDamage:0,afterUI:0};
      d.registerRuntimeHook('beforeUpdate','test-before-update',()=>window.__runtimeTestCounts.beforeUpdate++);
      d.registerRuntimeHook('afterUpdate','test-after-update',()=>window.__runtimeTestCounts.afterUpdate++);
      d.registerRuntimeHook('beforeDamageEnemy','test-before-damage',()=>window.__runtimeTestCounts.beforeDamage++);
      d.registerRuntimeHook('afterDamageEnemy','test-after-damage',()=>window.__runtimeTestCounts.afterDamage++);
      d.registerRuntimeHook('afterUpdateUI','test-ui',()=>window.__runtimeTestCounts.afterUI++);
      d.setThreat('wolf',{hp:52,dead:false,hurt:0});
      const before=d.getState().enemies.find(e=>e.type==='wolf').hp;
      const result=d.damageIdentityThreat('wolf',1,'sword');
      return {before,result};
    });
    await page.waitForFunction(()=>{
      const counts=window.__runtimeTestCounts;
      return counts?.beforeUpdate>=2&&counts?.afterUpdate>=2&&counts?.afterUI>=2;
    },{timeout:3000});
    const hookAfter=await page.evaluate(()=>({counts:{...window.__runtimeTestCounts},runtime:window.__BRIAR_GLENDebug.getRuntimeArchitectureState(),wolf:window.__BRIAR_GLENDebug.getState().enemies.find(e=>e.type==='wolf')}));
    if(hookProbe.result.before-hookProbe.result.after!==1||hookAfter.counts.beforeDamage!==1||hookAfter.counts.afterDamage!==1||hookAfter.counts.beforeUpdate<2||hookAfter.counts.afterUpdate<2||hookAfter.counts.afterUI<2){
      throw new Error(`${vp.name}: runtime hook dispatch/parity incorrect ${JSON.stringify({hookProbe,hookAfter})}`);
    }
    if(hookAfter.runtime.dispatchCounts.beforeUpdate<hookAfter.counts.beforeUpdate||hookAfter.wolf.hp!==51)throw new Error(`${vp.name}: runtime hook state/damage parity incorrect ${JSON.stringify(hookAfter)}`);

    const removed=await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      return [
        d.unregisterRuntimeHook('beforeUpdate','test-before-update'),
        d.unregisterRuntimeHook('afterUpdate','test-after-update'),
        d.unregisterRuntimeHook('beforeDamageEnemy','test-before-damage'),
        d.unregisterRuntimeHook('afterDamageEnemy','test-after-damage'),
        d.unregisterRuntimeHook('afterUpdateUI','test-ui'),
      ];
    });
    if(removed.some(value=>!value))throw new Error(`${vp.name}: hook unregister failed ${JSON.stringify(removed)}`);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getRuntimeArchitectureState());
    for(const type of ['beforeUpdate','afterUpdate','beforeDamageEnemy','afterDamageEnemy','afterUpdateUI']){
      if(state.hooks[type].some(h=>h.id.startsWith('test-')))throw new Error(`${vp.name}: test hook leaked from ${type}`);
    }

    const APIs=await page.evaluate(()=>['getBoardState','getMarketState','getCombatIdentityState','getArtState','getFeedbackTuningState','getStonepineState','getStonepineIntegrationState','getBiomeArtState','getHollowDenArtState'].map(name=>[name,typeof window.__BRIAR_GLENDebug?.[name]]));
    for(const [name,type] of APIs)if(type!=='function')throw new Error(`${vp.name}: canonical bootstrap lost ${name}`);

    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: runtime consolidation caused browser overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: runtime/resource errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: canonical manifest + hook registry active with gameplay parity preserved`);
    await context.close();
  }
} finally { await browser.close(); }
