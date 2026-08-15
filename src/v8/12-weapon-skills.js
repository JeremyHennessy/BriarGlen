(() => {
  'use strict';

  // Build 8: distinct secondary abilities for each weapon.
  // Movement, primary attacks, aiming and gear stay untouched underneath this layer.
  const SKILLS = {
    sword: { name: 'CLEAVE', cooldown: 3.6 },
    bow: { name: 'PIERCE', cooldown: 4.2 },
    staff: { name: 'ROOT', cooldown: 5.0 },
  };
  const skillVisuals = [];
  const skillMouse = { active: false, x: 0, y: 0 };
  let lastSkill = { type: null, hits: 0, rooted: 0, damage: 0 };

  if (!Number.isFinite(player.skillCd)) player.skillCd = 0;
  ui.skill = document.getElementById('skill-btn');

  function modalOpen() {
    return Boolean(
      (ui.inventoryPanel && !ui.inventoryPanel.hidden) ||
      (ui.tradePanel && !ui.tradePanel.hidden)
    );
  }

  function touchMode() {
    return navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
  }

  function screenToWorldDirection(sx, sy) {
    const wx = sx / 1.56 + sy / .78;
    const wy = sy / .78 - sx / 1.56;
    return norm(wx, wy);
  }

  function trackSkillMouse(event) {
    if (event.pointerType && !['mouse', 'pen'].includes(event.pointerType)) return;
    const rect = canvas.getBoundingClientRect();
    skillMouse.x = event.clientX - rect.left;
    skillMouse.y = event.clientY - rect.top;
    skillMouse.active = true;
  }
  canvas.addEventListener('pointermove', trackSkillMouse, { passive: true });
  canvas.addEventListener('pointerdown', trackSkillMouse, { passive: true });
  canvas.addEventListener('pointerleave', event => {
    if (!event.pointerType || event.pointerType === 'mouse') skillMouse.active = false;
  }, { passive: true });

  function applyDesktopSkillAim() {
    if (!skillMouse.active) return false;
    const p = worldToScreen(player.x, player.y);
    const sx = skillMouse.x - p.x;
    const sy = skillMouse.y - p.y;
    if (Math.hypot(sx, sy) < 12) return false;
    const n = screenToWorldDirection(sx, sy);
    player.facingX = n.x;
    player.facingY = n.y;
    return true;
  }

  function bestSkillTarget(range) {
    let best = null;
    let bestScore = Infinity;
    for (const e of enemies) {
      if (!e || e.dead) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d > range + e.radius) continue;
      const to = norm(dx, dy);
      const dot = to.x * player.facingX + to.y * player.facingY;
      const score = d + (1 - dot) * 58;
      if (score < bestScore) {
        best = e;
        bestScore = score;
      }
    }
    return best;
  }

  function aimSkill(range) {
    if (touchMode()) {
      const target = bestSkillTarget(range);
      if (target) {
        const n = norm(target.x - player.x, target.y - player.y);
        player.facingX = n.x;
        player.facingY = n.y;
      }
      return target;
    }
    applyDesktopSkillAim();
    return bestSkillTarget(range);
  }

  function addSkillVisual(type, data) {
    skillVisuals.push({ type, life: .42, maxLife: .42, ...data });
  }

  function swordCleave() {
    aimSkill(175);
    const range = player.reinforced ? 150 : 132;
    const amount = player.reinforced ? 56 : 40;
    let hits = 0;
    for (const e of enemies) {
      if (!e || e.dead) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d > range + e.radius) continue;
      const to = norm(dx, dy);
      const dot = to.x * player.facingX + to.y * player.facingY;
      if (dot < -.32) continue;
      if (damageEnemy(e, amount, { color: '#f2d59b', particle: '#d9b86f', knock: 28, particles: 9, force: 1 })) hits++;
    }
    slashes.push({
      x: player.x, y: player.y,
      facingX: player.facingX, facingY: player.facingY,
      life: .32, maxLife: .32, reach: range + 18,
    });
    spawnParticles(player.x, player.y, '#e3c27e', 18, .9);
    addSkillVisual('cleave', { x: player.x, y: player.y, range });
    camera.shake = Math.max(camera.shake, hits ? 7 : 3);
    vibrate(hits ? 26 : 14);
    lastSkill = { type: 'cleave', hits, rooted: 0, damage: amount };
  }

  function bowPierce() {
    aimSkill(760);
    const fx = player.facingX;
    const fy = player.facingY;
    const range = 760;
    const width = 43;
    const amount = Math.round(WEAPONS.bow.damage * 1.65);
    const candidates = [];
    for (const e of enemies) {
      if (!e || e.dead) continue;
      const vx = e.x - player.x;
      const vy = e.y - player.y;
      const forward = vx * fx + vy * fy;
      const lateral = Math.abs(vx * fy - vy * fx);
      if (forward <= 0 || forward > range + e.radius || lateral > width + e.radius) continue;
      candidates.push({ e, forward });
    }
    candidates.sort((a, b) => a.forward - b.forward);
    let hits = 0;
    for (const { e } of candidates.slice(0, 3)) {
      if (damageEnemy(e, amount, { color: '#f1d7a5', particle: '#d7bf8e', knock: 6, particles: 7 })) hits++;
    }
    const endX = player.x + fx * range;
    const endY = player.y + fy * range;
    addSkillVisual('pierce', { x: player.x, y: player.y, x2: endX, y2: endY });
    for (let i = 1; i <= 7; i++) {
      spawnParticles(player.x + fx * i * 82, player.y + fy * i * 82, '#e2c68d', 1, .28);
    }
    camera.shake = Math.max(camera.shake, hits ? 5 : 2);
    vibrate(hits ? 18 : 10);
    lastSkill = { type: 'pierce', hits, rooted: 0, damage: amount };
  }

  function staffRoot() {
    const target = aimSkill(620);
    const cx = target ? target.x : player.x + player.facingX * 245;
    const cy = target ? target.y : player.y + player.facingY * 245;
    const radius = Math.round(WEAPONS.staff.splash * 1.45);
    const amount = Math.round(WEAPONS.staff.damage * 1.35);
    let hits = 0;
    let rooted = 0;
    for (const e of enemies) {
      if (!e || e.dead) continue;
      if (Math.hypot(e.x - cx, e.y - cy) > radius + e.radius) continue;
      if (damageEnemy(e, amount, { color: '#b9f0d0', particle: '#78bd99', knock: 2, particles: 10 })) {
        hits++;
        e.hurt = Math.max(e.hurt || 0, 1.8);
        rooted++;
      }
    }
    addSkillVisual('root', { x: cx, y: cy, radius });
    spawnParticles(cx, cy, '#78bd99', 28, 1.15);
    camera.shake = Math.max(camera.shake, hits ? 6 : 3);
    vibrate(hits ? 22 : 12);
    lastSkill = { type: 'root', hits, rooted, damage: amount };
  }

  function useSkill() {
    if (modalOpen() || player.dashTimer > 0) return false;
    if (player.skillCd > 0) {
      toast(`${SKILLS[player.weaponType].name} ready in ${player.skillCd.toFixed(1)}s`);
      return false;
    }
    const skill = SKILLS[player.weaponType] || SKILLS.sword;
    player.skillCd = skill.cooldown;
    if (player.weaponType === 'sword') swordCleave();
    else if (player.weaponType === 'bow') bowPierce();
    else staffRoot();
    return true;
  }

  function updateSkillUI() {
    if (!ui.skill) return;
    const skill = SKILLS[player.weaponType] || SKILLS.sword;
    ui.skill.dataset.weapon = player.weaponType;
    ui.skill.disabled = player.skillCd > 0;
    ui.skill.textContent = player.skillCd > 0 ? player.skillCd.toFixed(1) : skill.name;
    ui.skill.setAttribute('aria-label', `${skill.name} weapon skill${player.skillCd > 0 ? `, ${player.skillCd.toFixed(1)} seconds remaining` : ''}`);
  }

  const build7Update = update;
  update = function build8Update(dt) {
    player.skillCd = Math.max(0, player.skillCd - dt);
    for (const v of skillVisuals) v.life -= dt;
    for (let i = skillVisuals.length - 1; i >= 0; i--) if (skillVisuals[i].life <= 0) skillVisuals.splice(i, 1);
    build7Update(dt);
  };

  const build7UpdateUI = updateUI;
  updateUI = function build8UpdateUI() {
    build7UpdateUI();
    updateSkillUI();
  };

  function drawSkillVisuals() {
    for (const v of skillVisuals) {
      const alpha = Math.max(0, v.life / v.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (v.type === 'cleave') {
        const p = worldToScreen(v.x, v.y);
        ctx.strokeStyle = '#e8c982';
        ctx.lineWidth = 3 * camera.zoom;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, v.range * .78 * camera.zoom, v.range * .39 * camera.zoom, 0, 0, TAU);
        ctx.stroke();
      } else if (v.type === 'pierce') {
        const a = worldToScreen(v.x, v.y);
        const b = worldToScreen(v.x2, v.y2);
        ctx.strokeStyle = '#f0d59d';
        ctx.lineWidth = 5 * camera.zoom;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(a.x, a.y - 16 * camera.zoom); ctx.lineTo(b.x, b.y - 16 * camera.zoom); ctx.stroke();
      } else if (v.type === 'root') {
        const p = worldToScreen(v.x, v.y);
        ctx.strokeStyle = '#8fd0aa';
        ctx.lineWidth = 3 * camera.zoom;
        ctx.setLineDash([7 * camera.zoom, 5 * camera.zoom]);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, v.radius * .78 * camera.zoom, v.radius * .39 * camera.zoom, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
  }

  const build7DrawFloaters = drawFloaters;
  drawFloaters = function build8DrawFloaters() {
    drawSkillVisuals();
    build7DrawFloaters();
  };

  ui.skill?.addEventListener('pointerdown', event => {
    event.preventDefault();
    useSkill();
  });
  addEventListener('keydown', event => {
    if (!event.repeat && event.code === 'KeyF') useSkill();
  });

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.useSkill = () => useSkill();
    window.__BRIAR_GLENDebug.getSkillState = () => ({
      weapon: player.weaponType,
      skill: SKILLS[player.weaponType]?.name,
      cooldown: player.skillCd,
      last: { ...lastSkill },
      visuals: skillVisuals.map(v => ({ type: v.type, life: v.life })),
    });
  }

  updateSkillUI();
})();