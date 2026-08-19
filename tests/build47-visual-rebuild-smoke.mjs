import { chromium } from 'playwright';
import fs from 'node:fs';

const target=process.argv[2]||'http://127.0.0.1:4173/';
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const views=[{name:'landscape',width:844,height:390},{name:'portrait',width:390,height:844}];
const regions=[['village',-650,-250],['meadow',320,0],['grove',600,-800],['fen',1500,-1700],['copper',1020,40],['den',1900,0],['stonepine',2800,-1500]];

try{
  for(const vp of views){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,deviceScaleFactor:1});
    const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(`${target}${target.includes('?')?'&':'?'}build47rebuild=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getSourceArt47State&&window.__BRIAR_GLENDebug?.getSourceArt47LayerGuard&&window.__BRIAR_GLENDebug?.getGroundV2State),{timeout:8000});
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getSourceArt47State().ready&&window.__BRIAR_GLENDebug.getGroundV2State().ready,{timeout:10000});
    let s=await page.evaluate(()=>({
      source:window.__BRIAR_GLENDebug.getSourceArt47State(),
      guard:window.__BRIAR_GLENDebug.getSourceArt47LayerGuard(),
      ground:window.__BRIAR_GLENDebug.getGroundV2State(),
      dressing:window.__BRIAR_GLENDebug.getGeneratedDressingState?.(),
      variants:window.__BRIAR_GLENDebug.getAssetVariantState?.(),
      props:window.__BRIAR_GLENDebug.getRegionalPropState?.(),
      landmark:window.__BRIAR_GLENDebug.getLandmarkStatePolish?.(),
      env:window.__BRIAR_GLENDebug.getEnvironment46State?.(),
      terrain:window.__BRIAR_GLENDebug.getTerrainPolish46State?.(),
    }));
    if(!s.source.requested||!s.source.enabled||s.source.failed)throw new Error(`${vp.name}: Build47 source layer inactive ${JSON.stringify(s.source)}`);
    if(!s.guard.legacyLayersSuppressed||!s.guard.sourceEnabled)throw new Error(`${vp.name}: overlap guard inactive ${JSON.stringify(s.guard)}`);
    if(s.ground.sourceMode!=='build47-physical-tiles'||s.ground.physicalTileCount!==21||!s.ground.enabled)throw new Error(`${vp.name}: physical terrain not active ${JSON.stringify(s.ground)}`);
    for(const [name,layer] of Object.entries({dressing:s.dressing,variants:s.variants,props:s.props,landmark:s.landmark,env:s.env,terrain:s.terrain})){
      if(layer?.enabled)throw new Error(`${vp.name}: legacy ${name} layer still stacking ${JSON.stringify(layer)}`);
    }
    if(JSON.stringify(s.source.baseline)!==JSON.stringify(s.source.current))throw new Error(`${vp.name}: source layer mutated entity counts`);
    let last=s.source.totalDraws,regionsDrawn=0;
    for(const [name,x,y] of regions){
      await page.evaluate(([px,py])=>window.__BRIAR_GLENDebug.teleport(px,py),[x,y]);
      await page.waitForTimeout(520);
      s=await page.evaluate(()=>({source:window.__BRIAR_GLENDebug.getSourceArt47State(),ground:window.__BRIAR_GLENDebug.getGroundV2State()}));
      if(s.ground.frameChunks<1||s.ground.frameCells<64)throw new Error(`${vp.name}/${name}: terrain cache not drawing ${JSON.stringify(s.ground)}`);
      if(s.source.totalDraws>last)regionsDrawn++;last=s.source.totalDraws;
      await page.screenshot({path:`artifacts/build47-rebuild-${vp.name}-${name}.png`});
    }
    if(regionsDrawn<6)throw new Error(`${vp.name}: source-art coverage too low ${regionsDrawn}/7`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors ${errors.join('; ')}`);
    console.log(`PASS ${vp.name}: physical terrain + scale-correct source art, ${regionsDrawn}/7 regions, legacy overlap layers suppressed`);
    await context.close();
  }

  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true});
  const page=await context.newPage();
  await page.goto(`${target}${target.includes('?')?'&':'?'}sourceArt47=0`,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getSourceArt47State&&window.__BRIAR_GLENDebug?.getSourceArt47LayerGuard&&window.__BRIAR_GLENDebug?.getGroundV2State),{timeout:8000});
  const off=await page.evaluate(()=>({source:window.__BRIAR_GLENDebug.getSourceArt47State(),guard:window.__BRIAR_GLENDebug.getSourceArt47LayerGuard(),ground:window.__BRIAR_GLENDebug.getGroundV2State()}));
  if(off.source.requested||off.source.enabled)throw new Error(`sourceArt47=0 did not disable source layer ${JSON.stringify(off)}`);
  if(off.guard.legacyLayersSuppressed)throw new Error(`sourceArt47=0 did not restore legacy layer gate ${JSON.stringify(off)}`);
  if(off.ground.sourceMode!=='build46-procedural'||off.ground.physicalTileCount!==0)throw new Error(`sourceArt47=0 did not restore Build46 ground ${JSON.stringify(off.ground)}`);
  await context.close();
  console.log('PASS Build47 visual rebuild rollback');
}finally{await browser.close();}
