(() => {
  'use strict';

  // Build 18: make Stonepine a repeatable part of the existing work/economy loop.
  // No second currency, no new power tier, and no rewrite of the private Build 12/14 modules.
  if (!progress.stonepineWork || typeof progress.stonepineWork !== 'object') {
    progress.stonepineWork = { active: false, kills: 0, completed: 0 };
  }
  if (!Number.isFinite(progress.stonepineWork.kills)) progress.stonepineWork.kills = 0;
  if (!Number.isFinite(progress.stonepineWork.completed)) progress.stonepineWork.completed = 0;
  if (typeof progress.stonepineWork.active !== 'boolean') progress.stonepineWork.active = false;

  if (!progress.stonepineSupply || typeof progress.stonepineSupply !== 'object') progress.stonepineSupply = {};
  const supply = progress.stonepineSupply;
  if (!Number.isFinite(supply.epoch)) supply.epoch = -1;
  if (!supply.purchases || typeof supply.purchases !== 'object') supply.purchases = {};
  if (typeof supply.commissionDone !== 'boolean') supply.commissionDone = false;
  if (!Number.isFinite(supply.coinsSpent)) supply.coinsSpent = 0;
  if (!Number.isFinite(supply.commissions)) supply.commissions = 0;
  if (!Number.isFinite(supply.services)) supply.services = 0;
  if (!Number.isFinite(player.inventory.resin)) player.inventory.resin = 0;
  if (!Number.isFinite(player.inventory.binding)) player.inventory.binding = 0;

  const WORK_ID = 'stonepine_quarry_patrol';
  const WORK = {
    title: 'Stonepine Quarry Patrol',
    kills: 2,
    resin: 2,
    rewardCoins: 135,
    rewardBinding: 1,
  };

  const SUPPLY_CYCLES = [
    {
      key: 'highland', name: 'STONEPINE • HIGHLAND SUPPLY', subtitle: 'Field stores for the upper trail', icon: '△',
      stock: [
        { id: 'resin_bundle', icon: '◆', title: 'Ironpine Resin Bundle', price: 120, grant: { resin: 2 }, note: 'Two sealed Resin measures from Rowan’s quarry stores.' },
        { id: 'pitch_oil_pair', icon: '◈', title: 'Pitch-Oil Pair', price: 145, grant: { oil: 2 }, note: 'Two ready Warden Oil flasks for Stonepine patrols.' },
        { id: 'stone_binding', icon: '⌁', title: 'Quarry Warden Binding', price: 85, grant: { binding: 1 }, note: 'A waxed binding packed for exposed highland work.' },
      ],
      commission: {
        id: 'highland_field_case', icon: '▣', title: 'Highland Field Case',
        req: { resin: 3, tonic: 1 }, reward: { coins: 90, hide: 1 },
        note: 'Seal Resin samples with a road tonic for the upper Warden stations.'
      },
    },
    {
      key: 'quarry', name: 'STONEPINE • QUARRY REPAIR', subtitle: 'Heavy repair and reinforcement stock', icon: '⚒',
      stock: [
        { id: 'stone_iron_bar', icon: '⬡', title: 'Deepvein Repair Bar', price: 150, grant: { iron: 1 }, note: 'One refined bar reserved for quarry reinforcement.' },
        { id: 'stone_hide_roll', icon: '▱', title: 'Highland Hide Roll', price: 90, grant: { hide: 2 }, note: 'Two weather-treated Beast Hides.' },
        { id: 'stone_binding', icon: '⌁', title: 'Quarry Warden Binding', price: 85, grant: { binding: 1 }, note: 'A waxed binding packed for exposed highland work.' },
      ],
      commission: {
        id: 'quarry_reinforcement', icon: '▰', title: 'Quarry Reinforcement Order',
        req: { resin: 2, iron: 1 }, reward: { coins: 120, binding: 1, mooncap: 1 },
        note: 'Trade Resin and refined iron for a mixed repair parcel instead of a pure coin payout.'
      },
    },
  ];

  const SERVICE = {
    id: 'pitch_sealed_pack', icon: '▣', title: 'Pitch-Sealed Expedition Pack', price: 65,
    req: { resin: 2, hide: 1 }, grant: { tonic: 2, oil: 2 },
    note: 'Use Ironpine pitch and treated hide to double-pack field medicine and weapon oil.'
  };

  const NAMES = {
    resin: 'Ironpine Resin', oil: 'Warden Oil', binding: 'Warden Binding', iron: 'Deepvein Iron',
    hide: 'Beast Hide', tonic: 'Healing Tonic', mooncap: 'Mooncap',
  };

  const inventoryGrid = document.querySelector('#inventory-panel .inventory-grid');
  let resinCount = document.getElementById('panel-resin-count');
  if (inventoryGrid && !resinCount) {
    const item = document.createElement('div');
    item.className = 'inventory-item stonepine-inventory-item';
    item.innerHTML = '<span class="item-icon">◆</span><span><strong>Ironpine Resin</strong><small>Stonepine field material</small></span><b id="panel-resin-count">0</b>';
    inventoryGrid.appendChild(item);
    resinCount = document.getElementById('panel-resin-count');
  }

  function workUnlocked() {
    return !!progress.stonepineCacheClaimed;
  }

  function workReady() {
    return progress.stonepineWork.active && progress.stonepineWork.kills >= WORK.kills && (player.inventory.resin || 0) >= WORK.resin;
  }

  function otherBoardWorkActive() {
    return !!progress.activeBoardContract;
  }

  function acceptStonepineWork() {
    if (!workUnlocked() || progress.stonepineWork.active || otherBoardWorkActive()) return false;
    progress.stonepineWork.active = true;
    progress.stonepineWork.kills = 0;
    toast(`Contract accepted — ${WORK.title}`);
    saveGame();
    syncStonepineBoard(true);
    updateUI();
    return true;
  }

  function turnInStonepineWork() {
    if (!workReady()) return false;
    player.inventory.resin -= WORK.resin;
    player.coins += WORK.rewardCoins;
    player.inventory.binding = (player.inventory.binding || 0) + WORK.rewardBinding;
    progress.stonepineWork.active = false;
    progress.stonepineWork.kills = 0;
    progress.stonepineWork.completed += 1;
    progress.boardContractsCompleted = (progress.boardContractsCompleted || 0) + 1;
    if (!progress.boardContractCounts || typeof progress.boardContractCounts !== 'object') progress.boardContractCounts = {};
    progress.boardContractCounts[WORK_ID] = (progress.boardContractCounts[WORK_ID] || 0) + 1;
    spawnParticles(-615, -118, '#d0ad70', 18, .65);
    addFloater(-615, -138, `+${WORK.rewardCoins} c • WARDEN BINDING`, '#efd69b');
    toast(`Contract complete — ${WORK.title}`);
    syncSupplyEpoch();
    saveGame();
    window.__BRIAR_GLENDebug?.refreshMarket?.();
    syncStonepineBoard(true);
    updateUI();
    return true;
  }

  let lastBoardSignature = '';
  function boardSignature() {
    return JSON.stringify({
      unlocked: workUnlocked(), active: progress.stonepineWork.active,
      kills: progress.stonepineWork.kills, resin: player.inventory.resin || 0,
      other: progress.activeBoardContract?.id || null, completed: progress.stonepineWork.completed,
      boardCompleted: progress.boardContractsCompleted || 0,
    });
  }

  function workCardHtml() {
    const active = progress.stonepineWork.active;
    const blocked = otherBoardWorkActive();
    const ready = workReady();
    const action = active ? (ready ? 'Turn In Contract' : 'Not Ready') : (blocked ? 'Finish Current Job' : 'Accept Contract');
    return `
      <article class="board2-card stonepine-work-card ${active ? 'active' : ''}" data-contract-id="${WORK_ID}">
        <div class="board2-card-top"><span class="board2-contract-icon">△</span><span>STONEPINE</span></div>
        <h3>${WORK.title}</h3>
        <p>Clear two ordinary Stonepine threats and return two Ironpine Resin to the Briar Glen wardens.</p>
        <dl>
          <div><dt>Requirement</dt><dd>${Math.min(progress.stonepineWork.kills,2)} / 2 threats • ${Math.min(player.inventory.resin || 0,2)} / 2 Resin</dd></div>
          <div><dt>Reward</dt><dd>${WORK.rewardCoins} coins + 1 Warden Binding</dd></div>
        </dl>
        <button class="board2-accept" type="button" data-stonepine-work-action ${(!active && !blocked) || ready ? '' : 'disabled'}>${action}</button>
      </article>`;
  }

  function syncStonepineBoard(force = false) {
    const panel = document.getElementById('board2-panel');
    const grid = document.getElementById('board2-grid');
    const activeEl = document.getElementById('board2-active');
    if (!panel || !grid || !activeEl || !workUnlocked()) return;
    const signature = boardSignature();
    const missing = !grid.querySelector(`[data-contract-id="${WORK_ID}"]`);
    if (!force && signature === lastBoardSignature && !missing) return;
    lastBoardSignature = signature;

    grid.querySelector(`[data-contract-id="${WORK_ID}"]`)?.remove();
    grid.insertAdjacentHTML('beforeend', workCardHtml());

    const baseButtons = [...grid.querySelectorAll('[data-accept]')];
    if (progress.stonepineWork.active) {
      for (const button of baseButtons) button.disabled = true;
      activeEl.innerHTML = `
        <div class="board2-active-copy" data-build18-active="stonepine">
          <span class="board2-contract-icon">△</span>
          <div><div class="eyebrow">ACTIVE CONTRACT</div><strong>${WORK.title}</strong>
          <p>Patrol Stonepine Reach, clear two ordinary threats, and return two Resin.</p>
          <small>${Math.min(progress.stonepineWork.kills,2)} / 2 THREATS • ${Math.min(player.inventory.resin || 0,2)} / 2 IRONPINE RESIN</small></div>
        </div>
        <button type="button" data-stonepine-work-action ${workReady() ? '' : 'disabled'}>${workReady() ? 'Turn In Contract' : 'Not Ready'}</button>`;
    } else if (!otherBoardWorkActive() && activeEl.querySelector('[data-build18-active="stonepine"]')) {
      activeEl.innerHTML = '<div class="board2-active-empty"><span class="board2-seal">◇</span><div><strong>No active Warden contract</strong><small>Choose one of the posted jobs below.</small></div></div>';
    }
  }

  document.getElementById('board2-panel')?.addEventListener('click', event => {
    const action = event.target.closest('[data-stonepine-work-action]');
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    if (progress.stonepineWork.active) turnInStonepineWork();
    else acceptStonepineWork();
  });

  const build17KillEnemy = killEnemy;
  killEnemy = function build18KillEnemy(e) {
    if (!e || e.dead) return;
    const counts = progress.stonepineWork.active && ['ridgehorn','quarrywisp'].includes(e.type);
    build17KillEnemy(e);
    if (counts && e.dead && progress.stonepineWork.active) {
      progress.stonepineWork.kills = Math.min(WORK.kills, progress.stonepineWork.kills + 1);
      if (progress.stonepineWork.kills === WORK.kills) toast('Stonepine Quarry Patrol: threats cleared — return 2 Ironpine Resin');
      saveGame();
      lastBoardSignature = '';
    }
  };

  const tradePanel = document.getElementById('trade-panel');
  const annex = document.createElement('section');
  annex.id = 'stonepine-supply-manifest';
  annex.innerHTML = `
    <div class="market14-heading">
      <div><div class="eyebrow">ROWAN • STONEPINE MANIFEST</div><h3 id="stone18-cycle">Stonepine Supply</h3><p id="stone18-subtitle"></p></div>
      <div class="market14-ledger"><b id="stone18-spent">0 c spent</b><small id="stone18-orders">0 commissions</small></div>
    </div>
    <div class="market14-section-title"><span>STONEPINE STOCK</span><small>Restocks after the next Warden Board job</small></div>
    <div id="stone18-stock" class="market14-grid"></div>
    <div class="market14-section-title"><span>PITCH SERVICE</span><small>Repeatable Resin + coin sink</small></div>
    <div id="stone18-service" class="market14-grid services"></div>
    <div class="market14-section-title"><span>STONEPINE COMMISSION</span><small>One material order per Board cycle</small></div>
    <div id="stone18-commission"></div>`;
  tradePanel?.appendChild(annex);

  const cycleEl = document.getElementById('stone18-cycle');
  const subtitleEl = document.getElementById('stone18-subtitle');
  const spentEl = document.getElementById('stone18-spent');
  const ordersEl = document.getElementById('stone18-orders');
  const stockEl = document.getElementById('stone18-stock');
  const serviceEl = document.getElementById('stone18-service');
  const commissionEl = document.getElementById('stone18-commission');

  function currentSupplyEpoch() {
    return Math.max(0, Math.floor(progress.boardContractsCompleted || 0));
  }
  function currentSupplyCycle() {
    return SUPPLY_CYCLES[currentSupplyEpoch() % SUPPLY_CYCLES.length];
  }
  function syncSupplyEpoch() {
    const epoch = currentSupplyEpoch();
    if (supply.epoch === epoch) return false;
    supply.epoch = epoch;
    supply.purchases = {};
    supply.commissionDone = false;
    return true;
  }
  syncSupplyEpoch();

  function amount(key) { return Number(player.inventory[key] || 0); }
  function has(req = {}) { return Object.entries(req).every(([key,qty]) => amount(key) >= qty); }
  function consume(req = {}) { if (!has(req)) return false; for (const [key,qty] of Object.entries(req)) player.inventory[key] = amount(key) - qty; return true; }
  function grant(items = {}) { for (const [key,qty] of Object.entries(items)) player.inventory[key] = amount(key) + qty; }
  function reqText(req = {}) { return Object.entries(req).map(([key,qty]) => `${qty} ${NAMES[key] || key}`).join(' + '); }
  function grantText(items = {}) { return Object.entries(items).map(([key,qty]) => `${qty} ${NAMES[key] || key}`).join(' + '); }
  function rewardText(reward = {}) {
    const parts = reward.coins ? [`${reward.coins} coins`] : [];
    for (const [key,qty] of Object.entries(reward)) if (key !== 'coins' && qty) parts.push(`${qty} ${NAMES[key] || key}`);
    return parts.join(' + ');
  }

  function spend(price) {
    if (player.coins < price) { toast(`Rowan needs ${price} coins`); return false; }
    player.coins -= price; supply.coinsSpent += price; return true;
  }

  function buyStonepineStock(id) {
    syncSupplyEpoch();
    if (!workUnlocked()) return false;
    const item = currentSupplyCycle().stock.find(x => x.id === id);
    if (!item || supply.purchases[id] || player.coins < item.price) return false;
    if (!spend(item.price)) return false;
    grant(item.grant); supply.purchases[id] = true;
    spawnParticles(player.x,player.y,'#c99e65',10,.42);
    addFloater(player.x,player.y-16,`-${item.price} c • ${grantText(item.grant).toUpperCase()}`,'#e7c98d');
    toast(`${item.title} purchased`);
    saveGame(); renderStonepineSupply(true); updateUI(); return true;
  }

  function runPitchService() {
    if (!workUnlocked() || !has(SERVICE.req) || player.coins < SERVICE.price) return false;
    consume(SERVICE.req); if (!spend(SERVICE.price)) return false;
    grant(SERVICE.grant); supply.services += 1;
    spawnParticles(player.x,player.y,'#9fb48b',12,.48);
    addFloater(player.x,player.y-16,'TONIC ×2 • OIL ×2','#c8dda7');
    toast('Pitch-Sealed Expedition Pack complete');
    saveGame(); renderStonepineSupply(true); updateUI(); return true;
  }

  function turnInStonepineCommission() {
    syncSupplyEpoch();
    if (!workUnlocked() || supply.commissionDone) return false;
    const order = currentSupplyCycle().commission;
    if (!has(order.req)) return false;
    consume(order.req);
    player.coins += order.reward.coins || 0;
    const itemReward = { ...order.reward }; delete itemReward.coins; grant(itemReward);
    supply.commissionDone = true; supply.commissions += 1;
    spawnParticles(player.x,player.y,'#d0ad70',13,.55);
    addFloater(player.x,player.y-18,rewardText(order.reward).toUpperCase(),'#efd49a');
    toast(`Stonepine commission complete — ${order.title}`);
    saveGame(); renderStonepineSupply(true); updateUI(); return true;
  }

  let lastSupplySignature = '';
  function supplySignature() {
    return JSON.stringify({
      epoch: currentSupplyEpoch(), unlocked: workUnlocked(), purchases: supply.purchases,
      commission: supply.commissionDone, spent: supply.coinsSpent, orders: supply.commissions,
      services: supply.services, coins: player.coins,
      inv: { resin:amount('resin'),oil:amount('oil'),binding:amount('binding'),iron:amount('iron'),hide:amount('hide'),tonic:amount('tonic'),mooncap:amount('mooncap') },
    });
  }

  function renderStonepineSupply(force = false) {
    syncSupplyEpoch();
    if (!annex || !stockEl || !serviceEl || !commissionEl) return;
    const signature = supplySignature();
    if (!force && signature === lastSupplySignature) return;
    lastSupplySignature = signature;
    const cycle = currentSupplyCycle();
    annex.hidden = !workUnlocked();
    if (!workUnlocked()) return;
    cycleEl.textContent = `${cycle.icon} ${cycle.name}`;
    subtitleEl.textContent = `${cycle.subtitle} • Board cycle ${supply.epoch + 1}`;
    spentEl.textContent = `${supply.coinsSpent} c spent`;
    ordersEl.textContent = `${supply.commissions} commission${supply.commissions === 1 ? '' : 's'} • ${supply.services} service${supply.services === 1 ? '' : 's'}`;
    stockEl.innerHTML = cycle.stock.map(item => {
      const sold = !!supply.purchases[item.id];
      return `<article class="market14-card ${sold?'sold':''}"><div class="market14-card-top"><span>${item.icon}</span><small>1 PER BOARD CYCLE</small></div><strong>${item.title}</strong><p>${item.note}</p><div class="market14-yield">Receive • ${grantText(item.grant)}</div><button type="button" data-stone-buy="${item.id}" ${sold || player.coins < item.price ? 'disabled' : ''}>${sold?'Sold this cycle':`Buy • ${item.price} c`}</button></article>`;
    }).join('');
    const serviceReady = has(SERVICE.req) && player.coins >= SERVICE.price;
    serviceEl.innerHTML = `<article class="market14-card service"><div class="market14-card-top"><span>${SERVICE.icon}</span><small>REPEATABLE</small></div><strong>${SERVICE.title}</strong><p>${SERVICE.note}</p><div class="market14-cost">Cost • ${SERVICE.price} c + ${reqText(SERVICE.req)}</div><div class="market14-yield">Receive • ${grantText(SERVICE.grant)}</div><button type="button" data-stone-service ${serviceReady?'':'disabled'}>Use Service</button></article>`;
    const order = cycle.commission;
    const ready = !supply.commissionDone && has(order.req);
    commissionEl.innerHTML = `<article class="market14-commission ${supply.commissionDone?'complete':''}"><span class="market14-commission-icon">${order.icon}</span><div><div class="eyebrow">${cycle.name}</div><strong>${order.title}</strong><p>${order.note}</p><small>Deliver • ${reqText(order.req)}</small><small>Reward • ${rewardText(order.reward)}</small></div><button type="button" data-stone-commission ${ready?'':'disabled'}>${supply.commissionDone?'Completed this cycle':ready?'Deliver Commission':'Materials Needed'}</button></article>`;
  }

  annex?.addEventListener('click', event => {
    const buy = event.target.closest('[data-stone-buy]');
    if (buy) { buyStonepineStock(buy.dataset.stoneBuy); return; }
    if (event.target.closest('[data-stone-service]')) { runPitchService(); return; }
    if (event.target.closest('[data-stone-commission]')) turnInStonepineCommission();
  });

  function syncJournalIntegration() {
    const target = document.getElementById('journal-milestones');
    if (!target) return;
    let workRow = target.querySelector('[data-build18="stone-work"]');
    if (!workRow) { workRow = document.createElement('div'); workRow.dataset.build18='stone-work'; target.appendChild(workRow); }
    workRow.className = `journal-row ${progress.stonepineWork.completed > 0 ? 'done' : 'locked'}`;
    workRow.innerHTML = `<span>${progress.stonepineWork.completed > 0?'✓':'•'}</span><b>${progress.stonepineWork.completed > 0 ? `Stonepine Quarry Patrols completed: ${progress.stonepineWork.completed}` : 'Stonepine Quarry Patrol work'}</b>`;
    let marketRow = target.querySelector('[data-build18="stone-market"]');
    if (!marketRow) { marketRow = document.createElement('div'); marketRow.dataset.build18='stone-market'; target.appendChild(marketRow); }
    const engaged = supply.coinsSpent > 0 || supply.commissions > 0 || supply.services > 0;
    marketRow.className = `journal-row ${engaged?'done':'locked'}`;
    marketRow.innerHTML = `<span>${engaged?'✓':'•'}</span><b>${engaged ? `Stonepine market: ${supply.coinsSpent} c spent • ${supply.commissions} commissions` : 'Stonepine supply manifest'}</b>`;
  }

  const build17ObjectiveText = objectiveText;
  objectiveText = function build18ObjectiveText() {
    if (!progress.stonepineWork.active) return build17ObjectiveText();
    if (workReady()) return `${WORK.title} is ready to turn in at the Contract Board.`;
    if (progress.stonepineWork.kills < WORK.kills) return `${WORK.title}: clear two ordinary Stonepine threats.`;
    return `${WORK.title}: return two Ironpine Resin to Briar Glen.`;
  };
  const build17ObjectiveProgress = objectiveProgress;
  objectiveProgress = function build18ObjectiveProgress() {
    if (!progress.stonepineWork.active) return build17ObjectiveProgress();
    return `STONEPINE PATROL • ${Math.min(progress.stonepineWork.kills,2)} / 2 THREATS • ${Math.min(player.inventory.resin || 0,2)} / 2 RESIN`;
  };

  const build17Interact = interact;
  interact = function build18Interact() {
    const result = build17Interact();
    if (!document.getElementById('board2-panel')?.hidden) syncStonepineBoard(true);
    return result;
  };

  const build17UpdateUI = updateUI;
  updateUI = function build18UpdateUI() {
    build17UpdateUI();
    if (resinCount) resinCount.textContent = player.inventory.resin || 0;
    if (progress.stonepineWork.active && ui.questTitle) ui.questTitle.textContent = WORK.title;
    syncStonepineBoard();
    syncJournalIntegration();
    if (tradePanel && !tradePanel.hidden) renderStonepineSupply();
  };

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.acceptStonepineWork = acceptStonepineWork;
    window.__BRIAR_GLENDebug.turnInStonepineWork = turnInStonepineWork;
    window.__BRIAR_GLENDebug.buyStonepineStock = buyStonepineStock;
    window.__BRIAR_GLENDebug.runStonepineService = runPitchService;
    window.__BRIAR_GLENDebug.turnInStonepineCommission = turnInStonepineCommission;
    window.__BRIAR_GLENDebug.refreshStonepineSupply = () => { lastSupplySignature=''; renderStonepineSupply(true); return window.__BRIAR_GLENDebug.getStonepineIntegrationState(); };
    window.__BRIAR_GLENDebug.getStonepineIntegrationState = () => {
      syncSupplyEpoch();
      const cycle = currentSupplyCycle();
      return {
        work: { ...progress.stonepineWork, ready: workReady(), unlocked: workUnlocked() },
        boardCompleted: progress.boardContractsCompleted || 0,
        count: progress.boardContractCounts?.[WORK_ID] || 0,
        supply: {
          epoch: supply.epoch, cycle: cycle.key, cycleName: cycle.name,
          offers: cycle.stock.map(x=>x.id), purchases:{...supply.purchases},
          commission: cycle.commission.id, commissionDone:supply.commissionDone,
          coinsSpent:supply.coinsSpent, commissions:supply.commissions, services:supply.services,
        },
        coins: player.coins,
        inventory: { resin:amount('resin'),oil:amount('oil'),binding:amount('binding'),iron:amount('iron'),hide:amount('hide'),tonic:amount('tonic'),mooncap:amount('mooncap') },
      };
    };
  }

  renderStonepineSupply(true);
  updateUI();
})();