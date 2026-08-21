import { chromium } from 'playwright';
import fs from 'node:fs';
const target=process.argv[2]||'http://127.0.0.1:4173/';
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const views=[{name:'landscape',width:932,height:430},{name:'portrait',width:430,height:932}];
const regions=[
  ['village',-650,430,true],['meadow',220,320,true],['grove',540,-770,true],
  ['fen',1350,-1515,true],['copper',1020,40,false],['den',1900,0,false],['stonepine',2780,-1540,true],
];
try{
  for(const vp of views){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,deviceScaleFactor:1});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const sep=target.includes('?')?'&':'?';
    await page.goto(`${target}${sep}artV1Terrain=1&artV1Vegetation=1&vegetationProof=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getArtV1TerrainState&&window.__BRIAR_GLENDebug?.getArtV1VegetationState),{timeout:10000});
    await page.waitForFunction(()=>{const t=window.__BRIAR_GLENDebug.getArtV1TerrainState(),v=window.__BRIAR_GLENDebug.getArtV1VegetationState();return (t.ready||t.failed)&&(v.ready||v.failed);},{timeout:12000});
    let v=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1VegetationState());
    if(!v.requested||v.failed||!v.ready||!v.enabled)throw new Error(`${vp.name}: art-v1 vegetation inactive ${JSON.stringify(v)}`);
    if(v.familyId!=='briar-glen-art-v1'||v.recipeId!=='briar-glen-art-v1-painted-family-v1')throw new Error(`${vp.name}: family/recipe drift ${JSON.stringify(v)}`);
    if(v.atlasWidth!==640||v.atlasHeight!==480||v.roleCount!==9||v.sourceMasterCount!==9)throw new Error(`${vp.name}: vegetation asset contract drift ${JSON.stringify(v)}`);
    if(!v.failClosed||v.fallbackUsed||v.legacyVegetationUsed||!v.densityPreserved)throw new Error(`${vp.name}: vegetation ownership/fallback contract failed ${JSON.stringify(v)}`);
    if(v.baseline.objects!==v.current.objects||v.baseline.resources!==v.current.resources||v.baseline.enemies!==v.current.enemies)throw new Error(`${vp.name}: gameplay entity counts mutated ${JSON.stringify(v)}`);
    for(const [name,x,y,mustDraw] of regions){
      await page.evaluate(([px,py])=>window.__BRIAR_GLENDebug.teleport(px,py),[x,y]);await page.waitForTimeout(700);
      v=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1VegetationState());
      if(mustDraw&&v.frameDraws<1)throw new Error(`${vp.name}/${name}: expected vegetation family role not visible ${JSON.stringify(v)}`);
      await page.screenshot({path:`artifacts/art-v1-vegetation-${vp.name}-${name}.png`});
    }
    if(errors.length)throw new Error(`${vp.name}: runtime errors ${errors.join('; ')}`);
    console.log(`PASS ${vp.name}: art-v1 vegetation v2 clean family preview`);await context.close();
  }
  const context=await browser.newContext({viewport:{width:932,height:430},hasTouch:true});const page=await context.newPage();
  await page.goto(`${target}${target.includes('?')?'&':'?'}artV1Terrain=1&artV1Vegetation=0`,{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getArtV1VegetationState),{timeout:10000});
  const off=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1VegetationState());
  if(off.requested||off.enabled)throw new Error(`artV1Vegetation=0 rollback failed ${JSON.stringify(off)}`);
  await context.close();console.log('PASS art-v1 vegetation rollback');
}finally{await browser.close();}
