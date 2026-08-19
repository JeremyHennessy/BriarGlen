import { chromium } from 'playwright';
import fs from 'node:fs';
const target=process.argv[2]||'http://127.0.0.1:4173/';
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const views=[{name:'landscape',width:844,height:390},{name:'portrait',width:390,height:844}];
const regions=[['village',-650,-250],['meadow',300,0],['grove',600,-780],['fen',1500,-1700],['copper',1050,40],['den',1850,0],['stonepine',2800,-1500]];
try{
 for(const vp of views){
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`${target}${target.includes('?')?'&':'?'}env46proof=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>window.__BRIAR_GLENDebug?.getEnvironment46State?.().ready,{timeout:5000});
  let s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getEnvironment46State());
  if(!s.requested||!s.enabled||s.failed)throw new Error(`${vp.name}: env46 inactive ${JSON.stringify(s)}`);
  if(s.assetCount!==47||s.registered.length!==47||s.placementCount!==47)throw new Error(`${vp.name}: wrong 47-asset contract ${JSON.stringify(s)}`);
  if(JSON.stringify(s.baseline)!==JSON.stringify(s.current))throw new Error(`${vp.name}: entity counts changed ${JSON.stringify(s)}`);
  let last=s.totalDraws,regionsDrawn=0;
  for(const [name,x,y] of regions){await page.evaluate(([x,y])=>window.__BRIAR_GLENDebug.teleport(x,y),[x,y]);await page.waitForTimeout(520);s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getEnvironment46State());if(s.totalDraws>last)regionsDrawn++;last=s.totalDraws;await page.screenshot({path:`artifacts/environment46-${vp.name}-${name}.png`});}
  if(regionsDrawn<6)throw new Error(`${vp.name}: too few region environment draws ${regionsDrawn}/7 ${JSON.stringify(s)}`);
  if(errors.length)throw new Error(`${vp.name}: runtime errors ${errors.join('; ')}`);
  console.log(`PASS ${vp.name}: 47 environment variants, ${s.placementCount} presentation placements, ${regionsDrawn}/7 region captures active`);await context.close();
 }
 const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true});const page=await context.newPage();await page.goto(`${target}${target.includes('?')?'&':'?'}env46=0`,{waitUntil:'domcontentloaded',timeout:15000});await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getEnvironment46State));const s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getEnvironment46State());if(s.requested||s.enabled)throw new Error(`env46=0 rollback failed ${JSON.stringify(s)}`);await context.close();console.log('PASS Environment 46 rollback');
}finally{await browser.close();}
