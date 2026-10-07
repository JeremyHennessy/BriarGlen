import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const evidence=process.env.UI_EVIDENCE_DIR||'fresh-preparation-evidence';
await mkdir(evidence,{recursive:true});

async function visibleText(page,selector){
  const node=page.locator(selector).first();
  if(await node.count()===0||!await node.isVisible())return null;
  return (await node.innerText()).trim();
}
async function activate(page,selector,touch){
  const node=page.locator(selector).first();
  if(touch)await node.tap();else await node.click();
}
function compassFromVisible(text=''){
  return (text.match(/North-east|South-east|South-west|North-west|North|South|East|West/i)||[])[0]?.toLowerCase()||null;
}
async function holdVisibleDirection(page,direction,ms){
  const button=page.locator(`[data-move="${direction}"]`);
  const box=await button.boundingBox();
  assert.ok(box,`Visible ${direction} control must be onscreen`);
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();
  try{await page.waitForTimeout(ms);}finally{await page.mouse.up();}
}
async function snapshotVisible(page){
  return{
    objective:await visibleText(page,'#objective-text'),
    direction:await visibleText(page,'#objective-direction'),
    preparation:await visibleText(page,'#objective-preparation'),
    currentUse:await visibleText(page,'#interaction-target'),
    useReadiness:await visibleText(page,'#interact-readiness'),
    useHelp:await visibleText(page,'#interaction-help')
  };
}
async function reachAndStartLedger(page,vp){
  const keyboard={
    north:['KeyW'],south:['KeyS'],east:['KeyD'],west:['KeyA'],
    'north-east':['KeyW','KeyD'],'north-west':['KeyW','KeyA'],
    'south-east':['KeyS','KeyD'],'south-west':['KeyS','KeyA']
  };
  const touch={
    north:['up'],south:['down'],east:['right'],west:['left'],
    'north-east':['up','right'],'north-west':['up','left'],
    'south-east':['down','right'],'south-west':['down','left']
  };
  await activate(page,'[data-panel="nearby"]',vp.touch);
  await page.waitForFunction(()=>document.querySelector('#objective-text')?.textContent.includes('Visit the Stonepine Trail Ledger'),{timeout:3000});
  let residentWaits=0,lastCompass=null,closeByNudges=0;
  const trace=[];
  for(let step=0;step<90;step++){
    const state=await snapshotVisible(page);
    trace.push({step,...state});
    if(state.currentUse==='Stonepine Trail Ledger'&&state.useReadiness==='Begin'){
      await activate(page,'#interact-btn',vp.touch);
      await page.waitForFunction(()=>document.querySelector('#objective-text')?.textContent.includes('Chart Stonepine Overlook'),{timeout:3000});
      await page.waitForFunction(()=>!document.querySelector('#objective-preparation')?.hidden,{timeout:3000});
      return{success:true,trace,after:await snapshotVisible(page)};
    }
    if(state.direction?.includes('Nearby resident has Use priority')){
      residentWaits++;
      if(residentWaits<=6){await page.waitForTimeout(500);continue;}
      return{success:false,reason:'Resident retained Use priority near Ledger',trace};
    }
    residentWaits=0;
    if(state.direction?.includes('Close by')){
      if(!lastCompass)return{success:false,reason:'Close-by guidance appeared before a compass direction',trace};
      if(closeByNudges>=8)return{success:false,reason:'Move-closer guidance did not reach Ledger Use range',trace};
      closeByNudges++;
      if(vp.touch){
        for(const direction of touch[lastCompass])await holdVisibleDirection(page,direction,35);
      }else{
        await page.locator('#game').focus();
        for(const key of keyboard[lastCompass])await page.keyboard.down(key);
        try{await page.waitForTimeout(35);}finally{for(const key of [...keyboard[lastCompass]].reverse())await page.keyboard.up(key);}
      }
      await page.waitForTimeout(70);
      continue;
    }
    const compass=compassFromVisible(state.direction);
    if(!compass)return{success:false,reason:`No actionable compass: ${state.direction||'(blank)'}`,trace};
    lastCompass=compass;closeByNudges=0;
    if(vp.touch){
      for(const direction of touch[compass])await holdVisibleDirection(page,direction,120);
    }else{
      await page.locator('#game').focus();
      for(const key of keyboard[compass])await page.keyboard.down(key);
      try{await page.waitForTimeout(150);}finally{for(const key of [...keyboard[compass]].reverse())await page.keyboard.up(key);}
    }
    await page.waitForTimeout(70);
  }
  return{success:false,reason:'Ledger not reached within bounded visible-guidance route',trace};
}

const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(const vp of [
    {name:'desktop',width:1280,height:800,touch:false},
    {name:'phone-landscape',width:844,height:390,touch:true},
    {name:'phone-portrait',width:390,height:844,touch:true}
  ]){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push('pageerror: '+e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
    await page.goto(target,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready',{timeout:5000});

    const route=await reachAndStartLedger(page,vp);
    assert.equal(route.success,true,`${vp.name}: could not start Stonepine from visible guidance — ${route.reason||'unknown'}`);
    const warning=await visibleText(page,'#objective-preparation');
    assert.match(warning||'',/Prepare first · equip or make a working weapon/);
    await page.screenshot({path:`${evidence}/${vp.name}-01-persistent-warning.png`});

    await activate(page,'#objective-open',vp.touch);
    assert.equal(await page.locator('#panel-journal').isVisible(),true);
    assert.match(await visibleText(page,'#guide-preparation')||'',/No working weapon equipped; make one or equip it in Pack/);
    const sources=page.locator('.guide-sources');
    if(!await sources.getAttribute('open'))await activate(page,'.guide-sources summary',vp.touch);
    const sourceText=(await sources.innerText()).trim();
    assert.match(sourceText,/Gather Ashwood in Greenwood/);
    assert.match(sourceText,/hides from wolves/);
    assert.match(sourceText,/Make a bow and arrows/);
    await page.screenshot({path:`${evidence}/${vp.name}-02-journal-sources.png`});

    await activate(page,'[data-guide-panel="pack"]',vp.touch);
    const packText=await visibleText(page,'#panel-pack');
    assert.match(packText||'',/Weapon\s+Unarmed\s+No weapon selected/);
    await page.screenshot({path:`${evidence}/${vp.name}-03-pack-unarmed.png`});

    await activate(page,'[data-panel="craft"]',vp.touch);
    const gearFilter=page.locator('[data-craft-filter="gear"]');
    if(await gearFilter.count())await activate(page,'[data-craft-filter="gear"]',vp.touch);
    const bowText=await visibleText(page,'#recipe-bow');
    const bladeText=await visibleText(page,'#recipe-blade');
    assert.match(bowText||'',/Missing materials/);
    assert.match(bowText||'',/0\/2 Ashwood/);
    assert.match(bowText||'',/0\/1 Wolf Hide/);
    assert.match(bladeText||'',/Smithing 2 required/);
    await page.screenshot({path:`${evidence}/${vp.name}-04-make-weapon-plan.png`});

    const after=await snapshotVisible(page);
    assert.match(after.preparation||'',/Prepare first/,'Persistent preparation cue must survive planning-panel navigation');
    results.push({viewport:vp,route,warning,sourceText,packText,bowText,bladeText,after,errors});
    assert.deepEqual(errors,[],`${vp.name}: runtime errors during preparation audit`);
    await context.close();
  }
}finally{
  await browser.close();
}
await writeFile(`${evidence}/fresh-preparation.json`,JSON.stringify(results,null,2));
console.log('FRESH_PREPARATION '+JSON.stringify(results));
