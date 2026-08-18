import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function sampleMode(mode){
  const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:false,deviceScaleFactor:1});
  const page=await context.newPage();
  await page.goto(`${target}?cullScreeProbe=${mode}-${Date.now()}`,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getStonepineState&&window.__BRIAR_GLENDebug?.getCharacterArtState),{timeout:7000});
  await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getCharacterArtState();return s.ready||s.failed;},{timeout:9000});
  if(mode==='disabled'){
    await page.evaluate(()=>window.__BRIAR_GLENDebug.setCharacterArtEnabled(false));
    await sleep(180);
  }
  const setup=await page.evaluate(()=>{
    const d=window.__BRIAR_GLENDebug;
    d.teleport(-720,40);
    d.setPlayer({hp:100,maxHp:100,invuln:0});
    const before=d.getStonepineState().counters.screeHits;
    const triggered=d.triggerStonepineScree(0);
    return {before,triggered,cast:d.getCharacterArtState()};
  });
  const samples=[];
  let prior=0;
  for(const elapsed of [0,250,500,800,1200,2000,3000,4000,6000]){
    if(elapsed>prior)await sleep(elapsed-prior);
    prior=elapsed;
    const snapshot=await page.evaluate(()=>({player:window.__BRIAR_GLENDebug.getState().player,stone:window.__BRIAR_GLENDebug.getStonepineState(),cast:window.__BRIAR_GLENDebug.getCharacterArtState()}));
    samples.push({elapsed,hp:snapshot.player.hp,screeHits:snapshot.stone.counters.screeHits,timer:snapshot.stone.scree[0]?.active?.timer ?? null,playerDraws:snapshot.cast.playerDraws,enemyDraws:snapshot.cast.enemyDraws,enemyCulled:snapshot.cast.enemyCulled||0,enabled:snapshot.cast.enabled});
    if(snapshot.stone.counters.screeHits>=setup.before+1) break;
  }
  const final=await page.evaluate(()=>({player:window.__BRIAR_GLENDebug.getState().player,stone:window.__BRIAR_GLENDebug.getStonepineState(),cast:window.__BRIAR_GLENDebug.getCharacterArtState()}));
  await context.close();
  return {mode,setup:{before:setup.before,triggered:setup.triggered,enabled:setup.cast.enabled},samples,final:{hp:final.player.hp,screeHits:final.stone.counters.screeHits,playerDraws:final.cast.playerDraws,enemyDraws:final.cast.enemyDraws,enemyCulled:final.cast.enemyCulled||0}};
}

try{
  const enabled=await sampleMode('enabled');
  const disabled=await sampleMode('disabled');
  console.log(`STONEPINE_SCREE_VIEWPORT_CULL_TIMELINE ${JSON.stringify({enabled,disabled})}`);
  const enabledHit=enabled.samples.find(s=>s.screeHits>=1)?.elapsed ?? null;
  const disabledHit=disabled.samples.find(s=>s.screeHits>=1)?.elapsed ?? null;
  if(enabledHit===null||disabledHit===null)throw new Error(`scree event failed to complete ${JSON.stringify({enabledHit,disabledHit})}`);
  if(enabled.final.hp!==87||disabled.final.hp!==87)throw new Error(`exact scree damage parity failed ${JSON.stringify({enabled:enabled.final,disabled:disabled.final})}`);
  console.log(`PASS desktop: viewport-cull cast scree hit by ${enabledHit}ms; disabled hit by ${disabledHit}ms; culled=${enabled.final.enemyCulled}`);
}finally{await browser.close();}
