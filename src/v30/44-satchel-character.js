(() => {
  'use strict';
  const runtime=window.__BRIAR_GLEN_RUNTIME,debug=window.__BRIAR_GLENDebug;
  if(!runtime||!debug)throw new Error('Build 34 Satchel requires the canonical runtime surface');
  const style=document.createElement('link');style.rel='stylesheet';style.href='styles-v34.css';style.dataset.build34Style='true';document.head.appendChild(style);
  const panel=document.getElementById('inventory-panel'),header=panel?.querySelector('.inventory-header'),grid=panel?.querySelector('.inventory-grid'),actions=panel?.querySelector('.inventory-actions');
  if(!panel||!header||!grid||!actions)throw new Error('Build 34 Satchel requires the existing inventory panel');
  panel.classList.add('satchel34');
  const categories=['materials','equipment','recipes','quest'];let selected='materials';
  const tabs=document.createElement('nav');tabs.className='satchel34-tabs';tabs.setAttribute('aria-label','Satchel categories');tabs.innerHTML=categories.map((key,index)=>`<button class="satchel34-tab" type="button" role="tab" data-satchel34-tab="${key}" aria-selected="${index===0}">${key==='quest'?'Quest Items':key}</button>`).join('');header.after(tabs);
  const character=document.createElement('aside');character.className='satchel34-character';character.innerHTML=`<div class="satchel34-name">Briar Warden</div><div class="satchel34-doll"><div class="satchel34-equip weapon" data-slot="weapon"></div><div class="satchel34-equip armor" data-slot="armor"></div><div class="satchel34-body" aria-hidden="true"></div><div class="satchel34-equip charm" data-slot="charm"></div><div class="satchel34-equip boots" data-slot="boots"></div></div><div class="satchel34-stats"><span>Health <b data-stat="health"></b></span><span>Damage <b data-stat="damage"></b></span><span>Speed <b data-stat="speed"></b></span><span>Coins <b data-stat="coins"></b></span></div>`;tabs.after(character);
  const content=document.createElement('div');content.className='satchel34-content';character.after(content);
  const gear=panel.querySelector('.gear-card'),crafting=panel.querySelector('.crafting-status'),recipe=panel.querySelector('.recipe-card');
  content.append(grid);if(gear)content.append(gear);if(crafting)content.append(crafting);
  const specialists=document.createElement('section');specialists.className='crafting-status';specialists.innerHTML='<strong>WEAPON SPECIALIZATIONS</strong><div class="satchel34-specialists"></div>';content.append(specialists);if(recipe)content.append(recipe);
  const countCategory={
    'panel-tusk-count':'quest',
  };
  for(const item of grid.querySelectorAll('.inventory-item')){
    const count=item.querySelector('[id$="-count"]');item.dataset.satchel34Category=countCategory[count?.id]||'materials';
  }
  function showCategory(key){
    if(!categories.includes(key))return false;selected=key;
    tabs.querySelectorAll('[data-satchel34-tab]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.satchel34Tab===key)));
    grid.hidden=!['materials','quest'].includes(key);for(const item of grid.querySelectorAll('.inventory-item'))item.hidden=item.dataset.satchel34Category!==key;
    if(gear)gear.hidden=key!=='equipment';if(crafting)crafting.hidden=key!=='equipment';specialists.hidden=key!=='equipment';if(recipe)recipe.hidden=key!=='recipes';actions.hidden=key!=='materials';
    return true;
  }
  tabs.addEventListener('click',event=>{const button=event.target.closest('[data-satchel34-tab]');if(button)showCategory(button.dataset.satchel34Tab);});
  const weaponNames={sword:'Sword',bow:'Briar Bow',staff:'Glen Staff'},traitNames={forceful:'Forceful',swift:'Swift'};
  function currentDamage(){const base=player.weaponType==='sword'?(player.reinforced?38:24):Number(WEAPONS[player.weaponType]?.damage||0);return typeof debug.previewSpecialistDamage==='function'?debug.previewSpecialistDamage(base,player.weaponType):typeof debug.previewDamage==='function'?debug.previewDamage(base,player.weaponType):base;}
  function sync(){
    const specialist=debug.getSpecialistCraftingState?.();const traits=specialist?.traits||{};
    character.querySelector('[data-slot="weapon"]').innerHTML=`${player.weapon}<small>${traitNames[traits[player.weaponType]]||'No finish'}</small>`;
    character.querySelector('[data-slot="armor"]').innerHTML=`${progress.gearVest?'Copperguard Vest':'Empty'}<small>Armor</small>`;
    character.querySelector('[data-slot="charm"]').innerHTML=`${progress.groveRelicEquipped?'Grovekeeper Thorn':'Empty'}<small>Charm</small>`;
    character.querySelector('[data-slot="boots"]').innerHTML=`${progress.wardenBootsEquipped?'Trail Boots':'Empty'}<small>Boots</small>`;
    character.querySelector('[data-stat="health"]').textContent=`${Math.ceil(player.hp)}/${player.maxHp}`;character.querySelector('[data-stat="damage"]').textContent=String(currentDamage());character.querySelector('[data-stat="speed"]').textContent=String(Math.round(player.speed));character.querySelector('[data-stat="coins"]').textContent=String(player.coins);
    specialists.querySelector('.satchel34-specialists').innerHTML=['sword','bow','staff'].map(weapon=>`<div class="satchel34-specialist"><strong>${weaponNames[weapon]}</strong><small>${traits[weapon]?`${traitNames[traits[weapon]]} finish`:'No specialist finish'} • ${specialist?.masterworks?.[weapon]?'Masterwork ready':'Masterwork not crafted'}</small></div>`).join('');
  }
  runtime.registerHook('afterUpdateUI','build34-satchel-sync',sync,1600);
  debug.selectSatchelCategory=showCategory;debug.getSatchelCharacterState=()=>({selected,categories:[...categories],traits:{...(debug.getSpecialistCraftingState?.().traits||{})},stats:{health:player.hp,maxHealth:player.maxHp,damage:currentDamage(),speed:player.speed,coins:player.coins},cssLoaded:[...document.styleSheets].some(sheet=>(sheet.href||'').includes('styles-v34.css')),entityCounts:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}});
  showCategory(selected);sync();
})();
