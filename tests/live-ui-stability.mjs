import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Native waits deliberately span several normal UI refreshes, not debug time alone.
export async function proveLiveUiStability(page, vp) {
  const activate=async selector=>{const el=page.locator(selector);if(vp.touch)await el.tap();else await el.click();};
  const refresh=()=>page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.advance(0));
  const setup=()=>page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();for(const n of d.snapshot().npcs){d.npc(n.id).x=30;d.npc(n.id).y=30;}d.setPosition(900,600);d.setEnergy(100);d.advance(0);});
  const state=()=>page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{inventory:p.inventory,coins:p.coins,skills:p.skills,expeditions:p.expeditions,equippedWeapon:p.equippedWeapon,equippedTool:p.equippedTool,equippedArmor:p.equippedArmor};});
  const focusIs=async selector=>assert.equal(await page.locator(selector).evaluate(el=>el===document.activeElement),true,`${vp.name}: focus lost from ${selector}`);
  const shot=async name=>{if(process.env.UI_EVIDENCE_DIR){await mkdir(process.env.UI_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:`${process.env.UI_EVIDENCE_DIR}/${vp.name}-stable-${name}.png`});}};
  await setup();await activate('[data-panel="character"]');
  const guard=page.locator('[data-skill="guard"]');await page.keyboard.press('Tab');await guard.focus();
  const oldButton=await guard.elementHandle(),before=await state();
  await page.waitForTimeout(650);await focusIs('[data-skill="guard"]');assert.equal(await guard.evaluate(el=>el.matches(':focus-visible')),true,'Keyboard focus must remain visibly indicated');
  assert.equal(await oldButton.evaluate(el=>el.isConnected),true,'Unchanged skill controls must not be recreated');
  assert.deepEqual(await state(),before,'A normal UI refresh must not change progress/equipment/supplies');
  await shot('skills-focus');await page.keyboard.press('Enter');await refresh();
  assert.equal((await state()).skills.guard.xp,before.skills.guard.xp+2,'Delayed Enter must activate Brace exactly once');
  assert.equal(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player.guarded),true);
  const xp=(await state()).skills.guard.xp;
  await page.keyboard.down('Space');await page.waitForTimeout(650);await page.keyboard.up('Space');await refresh();
  assert.equal((await state()).skills.guard.xp,xp+2,'Held Space must survive ordinary refresh without dropped/double activation');
  const skillUpdate=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setSkillLevel('guard',3);d.advance(0);return d.snapshot().player.skills.guard.level;});
  await focusIs('[data-skill="guard"]');assert.equal(await guard.locator('..').locator('.lvl').innerText(),`Guard ${skillUpdate}`);
  await page.locator('#attack-btn').focus();await refresh();await focusIs('#attack-btn');
  assert.equal(await page.locator('.play-panel:visible').count(),1);

  // A slow physical click must not lose its target between pointer down and up.
  await setup();await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('bow',1,2.8);d.advance(0);});
  await activate('[data-panel="pack"]');const row=page.locator('[data-equip="bow"]');await row.scrollIntoViewIfNeeded();
  const box=await row.boundingBox();assert.ok(box);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(650);await page.mouse.up();await refresh();
  assert.equal((await state()).equippedWeapon,'bow','Slow equipment click must activate once');
  await row.focus();await page.keyboard.press('Enter');await refresh();assert.equal((await state()).equippedWeapon,null);
  await shot('pack');

  // Live content may change, but focus must stay with the same action on the same resident.
  await setup();await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,n=d.npc('mira');n.x=900;n.y=600;d.advance(0);});
  await activate('[data-panel="nearby"]');await page.locator('[data-near="buy"]').focus();await page.waitForTimeout(650);await focusIs('[data-near="buy"]');
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,n=d.npc('mira');n.x=900;n.y=600;n.trust=7.25;d.advance(0);});
  assert.match(await page.locator('#nearby').innerText(),/trust 7.3/);await focusIs('[data-near="buy"]');await shot('resident');
  // A same-target live update must not scroll the focused action out of sight on a phone.
  const growing=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,n=d.npc('mira');n.x=900;n.y=600;n.name='Mira the Experienced Herbalist of Briar Glen and the Greenwood';n.goalText='Preparing a careful delivery of medicine and supplies for a resident on the far side of the village.';d.advance(0);const b=document.querySelector('[data-near="buy"]').getBoundingClientRect().toJSON(),p=document.querySelector('#panel-nearby').getBoundingClientRect().toJSON();return{b,p};});
  await focusIs('[data-near="buy"]');assert.ok(growing.b.top>=growing.p.top-1&&growing.b.bottom<=growing.p.bottom+1,`${vp.name}: live content hid the focused action`);await shot('resident-growing');
  const beforeSwitch=await state();
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.npc('mira').x=30;d.npc('mira').y=30;d.npc('rowan').x=900;d.npc('rowan').y=600;d.advance(0);});
  await focusIs('#panel-nearby');assert.match(await page.locator('#nearby').innerText(),/Rowan/);
  await page.keyboard.press('Enter');assert.deepEqual(await state(),beforeSwitch,'Focus must not silently transfer a transaction to a different resident');

  // Store/take controls update totals honestly, preserving action focus until that action disappears.
  await setup();await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,l=d.landmarks().find(l=>l.id==='stonepine-waycache');d.setPosition(l.x,l.y);d.advance(0);});
  await activate('#interact-btn');await refresh();assert.equal(await page.locator('#interact-readiness').innerText(),'Stash');
  const initialBread=(await state()).inventory.bread.qty;assert.equal(initialBread,3,'Fresh supplies plus the existing Waycache bread reward');
  const store=page.locator('[data-cache-store="bread"]');await store.focus();await page.waitForTimeout(650);await focusIs('[data-cache-store="bread"]');
  await page.keyboard.press('Enter');await refresh();assert.equal((await state()).inventory.bread.qty,initialBread-1);await focusIs('[data-cache-store="bread"]');
  await shot('store');await page.keyboard.down('Space');await page.waitForTimeout(650);await page.keyboard.up('Space');await refresh();
  assert.equal((await state()).inventory.bread.qty,initialBread-2);await focusIs('[data-cache-store="bread"]');
  await page.keyboard.press('Enter');await refresh();assert.equal((await state()).inventory.bread,undefined);assert.equal(await page.locator('[data-cache-store="bread"]').count(),0);await focusIs('#panel-nearby');
  const take=page.locator('[data-cache-take="bread"]');await take.focus();await page.waitForTimeout(650);await page.keyboard.press('Enter');await refresh();
  assert.equal((await state()).inventory.bread.qty,1);await focusIs('[data-cache-take="bread"]');await shot('take');
  await take.focus();const beforeExit=await state();await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setPosition(900,600);d.advance(0);});
  await focusIs('#panel-nearby');await page.keyboard.press('Enter');assert.deepEqual(await state(),beforeExit,'Leaving a target must not activate a newly rendered control');

  // Focusing elsewhere, switching panels and reloading must not steal focus or change save semantics.
  await page.locator('[data-panel="journal"]').focus();await refresh();await focusIs('[data-panel="journal"]');
  for(const panel of ['craft','pack','character','journal','nearby']){await activate(`[data-panel="${panel}"]`);assert.equal(await page.locator('.play-panel:visible').count(),1);}
  const saved=await state();await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');
  assert.deepEqual(await state(),saved,'Stable controls must preserve the existing save model');
  console.log(`PASS ${vp.name}: native delayed/held skill input, slow equipment click, live focus/content, context-safe resident/storage actions, panel/reload preservation`);
}
