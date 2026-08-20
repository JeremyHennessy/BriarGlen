import { chromium } from 'playwright';
import fs from 'node:fs';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const live=process.argv.includes('--live');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const views=[{name:'landscape',width:844,height:390},{name:'portrait',width:390,height:844}];
const scenes=[
  ['village-plaza',-650,20],
  ['village-east',-390,-150],
  ['transition',-135,0],
  ['meadow-west',80,0],
  ['meadow-mid',320,0],
  ['meadow-east',560,0],
];

async function load(page,url){
  let last;
  for(let i=0;i<(live?36:1);i++){
    try{
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
      await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getSceneCohesion49State&&window.__BRIAR_GLENDebug?.getLivingCast48State&&window.__BRIAR_GLENDebug?.getSourceArt47State),{timeout:8000});
      await page.waitForFunction(()=>{const d=window.__BRIAR_GLENDebug;return d.getSceneCohesion49State().ready&&d.getLivingCast48State().ready&&d.getSourceArt47State().ready;},{timeout:10000});
      return;
    }catch(e){last=e;if(live)await sleep(5000);}
  }
  throw last;
}

function between(value,min,max,label){if(!(value>=min&&value<=max))throw new Error(`${label} outside scale contract: ${value} not in [${min}, ${max}]`);}

try{
  for(const vp of views){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await load(page,`${target}${target.includes('?')?'&':'?'}cohesion49=${Date.now()}-${vp.name}`);
    let bundle=await page.evaluate(()=>({scene:window.__BRIAR_GLENDebug.getSceneCohesion49State(),cast:window.__BRIAR_GLENDebug.getLivingCast48State(),source:window.__BRIAR_GLENDebug.getSourceArt47State()}));
    let state=bundle.scene;
    if(!state.requested||!state.enabled||state.failed)throw new Error(`${vp.name}: Build49 cohesion inactive ${JSON.stringify(state)}`);
    if(state.source!=='assets/v49/hub-meadow-props.svg'||state.propCount!==18||state.villageProps!==8||state.meadowProps!==10)throw new Error(`${vp.name}: Build49 prop contract incorrect ${JSON.stringify(state)}`);
    if(state.laneSafetyViolations!==0||state.minLaneClearance<155)throw new Error(`${vp.name}: Build49 violates clear traversal/combat lane ${JSON.stringify(state)}`);
    if(!state.source47Enabled||!state.cast48Enabled)throw new Error(`${vp.name}: Build49 did not preserve Build47/48 stack ${JSON.stringify(state)}`);
    if(JSON.stringify(state.baseline)!==JSON.stringify(state.current))throw new Error(`${vp.name}: Build49 mutated gameplay entity counts ${JSON.stringify(state)}`);

    const world=bundle.source.scaleContract,cast=bundle.cast.scaleContract;
    if(!world||!cast)throw new Error(`${vp.name}: world/avatar scale contracts unavailable ${JSON.stringify(bundle)}`);
    const avatar=cast.wardenHeight;
    between(avatar,64,72,`${vp.name}: avatar nominal height`);
    between(cast.npcHeight/avatar,.90,1.05,`${vp.name}: NPC/avatar ratio`);
    between(cast.wolfHeight/avatar,.58,.78,`${vp.name}: wolf/avatar ratio`);
    between(cast.boarHeight/avatar,.66,.86,`${vp.name}: boar/avatar ratio`);
    between(cast.emberbackHeight/avatar,1.20,1.45,`${vp.name}: Emberback/avatar ratio`);
    between(world.cottageHeight/avatar,2.10,2.55,`${vp.name}: cottage/avatar ratio`);
    between(world.deciduousTreeHeight/avatar,2.10,2.55,`${vp.name}: deciduous tree/avatar ratio`);
    between(world.pineTreeHeight/avatar,2.10,2.60,`${vp.name}: pine/avatar ratio`);
    between(world.tavernHeight/avatar,2.30,2.70,`${vp.name}: tavern/avatar ratio`);
    between(world.forgeHeight/avatar,2.00,2.35,`${vp.name}: forge/avatar ratio`);
    between(world.alchemyHeight/avatar,2.10,2.45,`${vp.name}: alchemy/avatar ratio`);
    between(world.marketHeight/avatar,1.75,2.05,`${vp.name}: market/avatar ratio`);
    between(world.lampHeight/avatar,1.10,1.35,`${vp.name}: lamp/avatar ratio`);
    between(world.rockHeight/avatar,.72,.98,`${vp.name}: rock/avatar ratio`);
    if(bundle.source.densityContract?.genericTree>.55||bundle.source.densityContract?.bush>.50)throw new Error(`${vp.name}: repeated scenery density too high ${JSON.stringify(bundle.source.densityContract)}`);

    let scenesDrawn=0;
    for(const [name,x,y] of scenes){
      await page.evaluate(([px,py])=>window.__BRIAR_GLENDebug.teleport(px,py),[x,y]);
      await page.waitForTimeout(560);
      state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getSceneCohesion49State());
      if(state.frameDraws>0)scenesDrawn++;
      await page.screenshot({path:`artifacts/build49-cohesion-${vp.name}-${name}.png`});
    }
    bundle=await page.evaluate(()=>({scene:window.__BRIAR_GLENDebug.getSceneCohesion49State(),source:window.__BRIAR_GLENDebug.getSourceArt47State()}));
    state=bundle.scene;
    const seen=Object.entries(state.draws).filter(([,count])=>count>0).map(([name])=>name);
    if(scenesDrawn<5)throw new Error(`${vp.name}: Build49 source-prop scene coverage too low ${scenesDrawn}/6 ${JSON.stringify(state)}`);
    if(seen.length<7)throw new Error(`${vp.name}: Build49 source-prop diversity too low ${seen.length}/12 ${JSON.stringify(state.draws)}`);
    if(state.totalDraws<20)throw new Error(`${vp.name}: Build49 draw count too low ${state.totalDraws}`);
    if(bundle.source.totalSuppressed<1)throw new Error(`${vp.name}: reference-scale density guard did not suppress repeated scenery ${JSON.stringify(bundle.source)}`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors ${errors.join('; ')}`);
    console.log(`PASS ${vp.name}: Build49 reference-scale hub/meadow; ${scenesDrawn}/6 scenes; ${seen.length} prop identities; world/avatar ratios and lanes locked`);
    await context.close();
  }

  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true});
  const page=await context.newPage();
  await load(page,`${target}${target.includes('?')?'&':'?'}sceneCohesion49=0`);
  let off=await page.evaluate(()=>({scene:window.__BRIAR_GLENDebug.getSceneCohesion49State(),cast:window.__BRIAR_GLENDebug.getLivingCast48State(),source:window.__BRIAR_GLENDebug.getSourceArt47State()}));
  if(off.scene.requested||off.scene.enabled)throw new Error(`sceneCohesion49=0 did not disable Build49 ${JSON.stringify(off.scene)}`);
  if(!off.cast.enabled||!off.source.enabled)throw new Error(`sceneCohesion49=0 regressed Build47/48 layers ${JSON.stringify(off)}`);
  await context.close();

  const context2=await browser.newContext({viewport:{width:844,height:390},hasTouch:true});
  const page2=await context2.newPage();
  await load(page2,`${target}${target.includes('?')?'&':'?'}livingCast48=0`);
  off=await page2.evaluate(()=>({scene:window.__BRIAR_GLENDebug.getSceneCohesion49State(),source:window.__BRIAR_GLENDebug.getSourceArt47State()}));
  if(off.scene.enabled)throw new Error(`livingCast48=0 did not suppress Build49 ${JSON.stringify(off.scene)}`);
  if(!off.source.enabled)throw new Error(`livingCast48=0 incorrectly disabled Build47 environment ${JSON.stringify(off.source)}`);
  await context2.close();

  const context3=await browser.newContext({viewport:{width:844,height:390},hasTouch:true});
  const page3=await context3.newPage();
  await page3.goto(`${target}${target.includes('?')?'&':'?'}sourceArt47=0`,{waitUntil:'domcontentloaded',timeout:15000});
  await page3.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getSceneCohesion49State),{timeout:8000});
  const fullRollback=await page3.evaluate(()=>window.__BRIAR_GLENDebug.getSceneCohesion49State());
  if(fullRollback.enabled)throw new Error(`sourceArt47=0 did not suppress Build49 ${JSON.stringify(fullRollback)}`);
  await context3.close();
  console.log('PASS Build49 reference-scale rollback contracts');
}finally{
  await browser.close();
}
