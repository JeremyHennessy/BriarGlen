from pathlib import Path
import subprocess
BASE='e6dd6005e3bf19fe7012fbc5543d33c2d2d1798d'
def original(path): return subprocess.check_output(['git','show',f'{BASE}:{path}']).decode()
p=Path('src/game.js');old=original(str(p));assert p.read_text()==old
helper='''  // Read-only skill guidance; live text never replaces a held/focused action button.
  function renderSkillReadiness(){
    let changed=false;
    const set=(id,state,text)=>{const el=document.getElementById(`skill-${id}-readiness`);if(!el)return;if(el.textContent!==text){el.textContent=text;changed=true;}el.dataset.state=state;};
    const duration=itemCount('mireglass')>0?11:7;
    set('fieldcraft',player.energy<8?'blocked':'ready',`${player.energy<8?'Need 8 energy':'Ready · 8 energy'} · reveal quality for ${duration}s`);
    set('guard',player.energy<10?'blocked':player.guarded?'caution':'ready',player.energy<10?`Need 10 energy${player.guarded?' · already braced':''}`:player.guarded?'Already braced · using again still costs 10 energy':'Ready · 10 energy · brace for the next hit');
    // The canonical damage query normalizes metadata. Give it copies so a HUD read cannot normalize live NPC state.
    const service=npcs.filter(n=>dist(player,n)<=110).map(n=>damagedArtifactForNpc({...n,stockMeta:copy(n.stockMeta)})).filter(Boolean).sort((a,b)=>(a.ratio-b.ratio)||(dist(player,a.npc)-dist(player,b.npc)))[0];
    if(service){
      set('smithing',itemCount('iron')<1?'blocked':'ready',`${itemCount('iron')<1?'Need 1 Iron Ore':'Ready · 1 Iron Ore'} · service ${service.npc.name}'s ${itemDefs[service.id].name} first`);
    }else{
      const target=player.equippedWeapon||player.equippedTool,slot=player.inventory[target];
      if(!target||!slot)set('smithing','blocked','Equip a weapon/tool or approach damaged resident gear · Patch Jerkin is in Make');
      else{
        const mat=target==='bow'?'wood':'iron',cost=`1 ${itemDefs[mat].name}`,max=Number.isFinite(slot.maxDurability)?slot.maxDurability:100,dur=Number.isFinite(slot.durability)?slot.durability:max,full=dur>=max;
        set('smithing',itemCount(mat)<1?'blocked':full?'caution':'ready',`${itemCount(mat)<1?'Need '+cost:full?'Full durability · still costs '+cost:'Ready · '+cost} · ${itemDefs[target].name}`);
      }
    }
    const resident=nearestNPC(110);
    set('rapport',resident?'ready':'blocked',resident?`Ready · ${resident.name} · no energy cost · may broker a promise`:'No resident in reach · move closer to Connect');
    if(changed){const active=document.activeElement,panel=active?.closest('.play-panel');if(active?.hasAttribute('data-skill')&&panel&&!panel.hidden){const box=active.getBoundingClientRect(),bounds=panel.getBoundingClientRect();if(box.top<bounds.top)panel.scrollTop-=bounds.top-box.top;else if(box.bottom>bounds.bottom)panel.scrollTop+=box.bottom-bounds.bottom;}}
  }
'''
anchor='  function renderPlayHud(){\n';assert old.count(anchor)==1
new=old.replace(anchor,helper+anchor+'  renderSkillReadiness();\n')
a='<button data-skill="${id}">${d.key}</button><div><strong>${d.active}</strong><small>${d.desc}</small></div>'
b='<button data-skill="${id}" aria-label="${d.active} (${d.key})" aria-describedby="skill-${id}-readiness">${d.key}</button><div><strong>${d.active}</strong><small>${d.desc}</small><small class="skill-readiness" id="skill-${id}-readiness"></small></div>'
assert new.count(a)==1;new=new.replace(a,b)
assert new.replace(helper,'').replace(anchor+'  renderSkillReadiness();\n',anchor).replace(b,a)==old
p.write_text(new)
css=Path('src/play-ui.css');cssold=original(str(css));assert css.read_text()==cssold
css.write_text(cssold+'\n/* Skill hints update independently of stable controls. */\n.skill .skill-readiness{display:block;margin-top:6px;font-size:11px;line-height:1.5;overflow-wrap:anywhere}.skill-readiness[data-state=ready]{color:var(--good)}.skill-readiness[data-state=blocked],.skill-readiness[data-state=caution]{color:var(--warn)}\n')
t=Path('tests/play-ui.mjs');before=original(str(t));assert t.read_text()==before
imp="import { proveSkillReadiness } from './skill-ui.mjs';\n";call='  await proveSkillReadiness(page,vp);\n'
after=imp+before.replace('  await proveLiveUiStability(page,vp);','  await proveLiveUiStability(page,vp);\n'+call.rstrip())
assert after.replace(imp,'').replace(call,'')==before;t.write_text(after)
for f in ['index.html','styles.css','src/play-ui.js','tests/smoke.mjs','tests/interaction-ui.mjs','tests/live-ui-stability.mjs','.github/workflows/reboot-game-proof.yml']:assert Path(f).read_text()==original(f),f
print('PASS byte-exact inversion of presentation-only changes; original gameplay/markup callbacks/canonical assertions preserved')
