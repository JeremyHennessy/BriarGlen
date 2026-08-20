import { chromium } from 'playwright';
import fs from 'node:fs';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const live=process.argv.includes('--live');
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const views=[{name:'landscape',width:844,height:390},{name:'portrait',width:390,height:844}];
const scenes=[['village',-650,-250],['meadow',320,0],['grove',600,-800],['fen',1500,-1700],['copper',1020,40],['den',1900,0],['stonepine',2800,-1500]];
const enemyAssets=['briar_wolf','hollow_boar','emberback','grovekeeper','mireling','bog_stalker','drowned_warden','ridgehorn','quarry_wisp','quarry_sentinel'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function load(page,url){let last;for(let i=0;i<(live?36:1);i++){try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getLivingCast48State&&window.__BRIAR_GLENDebug?.getSourceArt47State),{timeout:8000});await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getLivingCast48State().ready&&window.__BRIAR_GLENDebug.getSourceArt47State().ready,{timeout:10000});return;}catch(e){last=e;if(live)await sleep(5000);}}throw last;}

try{
  for(const vp of views){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await load(page,`${target}${target.includes('?')?'&':'?'}cast48=${Date.now()}-${vp.name}`);
    let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getLivingCast48State());
    if(!state.requested||!state.enabled||state.failed)throw new Error(`${vp.name}: living cast inactive ${JSON.stringify(state)}`);
    if(state.uniqueEnemyAssets!==10||state.source!=='assets/v48/living-cast.svg')throw new Error(`${vp.name}: cast manifest incomplete ${JSON.stringify(state)}`);
    if(JSON.stringify(state.baseline)!==JSON.stringify(state.current))throw new Error(`${vp.name}: cast mutated entity counts`);
    for(const [name,x,y] of scenes){await page.evaluate(([px,py])=>window.__BRIAR_GLENDebug.teleport(px,py),[x,y]);await page.waitForTimeout(560);await page.screenshot({path:`artifacts/build48-cast-${vp.name}-${name}.png`});}
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getLivingCast48State());
    if((state.draws.warden||0)<1)throw new Error(`${vp.name}: player source sprite did not render ${JSON.stringify(state.draws)}`);
    const seen=enemyAssets.filter(n=>(state.draws[n]||0)>0);
    if(seen.length<8)throw new Error(`${vp.name}: unique enemy source coverage too low ${seen.length}/10 ${JSON.stringify(state.draws)}`);
    if(state.totalDraws<20)throw new Error(`${vp.name}: living-cast draw count too low ${state.totalDraws}`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors ${errors.join('; ')}`);
    console.log(`PASS ${vp.name}: living cast source art active; ${seen.length}/10 unique enemy identities observed`);
    await context.close();
  }

  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true});
  const page=await context.newPage();
  await load(page,`${target}${target.includes('?')?'&':'?'}livingCast48=0`);
  const off=await page.evaluate(()=>({cast:window.__BRIAR_GLENDebug.getLivingCast48State(),source:window.__BRIAR_GLENDebug.getSourceArt47State()}));
  if(off.cast.requested||off.cast.enabled)throw new Error(`livingCast48=0 did not restore prior cast ${JSON.stringify(off.cast)}`);
  if(!off.source.enabled)throw new Error(`livingCast48=0 incorrectly disabled Build47 environment ${JSON.stringify(off.source)}`);
  await context.close();

  const context2=await browser.newContext({viewport:{width:844,height:390},hasTouch:true});
  const page2=await context2.newPage();
  await page2.goto(`${target}${target.includes('?')?'&':'?'}sourceArt47=0`,{waitUntil:'domcontentloaded',timeout:15000});
  await page2.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getLivingCast48State),{timeout:8000});
  const fullRollback=await page2.evaluate(()=>window.__BRIAR_GLENDebug.getLivingCast48State());
  if(fullRollback.enabled)throw new Error(`sourceArt47=0 did not suppress Build48 cast ${JSON.stringify(fullRollback)}`);
  await context2.close();
  console.log('PASS Build48 living cast rollback contracts');
}finally{await browser.close();}
