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
  console.log(`PASS ${vp.name}: play UI panels, HUD, recipe requirements, shortcuts, action isolation, journal, resize, saved progress`);
}
