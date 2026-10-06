import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Presentation-only Character flow proof. Status/Skills selection is session-only;
// keyboard/touch routing and save neutrality use the native UI and existing game state.
export async function proveCharacterSections(page,vp){
  const activate=async s=>vp.touch?page.locator(s).tap():page.locator(s).click();
  const stable=()=>page.evaluate(()=>{
    const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;
    return{x:p.x,y:p.y,hp:p.hp,energy:p.energy,coins:p.coins,inventory:p.inventory,skills:p.skills,expeditions:p.expeditions,deeds:p.deeds,discoveries:p.discoveries,equippedTool:p.equippedTool,equippedWeapon:p.equippedWeapon,equippedArmor:p.equippedArmor};
  });
  const selected=()=>page.locator('.character-sections [aria-selected=true]').getAttribute('data-character-section');

  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setPosition(900,600);d.setHp(100);d.setEnergy(100);for(const n of d.snapshot().npcs){const live=d.npc(n.id);live.x=30;live.y=30;live.think=60;live.target={x:30,y:30};}d.advance(0);});
  await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player.attackCd===0,null,{timeout:1500});
  const before=await stable();

  await activate('[data-panel="character"]');
  assert.equal(await selected(),'status','You defaults to Status');
  assert.equal(await page.locator('#character-status').isVisible(),true);
  assert.equal(await page.locator('#character-skills').isVisible(),false);
  for(const b of await page.locator('.character-sections button').all()){
    const box=await b.boundingBox();assert.ok(box&&box.width>=44&&box.height>=44,`${vp.name}: Character touch target too small`);
  }

  await activate('[data-character-section="skills"]');
  assert.equal(await selected(),'skills');
  assert.equal(await page.locator('#character-status').isVisible(),false);
  assert.equal(await page.locator('#character-skills').isVisible(),true);
  assert.deepEqual(await stable(),before,'Character switching must not mutate player state');

  // Ordinary panel navigation preserves the current session-only subsection.
  await activate('[data-panel="pack"]');await activate('[data-panel="character"]');
  assert.equal(await selected(),'skills','Ordinary panel navigation preserves current Character subsection');

  // Arrow/Home/End stay inside Character and never move the world.
  const position=await page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{x:p.x,y:p.y};});
  await page.locator('[data-character-section="skills"]').focus();await page.keyboard.press('ArrowLeft');
  assert.equal(await selected(),'status');
  await page.keyboard.press('End');assert.equal(await selected(),'skills');
  await page.keyboard.press('Home');assert.equal(await selected(),'status');
  await page.keyboard.press('ArrowRight');assert.equal(await selected(),'skills');
  assert.deepEqual(await page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{x:p.x,y:p.y};}),position,'Character keyboard navigation must not move the player');

  // Held Space on a subsection control may activate it, but must not attack.
  await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.setEnergy(100));
  await page.locator('[data-character-section="status"]').focus();await page.keyboard.down('Space');
  try{await page.waitForTimeout(650);}finally{await page.keyboard.up('Space');}
  const afterSpace=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player);
  assert.equal(afterSpace.energy,100,'Held Space on Character controls must not spend attack energy');
  assert.equal(afterSpace.attackCd,0,'Held Space on Character controls must not start an attack');

  // K is the explicit Skills shortcut while preserving the existing world-focus behavior.
  await activate('[data-panel="nearby"]');await page.locator('#game').focus();await page.keyboard.press('k');
  assert.equal(await page.locator('#panel-character').isVisible(),true);
  assert.equal(await selected(),'skills','K routes directly to Skills');
  assert.equal(await page.locator('#game').evaluate(el=>document.activeElement===el),true,'K keeps existing world focus behavior');
  assert.deepEqual(await stable(),before,'K routing must not change gameplay state');

  // Expedition preparation shortcut intentionally lands on Skills, not Status.
  await activate('#objective-open');
  await activate('[data-guide-panel="character"]');
  assert.equal(await page.locator('#panel-character').isVisible(),true);
  assert.equal(await selected(),'skills','Skills & recovery routes directly to Skills');
  assert.equal(await page.locator('[data-panel="character"]').evaluate(el=>document.activeElement===el),true,'Guide shortcut focuses its visible destination');
  assert.deepEqual(await stable(),before,'Guide routing must not change gameplay state');

  // Exercise long Status text without changing source data or saved state.
  await activate('[data-character-section="status"]');
  await page.evaluate(()=>{
    const known=document.querySelector('#known-for');
    window.__characterOriginalKnownFor=known.textContent;
    known.textContent='Known for: '+('patiently charting long routes, helping residents, repairing field gear, and returning prepared from Stonepine. '.repeat(12));
  });
  const geometry=await page.evaluate(()=>{
    const panel=document.querySelector('#panel-character'),status=document.querySelector('#character-status'),sections=document.querySelector('.character-sections');
    const box=el=>el.getBoundingClientRect().toJSON();
    return{w:innerWidth,pageW:document.documentElement.scrollWidth,panelW:panel.clientWidth,panelScrollW:panel.scrollWidth,statusW:status.clientWidth,statusScrollW:status.scrollWidth,panel:box(panel),sections:box(sections),buttons:[...sections.querySelectorAll('button')].map(box)};
  });
  assert.ok(geometry.pageW<=geometry.w+1,`${vp.name}: Character caused page overflow ${JSON.stringify(geometry)}`);
  assert.ok(geometry.panelScrollW<=geometry.panelW+1&&geometry.statusScrollW<=geometry.statusW+1,`${vp.name}: populated Character overflows horizontally ${JSON.stringify(geometry)}`);
  for(const box of geometry.buttons)assert.ok(box.left>=geometry.panel.left-1&&box.right<=geometry.panel.right+1,`${vp.name}: Character control escapes panel`);
  if(process.env.UI_EVIDENCE_DIR){await mkdir(process.env.UI_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:`${process.env.UI_EVIDENCE_DIR}/${vp.name}-character-sections.png`});}
  await page.evaluate(()=>{document.querySelector('#known-for').textContent=window.__characterOriginalKnownFor;delete window.__characterOriginalKnownFor;});

  assert.deepEqual(await stable(),before,'Character layout fixture and navigation must leave gameplay unchanged');
  const saved=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.save();const p=JSON.parse(localStorage.getItem(d.build().saveKey)).player;return{coins:p.coins,inventory:p.inventory,skills:p.skills,expeditions:p.expeditions,deeds:p.deeds,discoveries:p.discoveries,equippedTool:p.equippedTool,equippedWeapon:p.equippedWeapon,equippedArmor:p.equippedArmor};});
  const expected=await page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{coins:p.coins,inventory:p.inventory,skills:p.skills,expeditions:p.expeditions,deeds:p.deeds,discoveries:p.discoveries,equippedTool:p.equippedTool,equippedWeapon:p.equippedWeapon,equippedArmor:p.equippedArmor};});
  assert.deepEqual(saved,expected,'Character view selection adds no gameplay save state');

  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');
  await activate('[data-panel="character"]');
  assert.equal(await selected(),'status','Character subsection is session-only after reload');
  assert.deepEqual(await page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{coins:p.coins,inventory:p.inventory,skills:p.skills,expeditions:p.expeditions,deeds:p.deeds,discoveries:p.discoveries,equippedTool:p.equippedTool,equippedWeapon:p.equippedWeapon,equippedArmor:p.equippedArmor};}),expected,'Reload preserves durable gameplay state');
  console.log(`PASS ${vp.name}: Character Status/Skills touch, keyboard isolation, K/guide routing, populated layout and save neutrality`);
}
