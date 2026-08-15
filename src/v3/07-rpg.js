(() => {
  'use strict';

  // Build 3 is intentionally additive. Build 2 remains untouched underneath this layer.
  const lootDrops = [];
  let inventoryOpen = false;

  if (!Number.isFinite(player.inventory.mooncap)) player.inventory.mooncap = 0;
  if (!Number.isFinite(player.inventory.hide)) player.inventory.hide = 0;
  if (!Number.isFinite(player.inventory.tonic)) player.inventory.tonic = 0;
  if (typeof progress.patrolActive !== 'boolean') progress.patrolActive = false;
  if (typeof progress.patrolComplete !== 'boolean') progress.patrolComplete = false;
  if (!Number.isFinite(progress.patrolKills)) progress.patrolKills = 0;

  ui.questTitle = document.getElementById('quest-title');
  ui.inventoryStrip = document.getElementById('inventory-strip');
  ui.inventoryBackdrop = document.getElementById('inventory-backdrop');
  ui.inventoryPanel = document.getElementById('inventory-panel');
  ui.inventoryClose = document.getElementById('inventory-close');
  ui.useTonic = document.getElementById('use-tonic-btn');
  ui.potionBtn = document.getElementById('potion-btn');
  ui.panelHerb = document.getElementById('panel-herb-count');
  ui.panelMooncap = document.getElementById('panel-mooncap-count');
  ui.panelOre = document.getElementById('panel-ore-count');
  ui.panelHide = document.getElementById('panel-hide-count');
  ui.panelTusk = document.getElementById('panel-tusk-count');
  ui.panelTonic = document.getElementById('panel-tonic-count');
  ui.recipeStatus = document.getElementById('recipe-status');

  // New town service and forage nodes.
  addObject('alchemy', -650, 260, { label: 'Mira the Alchemist' });
  blockers.push({ x: -650, y: 260, r: 42 });
  [[40,270],[320,-265],[545,260],[735,-245]].forEach(([x,y]) => addResource('mooncap', x, y));

  function toggleInventory(force) {
    inventoryOpen = typeof force === 'boolean' ? force : !inventoryOpen;
    ui.inventoryPanel.hidden = !inventoryOpen;
    ui.inventoryBackdrop.hidden = !inventoryOpen;
    ui.inventoryStrip.classList.toggle('open', inventoryOpen);
    if (inventoryOpen) updateInventoryPanel();
  }

  function updateInventoryPanel() {
    ui.panelHerb.textContent = player.inventory.herb;
    ui.panelMooncap.textContent = player.inventory.mooncap;
    ui.panelOre.textContent = player.inventory.ore;
    ui.panelHide.textContent = player.inventory.hide;
    ui.panelTusk.textContent = player.inventory.tusk;
    ui.panelTonic.textContent = player.inventory.tonic;
    const ready = player.inventory.herb >= 1 && player.inventory.mooncap >= 1;
    ui.recipeStatus.textContent = ready
      ? 'Ready at Mira: 1 Briarleaf + 1 Mooncap → Healing Tonic'
      : `Mira needs 1 Briarleaf + 1 Mooncap (${player.inventory.herb}/1 • ${player.inventory.mooncap}/1)`;
    ui.useTonic.disabled = player.inventory.tonic <= 0 || player.hp >= player.maxHp;
    ui.useTonic.textContent = player.hp >= player.maxHp ? 'Health Full' : `Use Healing Tonic (+45) • ${player.inventory.tonic}`;
  }

  function useTonic() {
    if (player.inventory.tonic <= 0) {
      toast('No Healing Tonics in your satchel');
      return false;
    }
    if (player.hp >= player.maxHp) {
      toast('Health is already full');
      return false;
    }
    player.inventory.tonic -= 1;
    const healed = Math.min(45, player.maxHp - player.hp);
    player.hp += healed;
    spawnParticles(player.x, player.y, '#8fd0aa', 14, .7);
    addFloater(player.x, player.y - 20, `+${healed} HEALTH`, '#b9f0d0');
    toast('Healing Tonic used');
    vibrate(15);
    saveGame();
    updateInventoryPanel();
    return true;
  }

  function brewTonic(o) {
    if (player.inventory.herb < 1 || player.inventory.mooncap < 1) {
      toast(`Mira needs Briarleaf + Mooncap (${player.inventory.herb}/1 • ${player.inventory.mooncap}/1)`);
      return false;
    }
    player.inventory.herb -= 1;
    player.inventory.mooncap -= 1;
    player.inventory.tonic += 1;
    spawnParticles(o.x, o.y, '#8fd0aa', 18, .8);
    addFloater(o.x, o.y - 18, 'HEALING TONIC +1', '#b9f0d0');
    toast('Mira brewed a Healing Tonic');
    saveGame();
    return true;
  }

  function spawnLoot(type, x, y, qty = 1) {
    lootDrops.push({ type, x, y, qty, life: 55, maxLife: 55, bob: Math.random() * TAU });
  }

  function collectLoot(drop) {
    if (drop.type === 'hide') {
      player.inventory.hide += drop.qty;
      addFloater(drop.x, drop.y - 12, `BEAST HIDE +${drop.qty}`, '#dfc3a0');
      toast('Beast Hide added to satchel');
    }
    drop.life = 0;
    saveGame();
  }

  function updateLootDrops(dt) {
    for (const drop of lootDrops) {
      drop.life -= dt;
      drop.bob += dt * 3.2;
      if (drop.life > 0 && Math.hypot(player.x - drop.x, player.y - drop.y) <= 52) collectLoot(drop);
    }
    for (let i = lootDrops.length - 1; i >= 0; i--) if (lootDrops[i].life <= 0) lootDrops.splice(i, 1);
  }

  const v2KillEnemy = killEnemy;
  killEnemy = function build3KillEnemy(e) {
    if (!e || e.dead) return;
    const type = e.type;
    const x = e.x, y = e.y;
    v2KillEnemy(e);
    if (type !== 'boss') {
      spawnLoot('hide', x, y, 1);
      if (progress.patrolActive && !progress.patrolComplete) {
        progress.patrolKills = Math.min(3, progress.patrolKills + 1);
        if (progress.patrolKills === 3) toast('Hollow Patrol: threats cleared — collect 2 Beast Hides');
        saveGame();
      }
    }
  };

  nearestInteractable = function build3NearestInteractable() {
    const candidates = [];
    for (const r of resources) if (r.active) candidates.push({ kind: 'resource', obj: r, d: dist(player, r) });
    for (const o of worldObjects) {
      if (['forge','board','shortcut','well','alchemy'].includes(o.type)) candidates.push({ kind: o.type, obj: o, d: dist(player, o) });
    }
    candidates.sort((a, b) => a.d - b.d);
    const c = candidates[0];
    if (!c) return null;
    const range = c.kind === 'shortcut' ? 105 : c.kind === 'alchemy' ? 100 : 90;
    return c.d <= range ? c : null;
  };

  function handlePatrolBoard(obj) {
    if (progress.patrolComplete) {
      toast('Hollow Patrol — COMPLETE');
      return;
    }
    if (!progress.patrolActive) {
      progress.patrolActive = true;
      progress.patrolKills = 0;
      toast('New contract accepted — Hollow Patrol');
      addFloater(obj.x, obj.y - 18, 'HOLLOW PATROL', '#f4d49a');
      saveGame();
      return;
    }
    if (progress.patrolKills < 3 || player.inventory.hide < 2) {
      toast(`Hollow Patrol • ${progress.patrolKills}/3 threats • ${player.inventory.hide}/2 hides`);
      return;
    }
    player.inventory.hide -= 2;
    progress.patrolActive = false;
    progress.patrolComplete = true;
    player.coins += 125;
    player.inventory.tonic += 1;
    toast('Contract complete — Hollow Patrol');
    addFloater(obj.x, obj.y - 20, '+125 COINS • TONIC +1', '#f4d49a');
    saveGame();
  }

  const v2Interact = interact;
  interact = function build3Interact() {
    if (inventoryOpen) return;
    const near = nearestInteractable();
    if (near?.kind === 'resource' && near.obj.type === 'mooncap') {
      near.obj.active = false;
      near.obj.cooldown = 26;
      player.inventory.mooncap += 1;
      spawnParticles(near.obj.x, near.obj.y, '#9279b8', 12, .65);
      addFloater(near.obj.x, near.obj.y - 10, 'MOONCAP +1', '#cab8e7');
      saveGame();
      return;
    }
    if (near?.kind === 'alchemy') {
      brewTonic(near.obj);
      return;
    }
    if (near?.kind === 'board' && progress.contractComplete) {
      handlePatrolBoard(near.obj);
      return;
    }
    return v2Interact();
  };

  const v2Attack = attack;
  attack = function build3Attack() {
    if (inventoryOpen) return;
    return v2Attack();
  };

  const v2Dash = dash;
  dash = function build3Dash() {
    if (inventoryOpen) return;
    return v2Dash();
  };

  const v2ObjectiveText = objectiveText;
  objectiveText = function build3ObjectiveText() {
    if (!progress.contractComplete) return v2ObjectiveText();
    if (progress.patrolComplete) return 'Hollow Patrol complete. Explore the wilds or brew supplies with Mira.';
    if (!progress.patrolActive) return 'Return to the Contract Board for new work.';
    if (progress.patrolKills < 3) return 'Defeat 3 threats on Meadow Road or in Copper Hollow.';
    if (player.inventory.hide < 2) return 'Collect 2 Beast Hides from defeated threats.';
    return 'Return to the Contract Board with 2 Beast Hides.';
  };

  const v2ObjectiveProgress = objectiveProgress;
  objectiveProgress = function build3ObjectiveProgress() {
    if (!progress.contractComplete) return v2ObjectiveProgress();
    if (progress.patrolComplete) return 'COMPLETE • 125 COINS • TONIC';
    if (!progress.patrolActive) return 'NEW CONTRACT AVAILABLE';
    return `${progress.patrolKills} / 3 THREATS • ${player.inventory.hide} / 2 HIDES`;
  };

  const v2UpdateUI = updateUI;
  updateUI = function build3UpdateUI() {
    v2UpdateUI();
    if (ui.questTitle) ui.questTitle.textContent = progress.contractComplete ? 'Hollow Patrol' : 'Smoke in the Hollow';
    if (ui.potionBtn) {
      ui.potionBtn.textContent = `TONIC ${player.inventory.tonic}`;
      ui.potionBtn.dataset.empty = player.inventory.tonic > 0 ? 'false' : 'true';
    }
    const near = nearestInteractable();
    if (near?.kind === 'resource' && near.obj.type === 'mooncap') ui.context.textContent = 'USE • Gather Mooncap';
    else if (near?.kind === 'alchemy') ui.context.textContent = 'USE • Brew Tonic (Briarleaf + Mooncap)';
    else if (near?.kind === 'board' && progress.contractComplete) {
      if (progress.patrolComplete) ui.context.textContent = 'USE • Hollow Patrol complete';
      else if (!progress.patrolActive) ui.context.textContent = 'USE • Accept Hollow Patrol';
      else ui.context.textContent = progress.patrolKills >= 3 && player.inventory.hide >= 2 ? 'USE • Turn in Hollow Patrol' : 'USE • Review Hollow Patrol';
    }
    if (inventoryOpen) updateInventoryPanel();
  };

  const v2Update = update;
  update = function build3Update(dt) {
    if (inventoryOpen) {
      updateUI();
      return;
    }
    v2Update(dt);
    updateLootDrops(dt);
  };

  const v2DrawObject = drawObject;
  drawObject = function build3DrawObject(o) {
    if (o.type !== 'alchemy') return v2DrawObject(o);
    const p = worldToScreen(o.x, o.y), z = camera.zoom;
    if (p.x < -160 || p.x > viewport.w + 160 || p.y < -180 || p.y > viewport.h + 160) return;
    shadow(o.x, o.y, 44, 22, .27);
    ctx.fillStyle = '#584838';
    ctx.fillRect(p.x - 34*z, p.y - 28*z, 68*z, 28*z);
    ctx.fillStyle = '#6b4d6e';
    ctx.beginPath(); ctx.moveTo(p.x - 42*z, p.y - 29*z); ctx.lineTo(p.x, p.y - 54*z); ctx.lineTo(p.x + 42*z, p.y - 29*z); ctx.closePath(); ctx.fill();
    circle(p.x - 15*z, p.y - 36*z, 5*z, '#8fd0aa');
    circle(p.x + 2*z, p.y - 39*z, 5*z, '#9279b8');
    circle(p.x + 18*z, p.y - 35*z, 4*z, '#d8c985');
    labelAt(p.x, p.y - 66*z, 'MIRA • ALCHEMY');
  };

  const v2DrawResource = drawResource;
  drawResource = function build3DrawResource(r) {
    if (r.type !== 'mooncap') return v2DrawResource(r);
    const p = worldToScreen(r.x, r.y), z = camera.zoom;
    shadow(r.x, r.y, 16, 9, .16);
    ctx.strokeStyle = '#d7d0b8'; ctx.lineWidth = 3*z; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 15*z); ctx.stroke();
    ctx.fillStyle = '#8e75b3';
    ctx.beginPath(); ctx.arc(p.x, p.y - 17*z, 10*z, Math.PI, TAU); ctx.lineTo(p.x + 10*z, p.y - 17*z); ctx.closePath(); ctx.fill();
    circle(p.x - 3*z, p.y - 21*z, 1.7*z, '#c9bce1');
    circle(p.x + 4*z, p.y - 19*z, 1.4*z, '#c9bce1');
  };

  function drawLootDrops() {
    const now = performance.now() / 1000;
    for (const drop of lootDrops) {
      if (drop.life <= 0) continue;
      const p = worldToScreen(drop.x, drop.y), z = camera.zoom;
      const bob = Math.sin(now * 4 + drop.bob) * 4*z;
      shadow(drop.x, drop.y, 14, 7, .14);
      if (drop.type === 'hide') {
        ctx.save(); ctx.translate(p.x, p.y - 20*z + bob); ctx.rotate(.18);
        ctx.fillStyle = '#9a7353';
        ctx.beginPath(); ctx.moveTo(-11*z, -7*z); ctx.lineTo(10*z, -10*z); ctx.lineTo(13*z, 6*z); ctx.lineTo(-8*z, 10*z); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(242,218,184,.55)'; ctx.lineWidth = 1.5*z; ctx.stroke(); ctx.restore();
      }
    }
  }

  const v2DrawFloaters = drawFloaters;
  drawFloaters = function build3DrawFloaters() {
    drawLootDrops();
    v2DrawFloaters();
  };

  ui.inventoryStrip.addEventListener('pointerdown', e => { e.preventDefault(); toggleInventory(); });
  ui.inventoryStrip.addEventListener('keydown', e => {
    if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); toggleInventory(); }
  });
  ui.inventoryBackdrop.addEventListener('pointerdown', () => toggleInventory(false));
  ui.inventoryClose.addEventListener('click', () => toggleInventory(false));
  ui.useTonic.addEventListener('click', () => useTonic());
  if (ui.potionBtn) ui.potionBtn.addEventListener('pointerdown', e => { e.preventDefault(); useTonic(); });

  addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code === 'KeyI') toggleInventory();
    if (e.code === 'Escape' && inventoryOpen) toggleInventory(false);
    if (e.code === 'KeyQ') useTonic();
  });

  // Repoint the debug surface at the active Build 3 functions and expose deterministic helpers for smoke tests.
  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.interact = () => interact();
    window.__BRIAR_GLENDebug.attack = () => attack();
    window.__BRIAR_GLENDebug.dash = () => dash();
    window.__BRIAR_GLENDebug.useTonic = () => useTonic();
    window.__BRIAR_GLENDebug.toggleInventory = force => toggleInventory(force);
    window.__BRIAR_GLENDebug.spawnLoot = (type = 'hide', qty = 1) => spawnLoot(type, player.x, player.y, qty);
    window.__BRIAR_GLENDebug.getRPGState = () => ({
      inventoryOpen,
      lootDrops: lootDrops.map(d => ({ type: d.type, qty: d.qty, life: d.life, x: d.x, y: d.y })),
      patrol: { active: progress.patrolActive, complete: progress.patrolComplete, kills: progress.patrolKills },
    });
  }

  updateUI();
})();