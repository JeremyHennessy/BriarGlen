import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
// Synthetic regression fixtures are separate from the no-debug ordinary outing.
export async function proveCombatUi(page,vp){
  await page.evaluate(()=>{const key='briar-glen-reboot-v1',write=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)return;return write.call(this,k,v);};localStorage.removeItem(key);});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');
  const refresh=()=>page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.advance(0));
  const activate=async s=>vp.touch?page.locator(s).tap():page.locator(s).click();
  const shot=async label=>{if(process.env.UI_EVIDENCE_DIR){await mkdir(process.env.UI_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:`${process.env.UI_EVIDENCE_DIR}/${vp.name}-combat-${label}.png`});}};
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setPosition(900,600);d.advance(0);});
  await activate('[data-panel=nearby]');assert.equal(await page.locator('#combat-cue').isVisible(),false);await shot('quiet');
  // Loading an already-injured save is not a new hit; subsequent real-hit assertions below remain unchanged.
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setHp(77);d.save();});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');await refresh();
  assert.equal(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player.hp),77);
  assert.equal(await page.locator('#combat-cue').isVisible(),false,'Existing saved injury must not announce a new hit');await shot('injured-reload');
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setHp(100);d.advance(0);});
  const wolf=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;const id=d.spawnWolfAt(900,600);d.enemy(id).attackCd=100;d.advance(0);return id;});
  await page.waitForTimeout(80);assert.equal(await page.locator('#combat-cue').isVisible(),true);assert.match(await page.locator('#combat-threat').innerText(),/Wolf.*36\/36 health.*Close threat/);assert.match(await page.locator('#combat-action').innerText(),/Attack Wolf · 4 energy/);
  const ring=await page.evaluate(()=>{const c=document.querySelector('#game'),ctx=c.getContext('2d'),x=Math.floor(c.width/2),y=Math.floor(c.height/2);let count=0;for(let dy=-21;dy<=21;dy++)for(let dx=-21;dx<=21;dx++){if(Math.hypot(dx,dy)<15||Math.hypot(dx,dy)>21)continue;const p=ctx.getImageData(x+dx,y+dy,1,1).data;if(Math.abs(p[0]-213)<8&&Math.abs(p[1]-122)<8&&Math.abs(p[2]-111)<8)count++;}return count;});
  assert.ok(ring>40,'Close wolf marker must remain visible outside player body');await shot('overlap-visible');
  const stable=()=>page.evaluate(id=>{const d=window.__BRIAR_GLEN_DEBUG__,p=d.snapshot().player;return{inventory:p.inventory,coins:p.coins,skills:p.skills,expeditions:p.expeditions,enemy:[id,d.enemy(id)?.hp]};},wolf);
  const before=await stable();for(const panel of ['pack','craft','character','journal','nearby']){await activate(`[data-panel=${panel}]`);assert.equal(await page.locator('.play-panel:visible').count(),1);assert.equal(await page.locator('#combat-cue').isVisible(),true);}assert.deepEqual(await stable(),before,'Reading threats does not change economy/progress/damage');
  // Exact energy boundary and original no-energy action checked in one browser task.
  const energy=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setEnergy(3.99);d.advance(0);const blocked=document.querySelector('#combat-action').textContent,hp=d.enemies()[0].hp;d.attack();const unchanged=d.enemies()[0].hp===hp;d.setEnergy(4);d.advance(0);return{blocked,unchanged,ready:document.querySelector('#combat-action').textContent};});
  assert.match(energy.blocked,/Need 4 energy/);assert.equal(energy.unchanged,true);assert.match(energy.ready,/Attack Wolf · 4 energy/);
  await page.evaluate(()=>{window.__BRIAR_GLEN_DEBUG__.setEnergy(100);});await activate('#attack-btn');await refresh();assert.match(await page.locator('#combat-action').innerText(),/Attack recovering/);assert.equal(await page.evaluate(id=>window.__BRIAR_GLEN_DEBUG__.enemy(id).hp,wolf),26);await shot('hit-target');
  await page.waitForTimeout(450);await activate('#quick-brace');await refresh();assert.match(await page.locator('#combat-action').innerText(),/Braced/);
  await page.evaluate(id=>{const d=window.__BRIAR_GLEN_DEBUG__;d.enemy(id).attackCd=0;d.advance(.05);},wolf);assert.equal(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player.hp),99);assert.match(await page.locator('#combat-threat').innerText(),/Hit −1/);await shot('incoming-hit');
  await page.evaluate(id=>{const d=window.__BRIAR_GLEN_DEBUG__;d.enemy(id).attackCd=100;d.enemy(id).x=1000;d.enemy(id).y=600;d.setHp(100);d.advance(0);},wolf);assert.match(await page.locator('#combat-action').innerText(),/No target in reach/);
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('bow',1);d.equip('bow');d.advance(0);});assert.match(await page.locator('#combat-action').innerText(),/No arrows/);await activate('#attack-btn');assert.match(await page.locator('#toast').innerText(),/No Trail Arrows/);
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('arrows',6);d.advance(0);});assert.match(await page.locator('#combat-action').innerText(),/Attack Wolf · 5 energy/);
  const cue=await page.locator('#combat-cue').boundingBox(),world=await page.locator('#game').boundingBox();assert.ok(cue&&world&&cue.x>=world.x&&cue.y>=world.y&&cue.x+cue.width<=world.x+world.width+1&&cue.y+cue.height<=world.y+world.height+1,'Cue stays inside existing world');
  for(const s of ['#attack-btn','#interact-btn','#quick-brace','#quick-tonic']){const b=await page.locator(s).boundingBox();assert.ok(b&&b.width>=44&&b.height>=44&&b.y>=cue.y+cue.height,'Feedback never obstructs actions');}
  assert.equal(await page.locator('#combat-cue').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
  if(vp.touch){await page.setViewportSize({width:vp.height,height:vp.width});await page.waitForTimeout(220);assert.equal(await page.locator('.play-panel:visible').count(),1);await page.setViewportSize({width:vp.width,height:vp.height});await page.waitForTimeout(220);}
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.clearEnemies();d.setHp(100);d.advance(0);});assert.equal(await page.locator('#combat-cue').isVisible(),false);
  await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());const saved=await stable();await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');const after=await stable();delete saved.enemy;delete after.enemy;assert.deepEqual(after,saved);
  console.log(`PASS ${vp.name}: visible close-wolf overlap, original hit/Brace/damage, attack gates/costs, stable panels, canvas bounds, touch/keyboard and save`);
}
