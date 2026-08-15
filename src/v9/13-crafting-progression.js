(() => {
  'use strict';

  // Build 9: progression crafting. Builds 2–8 remain intact underneath this layer.
  const craft = { open: false };
  const UPGRADE_MULTIPLIER = 1.18;
  const OIL_MULTIPLIER = 1.15;
  const OIL_DURATION = 45;

  if (!Number.isFinite(player.inventory.iron)) player.inventory.iron = 0;
  if (!Number.isFinite(player.inventory.oil)) player.inventory.oil = 0;
  if (typeof progress.reinforcedPickaxe !== 'boolean') progress.reinforcedPickaxe = false;
  if (typeof progress.temperedSword !== 'boolean') progress.temperedSword = false;
  if (typeof progress.briarstringBow !== 'boolean') progress.briarstringBow = false;
  if (typeof progress.moonrootStaff !== 'boolean') progress.moonrootStaff = false;
  if (!Number.isFinite(player.oilTimer)) player.oilTimer = 0;

  ui.craftBackdrop = document.getElementById('craft-backdrop');
  ui.craftPanel = document.getElementById('craft-panel');
  ui.craftClose = document.getElementById('craft-close');
  ui.craftMaterials = document.getElementById('craft-materials');
  ui.craftPickaxe = document.getElementById('craft-pickaxe-btn');
  ui.craftSwordUpgrade = document.getElementById('craft-sword-upgrade-btn');
  ui.craftBowUpgrade = document.getElementById('craft-bow-upgrade-btn');
  ui.craftStaffUpgrade = document.getElementById('craft-staff-upgrade-btn');
  ui.craftOil = document.getElementById('craft-oil-btn');
  ui.panelIron = document.getElementById('panel-iron-count');
  ui.panelOil = document.getElementById('panel-oil-count');
  ui.useOil = document.getElementById('use-oil-btn');
  ui.pickaxeStatus = document.getElementById('pickaxe-status');
  ui.swordUpgradeStatus = document.getElementById('sword-upgrade-status');
  ui.bowUpgradeStatus = document.getElementById('bow-upgrade-status');
  ui.staffUpgradeStatus = document.getElementById('staff-upgrade-status');

  const deepveinNodes = [
    addResource('iron', 825, -470),
    addResource('iron', 1085, 465),
    addResource('iron', 1325, -455),
  ];

  function materials() {
    return player.inventory;
  }

  function has(req) {
    return Object.entries(req).every(([key, qty]) => (materials()[key] || 0) >= qty);
  }

  function spend(req) {
    if (!has(req)) return false;
    for (const [key, qty] of Object.entries(req)) materials()[key] -= qty;
    return true;
  }

  const RECIPES = {
    pickaxe: { req: { ore: 3, hide: 2 } },
    sword: { req: { iron: 2, ore: 2, tusk: 1 } },
    bow: { req: { iron: 2, hide: 2, herb: 1 } },
    staff: { req: { iron: 2, mooncap: 2, herb: 1 } },
    oil: { req: { ore: 1, mooncap: 1, herb: 1 } },
  };

  function recipeText(req) {
    const names = { ore: 'Copper', iron: 'Iron', hide: 'Hide', herb: 'Briarleaf', mooncap: 'Mooncap', tusk: 'Ember Tusk' };
    return Object.entries(req).map(([key, qty]) => `${qty} ${names[key] || key}`).join(' • ');
  }

  function applyCraftEffects() {
    player.damage = progress.temperedSword ? 45 : player.reinforced ? 38 : 24;
  }

  function damageMultiplier(type = player.weaponType) {
    let mult = 1;
    if (type === 'sword' && progress.temperedSword) mult *= UPGRADE_MULTIPLIER;
    if (type === 'bow' && progress.briarstringBow) mult *= UPGRADE_MULTIPLIER;
    if (type === 'staff' && progress.moonrootStaff) mult *= UPGRADE_MULTIPLIER;
    if (player.oilTimer > 0) mult *= OIL_MULTIPLIER;
    return mult;
  }

  const build8DamageEnemy = damageEnemy;
  damageEnemy = function build9DamageEnemy(e, amount, opts = {}) {
    const adjusted = Math.max(1, Math.round(amount * damageMultiplier(player.weaponType)));
    return build8DamageEnemy(e, adjusted, opts);
  };

  function updateCraftPanel() {
    if (!ui.craftPanel) return;
    const i = materials();
    ui.craftMaterials.textContent = `Copper ${i.ore || 0} • Deepvein ${i.iron || 0} • Hides ${i.hide || 0} • Briarleaf ${i.herb || 0} • Mooncap ${i.mooncap || 0} • Tusk ${i.tusk || 0}`;

    ui.craftPickaxe.disabled = progress.reinforcedPickaxe || !has(RECIPES.pickaxe.req);
    ui.craftPickaxe.textContent = progress.reinforcedPickaxe ? 'Crafted' : `Craft • ${recipeText(RECIPES.pickaxe.req)}`;

    ui.craftSwordUpgrade.disabled = progress.temperedSword || !has(RECIPES.sword.req) || !progress.contractComplete;
    ui.craftSwordUpgrade.textContent = progress.temperedSword ? 'Crafted' : `Craft • ${recipeText(RECIPES.sword.req)}`;

    ui.craftBowUpgrade.disabled = progress.briarstringBow || !has(RECIPES.bow.req);
    ui.craftBowUpgrade.textContent = progress.briarstringBow ? 'Crafted' : `Craft • ${recipeText(RECIPES.bow.req)}`;

    ui.craftStaffUpgrade.disabled = progress.moonrootStaff || !has(RECIPES.staff.req);
    ui.craftStaffUpgrade.textContent = progress.moonrootStaff ? 'Crafted' : `Craft • ${recipeText(RECIPES.staff.req)}`;

    ui.craftOil.disabled = !has(RECIPES.oil.req);
    ui.craftOil.textContent = `Craft • ${recipeText(RECIPES.oil.req)}`;
  }

  function updateProgressUI() {
    if (ui.panelIron) ui.panelIron.textContent = player.inventory.iron || 0;
    if (ui.panelOil) ui.panelOil.textContent = player.inventory.oil || 0;
    if (ui.pickaxeStatus) ui.pickaxeStatus.textContent = progress.reinforcedPickaxe ? 'CRAFTED • mines Deepvein Iron' : 'Not crafted';
    if (ui.swordUpgradeStatus) ui.swordUpgradeStatus.textContent = progress.temperedSword ? 'TEMPERED • +18% sword damage' : 'Reinforced Sword';
    if (ui.bowUpgradeStatus) ui.bowUpgradeStatus.textContent = progress.briarstringBow ? 'BRIARSTRING • +18% bow damage' : 'Briar Bow';
    if (ui.staffUpgradeStatus) ui.staffUpgradeStatus.textContent = progress.moonrootStaff ? 'MOONROOT • +18% staff damage' : 'Glen Staff';
    if (ui.useOil) {
      ui.useOil.disabled = (player.inventory.oil || 0) <= 0;
      ui.useOil.textContent = player.oilTimer > 0
        ? `Warden Oil active • ${Math.ceil(player.oilTimer)}s`
        : `Use Warden Oil (+15% damage • 45s) • ${player.inventory.oil || 0}`;
    }
  }

  function toggleCrafting(force) {
    craft.open = typeof force === 'boolean' ? force : !craft.open;
    ui.craftPanel.hidden = !craft.open;
    ui.craftBackdrop.hidden = !craft.open;
    if (craft.open) {
      updateCraftPanel();
      updateProgressUI();
    }
  }

  function craftPermanent(key, progressKey, label, color) {
    const recipe = RECIPES[key];
    if (progress[progressKey] || !spend(recipe.req)) return false;
    progress[progressKey] = true;
    applyCraftEffects();
    spawnParticles(player.x, player.y, color, 18, .8);
    addFloater(player.x, player.y - 28, label.toUpperCase(), color);
    toast(`${label} crafted`);
    saveGame();
    updateCraftPanel();
    updateProgressUI();
    return true;
  }

  function craftPickaxe() {
    return craftPermanent('pickaxe', 'reinforcedPickaxe', 'Reinforced Pickaxe', '#d5a274');
  }

  function craftSwordUpgrade() {
    if (!progress.contractComplete) {
      toast('Alden will not use the Ember Tusk until Smoke in the Hollow is complete');
      return false;
    }
    return craftPermanent('sword', 'temperedSword', 'Tempered Sword', '#e7bd78');
  }

  function craftBowUpgrade() {
    return craftPermanent('bow', 'briarstringBow', 'Briarstring Bow', '#c9b67c');
  }

  function craftStaffUpgrade() {
    return craftPermanent('staff', 'moonrootStaff', 'Moonroot Staff', '#8fd0aa');
  }

  function craftOil() {
    if (!spend(RECIPES.oil.req)) return false;
    player.inventory.oil += 1;
    spawnParticles(player.x, player.y, '#d7b872', 12, .55);
    toast('Warden Oil crafted');
    saveGame();
    updateCraftPanel();
    updateProgressUI();
    return true;
  }

  function useOil() {
    if ((player.inventory.oil || 0) <= 0) {
      toast('No Warden Oil in your satchel');
      return false;
    }
    player.inventory.oil -= 1;
    player.oilTimer = OIL_DURATION;
    spawnParticles(player.x, player.y, '#e0bd73', 15, .7);
    addFloater(player.x, player.y - 24, 'WARDEN OIL • +15% DAMAGE', '#f2d58d');
    toast('Weapon coated with Warden Oil');
    saveGame();
    updateProgressUI();
    return true;
  }

  const build8Interact = interact;
  interact = function build9Interact() {
    if (craft.open) return;
    const near = nearestInteractable();
    if (near?.kind === 'resource' && near.obj.type === 'iron') {
      if (!progress.reinforcedPickaxe) {
        toast('Deepvein Iron needs a Reinforced Pickaxe');
        return;
      }
      near.obj.active = false;
      near.obj.cooldown = 34;
      player.inventory.iron += 1;
      spawnParticles(near.obj.x, near.obj.y, '#89939a', 14, .8);
      addFloater(near.obj.x, near.obj.y - 12, 'DEEPVEIN IRON +1', '#c6d0d5');
      toast('Deepvein Iron mined');
      saveGame();
      return;
    }
    if (near?.kind === 'forge' && player.reinforced) {
      toggleCrafting(true);
      toast('Alden opens the masterwork ledger');
      return;
    }
    return build8Interact();
  };

  const build8CraftSword = craftSword;
  craftSword = function build9CraftSword() {
    if (player.reinforced) {
      toggleCrafting(true);
      return;
    }
    return build8CraftSword();
  };

  const build8Attack = attack;
  attack = function build9Attack() {
    if (craft.open) return;
    return build8Attack();
  };

  const build8Dash = dash;
  dash = function build9Dash() {
    if (craft.open) return;
    return build8Dash();
  };

  const build8UseSkill = useSkill;
  useSkill = function build9UseSkill() {
    if (craft.open) return false;
    return build8UseSkill();
  };

  const build8ObjectiveText = objectiveText;
  objectiveText = function build9ObjectiveText() {
    if (!progress.groveCacheClaimed) return build8ObjectiveText();
    if (!progress.reinforcedPickaxe) return 'Alden can reinforce your pickaxe with Copper and Beast Hides.';
    const all = progress.temperedSword && progress.briarstringBow && progress.moonrootStaff;
    if (!all && (player.inventory.iron || 0) < 2) return 'Mine Deepvein Iron in Copper Hollow for Alden’s masterwork recipes.';
    if (!all) return 'Return to Alden and forge masterwork upgrades for your weapons.';
    return 'Alden’s masterwork arsenal is complete. Craft Warden Oil for difficult hunts.';
  };

  const build8ObjectiveProgress = objectiveProgress;
  objectiveProgress = function build9ObjectiveProgress() {
    if (!progress.groveCacheClaimed) return build8ObjectiveProgress();
    if (!progress.reinforcedPickaxe) return 'REINFORCED PICKAXE • 3 COPPER • 2 HIDES';
    const done = [progress.temperedSword, progress.briarstringBow, progress.moonrootStaff].filter(Boolean).length;
    if (done < 3) return `${player.inventory.iron || 0} DEEPVEIN IRON • ${done} / 3 MASTERWORK WEAPONS`;
    return `MASTERWORK COMPLETE • WARDEN OIL ${player.inventory.oil || 0}`;
  };

  const build8Update = update;
  update = function build9Update(dt) {
    if (craft.open) {
      updateUI();
      return;
    }
    player.oilTimer = Math.max(0, player.oilTimer - dt);
    applyCraftEffects();
    build8Update(dt);
  };

  const build8UpdateUI = updateUI;
  updateUI = function build9UpdateUI() {
    build8UpdateUI();
    updateProgressUI();
    if (craft.open) updateCraftPanel();
    if (ui.questTitle && progress.groveCacheClaimed) ui.questTitle.textContent = 'Alden’s Masterwork';
    if (player.oilTimer > 0 && ui.weapon) ui.weapon.textContent = `${ui.weapon.textContent} • OILED`;
    const near = nearestInteractable();
    if (near?.kind === 'resource' && near.obj.type === 'iron') {
      ui.context.textContent = progress.reinforcedPickaxe ? 'USE • Mine Deepvein Iron' : 'Deepvein Iron • Reinforced Pickaxe required';
    } else if (near?.kind === 'forge' && player.reinforced) {
      ui.context.textContent = 'USE / C • Alden’s Masterwork Forge';
    }
  };

  const build8DrawResource = drawResource;
  drawResource = function build9DrawResource(r) {
    if (r.type !== 'iron') return build8DrawResource(r);
    const p = worldToScreen(r.x, r.y), z = camera.zoom;
    shadow(r.x, r.y, 20, 10, .18);
    ctx.save();
    ctx.fillStyle = r.active ? '#59656c' : '#41484c';
    ctx.beginPath();
    ctx.moveTo(p.x - 15*z, p.y);
    ctx.lineTo(p.x - 9*z, p.y - 17*z);
    ctx.lineTo(p.x + 3*z, p.y - 25*z);
    ctx.lineTo(p.x + 17*z, p.y - 9*z);
    ctx.lineTo(p.x + 11*z, p.y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = r.active ? '#aab6bc' : '#6e777b';
    ctx.lineWidth = 2*z;
    ctx.beginPath(); ctx.moveTo(p.x - 5*z, p.y - 12*z); ctx.lineTo(p.x + 7*z, p.y - 19*z); ctx.stroke();
    ctx.restore();
  };

  ui.craftBackdrop?.addEventListener('pointerdown', () => toggleCrafting(false));
  ui.craftClose?.addEventListener('click', () => toggleCrafting(false));
  ui.craftPickaxe?.addEventListener('click', craftPickaxe);
  ui.craftSwordUpgrade?.addEventListener('click', craftSwordUpgrade);
  ui.craftBowUpgrade?.addEventListener('click', craftBowUpgrade);
  ui.craftStaffUpgrade?.addEventListener('click', craftStaffUpgrade);
  ui.craftOil?.addEventListener('click', craftOil);
  ui.useOil?.addEventListener('click', useOil);

  addEventListener('keydown', event => {
    if (event.code === 'Escape' && craft.open) toggleCrafting(false);
  });

  applyCraftEffects();
  updateProgressUI();

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.interact = () => interact();
    window.__BRIAR_GLENDebug.attack = () => attack();
    window.__BRIAR_GLENDebug.dash = () => dash();
    window.__BRIAR_GLENDebug.useSkill = () => useSkill();
    window.__BRIAR_GLENDebug.useOil = () => useOil();
    window.__BRIAR_GLENDebug.toggleCrafting = force => toggleCrafting(force);
    window.__BRIAR_GLENDebug.previewDamage = (amount, type = player.weaponType) => Math.max(1, Math.round(amount * damageMultiplier(type)));
    window.__BRIAR_GLENDebug.getCraftingState = () => ({
      open: craft.open,
      deepveinNodes: deepveinNodes.length,
      pickaxe: progress.reinforcedPickaxe,
      upgrades: {
        sword: progress.temperedSword,
        bow: progress.briarstringBow,
        staff: progress.moonrootStaff,
      },
      materials: {
        ore: player.inventory.ore || 0,
        iron: player.inventory.iron || 0,
        hide: player.inventory.hide || 0,
        herb: player.inventory.herb || 0,
        mooncap: player.inventory.mooncap || 0,
        tusk: player.inventory.tusk || 0,
        oil: player.inventory.oil || 0,
      },
      oilTimer: player.oilTimer,
      damageMultiplier: damageMultiplier(player.weaponType),
      weapon: player.weaponType,
    });
  }

  updateUI();
})();
