(() => {
  'use strict';

  // Build 17: Stonepine Reach / Old Warden Quarry.
  // A new post-Fen branch that reuses the verified economy, contracts and combat language.
  const stoneZone = { name: 'STONEPINE REACH', tint: '#5a5b48' };
  const stone = {
    gateX: 2240,
    gateY: -1500,
    campX: 2690,
    campY: -1365,
    bossX: 3190,
    bossY: -1840,
    hazards: [],
    bolts: [],
    counters: { screeHits: 0, kitsCrafted: 0, ridgeCharges: 0, wispShots: 0, bossPatterns: 0 },
  };

  if (typeof progress.stonepinePassOpened !== 'boolean') progress.stonepinePassOpened = false;
  if (typeof progress.stonepineDiscovered !== 'boolean') progress.stonepineDiscovered = false;
  if (typeof progress.stonepineBossDefeated !== 'boolean') progress.stonepineBossDefeated = false;
  if (typeof progress.stonepineCacheClaimed !== 'boolean') progress.stonepineCacheClaimed = false;
  if (!Number.isFinite(progress.stonepineKits)) progress.stonepineKits = 0;
  if (!progress.mapDiscoveries) progress.mapDiscoveries = {};
  if (typeof progress.mapDiscoveries.stonepine !== 'boolean') progress.mapDiscoveries.stonepine = !!progress.stonepineDiscovered;
  if (!Number.isFinite(player.inventory.resin)) player.inventory.resin = 0;

  WORLD.maxX = Math.max(WORLD.maxX, 3440);
  WORLD.minY = Math.min(WORLD.minY, -2160);

  addObject('stonepineSign', 2135, -1415, { label: 'Stonepine Reach' });
  addObject('stonepineGate', stone.gateX, stone.gateY, { label: 'Stonepine Pass' });
  addObject('stonepineCamp', stone.campX, stone.campY, { label: 'Warden Pitch Camp' });
  addObject('stonepineCache', 3255, -1900, { label: 'Stonepine Survey Cache' });
  addObject('stonepineRuin', 3110, -1760, { piece: 0 });
  addObject('stonepineRuin', 3290, -1745, { piece: 1 });
  addObject('stonepineRuin', 3345, -1935, { piece: 2 });

  [
    [2360,-1260,1.15],[2460,-1700,.95],[2600,-1225,1.05],[2780,-1540,1.2],
    [2900,-1180,.9],[3040,-1490,1.15],[3180,-1265,1.08],[3320,-1600,1.25],
    [2430,-1980,1.1],[2820,-2020,.92],[3090,-2070,1.18],[3360,-2090,1.05],
  ].forEach(([x,y,s]) => addObject('stonepineTree', x, y, { s }));

  [
    [2390,-1470,.9],[2520,-1830,1.1],[2730,-1720,.8],[2870,-1425,1.15],
    [3000,-1900,.95],[3140,-1585,1.2],[3330,-1820,1.05],
  ].forEach(([x,y,s]) => addObject('quarryRock', x, y, { s }));

  [
    [2485,-1335],[2740,-1605],[3015,-1415],[3265,-2050],
  ].forEach(([x,y]) => addResource('resin', x, y));

  const screeFields = [
    { x: 2530, y: -1660, radius: 105, cooldown: 1.1, active: null },
    { x: 2860, y: -1265, radius: 95, cooldown: 2.4, active: null },
    { x: 3025, y: -1775, radius: 112, cooldown: 3.0, active: null },
    { x: 3290, y: -1490, radius: 92, cooldown: 1.8, active: null },
  ];

  addEnemy('ridgehorn', 2530, -1470, {
    name: 'Ridgehorn', hp: 96, maxHp: 96, speed: 96, damage: 14,
    aggro: 390, attackRange: 55, radius: 28, scale: 1.08, color: '#756c59',
    homeX: 2530, homeY: -1470, specialCd: 1.1,
  });
  addEnemy('ridgehorn', 2970, -1890, {
    name: 'Ridgehorn', hp: 96, maxHp: 96, speed: 96, damage: 14,
    aggro: 390, attackRange: 55, radius: 28, scale: 1.08, color: '#756c59',
    homeX: 2970, homeY: -1890, specialCd: 1.8,
  });
  addEnemy('quarrywisp', 2820, -1280, {
    name: 'Quarry Wisp', hp: 68, maxHp: 68, speed: 78, damage: 13,
    aggro: 460, attackRange: 150, radius: 22, scale: .88, color: '#8b957d',
    homeX: 2820, homeY: -1280, specialCd: 1.2,
  });
  addEnemy('quarrywisp', 3230, -1540, {
    name: 'Quarry Wisp', hp: 68, maxHp: 68, speed: 78, damage: 13,
    aggro: 460, attackRange: 150, radius: 22, scale: .88, color: '#8b957d',
    homeX: 3230, homeY: -1540, specialCd: 2.0,
  });
  const quarrySentinel = addEnemy('quarrysentinel', stone.bossX, stone.bossY, {
    name: 'Quarry Sentinel', hp: 290, maxHp: 290, speed: 82, damage: 19,
    aggro: 520, attackRange: 68, radius: 41, scale: 1.48, color: '#68695f',
    homeX: stone.bossX, homeY: stone.bossY, specialCd: 1.5,
  });
  if (progress.stonepineBossDefeated) {
    quarrySentinel.dead = true;
    quarrySentinel.hp = 0;
    quarrySentinel.respawn = 99999;
  }

  const build16ZoneFor = zoneFor;
  zoneFor = function build17ZoneFor(x, y = player.y) {
    if (x >= 2245 && x <= 3425 && y <= -1120) return stoneZone;
    return build16ZoneFor(x, y);
  };

  function stonepineReady() {
    return !!progress.fenCacheClaimed;
  }

  function regionPaused() {
    return [
      ui.inventoryPanel, ui.tradePanel, ui.craftPanel,
      document.getElementById('warden-overlay'),
      document.getElementById('board2-panel'),
    ].some(el => el && !el.hidden);
  }

  const build16NearestInteractable = nearestInteractable;
  nearestInteractable = function build17NearestInteractable() {
    const base = build16NearestInteractable();
    const extras = worldObjects
      .filter(o => ['stonepineSign','stonepineGate','stonepineCamp','stonepineCache'].includes(o.type))
      .map(o => ({ kind: o.type, obj: o, d: dist(player, o) }))
      .filter(c => c.d <= (c.kind === 'stonepineGate' ? 120 : 102));

    for (const r of resources) {
      if (r.active && r.type === 'resin') {
        const d = dist(player, r);
        if (d <= 92) extras.push({ kind: 'resource', obj: r, d });
      }
    }

    extras.sort((a,b) => a.d - b.d);
    if (extras[0] && (!base || extras[0].d < base.d)) return extras[0];
    return base;
  };

  function craftPitchworkKit(o) {
    if ((player.inventory.resin || 0) < 2 || player.coins < 55) {
      toast(`Pitchwork Kit needs 2 Ironpine Resin + 55 c (${player.inventory.resin || 0}/2 • ${player.coins} c)`);
      return false;
    }
    player.inventory.resin -= 2;
    player.coins -= 55;
    player.inventory.tonic = (player.inventory.tonic || 0) + 1;
    player.inventory.oil = (player.inventory.oil || 0) + 1;
    progress.stonepineKits += 1;
    stone.counters.kitsCrafted += 1;
    spawnParticles(o.x, o.y, '#c99352', 18, .75);
    addFloater(o.x, o.y - 22, 'PITCHWORK KIT • TONIC + OIL', '#efd398');
    toast('Pitchwork Kit assembled');
    saveGame();
    return true;
  }

  const build16Interact = interact;
  interact = function build17Interact() {
    const near = nearestInteractable();

    if (near?.kind === 'stonepineSign') {
      toast(stonepineReady()
        ? 'Stonepine Reach • old quarry route east of Mosswater Fen'
        : 'Stonepine Reach • recover the Sunken Warden Reliquary first');
      return;
    }

    if (near?.kind === 'stonepineGate') {
      if (!stonepineReady()) {
        toast('The Stonepine pass remains barred until Mosswater Fen is secured');
        return;
      }
      if (!progress.stonepinePassOpened) {
        progress.stonepinePassOpened = true;
        spawnParticles(near.obj.x, near.obj.y, '#a18d69', 22, .8);
        addFloater(near.obj.x, near.obj.y - 24, 'STONEPINE PASS OPEN', '#e2cc9c');
        toast('Stonepine Pass opened');
        saveGame();
      } else toast('Stonepine Pass is open');
      return;
    }

    if (near?.kind === 'resource' && near.obj.type === 'resin') {
      if (!progress.stonepinePassOpened) {
        toast('Stonepine Reach is still sealed');
        return;
      }
      near.obj.active = false;
      near.obj.cooldown = 38;
      player.inventory.resin = (player.inventory.resin || 0) + 1;
      spawnParticles(near.obj.x, near.obj.y, '#c28b4f', 13, .65);
      addFloater(near.obj.x, near.obj.y - 12, 'IRONPINE RESIN +1', '#efc77f');
      toast('Ironpine Resin recovered');
      saveGame();
      return;
    }

    if (near?.kind === 'stonepineCamp') {
      craftPitchworkKit(near.obj);
      return;
    }

    if (near?.kind === 'stonepineCache') {
      if (!progress.stonepineBossDefeated) {
        toast('The survey cache is sealed by the Quarry Sentinel');
        return;
      }
      if (progress.stonepineCacheClaimed) {
        toast('The Stonepine Survey Cache is empty');
        return;
      }
      progress.stonepineCacheClaimed = true;
      player.coins += 140;
      player.inventory.resin = (player.inventory.resin || 0) + 2;
      player.inventory.iron = (player.inventory.iron || 0) + 1;
      spawnParticles(near.obj.x, near.obj.y, '#d2b16f', 27, 1.0);
      addFloater(near.obj.x, near.obj.y - 26, '+140 c • 2 RESIN • DEEPVEIN IRON', '#f0d59d');
      toast('Stonepine Survey Cache recovered');
      saveGame();
      return;
    }

    return build16Interact();
  };

  function stoneState(e) {
    if (!e.__stonepine) e.__stonepine = { mode: null, timer: 0, max: 0, cooldown: e.specialCd || .8, targetX: e.x, targetY: e.y, vx: 0, vy: 0, hit: false, alternator: 0 };
    return e.__stonepine;
  }

  function beginStoneWindup(e, kind, duration, targetX = player.x, targetY = player.y) {
    const s = stoneState(e);
    s.mode = 'windup'; s.kind = kind; s.timer = duration; s.max = duration;
    s.targetX = targetX; s.targetY = targetY; s.hit = false;
    e.pendingAttack = kind; e.windup = duration; e.windupMax = duration;
    e.telegraphTargetX = targetX; e.telegraphTargetY = targetY;
  }

  function beginStoneDash(e, kind, duration, speed, damage, targetX, targetY, after = 'recover') {
    const s = stoneState(e);
    const n = norm(targetX - e.x, targetY - e.y);
    s.mode = 'dash'; s.kind = kind; s.timer = duration; s.max = duration;
    s.vx = n.x; s.vy = n.y; s.speed = speed; s.damage = damage; s.hit = false; s.after = after;
    e.pendingAttack = null; e.windup = 0; e.facingX = n.x; e.facingY = n.y;
  }

  function spawnWispBolt(e, targetX, targetY) {
    const n = norm(targetX - e.x, targetY - e.y);
    stone.bolts.push({ x: e.x, y: e.y, vx: n.x * 365, vy: n.y * 365, life: 1.5, radius: 10, damage: 14, dead: false });
    stone.counters.wispShots += 1;
    spawnParticles(e.x, e.y, '#b3c19f', 7, .4);
  }

  function addRockfall(x, y, delay = .52, damage = 15, radius = 78, label = 'SCREE FALL') {
    stone.hazards.push({ x, y, delay, maxDelay: delay, life: .58, maxLife: .58, damage, radius, label, triggered: false });
  }

  function finishStoneWindup(e) {
    const s = stoneState(e);
    if (s.kind === 'ridge-charge') {
      stone.counters.ridgeCharges += 1;
      beginStoneDash(e, s.kind, .52, 505, 17, s.targetX, s.targetY, 'stagger');
      return;
    }
    if (s.kind === 'wisp-shot') {
      spawnWispBolt(e, s.targetX, s.targetY);
      s.mode = 'recover'; s.timer = .3; e.pendingAttack = null; e.windup = 0;
      return;
    }
    if (s.kind === 'sentinel-charge') {
      stone.counters.bossPatterns += 1;
      beginStoneDash(e, s.kind, .6, 485, 23, s.targetX, s.targetY, 'stagger');
      return;
    }
    if (s.kind === 'sentinel-rockfall') {
      stone.counters.bossPatterns += 1;
      [[0,0],[86,-42],[-82,45]].forEach(([ox,oy],i) => addRockfall(s.targetX + ox, s.targetY + oy, .34 + i*.09, 18, 82, 'SENTINEL ROCKFALL'));
      s.mode = 'recover'; s.timer = .42; e.pendingAttack = null; e.windup = 0;
      return;
    }
    s.mode = null; e.pendingAttack = null; e.windup = 0;
  }

  function updateStoneState(e, dt) {
    const s = stoneState(e);
    if (!s.mode) return false;

    if (s.mode === 'windup') {
      s.timer -= dt;
      e.windup = Math.max(0, s.timer);
      if (s.timer <= 0) finishStoneWindup(e);
      return true;
    }

    if (s.mode === 'dash') {
      s.timer -= dt;
      const control = e.hurt > 0 ? .56 : 1;
      collideMove(e, s.vx * s.speed * control * dt, s.vy * s.speed * control * dt);
      e.facingX = s.vx; e.facingY = s.vy;
      if (Math.random() < .42) spawnParticles(e.x, e.y, '#aa8e68', 1, .22);
      if (!s.hit && dist(e, player) <= e.radius + player.radius + 14) {
        s.hit = true;
        damagePlayer(s.damage, e);
      }
      if (s.timer <= 0) {
        s.mode = s.after === 'stagger' ? 'stagger' : 'recover';
        s.timer = s.after === 'stagger' ? .7 : .28;
      }
      return true;
    }

    if (s.mode === 'stagger' || s.mode === 'recover') {
      s.timer -= dt;
      if (s.mode === 'stagger') e.hurt = Math.max(e.hurt || 0, .13);
      if (s.timer <= 0) s.mode = null;
      return true;
    }
    return false;
  }

  function moveHomeOrPlayer(e, dt, preferRange = null) {
    const d = dist(e, player);
    if (d < e.aggro) {
      let nx = 0, ny = 0;
      if (preferRange && d < preferRange[0]) {
        const n = norm(e.x - player.x, e.y - player.y); nx = n.x; ny = n.y;
      } else if (preferRange && d <= preferRange[1]) {
        const n = norm(player.x - e.x, player.y - e.y); nx = -n.y * .42; ny = n.x * .42;
      } else {
        const n = norm(player.x - e.x, player.y - e.y); nx = n.x; ny = n.y;
      }
      e.facingX = nx; e.facingY = ny;
      collideMove(e, nx * e.speed * (e.hurt > 0 ? .35 : 1) * dt, ny * e.speed * (e.hurt > 0 ? .35 : 1) * dt);
      return;
    }
    const home = norm(e.homeX - e.x, e.homeY - e.y);
    if (Math.hypot(e.homeX-e.x,e.homeY-e.y) > 12) collideMove(e, home.x * e.speed * .55 * dt, home.y * e.speed * .55 * dt);
  }

  const build16UpdateEnemy = updateEnemy;
  updateEnemy = function build17UpdateEnemy(e, dt) {
    if (!['ridgehorn','quarrywisp','quarrysentinel'].includes(e.type)) return build16UpdateEnemy(e, dt);

    const s = stoneState(e);
    e.attackCd = Math.max(0, e.attackCd - dt);
    e.specialCd = Math.max(0, e.specialCd - dt);
    e.hurt = Math.max(0, e.hurt - dt);
    s.cooldown = Math.max(0, (s.cooldown || 0) - dt);

    if (e.dead) {
      s.mode = null;
      if (e.type === 'quarrysentinel') { e.respawn = 99999; return; }
      return build16UpdateEnemy(e, dt);
    }

    if (updateStoneState(e, dt)) return;
    const d = dist(e, player);

    if (e.type === 'ridgehorn') {
      if (d < e.aggro && d > 105 && d < 385 && s.cooldown <= 0) {
        beginStoneWindup(e, 'ridge-charge', .58);
        s.cooldown = 3.6;
        return;
      }
      if (d <= e.attackRange + player.radius && e.attackCd <= 0) {
        e.attackCd = 1.15;
        beginEnemyAttack(e, 'bite', .3);
        return;
      }
      moveHomeOrPlayer(e, dt);
      return;
    }

    if (e.type === 'quarrywisp') {
      if (d < e.aggro && s.cooldown <= 0) {
        beginStoneWindup(e, 'wisp-shot', .68);
        s.cooldown = 2.65;
        return;
      }
      moveHomeOrPlayer(e, dt, [145, 310]);
      return;
    }

    e.phase = e.hp / e.maxHp <= .45 ? 2 : 1;
    if (d < e.aggro && s.cooldown <= 0) {
      const useCharge = e.phase === 2 && s.alternator++ % 2 === 1;
      beginStoneWindup(e, useCharge ? 'sentinel-charge' : 'sentinel-rockfall', useCharge ? .52 : .76);
      s.cooldown = e.phase === 2 ? 2.4 : 3.1;
      return;
    }
    if (d <= e.attackRange + player.radius && e.attackCd <= 0) {
      e.attackCd = .95;
      beginEnemyAttack(e, 'bite', .34);
      return;
    }
    moveHomeOrPlayer(e, dt);
  };

  const build16DamageEnemy = damageEnemy;
  damageEnemy = function build17DamageEnemy(e, amount, opts = {}) {
    if (!e || e.dead || !['ridgehorn','quarrywisp','quarrysentinel'].includes(e.type)) return build16DamageEnemy(e, amount, opts);
    const s = stoneState(e);
    let adjusted = amount;

    if (player.weaponType === 'sword' && s.mode === 'windup' && (e.type !== 'quarrysentinel' || amount >= 30)) {
      s.mode = 'stagger'; s.timer = e.type === 'quarrysentinel' ? .34 : .48;
      e.windup = 0; e.pendingAttack = null;
      addFloater(e.x, e.y - 34, 'INTERRUPTED', '#efd99a');
    }
    if (player.weaponType === 'bow' && s.mode === 'dash') {
      adjusted = Math.round(amount * 1.2);
      addFloater(e.x, e.y - 34, 'RIDGE COUNTER', '#f0ce87');
    }
    if (player.weaponType === 'staff') {
      e.hurt = Math.max(e.hurt || 0, .5);
      if (s.mode === 'windup') s.timer += .14;
    }
    return build16DamageEnemy(e, adjusted, opts);
  };

  const build16KillEnemy = killEnemy;
  killEnemy = function build17KillEnemy(e) {
    if (!e || e.dead) return;
    const type = e.type;
    const newThreat = type === 'ridgehorn' || type === 'quarrywisp';
    const sentinel = type === 'quarrysentinel';
    const beforeCoins = player.coins;
    const shouldCountCull = newThreat && progress.activeBoardContract?.id === 'briar_cull';
    build16KillEnemy(e);

    if (shouldCountCull && e.dead && progress.activeBoardContract?.id === 'briar_cull') {
      progress.activeBoardContract.kills = Math.min(3, (progress.activeBoardContract.kills || 0) + 1);
      if (progress.activeBoardContract.kills === 3) toast('Cull the Briar complete — report to the Contract Board');
      saveGame();
    }

    if (sentinel && e.dead && !progress.stonepineBossDefeated) {
      progress.stonepineBossDefeated = true;
      e.respawn = 99999;
      const baseAward = player.coins - beforeCoins;
      player.coins += Math.max(0, 100 - baseAward);
      addFloater(e.x, e.y - 46, 'QUARRY SENTINEL • +100 c TOTAL', '#e2c589');
      toast('Quarry Sentinel defeated — recover the survey cache');
      saveGame();
    }
  };

  function triggerScree(field, targetX = player.x, targetY = player.y) {
    if (field.active || field.cooldown > 0) return false;
    field.active = { x: targetX, y: targetY, timer: .72, max: .72, triggered: false, life: .58 };
    field.cooldown = 4.8;
    return true;
  }

  function updateScree(dt) {
    for (const field of screeFields) {
      field.cooldown = Math.max(0, field.cooldown - dt);
      if (!field.active && field.cooldown <= 0 && Math.hypot(player.x-field.x,player.y-field.y) <= field.radius) triggerScree(field);
      const a = field.active;
      if (!a) continue;
      if (!a.triggered) {
        a.timer -= dt;
        if (a.timer <= 0) {
          a.triggered = true;
          spawnParticles(a.x, a.y, '#94856a', 20, 1.0);
          if (Math.hypot(player.x-a.x,player.y-a.y) <= 86 + player.radius) {
            const before = player.hp;
            damagePlayer(13, { x:a.x, y:a.y });
            if (player.hp < before) stone.counters.screeHits += 1;
          }
        }
      } else {
        a.life -= dt;
        if (a.life <= 0) field.active = null;
      }
    }
  }

  function updateBossHazards(dt) {
    for (const h of stone.hazards) {
      h.delay -= dt;
      if (!h.triggered && h.delay <= 0) {
        h.triggered = true;
        spawnParticles(h.x,h.y,'#8c816d',19,.95);
        if (Math.hypot(player.x-h.x,player.y-h.y) <= h.radius + player.radius) damagePlayer(h.damage,{x:h.x,y:h.y});
      }
      if (h.triggered) h.life -= dt;
    }
    stone.hazards = stone.hazards.filter(h => !h.triggered || h.life > 0);
  }

  function updateBolts(dt) {
    for (const b of stone.bolts) {
      if (b.dead) continue;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || blockers.some(block => Math.hypot(b.x-block.x,b.y-block.y) <= block.r + b.radius)) { b.dead = true; continue; }
      if (Math.hypot(player.x-b.x,player.y-b.y) <= player.radius + b.radius) {
        b.dead = true;
        damagePlayer(b.damage,{x:b.x,y:b.y});
      }
    }
    stone.bolts = stone.bolts.filter(b => !b.dead && b.life > 0);
  }

  const build16Update = update;
  update = function build17Update(dt) {
    if (!progress.stonepinePassOpened && player.x > 2250 && player.y <= -1120) player.x = 2250;
    build16Update(dt);
    if (regionPaused()) return;
    updateScree(dt);
    updateBossHazards(dt);
    updateBolts(dt);

    if (progress.stonepinePassOpened && !progress.stonepineDiscovered && zoneFor(player.x,player.y).name === stoneZone.name) {
      progress.stonepineDiscovered = true;
      progress.mapDiscoveries.stonepine = true;
      toast('Map updated — Stonepine Reach');
      saveGame();
    }
  };

  const build16ObjectiveText = objectiveText;
  objectiveText = function build17ObjectiveText() {
    if (!progress.fenCacheClaimed || progress.activeBoardContract) return build16ObjectiveText();
    if (progress.stonepineCacheClaimed) return build16ObjectiveText();
    if (!progress.stonepinePassOpened) return 'The recovered Fen charts mark an old quarry route east: Stonepine Reach.';
    if (!progress.stonepineDiscovered) return 'Cross Stonepine Pass and chart the old Warden quarry.';
    if ((player.inventory.resin || 0) < 2 && progress.stonepineKits < 1) return 'Recover 2 Ironpine Resin from the Stonepine slopes.';
    if (progress.stonepineKits < 1) return 'Use the Warden Pitch Camp to assemble a Pitchwork Kit.';
    if (!progress.stonepineBossDefeated) return 'Push through the scree fields and investigate the old Stonepine quarry.';
    return 'The Quarry Sentinel is down. Recover the Stonepine Survey Cache.';
  };

  const build16ObjectiveProgress = objectiveProgress;
  objectiveProgress = function build17ObjectiveProgress() {
    if (!progress.fenCacheClaimed || progress.activeBoardContract || progress.stonepineCacheClaimed) return build16ObjectiveProgress();
    if (!progress.stonepinePassOpened) return 'STONEPINE PASS • EAST OF MOSSWATER FEN';
    if (!progress.stonepineDiscovered) return 'UNCHARTED HIGHLAND ROUTE';
    if ((player.inventory.resin || 0) < 2 && progress.stonepineKits < 1) return `${player.inventory.resin || 0} / 2 IRONPINE RESIN`;
    if (progress.stonepineKits < 1) return 'PITCH CAMP • 2 RESIN + 55 c';
    if (!progress.stonepineBossDefeated) return `QUARRY AHEAD • ${player.inventory.resin || 0} RESIN`;
    return 'SURVEY CACHE • QUARRY RUINS';
  };

  function ensureStonepineMapMarker() {
    const svg = document.getElementById('warden-map-svg');
    if (!svg || document.getElementById('map-marker-stonepine')) return;
    const ns='http://www.w3.org/2000/svg';
    const path=document.createElementNS(ns,'path');
    path.id='stonepine-map-path';
    path.setAttribute('d','M805 126 C840 148 865 175 895 205');
    path.setAttribute('fill','none'); path.setAttribute('stroke','#5b4a32'); path.setAttribute('stroke-width','4'); path.setAttribute('stroke-dasharray','8 10'); path.setAttribute('opacity','.16');
    svg.appendChild(path);
    const marker=document.createElementNS(ns,'g');
    marker.id='map-marker-stonepine'; marker.setAttribute('class','map-marker unknown'); marker.setAttribute('transform','translate(900 210)');
    const circleEl=document.createElementNS(ns,'circle');circleEl.setAttribute('r','23');marker.appendChild(circleEl);
    const glyph=document.createElementNS(ns,'text');glyph.setAttribute('y','5');glyph.textContent='△';marker.appendChild(glyph);
    const label=document.createElementNS(ns,'text');label.setAttribute('class','marker-label');label.setAttribute('y','48');label.textContent='UNKNOWN';marker.appendChild(label);
    svg.appendChild(marker);
  }

  function appendJournalRow(target,label,done,key,locked='Undiscovered') {
    if (!target) return;
    let row=target.querySelector(`[data-build17="${key}"]`);
    if (!row) { row=document.createElement('div'); row.dataset.build17=key; target.appendChild(row); }
    row.className=`journal-row ${done?'done':'locked'}`;
    row.innerHTML=`<span>${done?'✓':'•'}</span><b>${done?label:locked}</b>`;
  }

  function syncStonepineBook() {
    ensureStonepineMapMarker();
    const found=!!progress.mapDiscoveries.stonepine;
    const marker=document.getElementById('map-marker-stonepine');
    if (marker) {
      marker.classList.toggle('unknown',!found); marker.classList.toggle('discovered',found);
      const label=marker.querySelector('.marker-label'); if(label)label.textContent=found?'STONEPINE REACH':'UNKNOWN';
    }
    const path=document.getElementById('stonepine-map-path'); if(path)path.style.opacity=found?'.66':'.12';
    const keys=['briar','meadow','hollow','den','grove','rootway','fen','stonepine'];
    const count=keys.filter(k=>progress.mapDiscoveries[k]).length;
    const countEl=document.getElementById('map-discovery-count'); if(countEl)countEl.textContent=`${count} / 8 locations charted`;

    appendJournalRow(document.getElementById('journal-places'),'Stonepine Reach',found,'place-stonepine');
    appendJournalRow(document.getElementById('journal-recipes'),'Pitchwork Kit',progress.stonepineKits>0 || found,'recipe-pitchwork','Unknown recipe');
    appendJournalRow(document.getElementById('journal-milestones'),'Quarry Sentinel defeated',!!progress.stonepineBossDefeated,'milestone-sentinel','Not completed');
    appendJournalRow(document.getElementById('journal-milestones'),'Stonepine Survey Cache recovered',!!progress.stonepineCacheClaimed,'milestone-stone-cache','Not completed');

    if (zoneFor(player.x,player.y).name===stoneZone.name) {
      const playerMarker=document.getElementById('map-player-marker');
      if(playerMarker){
        const tx=Math.max(0,Math.min(1,(player.x-2245)/1180));
        const ty=Math.max(0,Math.min(1,(-player.y-1120)/1040));
        playerMarker.setAttribute('transform',`translate(${(835+tx*110).toFixed(1)} ${(235-ty*90).toFixed(1)})`);
      }
    }
  }

  const build16UpdateUI = updateUI;
  updateUI = function build17UpdateUI() {
    build16UpdateUI();
    if (progress.fenCacheClaimed && !progress.activeBoardContract && !progress.stonepineCacheClaimed && ui.questTitle) ui.questTitle.textContent='Stonepine Reach';
    const near=nearestInteractable();
    if(near?.kind==='stonepineSign')ui.context.textContent='USE • Read Stonepine route marker';
    else if(near?.kind==='stonepineGate')ui.context.textContent=progress.stonepinePassOpened?'USE • Stonepine Pass open':stonepineReady()?'USE • Open Stonepine Pass':'Stonepine Pass • Fen route required';
    else if(near?.kind==='stonepineCamp')ui.context.textContent='USE • Pitchwork Kit (2 Resin + 55 c)';
    else if(near?.kind==='stonepineCache')ui.context.textContent=progress.stonepineCacheClaimed?'USE • Empty survey cache':progress.stonepineBossDefeated?'USE • Recover survey cache':'Survey Cache • Sealed';
    else if(near?.kind==='resource'&&near.obj.type==='resin')ui.context.textContent='USE • Recover Ironpine Resin';

    // Existing Cull contract explicitly accepts the new ordinary Stonepine threats.
    const cullCard=document.querySelector('[data-contract-id="briar_cull"] p');
    if(cullCard && !cullCard.textContent.includes('Stonepine')) cullCard.textContent='Clear three ordinary threats from the roads, Hollow, Grove, Fen or Stonepine Reach.';
    syncStonepineBook();
  };

  function drawStonepineGround() {
    const pts=[[2200,-1100],[3440,-1100],[3440,-2160],[2200,-2160]].map(([x,y])=>worldToScreen(x,y));
    ctx.save();ctx.fillStyle='rgba(82,84,67,.72)';ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();
    ctx.globalAlpha=.16;
    for(let i=0;i<11;i++){
      const x=2320+i*102,y=-1240-(i%4)*185;const p=worldToScreen(x,y);ctx.fillStyle=i%2?'#b59c68':'#8b866c';ctx.beginPath();ctx.ellipse(p.x,p.y,28*camera.zoom,12*camera.zoom,.2,0,TAU);ctx.fill();
    }
    ctx.restore();
  }

  const build16DrawGround = drawGround;
  drawGround = function build17DrawGround(zone) {
    build16DrawGround(zone);
    drawStonepineGround();
    for(const f of screeFields){
      const p=worldToScreen(f.x,f.y),z=camera.zoom;ctx.save();ctx.globalAlpha=.2;ctx.fillStyle='#8d8069';ctx.beginPath();ctx.ellipse(p.x,p.y,f.radius*z,f.radius*.5*z,0,0,TAU);ctx.fill();ctx.globalAlpha=.35;ctx.fillStyle='#5e5b50';for(let i=0;i<7;i++)circle(p.x+Math.cos(i*2.4)*f.radius*.55*z,p.y+Math.sin(i*2.4)*f.radius*.23*z,(4+i%3)*z,'#656256');ctx.restore();
    }
  };

  function stonePath(points,width,color){const screen=points.map(([x,y])=>worldToScreen(x,y));ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width*camera.zoom;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();screen.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.restore();}
  const build16DrawRoute = drawRoute;
  drawRoute = function build17DrawRoute() {
    build16DrawRoute();
    stonePath([[2140,-1430],[2290,-1490],[2470,-1450],[2660,-1390],[2840,-1510],[3020,-1640],[3200,-1840]],32,'rgba(164,143,101,.34)');
    stonePath([[2140,-1430],[2290,-1490],[2470,-1450],[2660,-1390],[2840,-1510],[3020,-1640],[3200,-1840]],3,'rgba(84,68,47,.38)');
  };

  function drawPine(o,p,z){const s=(o.s||1)*z;shadow(o.x,o.y,28*(o.s||1),13*(o.s||1),.24);ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#493a2b';ctx.fillRect(-4*s,-45*s,8*s,45*s);for(const [yy,w,c] of [[-43,22,'#354b38'],[-61,27,'#405840'],[-80,23,'#4c6648'],[-97,17,'#58714e']]){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(0,(yy-27)*s);ctx.lineTo(-w*s,yy*s);ctx.lineTo(w*s,yy*s);ctx.closePath();ctx.fill();}ctx.restore();}
  function drawQuarryRock(o,p,z){const s=(o.s||1)*z;shadow(o.x,o.y,28*(o.s||1),13*(o.s||1),.2);ctx.fillStyle='#6b6a61';ctx.beginPath();ctx.moveTo(p.x-28*s,p.y);ctx.lineTo(p.x-19*s,p.y-27*s);ctx.lineTo(p.x+2*s,p.y-39*s);ctx.lineTo(p.x+27*s,p.y-21*s);ctx.lineTo(p.x+31*s,p.y-2*s);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(223,207,170,.12)';ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(p.x-17*s,p.y-25*s);ctx.lineTo(p.x+5*s,p.y-16*s);ctx.lineTo(p.x+22*s,p.y-25*s);ctx.stroke();}
  function drawGate(o,p,z){shadow(o.x,o.y,38,15,.2);ctx.strokeStyle='#554332';ctx.lineWidth=7*z;ctx.beginPath();ctx.moveTo(p.x-30*z,p.y);ctx.lineTo(p.x-30*z,p.y-65*z);ctx.moveTo(p.x+30*z,p.y);ctx.lineTo(p.x+30*z,p.y-65*z);ctx.stroke();ctx.strokeStyle=progress.stonepinePassOpened?'#7f6b4d':'#69533a';ctx.lineWidth=9*z;for(const y of [-51,-30]){ctx.beginPath();ctx.moveTo(p.x-30*z,p.y+y*z);ctx.lineTo(p.x+30*z,p.y+y*z);ctx.stroke();}labelAt(p.x,p.y-80*z,'STONEPINE PASS');}
  function drawCamp(o,p,z){shadow(o.x,o.y,44,20,.22);ctx.fillStyle='#5b4734';ctx.fillRect(p.x-34*z,p.y-22*z,68*z,22*z);ctx.fillStyle='#7a6545';ctx.beginPath();ctx.moveTo(p.x-43*z,p.y-22*z);ctx.lineTo(p.x,p.y-58*z);ctx.lineTo(p.x+43*z,p.y-22*z);ctx.closePath();ctx.fill();ctx.fillStyle='#c58d4e';for(const x of [-18,0,18])circle(p.x+x*z,p.y-28*z,4*z,'#c58d4e');labelAt(p.x,p.y-70*z,'WARDEN PITCH CAMP');}
  function drawCache(o,p,z){shadow(o.x,o.y,24,11,.18);ctx.fillStyle=progress.stonepineCacheClaimed?'#4d493f':'#756044';ctx.fillRect(p.x-24*z,p.y-18*z,48*z,18*z);ctx.fillStyle=progress.stonepineCacheClaimed?'#3b3934':'#92734b';ctx.beginPath();ctx.arc(p.x,p.y-18*z,24*z,Math.PI,TAU);ctx.lineTo(p.x+24*z,p.y-18*z);ctx.closePath();ctx.fill();if(!progress.stonepineCacheClaimed)labelAt(p.x,p.y-49*z,'SURVEY CACHE');}
  function drawRuin(o,p,z){ctx.fillStyle='#68685f';if(o.piece===0)ctx.fillRect(p.x-8*z,p.y-46*z,16*z,46*z);else if(o.piece===1){ctx.fillRect(p.x-25*z,p.y-11*z,50*z,11*z);ctx.fillRect(p.x-18*z,p.y-35*z,12*z,25*z);}else{ctx.beginPath();ctx.moveTo(p.x-30*z,p.y);ctx.lineTo(p.x-17*z,p.y-36*z);ctx.lineTo(p.x+7*z,p.y-29*z);ctx.lineTo(p.x+28*z,p.y-4*z);ctx.closePath();ctx.fill();}}

  const build16DrawObject = drawObject;
  drawObject = function build17DrawObject(o) {
    if(!['stonepineTree','quarryRock','stonepineSign','stonepineGate','stonepineCamp','stonepineCache','stonepineRuin'].includes(o.type))return build16DrawObject(o);
    const p=worldToScreen(o.x,o.y),z=camera.zoom;if(p.x<-230||p.x>viewport.w+230||p.y<-230||p.y>viewport.h+220)return;
    if(o.type==='stonepineTree')drawPine(o,p,z);else if(o.type==='quarryRock')drawQuarryRock(o,p,z);else if(o.type==='stonepineGate')drawGate(o,p,z);else if(o.type==='stonepineCamp')drawCamp(o,p,z);else if(o.type==='stonepineCache')drawCache(o,p,z);else if(o.type==='stonepineRuin')drawRuin(o,p,z);else{ctx.strokeStyle='#5a4935';ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-48*z);ctx.stroke();ctx.fillStyle='#7d6340';ctx.fillRect(p.x-31*z,p.y-48*z,62*z,18*z);ctx.fillStyle='#dfcd9e';ctx.font=`800 ${Math.max(7,8*z)}px system-ui`;ctx.textAlign='center';ctx.fillText('STONEPINE',p.x,p.y-35*z);}
  };

  const build16DrawResource = drawResource;
  drawResource = function build17DrawResource(r) {
    if(r.type!=='resin')return build16DrawResource(r);const p=worldToScreen(r.x,r.y),z=camera.zoom;shadow(r.x,r.y,16,7,.1);ctx.strokeStyle='#54402e';ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-27*z);ctx.stroke();ctx.globalAlpha=.2;circle(p.x+4*z,p.y-19*z,12*z,'#e0a153');ctx.globalAlpha=1;circle(p.x+4*z,p.y-19*z,5*z,'#c8863d');circle(p.x+2*z,p.y-21*z,1.5*z,'#f0cf88');
  };

  function drawStoneTelegraph(e,p,z){const s=stoneState(e);if(s.mode!=='windup')return;const target=worldToScreen(s.targetX,s.targetY);const pulse=.45+Math.sin(performance.now()/85)*.12;ctx.save();ctx.strokeStyle=s.kind==='wisp-shot'?'rgba(181,204,160,.78)':s.kind==='sentinel-rockfall'?'rgba(210,165,95,.78)':'rgba(220,143,80,.75)';if(['ridge-charge','sentinel-charge'].includes(s.kind)){ctx.globalAlpha=.18+pulse*.2;ctx.lineWidth=(s.kind==='sentinel-charge'?32:24)*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x,p.y-15*z);ctx.lineTo(target.x,target.y-15*z);ctx.stroke();ctx.globalAlpha=.8;ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(p.x,p.y-15*z);ctx.lineTo(target.x,target.y-15*z);ctx.stroke();}else{ctx.globalAlpha=.55+pulse*.2;ctx.lineWidth=3*z;ctx.setLineDash([7*z,6*z]);ctx.beginPath();ctx.ellipse(target.x,target.y,78*z,39*z,0,0,TAU);ctx.stroke();ctx.setLineDash([]);}ctx.restore();}
  function drawHp(e,p,z,label){if(e.hp>=e.maxHp&&e.type!=='quarrysentinel')return;const w=(e.type==='quarrysentinel'?112:58)*camera.zoom,y=p.y-(e.type==='quarrysentinel'?98:62)*camera.zoom;ctx.fillStyle='rgba(0,0,0,.45)';roundRect(p.x-w/2,y,w,7*camera.zoom,4*camera.zoom);ctx.fill();ctx.fillStyle=e.type==='quarrysentinel'?'#9b714b':'#a27658';roundRect(p.x-w/2,y,w*(e.hp/e.maxHp),7*camera.zoom,4*camera.zoom);ctx.fill();if(label)labelAt(p.x,y-9*camera.zoom,label);}
  const build16DrawEnemy = drawEnemy;
  drawEnemy = function build17DrawEnemy(e) {
    if(!['ridgehorn','quarrywisp','quarrysentinel'].includes(e.type))return build16DrawEnemy(e);if(e.dead)return;const p=worldToScreen(e.x,e.y),z=camera.zoom*e.scale;drawStoneTelegraph(e,p,z);shadow(e.x,e.y,28*e.scale,14*e.scale,.28);ctx.save();ctx.translate(p.x,p.y);if(e.hurt>0)ctx.globalAlpha=.72;
    if(e.type==='ridgehorn'){ctx.fillStyle=e.hurt>0?'#e7caa8':e.color;ctx.beginPath();ctx.ellipse(0,-18*z,29*z,18*z,0,0,TAU);ctx.fill();const fx=e.facingX*10*z,fy=e.facingY*4*z;circle(fx+18*z,-27*z+fy,14*z,e.hurt>0?'#ecd2b2':e.color);ctx.fillStyle='#e3d0a8';ctx.beginPath();ctx.moveTo(fx+24*z,-38*z+fy);ctx.lineTo(fx+39*z,-50*z+fy);ctx.lineTo(fx+32*z,-31*z+fy);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(fx+11*z,-38*z+fy);ctx.lineTo(fx+3*z,-51*z+fy);ctx.lineTo(fx+19*z,-32*z+fy);ctx.closePath();ctx.fill();ctx.strokeStyle='#5d5547';ctx.lineWidth=6*z;for(const lx of[-13,11]){ctx.beginPath();ctx.moveTo(lx*z,-7*z);ctx.lineTo((lx-2)*z,6*z);ctx.stroke();}}
    else if(e.type==='quarrywisp'){const glow=17+Math.sin(performance.now()/130+e.x)*3;ctx.globalAlpha=.18;circle(0,-26*z,glow*z,'#b7c7a6');ctx.globalAlpha=e.hurt>0?.72:1;ctx.fillStyle=e.hurt>0?'#e9d5b5':'#7e8875';ctx.beginPath();ctx.moveTo(-13*z,-23*z);ctx.lineTo(-5*z,-42*z);ctx.lineTo(11*z,-39*z);ctx.lineTo(16*z,-21*z);ctx.lineTo(4*z,-10*z);ctx.closePath();ctx.fill();ctx.strokeStyle='#c2cfaa';ctx.lineWidth=2*z;ctx.beginPath();ctx.arc(1*z,-27*z,20*z,0,TAU);ctx.stroke();}
    else{ctx.fillStyle=e.hurt>0?'#e6ccb0':'#696a61';ctx.fillRect(-24*z,-49*z,48*z,43*z);ctx.fillStyle='#77786e';circle(-22*z,-44*z,16*z,'#77786e');circle(22*z,-44*z,16*z,'#77786e');ctx.fillStyle='#55574f';ctx.fillRect(-13*z,-67*z,26*z,22*z);ctx.fillStyle='#cfb77b';circle(e.facingX*5*z,-57*z+e.facingY*2*z,3*z,'#cfb77b');ctx.strokeStyle='#5e5f57';ctx.lineWidth=9*z;for(const lx of[-15,15]){ctx.beginPath();ctx.moveTo(lx*z,-8*z);ctx.lineTo(lx*z,7*z);ctx.stroke();}}
    ctx.restore();drawHp(e,p,z,e.type==='quarrysentinel'?'QUARRY SENTINEL':null);
  };

  const build16DrawProjectiles = drawProjectiles;
  drawProjectiles = function build17DrawProjectiles(){build16DrawProjectiles();for(const b of stone.bolts){const p=worldToScreen(b.x,b.y),z=camera.zoom;ctx.globalAlpha=.2;circle(p.x,p.y-18*z,12*z,'#bfd4ae');ctx.globalAlpha=1;circle(p.x,p.y-18*z,5*z,'#9eb58e');circle(p.x,p.y-18*z,2*z,'#e0edd5');}};

  const build16DrawParticles = drawParticles;
  drawParticles = function build17DrawParticles(){
    for(const f of screeFields){const a=f.active;if(!a)continue;const p=worldToScreen(a.x,a.y),z=camera.zoom;ctx.save();if(!a.triggered){const t=Math.max(0,a.timer/a.max);ctx.globalAlpha=.5+(1-t)*.3;ctx.strokeStyle='#d3a866';ctx.lineWidth=4*z;ctx.setLineDash([9*z,7*z]);ctx.beginPath();ctx.ellipse(p.x,p.y,88*z,44*z,0,0,TAU);ctx.stroke();ctx.setLineDash([]);}else{ctx.globalAlpha=.18*Math.max(0,a.life/.58);ctx.fillStyle='#8a765c';ctx.beginPath();ctx.ellipse(p.x,p.y,88*z,44*z,0,0,TAU);ctx.fill();}ctx.restore();}
    for(const h of stone.hazards){const p=worldToScreen(h.x,h.y),z=camera.zoom;ctx.save();if(!h.triggered){ctx.globalAlpha=.58;ctx.strokeStyle='#d3a866';ctx.lineWidth=4*z;ctx.setLineDash([9*z,7*z]);ctx.beginPath();ctx.ellipse(p.x,p.y,h.radius*z,h.radius*.5*z,0,0,TAU);ctx.stroke();ctx.setLineDash([]);}else{ctx.globalAlpha=.16*Math.max(0,h.life/h.maxLife);ctx.fillStyle='#8b7558';ctx.beginPath();ctx.ellipse(p.x,p.y,h.radius*z,h.radius*.5*z,0,0,TAU);ctx.fill();}ctx.restore();}
    build16DrawParticles();
  };

  function forceStoneTactic(type,kind=null){const e=enemies.find(x=>x.type===type&&!x.dead)||enemies.find(x=>x.type===type);if(!e)return false;e.dead=false;e.hp=Math.max(1,e.hp||e.maxHp);const s=stoneState(e);s.mode=null;s.cooldown=99;const chosen=kind||({ridgehorn:'ridge-charge',quarrywisp:'wisp-shot',quarrysentinel:'sentinel-rockfall'}[type]);if(!chosen)return false;const duration={ 'ridge-charge':.58,'wisp-shot':.68,'sentinel-rockfall':.76,'sentinel-charge':.52}[chosen]||.6;beginStoneWindup(e,chosen,duration);return true;}

  if(window.__BRIAR_GLENDebug){
    window.__BRIAR_GLENDebug.interact=()=>interact();
    window.__BRIAR_GLENDebug.getStonepineState=()=>({
      zone:zoneFor(player.x,player.y).name,passOpened:progress.stonepinePassOpened,discovered:progress.stonepineDiscovered,bossDefeated:progress.stonepineBossDefeated,cacheClaimed:progress.stonepineCacheClaimed,kits:progress.stonepineKits,
      resinNodes:resources.filter(r=>r.type==='resin').length,
      enemies:enemies.filter(e=>['ridgehorn','quarrywisp','quarrysentinel'].includes(e.type)).map(e=>({type:e.type,hp:e.hp,dead:e.dead,state:e.__stonepine?{mode:e.__stonepine.mode,kind:e.__stonepine.kind,timer:e.__stonepine.timer}:null})),
      scree:screeFields.map((f,i)=>({i,x:f.x,y:f.y,radius:f.radius,cooldown:f.cooldown,active:f.active?{...f.active}:null})),bolts:stone.bolts.length,hazards:stone.hazards.length,counters:{...stone.counters},coins:player.coins,inventory:{resin:player.inventory.resin||0,tonic:player.inventory.tonic||0,oil:player.inventory.oil||0,iron:player.inventory.iron||0},map:!!progress.mapDiscoveries.stonepine,
    });
    window.__BRIAR_GLENDebug.forceStonepineTactic=(type,kind)=>forceStoneTactic(type,kind);
    window.__BRIAR_GLENDebug.triggerStonepineScree=index=>{const f=screeFields[index]||screeFields[0];f.cooldown=0;return triggerScree(f,player.x,player.y);};
    window.__BRIAR_GLENDebug.defeatStonepineBoss=()=>{if(!quarrySentinel.dead)damageEnemy(quarrySentinel,quarrySentinel.hp+9999,{knock:0});return quarrySentinel.dead;};
    window.__BRIAR_GLENDebug.defeatStonepineThreat=type=>{const e=enemies.find(x=>x.type===type&&!x.dead);if(!e)return false;damageEnemy(e,e.hp+9999,{knock:0});return e.dead;};
    window.__BRIAR_GLENDebug.craftPitchworkKit=()=>craftPitchworkKit(worldObjects.find(o=>o.type==='stonepineCamp'));
  }

  updateUI();
})();