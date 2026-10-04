from pathlib import Path
import hashlib, subprocess
BASE='d84d354aaf5918805160377e76efdebee686a984'
expected={'src/game.js':'8a1ad4bac153d439bde9f1accd2a5a8643443e7a','src/play-ui.js':'12b1097679bb231c4ac14917845bc34b66b83000','src/play-ui.css':'b815bc4fe45348c3930b3d6b4882dbfc759cdaea','tests/play-ui.mjs':'4de2a32b662d5ddf81c9023134f20d78600c1ccf'}
helper=r'''  // Presentation only. Use keeps its existing NPC > landmark > resource > drop priority.
  function renderInteractionCue(progress){
    const cue=document.getElementById('interaction-context');if(!cue)return;
    const text=(id,value)=>{const el=document.getElementById(id);if(el&&el.textContent!==value)el.textContent=value;};
    const npc=nearestNPC(),landmark=nearestLandmark(),resource=nearestResource(),drop=nearestDrop();
    const target=npc||landmark||resource||drop,kind=npc?'npc':landmark?'landmark':resource?'resource':drop?'drop':'none';
    const name=(entity,type)=>type==='resource'?itemDefs[entity.type].name:type==='drop'?itemDefs[entity.item].name:entity.name;
    let label='None',state='neutral',title='Nothing in reach',help='Tap a person, plant, loose item or landmark in the world to walk over and interact. Use only works within reach.';
    if(target){
      state='ready';title=name(target,kind);
      if(npc){
        label='Details';const preview=nearestLandmark(55);
        help=preview?`${npc.name} takes Use priority here; Use shows local details, not the landmark action. Tap ${preview.name} in the world to approach and use it directly.`:`Use to inspect ${npc.name}. Help and trade actions are in Nearby; Connect (4) reads priorities.`;
      }else if(landmark){
        label='Inspect';help='Use to inspect this landmark.';
        if(landmark.id==='stonepine-trail-ledger'){
          label=progress.completed?'Done':!progress.started?'Begin':progress.ready?'Finish':'Review';
          help=progress.completed?'Stonepine expedition complete. Your Trail Pack recipe is in Make.':!progress.started?'Use to begin the optional Stonepine expedition. No supplies are spent.':progress.ready?'Use to record your return and claim the one-time expedition reward.':`Use to review the expedition. Next: ${stonepineExpeditionNext(progress)}.`;
        }else if(landmark.id==='deep-quarry-seam'){
          const pick=player.inventory.pick;label='Mine';
          const block=!player.deeds?.emberback?'Defeat Emberback to reopen this seam.':player.equippedTool!=='pick'||!pick?'Equip an Iron Pick in Pack.':pick.durability<=0?'Mend your broken Iron Pick first.':player.energy<14?'Rest until you have 14 energy.':landmark.lastMinedDay===world.day?'Already worked today; return tomorrow.':'';
          help=block||'Use to mine 2 fine Iron Ore. Costs 14 energy and 8 pick durability.';if(block){state='warning';label='Blocked';}
        }else if(landmark.id==='moonwell-hollow'){
          const harvest=moonwellIsNight()&&landmark.lastHarvestNight!==moonwellNightKey();
          label=harvest?'Harvest':!landmark.discovered?'Chart':'Inspect';help=harvest?'Use to gather 2 fine Mooncaps. One harvest per night.':!landmark.discovered?'Use to chart the Moonwell. Return after dusk for Mooncaps.':moonwellIsNight()?'Already gathered this night; return after the next dusk.':'Quiet until dusk. Use to inspect; no harvest now.';
        }else if(landmark.id==='stonepine-waycache'){
          const danger=world.enemies.find(e=>!e.dead&&(dist(landmark,e)<=180||dist(player,e)<=180));
          label=landmark.claimed?'Stash':danger?'Blocked':'Secure';state=!landmark.claimed&&danger?'warning':'ready';help=landmark.claimed?'Use shows the cache. Store and Take buttons below move one supply at a time.':danger?`${danger.name||'A wolf'} is too close. Clear nearby danger before securing the cache.`:'Use to secure the cache and collect its one-time trail supplies.';
        }else if(landmark.id==='stonepine-overlook'&&landmark.discovered){
          const block=itemCount('bread')<1?'Bring Brown Bread to recover energy here.':player.energy>=player.maxEnergy-10?'Energy is already high; save your bread for later.':'';
          label=block?'Rest':'Eat';state=block?'warning':'ready';help=block||'Use to eat 1 Brown Bread and recover travel energy.';
        }else if(!landmark.discovered){label='Chart';help='Use to chart this landmark and earn Fieldcraft experience.';}
      }else if(resource){
        label='Gather';const pickReady=player.equippedTool==='pick'&&player.inventory.pick?.durability>0;
        help=resource.type==='iron'?`Use to gather Iron Ore. ${pickReady?'Your equipped pick improves the work; costs up to 8 energy and wears the pick.':'No working pick equipped; lower quality ore, costs up to 12 energy.'}`:'Use to gather this resource. Costs up to 4 energy.';
      }else{label='Pick up';help=`Use to collect 1 ${itemDefs[drop.item].name}.`;}
    }else{
      const preview=nearestLandmark(55)||nearestNPC(85)||nearestResource(48)||nearestDrop(42);
      if(preview){label='Closer';state='warning';title='Move closer';help='The nearby preview is outside Use range. Walk closer, or tap the target in the world to approach and interact.';}
    }
    text('interact-readiness',label);text('interaction-target',title);text('interaction-help',help);
    cue.dataset.state=state;cue.dataset.kind=kind;cue.dataset.target=target?.id||'';
    const button=document.getElementById('interact-btn');button.dataset.readiness=state;button.title=`Use: ${title}. ${help}`;button.setAttribute('aria-label',`Use: ${label} — ${title}`);text('interact-explanation',help);
    const destination=navigation.active&&navigation.target?navigationEntity(navigation.target):null;
    text('interaction-travel',navigation.active?destination?`Walking to ${name(destination,navigation.target.kind)}. Arrival interacts automatically. Use stops walking and acts on what is in reach now.`:'Walking to the selected spot. Use stops walking; movement keys also take control.':'Tap a target to approach it automatically, or move with WASD, arrow keys or the direction buttons.');
  }
'''
ui=r'''  // Explain the existing Use action without replacing or adding an action handler.
  $('#interact-btn').insertAdjacentHTML('beforeend', '<small id="interact-readiness" class="action-readiness">None</small>');
  $('#interact-btn').setAttribute('aria-describedby', 'interact-explanation');
  actions.insertAdjacentHTML('beforeend', '<span id="interact-explanation" class="sr-only"></span>');
  const interaction = document.createElement('section'); interaction.id = 'interaction-context'; interaction.className = 'interaction-context';
  interaction.setAttribute('aria-label', 'Current Use action');
  interaction.innerHTML = '<small class="interaction-eyebrow">USE / E · RIGHT NOW</small><strong id="interaction-target">Nothing in reach</strong><p id="interaction-help"></p>';
  cards.nearby.prepend(interaction);
  cards.nearby.insertAdjacentHTML('beforeend', '<details class="interaction-controls"><summary>Movement &amp; interaction help</summary><p id="interaction-travel"></p><p>Use prioritizes residents, then landmarks, resources and loose items. Nearby can preview things just outside reach. The world keeps moving while panels are open.</p></details>');
'''
css='''
/* Contextual Use guidance stays inside the existing scroll panel and action deck. */
.interaction-context{padding:0 0 10px;margin-bottom:10px;border-bottom:1px solid var(--line);min-width:0}.interaction-eyebrow{display:block;font-size:10px;letter-spacing:.06em;color:var(--muted);margin-bottom:5px}.interaction-context>strong{display:block;font-size:14px;line-height:1.4;overflow-wrap:anywhere}.interaction-context[data-state=ready]>strong{color:var(--accent)}.interaction-context[data-state=warning]>strong{color:var(--warn)}.interaction-context p{font-size:12px;line-height:1.6;color:var(--muted);margin:6px 0;overflow-wrap:anywhere}.interaction-controls summary{font-size:11px;min-height:44px;padding:10px 0}.interaction-controls p{font-size:11px;line-height:1.6;color:var(--muted);margin:6px 0;overflow-wrap:anywhere}.interaction-context[hidden]{display:none!important}
'''
changes={
'src/game.js': [('  function renderPlayHud(){',helper+'  function renderPlayHud(){'),('  const next=p.completed?','  renderInteractionCue(p);\n  const next=p.completed?'),("direction=dist(player,target)<=55?'Within reach · press Use':","direction=dist(player,target)<=55?(nearestNPC()?'Nearby resident has Use priority · tap the landmark':nearestLandmark()?.id===target.id?'Within reach · press Use':'Close by · move closer or tap the landmark'):")],
'src/play-ui.js': [("  const loadout = document.createElement('div');",ui+"  const loadout = document.createElement('div');")],
'src/play-ui.css': [(None,css)],
 'tests/play-ui.mjs': [("import assert from 'node:assert/strict';","import { proveInteractionUi } from './interaction-ui.mjs';\nimport assert from 'node:assert/strict';"),('  await proveEquipmentReadiness(page,vp);','  await proveEquipmentReadiness(page,vp);\n  await proveInteractionUi(page,vp);')]
}
for file,blob in expected.items():
    raw=Path(file).read_bytes()
    assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==blob,file+' no longer matches verified base'
for file,edits in changes.items():
    p=Path(file);s=p.read_text()
    for old,new in edits:
        if old is None:s+=new
        else:
            assert s.count(old)==1,(file,old)
            s=s.replace(old,new)
    p.write_text(s)
for file,edits in changes.items():
    s=Path(file).read_text()
    for old,new in reversed(edits):
        if old is None:assert s.endswith(new);s=s[:-len(new)]
        else:assert s.count(new)==1;s=s.replace(new,old)
    assert s.encode()==subprocess.check_output(['git','show',BASE+':'+file]),file
for file in ['index.html','styles.css','tests/smoke.mjs','.github/workflows/reboot-game-proof.yml']:
    assert Path(file).read_bytes()==subprocess.check_output(['git','show',BASE+':'+file]),file
print('PASS byte-exact preservation outside read-only interaction presentation and additive UI tests')
