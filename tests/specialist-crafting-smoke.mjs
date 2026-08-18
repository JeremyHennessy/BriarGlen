import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const viewports=[
  {name:'phone-landscape',width:932,height:430,touch:true},
  {name:'phone-portrait',width:430,height:932,touch:true},
  {name:'desktop',width:1440,height:900,touch:false},
];
const browser=await chromium.launch({headless:true});

try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    await context.addInitScript(()=>{
      if(sessionStorage.getItem('briar-glen-specialist-test-reset')==='1')return;
      localStorage.removeItem('briar-glen-vslice-v1');
      localStorage.removeItem('briar-glen-onboarding-v1');
      localStorage.removeItem('briar-glen-run-metrics-v1');
      localStorage.removeItem('briar-glen-vertical-slice-complete-v1');
      sessionStorage.setItem('briar-glen-specialist-test-reset','1');
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    page.on('requestfailed',r=>errors.push(`requestfailed: ${r.url()} • ${r.failure()?.errorText||'unknown'}`));

    await page.goto(`${target}?specialist31=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>Boolean(
      window.__BRIAR_GLENDebug?.getSpecialistCraftingState&&
      window.__BRIAR_GLENDebug?.chooseSpecialistTrait&&
      window.__BRIAR_GLENDebug?.previewSpecialistDamage&&
      window.__BRIAR_GLENDebug?.getBalanceState&&
      window.__BRIAR_GLENDebug?.getBuildInfo
    ),{timeout:7000});

    const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
    if(build.version!=='31'||build.label!=='Specialist Crafting'||build.saveKey!=='briar-glen-vslice-v1'||build.schema!==1){
      throw new Error(`${vp.name}: incorrect Build 31 metadata ${JSON.stringify(build)}`);
    }

    let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getSpecialistCraftingState());
    if(JSON.stringify(state.entityCounts)!==JSON.stringify(state.baselineEntities))throw new Error(`${vp.name}: specialist layer mutated entities on load ${JSON.stringify(state)}`);
    if(Object.values(state.traits).some(Boolean))throw new Error(`${vp.name}: new save started with specialist traits ${JSON.stringify(state.traits)}`);

    const setup=await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      d.setProgress({
        contractComplete:true,reinforcedPickaxe:true,temperedSword:true,briarstringBow:true,moonrootStaff:true,
        fenDiscovered:true,fenCacheClaimed:true,stonepineDiscovered:true,
      });
      d.setInventory({iron:10,resin:10,hide:10,binding:10,ore:10,herb:10,mooncap:10,mossglass:10});
      d.toggleCrafting?.(true);
      return d.getSpecialistCraftingState();
    });
    if(!setup.masterworks.sword||!setup.masterworks.bow||!setup.masterworks.staff)throw new Error(`${vp.name}: specialist masterwork gate setup failed ${JSON.stringify(setup.masterworks)}`);

    const cardCount=await page.locator('#specialist31-grid .craft-item').count();
    if(cardCount!==6)throw new Error(`${vp.name}: expected six specialist finishing choices, found ${cardCount}`);
    if(!(await page.locator('#specialist31-finishing').isVisible()))throw new Error(`${vp.name}: specialist finishing section not visible in forge`);

    const forceSword=await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      const ok=d.chooseSpecialistTrait('sword','forceful');
      return {ok,state:d.getSpecialistCraftingState(),preview:d.previewSpecialistDamage(100,'sword')};
    });
    if(!forceSword.ok||forceSword.state.traits.sword!=='forceful'||forceSword.state.materials.iron!==8||forceSword.state.materials.resin!==9){
      throw new Error(`${vp.name}: Quarry Edge crafting incorrect ${JSON.stringify(forceSword)}`);
    }
    if(forceSword.preview!==130)throw new Error(`${vp.name}: forceful sword expected integrated preview 130, got ${forceSword.preview}`);

    const swiftSword=await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      const ok=d.chooseSpecialistTrait('sword','swift');
      const preview=d.previewSpecialistDamage(100,'sword');
      d.toggleCrafting?.(false);
      d.attack();
      return {ok,state:d.getSpecialistCraftingState(),preview};
    });
    if(!swiftSword.ok||swiftSword.state.traits.sword!=='swift'||swiftSword.state.materials.hide!==8||swiftSword.state.materials.binding!==9){
      throw new Error(`${vp.name}: Warden Grip reforging incorrect ${JSON.stringify(swiftSword)}`);
    }
    if(swiftSword.preview!==118)throw new Error(`${vp.name}: swift sword should preserve masterwork damage 118, got ${swiftSword.preview}`);
    if(!(swiftSword.state.attackCd>0&&swiftSword.state.attackCd<.39))throw new Error(`${vp.name}: swift attack recovery not applied ${JSON.stringify(swiftSword.state)}`);

    const otherTraits=await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      return {
        bow:d.chooseSpecialistTrait('bow','forceful'),
        staff:d.chooseSpecialistTrait('staff','swift'),
        state:d.getSpecialistCraftingState(),
      };
    });
    if(!otherTraits.bow||!otherTraits.staff||otherTraits.state.traits.bow!=='forceful'||otherTraits.state.traits.staff!=='swift'){
      throw new Error(`${vp.name}: bow/staff specialist choices failed ${JSON.stringify(otherTraits)}`);
    }
    if(JSON.stringify(otherTraits.state.entityCounts)!==JSON.stringify(otherTraits.state.baselineEntities))throw new Error(`${vp.name}: specialist crafting changed entity counts`);

    const balance=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBalanceState().baseline);
    if(balance.profile!=='vertical-slice-balanced-v1'||balance.player.wornSwordDamage!==24||balance.player.reinforcedSwordDamage!==38||balance.weapons.bowDamage!==18||balance.weapons.staffDamage!==24){
      throw new Error(`${vp.name}: verified balance baseline drifted ${JSON.stringify(balance)}`);
    }

    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getSpecialistCraftingState),{timeout:7000});
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getSpecialistCraftingState());
    if(state.traits.sword!=='swift'||state.traits.bow!=='forceful'||state.traits.staff!=='swift')throw new Error(`${vp.name}: specialist traits did not persist ${JSON.stringify(state.traits)}`);
    if(JSON.stringify(state.entityCounts)!==JSON.stringify(state.baselineEntities))throw new Error(`${vp.name}: persisted specialist state mutated entities`);

    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: specialist crafting caused browser overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Build 31 specialist weapon finishing is material-driven, mutually exclusive, effective and persistent`);
    await context.close();
  }
}finally{await browser.close();}
