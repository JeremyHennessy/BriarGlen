import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

// Inventory population is a synthetic fixture; all filtering/equipment/tonic inputs are native.
export async function provePackCategories(page,vp){
  const groups={gear:['jerkin','mireglass','trailpack','bedroll','pick','hammer','shears','blade','bow'],supplies:['bread','arrows','tonic'],materials:['briarleaf','mooncap','iron','wood','hide']};
  groups.all=Object.values(groups).flat();
  const activate=async s=>vp.touch?page.locator(s).tap():page.locator(s).click();
  const state=()=>page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{x:p.x,y:p.y,hp:p.hp,energy:p.energy,coins:p.coins,inventory:p.inventory,skills:p.skills,expeditions:p.expeditions,deeds:p.deeds,discoveries:p.discoveries,equippedTool:p.equippedTool,equippedWeapon:p.equippedWeapon,equippedArmor:p.equippedArmor};});
  const visible=()=>page.locator('#inventory .item-row:visible').evaluateAll(rows=>rows.map(el=>el.dataset.itemId).sort());
  const shot=async label=>{if(process.env.UI_EVIDENCE_DIR){await mkdir(process.env.UI_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:`${process.env.UI_EVIDENCE_DIR}/${vp.name}-pack-${label}.png`});}};
  const choose=async id=>{await activate(`[data-pack-filter="${id}"]`);assert.equal(await page.locator('#inventory').getAttribute('data-pack-view'),id);assert.equal(await page.locator('.pack-filters [aria-pressed=true]').count(),1);assert.equal(await page.locator(`[data-pack-filter="${id}"]`).getAttribute('aria-pressed'),'true');};
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setPosition(900,600);d.setHp(100);d.setEnergy(100);for(const n of d.snapshot().npcs){const live=d.npc(n.id);live.x=30;live.y=30;live.think=60;live.target={x:30,y:30};}d.advance(0);});
  await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player.attackCd===0,null,{timeout:1500});
  await activate('[data-panel=pack]');await choose('all');
  assert.deepEqual(await visible(),['bread'],'Fresh reset intentionally starts with Brown Bread');
  assert.match(await page.locator('#pack-filter-status').textContent(),/All: 1 of 1 carried item types/);
  await choose('gear');assert.deepEqual(await visible(),[]);assert.match(await page.locator('#pack-filter-empty').innerText(),/No carried gear/);assert.equal(await page.locator('#pack-filter-empty').isVisible(),true);
  await choose('materials');assert.deepEqual(await visible(),[]);assert.match(await page.locator('#pack-filter-empty').innerText(),/No carried materials/);assert.equal(await page.locator('#pack-filter-empty').isVisible(),true);
  await choose('supplies');assert.deepEqual(await visible(),['bread']);assert.equal(await page.locator('#pack-filter-empty').isVisible(),false);
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('wood',1);d.advance(0);});
  await choose('gear');assert.match(await page.locator('#pack-filter-empty').innerText(),/No carried gear/);
  const empty=await state();await choose('all');assert.deepEqual(await visible(),['bread','wood']);assert.deepEqual(await state(),empty);
  await page.evaluate(ids=>{const d=window.__BRIAR_GLEN_DEBUG__;for(const id of ids)if(id!=='wood')d.give(id,1,2.8);d.advance(0);},groups.all);
  await page.waitForFunction(()=>document.querySelectorAll('#inventory .item-row').length===17);
  const before=await state(),weight=await page.locator('#pack-weight').innerText(),loadout=await page.locator('#loadout-summary').innerText();
  await page.evaluate(()=>window.__packNodes=[...document.querySelectorAll('#inventory .item-row')]);
  for(const id of ['gear','supplies','materials','all']){
    await choose(id);assert.deepEqual(await visible(),[...groups[id]].sort());assert.deepEqual(await state(),before,'Pack filtering must not change player state');
    assert.equal(await page.locator('#pack-weight').innerText(),weight,'Weight includes hidden carried items');assert.equal(await page.locator('#loadout-summary').innerText(),loadout,'Equipped summary stays complete');
    assert.match(await page.locator('#pack-filter-status').textContent(),new RegExp(`${groups[id].length} of 17`));
    assert.equal(await page.locator(`[data-pack-filter="${id}"]`).evaluate(el=>document.activeElement===el),true);
    assert.equal(await page.evaluate(()=>window.__packNodes.every(el=>el.isConnected&&el===document.querySelector(`[data-item-id="${el.dataset.itemId}"]`))),true,'Filtering preserves every original item node');
    for(const b of await page.locator('.pack-filters button').all()){const box=await b.boundingBox();assert.ok(box.width>=44&&box.height>=44);}
    await shot(id);
  }
  await page.locator('[data-pack-filter=gear]').focus();await page.keyboard.press('Enter');assert.deepEqual(await visible(),[...groups.gear].sort());
  await page.locator('[data-pack-filter=supplies]').focus();await page.keyboard.down('Space');try{await page.waitForTimeout(650);}finally{await page.keyboard.up('Space');}
  assert.deepEqual(await visible(),[...groups.supplies].sort());assert.deepEqual(await state(),before,'Held filter input must not attack or move');
  for(const id of ['craft','journal','character','nearby','pack'])await activate(`[data-panel=${id}]`);
  assert.deepEqual(await visible(),[...groups.supplies].sort());assert.deepEqual(await state(),before);
  // Original equipment handlers, independent slots, focus restoration and CSS filter survive live rerenders.
  await choose('gear');await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.equip('bow');d.equip('pick');d.equip('jerkin');d.advance(0);});
  await activate('[data-equip=blade]');let p=await state();assert.equal(p.equippedWeapon,'blade');assert.equal(p.equippedTool,'pick');assert.equal(p.equippedArmor,'jerkin');
  await page.locator('[data-equip=blade]').focus();await page.keyboard.press('Space');p=await state();assert.equal(p.equippedWeapon,null);assert.equal(p.energy,100);
  await page.locator('[data-equip=blade]').focus();await page.keyboard.press('Enter');assert.equal((await state()).equippedWeapon,'blade');
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('wood',1);d.advance(0);});
  assert.deepEqual(await visible(),[...groups.gear].sort());
  const focused=await page.locator('[data-equip=blade]').evaluate(el=>{const b=el.getBoundingClientRect(),p=el.closest('.play-panel').getBoundingClientRect();return{focused:document.activeElement===el,visible:b.height>0&&b.top>=p.top-1&&b.bottom<=p.bottom+1};});
  assert.deepEqual(focused,{focused:true,visible:true},'Focused equipment stays visible when filtered inventory refreshes');
  // Consuming a supply removes its row but never removes hidden gear from the pack.
  await choose('supplies');await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setHp(40);d.advance(0);});await activate('#quick-tonic');
  await page.waitForFunction(()=>!document.querySelector('#inventory [data-item-id=tonic]'));
  assert.deepEqual(await visible(),['arrows','bread']);assert.ok((await state()).hp>40);assert.equal((await state()).inventory.blade.qty,1);
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setHp(100);d.give('wood',1000000);d.advance(0);});await choose('materials');await shot('large-counts');
  const saved=await state(),persisted=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.save();const p=JSON.parse(localStorage.getItem(d.build().saveKey)).player;return{x:p.x,y:p.y,hp:p.hp,energy:p.energy,coins:p.coins,inventory:p.inventory,skills:p.skills,expeditions:p.expeditions,deeds:p.deeds,discoveries:p.discoveries,equippedTool:p.equippedTool,equippedWeapon:p.equippedWeapon,equippedArmor:p.equippedArmor};});
  assert.deepEqual(persisted,saved,'Pack filters add no gameplay save state');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');
  const restored=await state(),{energy:restoredEnergy,...restoredStable}=restored,{energy:savedEnergy,...savedStable}=saved;
  assert.deepEqual(restoredStable,savedStable,'Pack filtering must preserve durable gameplay state across reload');
  assert.ok(Math.abs(restoredEnergy-savedEnergy)<=.06,'Reload may advance at most one native .05 frame of energy');
  await activate('[data-panel=pack]');
  assert.equal(await page.locator('#inventory').getAttribute('data-pack-view'),'all');assert.deepEqual(await visible(),Object.keys(saved.inventory).sort());
  await choose('gear');await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.advance(0);});
  assert.deepEqual(await visible(),[]);assert.match(await page.locator('#pack-filter-empty').innerText(),/No carried gear/);assert.equal(await page.locator('#pack-filter-empty').isVisible(),true);
  await choose('supplies');assert.deepEqual(await visible(),['bread']);assert.equal(await page.locator('#pack-filter-empty').isVisible(),false);
  await choose('all');assert.deepEqual(await visible(),['bread']);
  console.log(`PASS ${vp.name}: Pack groups for all17 types, empty/live/depleted lists, stable nodes and focus, native filtering/equip/stow/tonic, full weight/loadout and exact saved state`);
}
