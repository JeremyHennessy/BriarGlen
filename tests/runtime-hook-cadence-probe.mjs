import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:false,deviceScaleFactor:1});
  const page=await context.newPage();
  await page.goto(`${target}?hookProbe=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getRuntimeArchitectureState),{timeout:7000});
  const probe=await page.evaluate(()=>{
    const d=window.__BRIAR_GLENDebug;
    window.__runtimeProbeCounts={beforeUpdate:0,afterUpdate:0,beforeDamage:0,afterDamage:0,afterUI:0};
    d.registerRuntimeHook('beforeUpdate','probe-before-update',()=>window.__runtimeProbeCounts.beforeUpdate++);
    d.registerRuntimeHook('afterUpdate','probe-after-update',()=>window.__runtimeProbeCounts.afterUpdate++);
    d.registerRuntimeHook('beforeDamageEnemy','probe-before-damage',()=>window.__runtimeProbeCounts.beforeDamage++);
    d.registerRuntimeHook('afterDamageEnemy','probe-after-damage',()=>window.__runtimeProbeCounts.afterDamage++);
    d.registerRuntimeHook('afterUpdateUI','probe-ui',()=>window.__runtimeProbeCounts.afterUI++);
    d.setThreat('wolf',{hp:52,dead:false,hurt:0});
    const before=d.getState().enemies.find(e=>e.type==='wolf').hp;
    const result=d.damageIdentityThreat('wolf',1,'sword');
    return {before,result};
  });
  const samples=[];
  let prior=0;
  for(const elapsed of [60,120,180,260,360,480,650,900]){
    await page.waitForTimeout(elapsed-prior);prior=elapsed;
    samples.push({elapsed,counts:await page.evaluate(()=>({...window.__runtimeProbeCounts}))});
  }
  const after=await page.evaluate(()=>({runtime:window.__BRIAR_GLENDebug.getRuntimeArchitectureState(),wolf:window.__BRIAR_GLENDebug.getState().enemies.find(e=>e.type==='wolf')}));
  console.log(`RUNTIME_HOOK_CADENCE_PROBE ${JSON.stringify({probe,samples,after})}`);
  if(probe.result.before-probe.result.after!==1||after.wolf.hp!==51)throw new Error('damage parity failed');
  if(!samples.some(s=>s.counts.beforeUpdate>=2&&s.counts.afterUpdate>=2&&s.counts.afterUI>=2))throw new Error(`runtime update hooks never reached two dispatches: ${JSON.stringify(samples)}`);
  const reached=samples.find(s=>s.counts.beforeUpdate>=2&&s.counts.afterUpdate>=2&&s.counts.afterUI>=2);
  console.log(`PASS desktop: runtime hooks reached two update/UI dispatches by ${reached.elapsed}ms; 180ms counts=${JSON.stringify(samples.find(s=>s.elapsed===180)?.counts)}`);
  await context.close();
}finally{await browser.close();}
