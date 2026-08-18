import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function openMode(mode){
  const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:false,deviceScaleFactor:1});
  const page=await context.newPage();
  await page.goto(`${target}?rasterScreeProbe=${mode}-${Date.now()}`,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getStonepineState&&window.__BRIAR_GLENDebug?.getCharacterArtState),{timeout:7000});
  await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getCharacterArtState();return s.ready||s.failed;},{timeout:9000});
  if(mode==='disabled'){
    await page.evaluate(()=>window.__BRIAR_GLENDebug.setCharacterArtEnabled(false));
    await sleep(180);
  }
  return {context,page};
}

async function sampleMode(mode){
  const {context,page}=await openMode(mode);
  const setup=await page.evaluate(()=>{
    const d=window.__BRIAR_GLENDebug;
    d.teleport(-720,40);
    d.setPlayer({hp:100,maxHp:100,invuln:0});
    const before=d.getStonepineState().counters.screeHits;
    const triggered=d.triggerStonepineScree(0);
    return {before,triggered,player:d.getState().player,stone:d.getStonepineState(),cast:d.getCharacterArtState()};
  });
  const samples=[];
  let prior=0;
  for(const elapsed of [0,250,500,800,1200,2000,4000,8000]){
    if(elapsed>prior)await sleep(elapsed-prior);
    prior=elapsed;
    const snapshot=await page.evaluate(()=>({player:window.__BRIAR_GLENDebug.getState().player,stone:window.__BRIAR_GLENDebug.getStonepineState(),cast:window.__BRIAR_GLENDebug.getCharacterArtState()}));
    samples.push({elapsed,hp:snapshot.player.hp,screeHits:snapshot.stone.counters.screeHits,field:snapshot.stone.scree[0],playerDraws:snapshot.cast.playerDraws,enemyDraws:snapshot.cast.enemyDraws,enabled:snapshot.cast.enabled});
  }
  await context.close();
  return {mode,setup:{before:setup.before,triggered:setup.triggered,field:setup.stone.scree[0],castEnabled:setup.cast.enabled},samples};
}

try{
  const enabled=await sampleMode('enabled');
  const disabled=await sampleMode('disabled');
  console.log(`STONEPINE_SCREE_RASTER_CACHE_TIMELINE ${JSON.stringify({enabled,disabled})}`);
  const enabledHit=enabled.samples.find(s=>s.screeHits>=1)?.elapsed ?? null;
  const disabledHit=disabled.samples.find(s=>s.screeHits>=1)?.elapsed ?? null;
  if(enabledHit===null||disabledHit===null)throw new Error(`scree event failed to complete ${JSON.stringify({enabledHit,disabledHit})}`);
  console.log(`PASS desktop: raster-cached cast scree hit by ${enabledHit}ms; disabled hit by ${disabledHit}ms`);
}finally{await browser.close();}
