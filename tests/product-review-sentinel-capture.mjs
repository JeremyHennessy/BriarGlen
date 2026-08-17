import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const target=process.argv[2]||'http://127.0.0.1:4173/';
const root=path.resolve('test-artifacts/product-review-sentinel');fs.mkdirSync(root,{recursive:true});
const viewports=[{name:'phone-landscape',width:932,height:430,touch:true},{name:'phone-portrait',width:430,height:932,touch:true},{name:'desktop',width:1440,height:900,touch:false}];
const browser=await chromium.launch({headless:true});
try{
 for(const vp of viewports){
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
  const page=await context.newPage();
  const sep=target.includes('?')?'&':'?';
  await page.goto(`${target}${sep}sentinelReview=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getStonepineState&&window.__BRIAR_GLENDebug?.getAuthoredArtState),undefined,{timeout:8000});
  await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getAuthoredArtState();return s.ready||s.failed;},undefined,{timeout:9000});
  await page.evaluate(()=>{
    const d=window.__BRIAR_GLENDebug;
    d.setProgress({fenCrossingOpened:true,fenDiscovered:true,fenWardenDefeated:true,fenCacheClaimed:true,stonepinePassOpened:true,stonepineDiscovered:true,stonepineBossDefeated:false,stonepineCacheClaimed:false});
    d.setPlayer({hp:125,maxHp:125,invuln:0});
    d.setThreat('quarrysentinel',{hp:290,dead:false,hurt:0,x:3190,y:-1840});
    d.teleport(3005,-1840);
  });
  await new Promise(r=>setTimeout(r,420));
  const zone=await page.evaluate(()=>window.__BRIAR_GLENDebug.getStonepineState().zone);
  if(zone!=='STONEPINE REACH')throw new Error(`${vp.name}: expected Stonepine, got ${zone}`);
  const dir=path.join(root,vp.name);fs.mkdirSync(dir,{recursive:true});
  await page.screenshot({path:path.join(dir,'45-quarry-sentinel-combat.png'),fullPage:false});
  await context.close();
 }
 console.log('PASS Quarry Sentinel review capture');
}finally{await browser.close();}
