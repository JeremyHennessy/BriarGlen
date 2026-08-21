import { chromium } from 'playwright';
import fs from 'node:fs';
const target=process.argv[2]||'http://127.0.0.1:4173/';
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const views=[{name:'landscape',width:932,height:430},{name:'portrait',width:430,height:932}];
const required=['cottage','tavern','forge','merchant','alchemy','well','board','fenGate','stonepineGate'];
try{
  for(const vp of views){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,deviceScaleFactor:1});
    const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const sep=target.includes('?')?'&':'?';
    await page.goto(`${target}${sep}artV1Terrain=1&artV1Vegetation=1&artV1Architecture=1&architectureProof=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getArtV1TerrainState&&window.__BRIAR_GLENDebug?.getArtV1VegetationState&&window.__BRIAR_GLENDebug?.getArtV1ArchitectureState&&window.__BRIAR_GLENDebug?.getArtV1ArchitectureAnchors),{timeout:10000});
    await page.waitForFunction(()=>{const t=window.__BRIAR_GLENDebug.getArtV1TerrainState(),v=window.__BRIAR_GLENDebug.getArtV1VegetationState(),a=window.__BRIAR_GLENDebug.getArtV1ArchitectureState();return(t.ready||t.failed)&&(v.ready||v.failed)&&(a.ready||a.failed);},{timeout:12000});
    const tv=await page.evaluate(()=>({t:window.__BRIAR_GLENDebug.getArtV1TerrainState(),v:window.__BRIAR_GLENDebug.getArtV1VegetationState()}));
    if(tv.t.failed||!tv.t.enabled)throw new Error(`${vp.name}: accepted terrain inactive ${JSON.stringify(tv.t)}`);
    if(tv.v.failed||!tv.v.enabled)throw new Error(`${vp.name}: accepted vegetation inactive ${JSON.stringify(tv.v)}`);
    let a=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1ArchitectureState());
    if(!a.requested||a.failed||!a.ready||!a.enabled)throw new Error(`${vp.name}: architecture inactive ${JSON.stringify(a)}`);
    if(a.familyId!=='briar-glen-art-v1'||a.recipeId!=='briar-glen-art-v1-painted-family-v1')throw new Error(`${vp.name}: architecture family/recipe drift ${JSON.stringify(a)}`);
    if(a.atlasWidth!==1024||a.atlasHeight!==1024||a.roleCount!==8||a.sourceMasterCount!==8)throw new Error(`${vp.name}: architecture asset contract drift ${JSON.stringify(a)}`);
    if(!a.failClosed||a.fallbackUsed||a.legacyArchitectureUsed||!a.entityLayoutPreserved)throw new Error(`${vp.name}: architecture ownership/fallback contract failed ${JSON.stringify(a)}`);
    if(a.baseline.objects!==a.current.objects||a.baseline.resources!==a.current.resources||a.baseline.enemies!==a.current.enemies)throw new Error(`${vp.name}: gameplay entity counts mutated ${JSON.stringify(a)}`);
    const anchors=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1ArchitectureAnchors());
    for(const type of required){
      const anchor=anchors.find(x=>x.type===type);if(!anchor)throw new Error(`${vp.name}/${type}: no architecture anchor found`);
      const before=a.draws?.[anchor.role]||0;
      await page.evaluate(([x,y])=>window.__BRIAR_GLENDebug.teleport(x+90,y+90),[anchor.x,anchor.y]);await page.waitForTimeout(750);
      a=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1ArchitectureState());
      const after=a.draws?.[anchor.role]||0;if(a.frameDraws<1||after<=before)throw new Error(`${vp.name}/${type}: ${anchor.role} did not draw ${JSON.stringify(a)}`);
      await page.screenshot({path:`artifacts/art-v1-architecture-${vp.name}-${type}.png`});
    }
    const gateAnchors=Object.fromEntries(anchors.filter(x=>x.type==='fenGate'||x.type==='stonepineGate').map(x=>[x.type,x]));
    await page.evaluate(()=>window.__BRIAR_GLENDebug.setProgress({fenCrossingOpened:false,stonepinePassOpened:false}));
    for(const type of ['fenGate','stonepineGate']){const g=gateAnchors[type];await page.evaluate(([x,y])=>window.__BRIAR_GLENDebug.teleport(x+90,y+90),[g.x,g.y]);await page.waitForTimeout(450);await page.screenshot({path:`artifacts/art-v1-architecture-${vp.name}-${type}-locked.png`});}
    a=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1ArchitectureState());if(a.gateDraws.locked<2)throw new Error(`${vp.name}: locked gate state not proven ${JSON.stringify(a)}`);
    await page.evaluate(()=>window.__BRIAR_GLENDebug.setProgress({fenCrossingOpened:true,stonepinePassOpened:true}));
    for(const type of ['fenGate','stonepineGate']){const g=gateAnchors[type];await page.evaluate(([x,y])=>window.__BRIAR_GLENDebug.teleport(x+90,y+90),[g.x,g.y]);await page.waitForTimeout(450);await page.screenshot({path:`artifacts/art-v1-architecture-${vp.name}-${type}-open.png`});}
    a=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1ArchitectureState());if(a.gateDraws.open<2)throw new Error(`${vp.name}: open gate state not proven ${JSON.stringify(a)}`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors ${errors.join('; ')}`);
    console.log(`PASS ${vp.name}: art-v1 architecture family preview + stateful thresholds`);await context.close();
  }
  const context=await browser.newContext({viewport:{width:932,height:430},hasTouch:true});const page=await context.newPage();
  await page.goto(`${target}${target.includes('?')?'&':'?'}artV1Terrain=1&artV1Vegetation=1&artV1Architecture=0`,{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getArtV1ArchitectureState),{timeout:10000});
  const off=await page.evaluate(()=>window.__BRIAR_GLENDebug.getArtV1ArchitectureState());if(off.requested||off.enabled)throw new Error(`artV1Architecture=0 rollback failed ${JSON.stringify(off)}`);
  await context.close();console.log('PASS art-v1 architecture rollback');
}finally{await browser.close();}
