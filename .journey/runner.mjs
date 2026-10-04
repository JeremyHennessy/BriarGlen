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
const hold=async(keys,ms)=>{await page.locator('#game').focus();for(const k of keys)await page.keyboard.down(k);try{await watch(ms);}finally{for(const k of keys)await page.keyboard.up(k);}};
const touchHold=async(selector,ms)=>{const b=await page.locator(selector).boundingBox();assert.ok(b);const cdp=await context.newCDPSession(page);try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:0}]});await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});inputs.push({action:'Native held touch',selector,ms});}finally{await cdp.detach();}};
const seek=async a=>{const end=Date.now()+(a.limit||2000);let found=false;await page.locator('#game').focus();for(const k of a.keys)await page.keyboard.down(k);try{while(Date.now()<end){if((await page.locator('#interact-readiness').innerText())==='Gather'&&(await page.locator('#interaction-target').innerText())===a.target){found=true;break;}await watch(100);}}finally{for(const k of a.keys)await page.keyboard.up(k);}inputs.push({action:'Seek by visible prompt',target:a.target,keys:a.keys,found});if(found){await activate('#interact-btn');await watch(250);}};
const track=async a=>{const initial=await page.locator('#objective-text').innerText(),end=Date.now()+(a.limit||15000),dirs={'East':['ArrowRight'],'South-east':['ArrowRight','ArrowDown'],'South':['ArrowDown'],'South-west':['ArrowLeft','ArrowDown'],'West':['ArrowLeft'],'North-west':['ArrowLeft','ArrowUp'],'North':['ArrowUp'],'North-east':['ArrowRight','ArrowUp']};while(Date.now()<end){const objective=await page.locator('#objective-text').innerText(),text=await page.locator('#objective-direction').innerText();if(objective!==initial||/Within reach|Close by|resident has Use priority/.test(text))break;if(text.startsWith('Walking')){await hold(['ArrowRight'],20);continue;}const direction=text.split(' · ')[0],keys=dirs[direction];if(!keys)break;inputs.push({action:'Follow visible compass',objective,text,keys});await hold(keys,300);await watch(80);}};
const capture=async label=>{await page.screenshot({path:`evidence/screens/${label}.png`});const visible=await page.locator('body').innerText();let geometry=null;if(plan.checkUi){geometry=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,panels:[...document.querySelectorAll('.play-panel')].filter(e=>e.getBoundingClientRect().width>0).length,buttons:['#attack-btn','#interact-btn','#quick-brace','#quick-tonic'].map(s=>({selector:s,...document.querySelector(s).getBoundingClientRect().toJSON()}))}));assert.ok(geometry.sw<=geometry.w+1&&geometry.sh<=geometry.h+1,'Page stays in viewport');assert.equal(geometry.panels,1);for(const b of geometry.buttons)assert.ok(b.left>=0&&b.top>=0&&b.right<=geometry.w+1&&b.bottom<=geometry.h+1&&b.width>=44&&b.height>=44,'Persistent action remains reachable');}records.push({label,visible,geometry});console.log(`${label}\n${visible}`);};
try{
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});await page.locator('#objective-text').waitFor();await page.waitForTimeout(250);await capture('00-start');
 for(let i=0;i<plan.actions.length;i++){
  const a=plan.actions[i];
  if(a.click)await activate(a.click);
  if(a.clickIfVisible&&await page.locator(a.clickIfVisible).isVisible())await activate(a.clickIfVisible);
  if(a.point){if(plan.touch)await page.touchscreen.tap(a.point[0],a.point[1]);else await page.mouse.click(a.point[0],a.point[1]);}
  if(a.hold)await hold(a.hold,a.ms||500);
  if(a.touchHold)await touchHold(a.touchHold,a.ms||500);
  if(a.seek)await seek(a.seek);
  if(a.track)await track(a.track);
  if(a.key)await page.keyboard.press(a.key);
  if(a.scroll)await page.locator(a.scroll).scrollIntoViewIfNeeded();
  if(a.viewport)await page.setViewportSize(a.viewport);
  if(a.wait)await watch(a.wait);
  if(a.shot)await capture(`${String(i+1).padStart(2,'0')}-${a.shot}`);
 }
 await watch(5200);await capture('99-end');assert.deepEqual(errors,[]);
}finally{
 await context.storageState({path:'evidence/state.json'});
 await writeFile('evidence/visible-transcript.json',JSON.stringify({plan,records,inputs,errors},null,2));await context.close();await browser.close();
}
