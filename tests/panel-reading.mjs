import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

// Synthetic population/position setup; every tested keyboard action runs in native time.
export async function provePanelReading(page,vp){
  const activate=async selector=>vp.touch?page.locator(selector).tap():page.locator(selector).click();
  const state=()=>page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{x:p.x,y:p.y,hp:p.hp,energy:p.energy,coins:p.coins,inventory:p.inventory,skills:p.skills,expeditions:p.expeditions,equippedWeapon:p.equippedWeapon,equippedArmor:p.equippedArmor,equippedTool:p.equippedTool};});
  const shot=async label=>{if(process.env.UI_EVIDENCE_DIR){await mkdir(process.env.UI_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:`${process.env.UI_EVIDENCE_DIR}/${vp.name}-reading-${label}.png`});}};
  const setup=()=>page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();for(const n of d.snapshot().npcs){const live=d.npc(n.id);live.x=30;live.y=30;live.think=60;live.target={x:30,y:30};}d.setPosition(900,600);d.setHp(100);d.setEnergy(100);for(const id of ['iron','wood','hide','briarleaf','mooncap','arrows','tonic','bow','blade','pick','jerkin','bedroll'])d.give(id,1,2.8);d.advance(0);});
  const root=async id=>{await activate(`[data-panel="${id}"]`);await page.locator(`#panel-tab-${id}`).focus();await page.keyboard.press('Tab');assert.equal(await page.locator(`#panel-${id}`).evaluate(el=>document.activeElement===el),true,'Tab enters the visible reading panel');};
  for(const id of ['journal','pack','craft','character','nearby']){
    await setup();
    if(id==='nearby')await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,n=d.npc('mira');n.x=900;n.y=600;n.target={x:900,y:600};n.name='Mira the herbalist with a long account of the village supply routes '.repeat(8);n.think=60;d.advance(0);});
    await root(id);const panel=page.locator(`#panel-${id}`);await page.keyboard.press('Home');await page.waitForTimeout(250);
    const before=await state(),scrollBefore=await panel.evaluate(el=>({top:el.scrollTop,overflow:el.scrollHeight>el.clientHeight+2}));
    await page.keyboard.down('ArrowDown');await page.waitForTimeout(250);await page.keyboard.up('ArrowDown');await page.waitForTimeout(250);
    assert.deepEqual(await state(),before,`${id}: reading arrows must not move, spend energy or change game state`);
    const afterArrow=await panel.evaluate(el=>el.scrollTop);if(scrollBefore.overflow)assert.ok(afterArrow>scrollBefore.top,`${id}: native ArrowDown scrolls overflow`);
    await page.keyboard.press('Home');await page.waitForTimeout(250);
    await page.keyboard.press('Space');await page.waitForTimeout(250);
    assert.deepEqual(await state(),before,`${id}: panel Space reads without attacking or spending`);
    const afterSpace=await panel.evaluate(el=>el.scrollTop);if(scrollBefore.overflow)assert.ok(afterSpace>0,`${id}: native Space scrolls overflow`);
    await page.keyboard.press('Shift+Space');await page.waitForTimeout(250);assert.deepEqual(await state(),before,`${id}: reverse reading must preserve state`);
    for(const key of ['ArrowUp','ArrowLeft','ArrowRight','PageDown','PageUp','End','Home']){await page.keyboard.press(key);}
    await page.waitForTimeout(250);assert.deepEqual(await state(),before,`${id}: all reading keys preserve player state`);
    assert.equal(await panel.evaluate(el=>document.activeElement===el),true);assert.equal(await page.locator('.play-panel:visible').count(),1);
    await shot(id);
  }
  // Native summary and navigation button activation remain intact, without a second world action.
  await setup();await activate('#objective-open');const before=await state();
  const summary=page.locator('.guide-sources summary');await summary.focus();
  // Earlier guide proof may leave this existing disclosure open; close it with its normal key first.
  if(await page.locator('.guide-sources').getAttribute('open')!==null)await page.keyboard.press('Enter');
  await page.keyboard.press('Space');await page.waitForTimeout(100);assert.notEqual(await page.locator('.guide-sources').getAttribute('open'),null);assert.deepEqual(await state(),before);
  await page.keyboard.press('Enter');assert.equal(await page.locator('.guide-sources').getAttribute('open'),null);
  await page.locator('[data-guide-panel="craft"]').focus();await page.keyboard.down('Space');await page.waitForTimeout(650);await page.keyboard.up('Space');assert.equal(await page.locator('#panel-craft').isVisible(),true);assert.deepEqual(await state(),before);
  // Deliberate Escape/world controls are not swallowed by the panel handler.
  await page.keyboard.press('Escape');assert.equal(await page.locator('#game').evaluate(el=>document.activeElement===el),true);
  const worldBefore=await state();await page.keyboard.down('ArrowDown');
  // Require an actual native movement frame, not a fixed 150ms scheduling assumption.
  try{await page.waitForFunction(y=>window.__BRIAR_GLEN_DEBUG__.snapshot().player.y>y+3,worldBefore.y,{timeout:1500});}
  finally{await page.keyboard.up('ArrowDown');}
  const moved=await state();assert.ok(moved.y>worldBefore.y+3,'World-focused arrows still move');
  await page.keyboard.press('Space');const hit=await state();assert.ok(hit.energy<moved.energy-2,'World-focused Space still attacks with its original energy cost');
  await page.keyboard.press('j');assert.equal(await page.locator('#panel-journal').isVisible(),true);assert.equal(await page.locator('#game').evaluate(el=>document.activeElement===el),true,'Explicit panel shortcut retains existing world-focus behavior');
  console.log(`PASS ${vp.name}: native panel Arrow/Space/Home/End/Page reading, exact game-state preservation, populated panels, summary/button activation, Escape and original world movement/attack`);
}
