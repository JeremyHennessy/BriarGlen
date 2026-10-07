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
  objective.innerHTML = '<div><small>YOUR NEXT STEP</small><strong id="objective-text">Explore Briar Glen</strong><span id="objective-direction"></span><span id="objective-preparation" class="objective-preparation" hidden></span></div><button id="objective-open" type="button" title="Open expedition journal (J)">Journal <kbd>J</kbd></button>';
  stage.append(objective, $('.canvas-wrap'));
  $('.canvas-wrap').insertAdjacentHTML('beforeend', '<div id="combat-cue" class="combat-cue" hidden role="status"><strong id="combat-threat"></strong><span id="combat-action"></span></div>');
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
  cards.nearby.insertAdjacentHTML('beforeend', '<details class="interaction-controls"><summary>Movement &amp; interaction help</summary><p id="interaction-travel"></p><p>Use prioritizes residents, then landmarks, resources and loose items. Nearby can preview things just outside reach. With the panel itself focused, arrow keys and Space scroll it; Escape returns focus to the world. The world keeps moving while panels are open.</p></details>');
  const loadout = document.createElement('div'); loadout.id = 'loadout-summary'; loadout.className = 'loadout-summary';
  loadout.setAttribute('role', 'group'); loadout.setAttribute('aria-label', 'Equipped gear and supplies');
  for (const [kind, label] of [['weapon','Weapon'], ['armor','Armor'], ['tool','Tool']]) {
    loadout.insertAdjacentHTML('beforeend', `<div id="loadout-${kind}" class="loadout-slot" data-condition="empty"><span>${label}</span><strong id="loadout-${kind}-name">Not equipped</strong><small id="loadout-${kind}-detail"></small></div>`);
  }
  loadout.insertAdjacentHTML('beforeend', '<p id="loadout-supplies"></p><p id="carry-state"></p><details class="equipment-care"><summary>Equipment care</summary><p>Select an item below to equip or stow it. Weapons, armor and tools work when equipped. Your Trail Pack, Trail Bedroll and Mireglass Lens work from your pack. Worn means 25% durability or less; gear remains functional until broken.</p><p>Mend (You → Skills) services a nearby resident who needs gear repair first. Otherwise it repairs your equipped weapon, or your tool when no weapon is equipped. A bow needs Ashwood; other tools and weapons need Iron Ore. Patch Jerkin in Make uses a Wolf Hide.</p><p>Comfort is not a hard capacity: you may carry more, but you move slower and use more energy. Your Trail Pack increases comfort according to its quality.</p></details><h3 class="inventory-heading">Carried items <small>Select gear to equip or stow</small></h3>');
  $('#inventory').before(loadout);
  // Keep the persistent route honest about the preparation state already shown in Journal.
  // Presentation only: derive from rendered objective/loadout state; never gate travel or mutate game data.
  const objectivePreparation = $('#objective-preparation');
  const syncObjectivePreparation = () => {
    const next = $('#objective-text')?.textContent.trim() || '';
    const stonepineActive = next === 'Chart Stonepine Overlook'
      || next === 'Secure the Stonepine Waycache'
      || next.startsWith('Store ')
      || next === 'Return to the Trail Ledger in Briar Glen';
    const condition = $('#loadout-weapon')?.dataset.condition || 'empty';
    const needsWeapon = stonepineActive && (condition === 'empty' || condition === 'broken');
    objectivePreparation.hidden = !needsWeapon;
    objectivePreparation.textContent = needsWeapon ? 'Prepare first · equip or make a working weapon' : '';
  };
  const preparationObserver = new MutationObserver(syncObjectivePreparation);
  preparationObserver.observe($('#objective-text'), {childList:true,subtree:true,characterData:true});
  preparationObserver.observe($('#loadout-weapon'), {attributes:true,attributeFilter:['data-condition']});
  syncObjectivePreparation();
  // Read-only Pack categories: CSS filters existing rows before layout/focus restoration.
  const inventory = $('#inventory'), packCategories = [['all','All'],['gear','Gear'],['supplies','Supplies'],['materials','Materials']];
  const packFilters = document.createElement('div'); packFilters.className = 'pack-filters';
  packFilters.setAttribute('role','group'); packFilters.setAttribute('aria-label','Carried item categories');
  for (const [id,label] of packCategories) packFilters.insertAdjacentHTML('beforeend', `<button type="button" data-pack-filter="${id}" aria-pressed="${id === 'all'}" aria-controls="inventory">${label}</button>`);
  const packStatus = document.createElement('span'); packStatus.id = 'pack-filter-status'; packStatus.className = 'sr-only'; packStatus.setAttribute('role','status');
  const packEmpty = document.createElement('p'); packEmpty.id = 'pack-filter-empty'; packEmpty.className = 'guide-note'; packEmpty.hidden = true;
  inventory.before(packFilters,packStatus,packEmpty);
  const updatePackCategoryCount = () => {
    const id = inventory.dataset.packView, rows = [...inventory.querySelectorAll('.item-row')];
    const count = rows.filter(row => id === 'all' || row.dataset.packGroup === id).length;
    const label = packCategories.find(([key]) => key === id)[1], text = `${label}: ${count} of ${rows.length} carried item types`;
    if (packStatus.textContent !== text) packStatus.textContent = text;
    packEmpty.hidden = rows.length === 0 || count > 0;
    if (!packEmpty.hidden) packEmpty.textContent = `No carried ${label.toLowerCase()}. Choose All to see other items.`;
  };
  packFilters.addEventListener('click', event => {
    const button = event.target.closest('[data-pack-filter]'); if (!button || !packFilters.contains(button)) return;
    inventory.dataset.packView = button.dataset.packFilter;
    for (const choice of packFilters.querySelectorAll('button')) choice.setAttribute('aria-pressed',String(choice === button));
    updatePackCategoryCount(); button.focus({preventScroll:true});
  });
  inventory.dataset.packView = 'all';
  // Observe only replaced inventory children; filtering never writes into the item rows.
  new MutationObserver(updatePackCategoryCount).observe(inventory,{childList:true});
  updatePackCategoryCount();
  $('#panel-character').append(cards.skills);
  cards.character.id = 'character-status'; cards.skills.id = 'character-skills';
  const characterSections = document.createElement('div'); characterSections.className = 'character-sections';
  characterSections.setAttribute('role', 'tablist'); characterSections.setAttribute('aria-label', 'Character sections');
  characterSections.innerHTML = '<button type="button" role="tab" data-character-section="status" aria-controls="character-status" aria-selected="true" tabindex="0">Status</button><button type="button" role="tab" data-character-section="skills" aria-controls="character-skills" aria-selected="false" tabindex="-1">Skills</button>';
  const setCharacterSection = (id, focus = false) => {
    if (!['status','skills'].includes(id)) return;
    cards.character.hidden = id !== 'status'; cards.skills.hidden = id !== 'skills';
    for (const button of characterSections.querySelectorAll('[data-character-section]')) {
      const selected = button.dataset.characterSection === id;
      button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus({preventScroll:true});
    }
  };
  characterSections.addEventListener('click', event => {
    const button = event.target.closest('[data-character-section]'); if (button) setCharacterSection(button.dataset.characterSection);
  });
  characterSections.addEventListener('keydown', event => {
    const current = event.target.closest('[data-character-section]'); if (!current) return;
    const ids = ['status','skills'], index = ids.indexOf(current.dataset.characterSection);
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % ids.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + ids.length - 1) % ids.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = ids.length - 1;
    if (next !== undefined) { event.preventDefault(); event.stopPropagation(); setCharacterSection(ids[next], true); }
  });
  $('#panel-character').prepend(characterSections);
  setCharacterSection('status');
  const guide = document.createElement('section'); guide.id = 'journal-plan'; guide.className = 'card expedition-guide';
  guide.innerHTML = '<div class="card-title"><span>Stonepine expedition</span><small>Optional adventure</small></div><div class="guide-tools" role="group" aria-label="Expedition preparation panels"><button type="button" data-guide-panel="pack">Check gear</button><button type="button" data-guide-panel="craft">Make supplies</button><button type="button" data-guide-panel="character">Skills &amp; recovery</button></div><h3>Field preparation</h3><p id="guide-preparation"></p><h3>Waycache provisions</h3><div class="guide-provisions"><p id="guide-bread-plan"></p><p id="guide-arrows-plan"></p><p id="guide-deposit-help"></p></div><h3>Route checklist</h3><div id="guide-body"></div><details class="guide-sources"><summary>Where to get supplies</summary><p class="guide-note">Gather Ashwood in Greenwood, herbs in South Meadow and Moss Fen, and hides from wolves. Make a bow and arrows, brew medicine, and rest before heading for the ridge. Keep Brown Bread for the cache; check Nearby trades when you need more. Bring extra arrows for bow combat. The world keeps moving while panels are open.</p></details><details id="exploration-leads" hidden><summary>Exploration leads</summary><p class="guide-note">Beyond Stonepine: these are existing places to explore, not new tracked quests. You may have visited them already.</p><p><strong>Old Quarry · Deep Quarry Seam.</strong> Defeating Emberback reopens the seam. Equip a working Iron Pick and bring 14 energy to mine fine Iron Ore; it can be worked once each day.</p><p><strong>Moss Fen · Moonwell Hollow.</strong> Visit after dusk for fine Mooncaps. Its harvest is available once each night.</p><p><strong>Far Moss Fen · Mirecaller.</strong> Defeating this creature leaves a Mireglass Lens in the reeds. Pick it up and carry it to extend Survey from 7 to 11 seconds.</p></details>';
  cards.log.id = 'journal-log';
  const journalSections = document.createElement('div'); journalSections.className = 'journal-sections';
  journalSections.setAttribute('role', 'tablist'); journalSections.setAttribute('aria-label', 'Journal sections');
  journalSections.innerHTML = '<button type="button" role="tab" data-journal-section="plan" aria-controls="journal-plan" aria-selected="true" tabindex="0">Plan</button><button type="button" role="tab" data-journal-section="log" aria-controls="journal-log" aria-selected="false" tabindex="-1">Log</button>';
  const setJournalSection = (id, focus = false) => {
    if (!['plan','log'].includes(id)) return;
    guide.hidden = id !== 'plan'; cards.log.hidden = id !== 'log';
    for (const button of journalSections.querySelectorAll('[data-journal-section]')) {
      const selected = button.dataset.journalSection === id;
      button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus({preventScroll:true});
    }
  };
  journalSections.addEventListener('click', event => {
    const button = event.target.closest('[data-journal-section]'); if (button) setJournalSection(button.dataset.journalSection);
  });
  journalSections.addEventListener('keydown', event => {
    const current = event.target.closest('[data-journal-section]'); if (!current) return;
    const ids = ['plan','log'], index = ids.indexOf(current.dataset.journalSection);
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % ids.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + ids.length - 1) % ids.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = ids.length - 1;
    if (next !== undefined) { event.preventDefault(); event.stopPropagation(); setJournalSection(ids[next], true); }
  });
  $('#panel-journal').append(journalSections, guide, cards.log);
  setJournalSection('plan');
  const apprentice = $('.apprentice-panel'), details = document.createElement('details'); details.id = 'apprentice-details';
  details.innerHTML = '<summary>Autonomous play &amp; details</summary>';
  apprentice.before(details); details.append(apprentice);
  for (const button of cards.craft.querySelectorAll('[data-craft]')) {
    const row = document.createElement('div'); row.className = 'recipe-row'; button.before(row); row.append(button);
    const note = document.createElement('small'); note.id = `recipe-${button.dataset.craft}`; note.dataset.recipeRequirements = button.dataset.craft;
    row.append(note); button.setAttribute('aria-describedby', note.id);
  }
  // Presentation-only categories: retain every original recipe/care button and handler.
  const craftList = cards.craft.querySelector('.nearby'); craftList.id = 'craft-list';
  const craftCategories = [['all','All'], ['supplies','Supplies'], ['gear','Gear'], ['care','Care']];
  const craftFilters = document.createElement('div'); craftFilters.className = 'craft-filters';
  craftFilters.setAttribute('role', 'group'); craftFilters.setAttribute('aria-label', 'Make categories');
  for (const [id, label] of craftCategories) craftFilters.insertAdjacentHTML('beforeend', `<button type="button" data-craft-filter="${id}" aria-pressed="${id === 'all'}" aria-controls="craft-list">${label}</button>`);
  const craftStatus = cards.craft.querySelector('.card-title small'); craftStatus.id = 'craft-filter-status'; craftStatus.setAttribute('role', 'status');
  craftList.before(craftFilters);
  const gearRecipes = new Set(['pick','blade','bow','bedroll','trailpack','jerkin']);
  const craftEntries = [...craftList.querySelectorAll('.recipe-row')].map(row => ({node:row, category:gearRecipes.has(row.querySelector('[data-craft]').dataset.craft) ? 'gear' : 'supplies'}));
  for (const id of ['patch-jerkin','make-camp','drink-tonic']) craftEntries.push({node:document.getElementById(id), category:'care'});
  const selectCraftCategory = id => {
    const category = craftCategories.find(([key]) => key === id); if (!category) return;
    for (const entry of craftEntries) entry.node.hidden = id !== 'all' && entry.category !== id;
    for (const button of craftFilters.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.craftFilter === id));
    craftStatus.textContent = `${category[1]} · ${craftEntries.filter(entry => !entry.node.hidden).length} actions`;
  };
  craftFilters.addEventListener('click', event => {
    const button = event.target.closest('[data-craft-filter]'); if (!button || !craftFilters.contains(button)) return;
    selectCraftCategory(button.dataset.craftFilter); button.focus({preventScroll:true});
  });
  selectCraftCategory('all');
  const setPanel = (id, focus = false) => {
    if (!definitions.some(([key]) => key === id)) return;
    for (const [key] of definitions) {
      const selected = key === id, tab = $(`#panel-tab-${key}`), panel = $(`#panel-${key}`);
      tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; panel.hidden = !selected;
    }
    if (focus) $(`#panel-tab-${id}`).focus();
  };
  tabs.addEventListener('click', event => { const tab = event.target.closest('[data-panel]'); if (tab) setPanel(tab.dataset.panel); });
  // Reading keys belong to the focused panel, not the world. Keep native scroll/activation.
  sidebar.addEventListener('keydown', event => {
    const panel = event.target.closest('.play-panel');
    if (!panel || panel.hidden) return;
    const readingKey = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(event.code);
    const readingSpace = event.code === 'Space' && !event.target.closest('button,summary,[role="button"],input,textarea,select,[contenteditable="true"]');
    if (readingKey || readingSpace) event.stopPropagation();
  });
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
    if (event.code === 'KeyK') { event.preventDefault(); setCharacterSection('skills'); setPanel('character'); canvas.focus({preventScroll:true}); return; }
    const id = {KeyI:'pack', KeyC:'craft', KeyJ:'journal', Escape:'nearby'}[event.code];
    if (id) { event.preventDefault(); setPanel(id); canvas.focus({preventScroll:true}); }
    if (event.code === 'KeyE') setPanel('nearby');
  });
  // Navigation only: these shortcuts never craft, equip, travel or spend a resource.
  guide.addEventListener('click', event => {
    const button = event.target.closest('[data-guide-panel]');
    if (button && guide.contains(button)) {
      if (button.dataset.guidePanel === 'character') setCharacterSection('skills');
      setPanel(button.dataset.guidePanel, true);
    }
  });
  $('#objective-open').addEventListener('click', () => { setJournalSection('plan'); setPanel('journal', true); });
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
