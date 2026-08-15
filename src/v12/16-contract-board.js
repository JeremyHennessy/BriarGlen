(() => {
  'use strict';

  // Build 12: repeatable Contract Board work. Additive over Builds 2–11.
  const board = { open: false };

  if (!Number.isFinite(progress.boardContractsCompleted)) progress.boardContractsCompleted = 0;
  if (!progress.boardContractCounts || typeof progress.boardContractCounts !== 'object') {
    progress.boardContractCounts = {};
  }
  if (!progress.activeBoardContract || typeof progress.activeBoardContract !== 'object') {
    progress.activeBoardContract = null;
  }

  const CONTRACTS = {
    briar_cull: {
      id: 'briar_cull', type: 'hunt', title: 'Cull the Briar', icon: '⚔',
      description: 'Clear three ordinary threats from the roads, Hollow, Grove or Fen.',
      goal: 3, reward: { coins: 80, tonic: 1 },
    },
    copper_order: {
      id: 'copper_order', type: 'delivery', title: 'Copper Order', icon: '◆',
      description: 'Supply three Copper to Briar Glen’s repair crews.',
      req: { ore: 3 }, reward: { coins: 95 },
    },
    field_medicine: {
      id: 'field_medicine', type: 'delivery', title: 'Field Medicine', icon: '✚',
      description: 'Deliver one Healing Tonic and one Briarleaf for the road wardens.',
      req: { tonic: 1, herb: 1 }, reward: { coins: 110 },
    },
    mosswater_survey: {
      id: 'mosswater_survey', type: 'delivery', title: 'Mosswater Survey', icon: '≈',
      description: 'Bring back two Mossglass samples from Mosswater Fen.',
      req: { mossglass: 2 }, reward: { coins: 150, oil: 1 }, fen: true,
    },
  };

  const materialNames = {
    ore: 'Copper', herb: 'Briarleaf', tonic: 'Healing Tonic',
    mossglass: 'Mossglass', oil: 'Warden Oil',
  };

  function availableOfferIds() {
    const completed = progress.boardContractsCompleted || 0;
    if (progress.fenDiscovered) {
      return completed % 2 === 0
        ? ['briar_cull', 'copper_order', 'mosswater_survey']
        : ['briar_cull', 'field_medicine', 'mosswater_survey'];
    }
    return ['briar_cull', 'copper_order', 'field_medicine'];
  }

  function activeContract() {
    const active = progress.activeBoardContract;
    if (!active || !CONTRACTS[active.id]) return null;
    if (!Number.isFinite(active.kills)) active.kills = 0;
    return active;
  }

  function hasMaterials(req = {}) {
    return Object.entries(req).every(([key, qty]) => (player.inventory[key] || 0) >= qty);
  }

  function contractReady(contract = activeContract()) {
    if (!contract) return false;
    const def = CONTRACTS[contract.id];
    if (def.type === 'hunt') return (contract.kills || 0) >= def.goal;
    return hasMaterials(def.req);
  }

  function progressText(contract = activeContract()) {
    if (!contract) return '';
    const def = CONTRACTS[contract.id];
    if (def.type === 'hunt') return `${Math.min(contract.kills || 0, def.goal)} / ${def.goal} THREATS`;
    return Object.entries(def.req).map(([key, qty]) =>
      `${Math.min(player.inventory[key] || 0, qty)} / ${qty} ${materialNames[key].toUpperCase()}`
    ).join(' • ');
  }

  function requirementText(def) {
    if (def.type === 'hunt') return `Defeat ${def.goal} ordinary threats`;
    return Object.entries(def.req)
      .map(([key, qty]) => `${qty} ${materialNames[key]}`)
      .join(' + ');
  }

  function rewardText(def) {
    const parts = [];
    if (def.reward.coins) parts.push(`${def.reward.coins} coins`);
    if (def.reward.tonic) parts.push(`${def.reward.tonic} Healing Tonic`);
    if (def.reward.oil) parts.push(`${def.reward.oil} Warden Oil`);
    return parts.join(' + ');
  }

  const shell = document.getElementById('game-shell');
  const backdrop = document.createElement('div');
  backdrop.id = 'board2-backdrop';
  backdrop.hidden = true;
  shell.appendChild(backdrop);

  const panel = document.createElement('section');
  panel.id = 'board2-panel';
  panel.className = 'panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Briar Glen Contract Board');
  panel.innerHTML = `
    <header class="board2-header">
      <div>
        <div class="eyebrow">BRIAR GLEN • WARDEN WORK</div>
        <h2>Contract Board</h2>
        <p>Choose one job. Finish it, report back, then take another.</p>
      </div>
      <button id="board2-close" class="board2-close" type="button" aria-label="Close Contract Board">×</button>
    </header>
    <section id="board2-active" class="board2-active"></section>
    <div class="board2-section-title"><span>AVAILABLE WORK</span><small id="board2-stats"></small></div>
    <div id="board2-grid" class="board2-grid"></div>
  `;
  shell.appendChild(panel);

  const closeBtn = document.getElementById('board2-close');
  const activeEl = document.getElementById('board2-active');
  const gridEl = document.getElementById('board2-grid');
  const statsEl = document.getElementById('board2-stats');

  function renderActive() {
    const active = activeContract();
    if (!active) {
      activeEl.innerHTML = `
        <div class="board2-active-empty">
          <span class="board2-seal">◇</span>
          <div><strong>No active Warden contract</strong><small>Choose one of the posted jobs below.</small></div>
        </div>`;
      return;
    }
    const def = CONTRACTS[active.id];
    const ready = contractReady(active);
    activeEl.innerHTML = `
      <div class="board2-active-copy">
        <span class="board2-contract-icon">${def.icon}</span>
        <div>
          <div class="eyebrow">ACTIVE CONTRACT</div>
          <strong>${def.title}</strong>
          <p>${def.description}</p>
          <small>${progressText(active)}</small>
        </div>
      </div>
      <button id="board2-turnin" type="button" ${ready ? '' : 'disabled'}>${ready ? 'Turn In Contract' : 'Not Ready'}</button>`;
    document.getElementById('board2-turnin')?.addEventListener('click', turnInActiveContract);
  }

  function renderOffers() {
    const active = activeContract();
    const ids = availableOfferIds();
    gridEl.innerHTML = ids.map(id => {
      const def = CONTRACTS[id];
      const selected = active?.id === id;
      const disabled = !!active;
      return `
        <article class="board2-card ${selected ? 'active' : ''}" data-contract-id="${id}">
          <div class="board2-card-top"><span class="board2-contract-icon">${def.icon}</span><span>${def.type === 'hunt' ? 'HUNT' : 'DELIVERY'}</span></div>
          <h3>${def.title}</h3>
          <p>${def.description}</p>
          <dl><div><dt>Requirement</dt><dd>${requirementText(def)}</dd></div><div><dt>Reward</dt><dd>${rewardText(def)}</dd></div></dl>
          <button class="board2-accept" type="button" data-accept="${id}" ${disabled ? 'disabled' : ''}>${selected ? 'Active' : disabled ? 'Finish Current Job' : 'Accept Contract'}</button>
        </article>`;
    }).join('');
    gridEl.querySelectorAll('[data-accept]').forEach(button => {
      button.addEventListener('click', () => acceptContract(button.dataset.accept));
    });
    statsEl.textContent = `${progress.boardContractsCompleted || 0} jobs completed`;
  }

  function renderBoard() {
    if (!panel) return;
    renderActive();
    renderOffers();
  }

  function openBoard() {
    if (!progress.fenCacheClaimed) return false;
    board.open = true;
    keys.clear();
    panel.hidden = false;
    backdrop.hidden = false;
    renderBoard();
    return true;
  }

  function closeBoard() {
    board.open = false;
    panel.hidden = true;
    backdrop.hidden = true;
    return true;
  }

  function acceptContract(id) {
    if (activeContract() || !availableOfferIds().includes(id) || !CONTRACTS[id]) return false;
    progress.activeBoardContract = { id, kills: 0 };
    toast(`Contract accepted — ${CONTRACTS[id].title}`);
    saveGame();
    renderBoard();
    updateUI();
    return true;
  }

  function spendMaterials(req = {}) {
    if (!hasMaterials(req)) return false;
    for (const [key, qty] of Object.entries(req)) player.inventory[key] -= qty;
    return true;
  }

  function grantReward(def) {
    player.coins += def.reward.coins || 0;
    player.inventory.tonic = (player.inventory.tonic || 0) + (def.reward.tonic || 0);
    player.inventory.oil = (player.inventory.oil || 0) + (def.reward.oil || 0);
  }

  function turnInActiveContract() {
    const active = activeContract();
    if (!active || !contractReady(active)) return false;
    const def = CONTRACTS[active.id];
    if (def.type === 'delivery' && !spendMaterials(def.req)) return false;

    grantReward(def);
    progress.boardContractsCompleted = (progress.boardContractsCompleted || 0) + 1;
    progress.boardContractCounts[def.id] = (progress.boardContractCounts[def.id] || 0) + 1;
    progress.activeBoardContract = null;
    spawnParticles(-615, -118, '#d8bc78', 18, .7);
    addFloater(-615, -138, `+${def.reward.coins || 0} c • CONTRACT COMPLETE`, '#f2d99a');
    toast(`Contract complete — ${def.title}`);
    saveGame();
    renderBoard();
    updateUI();
    return true;
  }

  const QUALIFYING_THREATS = new Set(['wolf', 'boar', 'mireling', 'bogstalker']);
  const build11KillEnemy = killEnemy;
  killEnemy = function build12KillEnemy(e) {
    if (!e || e.dead) return;
    const active = activeContract();
    const counts = active?.id === 'briar_cull' && QUALIFYING_THREATS.has(e.type);
    build11KillEnemy(e);
    if (counts && e.dead && activeContract()?.id === 'briar_cull') {
      const current = activeContract();
      current.kills = Math.min(CONTRACTS.briar_cull.goal, (current.kills || 0) + 1);
      if (current.kills === CONTRACTS.briar_cull.goal) toast('Cull the Briar complete — report to the Contract Board');
      saveGame();
    }
  };

  const build11Interact = interact;
  interact = function build12Interact() {
    if (board.open) return;
    const near = nearestInteractable();
    if (near?.kind === 'board' && progress.fenCacheClaimed) {
      openBoard();
      return;
    }
    return build11Interact();
  };

  const build11Attack = attack;
  attack = function build12Attack() {
    if (board.open) return;
    return build11Attack();
  };

  const build11Dash = dash;
  dash = function build12Dash() {
    if (board.open) return;
    return build11Dash();
  };

  const build11ObjectiveText = objectiveText;
  objectiveText = function build12ObjectiveText() {
    if (!progress.fenCacheClaimed) return build11ObjectiveText();
    const active = activeContract();
    if (!active) return 'Briar Glen’s Contract Board has independent Warden work available.';
    const def = CONTRACTS[active.id];
    if (contractReady(active)) return `${def.title} is ready to turn in at the Contract Board.`;
    if (def.type === 'hunt') return `${def.title}: clear ordinary threats and return to Briar Glen.`;
    return `${def.title}: gather the requested supplies and return to the Contract Board.`;
  };

  const build11ObjectiveProgress = objectiveProgress;
  objectiveProgress = function build12ObjectiveProgress() {
    if (!progress.fenCacheClaimed) return build11ObjectiveProgress();
    const active = activeContract();
    if (!active) return `${progress.boardContractsCompleted || 0} BOARD JOBS COMPLETE • 3 OFFERS POSTED`;
    return `${CONTRACTS[active.id].title.toUpperCase()} • ${progressText(active)}`;
  };

  const build11Update = update;
  update = function build12Update(dt) {
    if (board.open) {
      updateUI();
      return;
    }
    build11Update(dt);
  };

  function syncJournalBoardWork() {
    const target = document.getElementById('journal-milestones');
    if (!target) return;
    let row = target.querySelector('[data-build12="board-work"]');
    if (!row) {
      row = document.createElement('div');
      row.dataset.build12 = 'board-work';
      target.appendChild(row);
    }
    const completed = progress.boardContractsCompleted || 0;
    row.className = `journal-row ${completed > 0 ? 'done' : 'locked'}`;
    row.innerHTML = `<span>${completed > 0 ? '✓' : '•'}</span><b>${completed > 0 ? `Warden Board jobs completed: ${completed}` : 'Independent Warden work available'}</b>`;
  }

  const build11UpdateUI = updateUI;
  updateUI = function build12UpdateUI() {
    build11UpdateUI();
    if (progress.fenCacheClaimed && ui.questTitle) {
      const active = activeContract();
      ui.questTitle.textContent = active ? CONTRACTS[active.id].title : 'Warden Contracts';
    }
    const near = nearestInteractable();
    if (near?.kind === 'board' && progress.fenCacheClaimed) {
      ui.context.textContent = activeContract()
        ? 'USE • Review active Warden contract'
        : 'USE • Browse Warden contracts';
    }
    syncJournalBoardWork();
  };

  const blockedKeys = new Set(['Space','KeyF','KeyI','KeyC','KeyQ','KeyM','KeyL','ShiftLeft','ShiftRight','KeyE']);
  addEventListener('keydown', event => {
    if (!board.open) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeBoard();
      return;
    }
    if (blockedKeys.has(event.code)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { capture: true });

  document.addEventListener('pointerdown', event => {
    if (!board.open) return;
    if ([ui.attack, ui.dash, ui.interact, ui.skill, ui.weaponCycle, ui.potionBtn].includes(event.target)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, { capture: true });

  backdrop.addEventListener('pointerdown', closeBoard);
  closeBtn.addEventListener('click', closeBoard);

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.interact = () => interact();
    window.__BRIAR_GLENDebug.openBoard = () => openBoard();
    window.__BRIAR_GLENDebug.closeBoard = () => closeBoard();
    window.__BRIAR_GLENDebug.acceptBoardContract = id => acceptContract(id);
    window.__BRIAR_GLENDebug.turnInBoardContract = () => turnInActiveContract();
    window.__BRIAR_GLENDebug.defeatBoardThreat = () => {
      const enemy = enemies.find(e => !e.dead && QUALIFYING_THREATS.has(e.type));
      if (!enemy) return false;
      damageEnemy(enemy, enemy.hp + 9999, { bypassShield: true });
      return true;
    };
    window.__BRIAR_GLENDebug.getBoardState = () => {
      const active = activeContract();
      return {
        open: board.open,
        active: active ? { ...active, title: CONTRACTS[active.id].title, ready: contractReady(active), progress: progressText(active) } : null,
        completed: progress.boardContractsCompleted || 0,
        counts: { ...progress.boardContractCounts },
        offers: availableOfferIds(),
        coins: player.coins,
        inventory: {
          ore: player.inventory.ore || 0,
          herb: player.inventory.herb || 0,
          tonic: player.inventory.tonic || 0,
          mossglass: player.inventory.mossglass || 0,
          oil: player.inventory.oil || 0,
        },
      };
    };
  }

  updateUI();
})();
