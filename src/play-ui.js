(() => {
  'use strict';
  // Presentation only: move existing controls, retaining their original handlers.
  const $ = selector => document.querySelector(selector);
  const shell = $('.game-shell'), sidebar = $('.sidebar'), canvas = $('#game');
  const stage = document.createElement('section');
  stage.className = 'play-stage';
  stage.setAttribute('aria-label', 'Adventure');
  shell.insertBefore(stage, shell.firstChild);
  const objective = document.createElement('div');
  objective.className = 'objective-strip';
  objective.innerHTML = '<div><small>YOUR NEXT STEP</small><strong id="objective-text">Explore Briar Glen</strong><span id="objective-direction"></span></div><button id="objective-open" type="button" title="Open expedition journal (J)">Journal <kbd>J</kbd></button>';
  stage.append(objective, $('.canvas-wrap'));
  const controls = $('.mobile-controls');
  controls.classList.add('action-deck');
  controls.setAttribute('aria-label', 'Movement and actions');
  stage.append(controls);
  $('.tap-hint').remove();
  const actions = $('.actions');
  $('#attack-btn').innerHTML = 'Attack <kbd>Space</kbd>';
  $('#interact-btn').innerHTML = 'Use <kbd>E</kbd>';
  actions.insertAdjacentHTML('beforeend', '<button id="quick-brace" type="button">Brace <kbd>3</kbd></button><button id="quick-tonic" type="button">Tonic <kbd>Q</kbd></button>');
  $('#quick-brace').addEventListener('click', () => $('[data-skill="guard"]')?.click());
  $('#quick-tonic').addEventListener('click', () => $('#drink-tonic').click());
  const hint = document.createElement('span');
  hint.className = 'movement-hint'; hint.textContent = 'Click to travel · WASD to move';
  controls.prepend(hint);
  for (const button of document.querySelectorAll('[data-move]')) button.setAttribute('aria-label', `Move ${button.dataset.move}`);

  // Keep the original action elements and event handlers; append status, never a second action.
  for (const [button, id] of [['attack-btn','attack-readiness'], ['quick-brace','brace-readiness'], ['quick-tonic','tonic-readiness']]) {
    $(`#${button}`).insertAdjacentHTML('beforeend', `<small id="${id}" class="action-readiness"></small>`);
  }
  $('#attack-btn').setAttribute('aria-describedby', 'attack-explanation');
  const attackExplanation = document.createElement('span'); attackExplanation.id = 'attack-explanation'; attackExplanation.className = 'sr-only';
  actions.append(attackExplanation);

  const meters = $('.meters'); meters.classList.add('hud-meters');
  $('.topbar').insertBefore(meters, $('.top-stats'));
  for (const [id, label] of [['hp', 'Health'], ['energy', 'Energy']]) {
    const meter = $(`#${id}`), row = meter.closest('label');
    row.setAttribute('for', id);
    row.insertAdjacentHTML('beforeend', `<span id="${id}-text" class="meter-value">100 / 100</span>`);
    meter.setAttribute('aria-label', label);
  }
  const worldLine = $('#world-line'); worldLine.classList.add('world-notice');
  $('#app').insertBefore(worldLine, $('footer'));
  $('.topbar h1').insertAdjacentHTML('afterend', '<small class="brand-caption">A living adventure</small>');

  const cards = {
    nearby: $('#nearby').closest('.card'),
    pack: $('#inventory').closest('.card'),
    craft: $('[data-craft]').closest('.card'),
    character: $('.player-card'),
    skills: $('#skills').closest('.card'),
    log: $('.log-card')
  };
  const tabs = document.createElement('nav');
  tabs.className = 'panel-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Adventure panels');
  sidebar.prepend(tabs);
  const definitions = [['nearby', 'Nearby'], ['pack', 'Pack'], ['craft', 'Make'], ['journal', 'Journal'], ['character', 'You']];
  for (const [id, label] of definitions) {
    tabs.insertAdjacentHTML('beforeend', `<button type="button" role="tab" id="panel-tab-${id}" data-panel="${id}" aria-controls="panel-${id}" aria-selected="false" tabindex="-1">${label}</button>`);
    const panel = document.createElement('div'); panel.id = `panel-${id}`; panel.className = 'play-panel';
    panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', `panel-tab-${id}`); panel.tabIndex = 0; panel.hidden = true;
    sidebar.append(panel);
  }
  for (const id of ['nearby', 'pack', 'craft', 'character']) $(`#panel-${id}`).append(cards[id]);
  // Explain the existing Use action without replacing or adding an action handler.
  $('#interact-btn').insertAdjacentHTML('beforeend', '<small id="interact-readiness" class="action-readiness">None</small>');
  $('#interact-btn').setAttribute('aria-describedby', 'interact-explanation');
  actions.insertAdjacentHTML('beforeend', '<span id="interact-explanation" class="sr-only"></span>');
  const interaction = document.createElement('section'); interaction.id = 'interaction-context'; interaction.className = 'interaction-context';
  interaction.setAttribute('aria-label', 'Current Use action');
  interaction.innerHTML = '<small class="interaction-eyebrow">USE / E · RIGHT NOW</small><strong id="interaction-target">Nothing in reach</strong><p id="interaction-help"></p>';
  cards.nearby.prepend(interaction);
  cards.nearby.insertAdjacentHTML('beforeend', '<details class="interaction-controls"><summary>Movement &amp; interaction help</summary><p id="interaction-travel"></p><p>Use prioritizes residents, then landmarks, resources and loose items. Nearby can preview things just outside reach. The world keeps moving while panels are open.</p></details>');
  const loadout = document.createElement('div'); loadout.id = 'loadout-summary'; loadout.className = 'loadout-summary';
  loadout.setAttribute('role', 'group'); loadout.setAttribute('aria-label', 'Equipped gear and supplies');
  for (const [kind, label] of [['weapon','Weapon'], ['armor','Armor'], ['tool','Tool']]) {
    loadout.insertAdjacentHTML('beforeend', `<div id="loadout-${kind}" class="loadout-slot" data-condition="empty"><span>${label}</span><strong id="loadout-${kind}-name">Not equipped</strong><small id="loadout-${kind}-detail"></small></div>`);
  }
  loadout.insertAdjacentHTML('beforeend', '<p id="loadout-supplies"></p><p id="carry-state"></p><details class="equipment-care"><summary>Equipment care</summary><p>Select an item below to equip or stow it. Weapons, armor and tools work when equipped. Your Trail Pack, Trail Bedroll and Mireglass Lens work from your pack. Worn means 25% durability or less; gear remains functional until broken.</p><p>Mend (You → Skills) services a nearby resident who needs gear repair first. Otherwise it repairs your equipped weapon, or your tool when no weapon is equipped. A bow needs Ashwood; other tools and weapons need Iron Ore. Patch Jerkin in Make uses a Wolf Hide.</p><p>Comfort is not a hard capacity: you may carry more, but you move slower and use more energy. Your Trail Pack increases comfort according to its quality.</p></details><h3 class="inventory-heading">Carried items <small>Select gear to equip or stow</small></h3>');
  $('#inventory').before(loadout);
  $('#panel-character').append(cards.skills);
  const guide = document.createElement('section'); guide.className = 'card expedition-guide';
  guide.innerHTML = '<div class="card-title"><span>Stonepine expedition</span><small>Optional adventure</small></div><div id="guide-body"></div><h3>Before you leave</h3><p id="guide-preparation"></p><p class="guide-note">Gather Ashwood in Greenwood, herbs in South Meadow and Moss Fen, and hides from wolves. Make a bow and arrows, brew medicine, and rest before heading for the ridge. The world keeps moving while panels are open.</p>';
  $('#panel-journal').append(guide, cards.log);
  const apprentice = $('.apprentice-panel'), details = document.createElement('details'); details.id = 'apprentice-details';
  details.innerHTML = '<summary>Autonomous play &amp; details</summary>';
  apprentice.before(details); details.append(apprentice);
  for (const button of cards.craft.querySelectorAll('[data-craft]')) {
    const row = document.createElement('div'); row.className = 'recipe-row'; button.before(row); row.append(button);
    const note = document.createElement('small'); note.id = `recipe-${button.dataset.craft}`; note.dataset.recipeRequirements = button.dataset.craft;
    row.append(note); button.setAttribute('aria-describedby', note.id);
  }
  const setPanel = (id, focus = false) => {
    if (!definitions.some(([key]) => key === id)) return;
    for (const [key] of definitions) {
      const selected = key === id, tab = $(`#panel-tab-${key}`), panel = $(`#panel-${key}`);
      tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; panel.hidden = !selected;
    }
    if (focus) $(`#panel-tab-${id}`).focus();
  };
  tabs.addEventListener('click', event => { const tab = event.target.closest('[data-panel]'); if (tab) setPanel(tab.dataset.panel); });
  // Capture panel navigation so arrows do not simultaneously move the character.
  tabs.addEventListener('keydown', event => {
    const current = event.target.closest('[data-panel]'); if (!current) return;
    const index = definitions.findIndex(([id]) => id === current.dataset.panel);
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % definitions.length;
    if (event.key === 'ArrowLeft') next = (index + definitions.length - 1) % definitions.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = definitions.length - 1;
    if (next !== undefined) { event.preventDefault(); event.stopPropagation(); setPanel(definitions[next][0], true); }
  });
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    const id = {KeyI:'pack', KeyC:'craft', KeyJ:'journal', KeyK:'character', Escape:'nearby'}[event.code];
    if (id) { event.preventDefault(); setPanel(id); canvas.focus({preventScroll:true}); }
    if (event.code === 'KeyE') setPanel('nearby');
  });
  $('#objective-open').addEventListener('click', () => setPanel('journal', true));
  $('#interact-btn').addEventListener('click', () => setPanel('nearby'));
  canvas.tabIndex = 0;
  canvas.addEventListener('pointerup', () => { setPanel('nearby'); canvas.focus({preventScroll:true}); });
  $('footer').innerHTML = '<span>Pack <kbd>I</kbd> · Make <kbd>C</kbd> · Journal <kbd>J</kbd> · Skills <kbd>K</kbd></span><span>Auto-save · Your progress stays in this browser</span>';
  setPanel('nearby');
  // Keep one world unit per CSS pixel; small screens no longer shrink a 960px map.
  const resize = () => {
    const rect = canvas.getBoundingClientRect(), width = Math.max(1, Math.round(rect.width)), height = Math.max(1, Math.round(rect.height));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  };
  new ResizeObserver(resize).observe($('.canvas-wrap')); resize();
  document.documentElement.dataset.playUi = 'ready';
})();
