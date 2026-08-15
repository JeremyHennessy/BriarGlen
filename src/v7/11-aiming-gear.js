(() => {
  'use strict';

  // Build 7: aiming assistance + meaningful named equipment.
  // This layer is intentionally additive and leaves the movement hotfix/world systems untouched.
  const BASE_SPEED = 245;
  const BOOTS_SPEED = 274;
  const BASE_BOW_DAMAGE = 18;
  const BASE_STAFF_DAMAGE = 24;
  const BASE_STAFF_SPLASH = 78;
  const RELIC_BOW_DAMAGE = 22;
  const RELIC_STAFF_DAMAGE = 29;
  const RELIC_STAFF_SPLASH = 92;

  const missingRelicOwnership = typeof progress.groveRelicOwned !== 'boolean';
  const missingBootOwnership = typeof progress.wardenBootsOwned !== 'boolean';

  if (typeof progress.groveRelicOwned !== 'boolean') progress.groveRelicOwned = false;
  if (typeof progress.groveRelicEquipped !== 'boolean') progress.groveRelicEquipped = false;
  if (typeof progress.wardenBootsOwned !== 'boolean') progress.wardenBootsOwned = false;
  if (typeof progress.wardenBootsEquipped !== 'boolean') progress.wardenBootsEquipped = false;

  // Existing saves that already cleared the Grove should not lose the new named rewards.
  let migratedGear = false;
  if (missingRelicOwnership && progress.grovekeeperDefeated) {
    progress.groveRelicOwned = true;
    progress.groveRelicEquipped = true;
    migratedGear = true;
  }
  if (missingBootOwnership && progress.groveCacheClaimed) {
    progress.wardenBootsOwned = true;
    progress.wardenBootsEquipped = true;
    migratedGear = true;
  }

  ui.gearRelicStatus = document.getElementById('gear-relic-status');
  ui.gearBootsStatus = document.getElementById('gear-boots-status');
  ui.toggleRelic = document.getElementById('toggle-relic-btn');
  ui.toggleBoots = document.getElementById('toggle-boots-btn');

  const aim = {
    target: null,
    mouseActive: false,
    mouseX: 0,
    mouseY: 0,
  };

  function isTouchAimMode() {
    return navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
  }

  function screenToWorldDirection(sx, sy) {
    const worldX = sx / 1.56 + sy / .78;
    const worldY = sy / .78 - sx / 1.56;
    return norm(worldX, worldY);
  }

  function setFacingToward(x, y) {
    const n = norm(x - player.x, y - player.y);
    player.facingX = n.x;
    player.facingY = n.y;
  }

  function targetRange(type = player.weaponType) {
    if (type === 'sword') return player.reinforced ? 165 : 145;
    if (type === 'staff') return 610;
    return 690;
  }

  function chooseAutoTarget(type = player.weaponType) {
    const range = targetRange(type);
    let best = null;
    let bestScore = Infinity;
    for (const e of enemies) {
      if (!e || e.dead) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d > range + e.radius) continue;
      const to = norm(dx, dy);
      const facingDot = to.x * player.facingX + to.y * player.facingY;
      // Distance dominates, with a modest preference for what the player was already facing.
      const score = d + (1 - facingDot) * (type === 'sword' ? 22 : 70);
      if (score < bestScore) {
        best = e;
        bestScore = score;
      }
    }
    return best;
  }

  function updateMouseAim(event) {
    if (event.pointerType && !['mouse', 'pen'].includes(event.pointerType)) return;
    const rect = canvas.getBoundingClientRect();
    aim.mouseX = event.clientX - rect.left;
    aim.mouseY = event.clientY - rect.top;
    aim.mouseActive = true;
  }

  function applyMouseAim() {
    if (!aim.mouseActive) return false;
    const playerScreen = worldToScreen(player.x, player.y);
    const sx = aim.mouseX - playerScreen.x;
    const sy = aim.mouseY - playerScreen.y;
    if (Math.hypot(sx, sy) < 12) return false;
    const n = screenToWorldDirection(sx, sy);
    player.facingX = n.x;
    player.facingY = n.y;
    return true;
  }

  canvas.addEventListener('pointermove', updateMouseAim, { passive: true });
  canvas.addEventListener('pointerdown', updateMouseAim, { passive: true });
  canvas.addEventListener('pointerleave', event => {
    if (!event.pointerType || event.pointerType === 'mouse') aim.mouseActive = false;
  }, { passive: true });

  function applyGearEffects() {
    player.speed = progress.wardenBootsOwned && progress.wardenBootsEquipped ? BOOTS_SPEED : BASE_SPEED;
    const relic = progress.groveRelicOwned && progress.groveRelicEquipped;
    WEAPONS.bow.damage = relic ? RELIC_BOW_DAMAGE : BASE_BOW_DAMAGE;
    WEAPONS.staff.damage = relic ? RELIC_STAFF_DAMAGE : BASE_STAFF_DAMAGE;
    WEAPONS.staff.splash = relic ? RELIC_STAFF_SPLASH : BASE_STAFF_SPLASH;
  }

  function updateNamedGearUI() {
    if (ui.gearRelicStatus) {
      ui.gearRelicStatus.textContent = !progress.groveRelicOwned
        ? 'Defeat the Grovekeeper'
        : progress.groveRelicEquipped
          ? 'EQUIPPED • +20% RANGED POWER'
          : 'Owned • unequipped';
      ui.gearRelicStatus.dataset.owned = progress.groveRelicOwned ? 'true' : 'false';
    }
    if (ui.gearBootsStatus) {
      ui.gearBootsStatus.textContent = !progress.wardenBootsOwned
        ? 'Recover the Old Warden Cache'
        : progress.wardenBootsEquipped
          ? 'EQUIPPED • +12% MOVE SPEED'
          : 'Owned • unequipped';
      ui.gearBootsStatus.dataset.owned = progress.wardenBootsOwned ? 'true' : 'false';
    }
    if (ui.toggleRelic) {
      ui.toggleRelic.hidden = !progress.groveRelicOwned;
      ui.toggleRelic.textContent = progress.groveRelicEquipped ? 'Unequip' : 'Equip';
      ui.toggleRelic.setAttribute('aria-pressed', progress.groveRelicEquipped ? 'true' : 'false');
    }
    if (ui.toggleBoots) {
      ui.toggleBoots.hidden = !progress.wardenBootsOwned;
      ui.toggleBoots.textContent = progress.wardenBootsEquipped ? 'Unequip' : 'Equip';
      ui.toggleBoots.setAttribute('aria-pressed', progress.wardenBootsEquipped ? 'true' : 'false');
    }
  }

  function toggleRelic() {
    if (!progress.groveRelicOwned) return false;
    progress.groveRelicEquipped = !progress.groveRelicEquipped;
    applyGearEffects();
    updateNamedGearUI();
    toast(progress.groveRelicEquipped ? 'Grovekeeper Thorn equipped' : 'Grovekeeper Thorn unequipped');
    saveGame();
    return true;
  }

  function toggleBoots() {
    if (!progress.wardenBootsOwned) return false;
    progress.wardenBootsEquipped = !progress.wardenBootsEquipped;
    applyGearEffects();
    updateNamedGearUI();
    toast(progress.wardenBootsEquipped ? 'Warden Trail Boots equipped' : 'Warden Trail Boots unequipped');
    saveGame();
    return true;
  }

  const build5Attack = attack;
  attack = function build7Attack() {
    if (isTouchAimMode()) {
      aim.target = chooseAutoTarget(player.weaponType);
      if (aim.target) setFacingToward(aim.target.x, aim.target.y);
    } else {
      aim.target = null;
      applyMouseAim();
    }
    return build5Attack();
  };

  const build5KillEnemy = killEnemy;
  killEnemy = function build7KillEnemy(e) {
    if (!e || e.dead) return;
    const keeper = e.type === 'grovekeeper';
    build5KillEnemy(e);
    if (keeper && e.dead && !progress.groveRelicOwned) {
      progress.groveRelicOwned = true;
      progress.groveRelicEquipped = true;
      applyGearEffects();
      updateNamedGearUI();
      spawnParticles(e.x, e.y, '#93b978', 20, 1);
      addFloater(e.x, e.y - 58, 'GROVEKEEPER THORN', '#cce3ac');
      toast('Named loot found — Grovekeeper Thorn equipped');
      saveGame();
    }
  };

  const build5Interact = interact;
  interact = function build7Interact() {
    const cacheWasClaimed = !!progress.groveCacheClaimed;
    const result = build5Interact();
    if (!cacheWasClaimed && progress.groveCacheClaimed && !progress.wardenBootsOwned) {
      progress.wardenBootsOwned = true;
      progress.wardenBootsEquipped = true;
      applyGearEffects();
      updateNamedGearUI();
      addFloater(player.x, player.y - 42, 'WARDEN TRAIL BOOTS', '#d9c995');
      toast('Named loot found — Warden Trail Boots equipped');
      saveGame();
    }
    return result;
  };

  const build5Update = update;
  update = function build7Update(dt) {
    applyGearEffects();
    build5Update(dt);
    if (isTouchAimMode()) {
      const next = chooseAutoTarget(player.weaponType);
      aim.target = next && !next.dead ? next : null;
    } else if (aim.target?.dead) {
      aim.target = null;
    }
  };

  const build5UpdateUI = updateUI;
  updateUI = function build7UpdateUI() {
    build5UpdateUI();
    updateNamedGearUI();
  };

  const build5DrawEnemy = drawEnemy;
  drawEnemy = function build7DrawEnemy(e) {
    build5DrawEnemy(e);
    if (!e || e.dead || e !== aim.target || !isTouchAimMode()) return;
    const p = worldToScreen(e.x, e.y);
    const z = camera.zoom;
    ctx.save();
    ctx.strokeStyle = player.weaponType === 'sword' ? 'rgba(241,211,154,.82)' : 'rgba(169,219,185,.9)';
    ctx.lineWidth = 2.2 * z;
    ctx.setLineDash([6 * z, 5 * z]);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 10 * z, (e.radius + 15) * z, (e.radius * .62 + 10) * z, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  };

  ui.toggleRelic?.addEventListener('click', toggleRelic);
  ui.toggleBoots?.addEventListener('click', toggleBoots);

  applyGearEffects();
  updateNamedGearUI();
  if (migratedGear) saveGame();

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.attack = () => attack();
    window.__BRIAR_GLENDebug.interact = () => interact();
    window.__BRIAR_GLENDebug.toggleRelic = () => toggleRelic();
    window.__BRIAR_GLENDebug.toggleBoots = () => toggleBoots();
    window.__BRIAR_GLENDebug.getAimState = () => {
      const facingScreen = {
        x: (player.facingX - player.facingY) * .78,
        y: (player.facingX + player.facingY) * .39,
      };
      return {
        mode: isTouchAimMode() ? 'auto' : 'mouse',
        mouseActive: aim.mouseActive,
        target: aim.target ? {
          type: aim.target.type,
          name: aim.target.name,
          x: aim.target.x,
          y: aim.target.y,
          dead: aim.target.dead,
          distance: Math.hypot(aim.target.x - player.x, aim.target.y - player.y),
        } : null,
        facing: { x: player.facingX, y: player.facingY },
        facingScreen,
      };
    };
    window.__BRIAR_GLENDebug.getGearState = () => ({
      relic: { owned: progress.groveRelicOwned, equipped: progress.groveRelicEquipped },
      boots: { owned: progress.wardenBootsOwned, equipped: progress.wardenBootsEquipped },
      speed: player.speed,
      bowDamage: WEAPONS.bow.damage,
      staffDamage: WEAPONS.staff.damage,
      staffSplash: WEAPONS.staff.splash,
    });
  }

  updateUI();
})();