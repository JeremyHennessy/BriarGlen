(() => {
  'use strict';

  // Build 23: presentation completion over the canonical Build 20.1 runtime.
  // No combat, economy, progression or reward values are changed here.
  const runtime = window.__BRIAR_GLEN_RUNTIME;
  if (!runtime) throw new Error('Build 23 requires canonical runtime hooks');

  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'styles-v23.css';
  style.dataset.build23Style = 'true';
  if (!document.querySelector('link[data-build23-style]')) document.head.appendChild(style);

  const COMPLETE_KEY = 'briar-glen-vertical-slice-complete-v1';
  const shell = document.getElementById('game-shell');
  const polish = {
    enabled: true,
    style: 'vertical-slice-polish-v1',
    lastZone: zoneFor(player.x, player.y)?.name || '',
    zoneTransitions: 0,
    areaShows: 0,
    pickupShows: 0,
    completionShows: 0,
    recoveryShows: 0,
    stonepineAmbientFrames: 0,
    stonepineAmbientMarks: 0,
    interactionFocusFrames: 0,
    completionOpen: false,
    completionSeen: false,
    interactionSnapshot: null,
    previous: { x: player.x, y: player.y, hp: player.hp },
  };

  try { polish.completionSeen = localStorage.getItem(COMPLETE_KEY) === '1'; }
  catch (_) { polish.completionSeen = false; }

  const ZONES = {
    'BRIAR GLEN': ['WARDEN SETTLEMENT', 'Forge • market • contract board'],
    'MEADOW ROAD': ['THE EASTERN ROAD', 'Briarleaf, wolves and open country'],
    'COPPER HOLLOW': ['OLD QUARRY WORKS', 'Copper seams • Deepvein below'],
    'EMBERBACK DEN': ['SCORCHED BURROW', 'Emberback’s lair'],
    'MOONCAP GROVE': ['WARDEN GROVE', 'Mooncaps • ruins • old cache'],
    'MOSSWATER FEN': ['OLD WARDEN CROSSING', 'Flooded ruins • Mossglass'],
    'STONEPINE REACH': ['HIGH QUARRY', 'Ironpine Resin • scree fields'],
    'ROOTWAY': ['OLD ROOTWAY', 'A hidden road home'],
  };

  const area = document.createElement('div');
  area.id = 'polish23-area';
  area.hidden = true;
  area.innerHTML = '<div class="eyebrow" id="polish23-area-kicker"></div><strong id="polish23-area-name"></strong><small id="polish23-area-sub"></small>';
  shell.appendChild(area);

  const pickup = document.createElement('div');
  pickup.id = 'polish23-pickup';
  pickup.hidden = true;
  shell.appendChild(pickup);

  const complete = document.createElement('section');
  complete.id = 'polish23-complete';
  complete.hidden = true;
  complete.setAttribute('aria-label', 'Briar Glen vertical slice complete');
  complete.innerHTML = `
    <div class="polish23-complete-card">
      <div class="polish23-complete-seal">❧</div>
      <div class="eyebrow">WARDEN ROAD CHARTED</div>
      <h2>Vertical Slice Complete</h2>
      <p>You secured Briar Glen, crossed Mosswater Fen and recovered the Stonepine survey. The world remains open for contracts, gathering, crafting and market work.</p>
      <button id="polish23-complete-close" type="button">Return to Briar Glen</button>
    </div>`;
  shell.appendChild(complete);

  const areaKicker = document.getElementById('polish23-area-kicker');
  const areaName = document.getElementById('polish23-area-name');
  const areaSub = document.getElementById('polish23-area-sub');
  let areaTimer = 0;
  let pickupTimer = 0;

  function showArea(zone, force = false) {
    if (!polish.enabled || !zone) return false;
    const copy = ZONES[zone] || ['WARDEN TERRITORY', 'Roads of Briar Glen'];
    areaKicker.textContent = copy[0];
    areaName.textContent = zone;
    areaSub.textContent = copy[1];
    area.hidden = false;
    area.classList.remove('polish23-replay');
    void area.offsetWidth;
    area.classList.add('polish23-replay');
    clearTimeout(areaTimer);
    areaTimer = setTimeout(() => { area.hidden = true; }, force ? 1550 : 2100);
    polish.areaShows += 1;
    return true;
  }

  function showPickup(text) {
    if (!polish.enabled || !text) return false;
    pickup.textContent = text;
    pickup.hidden = false;
    pickup.classList.remove('polish23-replay');
    void pickup.offsetWidth;
    pickup.classList.add('polish23-replay');
    clearTimeout(pickupTimer);
    pickupTimer = setTimeout(() => { pickup.hidden = true; }, 1450);
    polish.pickupShows += 1;
    return true;
  }

  function showCompletion(force = false) {
    if (!polish.enabled || polish.completionOpen) return false;
    if (!force && polish.completionSeen) return false;
    polish.completionOpen = true;
    polish.completionSeen = true;
    polish.completionShows += 1;
    complete.hidden = false;
    keys?.clear?.();
    try { localStorage.setItem(COMPLETE_KEY, '1'); } catch (_) {}
    return true;
  }

  function closeCompletion() {
    polish.completionOpen = false;
    complete.hidden = true;
    return true;
  }
  document.getElementById('polish23-complete-close')?.addEventListener('click', closeCompletion);

  function inventorySnapshot() {
    const inv = player.inventory || {};
    return {
      coins: player.coins || 0,
      herb: inv.herb || 0, ore: inv.ore || 0, mooncap: inv.mooncap || 0,
      hide: inv.hide || 0, tonic: inv.tonic || 0, oil: inv.oil || 0,
      iron: inv.iron || 0, mossglass: inv.mossglass || 0, resin: inv.resin || 0,
      binding: inv.binding || 0, tusk: inv.tusk || 0,
    };
  }

  const ITEM_NAMES = {
    herb: 'Briarleaf', ore: 'Copper', mooncap: 'Mooncap', hide: 'Beast Hide',
    tonic: 'Healing Tonic', oil: 'Warden Oil', iron: 'Deepvein Iron',
    mossglass: 'Mossglass', resin: 'Ironpine Resin', binding: 'Warden Binding', tusk: 'Ember Tusk',
  };

  function summarizeDelta(before, after) {
    if (!before || !after) return '';
    const gains = [];
    for (const key of Object.keys(ITEM_NAMES)) {
      const delta = (after[key] || 0) - (before[key] || 0);
      if (delta > 0) gains.push(`${ITEM_NAMES[key]} +${delta}`);
    }
    const coinDelta = (after.coins || 0) - (before.coins || 0);
    if (coinDelta > 0) gains.push(`${coinDelta} coins`);
    return gains.slice(0, 3).join(' • ');
  }

  function visible(p, margin = 80) {
    return p.x >= -margin && p.x <= viewport.w + margin && p.y >= -margin && p.y <= viewport.h + margin;
  }

  function drawStonepineAtmosphere() {
    if (!polish.enabled || !(zoneFor(player.x, player.y)?.name || '').includes('STONEPINE')) return;
    const now = performance.now();
    const z = camera.zoom;
    let marks = 0;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const phase = i * 1.71 + now / 1700;
      const wx = player.x - 330 + ((i * 113 + now * .018) % 760);
      const wy = player.y - 250 + (i % 5) * 112 + Math.sin(phase) * 24;
      const p = worldToScreen(wx, wy);
      if (!visible(p, 40)) continue;
      ctx.globalAlpha = .07 + (i % 3) * .018;
      ctx.strokeStyle = i % 3 ? '#d7d2b4' : '#c69c63';
      ctx.lineWidth = (1 + (i % 2) * .5) * z;
      ctx.beginPath();
      ctx.moveTo(p.x - 12*z, p.y + 3*z);
      ctx.lineTo(p.x + 15*z, p.y - 4*z);
      ctx.stroke();
      marks += 1;
    }
    for (const r of resources) {
      if (r.type !== 'resin' || !r.active) continue;
      const p = worldToScreen(r.x, r.y);
      if (!visible(p, 70)) continue;
      const pulse = .12 + Math.sin(now/520 + r.x*.01) * .035;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#e6b76e';
      ctx.lineWidth = 1.5*z;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 8*z, 24*z, 9*z, 0, 0, TAU);
      ctx.stroke();
      marks += 1;
    }
    const sentinel = enemies.find(e => e.type === 'quarrysentinel' && !e.dead);
    if (sentinel) {
      const p = worldToScreen(sentinel.x, sentinel.y);
      if (visible(p, 120)) {
        ctx.globalAlpha = .08 + Math.sin(now/700)*.02;
        ctx.strokeStyle = '#ddd2ad';
        ctx.lineWidth = 2*z;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - 27*z, 54*z, 24*z, 0, 0, TAU);
        ctx.stroke();
        marks += 1;
      }
    }
    ctx.restore();
    polish.stonepineAmbientFrames += 1;
    polish.stonepineAmbientMarks += marks;
  }

  function drawInteractionFocus() {
    if (!polish.enabled || polish.completionOpen) return;
    const near = nearestInteractable?.();
    if (!near?.obj || !Number.isFinite(near.d) || near.d > 110) return;
    const p = worldToScreen(near.obj.x, near.obj.y);
    if (!visible(p, 80)) return;
    const z = camera.zoom;
    const pulse = .16 + Math.sin(performance.now()/260)*.04;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#e4d39b';
    ctx.lineWidth = 1.5*z;
    ctx.setLineDash([5*z, 6*z]);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 3*z, 28*z, 12*z, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    polish.interactionFocusFrames += 1;
  }

  function panelState() {
    const ids = ['inventory-panel','trade-panel','craft-panel','warden-overlay','board2-panel'];
    return Object.fromEntries(ids.map(id => [id, !!document.getElementById(id) && !document.getElementById(id).hidden]));
  }

  function syncDocumentState() {
    const zone = zoneFor(player.x, player.y)?.name || '';
    document.documentElement.dataset.polish23 = polish.enabled ? polish.style : 'off';
    document.documentElement.dataset.polishZone = zone.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const near = nearestInteractable?.();
    document.documentElement.dataset.polishNear = near?.kind || 'none';
  }

  runtime.registerHook('beforeInteract', 'build23-interact-snapshot', () => {
    polish.interactionSnapshot = inventorySnapshot();
  }, -50);

  runtime.registerHook('afterInteract', 'build23-interact-feedback', () => {
    const text = summarizeDelta(polish.interactionSnapshot, inventorySnapshot());
    if (text) showPickup(text);
    polish.interactionSnapshot = null;
  }, 900);

  runtime.registerHook('afterUpdate', 'build23-zone-and-recovery', () => {
    if (!polish.enabled) return;
    const zone = zoneFor(player.x, player.y)?.name || '';
    if (zone && zone !== polish.lastZone) {
      polish.lastZone = zone;
      polish.zoneTransitions += 1;
      const startOpen = window.__BRIAR_GLENDebug?.getOnboardingState?.().startOpen;
      if (!startOpen) showArea(zone);
    }

    const previous = polish.previous;
    const returned = previous.hp <= 30 && Math.hypot(previous.x + 720, previous.y - 30) > 420 &&
      Math.hypot(player.x + 720, player.y - 30) < 125 && player.hp >= player.maxHp;
    if (returned) {
      polish.recoveryShows += 1;
      showPickup('Warden recovered • Briar Glen');
      shell.classList.add('polish23-recovered');
      setTimeout(() => shell.classList.remove('polish23-recovered'), 700);
    }
    polish.previous = { x:player.x, y:player.y, hp:player.hp };

    if (progress.stonepineCacheClaimed && !polish.completionSeen) showCompletion(false);
    syncDocumentState();
  }, 1100);

  runtime.registerHook('afterDraw', 'build23-stonepine-atmosphere', () => {
    drawStonepineAtmosphere();
    drawInteractionFocus();
  }, 900);

  runtime.registerHook('afterUpdateUI', 'build23-ui-state', syncDocumentState, 1100);

  addEventListener('keydown', event => {
    if (!polish.completionOpen) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.code === 'Escape' || event.code === 'Enter') closeCompletion();
  }, { capture:true });

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.getFinalPolishState = () => ({
      enabled:polish.enabled,
      style:polish.style,
      zone:zoneFor(player.x,player.y)?.name || '',
      zoneTransitions:polish.zoneTransitions,
      areaShows:polish.areaShows,
      pickupShows:polish.pickupShows,
      completionShows:polish.completionShows,
      recoveryShows:polish.recoveryShows,
      stonepineAmbientFrames:polish.stonepineAmbientFrames,
      stonepineAmbientMarks:polish.stonepineAmbientMarks,
      interactionFocusFrames:polish.interactionFocusFrames,
      completionOpen:polish.completionOpen,
      completionSeen:polish.completionSeen,
      cssLoaded:[...document.styleSheets].some(sheet => (sheet.href||'').includes('styles-v23.css')),
      panels:panelState(),
      entityCounts:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
      runtime:window.__BRIAR_GLENDebug.getRuntimeArchitectureState?.() || null,
      feedback:window.__BRIAR_GLENDebug.getFeedbackTuningState?.() || null,
      balance:window.__BRIAR_GLENDebug.getBalanceState?.().baseline || null,
    });
    window.__BRIAR_GLENDebug.setFinalPolishEnabled = value => { polish.enabled=!!value; syncDocumentState(); return polish.enabled; };
    window.__BRIAR_GLENDebug.triggerFinalPolishArea = zone => showArea(zone || zoneFor(player.x,player.y)?.name || 'BRIAR GLEN', true);
    window.__BRIAR_GLENDebug.triggerFinalPolishCompletion = () => showCompletion(true);
    window.__BRIAR_GLENDebug.closeFinalPolishCompletion = closeCompletion;
  }

  syncDocumentState();
})();
