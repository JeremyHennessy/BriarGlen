import { chromium } from 'playwright';
import fs from 'node:fs';
const target=process.argv[2]||'http://127.0.0.1:4173/';
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const views=[{name:'landscape',width:932,height:430},{name:'portrait',width:430,height:932}];
const regions=[['village',-650,-250],['meadow',320,0],['grove',600,-800],['fen',1500,-1700],['copper',1020,40],['den',1900,0],['stonepine',2800,-1500]];
try{
  for(const vp of views){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,deviceScaleFactor:1});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const sep=target.includes('?')?'&':'?';await page.goto(`${target}${sep}artV1Terrain=1&terrainProof=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getArtV1TerrainState),{timeout:10000});
    await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getArtV1TerrainState();return s.ready||s.failed;},{timeout:12000});
    let s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1TerrainState());
    if(!s.requested||s.failed||!s.ready||!s.enabled)throw new Error(`${vp.name}: art-v1 terrain inactive ${JSON.stringify(s)}`);
    if(s.familyId!=='briar-glen-art-v1'||s.recipeId!=='briar-glen-art-v1-painted-family-v1')throw new Error(`${vp.name}: family/recipe drift ${JSON.stringify(s)}`);
    if(s.atlasWidth!==288||s.atlasHeight!==672)throw new Error(`${vp.name}: atlas dimensions drifted ${JSON.stringify(s)}`);
    if(!s.failClosed||s.fallbackUsed||s.physicalTileCount!==21)throw new Error(`${vp.name}: fallback/asset contract failed ${JSON.stringify(s)}`);
    for(const [name,x,y] of regions){
      await page.evaluate(([px,py])=>window.__BRIAR_GLENDebug.teleport(px,py),[x,y]);await page.waitForTimeout(650);
      s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1TerrainState());
      if(s.frameChunks<1||s.frameCells<64||s.drawCalls<1)throw new Error(`${vp.name}/${name}: terrain not drawing ${JSON.stringify(s)}`);
      await page.screenshot({path:`artifacts/art-v1-terrain-${vp.name}-${name}.png`});
    }
    if(errors.length)throw new Error(`${vp.name}: runtime errors ${errors.join('; ')}`);
    console.log(`PASS ${vp.name}: art-v1 terrain seven-region fail-closed preview`);await context.close();
  }
  const context=await browser.newContext({viewport:{width:932,height:430},hasTouch:true});const page=await context.newPage();
  await page.goto(`${target}${target.includes('?')?'&':'?'}artV1Terrain=0`,{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getArtV1TerrainState),{timeout:10000});
  const off=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1TerrainState());
  if(off.requested||off.enabled)throw new Error(`artV1Terrain=0 rollback failed ${JSON.stringify(off)}`);
  await context.close();console.log('PASS art-v1 terrain rollback');
}finally{await browser.close();}
