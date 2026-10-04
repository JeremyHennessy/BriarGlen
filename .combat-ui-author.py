from pathlib import Path
import subprocess
BASE='9c1c957ebf48b97e93ea23d7daa2ed7e87a7dcdf'
get=lambda p:subprocess.check_output(['git','show',f'{BASE}:{p}']).decode()
p=Path('src/game.js');old=get(str(p));assert p.read_text()==old
helper='''  // Presentation memory only; never persisted or used by combat resolution.
  let combatHudHp=player.hp,combatHudLoss=0,combatHudHitUntil=0;
  function renderCombatCue(){
    const el=document.getElementById('combat-cue');if(!el)return;
    const now=performance.now();if(player.hp<combatHudHp){combatHudLoss=Math.round(combatHudHp-player.hp);combatHudHitUntil=now+2200;}else if(player.hp>combatHudHp)combatHudHitUntil=0;combatHudHp=player.hp;
    const alive=world.enemies.filter(e=>!e.dead),near=alive.filter(e=>dist(player,e)<=300).sort((a,b)=>dist(player,a)-dist(player,b))[0],profile=combatProfile(),cost=profile.bowReady?5:4;
    const name=e=>e?.type==='emberback'?'Emberback':e?.type==='briarwolf'?'Briar Wolf':e?.type==='mirecaller'?'Mirecaller':'Wolf';
    let target=null,best=Infinity;for(const e of alive){if(e.playerOnly&&player.apprentice?.enabled)continue;const gap=dist(player,e);if(gap>profile.range)continue;if(!profile.bowReady){target=e;break;}if(gap<best){target=e;best=gap;}}
    const hit=now<combatHudHitUntil;el.hidden=!near&&!hit;el.dataset.target=target?.id||'';
    let action=player.attackCd>0?'Attack recovering':profile.bowFunctional&&!profile.arrows?'No arrows · craft in Make':player.energy<cost?`Need ${cost} energy · move away and rest`:target?`Attack ${name(target)} · ${cost} energy`:`No target in reach · swing costs ${cost} energy`;
    if(near)action+=player.guarded?' · Braced':player.energy>=10?' · Brace 10 energy':'';
    const warning=near?.windup>0?(near.type==='mirecaller'?' · Move out of the marked ring':near.type==='briarwolf'?' · Pounce incoming':' · Strike incoming'):near&&dist(player,near)<28?' · Close threat':'';
    const heading=(near?`${name(near)} · ${Math.max(0,Math.ceil(near.hp))}/${near.maxHp} health${warning}`:'Recent damage')+(hit?` · Hit −${combatHudLoss}`:'');
    for(const [id,value] of [['combat-threat',heading],['combat-action',action]]){const node=document.getElementById(id);if(node.textContent!==value)node.textContent=value;}
  }
'''
anchor='  function renderPlayHud(){\n';assert old.count(anchor)==1
new=old.replace(anchor,helper+anchor+'  renderCombatCue();\n')
a="ctx.arc(p.x,p.y,e.r,0,TAU);ctx.fill();if(named)"
b="ctx.arc(p.x,p.y,e.r,0,TAU);ctx.fill();if(!named&&!pouncer&&dist(player,e)<=230){ctx.strokeStyle='#d57a6f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,e.r+6,0,TAU);ctx.stroke();ctx.fillStyle='#f0efe4';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText('Wolf',p.x,p.y-28);ctx.textAlign='start';}if(named)"
assert new.count(a)==1;new=new.replace(a,b)
a2="}}else if(e.hp<e.maxHp){ctx.fillStyle='#1b1614';ctx.fillRect(p.x-15,p.y-20,30,4);"
b2="}}else if(e.hp<e.maxHp||dist(player,e)<=230){ctx.fillStyle='#1b1614';ctx.fillRect(p.x-15,p.y-20,30,4);"
assert new.count(a2)==1;new=new.replace(a2,b2)
assert new.replace(helper,'').replace(anchor+'  renderCombatCue();\n',anchor).replace(b,a).replace(b2,a2)==old
p.write_text(new)
p=Path('src/play-ui.js');old=get(str(p));assert p.read_text()==old
anchor="  stage.append(objective, $('.canvas-wrap'));\n";assert old.count(anchor)==1
addition="  $('.canvas-wrap').insertAdjacentHTML('beforeend', '<div id=\"combat-cue\" class=\"combat-cue\" hidden role=\"status\"><strong id=\"combat-threat\"></strong><span id=\"combat-action\"></span></div>');\n"
p.write_text(old.replace(anchor,anchor+addition))
p=Path('src/play-ui.css');old=get(str(p));assert p.read_text()==old
p.write_text(old+'\n/* Close threats remain legible without replacing world messages or controls. */\n.combat-cue{position:absolute;left:8px;bottom:8px;max-width:calc(100% - 16px);box-sizing:border-box;padding:5px 8px;border:1px solid var(--warn);border-radius:7px;background:rgba(14,17,13,.93);color:var(--text);font-size:12px;line-height:1.4;pointer-events:none;z-index:2;overflow-wrap:anywhere}.combat-cue[hidden]{display:none}.combat-cue strong,.combat-cue span{display:block}.combat-cue span{color:var(--warn)}\n')
p=Path('tests/play-ui.mjs');old=get(str(p));assert p.read_text()==old;anchor='  await proveSkillReadiness(page, vp);';assert old.count(anchor)==1
p.write_text("import { proveCombatUi } from './combat-ui.mjs';\n"+old.replace(anchor,anchor+'\n  await proveCombatUi(page, vp);'))
print('PASS exact preservation outside read-only combat cue and close-wolf marker; action/update/seed/save/renderer order unchanged')
