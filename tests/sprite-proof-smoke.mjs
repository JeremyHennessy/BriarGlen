import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const viewports=[
  {name:'phone-landscape',width:932,height:430,touch:true},
  {name:'phone-portrait',width:430,height:932,touch:true},
  {name:'desktop',width:1440,height:900,touch:false},
];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const artifactDir=path.resolve('test-artifacts/build31');
fs.mkdirSync(artifactDir,{recursive:true});
const browser=await chromium.launch({headless:true});

function withParam(url,key,value){const sep=url.includes('?')?'&':'?';return `${url}${sep}${key}=${encodeURIComponent(value)}`;}

async function openCast(page,url,label){
  await page.goto(withParam(url,'livingCastRun',`${Date.now()}-${label}`),{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getBuildInfo&&window.__BRIAR_GLENDebug?.getAuthoredArtState&&window.__BRIAR_GLENDebug?.getCharacterArtState),{timeout:7000});
  await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getCharacterArtState();return s.ready||s.failed;},{timeout:9000});
}

async function assertBrowserPaintsSources(page,vpName){
  const report=await page.evaluate(async()=>{
    const paths=[
      'assets/v31/warden-sword.svg','assets/v31/warden-bow.svg','assets/v31/warden-staff.svg',
      'assets/v31/briar-wolf.svg','assets/v31/hollow-boar.svg','assets/v31/emberback.svg',
    ];
    const out={};
    for(const src of paths){
      const image=new Image();
      image.src=`${src}?decode31=${Date.now()}-${Math.random()}`;
      await image.decode();
      const c=document.createElement('canvas');c.width=180;c.height=180;
      const g=c.getContext('2d');
      const scale=Math.min(150/image.naturalWidth,150/image.naturalHeight);
      const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
      g.drawImage(image,(180-w)/2,(180-h)/2,w,h);
      const data=g.getImageData(0,0,180,180).data;
      let alpha=0,rgb=0,visible=0;
      for(let i=0;i<data.length;i+=4){if(data[i+3]>24){visible++;alpha+=data[i+3];rgb+=data[i]+data[i+1]+data[i+2];}}
      out[src]={width:image.naturalWidth,height:image.naturalHeight,alpha,rgb,visible};
    }
    return out;
  });
  for(const [src,info] of Object.entries(report)){
    if(info.width<80||info.height<80||info.visible<300||info.alpha<40000||info.rgb<20000)throw new Error(`${vpName}: Build 31 source decode failed ${src} ${JSON.stringify(info)}`);
  }
  return report;
}

function assertBaseAndCast(base,cast,vp){
  if(base.failed||!base.productionDefault||!base.hollowDenExpanded||!base.stonepineExpanded||!base.enabled||!base.ready||base.mode!=='authored-copper-ember')throw new Error(`${vp.name}: Build 30 environment baseline drifted ${JSON.stringify(base)}`);
  if(base.authoredTreeTargets?.length!==18||base.authoredEnvironmentTargets?.length!==8)throw new Error(`${vp.name}: approved environment family drifted ${JSON.stringify(base)}`);
  if(cast.failed||!cast.productionDefault||!cast.characterExpanded||!cast.requested||!cast.enabled||!cast.ready||cast.mode!=='authored-living-cast'||cast.baseArtMode!=='authored-copper-ember')throw new Error(`${vp.name}: Build 31 Living Cast inactive ${JSON.stringify(cast)}`);
  if(Object.keys(cast.loadedCharacterAssets||{}).length!==6||Object.values(cast.loadedCharacterAssets||{}).some(v=>!v.loaded))throw new Error(`${vp.name}: character sources incomplete ${JSON.stringify(cast.loadedCharacterAssets)}`);
  if(JSON.stringify(cast.baseline)!==JSON.stringify(cast.current))throw new Error(`${vp.name}: character presentation mutated gameplay entities`);
}

try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    page.on('requestfailed',r=>errors.push(`requestfailed: ${r.url()} • ${r.failure()?.errorText||'unknown'}`));
    await openCast(page,target,vp.name);
    const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
    if(build.version!=='31'||build.label!=='Living Cast')throw new Error(`${vp.name}: incorrect Build 31 metadata ${JSON.stringify(build)}`);
    const decode=await assertBrowserPaintsSources(page,vp.name);

    // Sword + Briar Wolf on Meadow Road.
    await page.keyboard.press('Digit1');
    await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      d.teleport(330,20);
      d.setThreat?.('wolf',{x:455,y:115,hp:52,dead:false,hurt:0});
    });
    await sleep(420);
    let state=await page.evaluate(()=>({base:window.__BRIAR_GLENDebug.getAuthoredArtState(),cast:window.__BRIAR_GLENDebug.getCharacterArtState(),game:window.__BRIAR_GLENDebug.getState()}));
    assertBaseAndCast(state.base,state.cast,vp);
    if(state.game.player.weaponType!=='sword'||state.cast.replacements.player_sword<1||state.cast.replacements.wolf<1)throw new Error(`${vp.name}: sword/wolf Living Cast scene missing ${JSON.stringify(state)}`);
    await page.screenshot({path:path.join(artifactDir,`${vp.name}-sword-wolf.png`),fullPage:false});

    // Bow + Hollow Boar in Copper Hollow.
    await page.keyboard.press('Digit2');
    await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      d.teleport(1040,30);
      d.setThreat?.('boar',{x:1160,y:120,hp:70,dead:false,hurt:0});
    });
    await sleep(420);
    state=await page.evaluate(()=>({base:window.__BRIAR_GLENDebug.getAuthoredArtState(),cast:window.__BRIAR_GLENDebug.getCharacterArtState(),game:window.__BRIAR_GLENDebug.getState()}));
    assertBaseAndCast(state.base,state.cast,vp);
    if(state.game.player.weaponType!=='bow'||state.cast.replacements.player_bow<1||state.cast.replacements.boar<1)throw new Error(`${vp.name}: bow/boar Living Cast scene missing ${JSON.stringify(state)}`);
    await page.screenshot({path:path.join(artifactDir,`${vp.name}-bow-boar.png`),fullPage:false});

    // Staff + Emberback in the Den.
    await page.keyboard.press('Digit3');
    await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      d.setProgress?.({bossDefeated:false});
      d.setThreat?.('boss',{x:1900,y:0,hp:320,dead:false,hurt:0});
      d.teleport(1745,45);
    });
    await sleep(450);
    state=await page.evaluate(()=>({base:window.__BRIAR_GLENDebug.getAuthoredArtState(),cast:window.__BRIAR_GLENDebug.getCharacterArtState(),game:window.__BRIAR_GLENDebug.getState()}));
    assertBaseAndCast(state.base,state.cast,vp);
    if(state.game.player.weaponType!=='staff'||state.cast.replacements.player_staff<1||state.cast.replacements.boss<1)throw new Error(`${vp.name}: staff/Emberback Living Cast scene missing ${JSON.stringify(state)}`);
    if(state.cast.playerDraws<3||state.cast.enemyDraws<3)throw new Error(`${vp.name}: character renderer draw cadence missing ${JSON.stringify(state.cast)}`);
    await page.screenshot({path:path.join(artifactDir,`${vp.name}-staff-emberback.png`),fullPage:false});

    const disabled=await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setCharacterArtEnabled(false);return d.getCharacterArtState();});
    const playerAtDisable=disabled.playerDraws,enemyAtDisable=disabled.enemyDraws;
    if(disabled.enabled)throw new Error(`${vp.name}: Living Cast debug disable failed`);
    await sleep(180);
    let frozen=await page.evaluate(()=>window.__BRIAR_GLENDebug.getCharacterArtState());
    if(frozen.enabled||frozen.playerDraws!==playerAtDisable||frozen.enemyDraws!==enemyAtDisable)throw new Error(`${vp.name}: disabled cast kept drawing ${JSON.stringify(frozen)}`);
    await page.evaluate(()=>window.__BRIAR_GLENDebug.setCharacterArtEnabled(true));
    await sleep(220);
    frozen=await page.evaluate(()=>window.__BRIAR_GLENDebug.getCharacterArtState());
    if(!frozen.enabled||frozen.playerDraws<=playerAtDisable||frozen.enemyDraws<=enemyAtDisable)throw new Error(`${vp.name}: Living Cast did not restore ${JSON.stringify(frozen)}`);

    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: Living Cast caused browser overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: Build 31 runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Build 31 Living Cast player weapons + wolf/boar/Emberback active ${JSON.stringify(decode)}`);
    await context.close();
  }
}finally{await browser.close();}