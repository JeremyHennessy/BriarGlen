import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const viewports=[{name:'phone-landscape',width:932,height:430,touch:true},{name:'phone-portrait',width:430,height:932,touch:true},{name:'desktop',width:1440,height:900,touch:false}];
const browser=await chromium.launch({headless:true});
const inside=(box,vp)=>box&&box.x>=-2&&box.y>=-2&&box.x+box.width<=vp.width+2&&box.y+box.height<=vp.height+2;
try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    await context.addInitScript(()=>{localStorage.removeItem('briar-glen-vslice-v1');localStorage.setItem('briar-glen-onboarding-v1',JSON.stringify({started:true,skipped:true,complete:true,stage:'done'}));});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${target}${target.includes('?')?'&':'?'}build33=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug?.getHudNotificationState?.().cssLoaded,{timeout:7000});
    const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
    if(Number.parseFloat(build.version)<33||build.saveKey!=='briar-glen-vslice-v1'||build.schema!==1||build.runtime!=='canonical-manifest-hooks-v1')throw new Error(`${vp.name}: wrong Build 33+ metadata ${JSON.stringify(build)}`);
    for(const selector of ['.hud33-avatar','#hud33-combat','#hud33-weapon','#hud33-skill','#hud33-notification'])if(await page.locator(selector).count()!==1)throw new Error(`${vp.name}: missing ${selector}`);
    for(const selector of ['.hud33-status','.hud33-objective','#hud33-combat'])if(!inside(await page.locator(selector).boundingBox(),vp))throw new Error(`${vp.name}: ${selector} outside viewport`);
    if(vp.width>520){
      const [map,bag,combat]=await Promise.all(['#warden-map-btn','#inventory-strip','#hud33-combat'].map(selector=>page.locator(selector).boundingBox()));
      const overlaps=(a,b)=>a&&b&&a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
      if(overlaps(map,bag)||overlaps(map,combat))throw new Error(`${vp.name}: Map overlaps centered HUD controls`);
    }
    const entities=await page.evaluate(()=>window.__BRIAR_GLENDebug.getHudNotificationState().entityCounts);
    await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.enqueueNotification33('first toast','toast',{duration:600});d.enqueueNotification33('priority area','area',{duration:600});d.enqueueNotification33('pickup item','pickup',{duration:600});});
    await page.waitForFunction(()=>!document.getElementById('hud33-notification').hidden);
    if(await page.locator('#hud33-notification').count()!==1)throw new Error(`${vp.name}: notification presentation duplicated`);
    await page.waitForFunction(()=>document.getElementById('hud33-notification').textContent==='priority area',null,{timeout:3000});
    await page.waitForFunction(()=>document.getElementById('hud33-notification').textContent==='pickup item',null,{timeout:3000});
    await page.evaluate(()=>{window.__BRIAR_GLENDebug.selectWeapon('bow');window.__BRIAR_GLENDebug.useSkill();});
    await page.waitForFunction(()=>document.querySelector('#hud33-skill')?.dataset.weapon==='bow'&&document.querySelector('#hud33-skill')?.dataset.ready==='false');
    const copy=await page.locator('#hud33-skill small').textContent();if(!copy.includes('Pierce'))throw new Error(`${vp.name}: skill readout wrong ${copy}`);
    const after=await page.evaluate(()=>window.__BRIAR_GLENDebug.getHudNotificationState().entityCounts);if(JSON.stringify(after)!==JSON.stringify(entities))throw new Error(`${vp.name}: HUD mutated world entities`);
    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors ${errors.join('; ')}`);
    console.log(`PASS ${vp.name}: compact HUD + weapon/skill readiness + single priority notification queue active`);await context.close();
  }
}finally{await browser.close();}
