import { chromium } from 'playwright';
import fs from 'node:fs';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const live=process.argv.includes('--live');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync('artifacts',{recursive:true});

const viewports=[
  {name:'phone-landscape',width:932,height:430,touch:true},
  {name:'phone-portrait',width:430,height:932,touch:true},
  {name:'desktop',width:1440,height:900,touch:false},
];
const regions=[
  ['village',-650,-250],['meadow',320,0],['grove',600,-800],['fen',1500,-1700],
  ['copper',1020,40],['den',1900,0],['stonepine',2800,-1500],
];
const browser=await chromium.launch({headless:true});

async function load(page,url){
  let last;
  for(let attempt=1;attempt<=(live?48:1);attempt++){
    try{
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
      await page.waitForFunction(()=>Boolean(
        window.__BRIAR_GLENDebug?.getSourceArt47State&&
        window.__BRIAR_GLENDebug?.getLivingCast48State&&
        window.__BRIAR_GLENDebug?.getSceneCohesion49State&&
        window.__BRIAR_GLENDebug?.getGroundV2State&&
        window.__BRIAR_GLENDebug?.getRuntimeArchitectureState&&
        window.__BRIAR_GLENDebug?.getBuildInfo
      ),{timeout:8000});
      await page.waitForFunction(()=>{
        const d=window.__BRIAR_GLENDebug;
        return d.getSourceArt47State().ready&&d.getLivingCast48State().ready&&d.getSceneCohesion49State().ready&&d.getGroundV2State().ready;
      },{timeout:10000});
      return;
    }catch(error){last=error;if(live&&attempt<48)await sleep(5000);}
  }
  throw last;
}

function ratio(value,basis=68){return value/basis;}

try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    await context.addInitScript(()=>{
      localStorage.removeItem('briar-glen-vslice-v1');
      localStorage.removeItem('briar-glen-onboarding-v1');
      localStorage.removeItem('briar-glen-context-guide-v37');
      localStorage.removeItem('briar-glen-run-metrics-v1');
      localStorage.removeItem('briar-glen-vertical-slice-complete-v1');
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    await load(page,`${target}${target.includes('?')?'&':'?'}accept50=${Date.now()}-${vp.name}`);

    let s=await page.evaluate(()=>{
      const d=window.__BRIAR_GLENDebug;
      return {
        build:d.getBuildInfo(),runtime:d.getRuntimeArchitectureState(),source:d.getSourceArt47State(),
        cast:d.getLivingCast48State(),scene:d.getSceneCohesion49State(),ground:d.getGroundV2State(),
      };
    });

    if(s.build.saveKey!=='briar-glen-vslice-v1'||s.build.schema!==1)throw new Error(`${vp.name}: save/runtime identity changed ${JSON.stringify(s.build)}`);
    if(s.runtime.manifestId!=='briar-glen-runtime-v20.1'||s.runtime.legacyLoaderScriptCount!==0)throw new Error(`${vp.name}: canonical runtime regressed ${JSON.stringify(s.runtime)}`);
    if(s.source.version!=='build49-world-scale-reset-v1'||!s.source.enabled||s.source.failed)throw new Error(`${vp.name}: reference-scale source layer inactive ${JSON.stringify(s.source)}`);
    if(s.cast.version!=='build49-reference-scale-cast-v1'||!s.cast.enabled||s.cast.failed||s.cast.uniqueEnemyAssets!==10)throw new Error(`${vp.name}: reference-scale living-cast contract regressed ${JSON.stringify(s.cast)}`);
    if(!s.scene.enabled||s.scene.failed||s.scene.laneSafetyViolations!==0||s.scene.minLaneClearance<155)throw new Error(`${vp.name}: scene-cohesion/lane contract regressed ${JSON.stringify(s.scene)}`);
    if(s.ground.sourceMode!=='build47-physical-tiles'||s.ground.physicalTileCount!==21||!s.ground.enabled)throw new Error(`${vp.name}: physical terrain contract regressed ${JSON.stringify(s.ground)}`);
    for(const layer of [s.source,s.cast,s.scene]){
      if(JSON.stringify(layer.baseline)!==JSON.stringify(layer.current))throw new Error(`${vp.name}: presentation layer mutated gameplay entities ${JSON.stringify(layer)}`);
    }

    const castScale=s.cast.scaleContract||{};
    if(castScale.wardenHeight!==68||castScale.npcHeight>68||castScale.wolfHeight>=68||castScale.boarHeight>=68||castScale.emberbackHeight<=68||castScale.quarrySentinelHeight<=68)throw new Error(`${vp.name}: cast/avatar scale family regressed ${JSON.stringify(castScale)}`);

    const c=s.source.scaleContract||{};
    const scaleChecks={
      cottage:ratio(c.cottageHeight),deciduous:ratio(c.deciduousTreeHeight),pine:ratio(c.pineTreeHeight),
      tavern:ratio(c.tavernHeight),forge:ratio(c.forgeHeight),alchemy:ratio(c.alchemyHeight),market:ratio(c.marketHeight),
    };
    if(scaleChecks.cottage<2.0||scaleChecks.cottage>2.35||scaleChecks.deciduous<2.0||scaleChecks.deciduous>2.35||scaleChecks.pine<2.0||scaleChecks.pine>2.35)throw new Error(`${vp.name}: avatar/world scenery ratio outside locked family ${JSON.stringify(scaleChecks)}`);
    if(scaleChecks.tavern<2.3||scaleChecks.tavern>2.6||scaleChecks.forge<1.95||scaleChecks.forge>2.2||scaleChecks.alchemy<2.1||scaleChecks.alchemy>2.4||scaleChecks.market<1.7||scaleChecks.market>2.0)throw new Error(`${vp.name}: avatar/service ratio outside locked family ${JSON.stringify(scaleChecks)}`);
    if((s.source.densityContract?.genericTree??1)>.55||(s.source.densityContract?.bush??1)>.50)throw new Error(`${vp.name}: density reset no longer protects open gameplay space ${JSON.stringify(s.source.densityContract)}`);

    for(const [name,x,y] of regions){
      await page.evaluate(([px,py])=>window.__BRIAR_GLENDebug.teleport(px,py),[x,y]);
      await page.waitForTimeout(480);
      await page.screenshot({path:`artifacts/build50-acceptance-${vp.name}-${name}.png`});
    }
    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: browser overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: final presentation stack + locked world scale + 7-region visual acceptance`);
    await context.close();

    const returning=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    await returning.addInitScript(()=>{
      localStorage.setItem('briar-glen-vslice-v1',JSON.stringify({player:{x:-720,y:30,hp:100,coins:100,inventory:{}},progress:{step:1}}));
      localStorage.setItem('briar-glen-onboarding-v1',JSON.stringify({stage:'done',complete:true,skipped:false}));
      localStorage.setItem('briar-glen-context-guide-v37',JSON.stringify({move:true,dodge:true}));
    });
    const returningPage=await returning.newPage();
    await load(returningPage,`${target}${target.includes('?')?'&':'?'}accept50return=${Date.now()}-${vp.name}`);
    await returningPage.waitForFunction(()=>window.__BRIAR_GLENDebug?.getOnboardingState?.().startOpen===true,{timeout:7000});
    const continueButton=returningPage.locator('#onboarding21-continue');
    if(!(await continueButton.isVisible()))throw new Error(`${vp.name}: returning-save Continue control unavailable`);
    await continueButton.click();
    await returningPage.waitForFunction(()=>window.__BRIAR_GLENDebug?.getOnboardingState?.().startOpen===false,{timeout:7000});
    const saved=await returningPage.evaluate(()=>JSON.parse(localStorage.getItem('briar-glen-vslice-v1')||'null'));
    if(!saved?.player||!saved?.progress||saved.progress.step<1)throw new Error(`${vp.name}: returning save failed compatibility load ${JSON.stringify(saved)}`);
    const layers=await returningPage.evaluate(()=>({source:window.__BRIAR_GLENDebug.getSourceArt47State(),cast:window.__BRIAR_GLENDebug.getLivingCast48State(),scene:window.__BRIAR_GLENDebug.getSceneCohesion49State()}));
    if(!layers.source.enabled||!layers.cast.enabled||!layers.scene.enabled)throw new Error(`${vp.name}: returning save disabled final presentation stack ${JSON.stringify(layers)}`);
    console.log(`PASS ${vp.name}: returning-save compatibility under final presentation stack`);
    await returning.close();
  }
}finally{
  await browser.close();
}
