import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const viewports=[
  {name:'phone-landscape',width:932,height:430,touch:true},
  {name:'phone-portrait',width:430,height:932,touch:true},
  {name:'desktop',width:1440,height:900,touch:false},
];
const browser=await chromium.launch({headless:true});
const progress={
  contractComplete:true,patrolComplete:true,groveDiscovered:true,grovekeeperDefeated:true,groveCacheClaimed:true,shortcutUnlocked:true,
  reinforcedPickaxe:true,temperedSword:true,briarstringBow:true,moonrootStaff:true,gearVest:true,gearCharm:true,groveRelicOwned:true,wardenBootsOwned:true,
  fenCrossingOpened:true,fenDiscovered:true,fenWardenDefeated:true,fenCacheClaimed:true,stonepinePassOpened:true,stonepineDiscovered:true,stonepineBossDefeated:true,stonepineCacheClaimed:true,
  boardContractsCompleted:3,activeBoardContract:null,
};
async function waitRuntime(page){
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getState&&window.__BRIAR_GLENDebug?.getMarketState&&window.__BRIAR_GLENDebug?.getBuildInfo),{timeout:8000});
  await page.waitForTimeout(250);
}
async function snap(page,vp,name){
  const dir=path.join('test-artifacts/review',vp.name);await mkdir(dir,{recursive:true});
  await page.screenshot({path:path.join(dir,`${name}.png`),fullPage:false});
}
try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    await page.goto(`${target}?reviewCore=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:15000});
    await waitRuntime(page);
    await page.evaluate(()=>localStorage.removeItem('briar-glen-vslice-v1'));
    await page.reload({waitUntil:'domcontentloaded'});await waitRuntime(page);
    const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
    if(build.version!=='30')throw new Error(`${vp.name}: expected Build 30, got ${JSON.stringify(build)}`);
    await snap(page,vp,'01-fresh-hud-and-controls');
    await page.evaluate(p=>{
      const d=window.__BRIAR_GLENDebug;d.setProgress(p);d.setPlayer({coins:685,hp:100,maxHp:125});
      d.setInventory({herb:5,mooncap:4,ore:7,iron:3,hide:6,tusk:1,tonic:3,oil:2,mossglass:2,resin:2,binding:1});
    },progress);
    await page.locator('#inventory-strip').click();await page.waitForFunction(()=>!document.getElementById('inventory-panel')?.hidden,{timeout:4000});
    await snap(page,vp,'02-satchel-equipment-masterwork');await page.locator('#inventory-close').click();
    await page.evaluate(p=>{
      const d=window.__BRIAR_GLENDebug;d.setProgress(p);d.setPlayer({coins:1000});
      d.setInventory({herb:3,mooncap:2,ore:3,iron:2,hide:2,tonic:2,oil:2,mossglass:2,resin:2,binding:1});
      d.teleport(-335,-205);d.interact();d.refreshMarket?.();
    },progress);
    await page.waitForFunction(()=>!document.getElementById('trade-panel')?.hidden,{timeout:4000});
    await snap(page,vp,'03-rowan-market');
    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: core UI capture`);await context.close();
  }
}finally{await browser.close();}
