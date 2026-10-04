from pathlib import Path
import subprocess
BASE='d253e62349e1a99b4bdb2291449b7c60626b7eca'
get=lambda p:subprocess.check_output(['git','show',f'{BASE}:{p}']).decode()
p=Path('src/game.js');old=get(str(p));assert p.read_text()==old
new=old.replace('let combatHudHp=player.hp,combatHudLoss=0,combatHudHitUntil=0;','let combatHudHp=null,combatHudLoss=0,combatHudHitUntil=0;').replace('if(player.hp<combatHudHp){','if(combatHudHp!==null&&player.hp<combatHudHp){')
start=new.index('  function renderInteractionCue(progress){');end=new.index('  // Read-only skill guidance;',start);part=new[start:end]
a="    const text=(id,value)=>{const el=document.getElementById(id);if(el&&el.textContent!==value)el.textContent=value;};"
b="""    // Context text is above Nearby. Preserve an already-visible focused action after that text grows.
    const active=document.activeElement,panel=active?.closest('.play-panel');
    const focusedAction=panel?.id==='panel-nearby'&&!panel.hidden&&active.matches('[data-near],[data-cache-store],[data-cache-take]')?active:null;
    const before=focusedAction?.getBoundingClientRect(),viewport=focusedAction?panel.getBoundingClientRect():null;
    const keepVisible=!!before&&before.top>=viewport.top-1&&before.bottom<=viewport.bottom+1;
    let changed=false;
    const text=(id,value)=>{const el=document.getElementById(id);if(el&&el.textContent!==value){el.textContent=value;changed=true;}};"""
assert part.count(a)==1;part=part.replace(a,b)
extra="    if(changed&&keepVisible&&document.activeElement===focusedAction){const box=focusedAction.getBoundingClientRect(),bounds=panel.getBoundingClientRect();if(box.top<bounds.top)panel.scrollTop-=bounds.top-box.top;else if(box.bottom>bounds.bottom)panel.scrollTop+=box.bottom-bounds.bottom;}\n"
assert part.endswith('  }\n');part=part[:-4]+extra+'  }\n';new=new[:start]+part+new[end:]
reversed=new.replace(b,a).replace(extra,'').replace('let combatHudHp=null,combatHudLoss=0,combatHudHitUntil=0;','let combatHudHp=player.hp,combatHudLoss=0,combatHudHitUntil=0;').replace('if(combatHudHp!==null&&player.hp<combatHudHp){','if(player.hp<combatHudHp){')
assert reversed==old
p.write_text(new)
p=Path('tests/live-ui-stability.mjs');old=get(str(p));assert p.read_text()==old
a="assert.match(await guard.locator('..').innerText(),new RegExp(` ${skillUpdate}$`));"
b="assert.equal(await guard.locator('..').locator('.lvl').innerText(),`Guard ${skillUpdate}`);"
assert old.count(a)==1;p.write_text(old.replace(a,b))
p=Path('tests/combat-ui.mjs');old=get(str(p));assert p.read_text()==old
anchor="  const wolf=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;const id=d.spawnWolfAt(900,600);d.enemy(id).attackCd=100;d.advance(0);return id;});"
added="""  // Loading an already-injured save is not a new hit; subsequent real-hit assertions below remain unchanged.
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setHp(77);d.save();});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');await refresh();
  assert.equal(await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player.hp),77);
  assert.equal(await page.locator('#combat-cue').isVisible(),false,'Existing saved injury must not announce a new hit');await shot('injured-reload');
  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setHp(100);d.advance(0);});
"""
assert old.count(anchor)==1;p.write_text(old.replace(anchor,added+anchor))
print('PASS exact gameplay/save/action/renderer preservation; only first-load hit baseline and post-context focused-control visibility changed')
