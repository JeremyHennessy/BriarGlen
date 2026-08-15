(() => {
  'use strict';

  // Build 14: repeatable single-currency economy over the verified Build 13 runtime.
  // Rowan's market rotates after each completed Warden Board job and offers finite stock,
  // repeatable refinement services, mixed-reward material commissions and one specialty component.

  if (!Number.isFinite(player.inventory.binding)) player.inventory.binding = 0;
  if (!progress.marketLedger || typeof progress.marketLedger !== 'object') progress.marketLedger = {};

  const ledger = progress.marketLedger;
  if (!Number.isFinite(ledger.epoch)) ledger.epoch = -1;
  if (!ledger.purchases || typeof ledger.purchases !== 'object') ledger.purchases = {};
  if (typeof ledger.commissionDone !== 'boolean') ledger.commissionDone = false;
  if (!Number.isFinite(ledger.coinsSpent)) ledger.coinsSpent = 0;
  if (!Number.isFinite(ledger.ordersCompleted)) ledger.ordersCompleted = 0;
  if (!Number.isFinite(ledger.serviceUses)) ledger.serviceUses = 0;

  const NAMES = {
    herb: 'Briarleaf', mooncap: 'Mooncap', ore: 'Copper', hide: 'Beast Hide',
    tonic: 'Healing Tonic', oil: 'Warden Oil', iron: 'Deepvein Iron',
    mossglass: 'Mossglass', binding: 'Waxed Warden Binding',
  };

  const MARKET_CYCLES = [
    {
      key: 'road', name: 'ROAD PROVISIONING', subtitle: 'Meadow and Grove supplies', icon: '🌿',
      stock: [
        { id: 'briarleaf_parcel', title: 'Briarleaf Parcel', icon: '🌿', price: 60, grant: { herb: 3 }, note: 'Three field-ready Briarleaf bundles.' },
        { id: 'mooncap_pouch', title: 'Mooncap Pouch', icon: '◉', price: 70, grant: { mooncap: 2 }, note: 'Two dried Mooncaps for alchemy.' },
        { id: 'warden_binding', title: 'Waxed Warden Binding', icon: '⌁', price: 90, grant: { binding: 1 }, note: 'Specialty binding used in expedition assembly.' },
      ],
      commission: {
        id: 'roadwarden_satchel', title: 'Roadwarden Satchel', icon: '▣',
        req: { herb: 3, tonic: 1 }, reward: { coins: 55, hide: 1 },
        note: 'Pack medicines for patrols along Meadow Road. The payout is modest, but the tannery returns a treated hide.'
      },
    },
    {
      key: 'hollow', name: 'HOLLOW REPAIR DAY', subtitle: 'Forge and field-repair materials', icon: '◆',
      stock: [
        { id: 'copper_crate', title: 'Copper Crate', icon: '◆', price: 85, grant: { ore: 3 }, note: 'Three smelting-grade Copper pieces.' },
        { id: 'hide_roll', title: 'Treated Hide Roll', icon: '▱', price: 100, grant: { hide: 2 }, note: 'Two clean Beast Hides, already cured.' },
        { id: 'warden_binding', title: 'Waxed Warden Binding', icon: '⌁', price: 90, grant: { binding: 1 }, note: 'Specialty binding used in expedition assembly.' },
      ],
      commission: {
        id: 'hollow_repair_parcel', title: 'Hollow Repair Parcel', icon: '⚒',
        req: { ore: 3, hide: 1 }, reward: { coins: 70, mooncap: 1 },
        note: 'Supply repair material to Hollow crews. Mira adds a Mooncap from the town reserve to the return parcel.'
      },
    },
    {
      key: 'fen', name: 'FEN EXPEDITION STOCK', subtitle: 'Mosswater recovery supplies', icon: '≈',
      stock: [
        { id: 'mossglass_case', title: 'Mossglass Case', icon: '◇', price: 130, grant: { mossglass: 2 }, note: 'Two stabilized Mossglass samples.', requires: () => !!progress.fenDiscovered },
        { id: 'oil_case', title: 'Warden Oil Flask', icon: '◈', price: 95, grant: { oil: 1 }, note: 'A ready-made combat coating.' },
        { id: 'warden_binding', title: 'Waxed Warden Binding', icon: '⌁', price: 90, grant: { binding: 1 }, note: 'Specialty binding used in expedition assembly.' },
      ],
      commission: {
        id: 'fen_survey_case', title: 'Fen Survey Case', icon: '⌗',
        req: { mossglass: 2, oil: 1 }, reward: { coins: 95, iron: 1 },
        note: 'Seal Mosswater samples for the wardens. Alden pays partly in a refined Deepvein bar instead of pure coin.'
      },
    },
  ];

  const SERVICES = [
    {
      id: 'field_refill', title: "Mira's Field Refill", icon: '✚', price: 45,
      req: { herb: 1, mooncap: 1 }, grant: { tonic: 2 },
      note: 'Pay for town preparation and bottle two tonics from one field recipe.'
    },
    {
      id: 'oil_batch', title: 'Alden’s Oil Batch', icon: '◈', price: 65,
      req: { ore: 1, herb: 1, mooncap: 1 }, grant: { oil: 2 },
      note: 'A paid forge batch doubles the normal field-oil output.'
    },
    {
      id: 'iron_refine', title: 'Deepvein Refinement', icon: '⬡', price: 75,
      req: { ore: 3 }, grant: { iron: 1 }, requires: () => !!progress.reinforcedPickaxe,
      note: 'Alden refines ordinary Copper stock into one masterwork-grade bar.'
    },
    {
      id: 'expedition_assembly', title: 'Expedition Pack Assembly', icon: '▣', price: 0,
      req: { binding: 1, hide: 1, herb: 1, mooncap: 1 }, grant: { tonic: 2, oil: 2 },
      note: 'Consume Rowan’s specialty binding with field materials to assemble a two-tonic, two-oil expedition pack.'
    },
  ];

  const tradePanel = document.getElementById('trade-panel');
  const inventoryGrid = document.querySelector('#inventory-panel .inventory-grid');
  let bindingCount = document.getElementById('panel-binding-count');

  if (inventoryGrid && !bindingCount) {
    const item = document.createElement('div');
    item.className = 'inventory-item market-specialty-item';
    item.innerHTML = '<span class="item-icon">⌁</span><span><strong>Warden Binding</strong><small>Rowan specialty component</small></span><b id="panel-binding-count">0</b>';
    inventoryGrid.appendChild(item);
    bindingCount = document.getElementById('panel-binding-count');
  }

  const market = document.createElement('section');
  market.id = 'rowan-market-ledger';
  market.innerHTML = `
    <div class="market14-heading">
      <div>
        <div class="eyebrow">ROWAN • ROTATING MARKET</div>
        <h3 id="market14-cycle">Market Cycle</h3>
        <p id="market14-cycle-subtitle"></p>
      </div>
      <div class="market14-ledger">
        <b id="market14-spent">0 c spent</b>
        <small id="market14-orders">0 commissions</small>
      </div>
    </div>
    <div class="market14-section-title"><span>LIMITED STOCK</span><small>Restocks after the next Warden Board job</small></div>
    <div id="market14-stock" class="market14-grid"></div>
    <div class="market14-section-title"><span>TOWN SERVICES</span><small>Repeatable coin + material sinks</small></div>
    <div id="market14-services" class="market14-grid services"></div>
    <div class="market14-section-title"><span>MARKET COMMISSION</span><small>One material order per market cycle</small></div>
    <div id="market14-commission"></div>
  `;
  tradePanel?.appendChild(market);

  const stockEl = document.getElementById('market14-stock');
  const servicesEl = document.getElementById('market14-services');
  const commissionEl = document.getElementById('market14-commission');
  const cycleEl = document.getElementById('market14-cycle');
  const subtitleEl = document.getElementById('market14-cycle-subtitle');
  const spentEl = document.getElementById('market14-spent');
  const ordersEl = document.getElementById('market14-orders');

  function currentEpoch() {
    return Math.max(0, Math.floor(progress.boardContractsCompleted || 0));
  }

  function currentCycle() {
    return MARKET_CYCLES[currentEpoch() % MARKET_CYCLES.length];
  }

  function syncEpoch({ persist = false } = {}) {
    const epoch = currentEpoch();
    if (ledger.epoch === epoch) return false;
    ledger.epoch = epoch;
    ledger.purchases = {};
    ledger.commissionDone = false;
    if (persist) saveGame();
    return true;
  }

  syncEpoch();

  function inventoryAmount(key) {
    return Number(player.inventory[key] || 0);
  }

  function hasMaterials(req = {}) {
    return Object.entries(req).every(([key, qty]) => inventoryAmount(key) >= qty);
  }

  function consumeMaterials(req = {}) {
    if (!hasMaterials(req)) return false;
    for (const [key, qty] of Object.entries(req)) player.inventory[key] = inventoryAmount(key) - qty;
    return true;
  }

  function grantItems(grant = {}) {
    for (const [key, qty] of Object.entries(grant)) player.inventory[key] = inventoryAmount(key) + qty;
  }

  function requirementText(req = {}) {
    return Object.entries(req).map(([key, qty]) => `${qty} ${NAMES[key] || key}`).join(' + ');
  }

  function grantText(grant = {}) {
    return Object.entries(grant).map(([key, qty]) => `${qty} ${NAMES[key] || key}`).join(' + ');
  }

  function rewardText(reward = {}) {
    const parts = [];
    if (reward.coins) parts.push(`${reward.coins} coins`);
    for (const [key, qty] of Object.entries(reward)) if (key !== 'coins' && qty) parts.push(`${qty} ${NAMES[key] || key}`);
    return parts.join(' + ');
  }

  function spendCoins(amount) {
    if (amount <= 0) return true;
    if (player.coins < amount) {
      toast(`Rowan needs ${amount} coins`);
      return false;
    }
    player.coins -= amount;
    ledger.coinsSpent += amount;
    return true;
  }

  function buyStock(id) {
    syncEpoch();
    const item = currentCycle().stock.find(entry => entry.id === id);
    if (!item || ledger.purchases[id]) return false;
    if (item.requires && !item.requires()) {
      toast('That stock is not available to you yet');
      return false;
    }
    if (!spendCoins(item.price)) return false;
    grantItems(item.grant);
    ledger.purchases[id] = true;
    spawnParticles(player.x, player.y, '#d8bc78', 10, .45);
    addFloater(player.x, player.y - 16, `-${item.price} c • ${grantText(item.grant).toUpperCase()}`, '#e8cf91');
    toast(`${item.title} purchased`);
    saveGame();
    renderMarket(true);
    updateUI();
    return true;
  }

  function runService(id) {
    const service = SERVICES.find(entry => entry.id === id);
    if (!service) return false;
    if (service.requires && !service.requires()) {
      toast('A Reinforced Pickaxe is required for that service');
      return false;
    }
    if (!hasMaterials(service.req)) {
      toast(`Needs ${requirementText(service.req)}`);
      return false;
    }
    if (player.coins < service.price) {
      toast(`Rowan needs ${service.price} coins`);
      return false;
    }
    if (!consumeMaterials(service.req)) return false;
    if (!spendCoins(service.price)) return false;
    grantItems(service.grant);
    ledger.serviceUses += 1;
    spawnParticles(player.x, player.y, '#9bc5a1', 12, .5);
    addFloater(player.x, player.y - 16, grantText(service.grant).toUpperCase(), '#bfe1c2');
    toast(`${service.title} complete`);
    saveGame();
    renderMarket(true);
    updateUI();
    return true;
  }

  function turnInCommission() {
    syncEpoch();
    const cycle = currentCycle();
    const order = cycle.commission;
    if (!progress.fenCacheClaimed) {
      toast('Finish the Mosswater Warden expedition before taking market commissions');
      return false;
    }
    if (ledger.commissionDone) return false;
    if (!hasMaterials(order.req)) {
      toast(`Commission needs ${requirementText(order.req)}`);
      return false;
    }
    consumeMaterials(order.req);
    player.coins += order.reward.coins || 0;
    for (const [key, qty] of Object.entries(order.reward)) {
      if (key !== 'coins') player.inventory[key] = inventoryAmount(key) + qty;
    }
    ledger.commissionDone = true;
    ledger.ordersCompleted += 1;
    spawnParticles(player.x, player.y, '#d8bc78', 14, .6);
    addFloater(player.x, player.y - 18, rewardText(order.reward).toUpperCase(), '#f0d89a');
    toast(`Market commission complete — ${order.title}`);
    saveGame();
    renderMarket(true);
    updateUI();
    return true;
  }

  function canUseService(service) {
    if (service.requires && !service.requires()) return false;
    return player.coins >= service.price && hasMaterials(service.req);
  }

  function renderStock(cycle) {
    stockEl.innerHTML = cycle.stock.map(item => {
      const sold = !!ledger.purchases[item.id];
      const locked = item.requires && !item.requires();
      const affordable = player.coins >= item.price;
      return `
        <article class="market14-card ${sold ? 'sold' : ''}">
          <div class="market14-card-top"><span>${item.icon}</span><small>1 PER CYCLE</small></div>
          <strong>${item.title}</strong>
          <p>${item.note}</p>
          <div class="market14-yield">Receive • ${grantText(item.grant)}</div>
          <button type="button" data-market-buy="${item.id}" ${sold || locked || !affordable ? 'disabled' : ''}>${sold ? 'Sold this cycle' : locked ? 'Locked' : `Buy • ${item.price} c`}</button>
        </article>`;
    }).join('');
  }

  function renderServices() {
    servicesEl.innerHTML = SERVICES.map(service => {
      const locked = service.requires && !service.requires();
      const ready = canUseService(service);
      const price = service.price ? `${service.price} c + ` : '';
      return `
        <article class="market14-card service ${locked ? 'locked' : ''}">
          <div class="market14-card-top"><span>${service.icon}</span><small>REPEATABLE</small></div>
          <strong>${service.title}</strong>
          <p>${service.note}</p>
          <div class="market14-cost">Cost • ${price}${requirementText(service.req)}</div>
          <div class="market14-yield">Receive • ${grantText(service.grant)}</div>
          <button type="button" data-market-service="${service.id}" ${ready ? '' : 'disabled'}>${locked ? 'Reinforced Pickaxe required' : 'Use Service'}</button>
        </article>`;
    }).join('');
  }

  function renderCommission(cycle) {
    const order = cycle.commission;
    const unlocked = !!progress.fenCacheClaimed;
    const ready = unlocked && !ledger.commissionDone && hasMaterials(order.req);
    commissionEl.innerHTML = `
      <article class="market14-commission ${ledger.commissionDone ? 'complete' : ''}">
        <span class="market14-commission-icon">${order.icon}</span>
        <div>
          <div class="eyebrow">${cycle.name}</div>
          <strong>${order.title}</strong>
          <p>${order.note}</p>
          <small>Deliver • ${requirementText(order.req)}</small>
          <small>Reward • ${rewardText(order.reward)}</small>
        </div>
        <button type="button" data-market-commission ${ready ? '' : 'disabled'}>${!unlocked ? 'Complete Mosswater first' : ledger.commissionDone ? 'Completed this cycle' : ready ? 'Deliver Commission' : 'Materials Needed'}</button>
      </article>`;
  }

  let lastSignature = '';
  function marketSignature() {
    const keys = ['herb','mooncap','ore','hide','tonic','oil','iron','mossglass','binding'];
    return JSON.stringify({
      epoch: currentEpoch(), purchases: ledger.purchases, done: ledger.commissionDone,
      spent: ledger.coinsSpent, orders: ledger.ordersCompleted, services: ledger.serviceUses,
      coins: player.coins, pickaxe: !!progress.reinforcedPickaxe, fen: !!progress.fenDiscovered,
      fenCache: !!progress.fenCacheClaimed,
      inv: Object.fromEntries(keys.map(key => [key, inventoryAmount(key)])),
    });
  }

  function renderMarket(force = false) {
    syncEpoch();
    if (!market || !stockEl || !servicesEl || !commissionEl) return;
    const signature = marketSignature();
    if (!force && signature === lastSignature) return;
    lastSignature = signature;
    const cycle = currentCycle();
    cycleEl.textContent = `${cycle.icon} ${cycle.name}`;
    subtitleEl.textContent = `${cycle.subtitle} • cycle ${ledger.epoch + 1}`;
    spentEl.textContent = `${ledger.coinsSpent} c spent`;
    ordersEl.textContent = `${ledger.ordersCompleted} commission${ledger.ordersCompleted === 1 ? '' : 's'} • ${ledger.serviceUses} service${ledger.serviceUses === 1 ? '' : 's'}`;
    renderStock(cycle);
    renderServices();
    renderCommission(cycle);
  }

  market?.addEventListener('click', event => {
    const buy = event.target.closest('[data-market-buy]');
    if (buy) { buyStock(buy.dataset.marketBuy); return; }
    const service = event.target.closest('[data-market-service]');
    if (service) { runService(service.dataset.marketService); return; }
    if (event.target.closest('[data-market-commission]')) turnInCommission();
  });

  function syncJournalEconomy() {
    const target = document.getElementById('journal-milestones');
    if (!target) return;
    let row = target.querySelector('[data-build14="market"]');
    if (!row) {
      row = document.createElement('div');
      row.dataset.build14 = 'market';
      target.appendChild(row);
    }
    const engaged = ledger.coinsSpent > 0 || ledger.ordersCompleted > 0 || ledger.serviceUses > 0;
    row.className = `journal-row ${engaged ? 'done' : 'locked'}`;
    row.innerHTML = `<span>${engaged ? '✓' : '•'}</span><b>${engaged ? `Rowan market: ${ledger.coinsSpent} c spent • ${ledger.ordersCompleted} commissions` : 'Rowan’s rotating market ledger'}</b>`;
  }

  const build13UpdateUI = updateUI;
  updateUI = function build14UpdateUI() {
    build13UpdateUI();
    const changed = syncEpoch();
    if (changed) lastSignature = '';
    if (bindingCount) bindingCount.textContent = inventoryAmount('binding');
    syncJournalEconomy();
    if (tradePanel && !tradePanel.hidden) renderMarket();
  };

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.getMarketState = () => {
      syncEpoch();
      const cycle = currentCycle();
      return {
        epoch: ledger.epoch,
        cycle: cycle.key,
        cycleName: cycle.name,
        offers: cycle.stock.map(item => item.id),
        purchases: { ...ledger.purchases },
        commission: cycle.commission.id,
        commissionDone: ledger.commissionDone,
        coinsSpent: ledger.coinsSpent,
        ordersCompleted: ledger.ordersCompleted,
        serviceUses: ledger.serviceUses,
        coins: player.coins,
        inventory: {
          herb: inventoryAmount('herb'), mooncap: inventoryAmount('mooncap'), ore: inventoryAmount('ore'),
          hide: inventoryAmount('hide'), tonic: inventoryAmount('tonic'), oil: inventoryAmount('oil'),
          iron: inventoryAmount('iron'), mossglass: inventoryAmount('mossglass'), binding: inventoryAmount('binding'),
        },
      };
    };
    window.__BRIAR_GLENDebug.buyMarketStock = buyStock;
    window.__BRIAR_GLENDebug.runMarketService = runService;
    window.__BRIAR_GLENDebug.turnInMarketCommission = turnInCommission;
    window.__BRIAR_GLENDebug.refreshMarket = () => { lastSignature = ''; renderMarket(true); return window.__BRIAR_GLENDebug.getMarketState(); };
  }

  renderMarket(true);
  updateUI();
})();
