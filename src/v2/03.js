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

    for (const p of projectiles) {
      if (p.dead) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || blockers.some(b => Math.hypot(p.x - b.x, p.y - b.y) < b.r + p.radius)) {
        p.dead = true;
        if (p.type === 'staff') spawnParticles(p.x, p.y, p.color, 6, .45);
        continue;
      }
      for (const e of enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= e.radius + p.radius) {
          resolveProjectileHit(p, e);
          break;
        }
      }
    }
    for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].dead || projectiles[i].life <= 0) projectiles.splice(i, 1);

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

  function beginEnemyAttack(e, type, duration) {
    e.pendingAttack = type;
    e.windup = duration;
    e.windupMax = duration;
    e.telegraphTargetX = player.x;
    e.telegraphTargetY = player.y;
  }

  function resolveEnemyAttack(e) {
    const type = e.pendingAttack;
    e.pendingAttack = null;
    e.windup = 0;
    if (type === 'bite') {
      if (dist(e, player) <= e.attackRange + player.radius + 15) damagePlayer(e.damage, e);
      return;
    }
    if (type === 'slam') {
      spawnParticles(e.x, e.y, '#d56743', 22, 1.35);
      camera.shake = Math.max(camera.shake, 9);
      if (dist(e, player) <= 155) damagePlayer(e.phase === 2 ? 26 : 22, e);
      return;
    }
    if (type === 'charge') {
      const n = norm(e.telegraphTargetX - e.x, e.telegraphTargetY - e.y);
      e.chargeX = n.x;
      e.chargeY = n.y;
      e.chargeTimer = e.phase === 2 ? .62 : .52;
      e.chargeHit = false;
    }
  }

  function updateEnemy(e, dt) {
    e.attackCd = Math.max(0, e.attackCd - dt);
    e.specialCd = Math.max(0, e.specialCd - dt);
    e.hurt = Math.max(0, e.hurt - dt);
    if (e.dead) {
      e.respawn -= dt;
      if (e.respawn <= 0 && e.type !== 'boss') {
        e.dead = false; e.hp = e.maxHp; e.x = e.homeX; e.y = e.homeY;
        e.pendingAttack = null; e.windup = 0; e.chargeTimer = 0;
      }
      return;
    }

    if (e.type === 'boss') e.phase = e.hp / e.maxHp <= .45 ? 2 : 1;

    if (e.chargeTimer > 0) {
      e.chargeTimer -= dt;
      const chargeSpeed = e.phase === 2 ? 520 : 450;
      e.facingX = e.chargeX; e.facingY = e.chargeY;
      collideMove(e, e.chargeX * chargeSpeed * dt, e.chargeY * chargeSpeed * dt);
      if (Math.random() < .55) spawnParticles(e.x, e.y, '#b95b3e', 1, .3);
      if (!e.chargeHit && dist(e, player) < e.radius + player.radius + 12) {
        e.chargeHit = true;
        damagePlayer(e.phase === 2 ? 29 : 24, e);
      }
      return;
    }

    if (e.windup > 0) {
      e.windup -= dt;
      if (e.windup <= 0) resolveEnemyAttack(e);
      return;
    }

    const d = dist(e, player);
    let tx = e.homeX, ty = e.homeY;
    if (d < e.aggro) { tx = player.x; ty = player.y; }

    if (e.type === 'boss' && d < e.aggro && e.specialCd <= 0) {
      const useCharge = d > 135 || (e.phase === 2 && Math.random() < .55);
      beginEnemyAttack(e, useCharge ? 'charge' : 'slam', useCharge ? (e.phase === 2 ? .48 : .62) : (e.phase === 2 ? .58 : .78));
      e.specialCd = e.phase === 2 ? 2.15 : 3.05;
      return;
    }

    if (d < e.attackRange + player.radius && e.attackCd <= 0) {
      e.attackCd = e.type === 'boss' ? .9 : 1.15;
      beginEnemyAttack(e, 'bite', e.type === 'boss' ? .36 : .3);
      return;
    }

    const td = Math.hypot(tx - e.x, ty - e.y);
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
    player.weapon = weaponName();
    ui.weapon.textContent = player.weapon;
    if (ui.weaponCycle) {
      ui.weaponCycle.textContent = WEAPONS[player.weaponType].short;
      ui.weaponCycle.dataset.weapon = player.weaponType;
      ui.weaponCycle.setAttribute('aria-label', `Cycle weapon. Current: ${player.weapon}`);
    }
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
      else if (near.kind === 'well') ui.context.textContent = player.hp < player.maxHp ? 'USE • Restore health' : 'USE • Briar Glen well';
      else ui.context.textContent = near.obj.active ? `USE • ${near.obj.label}` : 'Old Rootway • Sealed';
    } else {
      ui.context.hidden = true;
    }
  }

