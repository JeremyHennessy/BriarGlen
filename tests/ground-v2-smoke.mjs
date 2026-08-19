import { chromium } from 'playwright';
import fs from 'node:fs';

const target=process.argv[2]||'http://127.0.0.1:4173/';
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const views=[{name:'landscape',width:844,height:390},{name:'portrait',width:390,height:844}];
const regions=[['village',-650,-250],['meadow',350,0],['grove',600,-800],['fen',1500,-1700],['copper',1000,40],['den',1900,0],['stonepine',2800,-1500]];
try{
  for(const vp of views){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,deviceScaleFactor:1});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(`${target}${target.includes('?')?'&':'?'}ground46=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug?.getGroundV2State?.().ready,{timeout:5000});
    let s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getGroundV2State());
    if(!s.requested||!s.enabled||s.failed||s.assetCount!==49)throw new Error(`${vp.name}: Ground V2 not ready ${JSON.stringify(s)}`);
    if(JSON.stringify(s.baseline)!==JSON.stringify(s.current))throw new Error(`${vp.name}: entity counts changed ${JSON.stringify(s)}`);
    for(const [name,x,y] of regions){
      await page.evaluate(([x,y])=>window.__BRIAR_GLENDebug.teleport(x,y),[x,y]);
      await page.waitForTimeout(420);
      s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getGroundV2State());
      if(s.frameChunks<1||s.frameCells<64)throw new Error(`${vp.name}/${name}: ground chunks missing ${JSON.stringify(s)}`);
      if(s.activeCache>s.maxCache)throw new Error(`${vp.name}/${name}: cache exceeded limit ${JSON.stringify(s)}`);
      await page.screenshot({path:`artifacts/ground46-${vp.name}-${name}.png`});
    }
    if(errors.length)throw new Error(`${vp.name}: runtime errors ${errors.join('; ')}`);
    console.log(`PASS ${vp.name}: Ground V2 49 assets, ${s.activeCache}/${s.maxCache} cached chunks`);
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true});const page=await context.newPage();
  await page.goto(`${target}${target.includes('?')?'&':'?'}groundV2=0`,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getGroundV2State));
  const off=await page.evaluate(()=>window.__BRIAR_GLENDebug.getGroundV2State());
  if(off.requested||off.enabled)throw new Error(`groundV2=0 rollback failed ${JSON.stringify(off)}`);
  await context.close();console.log('PASS Ground V2 rollback');
}finally{await browser.close();}
