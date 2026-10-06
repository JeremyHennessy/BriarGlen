import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Presentation-only journal flow proof. Long-log population is a synthetic layout fixture;
// section switching, keyboard/touch activation, objective routing and persistence are native.
export async function proveJournalSections(page,vp){
  const activate=async s=>vp.touch?page.locator(s).tap():page.locator(s).click();
  const stable=()=>page.evaluate(()=>{
    const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;
    return{x:p.x,y:p.y,hp:p.hp,energy:p.energy,coins:p.coins,inventory:p.inventory,skills:p.skills,expeditions:p.expeditions,deeds:p.deeds,discoveries:p.discoveries,equippedTool:p.equippedTool,equippedWeapon:p.equippedWeapon,equippedArmor:p.equippedArmor};
  });
  const selected=()=>page.locator('.journal-sections [aria-selected=true]').getAttribute('data-journal-section');

  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setPosition(900,600);d.setHp(100);d.setEnergy(100);d.advance(0);});
  await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player.attackCd===0,null,{timeout:1500});
  const before=await stable();

  await activate('[data-panel=journal]');
  assert.equal(await selected(),'plan','Journal defaults to Plan');
  assert.equal(await page.locator('#journal-plan').isVisible(),true);
  assert.equal(await page.locator('#journal-log').isVisible(),false);
  for(const b of await page.locator('.journal-sections button').all()){
    const box=await b.boundingBox();assert.ok(box&&box.width>=44&&box.height>=44,`${vp.name}: Journal touch target too small`);
  }

  await activate('[data-journal-section=log]');
  assert.equal(await selected(),'log');assert.equal(await page.locator('#journal-plan').isVisible(),false);assert.equal(await page.locator('#journal-log').isVisible(),true);
  assert.deepEqual(await stable(),before,'Journal switching must not mutate player state');

  // Leaving through the ordinary panel tabs preserves the session-only subsection.
  await activate('[data-panel=pack]');await activate('[data-panel=journal]');
  assert.equal(await selected(),'log','Ordinary panel navigation preserves current Journal subsection');

  // Arrow/Home/End belong to the Journal tabs, never world movement.
  const position=await page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{x:p.x,y:p.y};});
  await page.locator('[data-journal-section=log]').focus();await page.keyboard.press('ArrowLeft');
  assert.equal(await selected(),'plan');assert.deepEqual(await page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{x:p.x,y:p.y};}),position);
  await page.keyboard.press('End');assert.equal(await selected(),'log');
  await page.keyboard.press('Home');assert.equal(await selected(),'plan');
  await page.keyboard.press('ArrowRight');assert.equal(await selected(),'log');
  assert.deepEqual(await page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{x:p.x,y:p.y};}),position,'Journal keyboard navigation must not move the player');

  // Native held Space on a Journal tab may activate that tab, but must not attack.
  await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.setEnergy(100));
  await page.locator('[data-journal-section=plan]').focus();await page.keyboard.down('Space');
  try{await page.waitForTimeout(650);}finally{await page.keyboard.up('Space');}
  const afterSpace=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player);
  assert.equal(afterSpace.energy,100,'Held Space on Journal controls must not spend attack energy');
  assert.equal(afterSpace.attackCd,0,'Held Space on Journal controls must not start an attack');

  // Objective shortcut intentionally resets Journal to the actionable Plan view.
  await activate('[data-journal-section=log]');await activate('[data-panel=nearby]');await activate('#objective-open');
  assert.equal(await page.locator('#panel-journal').isVisible(),true);assert.equal(await selected(),'plan');
  assert.equal(await page.locator('#journal-plan').isVisible(),true);assert.equal(await page.locator('#journal-log').isVisible(),false);

  // Exercise a populated log shape without touching game state or saved data.
  await activate('[data-journal-section=log]');
  await page.evaluate(()=>{
    const log=document.querySelector('#log');
    window.__journalOriginalHtml=log.innerHTML;
    const sentence='A long field note keeps route details readable without forcing the Journal wider than its panel. ';
    log.innerHTML=Array.from({length:36},(_,i)=>`<div>Entry ${i+1} · ${sentence.repeat(3)}</div>`).join('');
  });
  const geometry=await page.evaluate(()=>{
    const panel=document.querySelector('#panel-journal'),log=document.querySelector('#log'),sections=document.querySelector('.journal-sections');
    const box=el=>el.getBoundingClientRect().toJSON();
    return{w:innerWidth,h:innerHeight,pageW:document.documentElement.scrollWidth,panelW:panel.clientWidth,panelScrollW:panel.scrollWidth,logW:log.clientWidth,logScrollW:log.scrollWidth,panel:box(panel),sections:box(sections),buttons:[...sections.querySelectorAll('button')].map(box)};
  });
  assert.ok(geometry.pageW<=geometry.w+1,`${vp.name}: Journal caused page overflow ${JSON.stringify(geometry)}`);
  assert.ok(geometry.panelScrollW<=geometry.panelW+1&&geometry.logScrollW<=geometry.logW+1,`${vp.name}: populated Journal overflows horizontally ${JSON.stringify(geometry)}`);
  for(const box of geometry.buttons)assert.ok(box.left>=geometry.panel.left-1&&box.right<=geometry.panel.right+1,`${vp.name}: Journal control escapes panel`);
  if(process.env.UI_EVIDENCE_DIR){await mkdir(process.env.UI_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:`${process.env.UI_EVIDENCE_DIR}/${vp.name}-journal-sections.png`});}
  await page.evaluate(()=>{const log=document.querySelector('#log');log.innerHTML=window.__journalOriginalHtml;delete window.__journalOriginalHtml;});

  assert.deepEqual(await stable(),before,'Journal layout fixture and navigation must leave gameplay unchanged');
  const saved=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.save();const p=JSON.parse(localStorage.getItem(d.build().saveKey)).player;return{coins:p.coins,inventory:p.inventory,skills:p.skills,expeditions:p.expeditions,deeds:p.deeds,discoveries:p.discoveries,equippedTool:p.equippedTool,equippedWeapon:p.equippedWeapon,equippedArmor:p.equippedArmor};});
  const expected=await page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{coins:p.coins,inventory:p.inventory,skills:p.skills,expeditions:p.expeditions,deeds:p.deeds,discoveries:p.discoveries,equippedTool:p.equippedTool,equippedWeapon:p.equippedWeapon,equippedArmor:p.equippedArmor};});
  assert.deepEqual(saved,expected,'Journal view selection adds no gameplay save state');

  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');
  await activate('[data-panel=journal]');
  assert.equal(await selected(),'plan','Journal subsection is session-only after reload');
  assert.deepEqual(await page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{coins:p.coins,inventory:p.inventory,skills:p.skills,expeditions:p.expeditions,deeds:p.deeds,discoveries:p.discoveries,equippedTool:p.equippedTool,equippedWeapon:p.equippedWeapon,equippedArmor:p.equippedArmor};}),expected,'Reload preserves durable gameplay state');
  console.log(`PASS ${vp.name}: Journal Plan/Log touch, keyboard isolation, objective routing, populated layout and save neutrality`);
}
