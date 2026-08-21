import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const viewports=[
  {name:'phone-landscape',width:932,height:430,touch:true},
  {name:'phone-portrait',width:430,height:932,touch:true},
  {name:'desktop',width:1440,height:900,touch:false},
];
const out=path.resolve('test-artifacts/ui-shell-preview');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});

const css=String.raw`
html.satchel-preview #inventory-backdrop{background:rgba(10,18,13,.62)!important;backdrop-filter:blur(2px)}
html.satchel-preview #inventory-panel{position:fixed!important;left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;width:min(820px,calc(100vw - 24px))!important;height:min(570px,calc(100vh - 24px))!important;max-height:none!important;margin:0!important;padding:14px!important;display:grid!important;grid-template-columns:210px 1fr;grid-template-rows:auto auto 1fr auto;gap:10px 12px;overflow:hidden!important;border:1px solid rgba(226,204,150,.42)!important;border-radius:16px!important;background:linear-gradient(145deg,rgba(37,52,39,.985),rgba(18,30,23,.99))!important;box-shadow:0 24px 70px rgba(0,0,0,.48)!important}
html.satchel-preview .inventory-header{grid-column:1/3;display:flex!important;align-items:flex-start!important;padding:0 2px 8px!important;border-bottom:1px solid rgba(224,203,153,.16)}
html.satchel-preview .inventory-header h2{margin:2px 0!important;font-size:22px!important}
html.satchel-preview .inventory-header p{margin:0!important;font-size:10px!important;color:#aeb9a9!important}
html.satchel-preview .satchel-preview-tabs{grid-column:1/3;display:flex;gap:6px;padding:0 1px}
html.satchel-preview .satchel-preview-tab{padding:7px 12px;border:1px solid rgba(219,197,145,.18);border-radius:8px;background:rgba(69,86,62,.28);font:800 8px/1 system-ui,sans-serif;letter-spacing:.08em;color:#aebba8;text-transform:uppercase}
html.satchel-preview .satchel-preview-tab.active{color:#f0dfb2;border-color:rgba(224,197,130,.48);background:linear-gradient(160deg,rgba(119,99,56,.52),rgba(64,74,49,.5))}
html.satchel-preview .satchel-preview-character{grid-column:1;grid-row:3;min-height:0;border:1px solid rgba(218,199,153,.15);border-radius:12px;background:radial-gradient(circle at 50% 30%,rgba(183,157,95,.12),transparent 35%),rgba(19,31,23,.38);padding:10px;display:grid;grid-template-rows:auto 1fr auto;gap:8px}
html.satchel-preview .satchel-preview-character .name{text-align:center;font:700 12px/1 Georgia,serif;color:#eadbb7}
html.satchel-preview .satchel-preview-doll{position:relative;min-height:150px;display:grid;place-items:center}
html.satchel-preview .satchel-preview-body{width:58px;height:118px;position:relative}
html.satchel-preview .satchel-preview-body:before{content:'';position:absolute;left:18px;top:6px;width:24px;height:24px;border-radius:50%;background:#b99270;border:2px solid #3c3028}
html.satchel-preview .satchel-preview-body:after{content:'';position:absolute;left:9px;top:30px;width:42px;height:72px;border-radius:15px 15px 10px 10px;background:linear-gradient(#647d58,#344b3b);border:2px solid #28392f;box-shadow:inset 0 -18px rgba(69,54,42,.55)}
html.satchel-preview .equip-slot{position:absolute;width:60px;min-height:37px;padding:5px;border:1px solid rgba(223,203,154,.18);border-radius:8px;background:rgba(47,67,49,.55);font:700 7px/1.12 system-ui,sans-serif;color:#d7cfb5;text-align:center;display:grid;place-items:center}
html.satchel-preview .equip-slot small{font-size:6px;color:#9fb19d;font-weight:600}
html.satchel-preview .equip-slot.weapon{left:0;top:12px}.satchel-preview .equip-slot.armor{right:0;top:12px}
html.satchel-preview .equip-slot.charm{left:0;bottom:10px}.satchel-preview .equip-slot.boots{right:0;bottom:10px}
html.satchel-preview .satchel-preview-stats{display:grid;grid-template-columns:1fr 1fr;gap:5px;font-size:7px;color:#b9c4b4}
html.satchel-preview .satchel-preview-stats span{padding:5px 6px;border-radius:7px;background:rgba(19,30,23,.55);display:flex;justify-content:space-between}
html.satchel-preview .inventory-grid{grid-column:2;grid-row:3;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:7px!important;overflow:auto!important;align-content:start;padding:0 2px 4px 0!important}
html.satchel-preview .inventory-item{min-height:78px!important;padding:8px!important;display:grid!important;grid-template-columns:1fr auto!important;grid-template-rows:30px auto!important;gap:3px!important;border:1px solid rgba(221,202,156,.15)!important;border-radius:10px!important;background:linear-gradient(155deg,rgba(77,94,68,.42),rgba(32,49,37,.5))!important}
html.satchel-preview .inventory-item .item-icon{grid-column:1;grid-row:1;font-size:20px!important;align-self:center}
html.satchel-preview .inventory-item>span:nth-child(2){grid-column:1/3;grid-row:2;min-width:0}
html.satchel-preview .inventory-item strong{font-size:8px!important;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
html.satchel-preview .inventory-item small{font-size:6px!important;display:block;color:#9fb09d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
html.satchel-preview .inventory-item>b{grid-column:2;grid-row:1;font-size:13px!important;color:#ead7a3}
html.satchel-preview .gear-card,html.satchel-preview .crafting-status,html.satchel-preview .recipe-card{display:none!important}
html.satchel-preview .inventory-actions{grid-column:1/3;grid-row:4;display:flex!important;gap:8px!important;justify-content:flex-end;border-top:1px solid rgba(224,203,153,.14);padding-top:9px!important}
html.satchel-preview .inventory-actions button{min-height:34px!important;padding:7px 12px!important;font-size:8px!important;border-radius:8px!important}
@media(max-height:500px) and (min-width:700px){
 html.satchel-preview #inventory-panel{height:calc(100vh - 18px)!important;width:min(850px,calc(100vw - 18px))!important;padding:10px!important;grid-template-columns:188px 1fr;gap:7px 10px}
 html.satchel-preview .inventory-header{padding-bottom:5px!important}.satchel-preview .inventory-header h2{font-size:17px!important}.satchel-preview .inventory-header p{display:none}
 html.satchel-preview .satchel-preview-tab{padding:5px 9px}.satchel-preview .satchel-preview-doll{min-height:115px}.satchel-preview .satchel-preview-body{transform:scale(.8)}
 html.satchel-preview .equip-slot{width:54px;min-height:31px;font-size:6px}.satchel-preview .inventory-item{min-height:61px!important;padding:6px!important}.satchel-preview .inventory-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}
 html.satchel-preview .inventory-actions{padding-top:5px!important}.satchel-preview .inventory-actions button{min-height:29px!important;padding:5px 9px!important}
}
@media(max-width:520px){
 html.satchel-preview #inventory-panel{width:calc(100vw - 18px)!important;height:calc(100vh - 22px)!important;grid-template-columns:1fr;grid-template-rows:auto auto 205px 1fr auto;gap:8px;padding:10px!important;overflow:hidden!important}
 html.satchel-preview .inventory-header,html.satchel-preview .satchel-preview-tabs,html.satchel-preview .inventory-actions{grid-column:1}
 html.satchel-preview .inventory-header{grid-row:1}.satchel-preview .satchel-preview-tabs{grid-row:2;overflow-x:auto}.satchel-preview .satchel-preview-tab{flex:1;padding:7px 5px;text-align:center}
 html.satchel-preview .satchel-preview-character{grid-column:1;grid-row:3;grid-template-columns:90px 1fr;grid-template-rows:auto 1fr;padding:8px}.satchel-preview .satchel-preview-character .name{grid-column:1/3}.satchel-preview .satchel-preview-doll{min-height:160px}.satchel-preview .satchel-preview-stats{align-content:center}
 html.satchel-preview .inventory-grid{grid-column:1;grid-row:4;grid-template-columns:repeat(3,minmax(0,1fr))!important;min-height:0}.satchel-preview .inventory-item{min-height:68px!important}
 html.satchel-preview .inventory-actions{grid-row:5;justify-content:stretch}.satchel-preview .inventory-actions button{flex:1}
}
`;

function installCharacterPreview(){
  document.documentElement.classList.add('satchel-preview');
  const panel=document.getElementById('inventory-panel');
  const grid=panel?.querySelector('.inventory-grid');
  if(!panel||!grid)return;
  if(!panel.querySelector('.satchel-preview-tabs')){
    const tabs=document.createElement('nav');
    tabs.className='satchel-preview-tabs';
    tabs.innerHTML='<span class="satchel-preview-tab active">Materials</span><span class="satchel-preview-tab">Equipment</span><span class="satchel-preview-tab">Recipes</span><span class="satchel-preview-tab">Quest Items</span>';
    panel.querySelector('.inventory-header')?.after(tabs);
  }
  if(!panel.querySelector('.satchel-preview-character')){
    const character=document.createElement('aside');
    character.className='satchel-preview-character';
    character.innerHTML=`<div class="name">Briar Warden</div><div class="satchel-preview-doll"><div class="equip-slot weapon">Tempered Sword<small>Weapon</small></div><div class="equip-slot armor">Copperguard Vest<small>Armor</small></div><div class="satchel-preview-body"></div><div class="equip-slot charm">Grovekeeper Thorn<small>Charm</small></div><div class="equip-slot boots">Warden Trail Boots<small>Boots</small></div></div><div class="satchel-preview-stats"><span>Health <b>125</b></span><span>Move <b>274</b></span><span>Power <b>45</b></span><span>Coins <b>420</b></span></div>`;
    grid.before(character);
  }
}

try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    const page=await context.newPage();
    await page.goto(`${target}?satchelPreview=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.toggleInventory&&window.__BRIAR_GLENDebug?.getBuildInfo),{timeout:7000});
    await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      d.setInventory({herb:8,mooncap:5,ore:11,iron:4,hide:7,tusk:1,tonic:3,oil:2,binding:1,mossglass:3,resin:4});
      d.setProgress({gearVest:true,gearCharm:true,groveRelicOwned:true,groveRelicEquipped:true,wardenBootsOwned:true,wardenBootsEquipped:true,reinforcedPickaxe:true,temperedSword:true,briarstringBow:true,moonrootStaff:true});
      d.toggleInventory(true);
    });
    await page.addStyleTag({content:css});
    await page.evaluate(installCharacterPreview);
    await page.waitForTimeout(350);
    const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
    if(build.version!=='30')throw new Error(`${vp.name}: Satchel preview must run on untouched Build 30`);
    if(!(await page.locator('#inventory-panel').isVisible()))throw new Error(`${vp.name}: Satchel panel not visible`);
    const box=await page.locator('#inventory-panel').boundingBox();
    if(!box||box.x<-2||box.y<-2||box.x+box.width>vp.width+2||box.y+box.height>vp.height+2)throw new Error(`${vp.name}: Satchel prototype outside viewport ${JSON.stringify(box)}`);
    await page.screenshot({path:path.join(out,`${vp.name}-satchel-character.png`),fullPage:false});
    console.log(`PASS ${vp.name}: reversible Satchel/character prototype captured over Build 30`);
    await context.close();
  }
}finally{await browser.close();}
