import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
// Player-visible inspection only. No game debug API, state setters, coordinate queries or clock acceleration.
const plan=JSON.parse(await readFile('.journey/plan.json','utf8'));
await mkdir('evidence/screens',{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:plan.viewport||{width:1440,height:900},hasTouch:!!plan.touch,storageState:plan.resume?'.journey/resume/state.json':undefined,recordVideo:{dir:'evidence/video',size:plan.viewport||{width:1440,height:900}}});
const page=await context.newPage(),records=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const capture=async label=>{await page.screenshot({path:`evidence/screens/${label}.png`});const visible=await page.locator('body').innerText();records.push({label,visible});console.log(`${label}\n${visible}`);};
try{
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});await page.locator('#objective-text').waitFor();await page.waitForTimeout(250);await capture('00-start');
 for(let i=0;i<plan.actions.length;i++){
  const a=plan.actions[i];
  if(a.click){if(plan.touch)await page.locator(a.click).tap();else await page.locator(a.click).click();}
  if(a.point){if(plan.touch)await page.touchscreen.tap(a.point[0],a.point[1]);else await page.mouse.click(a.point[0],a.point[1]);}
  if(a.hold){await page.locator('#game').focus();for(const key of a.hold)await page.keyboard.down(key);await page.waitForTimeout(a.ms||500);for(const key of a.hold)await page.keyboard.up(key);}
  if(a.key)await page.keyboard.press(a.key);
  if(a.scroll)await page.locator(a.scroll).scrollIntoViewIfNeeded();
  if(a.viewport)await page.setViewportSize(a.viewport);
  if(a.wait)await page.waitForTimeout(a.wait);
  if(a.shot)await capture(`${String(i+1).padStart(2,'0')}-${a.shot}`);
 }
 // Let normal autosave persist the session; never construct or modify a save payload.
 await page.waitForTimeout(5200);await capture('99-end');
 assert.deepEqual(errors,[],'Unmodified first-outing browser errors');
}finally{
 await context.storageState({path:'evidence/state.json'});
 await writeFile('evidence/visible-transcript.json',JSON.stringify({plan,records,errors},null,2));
 await context.close();await browser.close();
}
