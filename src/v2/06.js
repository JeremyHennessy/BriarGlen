  function saveGame(){
    const state={
      player:{x:player.x,y:player.y,hp:player.hp,coins:player.coins,inventory:player.inventory,reinforced:player.reinforced,weaponType:player.weaponType},
      progress:{...progress}
    };
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(_){/* storage can be unavailable in private contexts */}
  }

  function loadGame(){
    try{
      const raw=localStorage.getItem(SAVE_KEY);if(!raw)return;
      const state=JSON.parse(raw);
      if(state.player){
        player.x=Number.isFinite(state.player.x)?state.player.x:player.x;
        player.y=Number.isFinite(state.player.y)?state.player.y:player.y;
        player.hp=state.player.hp||player.maxHp;
        player.coins=state.player.coins??player.coins;
        player.inventory={...player.inventory,...state.player.inventory};
        player.reinforced=!!state.player.reinforced;
        player.weaponType=WEAPONS[state.player.weaponType]?state.player.weaponType:'sword';
        if(player.reinforced)player.damage=38;
        player.weapon=weaponName();
      }
      if(state.progress)Object.assign(progress,state.progress);
      if(progress.shortcutUnlocked)worldObjects.filter(o=>o.type==='shortcut').forEach(o=>o.active=true);
      const boss=enemies.find(e=>e.type==='boss');if(progress.bossDefeated&&boss){boss.dead=true;boss.hp=0;boss.respawn=99999;}
      camera.x=player.x;camera.y=player.y;
    }catch(_){/* malformed save is ignored */}
  }

  loadGame();
  updateUI();

  addEventListener('keydown',e=>{
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
    keys.add(e.code);
    if(!e.repeat){
      if(e.code==='Space'||e.code==='KeyJ')attack();
      if(e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='KeyK')dash();
      if(e.code==='KeyE')interact();
      if(e.code==='KeyC')craftSword();
      if(e.code==='Digit1')selectWeapon('sword');
      if(e.code==='Digit2')selectWeapon('bow');
      if(e.code==='Digit3')selectWeapon('staff');
    }
  });
  addEventListener('keyup',e=>keys.delete(e.code));
  addEventListener('blur',()=>keys.clear());

  function updateStick(e){
    const rect=ui.movePad.getBoundingClientRect();
    const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    let dx=e.clientX-cx,dy=e.clientY-cy;const max=rect.width*.32;
    const d=Math.hypot(dx,dy);if(d>max){dx=dx/d*max;dy=dy/d*max;}
    touchMove.x=dx/max;touchMove.y=dy/max;
    ui.moveStick.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
  ui.movePad.addEventListener('pointerdown',e=>{touchMove.pointerId=e.pointerId;ui.movePad.setPointerCapture(e.pointerId);updateStick(e);});
  ui.movePad.addEventListener('pointermove',e=>{if(e.pointerId===touchMove.pointerId)updateStick(e);});
  function releaseStick(e){if(e.pointerId!==touchMove.pointerId)return;touchMove.pointerId=null;touchMove.x=touchMove.y=0;ui.moveStick.style.transform='translate(-50%,-50%)';}
  ui.movePad.addEventListener('pointerup',releaseStick);ui.movePad.addEventListener('pointercancel',releaseStick);
  ui.attack.addEventListener('pointerdown',e=>{e.preventDefault();attack();});
  ui.dash.addEventListener('pointerdown',e=>{e.preventDefault();dash();});
  ui.interact.addEventListener('pointerdown',e=>{e.preventDefault();interact();});
  if(ui.weaponCycle)ui.weaponCycle.addEventListener('pointerdown',e=>{e.preventDefault();cycleWeapon();});
  ui.reset.addEventListener('click',()=>{
    if(confirm('Reset Briar Glen progress?')){try{localStorage.removeItem(SAVE_KEY);}catch(_){}location.reload();}
  });

  setInterval(saveGame, 8000);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame();});

  let last=performance.now();
  function frame(now){
    const dt=Math.min(.033,(now-last)/1000);last=now;
    update(dt);draw();requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Small test/debug surface used only for local verification; harmless in production.
  window.__BRIAR_GLENDebug={
    getState:()=>({player:{x:player.x,y:player.y,hp:player.hp,inventory:{...player.inventory},weapon:player.weapon,weaponType:player.weaponType,coins:player.coins},progress:{...progress},zone:zoneFor(player.x).name,enemies:enemies.map(e=>({type:e.type,hp:e.hp,maxHp:e.maxHp,dead:e.dead,pendingAttack:e.pendingAttack,windup:e.windup,chargeTimer:e.chargeTimer,x:e.x,y:e.y})),projectiles:projectiles.map(p=>({type:p.type,x:p.x,y:p.y,life:p.life}))}),
    teleport:(x,y)=>{player.x=x;player.y=y;camera.x=x;camera.y=y;},
    interact,attack,dash,craftSword,selectWeapon,
    setInventory:(patch)=>Object.assign(player.inventory,patch),
    setPlayer:(patch)=>Object.assign(player,patch),
    setProgress:(patch)=>Object.assign(progress,patch),
  };

  setTimeout(()=>{
    if(!progress.tipShown){toast('Follow the road east • gather 3 Briarleaf');progress.tipShown=true;saveGame();}
  },700);
