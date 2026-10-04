import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

// Synthetic state/position setup is deliberately separate from the ordinary no-debug outing.
export async function proveExpeditionGuide(page,vp){
  const activate=async selector=>vp.touch?page.locator(selector).tap():page.locator(selector).click();
  const refresh=()=>page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.advance(0));
  const state=()=>page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{inventory:p.inventory,coins:p.coins,skills:p.skills,expeditions:p.expeditions,equippedWeapon:p.equippedWeapon,equippedArmor:p.equippedArmor,equippedTool:p.equippedTool};});
  const shot=async name=>{if(process.env.UI_EVIDENCE_DIR){await mkdir(process.env.UI_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:`${process.env.UI_EVIDENCE_DIR}/${vp.name}-guide-${name}.png`});}};
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();for(const n of d.snapshot().npcs){d.npc(n.id).x=30;d.npc(n.id).y=30;d.npc(n.id).think=60;d.npc(n.id).target={x:30,y:30};}d.setPosition(900,600);d.setEnergy(100);d.setHp(100);d.advance(0);});
  await activate('#objective-open');
  const original=await state();
  const noActionCost=()=>page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{hp:p.hp,energy:p.energy};});
  assert.deepEqual(await noActionCost(),{hp:100,energy:100});
  assert.match(await page.locator('#guide-preparation').innerText(),/No working weapon equipped/);
  assert.match(await page.locator('#guide-bread-plan').innerText(),/Carried 2 · Stored 0\/1/);
  assert.equal(await page.locator('#guide-bread-plan').getAttribute('data-state'),'carry');
  assert.match(await page.locator('#guide-arrows-plan').innerText(),/Need 6 more to carry; 6 still to store/);
  assert.equal(await page.locator('#guide-arrows-plan').getAttribute('data-state'),'missing');
  assert.match(await page.locator('#guide-deposit-help').innerText(),/Carried items alone do not count/);
  assert.equal(await page.locator('.guide-sources').getAttribute('open'),null);
  await shot('fresh');
  for(const id of ['pack','craft','character']){
    await activate(`[data-guide-panel="${id}"]`);
    assert.equal(await page.locator(`#panel-${id}`).isVisible(),true);
    assert.equal(await page.locator('.play-panel:visible').count(),1);
    assert.equal(await page.locator(`[data-panel="${id}"]`).evaluate(el=>el===document.activeElement),true,'Shortcut must leave focus on a visible destination');
    assert.deepEqual(await state(),original,'Guide shortcut must never execute an action or change progress');
    assert.deepEqual(await noActionCost(),{hp:100,energy:100});
    await activate('#objective-open');
  }
  const shortcut=page.locator('[data-guide-panel="craft"]');await shortcut.focus();
  await shortcut.evaluate(el=>window.__guideHeldNode=el);await page.keyboard.down('Space');await page.waitForTimeout(650);await page.keyboard.up('Space');
  assert.equal(await page.locator('#panel-craft').isVisible(),true);assert.deepEqual(await state(),original,'Held Space opens Make without attacking/crafting');
  assert.deepEqual(await noActionCost(),{hp:100,energy:100});
  assert.equal(await page.locator('[data-guide-panel="craft"]').evaluate(el=>el===window.__guideHeldNode),true,'Readiness updates must not replace guide controls');
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('arrows',6);d.advance(0);});await activate('#objective-open');
  assert.equal(await page.locator('#guide-arrows-plan').getAttribute('data-state'),'carry');
  assert.match(await page.locator('#guide-arrows-plan').innerText(),/Carried 6 · Stored 0\/6 · Carry enough; store 6/);
  const visit=async id=>{await page.evaluate(id=>{const d=window.__BRIAR_GLEN_DEBUG__,l=d.landmarks().find(l=>l.id===id);d.clearEnemies();d.setPosition(l.x,l.y);d.advance(0);},id);await activate('#interact-btn');await refresh();};
  await visit('stonepine-trail-ledger');await visit('stonepine-overlook');await visit('stonepine-waycache');
  assert.equal(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.stonepineExpedition().cache),true);
  await activate('[data-cache-store="bread"]');
  for(let i=0;i<5;i++)await activate('[data-cache-store="arrows"]');
  await refresh();await activate('#objective-open');
  assert.equal(await page.locator('#guide-bread-plan').getAttribute('data-state'),'stored');
  assert.match(await page.locator('#guide-arrows-plan').innerText(),/Stored 5\/6 · Carry enough; store 1/);
  await activate('[data-panel="nearby"]');await activate('[data-cache-store="arrows"]');await refresh();await activate('#objective-open');
  assert.equal(await page.locator('#guide-arrows-plan').getAttribute('data-state'),'stored');
  assert.match(await page.locator('#guide-deposit-help').innerText(),/Leave the provisions in the Waycache/);
  await shot('ready-return');
  await activate('[data-panel="nearby"]');await activate('[data-cache-take="arrows"]');await refresh();await activate('#objective-open');
  assert.equal(await page.locator('#guide-arrows-plan').getAttribute('data-state'),'carry','Taking a needed deposit restores the honest remaining requirement');
  await activate('[data-panel="nearby"]');await activate('[data-cache-store="arrows"]');await refresh();
  await visit('stonepine-trail-ledger');await activate('#objective-open');
  assert.equal(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.stonepineExpedition().completed),true);
  assert.equal(await page.locator('#guide-arrows-plan').getAttribute('data-state'),'complete');
  assert.match(await page.locator('#guide-deposit-help').innerText(),/without undoing the reward/);
  await visit('stonepine-waycache');for(let i=0;i<6;i++)await activate('[data-cache-take="arrows"]');await refresh();await activate('#objective-open');
  assert.match(await page.locator('#guide-arrows-plan').innerText(),/Stored 0\/6 · Route recorded/);
  assert.equal(await page.locator('#guide-arrows-plan').getAttribute('data-state'),'complete');
  await shot('recorded');
  // Actual save/reload retains earned route/gear state; derived guidance is not persisted independently.
  const saved=await state();await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');
  assert.deepEqual(await state(),saved);await activate('#objective-open');
  await page.waitForFunction(()=>document.querySelector('#guide-arrows-plan')?.dataset.state==='complete');
  assert.equal(await page.locator('#guide-arrows-plan').getAttribute('data-state'),'complete');
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.clearEnemies();d.setPosition(900,600);d.give('arrows',1000000);d.advance(0);});
  await activate('.guide-sources summary');assert.match(await page.locator('.guide-sources').innerText(),/Brown Bread/);
  const geometry=await page.locator('#panel-journal').evaluate(el=>({w:el.clientWidth,sw:el.scrollWidth,pageW:document.documentElement.scrollWidth,vw:innerWidth}));
  assert.ok(geometry.sw<=geometry.w+1&&geometry.pageW<=geometry.vw+1,'Large supply counts must wrap within Journal');
  for(const id of ['pack','craft','character']){const b=await page.locator(`[data-guide-panel="${id}"]`).boundingBox();assert.ok(b.width>=44&&b.height>=44,'Guide touch targets at least44px');}
  console.log(`PASS ${vp.name}: guide navigation, held input, carried vs stored, partial deposits, withdraw/return/reward, large counts, save and stable controls`);
}
