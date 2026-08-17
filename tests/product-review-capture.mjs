import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const root=path.resolve('test-artifacts/product-review');
fs.mkdirSync(root,{recursive:true});
const viewports=[
  {name:'phone-landscape',width:932,height:430,touch:true},
  {name:'phone-portrait',width:430,height:932,touch:true},
  {name:'desktop',width:1440,height:900,touch:false},
];
const manifest=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});

function urlWith(key,value,extra=''){
  const sep=target.includes('?')?'&':'?';
  return `${target}${sep}${key}=${encodeURIComponent(value)}${extra}`;
}

async function shot(page,vp,name,description){
  const dir=path.join(root,vp.name); fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,`${name}.png`);
  await page.screenshot({path:file,fullPage:false});
  manifest.push({viewport:vp.name,file:`${vp.name}/${name}.png`,description});
}

async function loadAudit(page,vp){
  await page.goto(urlWith('productReview',`${Date.now()}-${vp.name}`),{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getBuildInfo&&window.__BRIAR_GLENDebug?.getAuthoredArtState),{timeout:8000});
  await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getAuthoredArtState();return s.ready||s.failed;},{timeout:9000});
  const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
  if(build.version!=='30') throw new Error(`${vp.name}: product audit expected verified Build 30, got ${JSON.stringify(build)}`);
}

async function setFullState(page){
  await page.evaluate(()=>{
    const d=window.__BRIAR_GLENDebug;
    d.setProgress({
      step:5,
      contractComplete:true,
      patrolComplete:true,
      bossDefeated:true,
      shortcutUnlocked:true,
      groveDiscovered:true,
      grovekeeperDefeated:true,
      groveCacheClaimed:true,
      reinforcedPickaxe:true,
      temperedSword:true,
      briarstringBow:true,
      moonrootStaff:true,
      gearVest:true,
      gearCharm:true,
      groveRelicOwned:true,
      wardenBootsOwned:true,
      fenDiscovered:true,
      fenCrossingOpened:true,
      fenWardenDefeated:true,
      fenCacheClaimed:true,
      stonepinePassOpened:true,
      stonepineDiscovered:true,
      stonepineBossDefeated:true,
      stonepineCacheClaimed:false,
      boardContractsCompleted:2,
      boardContractCounts:{copper_order:1,briar_cull:1},
      activeBoardContract:null,
    });
    d.setPlayer({reinforced:true,coins:1000,hp:100,maxHp:125,invuln:0});
    d.setInventory({
      herb:7,mooncap:4,ore:8,iron:5,hide:6,tusk:1,tonic:3,oil:2,mossglass:3,resin:4,binding:1,
    });
  });
  await sleep(180);
}

async function teleportShot(page,vp,x,y,name,description){
  await page.evaluate(([x,y])=>window.__BRIAR_GLENDebug.teleport(x,y),[x,y]);
  await sleep(420);
  await shot(page,vp,name,description);
}

async function closeVisiblePanels(page){
  await page.evaluate(()=>{
    const ids=['inventory-panel','trade-panel','craft-panel','board2-panel','warden-overlay'];
    for(const id of ids){const el=document.getElementById(id);if(el&&!el.hidden){
      if(id==='warden-overlay'&&window.__BRIAR_GLENDebug?.closeWardenBook)window.__BRIAR_GLENDebug.closeWardenBook();
      else el.hidden=true;
    }}
    for(const id of ['inventory-backdrop','trade-backdrop','craft-backdrop','board2-backdrop','warden-overlay-backdrop']){const el=document.getElementById(id);if(el)el.hidden=true;}
  });
  await sleep(100);
}

async function scrollPanel(page,selector,bottom=false){
  await page.evaluate(({selector,bottom})=>{
    const el=document.querySelector(selector); if(!el)return;
    el.scrollTop=bottom?el.scrollHeight:0;
    for(const child of el.querySelectorAll('*')){
      const s=getComputedStyle(child);
      if((s.overflowY==='auto'||s.overflowY==='scroll')&&child.scrollHeight>child.clientHeight+5)child.scrollTop=bottom?child.scrollHeight:0;
    }
  },{selector,bottom});
  await sleep(120);
}

async function captureOnboarding(vp){
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
  await context.addInitScript(()=>{
    localStorage.removeItem('briar-glen-vslice-v1');
    localStorage.removeItem('briar-glen-onboarding-v1');
    localStorage.removeItem('briar-glen-run-metrics-v1');
    localStorage.removeItem('briar-glen-vertical-slice-complete-v1');
    sessionStorage.removeItem('briar-glen-start-intent');
  });
  const page=await context.newPage();
  await page.goto(urlWith('onboarding','1',`&audit=${Date.now()}-${vp.name}`),{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getOnboardingState),{timeout:8000});
  await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().startOpen===true,{timeout:5000});
  await shot(page,vp,'00-start-screen','Fresh-game title/start screen with New Game, Continue and sound controls.');

  await page.locator('#onboarding21-new').click({noWaitAfter:true});
  await page.waitForFunction(()=>window.__BRIAR_GLENDebug?.getOnboardingState?.().guide?.stage==='move',{timeout:7000});
  await shot(page,vp,'01-onboarding-movement','First-session movement lesson with progressive control reveal.');

  await page.keyboard.down('KeyD');
  try{await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().guide.stage==='gather',{timeout:3500});}
  finally{await page.keyboard.up('KeyD');}
  await shot(page,vp,'02-onboarding-gather','Gathering lesson after movement completion; USE/interact control revealed.');

  await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setInventory({herb:3});d.setProgress({step:1});});
  await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().guide.stage==='combat',{timeout:2500});
  await shot(page,vp,'03-onboarding-combat','First combat lesson with ATTACK revealed.');
  await context.close();
}

async function captureEstablished(vp){
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
  const page=await context.newPage();
  await loadAudit(page,vp);
  await setFullState(page);

  // Core world / region identity.
  await teleportShot(page,vp,-585,-250,'10-briar-glen-hub','Briar Glen authored hub presentation and core HUD.');
  await teleportShot(page,vp,240,0,'11-meadow-road','Meadow Road gathering/combat space.');
  await teleportShot(page,vp,1030,0,'12-copper-hollow','Copper Hollow mining/quarry presentation.');
  await teleportShot(page,vp,1850,0,'13-emberback-den','Emberback Den boss-space presentation.');
  await teleportShot(page,vp,520,-700,'14-mooncap-grove','Mooncap Grove cooler woodland presentation.');
  await teleportShot(page,vp,1540,-1760,'15-mosswater-fen','Mosswater Fen / Old Warden Crossing presentation.');
  await teleportShot(page,vp,2550,-1410,'16-stonepine-reach','Stonepine Reach highland/quarry presentation.');
  await teleportShot(page,vp,2070,115,'17-rootway-home','Rootway return/shortcut presentation.');

  // Weapon / action HUD states.
  await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(240,0)); await sleep(250);
  await page.keyboard.press('Digit1'); await sleep(150); await shot(page,vp,'20-weapon-sword','Sword HUD state: Cleave, dodge, attack and interaction controls.');
  await page.keyboard.press('Digit2'); await sleep(150); await shot(page,vp,'21-weapon-bow','Bow HUD state: Pierce and ranged weapon presentation.');
  await page.keyboard.press('Digit3'); await sleep(150); await shot(page,vp,'22-weapon-staff','Staff HUD state: Root and staff weapon presentation.');

  // Satchel and equipment.
  await page.locator('#inventory-strip').click();
  await page.waitForFunction(()=>!document.getElementById('inventory-panel').hidden,{timeout:3000});
  await scrollPanel(page,'#inventory-panel',false); await shot(page,vp,'30-satchel-top','Satchel: materials, consumables and equipment record.');
  await scrollPanel(page,'#inventory-panel',true); await shot(page,vp,'31-satchel-bottom','Satchel lower content: progression, recipes and consumable actions.');
  await page.locator('#inventory-close').click();

  // Masterwork forge.
  await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.teleport(-470,255);d.interact();});
  await page.waitForFunction(()=>!document.getElementById('craft-panel').hidden,{timeout:3000});
  await scrollPanel(page,'#craft-panel',false); await shot(page,vp,'32-masterwork-forge-top','Alden Masterwork Forge: materials and top crafting recipes.');
  await scrollPanel(page,'#craft-panel',true); await shot(page,vp,'33-masterwork-forge-bottom','Alden Masterwork Forge: full masterwork/consumable recipe set.');
  await page.locator('#craft-close').click();

  // Rowan economy.
  await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setProgress({boardContractsCompleted:2});d.teleport(-335,-205);d.interact();d.refreshMarket();});
  await page.waitForFunction(()=>!document.getElementById('trade-panel').hidden,{timeout:3000});
  await scrollPanel(page,'#trade-panel',false); await shot(page,vp,'34-rowan-market-top','Rowan rotating market: stock, currency and current rotation.');
  await scrollPanel(page,'#trade-panel',true); await shot(page,vp,'35-rowan-market-bottom','Rowan market lower content: services and commission economy.');
  await page.locator('#trade-close').click();

  // Contract Board 2.0.
  await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setProgress({activeBoardContract:null,boardContractsCompleted:0,boardContractCounts:{}});d.teleport(-615,-118);d.interact();});
  await page.waitForFunction(()=>!document.getElementById('board2-panel').hidden,{timeout:3000});
  await scrollPanel(page,'#board2-panel',false); await shot(page,vp,'36-contract-board','Contract Board 2.0 with three active choices and reward information.');
  await scrollPanel(page,'#board2-panel',true); await shot(page,vp,'37-contract-board-bottom','Contract Board lower/scroll state where applicable.');
  if(await page.locator('#board2-close').count())await page.locator('#board2-close').click(); else await closeVisiblePanels(page);

  // Discovery map and Warden Journal.
  await page.evaluate(()=>{
    const d=window.__BRIAR_GLENDebug;
    d.setProgress({
      groveDiscovered:true,shortcutUnlocked:true,fenDiscovered:true,fenCrossingOpened:true,fenWardenDefeated:true,fenCacheClaimed:true,
      stonepinePassOpened:true,stonepineDiscovered:true,stonepineBossDefeated:true,stonepineCacheClaimed:false,
      boardContractsCompleted:3,contractComplete:true,patrolComplete:true,grovekeeperDefeated:true,groveCacheClaimed:true,
      reinforcedPickaxe:true,temperedSword:true,briarstringBow:true,moonrootStaff:true,gearVest:true,gearCharm:true,groveRelicOwned:true,wardenBootsOwned:true,
    });
    d.openMap();
  });
  await page.waitForFunction(()=>!document.getElementById('warden-overlay').hidden,{timeout:3000});
  await shot(page,vp,'38-warden-map','Discovery map with regional markers, current route and exploration progress.');
  await page.evaluate(()=>window.__BRIAR_GLENDebug.openJournal());
  await sleep(160);
  await scrollPanel(page,'#warden-overlay',false); await shot(page,vp,'39-warden-journal-top','Warden Journal: current objective, places and milestones.');
  await scrollPanel(page,'#warden-overlay',true); await shot(page,vp,'40-warden-journal-bottom','Warden Journal lower records: recipes, gear and extended notes.');
  await page.evaluate(()=>window.__BRIAR_GLENDebug.closeWardenBook());

  // Moment-to-moment presentation feedback.
  const areaBefore=await page.evaluate(()=>window.__BRIAR_GLENDebug.getFinalPolishState().areaShows);
  await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(1050,20));
  await page.waitForFunction(before=>window.__BRIAR_GLENDebug.getFinalPolishState().areaShows>before,areaBefore,{timeout:3000});
  await shot(page,vp,'41-area-title','Area-entry title treatment for Copper Hollow.');

  await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setProgress({fenCrossingOpened:true,fenDiscovered:true,fenWardenDefeated:true,fenCacheClaimed:true,stonepinePassOpened:true,stonepineDiscovered:true,stonepineBossDefeated:false,stonepineCacheClaimed:false});d.setInventory({resin:0});d.teleport(2485,-1335);});
  await sleep(220); const pickupBefore=await page.evaluate(()=>window.__BRIAR_GLENDebug.getFinalPolishState().pickupShows);
  await page.evaluate(()=>window.__BRIAR_GLENDebug.interact());
  await page.waitForFunction(before=>window.__BRIAR_GLENDebug.getFinalPolishState().pickupShows>before,pickupBefore,{timeout:3000});
  await shot(page,vp,'42-pickup-feedback','Resource pickup ribbon / interaction feedback.');

  // Representative boss / named encounters.
  await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setThreat('boss',{hp:320,dead:false,x:1900,y:0,hurt:0});d.teleport(1690,0);});
  await sleep(380); await shot(page,vp,'43-emberback-combat','Emberback named boss combat presentation and telegraph space.');
  await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setThreat('fenwarden',{hp:260,dead:false,x:1450,y:-1760,hurt:0});d.teleport(1660,-1760);});
  await sleep(380); await shot(page,vp,'44-drowned-warden-combat','Drowned Warden named encounter presentation in Mosswater Fen.');
  await page.evaluate(()=>{
    const d=window.__BRIAR_GLENDebug;
    d.setThreat('quarrysentinel',{hp:290,dead:false,hurt:0});
    const s=d.getStonepineState(); const e=s.enemies.find(v=>v.type==='quarrysentinel');
    if(e)d.teleport(e.x-170,e.y); else d.teleport(3100,-1760);
  });
  await sleep(380); await shot(page,vp,'45-quarry-sentinel-combat','Quarry Sentinel named encounter presentation in Stonepine.');

  // Final completion end-cap.
  await closeVisiblePanels(page);
  await page.evaluate(()=>{
    localStorage.removeItem('briar-glen-vertical-slice-complete-v1');
    const d=window.__BRIAR_GLENDebug;
    d.setProgress({stonepinePassOpened:true,stonepineDiscovered:true,stonepineBossDefeated:true,stonepineCacheClaimed:false});
    d.teleport(3255,-1900);
  });
  await sleep(180); await page.evaluate(()=>window.__BRIAR_GLENDebug.interact());
  await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getFinalPolishState().completionOpen===true,{timeout:3500});
  await shot(page,vp,'50-vertical-slice-complete','Vertical Slice Complete end-cap and return-to-town messaging.');

  await context.close();
}

try{
  for(const vp of viewports){
    await captureOnboarding(vp);
    await captureEstablished(vp);
  }
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({
    generatedAt:new Date().toISOString(),
    baseline:'Build 30 production / 69fe5815f9a569c2ca4a5b4c498a5368d49878fe',
    screenshots:manifest,
  },null,2));
  console.log(`PASS product review capture: ${manifest.length} screenshots`);
}finally{
  await browser.close();
}
