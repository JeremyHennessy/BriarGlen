import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Readiness fixtures exercise the original DOM controls; no gameplay outcome is relaxed.
export async function proveInteractionUi(page, vp) {
  // A fresh document isolates this suite from ordinary drops deliberately retained by reset().
  await page.evaluate(()=>localStorage.removeItem('briar-glen-reboot-v1'));
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');
  const activate=async selector=>{const el=page.locator(selector);if(vp.touch)await el.tap();else await el.click();};
  const refresh=()=>page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.advance(0));
  // Reset preserves ordinary world drops. Choose an actually empty view, not a presumed empty spawn.
  const setup=()=>page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();for(const n of d.snapshot().npcs){const live=d.npc(n.id);live.x=30;live.y=30;}const objects=[...d.landmarks(),...d.resourcesAll().filter(r=>r.available),...d.drops(),...d.snapshot().npcs];let point=null;for(let y=200;y<=1000&&!point;y+=100)for(let x=200;x<=1600;x+=100)if(objects.every(o=>Math.hypot(o.x-x,o.y-y)>100)){point={x,y};break;}if(!point)throw Error('Fixture needs an empty interaction view');d.setPosition(point.x,point.y);d.advance(0);});
  const savedState=()=>page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return {inventory:p.inventory,coins:p.coins,skills:p.skills,expeditions:p.expeditions,equippedWeapon:p.equippedWeapon,equippedArmor:p.equippedArmor,equippedTool:p.equippedTool};});
  const shot=async name=>{if(process.env.UI_EVIDENCE_DIR){await mkdir(process.env.UI_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:`${process.env.UI_EVIDENCE_DIR}/${vp.name}-use-${name}.png`});}};
  const hint=async (label,kind)=>{assert.equal(await page.locator('#interact-readiness').innerText(),label);assert.equal(await page.locator('#interaction-context').getAttribute('data-kind'),kind);};
  await setup();await activate('[data-panel="nearby"]');await refresh();
  await hint('None','none');assert.match(await page.locator('#interaction-help').innerText(),/Tap a person/);
  assert.equal(await page.locator('#interact-btn').isEnabled(),true,'A no-target hint must not replace/disable the original action');
  await activate('#interact-btn');assert.match(await page.locator('#toast').innerText(),/Nothing useful within reach/);
  await shot('empty');

  // The preview ranges deliberately remain wider than the original Use ranges.
  const resource=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,all=d.resourcesAll(),landmarks=d.landmarks(),drops=d.drops();const r=all.find(r=>r.available&&r.type==='briarleaf'&&all.every(o=>o.id===r.id||!o.available||Math.hypot(o.x-r.x-46,o.y-r.y)>60)&&landmarks.every(l=>Math.hypot(l.x-r.x-46,l.y-r.y)>60)&&drops.every(o=>Math.hypot(o.x-r.x-46,o.y-r.y)>60));if(!r)throw Error('Fixture needs an isolated Briarleaf');d.setPosition(r.x+46,r.y);d.advance(0);return r;});
  await hint('Closer','none');assert.match(await page.locator('#interaction-help').innerText(),/outside Use range/);
  assert.match(await page.locator('#nearby').innerText(),/Briarleaf/);await shot('closer');
  const before=await savedState();await activate('#interact-btn');assert.deepEqual(await savedState(),before);
  // Avoid floating-point ambiguity in randomly positioned resource coordinates.
  const edge=await page.evaluate(r=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setPosition(r.x+44.01,r.y);d.advance(0);return document.querySelector('#interact-readiness').textContent;},resource);
  assert.equal(edge,'Closer');
  await page.evaluate(r=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setPosition(r.x+40,r.y);d.advance(0);},resource);
  await hint('Gather','resource');assert.equal(await page.locator('#interaction-target').innerText(),'Briarleaf');assert.match(await page.locator('#interaction-help').innerText(),/4 energy/);
  const stable=await savedState();for(const panel of ['pack','craft','journal','character','nearby']){await activate(`[data-panel="${panel}"]`);assert.equal(await page.locator('.play-panel:visible').count(),1);}
  assert.deepEqual(await savedState(),stable,'Reading contextual guidance must not spend supplies or grant progress');
  await page.locator('#interact-btn').focus();await page.keyboard.press('Enter');await refresh();
  assert.equal(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player.inventory.briarleaf?.qty),1);
  assert.equal(await page.evaluate(id=>window.__BRIAR_GLEN_DEBUG__.resourcesAll().find(r=>r.id===id).available,resource.id),false);
  assert.notEqual(await page.locator('#interaction-context').getAttribute('data-target'),resource.id,'Gathered resources leave the action cue');

  await setup();const ledger=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.landmarks().find(l=>l.id==='stonepine-trail-ledger'));
  await page.evaluate(l=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setPosition(l.x+53,l.y);d.advance(0);},ledger);
  await hint('Closer','none');assert.match(await page.locator('#objective-direction').innerText(),/Close by/);assert.doesNotMatch(await page.locator('#objective-direction').innerText(),/Within reach/);
  await activate('#interact-btn');assert.equal(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.stonepineExpedition().started),false);await shot('ledger-closer');
  const ledgerEdge=await page.evaluate(l=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setPosition(l.x+50,l.y);d.advance(0);return document.querySelector('#interact-readiness').textContent;},ledger);assert.equal(ledgerEdge,'Closer','Use landmark radius remains strict <50');
  await page.evaluate(l=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setPosition(l.x+45,l.y);d.advance(0);},ledger);
  await hint('Begin','landmark');assert.match(await page.locator('#objective-direction').innerText(),/Within reach/);
  await activate('#interact-btn');await refresh();await hint('Review','landmark');assert.equal(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.stonepineExpedition().started),true);await shot('ledger-started');

  // Real mouse/touch input must execute the suggested approach, not merely a debug target call.
  await setup();await page.evaluate(l=>{const d=window.__BRIAR_GLEN_DEBUG__,n=d.npc('rowan');n.x=l.x+60;n.y=l.y;d.setPosition(l.x+90,l.y);d.advance(0);},ledger);
  await hint('Details','npc');await page.waitForTimeout(80);
  const worldCanvas=page.locator('#game'),canvasBox=await worldCanvas.boundingBox();assert.ok(canvasBox);
  const point={x:canvasBox.width/2-90,y:canvasBox.height/2};
  if(vp.touch)await worldCanvas.tap({position:point});else await worldCanvas.click({position:point});
  await page.waitForFunction(()=>document.querySelector('#objective-direction')?.textContent.includes('Walking'),null,{timeout:1000});
  assert.match(await page.locator('#objective-direction').innerText(),/Walking .* · Stonepine Trail Ledger/);
  await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__.stonepineExpedition().started,null,{timeout:5000});
  assert.equal(await page.locator('#panel-nearby').isVisible(),true);await shot('canvas-approach');

  // Resident priority is disclosed, not silently rewritten into a new target resolver.
  await setup();await page.evaluate(l=>{const d=window.__BRIAR_GLEN_DEBUG__,n=d.npc('rowan');n.x=l.x;n.y=l.y;d.setPosition(l.x,l.y);d.advance(0);},ledger);
  await hint('Details','npc');assert.equal(await page.locator('#interaction-target').innerText(),'Rowan');assert.match(await page.locator('#interaction-help').innerText(),/takes Use priority/);
  assert.match(await page.locator('#objective-direction').innerText(),/resident has Use priority/);await activate('#interact-btn');assert.equal(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.stonepineExpedition().started),false);await shot('overlap');
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.tapTarget('landmark','stonepine-trail-ledger');d.advance(.05);});
  assert.equal(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.stonepineExpedition().started),true,'Existing targeted approach still bypasses generic Use priority');

  await setup();await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,n=d.npc('mira');n.x=900;n.y=600;d.setPosition(900,600);d.advance(0);});
  await hint('Details','npc');assert.match(await page.locator('#interaction-help').innerText(),/Help and trade/);await activate('#interact-btn');assert.match(await page.locator('#nearby').innerText(),/Mira/);
  // The existing Nearby renderer replaces its buttons each tick; native scrolling and bounds are sampled in one browser turn.
  for(const selector of ['[data-near="sell"]','[data-near="buy"]','.interaction-controls summary']){// Resolve and measure in one browser task: normal Nearby refresh may replace a locator's earlier handle.
    const {b,p}=await page.evaluate(selector=>{const el=document.querySelector(selector);el.scrollIntoView({block:'nearest'});return{b:el.getBoundingClientRect().toJSON(),p:document.querySelector('#panel-nearby').getBoundingClientRect().toJSON()};},selector);
    assert.ok(b.width>0&&b.height>0,'Resident/help geometry belongs to a live visible control');assert.ok(b&&p&&b.y>=p.y-1&&b.y+b.height<=p.y+p.height+1,'Resident/help controls remain reachable');}
  await activate('.interaction-controls summary');assert.equal(await page.locator('.interaction-controls').getAttribute('open'),'');
  const expeditionDirection=await page.locator('#objective-direction').innerText();
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.tapWorld(1800,1100);d.advance(0);});
  assert.match(await page.locator('#interaction-travel').innerText(),/Use stops walking/);assert.match(await page.locator('#objective-direction').innerText(),/Walking .* · selected spot/);
  await activate('#interact-btn');await refresh();assert.equal(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.navigation().active),false);assert.equal(await page.locator('#objective-direction').innerText(),expeditionDirection);
  await shot('resident');

  // Honest special-landmark actions: display does not grant progress or waive requirements.
  await setup();await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,l=d.landmarks().find(l=>l.id==='deep-quarry-seam');d.setPosition(l.x,l.y);d.advance(0);});
  await hint('Blocked','landmark');assert.match(await page.locator('#interaction-help').innerText(),/Defeat Emberback/);const blocked=await savedState();await activate('#interact-btn');assert.deepEqual(await savedState(),blocked);assert.match(await page.locator('#toast').innerText(),/Emberback/);await shot('blocked');
  await setup();await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,l=d.landmarks().find(l=>l.id==='moonwell-hollow');d.setPosition(l.x,l.y);d.advance(0);});
  await hint('Chart','landmark');await activate('#interact-btn');await refresh();await hint('Inspect','landmark');assert.match(await page.locator('#interaction-help').innerText(),/Quiet until dusk/);
  await setup();await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,l=d.landmarks().find(l=>l.id==='stonepine-waycache');d.setPosition(l.x,l.y);d.spawnWolfAt(l.x+100,l.y);d.advance(0);});
  await hint('Blocked','landmark');await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.clearEnemies();d.advance(0);});await hint('Secure','landmark');await activate('#interact-btn');await refresh();await hint('Stash','landmark');assert.match(await page.locator('#interaction-help').innerText(),/Store and Take/);
  const saved=await savedState();await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');await refresh();
  assert.deepEqual(await savedState(),saved,'Readiness must survive reload without altering state');await hint('Stash','landmark');await shot('stash');
  const bounds=await page.evaluate(()=>{const p=document.querySelector('#panel-nearby');return{w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,pw:p.clientWidth,psw:p.scrollWidth,buttons:['#attack-btn','#interact-btn','#quick-brace','#quick-tonic'].map(s=>document.querySelector(s).getBoundingClientRect().toJSON())};});
  assert.ok(bounds.sw<=bounds.w+1&&bounds.sh<=bounds.h+1&&bounds.psw<=bounds.pw+1,`${vp.name}: interaction cue overflows`);
  for(const b of bounds.buttons)assert.ok(b.x>=0&&b.y>=0&&b.right<=bounds.w+1&&b.bottom<=bounds.h+1&&b.width>=44&&b.height>=44,`${vp.name}: persistent action inaccessible`);
  if(vp.touch){await page.setViewportSize({width:vp.height,height:vp.width});await page.waitForTimeout(220);await hint('Stash','landmark');assert.equal(await page.locator('.play-panel:visible').count(),1);await page.setViewportSize({width:vp.width,height:vp.height});await page.waitForTimeout(220);}
  console.log(`PASS ${vp.name}: contextual Use, exact reach, unchanged priority/actions, keyboard/touch, landmarks, navigation, panel state, reload and bounds`);
}
