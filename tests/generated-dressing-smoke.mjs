import { chromium } from 'playwright';
import fs from 'node:fs';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
fs.mkdirSync('artifacts',{recursive:true});
const browser = await chromium.launch({headless:true});

async function open(query='') {
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
  page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
  const sep=target.includes('?')?'&':'?';
  await page.goto(`${target}${sep}${query?`${query}&`:''}dressing=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getGeneratedDressingState),{timeout:7000});
  return {context,page,errors};
}

try {
  {
    const {context,page,errors}=await open();
    await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getGeneratedDressingState();return s.ready||s.failed;},{timeout:7000});
    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(-650,-250));
    await page.waitForTimeout(700);
    let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getGeneratedDressingState());
    if(state.failed||!state.enabled||!state.ready)throw new Error(`dressing inactive ${JSON.stringify(state)}`);
    if(JSON.stringify(state.baseline)!==JSON.stringify(state.current))throw new Error(`dressing mutated gameplay entities ${JSON.stringify(state)}`);
    for(const asset of ['crate','barrel','sack','log_pile','bench']) if(!(state.assets[asset]>0)) throw new Error(`missing town dressing ${asset}: ${JSON.stringify(state.assets)}`);
    await page.screenshot({path:'artifacts/generated-art-dressing-town.png',fullPage:false});

    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(2690,-1365));
    await page.waitForTimeout(650);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getGeneratedDressingState());
    if(!(state.assets.campfire>0) || !(state.assets.log_pile>0)) throw new Error(`Stonepine camp dressing missing ${JSON.stringify(state.assets)}`);
    await page.screenshot({path:'artifacts/generated-art-dressing-stonepine.png',fullPage:false});
    if(errors.length)throw new Error(errors.join('\n'));
    console.log(`PASS generated dressing: ${state.totalDraws} draws; gameplay entity counts unchanged`);
    await context.close();
  }
  for(const query of ['generatedArt=0','canvasArt=1','artScope=build30']){
    const {context,page,errors}=await open(query);
    await page.waitForTimeout(250);
    const state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getGeneratedDressingState());
    if(state.enabled||state.frameDraws!==0)throw new Error(`${query}: dressing should be inactive ${JSON.stringify(state)}`);
    if(errors.length)throw new Error(`${query}: ${errors.join('\n')}`);
    console.log(`PASS dressing rollback: ${query}`);
    await context.close();
  }
} finally { await browser.close(); }
