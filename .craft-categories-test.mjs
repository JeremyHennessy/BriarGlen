import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

// Explicit synthetic setup; all category and crafting actions below use native controls.
export async function proveCraftCategories(page, vp) {
  const activate=async selector=>vp.touch?page.locator(selector).tap():page.locator(selector).click();
  const state=()=>page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{x:p.x,y:p.y,hp:p.hp,energy:p.energy,coins:p.coins,inventory:p.inventory,skills:p.skills,expeditions:p.expeditions,deeds:p.deeds,discoveries:p.discoveries,equippedWeapon:p.equippedWeapon,equippedArmor:p.equippedArmor,equippedTool:p.equippedTool,attackCd:p.attackCd};});
  const setup=()=>page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setPosition(900,600);d.setHp(100);d.setEnergy(100);for(const n of d.snapshot().npcs){const live=d.npc(n.id);live.x=30;live.y=30;live.think=60;live.target={x:30,y:30};}d.advance(0);});
  const shot=async label=>{if(process.env.UI_EVIDENCE_DIR){await mkdir(process.env.UI_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:`${process.env.UI_EVIDENCE_DIR}/${vp.name}-make-${label}.png`});}};
  const groups={supplies:['tonic','arrows'],gear:['pick','blade','bow','bedroll','trailpack','jerkin'],care:['patch-jerkin','make-camp','drink-tonic']};groups.all=[...groups.supplies,...groups.gear,...groups.care];
  const visible=()=>page.locator('#craft-list button:visible').evaluateAll(nodes=>nodes.map(el=>el.dataset.craft||el.id).sort());
  const choose=async id=>{await activate(`[data-craft-filter="${id}"]`);assert.equal(await page.locator(`[data-craft-filter="${id}"]`).getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.craft-filters [aria-pressed=true]').count(),1);assert.deepEqual(await visible(),[...groups[id]].sort());assert.match(await page.locator('#craft-filter-status').innerText(),new RegExp(`${groups[id].length} actions`));};
  await setup();await activate('[data-panel="craft"]');await choose('all');
  await page.evaluate(()=>window.__craftOriginalNodes=[...document.querySelectorAll('#craft-list button')]);
  const before=await state();
  for(const id of ['supplies','gear','care','all']){
    await choose(id);assert.deepEqual(await state(),before,'Choosing a category must not execute gameplay');
    assert.equal(await page.locator(`[data-craft-filter="${id}"]`).evaluate(el=>document.activeElement===el),true,'Category focus stays on a visible stable control');
    for(const button of await page.locator('.craft-filters button').all()){const b=await button.boundingBox();assert.ok(b.width>=44&&b.height>=44,'Category target remains44px');}
    const g=await page.locator('#panel-craft').evaluate(el=>({w:el.clientWidth,sw:el.scrollWidth,pw:document.documentElement.scrollWidth,vw:innerWidth}));assert.ok(g.sw<=g.w+1&&g.pw<=g.vw+1,'Categories fit the scroll panel');
    await shot(id);
  }
  // Native Enter and held Space choose categories without also moving/attacking.
  await page.locator('[data-craft-filter="gear"]').focus();await page.keyboard.press('Enter');assert.deepEqual(await visible(),[...groups.gear].sort());
  await page.locator('[data-craft-filter="supplies"]').focus();await page.keyboard.down('Space');try{await page.waitForTimeout(650);}finally{await page.keyboard.up('Space');}
  await page.waitForFunction(()=>document.querySelector('[data-craft-filter=supplies]').getAttribute('aria-pressed')==='true',null,{timeout:1000});assert.deepEqual(await state(),before);assert.deepEqual(await visible(),[...groups.supplies].sort());
  // Hidden recipes retain their honest readiness; live updates do not replace controls or selection.
  await choose('gear');assert.equal(await page.locator('#recipe-trailpack').getAttribute('data-state'),'locked');assert.match(await page.locator('#recipe-trailpack').innerText(),/Complete Stonepine expedition/);
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('wood',1);d.advance(0);});
  assert.equal(await page.locator('#recipe-arrows').getAttribute('data-state'),'ready');assert.equal(await page.locator('#recipe-arrows').isVisible(),false);
  await choose('supplies');assert.match(await page.locator('#recipe-arrows').innerText(),/1\/1 Ashwood/);
  const selected=await state();
  for(const id of ['nearby','pack','character','journal','craft'])await activate(`[data-panel="${id}"]`);
  assert.deepEqual(await visible(),[...groups.supplies].sort());assert.deepEqual(await state(),selected,'Panel transitions retain category without changing game state');
  assert.equal(await page.evaluate(()=>window.__craftOriginalNodes.every(el=>el.isConnected&&el===document.querySelector(el.dataset.craft?`[data-craft="${el.dataset.craft}"]`:`#${el.id}`))),true,'Original action nodes and handlers survive filtering');
  // Existing recipe executes once with its unchanged real input/output costs.
  await activate('[data-craft="arrows"]');let p=await state();assert.equal(p.inventory.arrows.qty,6);assert.equal(p.inventory.wood,undefined);assert.equal(p.energy,100);assert.equal(p.attackCd,0);
  await choose('gear');await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('iron',3);d.give('wood',1);d.advance(0);});
  await activate('[data-craft="pick"]');p=await state();assert.equal(p.inventory.pick.qty,1);assert.equal(p.inventory.iron,undefined);assert.equal(p.inventory.wood,undefined);assert.equal(p.energy,100);
  // The persistent tonic still invokes its original care action even when Care is filtered out.
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('tonic',1);d.setHp(40);d.advance(0);});assert.equal(await page.locator('#drink-tonic').isVisible(),false);
  await activate('#quick-tonic');p=await state();assert.ok(p.hp>40);assert.equal(p.inventory.tonic,undefined);
  await choose('care');await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('tonic',1);d.setHp(40);d.advance(0);});
  await activate('#drink-tonic');p=await state();assert.ok(p.hp>40);assert.equal(p.inventory.tonic,undefined);
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setHp(100);d.setEnergy(100);d.give('wood',1000000);d.advance(0);});await choose('supplies');await shot('large-counts');
  // UI category is session-local, not part of the gameplay save schema.
  const saved=await state();await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');
  assert.deepEqual((await state()).inventory,saved.inventory);assert.deepEqual((await state()).expeditions,saved.expeditions);assert.equal((await state()).coins,saved.coins);
  await activate('[data-panel="craft"]');assert.equal(await page.locator('[data-craft-filter="all"]').getAttribute('aria-pressed'),'true');assert.deepEqual(await visible(),[...groups.all].sort());
  console.log(`PASS ${vp.name}: Make categories, all11 original controls, native keyboard/touch/focus, exact navigation state, live readiness, real crafting/tonic and unchanged saved progress`);
}
