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

  function weaponName(type = player.weaponType) {
    if (type === 'sword') return player.reinforced ? 'Reinforced Sword' : 'Worn Sword';
    return WEAPONS[type]?.name || 'Worn Sword';
  }

  function selectWeapon(type, notify = true) {
    if (!WEAPONS[type] || player.weaponType === type) return;
    player.weaponType = type;
    player.weapon = weaponName(type);
    if (notify) toast(`${player.weapon} equipped`);
    updateUI();
    saveGame();
  }

  function cycleWeapon() {
    const i = WEAPON_ORDER.indexOf(player.weaponType);
    selectWeapon(WEAPON_ORDER[(i + 1) % WEAPON_ORDER.length]);
  }

  function damageEnemy(e, amount, opts = {}) {
    if (!e || e.dead) return false;
    if (e.type === 'boss' && !player.reinforced) {
      const now = performance.now();
      if (now - e.shieldToastAt > 900) {
        e.shieldToastAt = now;
        addFloater(e.x, e.y - 28, 'HIDE TOO TOUGH', '#f2c88e');
        toast('Emberback’s hide needs a reinforced weapon first');
      }
      spawnParticles(e.x, e.y, '#d5a66c', 5, .55);
      return false;
    }

    e.hp = Math.max(0, e.hp - amount);
    e.hurt = .16;
    addFloater(e.x, e.y - 15, `-${amount}`, opts.color || '#ffd49b');
    spawnParticles(e.x, e.y, opts.particle || '#d6b178', opts.particles || 7, opts.force || .8);
    if (opts.knock !== 0) {
      const knock = norm(e.x - player.x, e.y - player.y);
      const force = opts.knock ?? 18;
      e.x += knock.x * force;
      e.y += knock.y * force;
    }
    if (e.hp <= 0) killEnemy(e);
    return true;
  }

  function meleeAttack() {
    const reinforced = player.reinforced;
    player.attackCd = reinforced ? .34 : WEAPONS.sword.cooldown;
    player.attackAnim = .24;
    const reach = reinforced ? 105 : WEAPONS.sword.reach;
    const damage = reinforced ? 38 : 24;
    slashes.push({ x: player.x, y: player.y, facingX: player.facingX, facingY: player.facingY, life: .22, maxLife: .22, reach });
    let connected = false;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = dist(player, e);
      if (d > reach + e.radius) continue;
      const to = norm(e.x - player.x, e.y - player.y);
      const dot = to.x * player.facingX + to.y * player.facingY;
      if (dot < -.15) continue;
      connected = damageEnemy(e, damage, { knock: e.type === 'boss' ? 7 : 18 }) || connected;
    }
    if (connected) {
      camera.shake = 5;
      vibrate(18);
    }
  }

  function fireProjectile(type) {
    const w = WEAPONS[type];
    if (!w) return;
    player.attackCd = w.cooldown;
    player.attackAnim = .18;
    const start = 34;
    projectiles.push({
      type,
      x: player.x + player.facingX * start,
      y: player.y + player.facingY * start,
      vx: player.facingX * w.speed,
      vy: player.facingY * w.speed,
      life: w.life,
      radius: w.radius,
      damage: w.damage,
      splash: w.splash || 0,
      color: w.color,
      dead: false,
    });
    spawnParticles(player.x + player.facingX * 24, player.y + player.facingY * 24, w.color, type === 'staff' ? 5 : 3, .35);
  }

  function resolveProjectileHit(p, target) {
    if (p.dead) return;
    p.dead = true;
    if (p.type === 'staff') {
      spawnParticles(p.x, p.y, p.color, 15, 1);
      camera.shake = Math.max(camera.shake, 3);
      let connected = false;
      for (const e of enemies) {
        if (e.dead || Math.hypot(e.x - p.x, e.y - p.y) > p.splash + e.radius) continue;
        const amount = e === target ? p.damage : Math.round(p.damage * .55);
        connected = damageEnemy(e, amount, { color: '#b9f0d0', particle: '#78bd99', knock: 7, particles: 5 }) || connected;
      }
      if (connected) vibrate(13);
    } else {
      const connected = damageEnemy(target, p.damage, { color: '#f1d7a5', particle: '#d6bc88', knock: 11, particles: 5 });
      if (connected) vibrate(10);
    }
  }

  function attack() {
    if (player.attackCd > 0 || player.dashTimer > 0) return;
    if (player.weaponType === 'sword') meleeAttack();
    else fireProjectile(player.weaponType);
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
      const reward = e.type === 'boar' ? 8 : 6;
      player.coins += reward;
      addFloater(e.x, e.y - 28, `+${reward} c`, '#e7c479');
      if (Math.random() < .18 && player.hp < player.maxHp) {
        const heal = Math.min(8, player.maxHp - player.hp);
        player.hp += heal;
        addFloater(e.x, e.y - 44, `+${heal} HEALTH`, '#9fd3a5');
      }
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
      if (['forge','board','shortcut','well'].includes(o.type)) candidates.push({ kind: o.type, obj: o, d: dist(player, o) });
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
    if (kind === 'well') {
      if (player.hp >= player.maxHp) {
        toast('The Briar Glen well is cool and clear');
      } else {
        const healed = player.maxHp - player.hp;
        player.hp = player.maxHp;
        spawnParticles(obj.x, obj.y, '#8bb8b0', 12, .55);
        addFloater(obj.x, obj.y - 16, `+${Math.ceil(healed)} HEALTH`, '#b9e1d6');
        toast('Restored at the Briar Glen well');
        saveGame();
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
    player.damage = 38;
    player.weapon = weaponName();
    progress.step = 3;
    spawnParticles(-470, 255, '#f0b15e', 22, 1.1);
    toast('Reinforced Sword forged — Emberback waits in the east');
    saveGame();
  }

