import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function trigger(page,label){
  const before=await page.evaluate(()=>{
    const d=window.__BRIAR_GLENDebug;
    d.teleport(-720,40);
    d.setPlayer({hp:100,maxHp:100,invuln:0});
    const before=d.getStonepineState().counters.screeHits;
    d.triggerStonepineScree(0);
    return before;
  });
  const start=Date.now();
  await page.waitForFunction(expected=>window.__BRIAR_GLENDebug.getStonepineState().counters.screeHits>=expected,before+1,{timeout:15000});
  const elapsed=Date.now()-start;
  const state=await page.evaluate(()=>({
    player:window.__BRIAR_GLENDebug.getState().player,
    stone:window.__BRIAR_GLENDebug.getStonepineState(),
    cast:window.__BRIAR_GLENDebug.getCharacterArtState(),
  }));
  if(state.stone.counters.screeHits!==before+1||state.player.hp!==87)throw new Error(`${label}: scree parity failed ${JSON.stringify({before,elapsed,state})}`);
  await sleep(250);
  return elapsed;
}

try{
  const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:false,deviceScaleFactor:1});
  const page=await context.newPage();
  await page.goto(`${target}?screeCastProbe=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getStonepineState&&window.__BRIAR_GLENDebug?.getCharacterArtState),{timeout:7000});
  await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getCharacterArtState();return s.ready||s.failed;},{timeout:9000});
  const initial=await page.evaluate(()=>window.__BRIAR_GLENDebug.getCharacterArtState());
  if(!initial.ready||!initial.enabled||initial.failed)throw new Error(`Living Cast did not initialize ${JSON.stringify(initial)}`);

  const enabled=[];
  for(let i=0;i<3;i++)enabled.push(await trigger(page,`cast-enabled-${i+1}`));

  const disabledState=await page.evaluate(()=>{
    const d=window.__BRIAR_GLENDebug;
    d.setCharacterArtEnabled(false);
    return d.getCharacterArtState();
  });
  if(disabledState.enabled)throw new Error(`Living Cast debug disable failed ${JSON.stringify(disabledState)}`);
  await sleep(200);
  const disabled=[];
  for(let i=0;i<3;i++)disabled.push(await trigger(page,`cast-disabled-${i+1}`));

  console.log(`STONEPINE_SCREE_CAST_PROBE ${JSON.stringify({enabled,disabled})}`);
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const enabledAvg=avg(enabled),disabledAvg=avg(disabled);
  console.log(`PASS desktop: scree exact 13-damage event; cast enabled avg=${enabledAvg.toFixed(1)}ms disabled avg=${disabledAvg.toFixed(1)}ms`);
  await context.close();
}finally{await browser.close();}
