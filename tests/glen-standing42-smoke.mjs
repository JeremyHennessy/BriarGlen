import { chromium } from 'playwright';
const target=process.argv[2]||'http://127.0.0.1:4173/';const browser=await chromium.launch({headless:true});
try{
  for(const vp of [{name:'phone-landscape',width:932,height:430,touch:true},{name:'phone-portrait',width:430,height:932,touch:true},{name:'desktop',width:1280,height:720,touch:false}]){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch});
    await context.addInitScript(()=>localStorage.removeItem('briar-glen-vslice-v1'));
    const page=await context.newPage();
    await page.goto(`${target}${target.includes('?')?'&':'?'}standing42=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug?.getGlenStandingState,{timeout:7000});
    let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getGlenStandingState());
    if(state.rank!==0||state.title!=='Unknown Apprentice')throw new Error(`${vp.name}: initial standing incorrect ${JSON.stringify(state)}`);
    const baseline=state.entityCounts;

    await page.evaluate(()=>window.__BRIAR_GLENDebug.setProgress({
      boardContractsCompleted:4,
      bossDefeated:true,
      specialistTraits:{sword:'forceful',bow:null,staff:null},
      wardenResponse32:{lastSeenCompleted:4,fulfilled:3,completedBySource:{copper_order:2,field_medicine:1},active:null}
    }));
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.refreshGlenStanding());
    if(state.rank!==4||state.title!=='Briar Glen Mainstay'||state.knownFor!=='Specialist supply work')throw new Error(`${vp.name}: derived standing incorrect ${JSON.stringify(state)}`);

    await page.evaluate(()=>window.__BRIAR_GLENDebug.openJournal());
    await page.waitForTimeout(100);
    const rows=await page.locator('#journal35-economy [data-glen-standing]').count();
    const text=await page.locator('#journal35-economy').textContent();
    if(rows!==3||!text.includes('Briar Glen Mainstay')||!text.includes('Specialist supply work'))throw new Error(`${vp.name}: Journal standing missing ${text}`);

    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(320,40));
    await page.waitForTimeout(160);
    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(-720,30));
    await page.waitForTimeout(240);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getGlenStandingState());
    if(state.homecomings<1||state.lastAnnouncedRank!==4)throw new Error(`${vp.name}: homecoming recognition did not record ${JSON.stringify(state)}`);
    if(JSON.stringify(state.entityCounts)!==JSON.stringify(baseline))throw new Error(`${vp.name}: standing layer changed gameplay entities`);

    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug?.getGlenStandingState,{timeout:7000});
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getGlenStandingState());
    if(state.rank!==4||state.lastAnnouncedRank!==4||state.homecomings<1)throw new Error(`${vp.name}: standing persistence failed ${JSON.stringify(state)}`);
    console.log(`PASS ${vp.name}: deeds derive standing + Journal identity + homecoming recognition + persistence`);
    await context.close();
  }
}finally{await browser.close()}