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

try{
  for(const vp of views){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await load(page,`${target}${target.includes('?')?'&':'?'}cohesion49=${Date.now()}-${vp.name}`);
    let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getSceneCohesion49State());
    if(!state.requested||!state.enabled||state.failed)throw new Error(`${vp.name}: Build49 cohesion inactive ${JSON.stringify(state)}`);
    if(state.source!=='assets/v49/hub-meadow-props.svg'||state.propCount!==18||state.villageProps!==8||state.meadowProps!==10)throw new Error(`${vp.name}: Build49 prop contract incorrect ${JSON.stringify(state)}`);
    if(state.laneSafetyViolations!==0||state.minLaneClearance<155)throw new Error(`${vp.name}: Build49 violates clear traversal/combat lane ${JSON.stringify(state)}`);
    if(!state.source47Enabled||!state.cast48Enabled)throw new Error(`${vp.name}: Build49 did not preserve Build47/48 stack ${JSON.stringify(state)}`);
    if(JSON.stringify(state.baseline)!==JSON.stringify(state.current))throw new Error(`${vp.name}: Build49 mutated gameplay entity counts ${JSON.stringify(state)}`);

    let scenesDrawn=0;
    for(const [name,x,y] of scenes){
      await page.evaluate(([px,py])=>window.__BRIAR_GLENDebug.teleport(px,py),[x,y]);
      await page.waitForTimeout(520);
      state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getSceneCohesion49State());
      if(state.frameDraws>0)scenesDrawn++;
      await page.screenshot({path:`artifacts/build49-cohesion-${vp.name}-${name}.png`});
    }
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getSceneCohesion49State());
    const seen=Object.entries(state.draws).filter(([,count])=>count>0).map(([name])=>name);
    if(scenesDrawn<5)throw new Error(`${vp.name}: Build49 source-prop scene coverage too low ${scenesDrawn}/6 ${JSON.stringify(state)}`);
    if(seen.length<7)throw new Error(`${vp.name}: Build49 source-prop diversity too low ${seen.length}/12 ${JSON.stringify(state.draws)}`);
    if(state.totalDraws<20)throw new Error(`${vp.name}: Build49 draw count too low ${state.totalDraws}`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors ${errors.join('; ')}`);
    console.log(`PASS ${vp.name}: Build49 hub/meadow cohesion active; ${scenesDrawn}/6 scenes; ${seen.length} prop identities; lanes clear`);
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
  console.log('PASS Build49 cohesion rollback contracts');
}finally{
  await browser.close();
}
