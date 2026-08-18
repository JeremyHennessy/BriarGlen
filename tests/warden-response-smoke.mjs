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
    await context.addInitScript(()=>localStorage.removeItem('briar-glen-vslice-v1'));
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    await page.goto(`${target}${target.includes('?')?'&':'?'}build32=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getWardenResponseState&&window.__BRIAR_GLENDebug?.getSpecialistCraftingState),{timeout:7000});

    const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
    if(build.version!=='32'||build.label!=='Warden Response')throw new Error(`${vp.name}: incorrect Build 32 metadata ${JSON.stringify(build)}`);

    await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      d.setProgress({fenDiscovered:true,fenCacheClaimed:true});
      d.setInventory({ore:3});
    });
    const before=await page.evaluate(()=>window.__BRIAR_GLENDebug.getWardenResponseState());
    if(!before.board.offers.includes('copper_order'))throw new Error(`${vp.name}: Copper Order unavailable ${JSON.stringify(before.board)}`);
    const accepted=await page.evaluate(()=>window.__BRIAR_GLENDebug.acceptBoardContract('copper_order'));
    if(!accepted)throw new Error(`${vp.name}: failed to accept Copper Order`);
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getBoardState().active?.id==='copper_order',{timeout:3000});
    await page.waitForTimeout(140);
    const turned=await page.evaluate(()=>window.__BRIAR_GLENDebug.turnInBoardContract());
    if(!turned)throw new Error(`${vp.name}: failed to turn in Copper Order`);
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getWardenResponseState().active?.sourceId==='copper_order',{timeout:3000});

    let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getWardenResponseState());
    if(state.active.key!=='hollow_tool_parcel'||state.active.done||state.active.reward.iron!==1||state.active.reward.coins!==95){
      throw new Error(`${vp.name}: wrong Rowan response order ${JSON.stringify(state.active)}`);
    }
    if(JSON.stringify(state.entityCounts)!==JSON.stringify(state.baselineEntities))throw new Error(`${vp.name}: response layer mutated entities`);

    await page.evaluate(()=>window.__BRIAR_GLENDebug.setInventory({oil:1,ore:2,hide:1,iron:0}));
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getWardenResponseState());
    if(!state.active.ready)throw new Error(`${vp.name}: crafted response order did not become ready ${JSON.stringify(state)}`);
    const coinsBefore=state.coins;
    const fulfilled=await page.evaluate(()=>window.__BRIAR_GLENDebug.turnInWardenResponseOrder());
    if(!fulfilled)throw new Error(`${vp.name}: failed to fulfill Rowan response order`);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getWardenResponseState());
    if(!state.active.done||state.fulfilled!==1||state.coins!==coinsBefore+95||state.inventory.iron!==1||state.inventory.oil!==0||state.inventory.ore!==0||state.inventory.hide!==0){
      throw new Error(`${vp.name}: response rewards/material consumption incorrect ${JSON.stringify(state)}`);
    }

    const section=page.locator('#warden-response32');
    if(!(await section.isVisible())){
      await page.evaluate(()=>window.__BRIAR_GLENDebug.openTrade?.());
      await page.waitForTimeout(100);
    }
    if(!(await page.locator('#warden-response32').count()))throw new Error(`${vp.name}: Rowan response UI section missing`);

    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getWardenResponseState),{timeout:7000});
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getWardenResponseState());
    if(!state.active?.done||state.active.sourceId!=='copper_order'||state.fulfilled!==1)throw new Error(`${vp.name}: response order persistence failed ${JSON.stringify(state)}`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Board job -> Rowan response -> crafted supplies -> specialist material loop persistent`);
    await context.close();
  }
}finally{await browser.close();}
