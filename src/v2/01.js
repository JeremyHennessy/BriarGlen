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
    weaponCycle: document.getElementById('weapon-btn'),
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
    invuln: 0, damage: 24, weapon: 'Worn Sword', weaponType: 'sword', coins: 100,
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
  const projectiles = [];
  const worldObjects = [];
  const resources = [];
  const enemies = [];

  const WEAPON_ORDER = ['sword', 'bow', 'staff'];
  const WEAPONS = {
    sword: { short: 'SWORD', cooldown: .42, reach: 92 },
    bow: { short: 'BOW', name: 'Briar Bow', cooldown: .48, damage: 18, speed: 760, life: .9, radius: 7, color: '#e2c68d' },
    staff: { short: 'STAFF', name: 'Glen Staff', cooldown: .68, damage: 24, speed: 560, life: 1.18, radius: 11, splash: 78, color: '#8fd0aa' },
  };

  const zones = [
    { name: 'BRIAR GLEN', min: -1000, max: -210, tint: '#49633d' },
    { name: 'MEADOW ROAD', min: -210, max: 660, tint: '#536d3d' },
    { name: 'COPPER HOLLOW', min: 660, max: 1430, tint: '#4d5540' },
    { name: 'EMBERBACK DEN', min: 1430, max: 2160, tint: '#493c31' },
  ];

  const blockers = [
    // Briar Glen structures
    { x: -765, y: -285, r: 86 },
    { x: -475, y: 280, r: 74 },
    { x: -395, y: -265, r: 68 },
    // Meadow trees / boulders
    { x: 70, y: -360, r: 55 }, { x: 200, y: 330, r: 54 },
    { x: 420, y: -350, r: 61 }, { x: 550, y: 330, r: 51 },
    // Hollow rock masses
    { x: 820, y: -320, r: 68 }, { x: 965, y: 340, r: 68 },
    { x: 1170, y: -340, r: 85 }, { x: 1305, y: 335, r: 78 },
    // Den columns
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
      ? { name: 'Emberback', hp: 320, speed: 92, damage: 18, aggro: 620, attackRange: 70, scale: 1.75, color: '#8e4934' }
      : type === 'boar'
        ? { name: 'Hollow Boar', hp: 70, speed: 100, damage: 11, aggro: 300, attackRange: 52, scale: 1.05, color: '#725241' }
        : { name: 'Briar Wolf', hp: 52, speed: 118, damage: 9, aggro: 280, attackRange: 47, scale: .9, color: '#596056' };
    const e = {
      type, x, y, homeX: x, homeY: y, radius: type === 'boss' ? 42 : 25,
      hp: defaults.hp, maxHp: defaults.hp, speed: defaults.speed,
      damage: defaults.damage, aggro: defaults.aggro, attackRange: defaults.attackRange,
      scale: defaults.scale, color: defaults.color, name: defaults.name,
      attackCd: Math.random() * .6, hurt: 0, dead: false, respawn: 0,
      windup: 0, windupMax: 0, pendingAttack: null, specialCd: type === 'boss' ? 1.6 : 0,
      chargeTimer: 0, chargeHit: false, chargeX: 0, chargeY: 0, phase: 1,
      telegraphTargetX: x, telegraphTargetY: y, shieldToastAt: 0,
      facingX: -1, facingY: 0, ...opts,
    };
    enemies.push(e);
    return e;
  }

  // Town anchors.
  addObject('forge', -470, 255, { label: 'Alden the Smith' });
  addObject('board', -615, -118, { label: 'Contract Board' });
  addObject('well', -800, 150);
  addObject('banner', -260, 20);
  addObject('shortcut', -845, -205, { destination: 'den', active: false, label: 'Old Rootway' });
  addObject('shortcut', 2070, 115, { destination: 'town', active: false, label: 'Rootway Home' });

  // Resources in Meadow and Hollow.
  [[-55,-170],[110,140],[275,-110],[455,135],[575,-105]].forEach(([x,y]) => addResource('herb', x, y));
  [[775,150],[900,-140],[1040,90],[1185,120],[1340,-105]].forEach(([x,y]) => addResource('ore', x, y));

  // Enemies.
  addEnemy('wolf', 210, -230);
  addEnemy('wolf', 450, 230);
  addEnemy('boar', 950, 235);
  addEnemy('boar', 1240, -205);
  addEnemy('boss', 1900, 0);

  // Decorative objects.
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

