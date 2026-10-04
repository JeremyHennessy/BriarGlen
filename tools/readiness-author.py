from pathlib import Path

def replace_once(s, old, new):
    assert s.count(old)==1, (s.count(old), old[:90])
    return s.replace(old,new)

p=Path('src/game.js');s=p.read_text()
s=replace_once(s,"version:'0.94.0'", "version:'0.95.0'")
s=replace_once(s,"UI.packWeight.textContent=`${inventoryWeight().toFixed(1)} / 22 weight${itemCount('trailpack')>0?` · Trail Pack comfort ${carryComfortLimit()}`:''}`;", "UI.packWeight.textContent=`${inventoryWeight().toFixed(1)} weight · comfort ${carryComfortLimit()}`;UI.packWeight.dataset.heavy=String(inventoryWeight()>carryComfortLimit());")
s=replace_once(s,'  function renderPlayHud(){', '''  // Read existing rules for display; no independent equipment or combat state lives in the UI.
  function renderReadiness(){
    if(!document.getElementById('loadout-summary'))return;
    const text=(id,value)=>{const el=document.getElementById(id);if(el&&el.textContent!==value)el.textContent=value;};
    const profile=combatProfile(),weight=inventoryWeight(),limit=carryComfortLimit(),heavy=weight>limit;
    for(const [kind,id] of [['weapon',player.equippedWeapon],['armor',player.equippedArmor],['tool',player.equippedTool]]){
      const slot=id?player.inventory[id]:null,working=!!slot&&slot.durability>0;
      const condition=!slot?'empty':!working?'broken':slot.durability/slot.maxDurability<=.25?'worn':'ready';
      const row=document.getElementById(`loadout-${kind}`);row.dataset.condition=condition;
      text(`loadout-${kind}-name`,slot?itemDefs[id].name:kind==='weapon'?'Unarmed':'Not equipped');
      let detail=!slot?(kind==='weapon'?'No weapon selected':kind==='armor'?'No damage protection':'Select a tool below'):`${Math.round(slot.durability)} / ${Math.round(slot.maxDurability)} durability · ${condition==='broken'?'Broken':condition==='worn'?'Worn':'Ready'}`;
      if(slot&&kind==='armor')detail+=` · absorbs ${armorRating()} damage`;
      if(slot&&kind==='weapon'&&!working)detail+=' · unarmed fallback';
      if(slot&&kind==='tool'&&!working)detail+=' · mend before mining';
      text(`loadout-${kind}-detail`,detail);
    }
    const weaponSlot=player.inventory[player.equippedWeapon],cost=profile.bowReady?5:4;
    let attack='Unarmed',state='neutral',explanation='No weapon equipped; attacks use the existing unarmed damage.';
    if(weaponSlot&&weaponSlot.durability<=0){attack='Broken';state='warning';explanation='Equipped weapon is broken; attacks fall back to unarmed damage. Mend it before relying on it.';}
    else if(profile.bowFunctional){attack=profile.arrows?`Bow · ${profile.arrows}`:'No arrows';state=profile.arrows?'ready':'warning';explanation=profile.arrows?`Briar Bow equipped. ${profile.arrows} Trail Arrows; a successful shot costs 5 energy and 1 arrow.`:'Briar Bow equipped but no Trail Arrows. Craft ammunition in Make before firing.';}
    else if(profile.bladeReady){attack='Blade';state='ready';explanation='Warden Blade equipped. A swing costs 4 energy.';}
    if(player.energy<cost&&!(profile.bowFunctional&&!profile.arrows)){attack='Low energy';state='warning';explanation+=` Need ${cost} energy to attack; stop moving to rest.`;}
    text('attack-readiness',attack);const attackButton=document.getElementById('attack-btn');attackButton.dataset.readiness=state;attackButton.title=explanation;
    text('attack-explanation',explanation);
    text('brace-readiness',player.guarded?'Braced':player.energy<10?'Low energy':'10 energy');
    document.getElementById('quick-brace').dataset.readiness=player.guarded?'ready':player.energy<10?'warning':'neutral';
    text('tonic-readiness',`${itemCount('tonic')} left`);
    text('carry-state',heavy?'Heavy load · slower travel and higher energy use':`Comfortable load · ${(limit-weight).toFixed(1)} spare weight`);
    document.getElementById('carry-state').dataset.heavy=String(heavy);
    text('loadout-supplies',`${itemCount('arrows')} arrows · ${itemCount('bread')} bread · ${itemCount('tonic')} tonics`);
  }
  function renderPlayHud(){
  renderReadiness();''')
p.write_text(s)

p=Path('src/play-ui.js');s=p.read_text()
s=replace_once(s,"  const meters = $('.meters');", '''  // Keep the original action elements and event handlers; append status, never a second action.
  for (const [button, id] of [['attack-btn','attack-readiness'], ['quick-brace','brace-readiness'], ['quick-tonic','tonic-readiness']]) {
    $(`#${button}`).insertAdjacentHTML('beforeend', `<small id="${id}" class="action-readiness"></small>`);
  }
  $('#attack-btn').setAttribute('aria-describedby', 'attack-explanation');
  const attackExplanation = document.createElement('span'); attackExplanation.id = 'attack-explanation'; attackExplanation.className = 'sr-only';
  actions.append(attackExplanation);

  const meters = $('.meters');''')
s=replace_once(s,"  $('#panel-character').append(cards.skills);", '''  const loadout = document.createElement('div'); loadout.id = 'loadout-summary'; loadout.className = 'loadout-summary';
  loadout.setAttribute('role', 'group'); loadout.setAttribute('aria-label', 'Equipped gear and supplies');
  for (const [kind, label] of [['weapon','Weapon'], ['armor','Armor'], ['tool','Tool']]) {
    loadout.insertAdjacentHTML('beforeend', `<div id="loadout-${kind}" class="loadout-slot" data-condition="empty"><span>${label}</span><strong id="loadout-${kind}-name">Not equipped</strong><small id="loadout-${kind}-detail"></small></div>`);
  }
  loadout.insertAdjacentHTML('beforeend', '<p id="loadout-supplies"></p><p id="carry-state"></p><details class="equipment-care"><summary>Equipment care</summary><p>Select an item below to equip or stow it. Carried gear only helps when equipped, except your Trail Pack and Mireglass Lens.</p><p>Mend (You → Skills) repairs your equipped weapon, or your tool when no weapon is equipped. A bow needs Ashwood; other tools and weapons need Iron Ore. Patch Jerkin in Make uses a Wolf Hide.</p><p>Comfort is not a hard capacity: you may carry more, but you move slower and use more energy. Your Trail Pack increases comfort according to its quality.</p></details><h3 class="inventory-heading">Carried items <small>Select gear to equip or stow</small></h3>');
  $('#inventory').before(loadout);
  $('#panel-character').append(cards.skills);''')
p.write_text(s)

p=Path('src/play-ui.css');s=p.read_text()
s+='''
/* BUILD 0.95: equipment readiness, derived from existing game rules. */
.meter-value{white-space:nowrap;min-width:0}.hud-meters progress{min-width:0}
.action-deck .actions button{line-height:1.2}.action-readiness{display:block;font-size:10px;line-height:1.25;white-space:nowrap;margin-top:3px;color:var(--muted);font-variant-numeric:tabular-nums}
.action-deck button[data-readiness=warning] .action-readiness{color:var(--warn)}.action-deck button[data-readiness=ready] .action-readiness{color:var(--accent)}
.loadout-summary{margin:0 0 6px;min-width:0}.loadout-slot{display:grid;grid-template-columns:52px minmax(0,1fr);gap:3px 8px;padding:8px 0;border-bottom:1px solid var(--line);font-size:12px}.loadout-slot>span{color:var(--muted);grid-row:1/3;font-size:11px;padding-top:2px}.loadout-slot strong{font-size:13px;overflow-wrap:anywhere}.loadout-slot small{grid-column:2;color:var(--muted);font-size:11px;line-height:1.45;overflow-wrap:anywhere}.loadout-slot[data-condition=broken] small,.loadout-slot[data-condition=worn] small{color:var(--warn)}
#loadout-supplies,#carry-state{font-size:12px;color:var(--muted);line-height:1.5;margin:9px 0}#carry-state[data-heavy=true],#pack-weight[data-heavy=true]{color:var(--warn)}.equipment-care summary{font-size:11px;padding:8px 0;min-height:36px}.equipment-care p{font-size:12px;line-height:1.6;color:var(--muted);margin:5px 0 10px}.inventory-heading{font-size:13px;margin:10px 0 0}.inventory-heading small{display:block;font-weight:400;font-size:11px;color:var(--muted);margin-top:3px}
.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
@media(orientation:landscape) and (max-height:550px){.action-readiness{font-size:9px}.action-deck .actions button{padding-top:4px;padding-bottom:4px}.hud-meters label{grid-template-columns:40px minmax(0,1fr) 62px}}
'''
p.write_text(s)
p=Path('tests/smoke.mjs');s=p.read_text().replace(".version==='0.94.0'", ".version==='0.95.0'").replace(".build!=='0.94.0'", ".build!=='0.95.0'");s=replace_once(s,"weightText.includes('Trail Pack comfort 22')", "weightText.includes('comfort 22')");p.write_text(s)
p=Path('tests/play-ui.mjs');s=p.read_text();s=replace_once(s,'  console.log(`PASS ${vp.name}: play UI', '  await proveEquipmentReadiness(page,vp);\n  console.log(`PASS ${vp.name}: play UI');s+=Path('tools/readiness-proof.mjs').read_text();p.write_text(s)
