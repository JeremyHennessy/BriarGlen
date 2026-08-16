(() => {
  'use strict';

  // Build 22: local-only balance telemetry and pacing guardrails.
  // No external analytics and no adaptive difficulty. The verified Build 21 balance remains unchanged;
  // this layer makes future tuning evidence-based and records intentional milestone pacing.
  const runtime = window.__BRIAR_GLEN_RUNTIME;
  if (!runtime) throw new Error('Build 22 requires canonical runtime hooks');

  const METRICS_KEY = 'briar-glen-run-metrics-v1';
  const MATERIAL_KEYS = Object.freeze(['herb','ore','mooncap','hide','tonic','oil','iron','mossglass','binding','resin','tusk']);
  const TARGETS = Object.freeze({
    briarleaf:   { label:'3 Briarleaf',             min:120,  max:360 },
    copper:      { label:'3 Copper',                min:300,  max:600 },
    reinforced:  { label:'Reinforced Sword',        min:480,  max:840 },
    emberback:   { label:'Emberback defeated',      min:720,  max:1200 },
    grove:       { label:'Mooncap Grove discovered',min:1080, max:1800 },
    pickaxe:     { label:'Reinforced Pickaxe',      min:1440, max:2280 },
    masterwork:  { label:'First masterwork weapon', min:1800, max:2700 },
    fen:         { label:'Mosswater Fen discovered',min:2280, max:3480 },
    stonepine:   { label:'Stonepine Reach discovered',min:3300,max:4800 },
  });

  const BASELINE = Object.freeze({
    profile:'vertical-slice-balanced-v1',
    player:{ startHp:100, startCoins:100, speed:245, wornSwordDamage:24, reinforcedSwordDamage:38 },
    weapons:{ bowDamage:18, staffDamage:24 },
    enemies:{ wolfHp:52, wolfDamage:9, boarHp:70, boarDamage:11, emberbackHp:320 },
    economy:{ emberbackCoins:75, firstContractCoins:150, healingTonicHeal:45, wardenOilBonus:.15 },
    progression:{ briarleafRequired:3, copperRequired:3 },
  });

  function freshMetrics() {
    return {
      version:1,
      activeSeconds:0,
      deaths:0,
      damageDealt:0,
      damageTaken:0,
      healingObserved:0,
      coinsEarned:0,
      coinsSpent:0,
      kills:0,
      bossKills:0,
      boardJobs:0,
      weaponDamage:{ sword:0, bow:0, staff:0 },
      killsByType:{},
      itemsGained:Object.fromEntries(MATERIAL_KEYS.map(key=>[key,0])),
      itemsSpent:Object.fromEntries(MATERIAL_KEYS.map(key=>[key,0])),
      milestones:{},
      sessions:1,
      lastSavedAt:Date.now(),
    };
  }
  function loadMetrics() {
    try {
      const raw=localStorage.getItem(METRICS_KEY);
      if(!raw)return freshMetrics();
      const parsed=JSON.parse(raw);
      const metrics={...freshMetrics(),...parsed};
      metrics.weaponDamage={sword:0,bow:0,staff:0,...parsed.weaponDamage};
      metrics.killsByType={...(parsed.killsByType||{})};
      metrics.itemsGained={...freshMetrics().itemsGained,...parsed.itemsGained};
      metrics.itemsSpent={...freshMetrics().itemsSpent,...parsed.itemsSpent};
      metrics.milestones={...(parsed.milestones||{})};
      metrics.sessions=(Number(parsed.sessions)||0)+1;
      return metrics;
    }catch(_){return freshMetrics();}
  }
  const metrics=loadMetrics();
  let saveAccumulator=0;
  let damageProbe=null;

  function inventorySnapshot(){return Object.fromEntries(MATERIAL_KEYS.map(key=>[key,Number(player.inventory[key]||0)]));}
  function snapshot(){return {hp:player.hp,maxHp:player.maxHp,coins:player.coins,x:player.x,y:player.y,inventory:inventorySnapshot(),board:Number(progress.boardContractsCompleted||0)};}
  let previous=snapshot();

  function saveMetrics(){
    metrics.lastSavedAt=Date.now();
    try{localStorage.setItem(METRICS_KEY,JSON.stringify(metrics));return true;}catch(_){return false;}
  }
  function resetMetrics(){
    const next=freshMetrics();
    for(const key of Object.keys(metrics))delete metrics[key];
    Object.assign(metrics,next);
    seedPreexistingMilestones();
    previous=snapshot();
    saveMetrics();
    renderMetricsCard(true);
    return report();
  }

  function achieved(key){
    if(key==='briarleaf')return progress.step>=1 || (player.inventory.herb||0)>=3;
    if(key==='copper')return progress.step>=2 || (player.inventory.ore||0)>=3;
    if(key==='reinforced')return !!player.reinforced || progress.step>=3;
    if(key==='emberback')return !!progress.bossDefeated;
    if(key==='grove')return !!progress.groveDiscovered;
    if(key==='pickaxe')return !!progress.reinforcedPickaxe;
    if(key==='masterwork')return !!(progress.temperedSword||progress.briarstringBow||progress.moonrootStaff);
    if(key==='fen')return !!progress.fenDiscovered;
    if(key==='stonepine')return !!progress.stonepineDiscovered;
    return false;
  }
  function seedPreexistingMilestones(){
    for(const key of Object.keys(TARGETS)){
      if(metrics.milestones[key]===undefined && achieved(key)) metrics.milestones[key]=-1;
    }
  }
  seedPreexistingMilestones();

  function recordMilestones(){
    let changed=false;
    for(const key of Object.keys(TARGETS)){
      if(metrics.milestones[key]!==undefined || !achieved(key))continue;
      metrics.milestones[key]=Math.round(metrics.activeSeconds*10)/10;
      changed=true;
    }
    if(changed)saveMetrics();
  }
  function paceStatus(key){
    const value=metrics.milestones[key];
    if(value===undefined)return 'pending';
    if(value<0)return 'preexisting';
    const target=TARGETS[key];
    if(value<target.min)return 'early';
    if(value>target.max)return 'late';
    return 'target';
  }
  function currentMilestone(){
    return Object.keys(TARGETS).find(key=>metrics.milestones[key]===undefined)||null;
  }
  function formatTime(seconds){
    seconds=Math.max(0,Math.floor(Number(seconds)||0));
    const m=Math.floor(seconds/60),s=seconds%60;
    return m>=60?`${Math.floor(m/60)}h ${m%60}m`:`${m}m ${String(s).padStart(2,'0')}s`;
  }
  function report(){
    const next=currentMilestone();
    return {
      baseline:BASELINE,
      targets:TARGETS,
      metrics:JSON.parse(JSON.stringify(metrics)),
      pace:Object.fromEntries(Object.keys(TARGETS).map(key=>[key,{status:paceStatus(key),seconds:metrics.milestones[key]??null,target:TARGETS[key]}])),
      nextMilestone:next,
      nextTarget:next?TARGETS[next]:null,
    };
  }

  runtime.registerHook('beforeDamageEnemy','build22-damage-start',payload=>{
    if(!payload.enemy||payload.enemy.dead)return;
    damageProbe={enemy:payload.enemy,before:Math.max(0,Number(payload.enemy.hp)||0),weapon:player.weaponType};
  },-50);
  runtime.registerHook('afterDamageEnemy','build22-damage-end',payload=>{
    if(!damageProbe||damageProbe.enemy!==payload.enemy){damageProbe=null;return;}
    const dealt=Math.max(0,damageProbe.before-Math.max(0,Number(payload.enemy.hp)||0));
    if(dealt>0){
      metrics.damageDealt+=dealt;
      const weapon=['sword','bow','staff'].includes(damageProbe.weapon)?damageProbe.weapon:'sword';
      metrics.weaponDamage[weapon]=(metrics.weaponDamage[weapon]||0)+dealt;
    }
    damageProbe=null;
  },50);
  runtime.registerHook('afterKillEnemy','build22-kill',payload=>{
    const enemy=payload.enemy;if(!enemy)return;
    metrics.kills+=1;
    metrics.killsByType[enemy.type]=(metrics.killsByType[enemy.type]||0)+1;
    if(['boss','grovekeeper','fenwarden','quarrysentinel'].includes(enemy.type))metrics.bossKills+=1;
  },50);

  function gameplayActive(){
    if(document.hidden)return false;
    const onboarding=window.__BRIAR_GLENDebug?.getOnboardingState?.();
    if(onboarding?.startOpen)return false;
    return true;
  }
  runtime.registerHook('afterUpdate','build22-balance-observer',payload=>{
    const dt=Math.max(0,Math.min(.05,Number(payload.dt)||0));
    if(gameplayActive())metrics.activeSeconds+=dt;
    const current=snapshot();

    if(current.hp<previous.hp)metrics.damageTaken+=previous.hp-current.hp;
    else if(current.hp>previous.hp){
      const townReturn=Math.hypot(current.x+720,current.y-30)<130 && Math.hypot(previous.x+720,previous.y-30)>350 && current.hp>=current.maxHp;
      if(townReturn && previous.hp<=30){
        metrics.deaths+=1;
        metrics.damageTaken+=Math.max(0,previous.hp);
      }else metrics.healingObserved+=current.hp-previous.hp;
    }
    const coinDelta=current.coins-previous.coins;
    if(coinDelta>0)metrics.coinsEarned+=coinDelta;
    else if(coinDelta<0)metrics.coinsSpent+=-coinDelta;
    for(const key of MATERIAL_KEYS){
      const delta=current.inventory[key]-previous.inventory[key];
      if(delta>0)metrics.itemsGained[key]=(metrics.itemsGained[key]||0)+delta;
      else if(delta<0)metrics.itemsSpent[key]=(metrics.itemsSpent[key]||0)+(-delta);
    }
    if(current.board>previous.board)metrics.boardJobs+=current.board-previous.board;
    recordMilestones();
    previous=current;
    saveAccumulator+=dt;
    if(saveAccumulator>=4){saveAccumulator=0;saveMetrics();}
    renderMetricsCard(false);
  },900);

  addEventListener('pagehide',saveMetrics,{capture:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)saveMetrics();});

  const journalColumns=document.querySelector('#warden-journal-view .journal-columns');
  let metricsCard=document.getElementById('journal-balance-metrics');
  if(journalColumns&&!metricsCard){
    metricsCard=document.createElement('section');
    metricsCard.id='journal-balance-metrics';
    metricsCard.className='journal-card balance22-card';
    metricsCard.innerHTML=`<div class="eyebrow">WARDEN FIELD METRICS</div><h3>Balance & Pacing</h3><div id="balance22-summary" class="journal-list"></div>`;
    journalColumns.appendChild(metricsCard);
  }
  let lastCardSignature='';
  function renderMetricsCard(force=false){
    const target=document.getElementById('balance22-summary');if(!target)return;
    const next=currentMilestone();
    const signature=JSON.stringify([Math.floor(metrics.activeSeconds/5),metrics.deaths,Math.round(metrics.damageDealt),Math.round(metrics.damageTaken),metrics.coinsEarned,metrics.coinsSpent,metrics.boardJobs,next,next?paceStatus(next):'complete']);
    if(!force&&signature===lastCardSignature)return;lastCardSignature=signature;
    const nextText=next?`${TARGETS[next].label} • target ${formatTime(TARGETS[next].min)}–${formatTime(TARGETS[next].max)}`:'All slice milestones recorded';
    const completed=Object.keys(TARGETS).filter(key=>metrics.milestones[key]!==undefined).length;
    target.innerHTML=`
      <div class="journal-row done"><span>◷</span><b>Active field time: ${formatTime(metrics.activeSeconds)}</b></div>
      <div class="journal-row ${metrics.deaths?'done':'locked'}"><span>†</span><b>Recoveries: ${metrics.deaths} • Damage ${Math.round(metrics.damageDealt)} dealt / ${Math.round(metrics.damageTaken)} taken</b></div>
      <div class="journal-row done"><span>◇</span><b>Coin flow: +${Math.round(metrics.coinsEarned)} / −${Math.round(metrics.coinsSpent)} • ${metrics.boardJobs} Board jobs</b></div>
      <div class="journal-row ${next?'locked':'done'}"><span>${next?'→':'✓'}</span><b>${completed}/${Object.keys(TARGETS).length} pacing milestones • ${nextText}</b></div>`;
  }

  if(window.__BRIAR_GLENDebug){
    window.__BRIAR_GLENDebug.getBalanceState=report;
    window.__BRIAR_GLENDebug.resetBalanceMetrics=resetMetrics;
    window.__BRIAR_GLENDebug.setBalanceActiveSeconds=seconds=>{metrics.activeSeconds=Math.max(0,Number(seconds)||0);saveMetrics();renderMetricsCard(true);return metrics.activeSeconds;};
    window.__BRIAR_GLENDebug.flushBalanceMetrics=()=>{saveMetrics();return report();};
  }
  renderMetricsCard(true);
  saveMetrics();
})();
