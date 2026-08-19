import { chromium } from 'playwright';
import fs from 'node:fs';
const target=process.argv[2]||'http://127.0.0.1:4173/';
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const vp of [{name:'landscape',width:844,height:390},{name:'portrait',width:390,height:844}]){
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,deviceScaleFactor:1});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`${target}${target.includes('?')?'&':'?'}terrain46=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>window.__BRIAR_GLENDebug?.getTerrainPolish46State?.().ready,{timeout:5000});
  let s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getTerrainPolish46State());
  if(!s.enabled||s.assetCount!==10||s.registered.length!==10)throw new Error(`${vp.name}: Terrain 46C registry invalid ${JSON.stringify(s)}`);
  if(JSON.stringify(s.baseline)!==JSON.stringify(s.current))throw new Error(`${vp.name}: entity count mutation ${JSON.stringify(s)}`);

  await page.evaluate(()=>window.__BRIAR_GLENDebug.setProgress({groveCacheClaimed:true,fenCacheClaimed:true,stonepineCacheClaimed:true,fenCrossingOpened:true,stonepinePassOpened:true,shortcutUnlocked:true}));
  const spots=[['grove',650,-820],['fen',1515,-1830],['stonepine',3255,-1900],['fen-gate',1050,-1200],['stone-gate',2240,-1500],['rootway',-845,-205]];
  for(const [name,x,y] of spots){await page.evaluate(([x,y])=>window.__BRIAR_GLENDebug.teleport(x,y),[x,y]);await page.waitForTimeout(420);await page.screenshot({path:`artifacts/terrain46-${vp.name}-${name}.png`});}
  s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getTerrainPolish46State());
  for(const id of ['bg46_grove_cache_claimed','bg46_fen_cache_claimed','bg46_stonepine_cache_claimed','bg46_fen_gate_open','bg46_stonepine_gate_open'])if(!s.states[id])throw new Error(`${vp.name}: state art missing ${id} ${JSON.stringify(s.states)}`);

  // Exact canonical Copper node at (900,-140).
  await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.teleport(900,-140);d.interact();});
  await page.waitForTimeout(420);s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getTerrainPolish46State());
  if(!s.states.bg46_copper_depleted)throw new Error(`${vp.name}: copper depletion art missing ${JSON.stringify(s.states)}`);
  if(errors.length)throw new Error(`${vp.name}: runtime errors ${errors.join('; ')}`);
  console.log(`PASS ${vp.name}: 10 terrain/state slots registered; cache/gate/rootway/depletion presentation active`);
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true});const page=await context.newPage();
 await page.goto(`${target}${target.includes('?')?'&':'?'}terrainPolish=0`,{waitUntil:'domcontentloaded',timeout:15000});await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getTerrainPolish46State));const off=await page.evaluate(()=>window.__BRIAR_GLENDebug.getTerrainPolish46State());if(off.enabled||off.requested)throw new Error(`terrainPolish=0 rollback failed ${JSON.stringify(off)}`);await context.close();
 console.log('PASS Terrain 46C rollback');
}finally{await browser.close();}
