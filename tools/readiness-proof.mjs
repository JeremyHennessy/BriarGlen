
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
