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
    record.errors=errors;
    assert.deepEqual(errors,[],`${vp.name}: runtime errors during fresh-player reading audit`);
    results.push(record);
    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(`${evidence}/fresh-player-visible.json`,JSON.stringify(results,null,2));
console.log('FRESH_PLAYER_VISIBLE '+JSON.stringify(results));
