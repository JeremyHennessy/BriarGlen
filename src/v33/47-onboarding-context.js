(() => {
  'use strict';
  const runtime=window.__BRIAR_GLEN_RUNTIME,debug=window.__BRIAR_GLENDebug;if(!runtime||!debug)return;
  const params=new URLSearchParams(location.search),legacyForced=params.get('onboarding')==='1'&&params.get('onboarding37')!=='1';
  const style=document.createElement('link');style.rel='stylesheet';style.href='styles-v37.css';document.head.appendChild(style);if(legacyForced)return;
  document.documentElement.dataset.build37Contextual='true';
  progress.tipShown=true;
  const key='briar-glen-context-guide-v37';let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch(_){};
  const origin={x:player.x,y:player.y};let dodged=!!saved.dodge,moveDone=!!saved.move,prompt=null,forced=null,shown=new Set();
  const el=document.createElement('section');el.id='onboarding37-prompt';el.hidden=true;el.innerHTML='<div class="eyebrow">WARDEN TIP</div><b></b><span></span>';document.getElementById('game-shell')?.appendChild(el);
  function persist(name){saved[name]=true;try{localStorage.setItem(key,JSON.stringify(saved))}catch(_){};}
  function nearAlden(){const forge=worldObjects.find(o=>o.type==='forge'&&String(o.label||'').toLowerCase().includes('alden'));return !!forge&&Math.hypot(player.x-forge.x,player.y-forge.y)<145;}
  function masterwork(){return !!(progress.temperedSword||progress.briarstringBow||progress.moonrootStaff)}
  function choose(){if(forced)return forced;if(!moveDone)return['move','Move when the road opens','Use the stick or WASD to follow the road.'];const tell=enemies.some(e=>!e.dead&&e.windup>.12&&['slam','charge','boss-slam','quarry-slam'].some(k=>String(e.pendingAttack||'').includes(k)));if(!dodged&&tell)return['dodge','Dodge the strong tell','The red attack ring is closing — DODGE now.'];if(!progress.reinforcedPickaxe&&!progress.temperedSword&&nearAlden())return['craft','Craft with Alden','You are at the forge. Use your gathered materials here.'];if(masterwork()&&!Object.values(progress.specialistTraits||{}).some(Boolean))return['specialize','Finish the masterwork','Choose a specialist finish in Satchel → Equipment.'];return null}
  function render(){prompt=choose();el.hidden=!prompt;if(!prompt)return;shown.add(prompt[0]);el.dataset.kind=prompt[0];el.querySelector('b').textContent=prompt[1];el.querySelector('span').textContent=prompt[2]}
  addEventListener('keydown',e=>{if(['ShiftLeft','ShiftRight','KeyK'].includes(e.code)&&prompt?.[0]==='dodge'){dodged=true;persist('dodge')}},{capture:true});document.addEventListener('pointerdown',e=>{if(e.target===ui.dash&&prompt?.[0]==='dodge'){dodged=true;persist('dodge')}},{capture:true});
  runtime.registerHook('afterUpdate','build37-context',()=>{if(!moveDone&&Math.hypot(player.x-origin.x,player.y-origin.y)>=55){moveDone=true;persist('move')}render()},1900);runtime.registerHook('afterUpdateUI','build37-context-ui',render,1900);
  debug.previewContextualOnboarding=name=>{const defs={move:['move','Move when the road opens','Use the stick or WASD to follow the road.'],dodge:['dodge','Dodge the strong tell','The red attack ring is closing — DODGE now.'],craft:['craft','Craft with Alden','You are at the forge. Use your gathered materials here.'],specialize:['specialize','Finish the masterwork','Choose a specialist finish in Satchel → Equipment.']};forced=defs[name]||null;render()};debug.getContextualOnboardingState=()=>({active:prompt?.[0]||null,shown:[...shown],completed:{move:moveDone,dodge:dodged},oneAtATime:document.querySelectorAll('#onboarding37-prompt:not([hidden])').length<=1,cssLoaded:[...document.styleSheets].some(s=>(s.href||'').includes('styles-v37.css'))});render();
})();
