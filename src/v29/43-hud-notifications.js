(() => {
  'use strict';

  // Build 33: presentation-only HUD clarity and a single notification queue.
  const runtime=window.__BRIAR_GLEN_RUNTIME;
  if(!runtime)throw new Error('Build 33 HUD requires the canonical runtime');

  const style=document.createElement('link');
  style.rel='stylesheet';style.href='styles-v33.css';style.dataset.build33Style='true';
  document.head.appendChild(style);

  const status=document.querySelector('.status-panel');
  const objective=document.querySelector('.quest-panel');
  status?.classList.add('hud33-status');objective?.classList.add('hud33-objective');
  if(status&&!status.querySelector('.hud33-avatar')){
    const avatar=document.createElement('div');avatar.className='hud33-avatar';avatar.textContent='BW';avatar.setAttribute('aria-hidden','true');status.prepend(avatar);
  }

  const shell=document.getElementById('game-shell');
  const combat=document.createElement('div');combat.id='hud33-combat';combat.className='panel';combat.innerHTML=`
    <div class="hud33-slot" id="hud33-weapon"><b>1</b><strong>WEAPON</strong><small>Worn Sword</small></div>
    <div class="hud33-slot" id="hud33-skill"><b>F</b><strong>SKILL</strong><small>Cleave ready</small></div>`;
  shell.appendChild(combat);

  const notice=document.createElement('div');notice.id='hud33-notification';notice.hidden=true;notice.setAttribute('aria-live','assertive');shell.appendChild(notice);
  document.documentElement.dataset.build33Notifications='true';
  const queue=[];let active=null;let timer=0;let sequence=0;
  const durations={area:1800,toast:2200,pickup:1400,tutorial:2400};
  const priorities={area:30,tutorial:25,toast:20,pickup:10};

  function pump(){
    if(active||!queue.length)return;
    queue.sort((a,b)=>b.priority-a.priority||a.sequence-b.sequence);
    active=queue.shift();notice.dataset.kind=active.kind;notice.textContent=active.text;notice.hidden=false;
    clearTimeout(timer);timer=setTimeout(()=>{notice.hidden=true;active=null;pump();},active.duration);
  }
  function enqueue(text,kind='toast',options={}){
    const clean=String(text||'').replace(/\s+/g,' ').trim();if(!clean)return false;
    if(active?.text===clean||queue.some(item=>item.text===clean))return false;
    queue.push({text:clean,kind,priority:options.priority??priorities[kind]??20,duration:options.duration??durations[kind]??2000,sequence:++sequence});
    if(queue.length>8)queue.splice(8);pump();return true;
  }

  toast=function build33Toast(text){enqueue(text,'toast');};
  function observeRibbon(id,kind,copy){
    const el=document.getElementById(id);if(!el)return;
    new MutationObserver(()=>{if(!el.hidden)enqueue(copy(el),kind);}).observe(el,{attributes:true,attributeFilter:['hidden']});
  }
  observeRibbon('polish23-area','area',el=>[el.querySelector('strong')?.textContent,el.querySelector('small')?.textContent].filter(Boolean).join(' • '));
  observeRibbon('polish23-pickup','pickup',el=>el.textContent);
  const recovery=document.getElementById('onboarding21-recovery');
  if(recovery)new MutationObserver(()=>{if(!recovery.hidden)enqueue(recovery.textContent,'tutorial');}).observe(recovery,{attributes:true,attributeFilter:['hidden']});

  const names={sword:'Sword',bow:'Briar Bow',staff:'Glen Staff'};
  const skills={sword:'Cleave',bow:'Pierce',staff:'Root'};
  function sync(){
    const weapon=player.weaponType||'sword';const skillCd=Math.max(0,player.skillCd||0);const attackCd=Math.max(0,player.attackCd||0);
    const weaponEl=document.getElementById('hud33-weapon');const skillEl=document.getElementById('hud33-skill');
    weaponEl.dataset.weapon=weapon;weaponEl.dataset.ready=String(attackCd<=0);weaponEl.querySelector('small').textContent=`${names[weapon]}${attackCd>0?` • ${attackCd.toFixed(1)}s`:''}`;
    skillEl.dataset.weapon=weapon;skillEl.dataset.ready=String(skillCd<=0);skillEl.querySelector('small').textContent=skillCd>0?`${skills[weapon]} • ${skillCd.toFixed(1)}s`:`${skills[weapon]} ready`;
  }
  runtime.registerHook('afterUpdateUI','build33-hud-sync',sync,1500);

  if(window.__BRIAR_GLENDebug){
    window.__BRIAR_GLENDebug.enqueueNotification33=(text,kind,options)=>enqueue(text,kind,options);
    window.__BRIAR_GLENDebug.getHudNotificationState=()=>({active:active?{...active}:null,pending:queue.map(item=>({...item})),weapon:player.weaponType,skillCooldown:player.skillCd||0,attackCooldown:player.attackCd||0,cssLoaded:[...document.styleSheets].some(sheet=>(sheet.href||'').includes('styles-v33.css')),entityCounts:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}});
  }
  sync();
})();
