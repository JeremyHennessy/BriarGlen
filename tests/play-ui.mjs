import { provePackCategories } from './pack-categories.mjs';
import { proveJournalSections } from './journal-sections.mjs';
import { proveCraftCategories } from './craft-categories.mjs';
import { proveNarrowActions } from './narrow-actions.mjs';
import { provePanelReading } from './panel-reading.mjs';
import { proveExpeditionGuide } from './expedition-guide.mjs';
import { proveCombatUi } from './combat-ui.mjs';
import { proveSkillReadiness } from './skill-ui.mjs';
import { proveLiveUiStability } from './live-ui-stability.mjs';
import { proveInteractionUi } from './interaction-ui.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

export async function provePlayUi(page, vp) {
  const activate = async selector => {
    const control = page.locator(selector);
    if (vp.touch) await control.tap(); else await control.click();
  };
  await page.waitForFunction(() => document.documentElement.dataset.playUi === 'ready');
  await page.evaluate(() => { const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setPosition(900,600);d.advance(0); });
  await activate('[data-panel="nearby"]');
  const original = await page.evaluate(() => {const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return {inventory:p.inventory,coins:p.coins,deeds:p.deeds,expeditions:p.expeditions};});
  for (const [id, content] of [['pack','#inventory'], ['craft','[data-craft="arrows"]'], ['journal','#guide-body'], ['character','#skills'], ['nearby','#nearby']]) {
    await activate(`[data-panel="${id}"]`);
    assert.equal(await page.locator(`#panel-${id}`).isVisible(),true,`${vp.name}: ${id} did not open`);
    assert.equal(await page.locator(content).isVisible(),true,`${vp.name}: ${id} contents unreachable`);
    assert.equal(await page.locator('.play-panel:visible').count(),1,`${vp.name}: more than one panel visible`);
  }
  const after = await page.evaluate(() => {const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return {inventory:p.inventory,coins:p.coins,deeds:p.deeds,expeditions:p.expeditions};});
  assert.deepEqual(after,original,'Presentation navigation must not grant/consume progress or supplies');
  await activate('#objective-open');
  assert.equal(await page.locator('#panel-journal').isVisible(),true);
  assert.match(await page.locator('#objective-text').innerText(),/Visit the Stonepine Trail Ledger/);
  assert.match(await page.locator('#guide-preparation').innerText(),/No working weapon equipped/);
  assert.match(await page.locator('#guide-body').innerText(),/18c/);
  assert.equal(await page.locator('#apprentice-details').getAttribute('open'),null);

  // Tab arrow keys belong to the tablist, not the world's movement handler.
  await activate('[data-panel="pack"]');await page.locator('[data-panel="pack"]').focus();
  const position = await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player.x);
  await page.keyboard.press('ArrowRight');await page.waitForTimeout(80);
  assert.equal(await page.locator('#panel-craft').isVisible(),true);
  assert.equal(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player.x),position);
  await page.keyboard.press('j');assert.equal(await page.locator('#panel-journal').isVisible(),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#panel-nearby').isVisible(),true);

  // Crafting readiness must mirror craft() gate order before the player commits materials.
  await activate('[data-panel="craft"]');
  assert.equal(await page.locator('#recipe-trailpack').getAttribute('data-state'),'locked');
  assert.match(await page.locator('#recipe-trailpack').innerText(),/Complete Stonepine expedition/);
  assert.equal(await page.locator('#recipe-arrows').getAttribute('data-state'),'missing');
  assert.match(await page.locator('#recipe-arrows').innerText(),/Missing materials/);
  assert.match(await page.locator('#recipe-arrows').innerText(),/Makes 6× Trail Arrows/);
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('iron',4);d.give('wood',3);d.give('hide',2);d.give('bow',1,2.8);d.advance(0);});
  await page.waitForTimeout(220);
  assert.equal(await page.locator('#recipe-blade').getAttribute('data-state'),'locked');
  assert.match(await page.locator('#recipe-blade').innerText(),/Smithing 2 required/);
  assert.equal(await page.locator('#recipe-bow').getAttribute('data-state'),'owned');
  assert.match(await page.locator('#recipe-bow').innerText(),/Already owned/);
  assert.match(await page.locator('#recipe-bow').innerText(),/Mend in You/);
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.advance(0);});
  await page.waitForTimeout(220);

  // Native Space activation of a recipe must not also spend attack energy.
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setEnergy(100);d.give('wood',1);d.advance(0);});
  await activate('[data-panel="craft"]');
  assert.match(await page.locator('#recipe-arrows').innerText(),/1\/1 Ashwood/);
  await page.locator('[data-craft="arrows"]').focus();await page.keyboard.press('Space');
  const crafted = await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player);
  assert.equal(crafted.inventory.arrows?.qty,6);assert.equal(crafted.inventory.wood,undefined);
  assert.equal(crafted.energy,100,'Space on a crafting button must not also attack');
  assert.equal(crafted.attackCd,0);
  await activate('#quick-brace');
  assert.equal(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player.guarded),true);
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('tonic',1);d.setHp(40);d.advance(0);});
  await activate('#quick-tonic');
  const healed=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player);
  assert.ok(healed.hp>40);assert.equal(healed.inventory.tonic,undefined);
  await page.waitForTimeout(220);
  assert.match(await page.locator('#hp-text').innerText(),new RegExp(String(Math.ceil(healed.hp))));

  // Real ledger input updates direction/objective without moving the player remotely.
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,l=d.landmarks().find(l=>l.id==='stonepine-trail-ledger');d.setPosition(l.x,l.y);d.advance(0);});
  await activate('#interact-btn');await page.waitForTimeout(220);
  assert.match(await page.locator('#objective-text').innerText(),/Chart Stonepine Overlook/);
  assert.match(await page.locator('#objective-direction').innerText(),/Stonepine Ridge/);
  assert.equal(await page.locator('#panel-nearby').isVisible(),true);

  // Populated pack remains readable and scrolls within its panel, not the page.
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;for(const id of ['iron','wood','hide','briarleaf','mooncap','arrows','tonic','bow','blade','pick','jerkin','bedroll'])d.give(id,1,2.8);d.advance(0);});
  await activate('[data-panel="pack"]');
  const layout = await page.evaluate(() => {
    const box=s=>document.querySelector(s).getBoundingClientRect().toJSON();
    const panel=document.querySelector('#panel-pack');
    return {w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,canvas:box('#game'),side:box('.sidebar'),deck:box('.action-deck'),hp:box('#hp'),energy:box('#energy'),panelW:panel.clientWidth,panelScrollW:panel.scrollWidth,panelBox:box('#panel-pack'),tabs:box('.panel-tabs'),tabBoxes:[...document.querySelectorAll('[data-panel]')].map(el=>el.getBoundingClientRect().toJSON()),controls:['#attack-btn','#interact-btn','#quick-brace','#quick-tonic'].map(box)};
  });
  assert.ok(layout.scrollW<=layout.w+1&&layout.scrollH<=layout.h+1,`${vp.name}: page overflow ${JSON.stringify(layout)}`);
  assert.ok(layout.canvas.width>=250&&layout.canvas.height>=140,`${vp.name}: unusable world`);
  assert.ok(layout.panelBox.width>=layout.side.width-12&&layout.tabs.width>=layout.side.width-12&&layout.tabs.bottom<=layout.panelBox.top+1,`${vp.name}: legacy grid squeezed tabs beside content`);
  for(const tab of layout.tabBoxes)assert.ok(tab.width>=44&&tab.height>=44,`${vp.name}: tab touch target too small`);
  assert.ok(layout.panelScrollW<=layout.panelW+1,`${vp.name}: pack text overflows horizontally`);
  assert.ok(layout.deck.top>=layout.canvas.bottom-1,`${vp.name}: controls cover the world`);
  for(const box of [layout.hp,layout.energy,...layout.controls])assert.ok(box.x>=0&&box.y>=0&&box.right<=layout.w+1&&box.bottom<=layout.h+1,`${vp.name}: essential control offscreen`);
  for(let i=0;i<layout.controls.length;i++)for(let j=i+1;j<layout.controls.length;j++){const a=layout.controls[i],b=layout.controls[j];assert.ok(a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1,`${vp.name}: action buttons overlap`);}
  const canvasPixels=await page.evaluate(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{w:c.width,h:c.height,cw:r.width,ch:r.height};});
  assert.ok(Math.abs(canvasPixels.w-canvasPixels.cw)<=1&&Math.abs(canvasPixels.h-canvasPixels.ch)<=1,'Canvas backing size must follow its visible world area');
  if(process.env.UI_EVIDENCE_DIR){await mkdir(process.env.UI_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:`${process.env.UI_EVIDENCE_DIR}/${vp.name}-pack.png`});}
  await activate('[data-panel="journal"]');
  if(process.env.UI_EVIDENCE_DIR)await page.screenshot({path:`${process.env.UI_EVIDENCE_DIR}/${vp.name}-journal.png`});
  const saved=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.save();return d.snapshot().player;});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');
  const restored=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player);
  assert.deepEqual(restored.inventory,saved.inventory);assert.deepEqual(restored.expeditions,saved.expeditions);assert.equal(restored.coins,saved.coins);
  assert.equal(await page.locator('#panel-nearby').isVisible(),true,'Fresh page defaults to contextual play');
  if(vp.touch){
    const size={width:vp.height,height:vp.width};await page.setViewportSize(size);await page.waitForTimeout(250);
    const resized=await page.evaluate(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect();return {width:r.width,height:r.height,cw:c.width,ch:c.height,scroll:document.documentElement.scrollWidth};});
    assert.ok(resized.width>=250&&resized.height>=140&&resized.scroll<=size.width+1,`${vp.name}: orientation change broke layout ${JSON.stringify(resized)}`);
    assert.ok(Math.abs(resized.width-resized.cw)<=1&&Math.abs(resized.height-resized.ch)<=1);
    await page.setViewportSize({width:vp.width,height:vp.height});await page.waitForTimeout(250);
  }
  await proveEquipmentReadiness(page,vp);
  await proveInteractionUi(page,vp);
  await proveLiveUiStability(page,vp);
  await proveSkillReadiness(page,vp);
  await proveCombatUi(page, vp);
  await proveExpeditionGuide(page, vp);
  await provePanelReading(page, vp);
  await proveNarrowActions(page, vp);
  await proveCraftCategories(page, vp);
  await provePackCategories(page, vp);
  await proveJournalSections(page, vp);
  console.log(`PASS ${vp.name}: play UI panels, HUD, recipe requirements, shortcuts, action isolation, journal, resize, saved progress`);
}

// BUILD 0.95: presentation must agree with the actual equipment and carry rules.
export async function proveEquipmentReadiness(page, vp) {
  const activate = async selector => {const el=page.locator(selector);if(vp.touch)await el.tap();else await el.click();};
  const refresh = () => page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.advance(0));
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setPosition(900,600);d.setEnergy(100);for(const id of ['bow','blade','jerkin','pick'])d.give(id,1,2.8);d.advance(0);});
  await activate('[data-panel="pack"]');
  assert.equal(await page.locator('#loadout-weapon-name').innerText(),'Unarmed');
  for(const kind of ['armor','tool'])assert.equal(await page.locator(`#loadout-${kind}-name`).innerText(),'Not equipped');
  assert.equal(await page.locator('#attack-readiness').innerText(),'Unarmed');
  const state = () => page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{inventory:p.inventory,coins:p.coins,skills:p.skills,expeditions:p.expeditions,equippedWeapon:p.equippedWeapon,equippedTool:p.equippedTool,equippedArmor:p.equippedArmor};});
  const before = await state();
  for(const panel of ['craft','journal','character','nearby','pack'])await activate(`[data-panel="${panel}"]`);
  assert.deepEqual(await state(),before,'Readiness/panel rendering cannot mutate inventory, equipment, skills or rewards');

  await activate('#inventory [data-equip="bow"]');await refresh();
  assert.equal(await page.locator('#loadout-weapon-name').innerText(),'Briar Bow');
  assert.equal(await page.locator('#attack-readiness').innerText(),'No arrows');
  assert.match(await page.locator('#attack-btn').getAttribute('title'),/Craft ammunition/);
  const emptyBefore=await state();await activate('#attack-btn');
  assert.deepEqual(await state(),emptyBefore,'Empty-bow action must not consume items or award experience');
  assert.equal(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player.energy),100);
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('arrows',6);d.setDurability('bow',23);d.advance(0);});
  await activate('#inventory [data-equip="pick"]');await activate('#inventory [data-equip="jerkin"]');await refresh();
  assert.equal(await page.locator('#attack-readiness').innerText(),'Bow · 6');
  assert.equal(await page.locator('#loadout-weapon').getAttribute('data-condition'),'worn');
  assert.match(await page.locator('#loadout-weapon-detail').innerText(),/23 \/ 100 durability · Worn/);
  assert.match(await page.locator('#loadout-armor-detail').innerText(),/absorbs 3 damage/);
  assert.equal(await page.locator('#loadout-tool-name').innerText(),'Iron Pick');
  // Equipment keyboard control still affects just that slot, not combat or supplies.
  await page.locator('#inventory [data-equip="bow"]').focus();await page.keyboard.press('Enter');await refresh();
  assert.equal(await page.locator('#loadout-weapon-name').innerText(),'Unarmed');
  assert.equal(await page.locator('#loadout-armor-name').innerText(),'Wolfhide Jerkin');
  await page.keyboard.press('Enter');await refresh();
  assert.equal(await page.locator('#loadout-weapon-name').innerText(),'Briar Bow');
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;for(const id of ['bow','jerkin','pick'])d.setDurability(id,0);d.advance(0);});
  for(const kind of ['weapon','armor','tool'])assert.equal(await page.locator(`#loadout-${kind}`).getAttribute('data-condition'),'broken');
  assert.equal(await page.locator('#attack-readiness').innerText(),'Broken');
  assert.match(await page.locator('#loadout-armor-detail').innerText(),/absorbs 0 damage/);
  assert.match(await page.locator('#attack-explanation').textContent(),/fall back to unarmed/);
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setEnergy(3);d.advance(0);});
  assert.equal(await page.locator('#attack-readiness').innerText(),'Low energy');
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setEnergy(100);d.give('tonic',2);d.advance(0);});
  assert.equal(await page.locator('#tonic-readiness').innerText(),'2 left');
  await activate('#quick-brace');await refresh();
  assert.equal(await page.locator('#brace-readiness').innerText(),'Braced');
  const saved=await state();await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');await refresh();
  assert.deepEqual(await state(),saved,'The display update must preserve equipment and progress across reload');
  await activate('[data-panel="pack"]');
  assert.equal(await page.locator('#loadout-weapon').getAttribute('data-condition'),'broken');
  assert.equal(await page.locator('#tonic-readiness').innerText(),'2 left');

  for(const [quality,limit,heavy] of [[null,18,true],[1,20,true],[1.9,21,false],[2.8,22,false]]) {
    await page.evaluate(q=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setPosition(900,600);d.give('iron',16);if(q!==null)d.give('trailpack',1,q);d.advance(0);},quality);
    assert.match(await page.locator('#pack-weight').innerText(),new RegExp(`comfort ${limit}$`));
    assert.equal(await page.locator('#pack-weight').getAttribute('data-heavy'),String(heavy));
    assert.equal(await page.locator('#carry-state').getAttribute('data-heavy'),String(heavy));
    assert.match(await page.locator('#carry-state').innerText(),heavy?/slower travel/:/Comfortable load/);
  }
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setPosition(900,600);for(const id of ['bow','blade','pick','jerkin','bedroll','briarleaf','mooncap','hide','wood','iron'])d.give(id,1,2.8);d.give('arrows',120);d.give('tonic',3);d.equip('bow');d.equip('pick');d.equip('jerkin');d.setDurability('bow',23);d.advance(0);});
  await activate('[data-panel="pack"]');await page.locator('#panel-pack').evaluate(el=>el.scrollTop=0);
  // Each status and its primary action must fit without overlapping adjacent controls.
  const geometry=await page.evaluate(()=>{
    const box=el=>el.getBoundingClientRect().toJSON(),overlap=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
    const controls=['attack-btn','interact-btn','quick-brace','quick-tonic'].map(id=>({id,...box(document.getElementById(id))}));
    const statuses=[...document.querySelectorAll('.action-readiness')].map(el=>({id:el.id,box:box(el),parent:box(el.parentElement),scrollW:el.scrollWidth,clientW:el.clientWidth}));
    const meters=[...document.querySelectorAll('.hud-meters label')].map(row=>{const value=row.querySelector('.meter-value'),range=document.createRange();range.selectNodeContents(value);return{value:box(value),rects:[...range.getClientRects()].map(x=>x.toJSON()),progress:box(row.querySelector('progress'))};});
    const panel=document.getElementById('panel-pack');return{controls,statuses,meters,w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,panelW:panel.clientWidth,panelScrollW:panel.scrollWidth,canvas:box(document.getElementById('game')),overlaps:controls.flatMap((a,i)=>controls.slice(i+1).filter(b=>overlap(a,b)))};
  });
  assert.ok(geometry.scrollW<=geometry.w+1&&geometry.scrollH<=geometry.h+1,`${vp.name}: readiness caused page overflow ${JSON.stringify(geometry)}`);
  assert.ok(geometry.panelScrollW<=geometry.panelW+1,`${vp.name}: loadout overflows Pack`);
  assert.ok(geometry.canvas.width>=250&&geometry.canvas.height>=140,`${vp.name}: readiness crowded out the world`);
  assert.equal(geometry.overlaps.length,0,`${vp.name}: action buttons overlap`);
  for(const s of geometry.statuses)assert.ok(s.scrollW<=s.clientW+1&&s.box.left>=s.parent.left&&s.box.right<=s.parent.right+1&&s.box.bottom<=s.parent.bottom+1,`${vp.name}: readiness text clips ${JSON.stringify(s)}`);
  for(const m of geometry.meters)assert.equal(m.rects.length,1,`${vp.name}: meter value wraps into multiple lines ${JSON.stringify(m)}`);
  if(process.env.UI_EVIDENCE_DIR){await mkdir(process.env.UI_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:`${process.env.UI_EVIDENCE_DIR}/${vp.name}-readiness.png`});}
  await activate('.equipment-care summary');
  assert.match(await page.locator('.equipment-care').innerText(),/not a hard capacity/);
  console.log(`PASS ${vp.name}: equipment/readiness state, carry limits, real equip/stow, broken fallback, persistence and layout`);
}
