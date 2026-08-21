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
html.warden-book-preview #warden-overlay-backdrop{background:rgba(8,15,11,.63)!important;backdrop-filter:blur(2px)}
html.warden-book-preview #warden-overlay{position:fixed!important;left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;width:min(940px,calc(100vw - 24px))!important;height:min(620px,calc(100vh - 24px))!important;max-height:none!important;padding:14px!important;overflow:hidden!important;border-radius:16px!important;border:1px solid rgba(225,202,146,.4)!important;background:linear-gradient(145deg,rgba(39,53,40,.99),rgba(19,31,24,.99))!important;box-shadow:0 24px 72px rgba(0,0,0,.5)!important}
html.warden-book-preview .warden-overlay-header{height:54px!important;display:flex!important;align-items:flex-start!important;justify-content:space-between!important;padding:0 2px 9px!important;border-bottom:1px solid rgba(222,200,150,.16)}
html.warden-book-preview .warden-overlay-header h2{font-size:21px!important;margin:2px 0 0!important}
html.warden-book-preview .warden-overlay-actions{display:flex!important;gap:6px!important;align-items:center!important}
html.warden-book-preview .warden-tab{min-width:82px!important;height:32px!important;border-radius:8px!important;border:1px solid rgba(222,201,151,.2)!important;background:rgba(66,84,61,.42)!important;font-size:8px!important;letter-spacing:.09em!important}
html.warden-book-preview .warden-tab.active{border-color:rgba(228,201,132,.55)!important;background:linear-gradient(155deg,rgba(119,98,57,.58),rgba(60,75,51,.62))!important;color:#f1dfae!important}
html.warden-book-preview .warden-close{width:32px!important;height:32px!important;border-radius:8px!important}
html.warden-book-preview #warden-map-view{height:calc(100% - 64px)!important;display:grid!important;grid-template-columns:minmax(0,1fr) 210px!important;gap:12px!important;padding-top:10px!important}
html.warden-book-preview .map-frame{position:relative!important;min-width:0!important;min-height:0!important;border-radius:13px!important;border:1px solid rgba(112,88,52,.52)!important;background:linear-gradient(140deg,#d8ca9e,#b7a577)!important;box-shadow:inset 0 0 0 4px rgba(77,58,34,.13)!important;overflow:hidden!important;padding:8px!important}
html.warden-book-preview #warden-map-svg{width:100%!important;height:100%!important;display:block!important;filter:saturate(.78) sepia(.08) contrast(.98)!important}
html.warden-book-preview .map-marker circle{stroke-width:3!important;filter:drop-shadow(0 2px 2px rgba(42,33,23,.22))}
html.warden-book-preview .marker-label{font-weight:800!important;letter-spacing:.035em!important}
html.warden-book-preview .map-legend{position:absolute!important;left:14px!important;bottom:12px!important;display:flex!important;gap:10px!important;padding:6px 9px!important;border-radius:8px!important;background:rgba(66,54,37,.74)!important;color:#efe2bb!important;font-size:7px!important}
html.warden-book-preview .map-sidecard{border:1px solid rgba(222,200,151,.16)!important;border-radius:12px!important;background:rgba(23,37,28,.62)!important;padding:13px!important;display:flex!important;flex-direction:column!important;gap:7px!important}
html.warden-book-preview .map-sidecard:before{content:'WARDEN SURVEY';font:800 7px/1 system-ui,sans-serif;letter-spacing:.16em;color:#aeb99f}
html.warden-book-preview #map-current-zone{font:700 17px/1.08 Georgia,serif!important;color:#eddcb5!important}
html.warden-book-preview #map-current-objective{font-size:9px!important;line-height:1.35!important;color:#bbc6b6!important;margin:2px 0!important}
html.warden-book-preview #map-discovery-count{margin-top:auto!important;padding-top:9px!important;border-top:1px solid rgba(223,201,150,.12)!important;font-size:8px!important;color:#d8c88e!important}
html.warden-book-preview #warden-journal-view{height:calc(100% - 64px)!important;padding-top:10px!important;overflow:hidden!important}
html.warden-book-preview .journal-columns{height:100%!important;display:grid!important;grid-template-columns:1.12fr 1fr 1fr!important;grid-template-rows:1fr 1fr!important;gap:9px!important;overflow:auto!important;padding-right:2px!important}
html.warden-book-preview .journal-card{min-height:0!important;overflow:auto!important;border:1px solid rgba(220,200,153,.16)!important;border-radius:11px!important;background:linear-gradient(155deg,rgba(65,82,60,.34),rgba(28,44,33,.46))!important;padding:11px!important}
html.warden-book-preview .journal-card.current{grid-row:1/3!important;background:linear-gradient(150deg,rgba(93,83,52,.34),rgba(34,50,37,.52))!important}
html.warden-book-preview .journal-card h3{font:700 15px/1.12 Georgia,serif!important;color:#eadbb6!important;margin:5px 0 8px!important}
html.warden-book-preview .journal-card p{font-size:9px!important;line-height:1.35!important;color:#bdc8b9!important}
html.warden-book-preview .journal-row{display:flex!important;gap:7px!important;align-items:center!important;padding:5px 0!important;border-bottom:1px solid rgba(220,201,154,.08)!important;font-size:8px!important}
html.warden-book-preview .journal-row.done span{color:#cfba75!important}.warden-book-preview .journal-row.locked{opacity:.52}
@media(max-height:500px) and (min-width:700px){
 html.warden-book-preview #warden-overlay{width:calc(100vw - 18px)!important;height:calc(100vh - 18px)!important;padding:9px!important}
 html.warden-book-preview .warden-overlay-header{height:43px!important;padding-bottom:5px!important}.warden-book-preview .warden-overlay-header h2{font-size:16px!important}.warden-book-preview #warden-map-view{height:calc(100% - 49px)!important;padding-top:6px!important;grid-template-columns:minmax(0,1fr) 180px!important;gap:7px!important}
 html.warden-book-preview .map-sidecard{padding:9px!important}.warden-book-preview #map-current-zone{font-size:14px!important}.warden-book-preview .journal-columns{grid-template-columns:1.05fr 1fr 1fr!important;gap:6px!important}.warden-book-preview .journal-card{padding:8px!important}.warden-book-preview #warden-journal-view{height:calc(100% - 49px)!important;padding-top:6px!important}
}
@media(max-width:520px){
 html.warden-book-preview #warden-overlay{width:calc(100vw - 16px)!important;height:calc(100vh - 20px)!important;padding:9px!important}
 html.warden-book-preview .warden-overlay-header{height:72px!important;gap:6px!important}.warden-book-preview .warden-overlay-actions{align-self:flex-end}.warden-book-preview .warden-tab{min-width:62px!important;padding:0 7px!important}
 html.warden-book-preview #warden-map-view{height:calc(100% - 80px)!important;grid-template-columns:1fr!important;grid-template-rows:minmax(0,1fr) 112px!important;gap:8px!important;padding-top:8px!important}.warden-book-preview .map-sidecard{padding:9px!important;display:grid!important;grid-template-columns:1fr auto!important;gap:4px 8px!important}.warden-book-preview .map-sidecard:before,.warden-book-preview #map-current-zone,.warden-book-preview #map-current-objective{grid-column:1}.warden-book-preview #map-discovery-count{grid-column:2;grid-row:1/4;margin:0!important;padding:0!important;border:0!important;align-self:center;max-width:88px;text-align:right}
 html.warden-book-preview #warden-journal-view{height:calc(100% - 80px)!important}.warden-book-preview .journal-columns{grid-template-columns:1fr!important;grid-template-rows:auto!important;display:block!important}.warden-book-preview .journal-card,.warden-book-preview .journal-card.current{margin-bottom:7px!important;max-height:none!important;overflow:visible!important}
}
`;

function inside(box,vp){return !!box&&box.x>=-2&&box.y>=-2&&box.x+box.width<=vp.width+2&&box.y+box.height<=vp.height+2;}

try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    const page=await context.newPage();
    await page.goto(`${target}?bookPreview=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.openMap&&window.__BRIAR_GLENDebug?.openJournal&&window.__BRIAR_GLENDebug?.getBuildInfo),{timeout:7000});
    await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      d.setProgress({
        contractComplete:true,patrolComplete:true,groveDiscovered:true,grovekeeperDefeated:true,groveCacheClaimed:true,
        shortcutUnlocked:true,reinforcedPickaxe:true,temperedSword:true,briarstringBow:true,moonrootStaff:true,
        fenDiscovered:true,fenCrossingOpened:true,fenWardenDefeated:true,fenCacheClaimed:true,
        stonepinePassOpened:true,stonepineDiscovered:true,
      });
      d.teleport(1030,20);
      d.openMap();
    });
    await page.addStyleTag({content:css});
    await page.evaluate(()=>document.documentElement.classList.add('warden-book-preview'));
    await page.waitForTimeout(300);
    const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
    if(build.version!=='30')throw new Error(`${vp.name}: Warden Book preview must run on untouched Build 30`);
    let box=await page.locator('#warden-overlay').boundingBox();
    if(!inside(box,vp))throw new Error(`${vp.name}: map prototype outside viewport ${JSON.stringify(box)}`);
    await page.screenshot({path:path.join(out,`${vp.name}-map.png`),fullPage:false});

    await page.evaluate(()=>window.__BRIAR_GLENDebug.openJournal());
    await page.waitForTimeout(220);
    box=await page.locator('#warden-overlay').boundingBox();
    if(!inside(box,vp))throw new Error(`${vp.name}: journal prototype outside viewport ${JSON.stringify(box)}`);
    await page.screenshot({path:path.join(out,`${vp.name}-journal.png`),fullPage:false});
    console.log(`PASS ${vp.name}: reversible Map + Journal prototypes captured over Build 30`);
    await context.close();
  }
}finally{await browser.close();}
