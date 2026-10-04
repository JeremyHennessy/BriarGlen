import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

export async function proveSkillReadiness(page,vp){
  const activate=async s=>vp.touch?page.locator(s).tap():page.locator(s).click();
  const refresh=()=>page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.advance(0));
  const state=()=>page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return {inventory:p.inventory,coins:p.coins,skills:p.skills,expeditions:p.expeditions,equippedWeapon:p.equippedWeapon,equippedTool:p.equippedTool,equippedArmor:p.equippedArmor};});
  const setup=async()=>{await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();for(const n of d.snapshot().npcs){d.npc(n.id).x=30;d.npc(n.id).y=30;}d.setPosition(900,600);d.setEnergy(0);d.advance(0);});await activate('[data-panel="character"]');};
  const note=id=>page.locator(`#skill-${id}-readiness`);
  const shot=async name=>{if(process.env.UI_EVIDENCE_DIR){await mkdir(process.env.UI_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:`${process.env.UI_EVIDENCE_DIR}/${vp.name}-skills-${name}.png`});}};
  const hint=async(id,status,text)=>{assert.equal(await note(id).getAttribute('data-state'),status);assert.match(await note(id).innerText(),text);assert.equal(await page.locator(`[data-skill="${id}"]`).isEnabled(),true,'Explain gates without suppressing original action/message');};
  await setup();
  for(const [id,word,msg] of [['fieldcraft',/Need 8 energy/,/Too tired to survey/],['smithing',/Equip a weapon\/tool/,/Equip damaged gear/],['guard',/Need 10 energy/,/Too tired to brace/],['rapport',/No resident in reach/,/No one close enough/]]){
    await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setEnergy(0);d.advance(0);});await hint(id,'blocked',word);
    const before=await state();await activate(`[data-skill="${id}"]`);assert.match(await page.locator('#toast').innerText(),msg);assert.deepEqual(await state(),before,'Rejected skills must retain original progress/materials');
  }
  await page.locator('[data-skill="fieldcraft"]').scrollIntoViewIfNeeded();await shot('blocked');
  // Thresholds are sampled in one browser task so natural recovery cannot move a boundary between reads.
  const thresholds=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,out=[];for(const energy of [7.99,8,9.99,10]){d.setEnergy(energy);d.advance(0);out.push([energy,document.querySelector('#skill-fieldcraft-readiness').dataset.state,document.querySelector('#skill-guard-readiness').dataset.state]);}return out;});
  assert.deepEqual(thresholds,[[7.99,'blocked','blocked'],[8,'ready','blocked'],[9.99,'ready','blocked'],[10,'ready','ready']]);
  const guard=page.locator('[data-skill="guard"]');await page.keyboard.press('Tab');await guard.focus();const held=await guard.elementHandle();
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setEnergy(0);d.advance(0);});await page.waitForTimeout(350);
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setEnergy(100);d.advance(0);});
  assert.equal(await held.evaluate(el=>el.isConnected&&document.activeElement===el),true,'Readiness changes must not replace the live action');
  const guardBefore=await state();await page.keyboard.down('Space');await page.waitForTimeout(350);await page.keyboard.up('Space');await refresh();
  assert.equal((await state()).skills.guard.xp,guardBefore.skills.guard.xp+2);await hint('guard','caution',/Already braced.*10 energy/);
  assert.equal(await guard.getAttribute('aria-label'),'Brace (3)');assert.equal(await guard.getAttribute('aria-describedby'),'skill-guard-readiness');
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setEnergy(100);d.give('mireglass',1);d.advance(0);});await hint('fieldcraft','ready',/8 energy.*11s/);
  const surveyBefore=await state();await activate('[data-skill="fieldcraft"]');
  assert.ok((await state()).skills.fieldcraft.xp>surveyBefore.skills.fieldcraft.xp);assert.ok(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player.surveyUntil-performance.now()>9000));

  // The existing Mend action chooses a nearby damaged resident BEFORE the equipped weapon/tool.
  await setup();await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;for(const id of ['bow','pick','jerkin'])d.give(id,1,2.8);d.setDurability('bow',40);d.setDurability('pick',40);d.give('wood',1);d.advance(0);});
  await activate('[data-panel="pack"]');await activate('[data-equip="bow"]');await activate('[data-equip="pick"]');await activate('[data-equip="jerkin"]');await activate('[data-panel="character"]');await refresh();
  await hint('smithing','ready',/1 Ashwood.*Briar Bow/);
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,n=d.npc('alden');n.x=1000;n.y=600;n.stock={pick:1};n.stockMeta={pick:{quality:1,durability:20,maxDurability:80,provenance:{maker:'Fixture',history:[]}}};d.advance(0);});
  await hint('smithing','blocked',/Need 1 Iron Ore.*Alden.*Iron Pick.*first/);
  const noIron=await state();await activate('[data-skill="smithing"]');assert.deepEqual(await state(),noIron);assert.match(await page.locator('#toast').innerText(),/Servicing Alden needs 1 Iron Ore/);
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('iron',1);d.setEnergy(0);d.advance(0);});await hint('smithing','ready',/1 Iron Ore.*Alden/);
  const serviceBefore=await state();await activate('[data-skill="smithing"]');await refresh();const serviced=await state();
  assert.equal(serviced.inventory.iron,undefined);assert.equal(serviced.inventory.wood.qty,1);assert.equal(serviced.inventory.bow.durability,serviceBefore.inventory.bow.durability);assert.equal(serviced.skills.smithing.xp,serviceBefore.skills.smithing.xp+8);
  assert.ok(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.npc('alden').stockMeta.pick.durability>20));
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;for(const n of d.snapshot().npcs){d.npc(n.id).x=30;d.npc(n.id).y=30;}d.advance(0);});await hint('smithing','ready',/1 Ashwood.*Briar Bow/);
  const mendBefore=await state();await activate('[data-skill="smithing"]');await refresh();const mended=await state();
  assert.equal(mended.inventory.wood,undefined);assert.ok(mended.inventory.bow.durability>mendBefore.inventory.bow.durability);assert.equal(mended.skills.smithing.xp,mendBefore.skills.smithing.xp+4);
  await hint('smithing','blocked',/Need 1 Ashwood.*Briar Bow/);
  // A full weapon is still a valid action under the original rules; warn rather than inventing a new prohibition.
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('wood',1);d.setDurability('bow',100);d.advance(0);});await hint('smithing','caution',/Full durability.*still costs 1 Ashwood/);await note('smithing').scrollIntoViewIfNeeded();await shot('full-gear-warning');
  await activate('[data-skill="smithing"]');assert.equal((await state()).inventory.wood,undefined,'Full-gear warning must not silently alter the original cost');
  await activate('[data-panel="pack"]');await activate('[data-equip="bow"]');await activate('[data-panel="character"]');await refresh();await hint('smithing','blocked',/Need 1 Iron Ore.*Iron Pick/);

  // Connect has its own strict 110-unit radius and no energy charge; no broker outcome is promised.
  const connectBoundary=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,n=d.npc('mira');n.x=1010;n.y=600;d.setEnergy(0);d.advance(0);const outside=document.querySelector('#skill-rapport-readiness').dataset.state;n.x=1009.9;d.advance(0);return[outside,document.querySelector('#skill-rapport-readiness').dataset.state];});assert.deepEqual(connectBoundary,['blocked','ready']);
  await hint('rapport','ready',/Mira.*no energy cost.*may broker/);const connectBefore=await state();await activate('[data-skill="rapport"]');const connected=await state();assert.ok(connected.skills.rapport.xp>connectBefore.skills.rapport.xp);assert.deepEqual(connected.inventory,connectBefore.inventory);assert.equal(connected.coins,connectBefore.coins);
  await page.locator('[data-skill="rapport"]').focus();
  const growth=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,n=d.npc('alden');n.x=1000;n.y=600;n.name='Alden the Experienced Smith of Briar Glen and the Stonepine Ridge Workshops';n.stock={pick:1};n.stockMeta.pick.durability=10;d.advance(0);const b=document.activeElement.getBoundingClientRect().toJSON(),p=document.querySelector('#panel-character').getBoundingClientRect().toJSON();return{b,p,focused:document.activeElement.dataset.skill};});
  assert.equal(growth.focused,'rapport');assert.ok(growth.b.top>=growth.p.top-1&&growth.b.bottom<=growth.p.bottom+1,`${vp.name}: live readiness growth hid focus`);await shot('growing-target');
  const unchanged=await state();for(const panel of ['craft','pack','nearby','journal','character']){await activate(`[data-panel="${panel}"]`);assert.equal(await page.locator('.play-panel:visible').count(),1);}assert.deepEqual(await state(),unchanged);
  const geometry=await page.locator('#panel-character').evaluate(el=>({w:el.clientWidth,sw:el.scrollWidth}));assert.ok(geometry.sw<=geometry.w+1,`${vp.name}: skill text overflow`);
  for(const id of ['fieldcraft','smithing','guard','rapport']){await page.locator(`[data-skill="${id}"]`).scrollIntoViewIfNeeded();const r=await page.locator(`[data-skill="${id}"]`).boundingBox();assert.ok(r.width>=44&&r.height>=44,'Skill touch targets remain usable');}
  await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());const saved=await state();await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');assert.deepEqual(await state(),saved);await activate('[data-panel="character"]');await refresh();
  assert.equal(await note('fieldcraft').count(),1);assert.equal(await page.locator('[data-skill="guard"]').getAttribute('aria-label'),'Brace (3)');
  console.log(`PASS ${vp.name}: skill costs/gates, resident-first Mend, original action outcomes, strict range, native held input, persistent focus, long text, panels and save`);
}
