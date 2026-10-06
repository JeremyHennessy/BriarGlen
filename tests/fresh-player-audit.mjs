import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const evidence=process.env.UI_EVIDENCE_DIR||'fresh-player-evidence';
await mkdir(evidence,{recursive:true});

const browser=await chromium.launch({headless:true});
const results=[];

async function visibleText(page, selector){
  const node=page.locator(selector).first();
  if(await node.count()===0 || !await node.isVisible()) return null;
  return (await node.innerText()).trim();
}
async function activate(page, selector, touch){
  const node=page.locator(selector).first();
  if(touch) await node.tap(); else await node.click();
}
async function snapshotVisible(page,label){
  return {
    label,
    objective:await visibleText(page,'#objective-text'),
    direction:await visibleText(page,'#objective-direction'),
    currentUse:await visibleText(page,'#interaction-target'),
    useHelp:await visibleText(page,'#interaction-help'),
    useReadiness:await visibleText(page,'#interact-readiness'),
    attackReadiness:await visibleText(page,'#attack-readiness'),
    braceReadiness:await visibleText(page,'#brace-readiness'),
    tonicReadiness:await visibleText(page,'#tonic-readiness'),
    worldNotice:await visibleText(page,'#world-line'),
    nearby:await visibleText(page,'#panel-nearby'),
    visiblePanel:await page.locator('.play-panel:visible').getAttribute('id'),
  };
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
async function followVisibleCompass(page,vp){
  const trace=[];
  const keyboard={
    north:['KeyW'],south:['KeyS'],east:['KeyD'],west:['KeyA'],
    'north-east':['KeyW','KeyD'],'north-west':['KeyW','KeyA'],
    'south-east':['KeyS','KeyD'],'south-west':['KeyS','KeyA'],
  };
  const touch={
    north:['up'],south:['down'],east:['right'],west:['left'],
    'north-east':['up','right'],'north-west':['up','left'],
    'south-east':['down','right'],'south-west':['down','left'],
  };

  await activate(page,'[data-panel="nearby"]',vp.touch);
  await page.waitForFunction(()=>document.querySelector('#objective-text')?.textContent.includes('Visit the Stonepine Trail Ledger'),{timeout:3000});

  let residentWaits=0, lastCompass=null, closeByNudges=0;
  for(let step=0;step<90;step++){
    const state=await snapshotVisible(page,`route-${step}`);
    trace.push({step,objective:state.objective,direction:state.direction,currentUse:state.currentUse,useReadiness:state.useReadiness,useHelp:state.useHelp});

    if(state.objective?.includes('Chart Stonepine Overlook')){
      return{success:true,reason:'Objective advanced before explicit final check',steps:trace.length,trace};
    }

    if(state.currentUse==='Stonepine Trail Ledger'&&state.useReadiness==='Begin'){
      await page.screenshot({path:`${evidence}/${vp.name}-07-ledger-ready.png`});
      await activate(page,'#interact-btn',vp.touch);
      await page.waitForTimeout(260);
      const after=await snapshotVisible(page,'after-ledger-use');
      trace.push({step:'use',objective:after.objective,direction:after.direction,currentUse:after.currentUse,useReadiness:after.useReadiness,useHelp:after.useHelp});
      await page.screenshot({path:`${evidence}/${vp.name}-08-ledger-used.png`});
      return{success:!!after.objective?.includes('Chart Stonepine Overlook'),reason:after.objective||'No objective text after Use',steps:trace.length,trace};
    }

    if(state.direction?.includes('Nearby resident has Use priority')){
      residentWaits++;
      if(residentWaits<=6){await page.waitForTimeout(500);continue;}
      return{success:false,reason:'Visible objective reports a resident still has Use priority near the Ledger',steps:trace.length,trace};
    }
    residentWaits=0;

    if(state.direction?.includes('Close by')){
      if(!lastCompass){
        return{success:false,reason:`Close-by instruction appeared before any usable compass direction: ${state.direction}`,steps:trace.length,trace};
      }
      if(closeByNudges>=8){
        return{success:false,reason:`Eight tiny native move-closer steps still did not make the Ledger usable: ${state.direction}`,steps:trace.length,trace};
      }
      closeByNudges++;
      trace.push({step:`close-${closeByNudges}`,instruction:state.direction,action:`tiny ${lastCompass} nudge`});
      if(vp.touch){
        for(const direction of touch[lastCompass])await holdVisibleDirection(page,direction,35);
      }else{
        await page.locator('#game').focus();
        for(const key of keyboard[lastCompass])await page.keyboard.down(key);
        try{await page.waitForTimeout(35);}finally{
          for(const key of [...keyboard[lastCompass]].reverse())await page.keyboard.up(key);
        }
      }
      await page.waitForTimeout(70);
      continue;
    }

    const compass=compassFromVisible(state.direction);
    if(!compass){
      return{success:false,reason:`No actionable compass direction was visible: ${state.direction||'(blank)'}`,steps:trace.length,trace};
    }
    lastCompass=compass;
    closeByNudges=0;

    if(vp.touch){
      for(const direction of touch[compass])await holdVisibleDirection(page,direction,120);
    }else{
      await page.locator('#game').focus();
      for(const key of keyboard[compass])await page.keyboard.down(key);
      try{await page.waitForTimeout(150);}finally{
        for(const key of [...keyboard[compass]].reverse())await page.keyboard.up(key);
      }
    }
    await page.waitForTimeout(70);
  }
  return{success:false,reason:'Visible compass did not reach a usable Ledger within 90 bounded movement steps',steps:trace.length,trace};
}

try{
  for(const vp of [
    {name:'desktop',width:1280,height:800,touch:false},
    {name:'phone-landscape',width:844,height:390,touch:true},
    {name:'phone-portrait',width:390,height:844,touch:true},
  ]){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push('pageerror: '+e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
    await page.goto(target,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready',{timeout:5000});

    const record={
      viewport:vp,
      initial:await snapshotVisible(page,'initial'),
      tabs:await page.locator('.panel-tabs').innerText(),
      actionDeck:await page.locator('.action-deck').innerText(),
      topbar:await page.locator('.topbar').innerText(),
      footer:await visibleText(page,'footer'),
    };
    await page.screenshot({path:`${evidence}/${vp.name}-00-initial.png`});

    const help=page.locator('.interaction-controls');
    if(await help.count()){
      const summary=help.locator('summary');
      if(!await help.getAttribute('open')) await activate(page,'.interaction-controls summary',vp.touch);
      record.movementHelp=(await help.innerText()).trim();
    }
    await page.screenshot({path:`${evidence}/${vp.name}-01-help.png`});

    await activate(page,'#objective-open',vp.touch);
    record.journal={
      objective:await visibleText(page,'#objective-text'),
      direction:await visibleText(page,'#objective-direction'),
      plan:await visibleText(page,'#journal-plan'),
    };
    await page.screenshot({path:`${evidence}/${vp.name}-02-journal.png`});

    await activate(page,'[data-panel="pack"]',vp.touch);
    record.pack=await visibleText(page,'#panel-pack');
    await page.screenshot({path:`${evidence}/${vp.name}-03-pack.png`});

    await activate(page,'[data-panel="craft"]',vp.touch);
    record.make=await visibleText(page,'#panel-craft');
    await page.screenshot({path:`${evidence}/${vp.name}-04-make.png`});

    await activate(page,'[data-panel="character"]',vp.touch);
    record.status=await visibleText(page,'#character-status');
    await page.screenshot({path:`${evidence}/${vp.name}-05-status.png`});

    await activate(page,'[data-character-section="skills"]',vp.touch);
    record.skills=await visibleText(page,'#character-skills');
    await page.screenshot({path:`${evidence}/${vp.name}-06-skills.png`});

    await activate(page,'[data-panel="nearby"]',vp.touch);
    record.afterReading=await snapshotVisible(page,'after-reading');
    record.firstObjective=await followVisibleCompass(page,vp);
    record.errors=errors;
    results.push(record);
    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(`${evidence}/fresh-player-visible.json`,JSON.stringify(results,null,2));
for(const record of results){
  assert.deepEqual(record.errors,[],`${record.viewport.name}: runtime errors during fresh-player audit`);
  assert.equal(record.firstObjective.success,true,`${record.viewport.name}: fresh player could not reach/start the first objective from visible guidance — ${record.firstObjective.reason}`);
}
console.log('FRESH_PLAYER_VISIBLE '+JSON.stringify(results));
