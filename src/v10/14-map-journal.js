(() => {
  'use strict';

  // Build 10: illustrated discovery map + Warden Journal.
  // Additive layer: Builds 2–9 remain intact underneath.
  const overlay = { open: false, tab: 'map' };
  const discoveryDefaults = {
    briar: true,
    meadow: progress.step >= 1 || player.x >= -210,
    hollow: progress.step >= 2 || player.x >= 660,
    den: progress.step >= 3 || progress.bossDefeated || player.x >= 1430,
    grove: !!progress.groveDiscovered,
    rootway: !!progress.shortcutUnlocked,
  };
  progress.mapDiscoveries = { ...discoveryDefaults, ...(progress.mapDiscoveries || {}) };

  const shell = document.getElementById('game-shell');
  const hud = document.getElementById('hud');

  const launcher = document.createElement('button');
  launcher.id = 'warden-map-btn';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Open Warden map and journal');
  launcher.innerHTML = '<span class="map-glyph">⌖</span><span>MAP</span>';
  shell.appendChild(launcher);

  const backdrop = document.createElement('div');
  backdrop.id = 'warden-overlay-backdrop';
  backdrop.hidden = true;
  shell.appendChild(backdrop);

  const panel = document.createElement('section');
  panel.id = 'warden-overlay';
  panel.className = 'panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Warden map and journal');
  panel.innerHTML = `
    <header class="warden-overlay-header">
      <div>
        <div class="eyebrow">BRIAR WARDEN FIELD BOOK</div>
        <h2>Routes & Records</h2>
      </div>
      <div class="warden-overlay-actions">
        <button id="warden-tab-map" class="warden-tab active" type="button">MAP</button>
        <button id="warden-tab-journal" class="warden-tab" type="button">JOURNAL</button>
        <button id="warden-overlay-close" class="warden-close" type="button" aria-label="Close map and journal">×</button>
      </div>
    </header>
    <div id="warden-map-view" class="warden-view">
      <div class="map-frame">
        <svg id="warden-map-svg" viewBox="0 0 1000 610" role="img" aria-label="Map of Briar Glen and surrounding routes">
          <defs>
            <linearGradient id="mapPaper" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#d8c99e"/>
              <stop offset="1" stop-color="#b8a77d"/>
            </linearGradient>
            <filter id="mapShadow"><feDropShadow dx="0" dy="8" stdDeviation="9" flood-opacity=".26"/></filter>
            <pattern id="mapHatch" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
              <line x1="0" y1="0" x2="0" y2="18" stroke="#4a4438" stroke-opacity=".12" stroke-width="5"/>
            </pattern>
          </defs>
          <rect x="12" y="12" width="976" height="586" rx="28" fill="url(#mapPaper)" stroke="#6d5c3d" stroke-width="6" filter="url(#mapShadow)"/>
          <path d="M85 355 C185 330 270 345 350 337 S540 340 690 348 S855 330 930 350" fill="none" stroke="#7f6c49" stroke-width="34" stroke-linecap="round" opacity=".28"/>
          <path d="M88 355 C190 330 270 345 350 337 S540 340 690 348 S855 330 930 350" fill="none" stroke="#5b4a32" stroke-width="5" stroke-dasharray="10 12" stroke-linecap="round" opacity=".52"/>
          <path d="M345 336 C365 270 392 213 438 160 C485 107 550 83 625 78" fill="none" stroke="#5b4a32" stroke-width="5" stroke-dasharray="10 12" opacity=".48"/>
          <path id="rootway-path" d="M127 390 C300 530 690 550 892 392" fill="none" stroke="#5d4632" stroke-width="6" stroke-dasharray="7 12" opacity=".42"/>
          <path d="M205 90 C255 62 315 60 363 92 C320 112 262 118 205 90Z" fill="#728365" opacity=".38"/>
          <path d="M430 62 C510 25 640 30 712 92 C637 122 522 119 430 62Z" fill="#536d55" opacity=".46"/>
          <path d="M670 165 C755 120 865 132 924 190 C845 222 755 219 670 165Z" fill="#6c765a" opacity=".35"/>
          <g class="map-tree-cluster" opacity=".5">
            <path d="M468 117 l16 -34 l16 34 h-10 l16 30 h-44 l16-30z" fill="#405a43"/>
            <path d="M532 92 l15 -31 l15 31 h-9 l15 28 h-42 l15-28z" fill="#405a43"/>
            <path d="M605 126 l17 -35 l17 35 h-10 l16 30 h-46 l16-30z" fill="#405a43"/>
          </g>
          <g id="map-marker-briar" class="map-marker" transform="translate(120 350)"><circle r="25"/><text y="5">⌂</text><text class="marker-label" y="50">BRIAR GLEN</text></g>
          <g id="map-marker-meadow" class="map-marker" transform="translate(318 338)"><circle r="21"/><text y="5">✣</text><text class="marker-label" y="46">MEADOW ROAD</text></g>
          <g id="map-marker-hollow" class="map-marker" transform="translate(548 345)"><circle r="22"/><text y="5">◆</text><text class="marker-label" y="48">COPPER HOLLOW</text></g>
          <g id="map-marker-den" class="map-marker" transform="translate(850 348)"><circle r="24"/><text y="5">▲</text><text class="marker-label" y="50">EMBERBACK DEN</text></g>
          <g id="map-marker-grove" class="map-marker" transform="translate(590 105)"><circle r="24"/><text y="5">❧</text><text class="marker-label" y="50">MOONCAP GROVE</text></g>
          <g id="map-marker-rootway" class="map-marker" transform="translate(500 520)"><circle r="20"/><text y="5">⌁</text><text class="marker-label" y="45">ROOTWAY</text></g>
          <g id="map-player-marker" transform="translate(120 350)"><circle r="12"/><path d="M0 -22 L8 -6 L0 -10 L-8 -6 Z"/></g>
          <rect id="map-fog" x="20" y="20" width="960" height="570" rx="24" fill="url(#mapHatch)" pointer-events="none" opacity=".2"/>
        </svg>
        <div class="map-legend"><span><i class="legend-dot discovered"></i>Discovered</span><span><i class="legend-dot unknown"></i>Unknown</span><span><i class="legend-dot player"></i>You</span></div>
      </div>
      <aside class="map-sidecard">
        <div class="eyebrow">CURRENT ROUTE</div>
        <strong id="map-current-zone">BRIAR GLEN</strong>
        <p id="map-current-objective"></p>
        <div class="map-discovery-count" id="map-discovery-count"></div>
      </aside>
    </div>
    <div id="warden-journal-view" class="warden-view" hidden>
      <div class="journal-columns">
        <section class="journal-card current"><div class="eyebrow">CURRENT OBJECTIVE</div><h3 id="journal-objective-title">Field Work</h3><p id="journal-objective-text"></p><small id="journal-objective-progress"></small></section>
        <section class="journal-card"><div class="eyebrow">DISCOVERED PLACES</div><div id="journal-places" class="journal-list"></div></section>
        <section class="journal-card"><div class="eyebrow">WARDEN MILESTONES</div><div id="journal-milestones" class="journal-list"></div></section>
        <section class="journal-card"><div class="eyebrow">KNOWN RECIPES</div><div id="journal-recipes" class="journal-list"></div></section>
        <section class="journal-card"><div class="eyebrow">EQUIPMENT RECORD</div><div id="journal-gear" class="journal-list"></div></section>
      </div>
    </div>`;
  shell.appendChild(panel);

  const $ = id => document.getElementById(id);
  const tabMap = $('warden-tab-map');
  const tabJournal = $('warden-tab-journal');
  const mapView = $('warden-map-view');
  const journalView = $('warden-journal-view');

  const PLACES = [
    { key: 'briar', label: 'Briar Glen' },
    { key: 'meadow', label: 'Meadow Road' },
    { key: 'hollow', label: 'Copper Hollow' },
    { key: 'den', label: 'Emberback Den' },
    { key: 'grove', label: 'Mooncap Grove' },
    { key: 'rootway', label: 'Old Rootway' },
  ];

  function isAnyModalOpen() {
    return Boolean(
      (ui.inventoryPanel && !ui.inventoryPanel.hidden) ||
      (ui.tradePanel && !ui.tradePanel.hidden) ||
      (ui.craftPanel && !ui.craftPanel.hidden)
    );
  }

  function discover(key, message = null) {
    if (progress.mapDiscoveries[key]) return false;
    progress.mapDiscoveries[key] = true;
    if (message) toast(message);
    saveGame();
    return true;
  }

  function updateDiscoveries() {
    discover('briar');
    if (player.x >= -210) discover('meadow', 'Map updated — Meadow Road');
    if (player.x >= 660) discover('hollow', 'Map updated — Copper Hollow');
    if (player.x >= 1430 || progress.bossDefeated) discover('den', 'Map updated — Emberback Den');
    if (progress.groveDiscovered || (player.y <= -430 && player.x >= -80 && player.x <= 900)) discover('grove', 'Map updated — Mooncap Grove');
    if (progress.shortcutUnlocked) discover('rootway', 'Map updated — Old Rootway');
  }

  function placeMarkerState() {
    for (const place of PLACES) {
      const marker = $(`map-marker-${place.key}`);
      if (!marker) continue;
      const found = !!progress.mapDiscoveries[place.key];
      marker.classList.toggle('unknown', !found);
      marker.classList.toggle('discovered', found);
      const label = marker.querySelector('.marker-label');
      if (label) label.textContent = found ? place.label.toUpperCase() : 'UNKNOWN';
    }
    const rootPath = $('rootway-path');
    if (rootPath) rootPath.style.opacity = progress.mapDiscoveries.rootway ? '.7' : '.1';
  }

  function playerMapPoint() {
    if (player.y <= -430 && player.x >= -80 && player.x <= 900) {
      const t = Math.max(0, Math.min(1, (player.x + 80) / 980));
      return { x: 410 + t * 245, y: 220 - Math.min(1, Math.abs(player.y + 430) / 690) * 120 };
    }
    const t = Math.max(0, Math.min(1, (player.x + 1000) / 3160));
    return { x: 100 + t * 800, y: 350 + Math.max(-30, Math.min(30, player.y * .035)) };
  }

  function milestoneRows() {
    const masterworks = [progress.temperedSword, progress.briarstringBow, progress.moonrootStaff].filter(Boolean).length;
    return [
      ['Smoke in the Hollow', !!progress.contractComplete],
      ['Hollow Patrol', !!progress.patrolComplete],
      ['Grovekeeper defeated', !!progress.grovekeeperDefeated],
      ['Old Warden Cache recovered', !!progress.groveCacheClaimed],
      ['Reinforced Pickaxe', !!progress.reinforcedPickaxe],
      [`Masterwork arsenal ${masterworks}/3`, masterworks === 3],
    ];
  }

  function recipeRows() {
    return [
      ['Mira’s Healing Tonic', !!progress.groveDiscovered || (player.inventory.mooncap || 0) > 0],
      ['Reinforced Pickaxe', !!progress.groveCacheClaimed || !!progress.reinforcedPickaxe],
      ['Tempered Sword', !!progress.reinforcedPickaxe || !!progress.temperedSword],
      ['Briarstring Bow', !!progress.reinforcedPickaxe || !!progress.briarstringBow],
      ['Moonroot Staff', !!progress.reinforcedPickaxe || !!progress.moonrootStaff],
      ['Warden Oil', !!progress.groveCacheClaimed || (player.inventory.oil || 0) > 0],
    ];
  }

  function gearRows() {
    return [
      ['Copperguard Vest', !!progress.gearVest],
      ['Rootstep Charm', !!progress.gearCharm],
      ['Grovekeeper Thorn', !!progress.groveRelicOwned],
      ['Warden Trail Boots', !!progress.wardenBootsOwned],
      ['Tempered Sword', !!progress.temperedSword],
      ['Briarstring Bow', !!progress.briarstringBow],
      ['Moonroot Staff', !!progress.moonrootStaff],
    ];
  }

  function renderList(target, rows, unknownLabel = 'Undiscovered') {
    target.innerHTML = rows.map(([label, done]) => `<div class="journal-row ${done ? 'done' : 'locked'}"><span>${done ? '✓' : '•'}</span><b>${done ? label : unknownLabel}</b></div>`).join('');
  }

  function renderOverlay() {
    updateDiscoveries();
    placeMarkerState();
    const pt = playerMapPoint();
    $('map-player-marker')?.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
    const currentZone = zoneFor(player.x, player.y).name;
    $('map-current-zone').textContent = currentZone;
    $('map-current-objective').textContent = objectiveText();
    const found = PLACES.filter(p => progress.mapDiscoveries[p.key]).length;
    $('map-discovery-count').textContent = `${found} / ${PLACES.length} locations charted`;

    $('journal-objective-title').textContent = ui.questTitle?.textContent || 'Field Work';
    $('journal-objective-text').textContent = objectiveText();
    $('journal-objective-progress').textContent = objectiveProgress();
    renderList($('journal-places'), PLACES.map(p => [p.label, !!progress.mapDiscoveries[p.key]]));
    renderList($('journal-milestones'), milestoneRows(), 'Not completed');
    renderList($('journal-recipes'), recipeRows(), 'Unknown recipe');
    renderList($('journal-gear'), gearRows(), 'Not acquired');
  }

  function setTab(tab) {
    overlay.tab = tab === 'journal' ? 'journal' : 'map';
    const journal = overlay.tab === 'journal';
    mapView.hidden = journal;
    journalView.hidden = !journal;
    tabMap.classList.toggle('active', !journal);
    tabJournal.classList.toggle('active', journal);
    renderOverlay();
  }

  function setOpen(open, tab = overlay.tab) {
    if (open && isAnyModalOpen()) return false;
    overlay.open = !!open;
    panel.hidden = !overlay.open;
    backdrop.hidden = !overlay.open;
    launcher.setAttribute('aria-expanded', overlay.open ? 'true' : 'false');
    if (overlay.open) {
      touchMove.x = 0; touchMove.y = 0; keys.clear();
      setTab(tab);
    }
    return true;
  }

  launcher.addEventListener('click', () => setOpen(!overlay.open, 'map'));
  backdrop.addEventListener('pointerdown', () => setOpen(false));
  $('warden-overlay-close').addEventListener('click', () => setOpen(false));
  tabMap.addEventListener('click', () => setTab('map'));
  tabJournal.addEventListener('click', () => setTab('journal'));

  addEventListener('keydown', event => {
    if (event.code === 'KeyM' && !event.repeat) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(!overlay.open, 'map');
      return;
    }
    if (event.code === 'KeyL' && !event.repeat) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(!overlay.open, 'journal');
      return;
    }
    if (overlay.open) {
      if (event.code === 'Escape') setOpen(false);
      if (['Space','KeyF','KeyE','KeyC','ShiftLeft','ShiftRight','KeyJ','KeyK','Digit1','Digit2','Digit3','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
  }, true);

  const build9Attack = attack;
  attack = function build10Attack() { if (overlay.open) return; return build9Attack(); };
  const build9Dash = dash;
  dash = function build10Dash() { if (overlay.open) return; return build9Dash(); };
  const build9Interact = interact;
  interact = function build10Interact() { if (overlay.open) return; return build9Interact(); };
  const build9CraftSword = craftSword;
  craftSword = function build10CraftSword() { if (overlay.open) return; return build9CraftSword(); };

  const build9Update = update;
  update = function build10Update(dt) {
    updateDiscoveries();
    if (overlay.open) {
      renderOverlay();
      updateUI();
      return;
    }
    build9Update(dt);
  };

  const build9UpdateUI = updateUI;
  updateUI = function build10UpdateUI() {
    build9UpdateUI();
    launcher.querySelector('span:last-child').textContent = overlay.open ? 'CLOSE' : 'MAP';
  };

  if (hud) hud.appendChild(launcher);
  renderOverlay();

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.openMap = () => setOpen(true, 'map');
    window.__BRIAR_GLENDebug.openJournal = () => setOpen(true, 'journal');
    window.__BRIAR_GLENDebug.closeWardenBook = () => setOpen(false);
    window.__BRIAR_GLENDebug.getJournalState = () => ({
      open: overlay.open,
      tab: overlay.tab,
      discoveries: { ...progress.mapDiscoveries },
      discoveredCount: PLACES.filter(p => progress.mapDiscoveries[p.key]).length,
      places: PLACES.map(p => ({ key: p.key, label: p.label, discovered: !!progress.mapDiscoveries[p.key] })),
      milestones: milestoneRows().map(([label, complete]) => ({ label, complete })),
      recipes: recipeRows().map(([label, known]) => ({ label, known })),
      gear: gearRows().map(([label, owned]) => ({ label, owned })),
      currentZone: zoneFor(player.x, player.y).name,
    });
  }

  updateUI();
})();