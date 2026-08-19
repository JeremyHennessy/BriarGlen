import { chromium } from 'playwright';
import fs from 'node:fs';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const live=process.argv.includes('--live');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});

const shots=[
  ['village',-650,30],
  ['meadow-grove-fork',150,-250],
  ['mooncap-grove',650,-790],
  ['copper-hollow',1030,0],
  ['emberback-den',1900,0],
  ['mosswater-fen',1450,-1690],
  ['stonepine-camp',2690,-1365],
  ['quarry-sentinel',3190,-1840],
];

function withParam(url,key,value){const sep=url.includes('?')?'&':'?';return `${url}${sep}${key}=${encodeURIComponent(value)}`;}

async function open(vp,query=''){
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
  page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
  let url=target;
  if(query) url=withParam(url,query.split('=')[0],query.split('=').slice(1).join('='));
  url=withParam(url,'layoutProof',`${Date.now()}-${vp.name}`);
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getWorldLayoutV2State),{timeout:7000});
  return {context,page,errors};
}

try{
  for(const vp of [{name:'phone-landscape',width:932,height:430},{name:'phone-portrait',width:430,height:932}]){
    const {context,page,errors}=await open(vp);
    await sleep(450);
    const state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getWorldLayoutV2State());
    if(!state.enabled||state.version!=='world-layout-v2'||state.style!=='hub-loops-branches-v2')throw new Error(`${vp.name}: layout not active ${JSON.stringify(state)}`);
    if(JSON.stringify(state.baseline)!==JSON.stringify(state.current))throw new Error(`${vp.name}: layout mutated entity counts ${JSON.stringify(state)}`);
    if(state.routes.length<10||state.decorRepositioned<80||!state.mapSvgUpdated)throw new Error(`${vp.name}: layout coverage incomplete ${JSON.stringify(state)}`);
    if(state.metrics.primaryLane[0]<160||state.metrics.enemyRespawnSuppressRadius<280)throw new Error(`${vp.name}: layout metrics missing ${JSON.stringify(state.metrics)}`);
    for(const key of ['tavern','well','board','forge','alchemy','merchant','groveSign','fenGate','stonepineGate','stonepineCamp'])if(!state.anchors[key])throw new Error(`${vp.name}: missing anchor ${key}`);
    const generated=await page.evaluate(()=>window.__BRIAR_GLENDebug.getGeneratedArtState?.());
    const dressing=await page.evaluate(()=>window.__BRIAR_GLENDebug.getGeneratedDressingState?.());
    if(!generated?.enabled||!generated?.ready||!dressing?.enabled)throw new Error(`${vp.name}: generated visual stack inactive`);

    if(vp.name==='phone-landscape'){
      await page.evaluate(()=>window.__BRIAR_GLENDebug.setProgress({fenCrossingOpened:true,fenDiscovered:true,fenWardenDefeated:true,fenCacheClaimed:true,stonepinePassOpened:true,stonepineDiscovered:true}));
      for(const [name,x,y] of shots){
        await page.evaluate(([tx,ty])=>window.__BRIAR_GLENDebug.teleport(tx,ty),[x,y]);
        await sleep(360);
        await page.screenshot({path:`artifacts/world-layout-v2-${name}.png`,fullPage:false});
      }
    }

    // Allow an ambient actor cycle and verify it never changes world entity counts.
    await page.waitForTimeout(4700);
    const alive=await page.evaluate(()=>window.__BRIAR_GLENDebug.getWorldLayoutV2State());
    if(JSON.stringify(alive.baseline)!==JSON.stringify(alive.current))throw new Error(`${vp.name}: living-world layer mutated entities`);
    if(alive.npcIdles<1)throw new Error(`${vp.name}: NPC idle cadence never engaged ${JSON.stringify(alive)}`);
    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: layout caused browser overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: ${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: World Layout V2 topology + living-world pacing active`);
    await context.close();
  }

  for(const query of ['layoutV1=1','canvasArt=1','artScope=build30']){
    const {context,page,errors}=await open({name:'rollback',width:932,height:430},query);
    await sleep(220);
    const state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getWorldLayoutV2State());
    if(state.enabled||state.decorRepositioned!==0||state.mapSvgUpdated)throw new Error(`${query}: historical layout rollback failed ${JSON.stringify(state)}`);
    if(errors.length)throw new Error(`${query}: ${errors.join('\n')}`);
    console.log(`PASS layout rollback: ${query}`);
    await context.close();
  }

  if(live) console.log('PASS live World Layout V2 proof');
}finally{await browser.close();}
