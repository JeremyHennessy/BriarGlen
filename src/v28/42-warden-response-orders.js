(() => {
  'use strict';

  // Build 32: connect existing Board jobs, Rowan's market and specialist crafting.
  // No new currency, world nodes, combat actions, progression gates or save schema.
  const debug = window.__BRIAR_GLENDebug;
  const runtime = window.__BRIAR_GLEN_RUNTIME;
  if (!debug || !runtime || typeof debug.getBoardState !== 'function' || typeof debug.getMarketState !== 'function') {
    throw new Error('Build 32 Warden Response Orders require the verified Board + Rowan market runtime');
  }

  const ORDERS = Object.freeze({
    briar_cull:Object.freeze({
      key:'road_relief', title:'Roadwarden Relief Crate', source:'Cull the Briar',
      note:'Rowan needs a crafted field resupply after the road-clearing contract.',
      req:Object.freeze({ tonic:2, herb:2 }), reward:Object.freeze({ coins:75, binding:1 }),
    }),
    field_medicine:Object.freeze({
      key:'apothecary_restock', title:'Apothecary Restock', source:'Field Medicine',
      note:'Mira’s field order creates follow-up demand for prepared medicine and Mooncap stock.',
      req:Object.freeze({ tonic:2, mooncap:1 }), reward:Object.freeze({ coins:85, binding:1 }),
    }),
    copper_order:Object.freeze({
      key:'hollow_tool_parcel', title:'Hollow Tool Parcel', source:'Copper Order',
      note:'Alden asks Rowan to assemble a repair parcel using crafted oil and field materials.',
      req:Object.freeze({ oil:1, ore:2, hide:1 }), reward:Object.freeze({ coins:95, iron:1 }),
    }),
    mosswater_survey:Object.freeze({
      key:'fen_seal_kit', title:'Fen Seal Kit', source:'Mosswater Survey',
      note:'The survey creates a follow-up order for sealed Fen supplies and prepared field medicine.',
      req:Object.freeze({ oil:1, mossglass:1, tonic:1 }), reward:Object.freeze({ coins:110, resin:1 }),
    }),
  });

  const NAMES = Object.freeze({
    herb:'Briarleaf', mooncap:'Mooncap', ore:'Copper', hide:'Beast Hide', tonic:'Healing Tonic',
    oil:'Warden Oil', iron:'Deepvein Iron', mossglass:'Mossglass', binding:'Warden Binding', resin:'Ironpine Resin',
  });

  if (!progress.wardenResponse32 || typeof progress.wardenResponse32 !== 'object') progress.wardenResponse32 = {};
  const state = progress.wardenResponse32;
  const initialBoard = debug.getBoardState();
  if (!Number.isFinite(state.lastSeenCompleted)) state.lastSeenCompleted = initialBoard.completed || 0;
  if (!Number.isFinite(state.fulfilled)) state.fulfilled = 0;
  if (state.active && (!state.active.key || !state.active.sourceId)) state.active = null;

  let observedActiveId = initialBoard.active?.id || null;
  const baselineEntities = (() => {
    const specialist = debug.getSpecialistCraftingState?.();
    return specialist?.entityCounts ? {...specialist.entityCounts} : {objects:worldObjects.length,resources:resources.length,enemies:enemies.length};
  })();

  function amount(key) { return Number(player.inventory[key] || 0); }
  function has(req = {}) { return Object.entries(req).every(([key,qty]) => amount(key) >= qty); }
  function consume(req = {}) {
    if (!has(req)) return false;
    for (const [key,qty] of Object.entries(req)) player.inventory[key] = amount(key) - qty;
    return true;
  }
  function grant(reward = {}) {
    player.coins += reward.coins || 0;
    for (const [key,qty] of Object.entries(reward)) if (key !== 'coins') player.inventory[key] = amount(key) + qty;
  }
  function itemText(values = {}) {
    return Object.entries(values).filter(([,qty]) => qty).map(([key,qty]) => `${qty} ${NAMES[key] || key}`).join(' + ');
  }
  function rewardText(reward = {}) {
    const parts = [];
    if (reward.coins) parts.push(`${reward.coins} coins`);
    for (const [key,qty] of Object.entries(reward)) if (key !== 'coins' && qty) parts.push(`${qty} ${NAMES[key] || key}`);
    return parts.join(' + ');
  }

  function createResponse(sourceId, completed) {
    const def = ORDERS[sourceId];
    if (!def || (state.active && !state.active.done)) return false;
    state.active = { key:def.key, sourceId, source:def.source, title:def.title, boardCompletion:completed, done:false };
    toast(`Rowan posted a response order — ${def.title}`);
    saveGame();
    return true;
  }

  function syncBoardCompletion() {
    const board = debug.getBoardState();
    if (board.active?.id) observedActiveId = board.active.id;
    const completed = board.completed || 0;
    if (completed > state.lastSeenCompleted) {
      const sourceId = observedActiveId;
      state.lastSeenCompleted = completed;
      createResponse(sourceId, completed);
      observedActiveId = board.active?.id || null;
    }
    return board;
  }

  const marketRoot = document.getElementById('rowan-market-ledger');
  const section = document.createElement('section');
  section.id = 'warden-response32';
  section.innerHTML = `
    <div class="market14-section-title"><span>WARDEN RESPONSE ORDER</span><small>Created by completed Contract Board work</small></div>
    <div id="warden-response32-body"></div>`;
  marketRoot?.appendChild(section);
  const body = document.getElementById('warden-response32-body');

  let renderSignature = '';
  function render(force = false) {
    if (!body) return;
    const active = state.active;
    const def = active ? ORDERS[active.sourceId] : null;
    const signature = JSON.stringify({active,coins:player.coins,inv:Object.fromEntries(Object.keys(NAMES).map(k => [k,amount(k)]))});
    if (!force && signature === renderSignature) return;
    renderSignature = signature;
    if (!active || !def) {
      body.innerHTML = '<article class="market14-commission"><div><strong>No response order posted</strong><p>Finish a Contract Board job and Rowan will prepare a related supply request.</p></div></article>';
      return;
    }
    const ready = !active.done && has(def.req);
    body.innerHTML = `
      <article class="market14-commission ${active.done ? 'complete' : ''}">
        <span class="market14-commission-icon">▣</span>
        <div>
          <div class="eyebrow">AFTER • ${active.source.toUpperCase()}</div>
          <strong>${def.title}</strong>
          <p>${def.note}</p>
          <small>Deliver • ${itemText(def.req)}</small>
          <small>Reward • ${rewardText(def.reward)}</small>
        </div>
        <button type="button" data-warden-response32 ${ready ? '' : 'disabled'}>${active.done ? 'Order fulfilled' : ready ? 'Fulfill Response Order' : 'Crafted Supplies Needed'}</button>
      </article>`;
  }

  function fulfill() {
    const active = state.active;
    const def = active ? ORDERS[active.sourceId] : null;
    if (!active || !def || active.done) return false;
    if (!has(def.req)) {
      toast(`Response order needs ${itemText(def.req)}`);
      return false;
    }
    if (!consume(def.req)) return false;
    grant(def.reward);
    active.done = true;
    state.fulfilled += 1;
    spawnParticles(player.x,player.y,'#d8bc78',14,.55);
    addFloater(player.x,player.y-18,rewardText(def.reward).toUpperCase(),'#f0d89a');
    toast(`Warden response fulfilled — ${def.title}`);
    saveGame();
    render(true);
    updateUI();
    return true;
  }

  section.addEventListener('click', event => {
    if (event.target.closest?.('[data-warden-response32]')) fulfill();
  });

  runtime.registerHook('afterUpdate','build32-board-response',()=>{
    syncBoardCompletion();
  },1250);

  runtime.registerHook('afterUpdateUI','build32-response-ui',()=>{
    syncBoardCompletion();
    if (bindingCount) bindingCount.textContent = amount('binding');
    const tradePanel = document.getElementById('trade-panel');
    if (tradePanel && !tradePanel.hidden) render();
  },1250);

  debug.turnInWardenResponseOrder = fulfill;
  debug.getWardenResponseState = () => {
    const active = state.active;
    const def = active ? ORDERS[active.sourceId] : null;
    return {
      lastSeenCompleted:state.lastSeenCompleted,
      fulfilled:state.fulfilled,
      active:active && def ? {...active, ready:!active.done && has(def.req), req:{...def.req}, reward:{...def.reward}} : null,
      board:debug.getBoardState(),
      market:debug.getMarketState(),
      specialist:debug.getSpecialistCraftingState?.() || null,
      inventory:Object.fromEntries(Object.keys(NAMES).map(key => [key,amount(key)])),
      coins:player.coins,
      entityCounts:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
      baselineEntities:{...baselineEntities},
    };
  };

  render(true);
})();
