(() => {
  'use strict';

  // Build 31: deepen the existing masterwork loop with one reversible finishing choice per weapon.
  // This layer adds no new currency, world nodes, combat buttons, enemies or progression gates.
  // Existing masterwork, combat identity, economy and save systems remain authoritative underneath it.

  const debug = window.__BRIAR_GLENDebug;
  const runtime = window.__BRIAR_GLEN_RUNTIME;
  if (!debug || !runtime) throw new Error('Build 31 specialist crafting requires the canonical runtime surface');

  if (!progress.specialistTraits || typeof progress.specialistTraits !== 'object') progress.specialistTraits = {};
  for (const weapon of ['sword','bow','staff']) {
    if (!['forceful','swift'].includes(progress.specialistTraits[weapon])) progress.specialistTraits[weapon] = null;
  }

  const baselineEntities = {
    objects: worldObjects.length,
    resources: resources.length,
    enemies: enemies.length,
  };
  const DAMAGE_MULTIPLIER = 1.10;
  const RECOVERY_MULTIPLIER = .88;

  const MATERIAL_NAMES = {
    ore:'Copper', iron:'Deepvein Iron', hide:'Beast Hide', herb:'Briarleaf',
    mooncap:'Mooncap', mossglass:'Mossglass', resin:'Ironpine Resin', binding:'Warden Binding',
  };

  const WEAPON_NAMES = { sword:'Sword', bow:'Bow', staff:'Staff' };
  const MASTERWORK_KEYS = {
    sword:'temperedSword',
    bow:'briarstringBow',
    staff:'moonrootStaff',
  };

  const TRAITS = Object.freeze({
    sword:Object.freeze({
      forceful:Object.freeze({
        label:'Quarry Edge',
        effect:'+10% Sword + Cleave damage',
        req:Object.freeze({ iron:2, resin:1 }),
      }),
      swift:Object.freeze({
        label:'Warden Grip',
        effect:'-12% Sword attack recovery',
        req:Object.freeze({ hide:2, binding:1 }),
      }),
    }),
    bow:Object.freeze({
      forceful:Object.freeze({
        label:'Ironpoint Set',
        effect:'+10% Bow + Pierce damage',
        req:Object.freeze({ iron:1, ore:2, resin:1 }),
      }),
      swift:Object.freeze({
        label:'Briar Weave',
        effect:'-12% Bow attack recovery',
        req:Object.freeze({ herb:2, hide:1, binding:1 }),
      }),
    }),
    staff:Object.freeze({
      forceful:Object.freeze({
        label:'Mossglass Focus',
        effect:'+10% Staff + Root damage',
        req:Object.freeze({ mossglass:2, iron:1 }),
      }),
      swift:Object.freeze({
        label:'Mooncap Wrap',
        effect:'-12% Staff attack recovery',
        req:Object.freeze({ mooncap:2, herb:1, binding:1 }),
      }),
    }),
  });

  function amount(key) { return Number(player.inventory[key] || 0); }
  function has(req) { return Object.entries(req).every(([key,qty]) => amount(key) >= qty); }
  function spend(req) {
    if (!has(req)) return false;
    for (const [key,qty] of Object.entries(req)) player.inventory[key] = amount(key) - qty;
    return true;
  }
  function requirementText(req) {
    return Object.entries(req).map(([key,qty]) => `${qty} ${MATERIAL_NAMES[key] || key}`).join(' • ');
  }
  function traitFor(type = player.weaponType) { return progress.specialistTraits[type] || null; }
  function damageTraitMultiplier(type = player.weaponType) { return traitFor(type) === 'forceful' ? DAMAGE_MULTIPLIER : 1; }
  function recoveryTraitMultiplier(type = player.weaponType) { return traitFor(type) === 'swift' ? RECOVERY_MULTIPLIER : 1; }
  function masterworkReady(type) { return !!progress[MASTERWORK_KEYS[type]]; }

  const craftPanel = document.getElementById('craft-panel');
  const craftGrid = craftPanel?.querySelector('.craft-grid');
  const specialization = document.createElement('section');
  specialization.id = 'specialist31-finishing';
  specialization.className = 'crafting-status';
  specialization.setAttribute('aria-label','Masterwork finishing traits');
  specialization.innerHTML = '<strong>MASTERWORK FINISHING</strong><div id="specialist31-grid" class="craft-grid"></div>';
  if (craftGrid?.parentNode) craftGrid.parentNode.insertBefore(specialization, craftGrid.nextSibling);
  const traitGrid = document.getElementById('specialist31-grid');

  let renderKey = '';
  function render(force = false) {
    if (!traitGrid) return;
    const key = JSON.stringify({
      traits:progress.specialistTraits,
      upgrades:Object.fromEntries(Object.keys(MASTERWORK_KEYS).map(w => [w, masterworkReady(w)])),
      mats:Object.fromEntries(Object.keys(MATERIAL_NAMES).map(k => [k, amount(k)])),
    });
    if (!force && key === renderKey) return;
    renderKey = key;

    traitGrid.innerHTML = Object.entries(TRAITS).flatMap(([weapon,defs]) =>
      Object.entries(defs).map(([trait,def]) => {
        const selected = traitFor(weapon) === trait;
        const ready = masterworkReady(weapon);
        const affordable = has(def.req);
        const current = traitFor(weapon);
        const action = selected ? 'Selected' : current ? 'Reforge' : 'Finish';
        return `
          <div class="craft-item ${selected ? 'masterwork' : ''}">
            <strong>${WEAPON_NAMES[weapon]} • ${def.label}</strong>
            <p>${def.effect}</p>
            <small>${ready ? requirementText(def.req) : `Craft the ${WEAPON_NAMES[weapon]} masterwork first`}</small>
            <button type="button" data-specialist-weapon="${weapon}" data-specialist-trait="${trait}" ${selected || !ready || !affordable ? 'disabled' : ''}>${selected ? 'Selected' : `${action} • ${requirementText(def.req)}`}</button>
          </div>`;
      })
    ).join('');
  }

  function chooseTrait(weapon, trait) {
    const def = TRAITS[weapon]?.[trait];
    if (!def || !masterworkReady(weapon) || traitFor(weapon) === trait) return false;
    if (!spend(def.req)) {
      toast(`Needs ${requirementText(def.req)}`);
      return false;
    }
    const replacing = !!traitFor(weapon);
    progress.specialistTraits[weapon] = trait;
    spawnParticles(player.x, player.y, trait === 'forceful' ? '#d3a56f' : '#9fc4a1', 14, .55);
    addFloater(player.x, player.y - 26, `${WEAPON_NAMES[weapon].toUpperCase()} • ${def.label.toUpperCase()}`, trait === 'forceful' ? '#eed09b' : '#c7e0c4');
    toast(`${replacing ? 'Reforged' : 'Finished'} ${WEAPON_NAMES[weapon]} — ${def.label}`);
    saveGame();
    render(true);
    updateUI();
    return true;
  }

  specialization.addEventListener('click', event => {
    const button = event.target.closest?.('button[data-specialist-weapon]');
    if (!button) return;
    chooseTrait(button.dataset.specialistWeapon, button.dataset.specialistTrait);
  });

  // Canonical damageEnemy remains the runtime-owned wrapper. The trait changes only the mutable hook payload.
  runtime.registerHook('beforeDamageEnemy','build31-specialist-damage',payload=>{
    if (!payload || payload.cancel || !Number.isFinite(payload.amount)) return;
    payload.amount = Math.max(1, Math.round(payload.amount * damageTraitMultiplier(player.weaponType)));
  },25);

  // Attack is not a canonical runtime wrapper. Keep the late attack-layer adjustment narrow to recovery only.
  const priorAttack = attack;
  attack = function build31SpecialistAttack() {
    const type = player.weaponType;
    const before = player.attackCd;
    const result = priorAttack();
    if (before <= 0 && player.attackCd > 0 && recoveryTraitMultiplier(type) < 1) {
      player.attackCd *= recoveryTraitMultiplier(type);
    }
    return result;
  };

  // UI decoration also stays inside the canonical updateUI wrapper via its post-render hook.
  runtime.registerHook('afterUpdateUI','build31-specialist-ui',()=>{
    render();
    const current = traitFor(player.weaponType);
    if (current && ui.weapon) {
      const def = TRAITS[player.weaponType]?.[current];
      if (def && !ui.weapon.textContent.includes(def.label)) ui.weapon.textContent = `${ui.weapon.textContent} • ${def.label}`;
    }
  },1200);

  const basePreviewDamage = typeof debug.previewDamage === 'function' ? debug.previewDamage : (value => value);
  debug.chooseSpecialistTrait = (weapon, trait) => chooseTrait(weapon, trait);
  debug.previewSpecialistDamage = (value, type = player.weaponType) =>
    Math.max(1, Math.round(basePreviewDamage(value, type) * damageTraitMultiplier(type)));
  debug.getSpecialistCraftingState = () => ({
    traits:{...progress.specialistTraits},
    damageMultiplier:DAMAGE_MULTIPLIER,
    recoveryMultiplier:RECOVERY_MULTIPLIER,
    currentWeapon:player.weaponType,
    currentDamageMultiplier:damageTraitMultiplier(player.weaponType),
    currentRecoveryMultiplier:recoveryTraitMultiplier(player.weaponType),
    attackCd:player.attackCd,
    masterworks:Object.fromEntries(Object.entries(MASTERWORK_KEYS).map(([weapon,key]) => [weapon,!!progress[key]])),
    materials:Object.fromEntries(Object.keys(MATERIAL_NAMES).map(key => [key,amount(key)])),
    entityCounts:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
    baselineEntities:{...baselineEntities},
  });
  debug.attack = () => attack();

  render(true);
  updateUI();
})();
