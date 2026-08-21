import { chromium } from 'playwright';
import fs from 'node:fs';
const target=process.argv[2]||'http://127.0.0.1:4173/';
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const views=[{name:'landscape',width:932,height:430},{name:'portrait',width:430,height:932}];
const fallback={copper:[1020,40],den:[1900,0]};
const required={
  village:['tree'],meadow:['tree','bush','garden'],grove:['tree'],fen:['fenTree'],stonepine:['stonepineTree'],
};
try{
  for(const vp of views){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,deviceScaleFactor:1});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const sep=target.includes('?')?'&':'?';
    await page.goto(`${target}${sep}artV1Terrain=1&artV1Vegetation=1&vegetationProof=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getArtV1TerrainState&&window.__BRIAR_GLENDebug?.getArtV1VegetationState&&window.__BRIAR_GLENDebug?.getArtV1VegetationAnchors),{timeout:10000});
    await page.waitForFunction(()=>{const t=window.__BRIAR_GLENDebug.getArtV1TerrainState(),v=window.__BRIAR_GLENDebug.getArtV1VegetationState();return (t.ready||t.failed)&&(v.ready||v.failed);},{timeout:12000});
    let v=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1VegetationState());
    if(!v.requested||v.failed||!v.ready||!v.enabled)throw new Error(`${vp.name}: art-v1 vegetation inactive ${JSON.stringify(v)}`);
    if(v.familyId!=='briar-glen-art-v1'||v.recipeId!=='briar-glen-art-v1-painted-family-v1')throw new Error(`${vp.name}: family/recipe drift ${JSON.stringify(v)}`);
    if(v.atlasWidth!==640||v.atlasHeight!==480||v.roleCount!==9||v.sourceMasterCount!==9)throw new Error(`${vp.name}: vegetation asset contract drift ${JSON.stringify(v)}`);
    if(!v.failClosed||v.fallbackUsed||v.legacyVegetationUsed||!v.densityPreserved)throw new Error(`${vp.name}: vegetation ownership/fallback contract failed ${JSON.stringify(v)}`);
    if(v.baseline.objects!==v.current.objects||v.baseline.resources!==v.current.resources||v.baseline.enemies!==v.current.enemies)throw new Error(`${vp.name}: gameplay entity counts mutated ${JSON.stringify(v)}`);
    const anchors=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1VegetationAnchors());
    for(const name of ['village','meadow','grove','fen','copper','den','stonepine']){
      let anchor=null;
      if(required[name]){
        for(const type of required[name]){anchor=anchors.find(a=>a.region===name&&a.type===type);if(anchor)break;}
        if(!anchor)throw new Error(`${vp.name}/${name}: no representative vegetation anchor found`);
      }
      const [x,y]=anchor?[anchor.x+92,anchor.y+92]:fallback[name];
      const before=v.draws?.[anchor?.role]||0;
      await page.evaluate(([px,py])=>window.__BRIAR_GLENDebug.teleport(px,py),[x,y]);await page.waitForTimeout(750);
      v=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1VegetationState());
      if(anchor){
        const after=v.draws?.[anchor.role]||0;
        if(v.frameDraws<1||after<=before)throw new Error(`${vp.name}/${name}: representative ${anchor.role} did not draw ${JSON.stringify(v)}`);
      }
      await page.screenshot({path:`artifacts/art-v1-vegetation-${vp.name}-${name}.png`});
    }
    if(errors.length)throw new Error(`${vp.name}: runtime errors ${errors.join('; ')}`);
    console.log(`PASS ${vp.name}: art-v1 vegetation v2 representative family preview`);await context.close();
  }
  const atlasContext=await browser.newContext({viewport:{width:640,height:480},deviceScaleFactor:1});const atlasPage=await atlasContext.newPage();
  await atlasPage.goto(new URL('assets/art-v1/vegetation/vegetation-atlas-v2.webp',target).href,{waitUntil:'load',timeout:20000});
  await atlasPage.screenshot({path:'artifacts/art-v1-vegetation-atlas-browser.png'});await atlasContext.close();
  const context=await browser.newContext({viewport:{width:932,height:430},hasTouch:true});const page=await context.newPage();
  await page.goto(`${target}${target.includes('?')?'&':'?'}artV1Terrain=1&artV1Vegetation=0`,{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getArtV1VegetationState),{timeout:10000});
  const off=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1VegetationState());
  if(off.requested||off.enabled)throw new Error(`artV1Vegetation=0 rollback failed ${JSON.stringify(off)}`);
  await context.close();console.log('PASS art-v1 vegetation rollback');
}finally{await browser.close();}
