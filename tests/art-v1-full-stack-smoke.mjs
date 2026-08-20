import { chromium } from 'playwright';
import fs from 'node:fs';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const live=process.argv.includes('--live');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync('artifacts',{recursive:true});
const views=[
  {name:'phone-landscape',width:932,height:430,touch:true},
  {name:'phone-portrait',width:430,height:932,touch:true},
  {name:'desktop',width:1440,height:900,touch:false},
];
const regions=[
  ['village',-650,-250],['meadow',320,0],['grove',600,-800],['fen',1500,-1700],
  ['copper',1020,40],['den',1900,0],['stonepine',2800,-1500],
];
function urlWith(params={}){const u=new URL(target);for(const[k,v]of Object.entries(params))u.searchParams.set(k,String(v));return u.toString();}
async function load(page,url){let last;for(let i=0;i<(live?48:1);i++){try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getArtV1State&&window.__BRIAR_GLENDebug?.getBuildInfo&&window.__BRIAR_GLEN_MANIFEST),null,{timeout:10000});return;}catch(e){last=e;if(live)await sleep(5000);}}throw last;}

const browser=await chromium.launch({headless:true});
try{
  for(const vp of views){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    await context.addInitScript(()=>{for(const k of ['briar-glen-vslice-v1','briar-glen-onboarding-v1','briar-glen-context-guide-v37','briar-glen-run-metrics-v1','briar-glen-vertical-slice-complete-v1'])localStorage.removeItem(k);});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    await load(page,urlWith({artV1Smoke:`${Date.now()}-${vp.name}`}));
    let first=await page.evaluate(()=>({art:window.__BRIAR_GLENDebug.getArtV1State(),manifest:window.__BRIAR_GLEN_MANIFEST,build:window.__BRIAR_GLENDebug.getBuildInfo()}));
    if(first.manifest.artMode!=='briar-glen-art-v1')throw new Error(`${vp.name}: boot did not select art-v1 ${JSON.stringify(first.manifest)}`);
    if(!first.art.requested||!first.art.enabled||!first.art.ready||first.art.failed)throw new Error(`${vp.name}: art-v1 inactive ${JSON.stringify(first.art)}`);
    if(first.art.familyId!=='briar-glen-art-v1'||first.art.renderer!=='single-owner-procedural-storybook')throw new Error(`${vp.name}: wrong renderer ${JSON.stringify(first.art)}`);
    if(!first.art.noFallback||first.art.legacyFallbackCount!==0||(first.art.missingWorldTypes||[]).length)throw new Error(`${vp.name}: no-fallback contract failed ${JSON.stringify(first.art)}`);
    if(JSON.stringify(first.art.baseline)!==JSON.stringify(first.art.current))throw new Error(`${vp.name}: art mutated gameplay entities ${JSON.stringify(first.art)}`);
    if(first.build.saveKey!=='briar-glen-vslice-v1'||first.build.schema!==1)throw new Error(`${vp.name}: save contract changed ${JSON.stringify(first.build)}`);
    for(const [name,x,y] of regions){
      await page.evaluate(([px,py])=>window.__BRIAR_GLENDebug.teleport(px,py),[x,y]);
      await page.waitForTimeout(650);
      const s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1State());
      if(!s.enabled||s.failed||s.frameDraws<1||s.legacyFallbackCount!==0||s.missingWorldTypes.length)throw new Error(`${vp.name}/${name}: art-v1 ownership failure ${JSON.stringify(s)}`);
      await page.screenshot({path:`artifacts/art-v1-${vp.name}-${name}.png`});
    }
    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: one art-v1 renderer owns seven regions with zero legacy fallback`);
    await context.close();
  }

  const rollback=await browser.newContext({viewport:{width:932,height:430},hasTouch:true,deviceScaleFactor:1});
  const rp=await rollback.newPage();
  await rp.goto(urlWith({artV1:0,rollbackProof:Date.now()}),{waitUntil:'domcontentloaded',timeout:15000});
  await rp.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getSourceArt47State&&window.__BRIAR_GLEN_MANIFEST),null,{timeout:10000});
  const rb=await rp.evaluate(()=>({manifest:window.__BRIAR_GLEN_MANIFEST,source:window.__BRIAR_GLENDebug.getSourceArt47State(),artState:typeof window.__BRIAR_GLENDebug.getArtV1State}));
  if(rb.manifest.artMode!=='legacy-recovery'||rb.artState==='function')throw new Error(`rollback: art-v1 still loaded ${JSON.stringify(rb)}`);
  if(!rb.source.enabled||rb.source.failed)throw new Error(`rollback: Build49 source recovery unavailable ${JSON.stringify(rb)}`);
  console.log('PASS rollback: ?artV1=0 restores verified Build49 visual stack');
  await rollback.close();

  const returning=await browser.newContext({viewport:{width:932,height:430},hasTouch:true,deviceScaleFactor:1});
  await returning.addInitScript(()=>{localStorage.setItem('briar-glen-vslice-v1',JSON.stringify({player:{x:-720,y:30,hp:87,coins:123,inventory:{herb:2,ore:1,tusk:0},weaponType:'sword'},progress:{step:1}}));localStorage.setItem('briar-glen-onboarding-v1',JSON.stringify({stage:'move',complete:false,skipped:false}));});
  const pp=await returning.newPage();await load(pp,urlWith({onboarding:1,onboarding37:1,artV1Return:Date.now()}));
  const rs=await pp.evaluate(()=>({art:window.__BRIAR_GLENDebug.getArtV1State(),state:window.__BRIAR_GLENDebug.getState()}));
  if(!rs.art.enabled||rs.art.failed||rs.state.player.coins!==123)throw new Error(`returning save failed ${JSON.stringify(rs)}`);
  console.log('PASS returning-save: existing save loads under art-v1');
  await returning.close();
}finally{await browser.close();}
