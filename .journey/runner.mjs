import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
// Player-visible inspection only. No debug API, state edits, world-coordinate queries or clock acceleration.
const plan=JSON.parse(await readFile('.journey/plan.json','utf8'));
await mkdir('evidence/screens',{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:plan.viewport||{width:1440,height:900},hasTouch:!!plan.touch,storageState:plan.resume?'.journey/resume/state.json':undefined,recordVideo:{dir:'evidence/video',size:plan.viewport||{width:1440,height:900}}});
const page=await context.newPage(),records=[],errors=[],inputs=[];
page.on('pageerror',e=>errors.push(e.message));
const activate=async s=>plan.touch?page.locator(s).tap():page.locator(s).click();
// Reactions use visible UI text and ordinary controls, not hidden target or combat state.
const watch=async ms=>{const end=Date.now()+ms;while(Date.now()<end){
 const cue=page.locator('#combat-cue');
 if(await cue.isVisible()){
  const text=await cue.innerText();
  if(/Close threat|incoming/.test(text)&&text.includes('Brace 10 energy')&&!text.includes('Braced')){await activate('#quick-brace');inputs.push({at:Date.now(),action:'Brace',visible:text});}
  if(/Attack (Wolf|Briar Wolf|Emberback|Mirecaller) ·/.test(text)){await activate('#attack-btn');inputs.push({at:Date.now(),action:'Attack',visible:text});}
  const hpText=await page.locator('#hp-text').innerText(),hp=Number(hpText.split('/')[0]);
  if(hp<60&&(await page.locator('#quick-tonic').innerText()).match(/[1-9]\d* left/)){await activate('#quick-tonic');inputs.push({at:Date.now(),action:'Tonic',visible:hpText});}
 }
 if(plan.collectNearby&&(await page.locator('#interact-readiness').innerText())==='Pick up'){await activate('#interact-btn');inputs.push({at:Date.now(),action:'Use',visible:'Pick up'});}
 await page.waitForTimeout(Math.min(160,Math.max(1,end-Date.now())));
}};
const capture=async label=>{await page.screenshot({path:`evidence/screens/${label}.png`});const visible=await page.locator('body').innerText();records.push({label,visible});console.log(`${label}\n${visible}`);};
try{
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});await page.locator('#objective-text').waitFor();await page.waitForTimeout(250);await capture('00-start');
 for(let i=0;i<plan.actions.length;i++){
  const a=plan.actions[i];
  if(a.click)await activate(a.click);
  if(a.point){if(plan.touch)await page.touchscreen.tap(a.point[0],a.point[1]);else await page.mouse.click(a.point[0],a.point[1]);}
  if(a.hold){await page.locator('#game').focus();for(const key of a.hold)await page.keyboard.down(key);await watch(a.ms||500);for(const key of a.hold)await page.keyboard.up(key);}
  if(a.key)await page.keyboard.press(a.key);
  if(a.scroll)await page.locator(a.scroll).scrollIntoViewIfNeeded();
  if(a.viewport)await page.setViewportSize(a.viewport);
  if(a.wait)await watch(a.wait);
  if(a.shot)await capture(`${String(i+1).padStart(2,'0')}-${a.shot}`);
 }
 // Allow normal autosave, while still reacting to visible threats instead of leaving the player unattended.
 await watch(5200);await capture('99-end');assert.deepEqual(errors,[]);
}finally{
 await context.storageState({path:'evidence/state.json'});
 await writeFile('evidence/visible-transcript.json',JSON.stringify({plan,records,inputs,errors},null,2));await context.close();await browser.close();
}
