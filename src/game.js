(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const ui = {
    zone: document.getElementById('zone-name'),
    healthFill: document.getElementById('health-fill'),
    healthLabel: document.getElementById('health-label'),
    weapon: document.getElementById('weapon-label'),
    coins: document.getElementById('coins-label'),
    questText: document.getElementById('quest-text'),
    questProgress: document.getElementById('quest-progress'),
    herb: document.getElementById('herb-count'),
    ore: document.getElementById('ore-count'),
    tusk: document.getElementById('tusk-count'),
    context: document.getElementById('context-prompt'),
    toasts: document.getElementById('toast-stack'),
    movePad: document.getElementById('move-pad'),
    moveStick: document.getElementById('move-stick'),
    attack: document.getElementById('attack-btn'),
    dash: document.getElementById('dash-btn'),
    interact: document.getElementById('interact-btn'),
    reset: document.getElementById('reset-btn'),
  };

  const TAU = Math.PI * 2;
  const SAVE_KEY = 'briar-glen-vslice-v1';
  const WORLD = { minX: -1000, maxX: 2160, minY: -650, maxY: 650 };
  const viewport = { w: innerWidth, h: innerHeight, dpr: 1 };
  const camera = { x: -650, y: 0, zoom: 1, shake: 0 };
  const keys = new Set();
  const touchMove = { x: 0, y: 0, pointerId: null };

  const player = {
    x: -720, y: 30, vx: 0, vy: 0, radius: 23,
    hp: 100, maxHp: 100, speed: 245,
    facingX: 1, facingY: 0,
    attackCd: 0, attackAnim: 0, dashCd: 0, dashTimer: 0,
    invuln: 0, damage: 24, weapon: 'Worn Sword', coins: 100,
    inventory: { herb: 0, ore: 0, tusk: 0 },
    reinforced: false,
  };

  const progress = {
    step: 0,
    bossDefeated: false,
    shortcutUnlocked: false,
    contractComplete: false,
    tipShown: false,
  };

  const particles = [];
  const floaters = [];
  const slashes = [];
  const worldObjects = [];
  const resources = [];
  const enemies = [];

  const zones = [
    { name: 'BRIAR GLEN', min: -1000, max: -210, tint: '#49633d' },
    { name: 'MEADOW ROAD', min: -210, max: 660, tint: '#536d3d' },
    { name: 'COPPER HOLLOW', min: 660, max: 1430, tint: '#4d5540' },
    { name: 'EMBERBACK DEN', min: 1430, max: 2160, tint: '#493c31' },
  ];

  const blockers = [
    { x: -765, y: -285, r: 86 },
    { x: -475, y: 280, r: 74 },
    { x: -395, y: -265, r: 68 },
    { x: 70, y: -360, r: 55 }, { x: 200, y: 330, r: 54 },
    { x: 420, y: -350, r: 61 }, { x: 550, y: 330, r: 51 },
    { x: 820, y: -320, r: 68 }, { x: 965, y: 340, r: 68 },
    { x: 1170, y: -340, r: 85 }, { x: 1305, y: 335, r: 78 },
    { x: 1575, y: -330, r: 67 }, { x: 1650, y: 320, r: 67 },
    { x: 1865, y: -340, r: 72 }, { x: 1975, y: 330, r: 72 },
  ];

  function addObject(type, x, y, extra = {}) {
    const o = { type, x, y, ...extra };
    worldObjects.push(o);
    return o;
  }

  function addResource(type, x, y) {
    const r = { type, x, y, radius: 28, active: true, cooldown: 0 };
    resources.push(r);
    return r;
  }

  function addEnemy(type, x, y, opts = {}) {
    const defaults = type === 'boss'
      ? { name: 'Emberback', hp: 260, speed: 80, damage: 17, aggro: 410, attackRange: 66, scale: 1.75, color: '#8e4934' }
      : type === 'boar'
        ? { name: 'Hollow Boar', hp: 70, speed: 100, damage: 11, aggro: 300, attackRange: 52, scale: 1.05, color: '#725241' }
        : { name: 'Briar Wolf', hp: 52, speed: 118, damage: 9, aggro: 280, attackRange: 47, scale: .9, color: '#596056' };
    const e = {
      type, x, y, homeX: x, homeY: y, radius: type === 'boss' ? 42 : 25,
      hp: defaults.hp, maxHp: defaults.hp, speed: defaults.speed,
      damage: defaults.damage, aggro: defaults.aggro, attackRange: defaults.attackRange,
      scale: defaults.scale, color: defaults.color, name: defaults.name,
      attackCd: Math.random() * .6, hurt: 0, dead: false, respawn: 0,
      facingX: -1, facingY: 0, ...opts,
    };
    enemies.push(e);
    return e;
  }

  addObject('forge', -470, 255, { label: 'Alden the Smith' });
  addObject('board', -615, -118, { label: 'Contract Board' });
  addObject('well', -800, 150);
  addObject('banner', -260, 20);
  addObject('shortcut', -845, -205, { destination: 'den', active: false, label: 'Old Rootway' });
  addObject('shortcut', 2070, 115, { destination: 'town', active: false, label: 'Rootway Home' });

  [[-55,-170],[110,140],[275,-110],[455,135],[575,-105]].forEach(([x,y]) => addResource('herb', x, y));
  [[775,150],[900,-140],[1040,90],[1185,120],[1340,-105]].forEach(([x,y]) => addResource('ore', x, y));

  addEnemy('wolf', 210, -230);
  addEnemy('wolf', 450, 230);
  addEnemy('boar', 950, 235);
  addEnemy('boar', 1240, -205);
  addEnemy('boss', 1900, 0);

  const rand = mulberry32(4319);
  for (let i = 0; i < 70; i++) {
    const x = -930 + rand() * 1530;
    const y = -560 + rand() * 1120;
    if (Math.abs(y) < 105 && x > -250) continue;
    addObject(rand() > .28 ? 'tree' : 'bush', x, y, { s: .7 + rand() * .7 });
  }
  for (let i = 0; i < 36; i++) {
    const x = 690 + rand() * 720;
    const y = -550 + rand() * 1100;
    if (Math.abs(y) < 100) continue;
    addObject(rand() > .4 ? 'rock' : 'deadTree', x, y, { s: .7 + rand() * .65 });
  }
  for (let i = 0; i < 24; i++) {
    const x = 1450 + rand() * 650;
    const y = -525 + rand() * 1050;
    if (Math.abs(y) < 125) continue;
    addObject(rand() > .35 ? 'denRock' : 'ember', x, y, { s: .7 + rand() * .7 });
  }

  function mulberry32(a) {
    return function randFn() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function resize() {
    viewport.w = innerWidth;
    viewport.h = innerHeight;
    viewport.dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.w * viewport.dpr);
    canvas.height = Math.floor(viewport.h * viewport.dpr);
    canvas.style.width = `${viewport.w}px`;
    canvas.style.height = `${viewport.h}px`;
    ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
    camera.zoom = viewport.w < 700 ? Math.max(.78, Math.min(1, viewport.w / 760)) : Math.min(1.12, viewport.w / 1450 + .28);
  }

  addEventListener('resize', resize, { passive: true });
  resize();

  function worldToScreen(x, y) {
    const isoX = (x - y) * .78;
    const isoY = (x + y) * .39;
    const camIsoX = (camera.x - camera.y) * .78;
    const camIsoY = (camera.x + camera.y) * .39;
    const shakeX = camera.shake ? (Math.random() - .5) * camera.shake : 0;
    const shakeY = camera.shake ? (Math.random() - .5) * camera.shake : 0;
    return {
      x: viewport.w / 2 + (isoX - camIsoX) * camera.zoom + shakeX,
      y: viewport.h / 2 + (isoY - camIsoY) * camera.zoom + shakeY,
    };
  }

  function zoneFor(x) {
    return zones.find(z => x >= z.min && x < z.max) || zones[zones.length - 1];
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function norm(x, y) {
    const d = Math.hypot(x, y) || 1;
    return { x: x / d, y: y / d };
  }

  function collideMove(entity, dx, dy) {
    let nx = clamp(entity.x + dx, WORLD.minX, WORLD.maxX);
    let ny = clamp(entity.y + dy, WORLD.minY, WORLD.maxY);
    for (const b of blockers) {
      const vx = nx - b.x, vy = ny - b.y;
      const minD = b.r + entity.radius;
      const d = Math.hypot(vx, vy);
      if (d < minD) {
        const n = norm(vx, vy);
        nx = b.x + n.x * minD;
        ny = b.y + n.y * minD;
      }
    }
    entity.x = nx;
    entity.y = ny;
  }

  function spawnParticles(x, y, color, count = 8, force = 1) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const speed = (35 + Math.random() * 100) * force;
      particles.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        z: 5 + Math.random() * 18, vz: 45 + Math.random() * 80,
        life: .45 + Math.random() * .5, maxLife: 1, color,
      });
    }
  }

  function addFloater(x, y, text, color = '#f4e7c8') {
    floaters.push({ x, y, text, color, life: 1, maxLife: 1 });
  }

  function toast(text) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    ui.toasts.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  function vibrate(ms = 20) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  function attack() {
    if (player.attackCd > 0 || player.dashTimer > 0) return;
    player.attackCd = player.reinforced ? .34 : .42;
    player.attackAnim = .24;
    const reach = player.reinforced ? 105 : 92;
    slashes.push({ x: player.x, y: player.y, facingX: player.facingX, facingY: player.facingY, life: .22, maxLife: .22, reach });
    let connected = false;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = dist(player, e);
      if (d > reach + e.radius) continue;
      const to = norm(e.x - player.x, e.y - player.y);
      const dot = to.x * player.facingX + to.y * player.facingY;
      if (dot < -.15) continue;
      e.hp -= player.damage;
      e.hurt = .16;
      connected = true;
      addFloater(e.x, e.y - 15, `-${player.damage}`, '#ffd49b');
      spawnParticles(e.x, e.y, '#d6b178', 7, .8);
      const knock = norm(e.x - player.x, e.y - player.y);
      e.x += knock.x * 18;
      e.y += knock.y * 18;
      if (e.hp <= 0) killEnemy(e);
    }
    if (connected) {
      camera.shake = 5;
      vibrate(18);
    }
  }

  function dash() {
    if (player.dashCd > 0 || player.dashTimer > 0) return;
    player.dashCd = 1.15;
    player.dashTimer = .17;
    player.invuln = .27;
    spawnParticles(player.x, player.y, '#d7d0b8', 9, .7);
    vibrate(12);
  }

  function killEnemy(e) {
    e.dead = true;
    e.respawn = e.type === 'boss' ? 99999 : 13 + Math.random() * 5;
    e.hp = 0;
    spawnParticles(e.x, e.y, e.type === 'boss' ? '#e1794e' : '#a69576', e.type === 'boss' ? 28 : 14, e.type === 'boss' ? 1.5 : 1);
    if (e.type === 'boss') {
      progress.bossDefeated = true;
      progress.shortcutUnlocked = true;
      player.inventory.tusk += 1;
      player.coins += 75;
      progress.step = Math.max(progress.step, 4);
      worldObjects.filter(o => o.type === 'shortcut').forEach(o => o.active = true);
      toast('Emberback defeated — Rootway shortcut unlocked');
      addFloater(e.x, e.y - 35, 'EMBER TUSK +1', '#f4d49a');
      camera.shake = 14;
      saveGame();
    } else {
      player.coins += e.type === 'boar' ? 8 : 6;
    }
  }

  function damagePlayer(amount, source) {
    if (player.invuln > 0) return;
    player.hp = Math.max(0, player.hp - amount);
    player.invuln = .55;
    camera.shake = 8;
    addFloater(player.x, player.y - 20, `-${amount}`, '#ff9780');
    spawnParticles(player.x, player.y, '#b65643', 8, .8);
    vibrate(35);
    if (source) {
      const n = norm(player.x - source.x, player.y - source.y);
      collideMove(player, n.x * 35, n.y * 35);
    }
    if (player.hp <= 0) {
      toast('You were carried back to Briar Glen');
      player.x = -720; player.y = 30; player.hp = player.maxHp; player.invuln = 1.4;
    }
  }

  function nearestInteractable() {
    const candidates = [];
    for (const r of resources) if (r.active) candidates.push({ kind: 'resource', obj: r, d: dist(player, r) });
    for (const o of worldObjects) {
      if (['forge','board','shortcut'].includes(o.type)) candidates.push({ kind: o.type, obj: o, d: dist(player, o) });
    }
    candidates.sort((a, b) => a.d - b.d);
    const c = candidates[0];
    if (!c) return null;
    const range = c.kind === 'shortcut' ? 105 : 90;
    return c.d <= range ? c : null;
  }

  function interact() {
    const near = nearestInteractable();
    if (!near) {
      toast('Nothing close enough to use');
      return;
    }
    const { kind, obj } = near;
    if (kind === 'resource') {
      if (obj.type === 'herb') {
        obj.active = false; obj.cooldown = 18;
        player.inventory.herb += 1;
        spawnParticles(obj.x, obj.y, '#7fbd62', 12, .7);
        addFloater(obj.x, obj.y - 10, 'BRIARLEAF +1', '#b8e891');
        if (player.inventory.herb >= 3 && progress.step === 0) {
          progress.step = 1;
          toast('Enough Briarleaf — continue to Copper Hollow');
        }
      } else {
        obj.active = false; obj.cooldown = 22;
        player.inventory.ore += 1;
        spawnParticles(obj.x, obj.y, '#ba704d', 12, .75);
        addFloater(obj.x, obj.y - 10, 'COPPER +1', '#e7a17b');
        if (player.inventory.ore >= 3 && progress.step <= 1) {
          progress.step = 2;
          toast('Copper secured — return to Alden the Smith');
        }
      }
      saveGame();
      return;
    }
    if (kind === 'forge') {
      craftSword();
      return;
    }
    if (kind === 'board') {
      if (progress.bossDefeated && player.inventory.tusk > 0 && !progress.contractComplete) {
        progress.contractComplete = true;
        progress.step = 5;
        player.coins += 150;
        toast('Contract complete — Smoke in the Hollow');
        addFloater(obj.x, obj.y - 20, '+150 COINS', '#f4d49a');
        saveGame();
      } else if (progress.contractComplete) {
        toast('Smoke in the Hollow — COMPLETE');
      } else {
        toast(objectiveText());
      }
      return;
    }
    if (kind === 'shortcut') {
      if (!progress.shortcutUnlocked || !obj.active) {
        toast('The Old Rootway is sealed');
        return;
      }
      if (obj.destination === 'town') {
        player.x = -860; player.y = -160;
        progress.step = Math.max(progress.step, 4);
        toast('Rootway → Briar Glen');
      } else {
        player.x = 2035; player.y = 90;
        toast('Rootway → Emberback Den');
      }
      camera.x = player.x; camera.y = player.y;
      saveGame();
    }
  }

  function craftSword() {
    if (player.reinforced) {
      toast('Your Reinforced Sword is already equipped');
      return;
    }
    if (player.inventory.ore < 3) {
      toast(`Alden needs 3 Copper (${player.inventory.ore}/3)`);
      return;
    }
    if (progress.step < 2) {
      toast('Gather Briarleaf and Copper before forging');
      return;
    }
    player.inventory.ore -= 3;
    player.reinforced = true;
    player.weapon = 'Reinforced Sword';
    player.damage = 38;
    progress.step = 3;
    spawnParticles(-470, 255, '#f0b15e', 22, 1.1);
    toast('Reinforced Sword forged — Emberback waits in the east');
    saveGame();
  }

  function objectiveText() {
    if (progress.contractComplete) return 'Contract complete. Briar Glen is safe for now.';
    if (progress.step === 0) return 'Gather 3 Briarleaf along Meadow Road.';
    if (progress.step === 1) return 'Mine 3 Copper in Copper Hollow.';
    if (progress.step === 2) return 'Return to Alden the Smith and forge a Reinforced Sword.';
    if (progress.step === 3) return 'Enter Emberback Den and defeat Emberback.';
    if (progress.step === 4) return 'Use the Rootway shortcut home, then report to the Contract Board.';
    return 'Return to the Contract Board in Briar Glen.';
  }

  function objectiveProgress() {
    if (progress.step === 0) return `${Math.min(player.inventory.herb, 3)} / 3 BRIARLEAF`;
    if (progress.step === 1) return `${Math.min(player.inventory.ore, 3)} / 3 COPPER`;
    if (progress.step === 2) return `${player.inventory.ore} COPPER • ALDEN IN BRIAR GLEN`;
    if (progress.step === 3) return player.reinforced ? 'REINFORCED SWORD EQUIPPED' : 'FORGE THE SWORD FIRST';
    if (progress.step === 4) return 'ROOTWAY UNLOCKED';
    if (progress.contractComplete) return 'COMPLETE • 150 COINS AWARDED';
    return 'REPORT TO CONTRACT BOARD';
  }

  function update(dt) {
    player.attackCd = Math.max(0, player.attackCd - dt);
    player.attackAnim = Math.max(0, player.attackAnim - dt);
    player.dashCd = Math.max(0, player.dashCd - dt);
    player.dashTimer = Math.max(0, player.dashTimer - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    camera.shake = Math.max(0, camera.shake - dt * 34);

    let mx = 0, my = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
    mx += touchMove.x; my += touchMove.y;
    if (mx || my) {
      const n = norm(mx, my);
      mx = n.x; my = n.y;
      player.facingX = mx; player.facingY = my;
    }
    const moveSpeed = player.speed * (player.dashTimer > 0 ? 2.65 : 1);
    collideMove(player, mx * moveSpeed * dt, my * moveSpeed * dt);

    for (const r of resources) {
      if (!r.active) {
        r.cooldown -= dt;
        if (r.cooldown <= 0) r.active = true;
      }
    }

    for (const e of enemies) updateEnemy(e, dt);

    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.z += p.vz * dt; p.vz -= 180 * dt;
      p.vx *= Math.pow(.2, dt); p.vy *= Math.pow(.2, dt);
      p.life -= dt;
    }
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
    for (const f of floaters) f.life -= dt;
    for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].life <= 0) floaters.splice(i, 1);
    for (const s of slashes) s.life -= dt;
    for (let i = slashes.length - 1; i >= 0; i--) if (slashes[i].life <= 0) slashes.splice(i, 1);

    const follow = 1 - Math.pow(.001, dt);
    camera.x += (player.x - camera.x) * follow;
    camera.y += (player.y - camera.y) * follow;

    updateUI();
  }

  function updateEnemy(e, dt) {
    e.attackCd = Math.max(0, e.attackCd - dt);
    e.hurt = Math.max(0, e.hurt - dt);
    if (e.dead) {
      e.respawn -= dt;
      if (e.respawn <= 0 && e.type !== 'boss') {
        e.dead = false; e.hp = e.maxHp; e.x = e.homeX; e.y = e.homeY;
      }
      return;
    }
    const d = dist(e, player);
    let tx = e.homeX, ty = e.homeY;
    if (d < e.aggro) { tx = player.x; ty = player.y; }
    const td = Math.hypot(tx - e.x, ty - e.y);
    if (d < e.attackRange + player.radius && e.attackCd <= 0) {
      e.attackCd = e.type === 'boss' ? .92 : 1.15;
      damagePlayer(e.damage, e);
      if (e.type === 'boss') {
        spawnParticles(e.x, e.y, '#d56743', 10, 1.1);
      }
      return;
    }
    if (td > 12 && d > e.attackRange * .9) {
      const n = norm(tx - e.x, ty - e.y);
      e.facingX = n.x; e.facingY = n.y;
      const slow = e.hurt > 0 ? .25 : 1;
      collideMove(e, n.x * e.speed * slow * dt, n.y * e.speed * slow * dt);
    }
  }

  function updateUI() {
    const zone = zoneFor(player.x);
    ui.zone.textContent = zone.name;
    ui.healthFill.style.width = `${player.hp / player.maxHp * 100}%`;
    ui.healthLabel.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    ui.weapon.textContent = player.weapon;
    ui.coins.textContent = `${player.coins} c`;
    ui.questText.textContent = objectiveText();
    ui.questProgress.textContent = objectiveProgress();
    ui.herb.textContent = player.inventory.herb;
    ui.ore.textContent = player.inventory.ore;
    ui.tusk.textContent = player.inventory.tusk;

    const near = nearestInteractable();
    if (near) {
      ui.context.hidden = false;
      if (near.kind === 'resource') ui.context.textContent = near.obj.type === 'herb' ? 'USE • Gather Briarleaf' : 'USE • Mine Copper';
      else if (near.kind === 'forge') ui.context.textContent = player.reinforced ? 'USE • Talk to Alden' : 'USE / C • Forge Reinforced Sword';
      else if (near.kind === 'board') ui.context.textContent = progress.bossDefeated ? 'USE • Turn in contract' : 'USE • Read contract';
      else ui.context.textContent = near.obj.active ? `USE • ${near.obj.label}` : 'Old Rootway • Sealed';
    } else {
      ui.context.hidden = true;
    }
  }

  function draw() {
    ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
    const zone = zoneFor(player.x);
    ctx.fillStyle = '#111a14';
    ctx.fillRect(0, 0, viewport.w, viewport.h);

    drawGround(zone);
    drawRoute();

    const renderables = [];
    for (const o of worldObjects) renderables.push({ depth: o.x + o.y, kind: 'object', obj: o });
    for (const r of resources) if (r.active) renderables.push({ depth: r.x + r.y, kind: 'resource', obj: r });
    for (const e of enemies) if (!e.dead) renderables.push({ depth: e.x + e.y, kind: 'enemy', obj: e });
    renderables.push({ depth: player.x + player.y, kind: 'player', obj: player });
    renderables.sort((a, b) => a.depth - b.depth);

    for (const r of renderables) {
      if (r.kind === 'object') drawObject(r.obj);
      else if (r.kind === 'resource') drawResource(r.obj);
      else if (r.kind === 'enemy') drawEnemy(r.obj);
      else drawPlayer();
    }

    drawSlashes();
    drawParticles();
    drawFloaters();
    drawVignette();
  }

  function drawGround(zone) {
    const bg = zone.tint;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, viewport.w, viewport.h);

    for (const z of zones) {
      const c1 = worldToScreen(z.min, -650);
      const c2 = worldToScreen(z.max, -650);
      const c3 = worldToScreen(z.max, 650);
      const c4 = worldToScreen(z.min, 650);
      ctx.beginPath(); ctx.moveTo(c1.x,c1.y); ctx.lineTo(c2.x,c2.y); ctx.lineTo(c3.x,c3.y); ctx.lineTo(c4.x,c4.y); ctx.closePath();
      ctx.fillStyle = z.tint;
      ctx.fill();
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(240,225,188,.055)';
    for (let x = -1000; x <= 2200; x += 120) {
      const a = worldToScreen(x, -650), b = worldToScreen(x, 650);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }
    for (let y = -650; y <= 650; y += 120) {
      const a = worldToScreen(-1000, y), b = worldToScreen(2200, y);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }

    if (player.x > 1370) {
      const g = ctx.createRadialGradient(viewport.w/2, viewport.h/2, 80, viewport.w/2, viewport.h/2, Math.max(viewport.w,viewport.h)*.8);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(35,15,10,.34)');
      ctx.fillStyle = g; ctx.fillRect(0,0,viewport.w,viewport.h);
    }
  }

  function drawRoute() {
    const pts = [
      [-940,0],[-720,5],[-560,0],[-350,10],[-170,0],[120,-15],[380,15],[650,0],[880,5],[1130,-5],[1410,0],[1600,0],[1850,0],[2130,0]
    ].map(([x,y]) => worldToScreen(x,y));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = player.x > 1420 ? 'rgba(128,91,66,.65)' : 'rgba(155,133,91,.45)';
    ctx.lineWidth = 58 * camera.zoom;
    ctx.beginPath();
    pts.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(232,213,171,.13)';
    ctx.lineWidth = 4 * camera.zoom;
    ctx.setLineDash([16 * camera.zoom, 20 * camera.zoom]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function shadow(x, y, rx, ry, alpha = .28) {
    const p = worldToScreen(x, y);
    ctx.save();
    ctx.translate(p.x, p.y + 7 * camera.zoom);
    ctx.scale(1, .48);
    ctx.beginPath(); ctx.ellipse(0,0,rx*camera.zoom,ry*camera.zoom,0,0,TAU);
    ctx.fillStyle = `rgba(0,0,0,${alpha})`; ctx.fill(); ctx.restore();
  }

  function drawObject(o) {
    const p = worldToScreen(o.x, o.y);
    if (p.x < -180 || p.x > viewport.w + 180 || p.y < -200 || p.y > viewport.h + 180) return;
    const z = camera.zoom;
    const s = (o.s || 1) * z;

    if (o.type === 'tree') {
      shadow(o.x,o.y,26*s/z,17*s/z,.22);
      ctx.fillStyle = '#493b2d'; ctx.fillRect(p.x-5*s,p.y-32*s,10*s,38*s);
      circle(p.x-13*s,p.y-50*s,24*s,'#344d32');
      circle(p.x+13*s,p.y-55*s,27*s,'#3e5b36');
      circle(p.x,p.y-72*s,25*s,'#49683d');
    } else if (o.type === 'bush') {
      shadow(o.x,o.y,22*s/z,12*s/z,.18);
      circle(p.x-10*s,p.y-16*s,16*s,'#3f6338'); circle(p.x+9*s,p.y-16*s,18*s,'#4e743f');
    } else if (o.type === 'deadTree') {
      shadow(o.x,o.y,25*s/z,14*s/z,.24);
      ctx.strokeStyle='#50463a';ctx.lineWidth=9*s;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-55*s);ctx.lineTo(p.x-18*s,p.y-72*s);ctx.stroke();
      ctx.beginPath();ctx.moveTo(p.x,p.y-44*s);ctx.lineTo(p.x+21*s,p.y-63*s);ctx.stroke();
    } else if (o.type === 'rock' || o.type === 'denRock') {
      shadow(o.x,o.y,28*s/z,15*s/z,.28);
      ctx.beginPath();
      ctx.moveTo(p.x-27*s,p.y);ctx.lineTo(p.x-17*s,p.y-29*s);ctx.lineTo(p.x+7*s,p.y-38*s);ctx.lineTo(p.x+29*s,p.y-10*s);ctx.lineTo(p.x+20*s,p.y+2*s);ctx.closePath();
      ctx.fillStyle=o.type==='denRock'?'#453b36':'#5f6254';ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=2;ctx.stroke();
    } else if (o.type === 'ember') {
      shadow(o.x,o.y,10*s/z,7*s/z,.12);
      const flicker = Math.sin(performance.now()/170 + o.x)*3*s;
      circle(p.x,p.y-8*s,7*s+flicker*.15,'rgba(221,98,56,.65)');
      circle(p.x,p.y-11*s,3*s,'rgba(255,193,96,.9)');
    } else if (o.type === 'forge') {
      shadow(o.x,o.y,50,28,.3);
      ctx.fillStyle='#5d4a37';ctx.fillRect(p.x-32*z,p.y-43*z,64*z,43*z);
      ctx.fillStyle='#2d3028';ctx.beginPath();ctx.moveTo(p.x-40*z,p.y-42*z);ctx.lineTo(p.x,p.y-67*z);ctx.lineTo(p.x+40*z,p.y-42*z);ctx.closePath();ctx.fill();
      ctx.fillStyle='#c06a3e';ctx.fillRect(p.x+17*z,p.y-24*z,9*z,16*z);
      labelAt(p.x,p.y-78*z,'ALDEN • SMITH');
    } else if (o.type === 'board') {
      shadow(o.x,o.y,24,11,.2);
      ctx.fillStyle='#5a4431';ctx.fillRect(p.x-4*z,p.y-34*z,8*z,34*z);ctx.fillRect(p.x-29*z,p.y-51*z,58*z,31*z);
      ctx.strokeStyle='#a47b4b';ctx.lineWidth=2*z;ctx.strokeRect(p.x-25*z,p.y-47*z,50*z,23*z);
      labelAt(p.x,p.y-61*z,'CONTRACT BOARD');
    } else if (o.type === 'well') {
      shadow(o.x,o.y,35,18,.25);
      ctx.strokeStyle='#72725f';ctx.lineWidth=10*z;ctx.beginPath();ctx.ellipse(p.x,p.y-4*z,29*z,14*z,0,0,TAU);ctx.stroke();
    } else if (o.type === 'banner') {
      ctx.strokeStyle='#574636';ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-77*z);ctx.stroke();
      ctx.fillStyle='#8a5741';ctx.beginPath();ctx.moveTo(p.x+3*z,p.y-72*z);ctx.lineTo(p.x+43*z,p.y-65*z);ctx.lineTo(p.x+32*z,p.y-39*z);ctx.lineTo(p.x+3*z,p.y-45*z);ctx.closePath();ctx.fill();
    } else if (o.type === 'shortcut') {
      shadow(o.x,o.y,34,18,.28);
      ctx.strokeStyle=o.active?'rgba(191,213,137,.9)':'rgba(100,104,83,.75)';
      ctx.lineWidth=8*z;ctx.beginPath();ctx.arc(p.x,p.y-18*z,25*z,Math.PI,TAU);ctx.stroke();
      ctx.fillStyle=o.active?'rgba(129,169,89,.2)':'rgba(20,25,19,.28)';ctx.beginPath();ctx.ellipse(p.x,p.y-5*z,30*z,13*z,0,0,TAU);ctx.fill();
      if(o.active){
        ctx.strokeStyle='rgba(189,224,128,.4)';ctx.lineWidth=2*z;ctx.beginPath();ctx.arc(p.x,p.y-17*z,(16+Math.sin(performance.now()/250)*3)*z,0,TAU);ctx.stroke();
      }
      labelAt(p.x,p.y-55*z,o.destination==='town'?'ROOTWAY HOME':'OLD ROOTWAY');
    }
  }

  function drawResource(r) {
    const p = worldToScreen(r.x,r.y); const z = camera.zoom;
    shadow(r.x,r.y,18,10,.18);
    if(r.type==='herb'){
      ctx.strokeStyle='#345632';ctx.lineWidth=4*z;ctx.lineCap='round';
      for(let i=-2;i<=2;i++){
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo(p.x+i*5*z,p.y-12*z,p.x+i*8*z,p.y-(20+Math.abs(i)*2)*z);ctx.stroke();
      }
      circle(p.x-8*z,p.y-16*z,5*z,'#78b45f');circle(p.x+8*z,p.y-20*z,5*z,'#88c56a');
    }else{
      ctx.fillStyle='#6c6252';ctx.beginPath();ctx.moveTo(p.x-18*z,p.y);ctx.lineTo(p.x-12*z,p.y-22*z);ctx.lineTo(p.x+6*z,p.y-29*z);ctx.lineTo(p.x+20*z,p.y-8*z);ctx.lineTo(p.x+14*z,p.y+3*z);ctx.closePath();ctx.fill();
      circle(p.x-5*z,p.y-12*z,5*z,'#b76f4b');circle(p.x+8*z,p.y-17*z,4*z,'#d08055');
    }
  }

  function drawEnemy(e) {
    const p=worldToScreen(e.x,e.y), z=camera.zoom*e.scale;
    shadow(e.x,e.y,26*e.scale,15*e.scale,.3);
    ctx.save();ctx.translate(p.x,p.y);
    if(e.hurt>0) ctx.globalAlpha=.72;
    ctx.fillStyle=e.hurt>0?'#e9c7a6':e.color;
    ctx.beginPath();ctx.ellipse(0,-17*z,28*z,18*z,0,0,TAU);ctx.fill();
    const fx=e.facingX*10*z, fy=e.facingY*4*z;
    circle(fx+17*z, -25*z+fy, 14*z, e.hurt>0?'#efd0ad':e.color);
    ctx.strokeStyle=e.color;ctx.lineWidth=6*z;ctx.lineCap='round';
    for(const lx of [-14,11]){ctx.beginPath();ctx.moveTo(lx*z,-7*z);ctx.lineTo((lx-2)*z,6*z);ctx.stroke();}
    if(e.type==='boss'){
      ctx.fillStyle='#e2c397';
      ctx.beginPath();ctx.moveTo(fx+22*z,-36*z+fy);ctx.lineTo(fx+35*z,-47*z+fy);ctx.lineTo(fx+30*z,-29*z+fy);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(fx+8*z,-36*z+fy);ctx.lineTo(fx+2*z,-50*z+fy);ctx.lineTo(fx+17*z,-31*z+fy);ctx.closePath();ctx.fill();
    }
    ctx.restore();

    if(e.hp<e.maxHp || e.type==='boss'){
      const w=(e.type==='boss'?110:58)*camera.zoom;
      const y=p.y-(e.type==='boss'?90:58)*camera.zoom;
      ctx.fillStyle='rgba(0,0,0,.45)';roundRect(p.x-w/2,y,w,7*camera.zoom,4*camera.zoom);ctx.fill();
      ctx.fillStyle=e.type==='boss'?'#b9543d':'#b86a50';roundRect(p.x-w/2,y,w*(e.hp/e.maxHp),7*camera.zoom,4*camera.zoom);ctx.fill();
      if(e.type==='boss') labelAt(p.x,y-9*camera.zoom,'EMBERBACK');
    }
  }

  function drawPlayer() {
    const p=worldToScreen(player.x,player.y), z=camera.zoom;
    shadow(player.x,player.y,22,13,.32);
    const blink=player.invuln>0 && Math.floor(player.invuln*18)%2===0;
    ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=blink?.55:1;
    ctx.fillStyle='#3f604a';ctx.beginPath();ctx.moveTo(-16*z,0);ctx.lineTo(-12*z,-37*z);ctx.lineTo(0,-48*z);ctx.lineTo(14*z,-37*z);ctx.lineTo(18*z,2*z);ctx.closePath();ctx.fill();
    circle(0,-48*z,11*z,'#c6a47f');
    ctx.fillStyle='#2c362f';ctx.beginPath();ctx.arc(0,-50*z,12*z,Math.PI,TAU);ctx.fill();
    const a=Math.atan2(player.facingY,player.facingX);
    ctx.save();ctx.translate(player.facingX*10*z,-22*z+player.facingY*4*z);ctx.rotate(a*.55+.15);
    ctx.strokeStyle=player.reinforced?'#e1d6b7':'#b5b0a0';ctx.lineWidth=(player.reinforced?5:4)*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(25*z,-15*z);ctx.stroke();
    ctx.strokeStyle='#8d623c';ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(-3*z,2*z);ctx.lineTo(4*z,-3*z);ctx.stroke();ctx.restore();
    ctx.restore();
  }

  function drawSlashes(){
    for(const s of slashes){
      const p=worldToScreen(s.x,s.y), a=Math.atan2(s.facingY,s.facingX), t=s.life/s.maxLife;
      ctx.save();ctx.translate(p.x,p.y-20*camera.zoom);ctx.rotate(a*.6);
      ctx.strokeStyle=`rgba(247,226,177,${t*.75})`;ctx.lineWidth=6*camera.zoom;ctx.lineCap='round';
      ctx.beginPath();ctx.arc(0,0,s.reach*.58*camera.zoom,-1.1,.65);ctx.stroke();ctx.restore();
    }
  }

  function drawParticles(){
    for(const p of particles){
      const s=worldToScreen(p.x,p.y);const alpha=clamp(p.life/.5,0,1);
      ctx.globalAlpha=alpha;circle(s.x,s.y-p.z*camera.zoom,2.5*camera.zoom,p.color);ctx.globalAlpha=1;
    }
  }

  function drawFloaters(){
    ctx.textAlign='center';ctx.font=`800 ${Math.max(10,12*camera.zoom)}px system-ui`;
    for(const f of floaters){
      const p=worldToScreen(f.x,f.y);const age=1-f.life/f.maxLife;
      ctx.globalAlpha=clamp(f.life*1.5,0,1);ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillText(f.text,p.x+1,p.y-32-age*28+1);ctx.fillStyle=f.color;ctx.fillText(f.text,p.x,p.y-32-age*28);ctx.globalAlpha=1;
    }
  }

  function drawVignette(){
    const g=ctx.createRadialGradient(viewport.w/2,viewport.h/2,Math.min(viewport.w,viewport.h)*.25,viewport.w/2,viewport.h/2,Math.max(viewport.w,viewport.h)*.72);
    g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(4,9,6,.32)');ctx.fillStyle=g;ctx.fillRect(0,0,viewport.w,viewport.h);
  }

  function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
  function roundRect(x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
  }
  function labelAt(x,y,text){
    ctx.font=`800 ${Math.max(8,9*camera.zoom)}px system-ui`;ctx.textAlign='center';ctx.fillStyle='rgba(244,233,208,.84)';ctx.fillText(text,x,y);
  }

  function saveGame(){
    const state={
      player:{x:player.x,y:player.y,hp:player.hp,coins:player.coins,inventory:player.inventory,reinforced:player.reinforced},
      progress:{...progress}
    };
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(_){ }
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
        if(player.reinforced){player.weapon='Reinforced Sword';player.damage=38;}
      }
      if(state.progress)Object.assign(progress,state.progress);
      if(progress.shortcutUnlocked)worldObjects.filter(o=>o.type==='shortcut').forEach(o=>o.active=true);
      const boss=enemies.find(e=>e.type==='boss');if(progress.bossDefeated&&boss){boss.dead=true;boss.hp=0;boss.respawn=99999;}
      camera.x=player.x;camera.y=player.y;
    }catch(_){ }
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

  window.__BRIAR_GLENDebug={
    getState:()=>({player:{x:player.x,y:player.y,hp:player.hp,inventory:{...player.inventory},weapon:player.weapon,coins:player.coins},progress:{...progress},zone:zoneFor(player.x).name}),
    teleport:(x,y)=>{player.x=x;player.y=y;camera.x=x;camera.y=y;},
    interact,attack,dash,craftSword,
    setInventory:(patch)=>Object.assign(player.inventory,patch),
    setProgress:(patch)=>Object.assign(progress,patch),
  };

  setTimeout(()=>{
    if(!progress.tipShown){toast('Follow the road east • gather 3 Briarleaf');progress.tipShown=true;saveGame();}
  },700);
})();
