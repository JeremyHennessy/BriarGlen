import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const root=path.resolve('test-artifacts/product-review-onboarding');
fs.mkdirSync(root,{recursive:true});
const viewports=[
  {name:'phone-landscape',width:932,height:430,touch:true},
  {name:'phone-portrait',width:430,height:932,touch:true},
  {name:'desktop',width:1440,height:900,touch:false},
];
const browser=await chromium.launch({headless:true});
const manifest=[];

async function shot(page,vp,name,description){
  const dir=path.join(root,vp.name);fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,`${name}.png`);await page.screenshot({path:file,fullPage:false});
  manifest.push({viewport:vp.name,file:`${vp.name}/${name}.png`,description});
}

try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    await context.addInitScript(()=>{
      if(sessionStorage.getItem('briar-glen-product-review-ob-clean')==='1')return;
      localStorage.removeItem('briar-glen-vslice-v1');
      localStorage.removeItem('briar-glen-onboarding-v1');
      localStorage.removeItem('briar-glen-run-metrics-v1');
      localStorage.removeItem('briar-glen-vertical-slice-complete-v1');
      sessionStorage.removeItem('briar-glen-start-intent');
      sessionStorage.setItem('briar-glen-product-review-ob-clean','1');
    });
    const page=await context.newPage();
    const sep=target.includes('?')?'&':'?';
    await page.goto(`${target}${sep}onboarding=1&reviewOb=${Date.now()}-${vp.name}`,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getOnboardingState),undefined,{timeout:8000});
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().startOpen===true,undefined,{timeout:5000});
    await shot(page,vp,'00-start-screen','Fresh title/start screen.');

    await Promise.all([
      page.waitForNavigation({waitUntil:'domcontentloaded',timeout:10000}),
      page.locator('#onboarding21-new').click(),
    ]);
    await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug?.getOnboardingState?.();return s&&!s.startOpen&&s.guide.active&&s.guide.stage==='move';},undefined,{timeout:7000});
    await shot(page,vp,'01-movement-guide','Movement lesson with later controls concealed.');

    await page.keyboard.down('KeyD');
    try{await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().guide.stage==='gather',undefined,{timeout:3500});}
    finally{await page.keyboard.up('KeyD');}
    await shot(page,vp,'02-gather-guide','Gathering lesson with USE revealed.');

    await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setInventory({herb:3});d.setProgress({step:1});});
    await page.waitForFunction(()=>window.__BRIAR_GLENDebug.getOnboardingState().guide.stage==='combat',undefined,{timeout:3000});
    await shot(page,vp,'03-combat-guide','First combat lesson with ATTACK revealed.');
    await context.close();
  }
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({baseline:'Build 30 production',screenshots:manifest},null,2));
  console.log(`PASS verified onboarding capture: ${manifest.length} screenshots`);
}finally{await browser.close();}
