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
html.ui-shell-preview #onboarding21-start,
html.ui-shell-preview #toast-stack,
html.ui-shell-preview #polish23-area,
html.ui-shell-preview #polish23-pickup{display:none!important}
html.ui-shell-preview #hud{pointer-events:none}
html.ui-shell-preview .top-row{position:absolute;inset:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) auto max(12px,env(safe-area-inset-left));display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
html.ui-shell-preview .status-panel{width:286px;min-height:78px;display:grid;grid-template-columns:50px 1fr;grid-template-rows:auto auto auto auto;gap:2px 10px;padding:9px 11px 9px 9px;border:1px solid rgba(221,198,139,.34);border-radius:13px;background:linear-gradient(145deg,rgba(35,51,38,.95),rgba(18,30,23,.94));box-shadow:0 10px 30px rgba(0,0,0,.28)}
html.ui-shell-preview .ui-preview-avatar{grid-row:1/5;width:48px;height:58px;border:1px solid rgba(230,205,145,.45);border-radius:9px;background:radial-gradient(circle at 50% 30%,rgba(213,184,119,.28),transparent 28%),linear-gradient(160deg,#485b42,#25382c);display:grid;place-items:center;color:#ead7a7;font:800 15px/1 Georgia,serif;letter-spacing:.05em;box-shadow:inset 0 0 0 2px rgba(18,28,21,.45)}
html.ui-shell-preview .status-panel>.eyebrow,html.ui-shell-preview .status-panel>.status-line,html.ui-shell-preview .status-panel>.health-bar,html.ui-shell-preview .status-panel>.bar-label{grid-column:2}
html.ui-shell-preview .status-panel>.eyebrow{font-size:7px;letter-spacing:.16em;color:#aab99f}
html.ui-shell-preview .status-line{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
html.ui-shell-preview .status-line strong{font:700 14px/1.1 Georgia,serif;color:#f0e4c8}
html.ui-shell-preview #weapon-label{font:800 8px/1 system-ui,sans-serif;color:#d6bd7b;text-transform:uppercase;letter-spacing:.08em}
html.ui-shell-preview .health-bar{height:8px;border-radius:999px;overflow:hidden;background:rgba(9,18,13,.7);border:1px solid rgba(225,209,164,.14)}
html.ui-shell-preview .bar-label{font-size:8px;color:#c9d2c3}
html.ui-shell-preview .quest-panel{width:min(252px,31vw);min-height:66px;padding:9px 11px;border-radius:12px;border:1px solid rgba(221,198,139,.26);background:linear-gradient(150deg,rgba(29,45,34,.93),rgba(18,30,23,.92));box-shadow:0 10px 30px rgba(0,0,0,.24)}
html.ui-shell-preview .quest-panel>.eyebrow{font-size:7px;color:#b8a66f;letter-spacing:.16em}
html.ui-shell-preview #quest-title{display:block;margin:2px 0 3px;font:700 12px/1.1 Georgia,serif;color:#f0e4c8}
html.ui-shell-preview #quest-text{font:700 8px/1.25 system-ui,sans-serif;color:#c1ccba;max-width:220px}
html.ui-shell-preview #quest-progress{margin-top:4px;font-size:7px;color:#d7c58e}
html.ui-shell-preview .ui-preview-map{width:104px;height:104px;flex:0 0 104px;border-radius:50%;position:relative;overflow:hidden;border:2px solid rgba(219,195,137,.5);background:radial-gradient(circle at 48% 48%,#6c845b 0 18%,#506c4a 19% 41%,#354f3c 42% 62%,#24392e 63%);box-shadow:0 10px 32px rgba(0,0,0,.3),inset 0 0 0 5px rgba(20,31,24,.55)}
html.ui-shell-preview .ui-preview-map:before{content:'';position:absolute;left:13px;top:50px;width:78px;height:9px;border-radius:50%;border-top:4px solid rgba(210,184,122,.62);transform:rotate(-21deg)}
html.ui-shell-preview .ui-preview-map:after{content:'';position:absolute;left:49px;top:14px;width:8px;height:77px;border-left:3px solid rgba(210,184,122,.45);transform:rotate(13deg)}
html.ui-shell-preview .ui-preview-map .player-dot{position:absolute;left:49px;top:48px;width:8px;height:8px;border-radius:50%;background:#f2df9e;box-shadow:0 0 0 3px rgba(26,42,31,.85),0 0 12px rgba(242,223,158,.7)}
html.ui-shell-preview .ui-preview-map .map-label{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);padding:3px 7px;border-radius:999px;background:rgba(18,29,22,.78);font:800 6px/1 system-ui,sans-serif;letter-spacing:.11em;color:#eadbb7;white-space:nowrap}
html.ui-shell-preview .inventory-strip{position:absolute!important;left:50%!important;right:auto!important;top:auto!important;bottom:max(14px,calc(env(safe-area-inset-bottom) + 8px))!important;transform:translateX(-50%)!important;display:flex!important;align-items:center;gap:5px;width:auto!important;padding:5px!important;border:1px solid rgba(224,201,144,.32)!important;border-radius:13px!important;background:rgba(20,33,25,.92)!important;box-shadow:0 12px 34px rgba(0,0,0,.3)!important}
html.ui-shell-preview .inventory-strip>div{width:48px!important;height:48px!important;min-width:48px!important;display:grid!important;grid-template-rows:23px 10px;place-items:center;padding:2px!important;border:1px solid rgba(221,204,160,.14);border-radius:9px;background:linear-gradient(160deg,rgba(85,102,73,.45),rgba(34,52,39,.56));box-sizing:border-box}
html.ui-shell-preview .inventory-strip .item-dot{width:20px!important;height:20px!important;margin:0!important}
html.ui-shell-preview .inventory-strip b{font-size:10px!important;line-height:1!important}
html.ui-shell-preview .inventory-strip small{font-size:6px!important;line-height:1!important;max-width:44px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#c8d1c2}
html.ui-shell-preview .ui-preview-slot{font:900 10px/1 system-ui,sans-serif;color:#e7d39c}
html.ui-shell-preview #context-prompt{bottom:80px!important;min-width:180px;padding:7px 11px!important;font-size:8px!important;border-radius:999px!important;background:rgba(20,33,25,.9)!important}
html.ui-shell-preview #touch-controls .action-cluster{right:max(13px,env(safe-area-inset-right));bottom:max(13px,env(safe-area-inset-bottom));display:grid;grid-template-columns:42px 48px 56px;grid-template-rows:42px 48px 56px;gap:6px;align-items:end;justify-items:end}
html.ui-shell-preview #touch-controls .touch-btn{position:static!important;margin:0!important;width:42px!important;height:42px!important;min-width:0!important;min-height:0!important;border-radius:50%!important;padding:0!important;font-size:7px!important;letter-spacing:.03em!important;border:1px solid rgba(228,207,157,.31)!important;background:linear-gradient(160deg,rgba(77,95,68,.94),rgba(36,54,42,.96))!important;box-shadow:0 7px 18px rgba(0,0,0,.27)!important}
html.ui-shell-preview #attack-btn{grid-column:3;grid-row:2/4;width:56px!important;height:56px!important;background:linear-gradient(160deg,#8b7043,#59492f)!important;font-size:8px!important}
html.ui-shell-preview #dash-btn{grid-column:2;grid-row:3;width:48px!important;height:48px!important}
html.ui-shell-preview #skill-btn{grid-column:2;grid-row:2;width:48px!important;height:48px!important;background:linear-gradient(160deg,#536e60,#334b3e)!important}
html.ui-shell-preview #weapon-btn{grid-column:1;grid-row:3}
html.ui-shell-preview #potion-btn{grid-column:1;grid-row:2}
html.ui-shell-preview #interact-btn{grid-column:2;grid-row:1}
html.ui-shell-preview #move-pad{left:max(14px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));width:104px!important;height:104px!important;border:1px solid rgba(222,204,161,.18)!important;background:rgba(20,33,25,.18)!important}
html.ui-shell-preview #move-stick{width:42px!important;height:42px!important;background:rgba(213,198,159,.24)!important;border:1px solid rgba(229,211,166,.28)!important}
html.ui-shell-preview .desktop-hints{opacity:.55;transform:scale(.82);transform-origin:left bottom}
html.ui-shell-preview #rotate-note{display:none!important}
@media(max-height:520px){
 html.ui-shell-preview .top-row{gap:8px}
 html.ui-shell-preview .status-panel{width:250px;min-height:64px;grid-template-columns:43px 1fr;padding:7px 9px}
 html.ui-shell-preview .ui-preview-avatar{width:41px;height:49px;font-size:13px}
 html.ui-shell-preview .quest-panel{width:218px;min-height:56px;padding:7px 9px}
 html.ui-shell-preview .ui-preview-map{width:82px;height:82px;flex-basis:82px}
 html.ui-shell-preview .ui-preview-map:before{left:10px;top:39px;width:62px}
 html.ui-shell-preview .ui-preview-map:after{left:39px;top:10px;height:62px}
 html.ui-shell-preview .ui-preview-map .player-dot{left:38px;top:38px}
 html.ui-shell-preview .ui-preview-map .map-label{bottom:7px;font-size:5px}
 html.ui-shell-preview .inventory-strip>div{width:43px!important;height:43px!important;min-width:43px!important}
}
@media(max-width:520px) and (min-height:600px){
 html.ui-shell-preview .top-row{display:grid;grid-template-columns:1fr 82px;grid-template-areas:'status map' 'quest quest';gap:8px}
 html.ui-shell-preview .status-panel{grid-area:status;width:auto;min-width:0}
 html.ui-shell-preview .ui-preview-map{grid-area:map;width:78px;height:78px;justify-self:end}
 html.ui-shell-preview .ui-preview-map:before{left:9px;top:37px;width:60px}
 html.ui-shell-preview .ui-preview-map:after{left:37px;top:9px;height:59px}
 html.ui-shell-preview .ui-preview-map .player-dot{left:36px;top:36px}
 html.ui-shell-preview .quest-panel{grid-area:quest;width:auto;min-height:0}
 html.ui-shell-preview #quest-text{max-width:none}
 html.ui-shell-preview .inventory-strip{bottom:max(180px,calc(env(safe-area-inset-bottom) + 165px))!important;max-width:calc(100vw - 28px);gap:3px}
 html.ui-shell-preview .inventory-strip>div{width:41px!important;min-width:41px!important;height:43px!important}
 html.ui-shell-preview #move-pad{width:98px!important;height:98px!important}
}
@media(min-width:800px){html.ui-shell-preview .inventory-strip{bottom:22px!important}html.ui-shell-preview #context-prompt{bottom:88px!important}}
`;

function installPreview(){
  document.documentElement.classList.add('ui-shell-preview');
  document.getElementById('onboarding21-start')?.setAttribute('hidden','');
  const status=document.querySelector('.status-panel');
  if(status&&!status.querySelector('.ui-preview-avatar')){
    const avatar=document.createElement('div');
    avatar.className='ui-preview-avatar';
    avatar.textContent='BW';
    status.prepend(avatar);
  }
  const top=document.querySelector('.top-row');
  if(top&&!top.querySelector('.ui-preview-map')){
    const map=document.createElement('div');
    map.className='ui-preview-map';
    map.innerHTML='<span class="player-dot"></span><span class="map-label">BRIAR GLEN</span>';
    top.appendChild(map);
  }
  const strip=document.getElementById('inventory-strip');
  if(strip&&!strip.querySelector('.ui-preview-slot')){
    for(const label of ['TONIC','SKILL']){
      const slot=document.createElement('div');
      slot.className='ui-preview-slot';
      slot.innerHTML=`<b>${label==='TONIC'?'T':'F'}</b><small>${label}</small>`;
      strip.appendChild(slot);
    }
  }
}

try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    const page=await context.newPage();
    await page.goto(`${target}?uiShellPreview=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getBuildInfo),{timeout:7000});
    await page.addStyleTag({content:css});
    await page.evaluate(installPreview);
    await page.waitForTimeout(500);
    const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
    if(build.version!=='30')throw new Error(`${vp.name}: preview must run on untouched Build 30, got ${JSON.stringify(build)}`);
    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: preview overflow ${JSON.stringify(overflow)}`);
    await page.screenshot({path:path.join(out,`${vp.name}-ui-shell.png`),fullPage:false});
    console.log(`PASS ${vp.name}: reversible UI shell preview captured over Build 30`);
    await context.close();
  }
}finally{await browser.close();}
