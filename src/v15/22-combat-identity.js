(() => {
  'use strict';

  // Build 15: enemy/combat identity. Additive over the verified Build 14 release.
  // Existing HP, rewards, progression, player weapon stats and base AI remain authoritative.
  const identity = {
    hazards: [],
    recentEvents: [],
    tacticsStarted: 0,
    interrupts: 0,
    countershots: 0,
    snares: 0,
    hazardHits: 0,
  };

  const BOSS_TYPES = new Set(['boss', 'grovekeeper', 'fenwarden']);
  const ROLE_LABELS = {
    wolf: 'POUNCE',
    boar: 'CHARGE',
    mireling: 'BIND',
    bogstalker: 'AMBUSH',
    grovekeeper: 'ROOT / CHARGE',
    boss: 'EMBER RING',
    fenwarden: 'UNDERTOW / SURGE',
  };

  function remember(event) {
    identity.recentEvents.push(event);
    if (identity.recentEvents.length > 18) identity.recentEvents.shift();
  }

  function roleFor(e) {
    return ROLE_LABELS[e?.type] || 'PRESSURE';
  }

  function initEnemyIdentity(e) {
    if (!e || e.__combatIdentity) return e?.__combatIdentity;
    const stagger = e.type === 'wolf' ? .75 : e.type === 'boar' ? 1.05 : e.type === 'mireling' ? 1.2 : 1.35;
    e.__combatIdentity = { cooldown: stagger, state: null, alternator: 0, label: roleFor(e) };
    return e.__combatIdentity;
  }

  for (const e of enemies) initEnemyIdentity(e);

  function setState(e, state) {
    const kit = initEnemyIdentity(e);
    kit.state = state;
    identity.tacticsStarted += 1;
    remember(`${e.type}:${state.kind}`);
  }

  function startWindup(e, kind, duration, targetX = player.x, targetY = player.y) {
    setState(e, { mode: 'windup', kind, timer: duration, max: duration, targetX, targetY });
    const n = norm(targetX - e.x, targetY - e.y);
    e.facingX = n.x;
    e.facingY = n.y;
  }

  function startDash(e, kind, duration, speed, damage, targetX, targetY, after = null) {
    const n = norm(targetX - e.x, targetY - e.y);
    const kit = initEnemyIdentity(e);
    kit.state = {
      mode: 'dash', kind, timer: duration, max: duration,
      vx: n.x, vy: n.y, speed, damage, hit: false, after,
    };
    e.facingX = n.x;
    e.facingY = n.y;
  }

  function addHazard(x, y, radius, delay, life, damage, root, color, label) {
    identity.hazards.push({
      x, y, radius, delay, maxDelay: delay, life, maxLife: life,
      damage, root, color, label, triggered: false,
    });
  }

  function eruptionPattern(x, y, kind) {
    if (kind === 'grove-root') {
      [[0,0],[76,-28],[-72,34]].forEach(([ox,oy], index) =>
        addHazard(x + ox, y + oy, index ? 64 : 72, .36 + index * .08, .55, 14, .62, '#91b36f', 'ROOT ERUPTION'));
      return;
    }
    if (kind === 'warden-tide') {
      [[0,0],[95,40],[-95,-35]].forEach(([ox,oy], index) =>
        addHazard(x + ox, y + oy, 78, .42 + index * .1, .62, 16, .48, '#6aa7a0', 'UNDERTOW'));
      return;
    }
    if (kind === 'mire-bind') {
      addHazard(x, y, 76, .34, .58, 10, .72, '#6b9a78', 'MIRE BIND');
    }
  }

  function finishWindup(e, state) {
    const kit = initEnemyIdentity(e);
    const kind = state.kind;
    if (kind === 'wolf-pounce') {
      startDash(e, kind, .24, 620, 13, state.targetX, state.targetY, 'recover');
      return;
    }
    if (kind === 'boar-charge') {
      startDash(e, kind, .52, 510, 17, state.targetX, state.targetY, 'stagger');
      return;
    }
    if (kind === 'bog-ambush') {
      startDash(e, kind, .31, 585, 18, state.targetX, state.targetY, 'retreat');
      return;
    }
    if (kind === 'grove-charge') {
      startDash(e, kind, .46, 540, 20, state.targetX, state.targetY, 'stagger');
      return;
    }
    if (kind === 'warden-surge') {
      startDash(e, kind, .58, e.hp / e.maxHp <= .42 ? 590 : 520, 23, state.targetX, state.targetY, 'recover');
      return;
    }
    if (kind === 'mire-bind' || kind === 'grove-root' || kind === 'warden-tide') {
      eruptionPattern(state.targetX, state.targetY, kind);
      kit.state = { mode: 'recover', kind, timer: .28 };
      return;
    }
    if (kind === 'ember-ring') {
      addHazard(e.x, e.y, 142, .48, .5, 20, 0, '#d66d45', 'EMBER RING');
      kit.state = { mode: 'recover', kind, timer: .34 };
      return;
    }
    kit.state = null;
  }

  function runState(e, dt) {
    const kit = initEnemyIdentity(e);
    const s = kit.state;
    if (!s) return false;

    if (s.mode === 'windup') {
      s.timer -= dt;
      e.windup = Math.max(e.windup || 0, s.timer);
      e.windupMax = Math.max(e.windupMax || 0, s.max);
      e.pendingAttack = s.kind;
      if (s.timer <= 0) {
        e.windup = 0;
        e.pendingAttack = null;
        finishWindup(e, s);
      }
      return true;
    }

    if (s.mode === 'dash') {
      s.timer -= dt;
      const control = e.hurt > 0 ? .58 : 1;
      collideMove(e, s.vx * s.speed * control * dt, s.vy * s.speed * control * dt);
      e.facingX = s.vx;
      e.facingY = s.vy;
      if (Math.random() < .38) spawnParticles(e.x, e.y, e.type === 'fenwarden' ? '#6f9e98' : '#9c765c', 1, .22);
      if (!s.hit && dist(e, player) < e.radius + player.radius + 13) {
        s.hit = true;
        damagePlayer(s.damage, e);
      }
      if (s.timer <= 0) {
        if (s.after === 'stagger') kit.state = { mode: 'stagger', kind: s.kind, timer: .62 };
        else if (s.after === 'retreat') kit.state = { mode: 'retreat', kind: s.kind, timer: .38 };
        else kit.state = { mode: 'recover', kind: s.kind, timer: .24 };
      }
      return true;
    }

    if (s.mode === 'retreat') {
      s.timer -= dt;
      const n = norm(e.x - player.x, e.y - player.y);
      collideMove(e, n.x * 260 * dt, n.y * 260 * dt);
      e.facingX = -n.x;
      e.facingY = -n.y;
      if (s.timer <= 0) kit.state = null;
      return true;
    }

    if (s.mode === 'stagger' || s.mode === 'recover') {
      s.timer -= dt;
      if (s.mode === 'stagger') e.hurt = Math.max(e.hurt || 0, .15);
      if (s.timer <= 0) kit.state = null;
      return true;
    }

    return false;
  }

  function maybeStartTactic(e) {
    const kit = initEnemyIdentity(e);
    if (kit.cooldown > 0 || kit.state || e.dead || e.windup > 0 || e.chargeTimer > 0) return false;
    const d = dist(e, player);
    if (d > e.aggro + 45) return false;

    if (e.type === 'wolf' && d > 82 && d < 255) {
      startWindup(e, 'wolf-pounce', .34);
      kit.cooldown = 2.75;
      return true;
    }
    if (e.type === 'boar' && d > 108 && d < 370) {
      startWindup(e, 'boar-charge', .58);
      kit.cooldown = 3.55;
      return true;
    }
    if (e.type === 'mireling' && d > 72 && d < 325) {
      startWindup(e, 'mire-bind', .54);
      kit.cooldown = 3.7;
      return true;
    }
    if (e.type === 'bogstalker' && d > 100 && d < 400) {
      startWindup(e, 'bog-ambush', .47);
      kit.cooldown = 4.0;
      return true;
    }
    if (e.type === 'grovekeeper' && d < 410) {
      const kind = kit.alternator++ % 2 === 0 ? 'grove-root' : 'grove-charge';
      startWindup(e, kind, kind === 'grove-root' ? .66 : .5);
      kit.cooldown = 3.35;
      return true;
    }
    if (e.type === 'fenwarden' && d < 500) {
      const phase2 = e.hp / e.maxHp <= .42;
      const kind = phase2 && kit.alternator++ % 2 ? 'warden-surge' : 'warden-tide';
      startWindup(e, kind, kind === 'warden-tide' ? .68 : .48);
      kit.cooldown = phase2 ? 2.45 : 3.1;
      return true;
    }
    if (e.type === 'boss' && e.hp / e.maxHp <= .45 && d < 470) {
      startWindup(e, 'ember-ring', .65, e.x, e.y);
      kit.cooldown = 4.2;
      return true;
    }
    return false;
  }

  const build14UpdateEnemy = updateEnemy;
  updateEnemy = function build15UpdateEnemy(e, dt) {
    const kit = initEnemyIdentity(e);
    if (e.dead) {
      kit.state = null;
      kit.cooldown = Math.max(kit.cooldown, .9);
      return build14UpdateEnemy(e, dt);
    }
    kit.cooldown = Math.max(0, kit.cooldown - dt);
    if (runState(e, dt)) return;
    if (maybeStartTactic(e)) return;
    build14UpdateEnemy(e, dt);
  };

  if (!Number.isFinite(player.__combatRootTimer)) player.__combatRootTimer = 0;
  const build14CollideMove = collideMove;
  collideMove = function build15CollideMove(entity, dx, dy) {
    if (entity === player && player.__combatRootTimer > 0) {
      dx *= .22;
      dy *= .22;
    }
    return build14CollideMove(entity, dx, dy);
  };

  function updateHazards(dt) {
    player.__combatRootTimer = Math.max(0, player.__combatRootTimer - dt);
    for (const h of identity.hazards) {
      h.delay -= dt;
      if (!h.triggered && h.delay <= 0) {
        h.triggered = true;
        spawnParticles(h.x, h.y, h.color, 18, .9);
        if (Math.hypot(player.x - h.x, player.y - h.y) <= h.radius + player.radius) {
          const before = player.hp;
          damagePlayer(h.damage, { x: h.x, y: h.y });
          if (player.hp < before) {
            identity.hazardHits += 1;
            if (h.root > 0) {
              player.__combatRootTimer = Math.max(player.__combatRootTimer, h.root);
              remember(`player:root:${h.label}`);
            }
          }
        }
      }
      if (h.triggered) h.life -= dt;
    }
    identity.hazards = identity.hazards.filter(h => !h.triggered || h.life > 0);
  }

  const build14Update = update;
  update = function build15Update(dt) {
    build14Update(dt);
    updateHazards(dt);
  };

  const build14DamageEnemy = damageEnemy;
  damageEnemy = function build15DamageEnemy(e, amount, opts = {}) {
    if (!e || e.dead) return build14DamageEnemy(e, amount, opts);
    const kit = initEnemyIdentity(e);
    const state = kit.state;
    let adjusted = amount;

    if (player.weaponType === 'sword' && state?.mode === 'windup' && (!BOSS_TYPES.has(e.type) || amount >= 30)) {
      kit.state = { mode: 'stagger', kind: state.kind, timer: BOSS_TYPES.has(e.type) ? .32 : .48 };
      e.windup = 0;
      e.pendingAttack = null;
      identity.interrupts += 1;
      remember(`${e.type}:interrupted`);
      addFloater(e.x, e.y - 34, 'INTERRUPTED', '#f2dc9d');
    }

    if (player.weaponType === 'bow' && state?.mode === 'dash') {
      adjusted = Math.round(amount * 1.25);
      identity.countershots += 1;
      remember(`${e.type}:countershot`);
      addFloater(e.x, e.y - 34, 'COUNTERSHOT', '#f3d18c');
    }

    if (player.weaponType === 'staff') {
      e.hurt = Math.max(e.hurt || 0, .52);
      if (state?.mode === 'windup') state.timer += .12;
      identity.snares += 1;
      remember(`${e.type}:snared`);
    }

    return build14DamageEnemy(e, adjusted, opts);
  };

  function drawHazards() {
    for (const h of identity.hazards) {
      const p = worldToScreen(h.x, h.y);
      const z = camera.zoom;
      ctx.save();
      if (!h.triggered) {
        const t = Math.max(0, Math.min(1, h.delay / Math.max(.01, h.maxDelay)));
        ctx.globalAlpha = .38 + (1 - t) * .34;
        ctx.strokeStyle = h.color;
        ctx.lineWidth = 4 * z;
        ctx.setLineDash([8*z, 7*z]);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, h.radius * 1.08 * z, h.radius * .54 * z, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const t = Math.max(0, h.life / Math.max(.01, h.maxLife));
        ctx.globalAlpha = .18 * t;
        ctx.fillStyle = h.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, h.radius * 1.08 * z, h.radius * .54 * z, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  const build14DrawParticles = drawParticles;
  drawParticles = function build15DrawParticles() {
    drawHazards();
    build14DrawParticles();
  };

  const build14DrawEnemyTelegraph = drawEnemyTelegraph;
  drawEnemyTelegraph = function build15DrawEnemyTelegraph(e, p) {
    const state = initEnemyIdentity(e)?.state;
    if (state?.mode !== 'windup') return build14DrawEnemyTelegraph(e, p);
    const t = Math.max(0, Math.min(1, state.timer / Math.max(.01, state.max)));
    const pulse = .45 + Math.sin(performance.now() / 80) * .1;
    const target = worldToScreen(state.targetX, state.targetY);
    ctx.save();
    ctx.globalAlpha = .55 + (1 - t) * .3;
    ctx.strokeStyle = ['mire-bind','grove-root','warden-tide'].includes(state.kind) ? '#87b89a' : state.kind === 'ember-ring' ? '#df784d' : '#dc9a61';
    ctx.lineWidth = 4 * camera.zoom;
    if (['wolf-pounce','boar-charge','bog-ambush','grove-charge','warden-surge'].includes(state.kind)) {
      ctx.lineWidth = (state.kind === 'boar-charge' || state.kind === 'grove-charge' ? 28 : 20) * camera.zoom;
      ctx.globalAlpha = .16 + pulse * .18;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 13*camera.zoom); ctx.lineTo(target.x, target.y - 13*camera.zoom); ctx.stroke();
      ctx.globalAlpha = .8;
      ctx.lineWidth = 2 * camera.zoom;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 13*camera.zoom); ctx.lineTo(target.x, target.y - 13*camera.zoom); ctx.stroke();
    } else {
      const radius = state.kind === 'ember-ring' ? 142 : state.kind === 'warden-tide' ? 78 : 72;
      ctx.globalAlpha = .38 + pulse * .28;
      ctx.beginPath();
      ctx.ellipse(target.x, target.y, radius*1.08*camera.zoom, radius*.54*camera.zoom, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  };

  const build14DrawEnemy = drawEnemy;
  drawEnemy = function build15DrawEnemy(e) {
    const kit = initEnemyIdentity(e);
    if (e.type === 'bogstalker' && kit.state?.kind === 'bog-ambush' && kit.state.mode === 'windup') {
      ctx.save();
      ctx.globalAlpha = .42;
      build14DrawEnemy(e);
      ctx.restore();
      return;
    }
    build14DrawEnemy(e);
  };

  function syncThreatJournal() {
    const columns = document.querySelector('#warden-journal-view .journal-columns');
    if (!columns) return;
    let card = document.getElementById('journal-threat-notes');
    if (!card) {
      card = document.createElement('section');
      card.id = 'journal-threat-notes';
      card.className = 'journal-card threat-notes';
      card.innerHTML = '<div class="eyebrow">FIELD TACTICS</div><h3>Threat Notes</h3><div class="journal-list"></div>';
      columns.appendChild(card);
    }
    const list = card.querySelector('.journal-list');
    const notes = [
      ['Briar Wolf', 'Pounce • dodge sideways'],
      ['Hollow Boar', 'Committed charge • punish the stagger'],
      ['Mireling', 'Mire bind • leave the marked ground'],
      ['Bog Stalker', 'Ambush lunge • track the fade'],
      ['Grovekeeper', 'Root eruptions alternate with antler charges'],
      ['Drowned Warden', 'Undertow in phase one • surge pressure below 42%'],
    ];
    list.innerHTML = notes.map(([name, note]) => `<div class="journal-row"><span>›</span><b>${name}<small>${note}</small></b></div>`).join('');
  }

  const build14UpdateUI = updateUI;
  updateUI = function build15UpdateUI() {
    build14UpdateUI();
    syncThreatJournal();
    if (player.__combatRootTimer > 0 && ui.questProgress) ui.questProgress.dataset.combatRooted = 'true';
    else if (ui.questProgress) delete ui.questProgress.dataset.combatRooted;
  };

  function enemyByType(type) {
    return enemies.find(e => e.type === type && !e.dead) || enemies.find(e => e.type === type) || null;
  }

  function forceTactic(type, kind = null) {
    const e = enemyByType(type);
    if (!e) return false;
    const kit = initEnemyIdentity(e);
    e.dead = false;
    e.hp = Math.max(1, e.hp || e.maxHp);
    kit.state = null;
    kit.cooldown = 0;
    const chosen = kind || ({
      wolf: 'wolf-pounce', boar: 'boar-charge', mireling: 'mire-bind', bogstalker: 'bog-ambush',
      grovekeeper: 'grove-root', boss: 'ember-ring', fenwarden: 'warden-tide',
    }[type]);
    if (!chosen) return false;
    const durations = {
      'wolf-pounce': .34, 'boar-charge': .58, 'mire-bind': .54, 'bog-ambush': .47,
      'grove-root': .66, 'grove-charge': .5, 'ember-ring': .65, 'warden-tide': .68, 'warden-surge': .48,
    };
    startWindup(e, chosen, durations[chosen] || .5, chosen === 'ember-ring' ? e.x : player.x, chosen === 'ember-ring' ? e.y : player.y);
    kit.cooldown = 99;
    return true;
  }

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.getCombatIdentityState = () => ({
      playerRoot: player.__combatRootTimer,
      hazards: identity.hazards.map(h => ({ label: h.label, x: h.x, y: h.y, radius: h.radius, delay: h.delay, triggered: h.triggered })),
      counters: {
        tacticsStarted: identity.tacticsStarted,
        interrupts: identity.interrupts,
        countershots: identity.countershots,
        snares: identity.snares,
        hazardHits: identity.hazardHits,
      },
      recentEvents: [...identity.recentEvents],
      enemies: enemies.map(e => ({
        type: e.type, hp: e.hp, dead: e.dead, hurt: e.hurt,
        role: roleFor(e),
        state: e.__combatIdentity?.state ? { ...e.__combatIdentity.state } : null,
        cooldown: e.__combatIdentity?.cooldown ?? 0,
      })),
    });
    window.__BRIAR_GLENDebug.forceEnemyTactic = (type, kind) => forceTactic(type, kind);
    window.__BRIAR_GLENDebug.setCombatRoot = seconds => { player.__combatRootTimer = Math.max(0, Number(seconds) || 0); };
    window.__BRIAR_GLENDebug.damageIdentityThreat = (type, amount, weapon = player.weaponType) => {
      const e = enemyByType(type);
      if (!e) return null;
      player.weaponType = weapon;
      const before = e.hp;
      const hit = damageEnemy(e, amount, { knock: 0 });
      return { hit, before, after: e.hp, state: e.__combatIdentity?.state ? { ...e.__combatIdentity.state } : null };
    };
    window.__BRIAR_GLENDebug.setThreat = (type, patch = {}) => {
      const e = enemyByType(type);
      if (!e) return false;
      Object.assign(e, patch);
      initEnemyIdentity(e);
      return true;
    };
  }

  updateUI();
})();