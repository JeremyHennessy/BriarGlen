(() => {
  'use strict';

  // Build 11: Mosswater Fen expansion.
  // Additive layer: Builds 2â€“10 remain intact underneath.
  const FEN_ZONE = { name: 'MOSSWATER FEN', tint: '#334b42' };
  const FEN_MIN_Y = 690;
  const FEN_MIN_X = 690;
  const FEN_MAX_X = 1540;
  const MASTERWORK_RESIST = 0.4;
  const fenProjectiles = [];
  const mirePools = [];
  const fenEnemies = [];
  let mireTimer = 0;
  let lastHazardAt = 0;

  if (typeof progress.fenCrossingUnlocked !== 'boolean') progress.fenCrossingUnlocked = false;
  if (typeof progress.fenDiscovered !== 'boolean') progress.fenDiscovered = false;
  if (typeof progress.fenWardenDefeated !== 'boolean') progress.fenWardenDefeated = false;
  if (typeof progress.fenwardSigilOwned !== 'boolean') progress.fenwardSigilOwned = false;
  if (!Number.isFinite(player.inventory.bogAmber)) player.inventory.bogAmber = 0;
  progress.mapDiscoveries = progress.mapDiscoveries || {};
  if (typeof progress.mapDiscoveries.fen !== 'boolean') progress.mapDiscoveries.fen = !!progress.fenDiscovered;

  WORLD.maxY = 1280;

  const fenGate = addObject('fenGate', 1080, 585, { label: 'Old Warden Crossing' });
  const fenShrine = addObject('fenShrine', 1115, 1150, { label: 'Mosswater Warden Stone' });

  [
    [835, 760], [920, 905], [1320, 840], [1420, 1060], [780, 1115],
    [1210, 1015], [1470, 745], [1020, 1240]
  ].forEach(([x, y]) => addObject('fenReed', x, y, { s: .8 + Math.random() * .45 }));
  [
    [845, 850, 78], [1240, 760, 68], [1385, 980, 86], [930, 1090, 72]
  ].forEach(([x, y, r]) => addObject('fenWater', x, y, { r }));

  const bogAmberNodes = [
    addResource('bogAmber', 820, 910),
    addResource('bogAmber', 1280, 885),
    addResource('bogAmber', 1435, 1110),
  ];

  function addFenEnemy(type, x, y, opts = {}) {
    const e = addEnemy(type, x, y, opts);
    fenEnemies.push(e);
    return e;
  }

  addFenEnemy('mireling', 855, 785, {
    name: 'Mireling', hp: 78, maxHp: 78, speed: 112, damage: 10,
    aggro: 330, attackRange: 48, scale: .95, radius: 25, color: '#526653',
    homeX: 855, homeY: 785,
  });
  addFenEnemy('mireling', 1325, 1035, {
    name: 'Mireling', hp: 78, maxHp: 78, speed: 112, damage: 10,
    aggro: 330, attackRange: 48, scale: .95, radius: 25, color: '#526653',
    homeX: 1325, homeY: 1035,
  });
  addFenEnemy('spitter', 1060, 835, {
    name: 'Reed Spitter', hp: 64, maxHp: 64, speed: 82, damage: 11,
    aggro: 440, attackRange: 290, scale: .9, radius: 24, color: '#64755b',
    homeX: 1060, homeY: 835, spitCd: 1.0, spitWindup: 0,
  });
  addFenEnemy('spitter', 1440, 820, {
    name: 'Reed Spitter', hp: 64, maxHp: 64, speed: 82, damage: 11,
    aggro: 440, attackRange: 290, scale: .9, radius: 24, color: '#64755b',
    homeX: 1440, homeY: 820, spitCd: 1.4, spitWindup: 0,
  });

  const fenWarden = addFenEnemy('fenwarden', 1115, 1060, {
    name: 'Fen Warden', hp: 280, maxHp: 280, speed: 92, damage: 18,
    aggro: 610, attackRange: 72, scale: 1.48, radius: 40, color: '#405a49',
    homeX: 1115, homeY: 1060, specialCd: 1.6, fenWindup: 0, fenRushTimer: 0,
  });
  if (progress.fenWardenDefeated) {
    fenWarden.dead = true;
    fenWarden.hp = 0;
    fenWarden.respawn = 99999;
  }

  function anyMasterwork() {
    return !!(progress.temperedSword || progress.briarstringBow || progress.moonrootStaff);
  }

  function selectedMasterwork() {
    if (player.weaponType === 'sword') return !!progress.temperedSword;
    if (player.weaponType === 'bow') return !!progress.briarstringBow;
    if (player.weaponType === 'staff') return !!progress.moonrootStaff;
    return false;
  }

  function inFen(p = player) {
    return p.y >= FEN_MIN_Y && p.x >= FEN_MIN_X && p.x <= FEN_MAX_X;
  }

  function bookOrModalOpen() {
    return Boolean(
      (document.getElementById('warden-overlay') && !document.getElementById('warden-overlay').hidden) ||
      (ui.inventoryPanel && !ui.inventoryPanel.hidden) ||
      (ui.tradePanel && !ui.tradePanel.hidden) ||
      (ui.craftPanel && !ui.craftPanel.hidden)
    );
  }

  function mireMoveFactor() {
    const boots = !!(progress.wardenBootsOwned && progress.wardenBootsEquipped);
    if (mireTimer > 0) return boots ? .88 : .62;
    if (inFen()) return boots ? .94 : .72;
    return 1;
  }

  const build10CollideMove = collideMove;
  collideMove = function build11CollideMove(entity, dx, dy) {
    if (entity === player) {
      if (!progress.fenCrossingUnlocked && entity.y < FEN_MIN_Y && entity.y + dy >= FEN_MIN_Y) {
        dy = Math.min(dy, FEN_MIN_Y - 3 - entity.y);
      }
      if (progress.fenCrossingUnlocked && entity.y + dy >= FEN_MIN_Y) {
        const targetX = clamp(entity.x + dx, FEN_MIN_X + 8, FEN_MAX_X - 8);
        dx = targetX - entity.x;
      }
      const factor = mireMoveFactor();
      dx *= factor;
      dy *= factor;
    }
    return build10CollideMove(entity, dx, dy);
  };

  const build10ZoneFor = zoneFor;
  zoneFor = function build11ZoneFor(x, y = player.y) {
    if (y >= FEN_MIN_Y && x >= FEN_MIN_X && x <= FEN_MAX_X) return FEN_ZONE;
    return build10ZoneFor(x, y);
  };

  function launchFenSpit(source, targetX = player.x, targetY = player.y, damage = 12) {
    const dx = targetX - source.x;
    const dy = targetY - source.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = source.type === 'fenwarden' ? 300 : 245;
    fenProjectiles.push({
      x: source.x, y: source.y, vx: dx / d * speed, vy: dy / d * speed,
      life: Math.max(.24, d / speed), radius: source.type === 'fenwarden' ? 12 : 9,
      damage, sourceType: source.type, dead: false,
    });
  }

  function addMirePool(x, y, radius = 58, life = 4.2) {
    mirePools.push({ x, y, radius, life, maxLife: life, tick: .12 });
  }

  function updateFenProjectiles(dt) {
    for (const p of fenProjectiles) {
      if (p.dead) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (Math.hypot(player.x - p.x, player.y - p.y) <= player.radius + p.radius) {
        p.dead = true;
        const hpBefore = player.hp;
        damagePlayer(p.damage, { x: p.x, y: p.y, type: 'fenSpit', fenHazard: true });
        if (player.hp < hpBefore) mireTimer = Math.max(mireTimer, 1.7);
        addMirePool(p.x, p.y, p.sourceType === 'fenwarden' ? 76 : 55, p.sourceType === 'fenwarden' ? 5.2 : 4.0);
        continue;
      }
      if (p.life <= 0) {
        p.dead = true;
        addMirePool(p.x, p.y, p.sourceType === 'fenwarden' ? 76 : 55, p.sourceType === 'fenwarden' ? 5.2 : 4.0);
      }
    }
    for (let i = fenProjectiles.length - 1; i >= 0; i--) if (fenProjectiles[i].dead) fenProjectiles.splice(i, 1);

    for (const pool of mirePools) {
      pool.life -= dt;
      pool.tick -= dt;
      if (Math.hypot(player.x - pool.x, player.y - pool.y) <= pool.radius + player.radius * .35) {
        mireTimer = Math.max(mireTimer, progress.wardenBootsEquipped ? .35 : .9);
        if (pool.tick <= 0) {
          pool.tick = 1.05;
          damagePlayer(6, { x: pool.x, y: pool.y, type: 'mirePool', fenHazard: true });
        }
      }
    }
    for (let i = mirePools.length - 1; i >= 0; i--) if (mirePools[i].life <= 0) mirePools.splice(i, 1);
  }

  function updateSpitter(e, dt) {
    if (e.dead) return build10UpdateEnemy(e, dt);
    e.attackCd = Math.max(0, e.attackCd - dt);
    e.spitCd = Math.max(0, (e.spitCd || 0) - dt);
    e.hurt = Math.max(0, e.hurt - dt);
    if (e.spitWindup > 0) {
      e.spitWindup -= dt;
      if (e.spitWindup <= 0) {
        launchFenSpit(e, e.spitTargetX, e.spitTargetY, 12);
      }
      return;
    }

    const d = dist(e, player);
    if (d < e.aggro && e.spitCd <= 0) {
      e.spitWindup = .58;
      e.spitTargetX = player.x;
      e.spitTargetY = player.y;
      e.spitCd = 2.35;
      return;
    }

    let tx = e.homeX, ty = e.homeY;
    if (d < e.aggro) {
      if (d < 155) {
        tx = e.x - (player.x - e.x);
        ty = e.y - (player.y - e.y);
      } else if (d > 315) {
        tx = player.x; ty = player.y;
      } else {
        const side = Math.sin(performance.now() / 700 + e.homeX) > 0 ? 1 : -1;
        const n = norm(player.x - e.x, player.y - e.y);
        tx = e.x - n.y * side * 90;
        ty = e.y + n.x * side * 90;
      }
    }

    const td = Math.hypot(tx - e.x, ty - e.y);
    if (td > 8) {
      const n = norm(tx - e.x, ty - e.y);
      e.facingX = n.x; e.facingY = n.y;
      const slow = e.hurt > 0 ? .35 : 1;
      collideMove(e, n.x * e.speed * slow * dt, n.y * e.speed * slow * dt);
    }
  }

  function beginFenWardenAction(e, action) {
    e.fenAction = action;
    e.fenWindup = action === 'rush' ? .62 : .82;
    e.fenWindupMax = e.fenWindup;
    e.fenTargetX = player.x;
    e.fenTargetY = player.y;
  }

  function resolveFenWardenAction(e) {
    if (e.fenAction === 'rush') {
      const n = norm(e.fenTargetX - e.x, e.fenTargetY - e.y);
      e.fenRushX = n.x; e.fenRushY = n.y;
      e.fenRushTimer = .55;
      e.fenRushHit = false;
    } else {
      const offsets = [[0,0],[92,0,],[-92,0],[0,92],[0,-92]];
      for (const [ox, oy] of offsets) launchFenSpit(e, e.fenTargetX + ox, e.fenTargetY + oy, 14);
      spawnParticles(e.x, e.y, '#7ea77f', 22, 1.05);
    }
    e.fenAction = null;
  }

  function updateFenWarden(e, dt) {
    if (e.dead) return;
    e.attackCd = Math.max(0, e.attackCd - dt);
    e.specialCd = Math.max(0, e.specialCMÄ