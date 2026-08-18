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
  if (!state.completedBySource || typeof state.completedBySource !== 'object') state.completedBySource = {};
  if (state.active && (!state.active.key || !state.active.sourceId)) state.active = null;
  if (state.fulfilled > 0 && state.active?.done && !Object.keys(state.completedBySource).length) {
    state.completedBySource[state.active.sourceId] = state.fulfilled;
  }

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
  function responsePlan(active, def) {
    const base = {advanced:false,family:null,title:def.title,note:def.note,options:[{id:'standard',label:'Standard delivery',req:def.req,reward:def.reward,traitNote:null}]};
    const policy = window.__BRIAR_GLEN_SPECIALIST_ECONOMY38;
    return policy?.plan?.({sourceId:active.sourceId,base,completed:Number(state.completedBySource[active.sourceId]||0),traits:{...(progress.specialistTraits||{})}}) || base;
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
    const plan = active && def ? responsePlan(active,def) : null;
    const signature = JSON.stringify({active,plan,history:state.completedBySource,coins:player.coins,inv:Object.fromEntries(Object.keys(NAMES).map(k => [k,amount(k)]))});
    if (!force && signature === renderSignature) return;
    renderSignature = signature;
    if (!active || !def) {
      body.innerHTML = '<article class="market14-commission"><div><strong>No response order posted</strong><p>Finish a Contract Board job and Rowan will prepare a related supply request.</p></div></article>';
      return;
    }
    const options = plan.options.map(option=>({...option,ready:!active.done&&has(option.req)}));
    body.innerHTML = `
      <article class="market14-commission ${active.done ? 'complete' : ''}">
        <span class="market14-commission-icon">▣</span>
        <div>
          <div class="eyebrow">${plan.advanced?'REPEAT CLIENT':'AFTER'} • ${active.source.toUpperCase()}</div>
          <strong>${plan.title}</strong>
          <p>${plan.note}</p>
          <div class="response32-paths">${options.map(option=>`<div class="response32-path"><small><b>${option.label}</b> • ${itemText(option.req)}</small>${option.traitNote?`<small class="response32-trait">${option.traitNote}</small>`:''}<button type="button" data-warden-response32="${option.id}" ${option.ready?'':'disabled'}>${active.done?'Order fulfilled':option.ready?'Deliver supplies':'Materials needed'}</button></div>`).join('')}</div>
          <small>Reward • ${rewardText(options[0].reward)}</small>
        </div>
      </article>`;
  }

  function fulfill(pathId = 'standard') {
    const active = state.active;
    const def = active ? ORDERS[active.sourceId] : null;
    if (!active || !def || active.done) return false;
    const plan = responsePlan(active,def);
    const option = plan.options.find(entry=>entry.id===pathId) || plan.options[0];
    if (!has(option.req)) {
      toast(`Response order needs ${itemText(option.req)}`);
      return false;
    }
    if (!consume(option.req)) return false;
    grant(option.reward);
    active.done = true;
    active.deliveryPath = option.id;
    state.fulfilled += 1;
    state.completedBySource[active.sourceId] = Number(state.completedBySource[active.sourceId]||0) + 1;
    spawnParticles(player.x,player.y,'#d8bc78',14,.55);
    addFloater(player.x,player.y-18,rewardText(option.reward).toUpperCase(),'#f0d89a');
    toast(`Warden response fulfilled — ${plan.title}`);
    saveGame();
    render(true);
    updateUI();
    return true;
  }

  section.addEventListener('click', event => {
    const button=event.target.closest?.('[data-warden-response32]');
    if (button) fulfill(button.dataset.wardenResponse32||'standard');
  });

  runtime.registerHook('afterUpdate','build32-board-response',()=>{
    syncBoardCompletion();
  },1250);

  runtime.registerHook('afterUpdateUI','build32-response-ui',()=>{
    syncBoardCompletion();
    const bindingCounter = document.getElementById('panel-binding-count');
    if (bindingCounter) bindingCounter.textContent = amount('binding');
    const tradePanel = document.getElementById('trade-panel');
    if (tradePanel && !tradePanel.hidden) render();
  },1250);

  debug.turnInWardenResponseOrder = pathId => fulfill(pathId);
  debug.getWardenResponseState = () => {
    const active = state.active;
    const def = active ? ORDERS[active.sourceId] : null;
    return {
      lastSeenCompleted:state.lastSeenCompleted,
      fulfilled:state.fulfilled,
      completedBySource:{...state.completedBySource},
      active:active && def ? (()=>{const plan=responsePlan(active,def),options=plan.options.map(option=>({...option,req:{...option.req},reward:{...option.reward},ready:!active.done&&has(option.req)}));return{...active,advanced:plan.advanced,family:plan.family,title:plan.title,ready:options.some(option=>option.ready),req:{...options[0].req},reward:{...options[0].reward},options};})() : null,
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
