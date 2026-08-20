import { chromium } from 'playwright';
import fs from 'node:fs';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const live=process.argv.includes('--live');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const views=[
  {name:'phone-landscape',width:932,height:430,touch:true},
  {name:'phone-portrait',width:430,height:932,touch:true},
  {name:'desktop',width:1440,height:900,touch:false},
];
const regions=[['village',-650,-250],['meadow',320,0],['grove',600,-800],['fen',1500,-1700],['copper',1020,40],['den',1900,0],['stonepine',2800,-1500]];

async function load(page,url){let last;for(let i=0;i<(live?48:1);i++){try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getArtV1State&&window.__BRIAR_GLENDebug?.getRuntimeArchitectureState),{timeout:8000});return;}catch(e){last=e;if(live)await sleep(5000);}}throw last;}

try{
  for(const vp of views){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>errors.push(`${r.url()} ${r.failure()?.errorText||''}`));
    await load(page,`${target}${target.includes('?')?'&':'?'}art51=${Date.now()}-${vp.name}`);
    let first=await page.evaluate(()=>({art:window.__BRIAR_GLENDebug.getArtV1State(),manifest:window.__BRIAR_GLEN_MANIFEST,runtime:window.__BRIAR_GLENDebug.getRuntimeArchitectureState()}));
    if(!first.art.enabled||first.art.failed||!first.art.ready||!first.art.noFallback||first.art.legacyFallbackCount!==0)throw new Error(`${vp.name}: art-v1 inactive/fallback ${JSON.stringify(first.art)}`);
    if(first.art.familyId!=='briar-glen-art-v1'||first.art.renderer!=='single-owner-painterly-storybook')throw new Error(`${vp.name}: wrong renderer ${JSON.stringify(first.art)}`);
    if(first.manifest.artMode!=='briar-glen-art-v1'||first.manifest.scripts.some(src=>/generated-art-runtime|source-art47-runtime|living-cast48-runtime|scene-cohesion49-runtime/.test(src)))throw new Error(`${vp.name}: mixed legacy presentation loaded ${JSON.stringify(first.manifest)}`);
    if(first.art.missingWorldTypes.length)throw new Error(`${vp.name}: missing art roles ${JSON.stringify(first.art.missingWorldTypes)}`);
    if(JSON.stringify(first.art.baseline)!==JSON.stringify(first.art.current))throw new Error(`${vp.name}: entity counts changed ${JSON.stringify(first.art)}`);
    let last=first.art.totalDraws,regionsSeen=0;
    for(const [name,x,y] of regions){
      await page.evaluate(([px,py])=>window.__BRIAR_GLENDebug.teleport(px,py),[x,y]);await page.waitForTimeout(540);
      const art=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1State());if(art.totalDraws>last)regionsSeen++;last=art.totalDraws;
      await page.screenshot({path:`artifacts/art-v1-${vp.name}-${name}.png`});
    }
    const end=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1State());
    if(regionsSeen<6||end.playerDraws<1||end.totalDraws<25||end.legacyFallbackCount!==0)throw new Error(`${vp.name}: insufficient unified art coverage ${regionsSeen}/7 ${JSON.stringify(end)}`);
    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: runtime/resource errors ${errors.join('; ')}`);
    console.log(`PASS ${vp.name}: one art-v1 renderer owns seven regions with zero legacy fallback`);
    await context.close();
  }

  const context=await browser.newContext({viewport:{width:932,height:430},hasTouch:true,deviceScaleFactor:1});const page=await context.newPage();
  await page.goto(`${target}${target.includes('?')?'&':'?'}artV1=0`,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getSourceArt47State&&window.__BRIAR_GLENDebug?.getLivingCast48State&&window.__BRIAR_GLENDebug?.getSceneCohesion49State),{timeout:10000});
  const rollback=await page.evaluate(()=>({manifest:window.__BRIAR_GLEN_MANIFEST,source:window.__BRIAR_GLENDebug.getSourceArt47State(),cast:window.__BRIAR_GLENDebug.getLivingCast48State(),scene:window.__BRIAR_GLENDebug.getSceneCohesion49State()}));
  if(rollback.manifest.artMode!=='legacy-recovery'||!rollback.source.enabled||!rollback.cast.enabled||!rollback.scene.enabled)throw new Error(`artV1=0 rollback did not restore Build49 visual stack ${JSON.stringify(rollback)}`);
  await context.close();console.log('PASS art-v1 rollback restores Build49 stack');

  const context2=await browser.newContext({viewport:{width:932,height:430},hasTouch:true,deviceScaleFactor:1});const page2=await context2.newPage();
  await page2.addInitScript(()=>localStorage.setItem('briar-glen-vslice-v1',JSON.stringify({schema:1,player:{x:-700,y:0,hp:73,maxHp:100,coins:77,inventory:{herb:2,ore:1,tusk:0},weapon:'Worn Sword',weaponType:'sword',reinforced:false},progress:{step:2,bossDefeated:false,shortcutUnlocked:false,contractComplete:false,tipShown:true}})));
  await load(page2,`${target}${target.includes('?')?'&':'?'}onboarding=1&onboarding37=1&art51return=${Date.now()}`);
  const returning=await page2.evaluate(()=>({art:window.__BRIAR_GLENDebug.getArtV1State(),save:JSON.parse(localStorage.getItem('briar-glen-vslice-v1')||'{}')}));
  if(!returning.art.enabled||returning.art.failed||returning.save.schema!==1)throw new Error(`returning save/art-v1 compatibility failed ${JSON.stringify(returning)}`);
  await context2.close();console.log('PASS art-v1 returning-save compatibility');
}finally{await browser.close();}
