(() => {
  'use strict';

  // Build 21: first-session onboarding on top of the canonical 20.1 hook bus.
  // Existing players keep the established UI; fresh players get a staged, skippable guide.
  const SAVE_KEY_21 = 'briar-glen-vslice-v1';
  const GUIDE_KEY = 'briar-glen-onboarding-v1';
  const START_INTENT_KEY = 'briar-glen-start-intent';
  const forceOnboarding = new URLSearchParams(location.search).get('onboarding') === '1';
  const automationBypass = !!navigator.webdriver && !forceOnboarding;
  const runtime = window.__BRIAR_GLEN_RUNTIME;
  if (!runtime) throw new Error('Build 21 requires the canonical runtime hook bus');

  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'styles-v21.css';
  style.dataset.build21Style = 'true';
  document.head.appendChild(style);

  function safeGet(storage, key) { try { return storage.getItem(key); } catch (_) { return null; } }
  function safeSet(storage, key, value) { try { storage.setItem(key, value); return true; } catch (_) { return false; } }
  function safeRemove(storage, key) { try { storage.removeItem(key); } catch (_) {} }
  function hasSave() {
    const raw = safeGet(localStorage, SAVE_KEY_21);
    if (!raw) return false;
    try {
      const state = JSON.parse(raw);
      return !!(state?.player || state?.progress);
    } catch (_) { return false; }
  }
  function readGuide() {
    const raw = safeGet(localStorage, GUIDE_KEY);
    if (!raw) return null;
    try {
      const state = JSON.parse(raw);
      return state && typeof state === 'object' ? state : null;
    } catch (_) { return null; }
  }
  function persistGuide() {
    safeSet(localStorage, GUIDE_KEY, JSON.stringify({ stage:guide.stage, complete:guide.complete, skipped:guide.skipped, originX:guide.originX, originY:guide.originY }));
  }

  const STAGES = [
    ['move','Find Your Feet','Move through Briar Glen with the left stick or WASD.','MOVE 55 PACES'],
    ['gather','Gather Briarleaf','Approach the green Briarleaf along Meadow Road and use USE / E. Gather three.','3 BRIARLEAF'],
    ['combat','First Fight','Face a threat and strike with ATTACK / Space. Your facing direction matters.','LAND A HIT'],
    ['dodge','Make Space','Use DODGE / Shift for a brief evasive step and invulnerability window.','DODGE ONCE'],
    ['hollow','Follow the Road','Continue east until the road opens into Copper Hollow.','REACH COPPER HOLLOW'],
    ['forge','Alden’s Work','Mine three Copper, then return to Alden in Briar Glen and forge the Reinforced Sword.','FORGE REINFORCED SWORD'],
    ['emberback','Smoke in the Hollow','Return east. Enter Emberback Den and defeat Emberback with your reinforced weapon.','DEFEAT EMBERBACK'],
    ['weapons','Choose a Weapon','Cycle to the Bow or Staff. Each weapon has its own range, rhythm and skill.','EQUIP BOW OR STAFF'],
    ['satchel','Open Your Satchel','Open the Satchel to review supplies, loot, equipment and field recipes.','OPEN SATCHEL'],
    ['skills','Weapon Skills','Use the highlighted weapon skill with SKILL / F. Each weapon has a distinct tactical role.','USE A SKILL'],
    ['map','Read the Field Book','Open MAP to see discovered routes and your Warden Journal.','OPEN MAP'],
  ];
  const stageIndex = Object.fromEntries(STAGES.map((stage,index)=>[stage[0],index]));
  const validStages = new Set(STAGES.map(stage=>stage[0]));
  const savedGuide = readGuide();
  const startIntent = safeGet(sessionStorage, START_INTENT_KEY);
  if (startIntent) safeRemove(sessionStorage, START_INTENT_KEY);

  const guide = {
    active:false,
    stage:'move',
    complete:false,
    skipped:false,
    originX:player.x,
    originY:player.y,
    combatHit:false,
    dodged:false,
    skillUsed:false,
    recoveryCount:0,
    transitions:0,
  };
  if (savedGuide && validStages.has(savedGuide.stage)) {
    guide.stage = savedGuide.stage;
    guide.complete = !!savedGuide.complete;
    guide.skipped = !!savedGuide.skipped;
    guide.originX = Number.isFinite(savedGuide.originX) ? savedGuide.originX : player.x;
    guide.originY = Number.isFinite(savedGuide.originY) ? savedGuide.originY : player.y;
  }

  const shell = document.getElementById('game-shell');
  const start = document.createElement('section');
  start.id = 'onboarding21-start';
  start.setAttribute('aria-label','Briar Glen start screen');
  start.innerHTML = `
    <div class="onboarding21-start-card">
      <div class="onboarding21-mark">❧</div>
      <div class="onboarding21-kicker">A WARDEN’S ROAD BEGINS</div>
      <h1>Briar Glen</h1>
      <p>Keep the roads open, learn the wilds, and make your name through fieldcraft rather than prophecy.</p>
      <div class="onboarding21-actions">
        <button id="onboarding21-continue" type="button">Continue</button>
        <button id="onboarding21-new" type="button">New Game</button>
      </div>
      <button id="onboarding21-audio" class="onboarding21-audio" type="button">Sound</button>
      <details class="onboarding21-controls">
        <summary>Controls</summary>
        <div class="onboarding21-control-grid">
          <span><b>Move</b><i>Stick / WASD</i></span><span><b>Attack</b><i>ATTACK / Space</i></span>
          <span><b>Dodge</b><i>DODGE / Shift</i></span><span><b>Use</b><i>USE / E</i></span>
          <span><b>Skill</b><i>SKILL / F</i></span><span><b>Weapon</b><i>Cycle / 1–3</i></span>
          <span><b>Satchel</b><i>Bag / I</i></span><span><b>Map</b><i>MAP / M</i></span>
        </div>
      </details>
      <small class="onboarding21-save-note">Progress saves locally on this device.</small>
    </div>`;
  shell.appendChild(start);

  const guideEl = document.createElement('section');
  guideEl.id = 'onboarding21-guide';
  guideEl.hidden = true;
  guideEl.setAttribute('aria-label','Warden field guide');
  guideEl.innerHTML = `
    <div class="onboarding21-guide-top"><span>WARDEN FIELD GUIDE</span><span id="onboarding21-progress"></span></div>
    <h2 id="onboarding21-guide-title"></h2>
    <p id="onboarding21-guide-text"></p>
    <div class="onboarding21-guide-foot"><span id="onboarding21-guide-hint"></span><button id="onboarding21-skip" type="button">Skip guide</button></div>`;
  shell.appendChild(guideEl);

  const recoveryEl = document.createElement('div');
  recoveryEl.id = 'onboarding21-recovery';
  recoveryEl.hidden = true;
  recoveryEl.textContent = 'Returned to Briar Glen • Health restored';
  shell.appendChild(recoveryEl);

  const startState = { open:false, hadSave:hasSave() };
  const continueBtn = document.getElementById('onboarding21-continue');
  const newBtn = document.getElementById('onboarding21-new');
  const audioBtn = document.getElementById('onboarding21-audio');
  const skipBtn = document.getElementById('onboarding21-skip');
  const progressEl = document.getElementById('onboarding21-progress');
  const guideTitle = document.getElementById('onboarding21-guide-title');
  const guideText = document.getElementById('onboarding21-guide-text');
  const guideHint = document.getElementById('onboarding21-guide-hint');

  function freshProgress() {
    return progress.step === 0 && !progress.bossDefeated && !progress.contractComplete &&
      (player.inventory.herb || 0) === 0 && (player.inventory.ore || 0) === 0;
  }
  function syncAudioButton() {
    const muted = window.__BRIAR_GLENDebug?.getFeelState?.().muted ?? false;
    audioBtn.textContent = muted ? '🔇 Sound: Off' : '🔊 Sound: On';
    audioBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  }
  function setStartOpen(value) {
    startState.open = !!value;
    start.hidden = !startState.open;
    document.documentElement.dataset.startScreen = startState.open ? 'open' : 'closed';
    if (startState.open) keys?.clear?.();
  }
  function stageData() { return STAGES[stageIndex[guide.stage] ?? 0]; }
  function renderGuide() {
    const active = guide.active && !guide.complete;
    guideEl.hidden = !active;
    document.documentElement.dataset.onboardingActive = active ? 'true' : 'false';
    if (!active) {
      delete document.documentElement.dataset.onboardingStage;
      return;
    }
    const data = stageData();
    document.documentElement.dataset.onboardingStage = guide.stage;
    progressEl.textContent = `${(stageIndex[guide.stage] ?? 0) + 1} / ${STAGES.length}`;
    guideTitle.textContent = data[1];
    guideText.textContent = data[2];
    guideHint.textContent = data[3];
  }
  function activateFreshGuide() {
    guide.active = true;
    guide.complete = false;
    guide.skipped = false;
    guide.stage = 'move';
    guide.originX = player.x;
    guide.originY = player.y;
    guide.combatHit = false;
    guide.dodged = false;
    guide.skillUsed = false;
    persistGuide();
    renderGuide();
  }
  function completeGuide(skipped = false) {
    guide.active = false;
    guide.complete = true;
    guide.skipped = !!skipped;
    persistGuide();
    renderGuide();
    if (!skipped) toast('Field guide complete — the roads are yours');
  }
  function setStage(next) {
    if (!validStages.has(next) || guide.stage === next || guide.complete) return false;
    guide.stage = next;
    guide.transitions += 1;
    persistGuide();
    renderGuide();
    return true;
  }
  function advance() {
    const index = stageIndex[guide.stage] ?? 0;
    if (index >= STAGES.length - 1) { completeGuide(false); return; }
    setStage(STAGES[index + 1][0]);
  }

  function startNewGame() {
    safeRemove(localStorage, SAVE_KEY_21);
    safeRemove(localStorage, GUIDE_KEY);
    safeSet(sessionStorage, START_INTENT_KEY, 'new');
    location.reload();
  }
  function continueGame() {
    setStartOpen(false);
    if (savedGuide && !guide.complete) {
      guide.active = true;
      renderGuide();
    }
  }

  continueBtn.disabled = !startState.hadSave;
  continueBtn.textContent = startState.hadSave ? 'Continue' : 'No Saved Journey';
  newBtn.addEventListener('click', startNewGame);
  continueBtn.addEventListener('click', continueGame);
  audioBtn.addEventListener('click', () => {
    const state = window.__BRIAR_GLENDebug?.getFeelState?.();
    if (state) window.__BRIAR_GLENDebug.setFeelMuted?.(!state.muted);
    syncAudioButton();
  });
  skipBtn.addEventListener('click', () => completeGuide(true));

  addEventListener('keydown', event => {
    if (startState.open) {
      if (event.code === 'Enter' && !continueBtn.disabled) continueGame();
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (!guide.active) return;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'KeyK') guide.dodged = true;
    if (event.code === 'KeyF') guide.skillUsed = true;
  }, { capture:true });
  document.addEventListener('pointerdown', event => {
    if (!guide.active) return;
    if (event.target === ui.dash) guide.dodged = true;
    if (event.target === ui.skill) guide.skillUsed = true;
  }, { capture:true });

  let previous = { x:player.x, y:player.y, hp:player.hp };
  let recoveryTimer = 0;
  function showRecovery() {
    guide.recoveryCount += 1;
    recoveryEl.hidden = false;
    clearTimeout(recoveryTimer);
    recoveryTimer = setTimeout(() => { recoveryEl.hidden = true; }, 1750);
  }
  function evaluateGuide() {
    if (!guide.active || guide.complete || startState.open) return;
    const zone = zoneFor(player.x, player.y)?.name || '';
    if (guide.stage === 'move' && Math.hypot(player.x - guide.originX, player.y - guide.originY) >= 55) advance();
    else if (guide.stage === 'gather' && (progress.step >= 1 || (player.inventory.herb || 0) >= 3)) advance();
    else if (guide.stage === 'combat' && guide.combatHit) advance();
    else if (guide.stage === 'dodge' && guide.dodged) advance();
    else if (guide.stage === 'hollow' && zone.includes('COPPER')) advance();
    else if (guide.stage === 'forge' && (player.reinforced || progress.step >= 3)) advance();
    else if (guide.stage === 'emberback' && progress.bossDefeated) advance();
    else if (guide.stage === 'weapons' && player.weaponType !== 'sword') advance();
    else if (guide.stage === 'satchel' && ui.inventoryPanel && !ui.inventoryPanel.hidden) advance();
    else if (guide.stage === 'skills' && guide.skillUsed) advance();
    else if (guide.stage === 'map') {
      const book = document.getElementById('warden-overlay');
      if (book && !book.hidden) completeGuide(false);
    }
  }

  runtime.registerHook('beforeUpdate','build21-start-pause', payload => {
    if (startState.open) payload.cancel = true;
  }, -1000);
  runtime.registerHook('afterUpdate','build21-guide-progress', () => {
    const returnedToTown = previous.hp <= 30 && Math.hypot(previous.x + 720, previous.y - 30) > 450 &&
      Math.hypot(player.x + 720, player.y - 30) < 120 && player.hp >= player.maxHp;
    if (returnedToTown) showRecovery();
    evaluateGuide();
    previous = { x:player.x, y:player.y, hp:player.hp };
  }, 1000);
  runtime.registerHook('beforeDamageEnemy','build21-first-combat', payload => {
    if (guide.active && !payload.cancel && payload.enemy && !payload.enemy.dead) guide.combatHit = true;
  });
  runtime.registerHook('afterUpdateUI','build21-guide-ui', evaluateGuide, 1000);

  syncAudioButton();
  if (automationBypass) {
    setStartOpen(false);
    guide.active = false;
    renderGuide();
  } else if (startIntent === 'new') {
    setStartOpen(false);
    activateFreshGuide();
  } else {
    setStartOpen(true);
    if (!startState.hadSave && freshProgress()) guide.active = false;
    else if (savedGuide && !guide.complete) guide.active = true;
    renderGuide();
  }

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.getOnboardingState = () => ({
      startOpen:startState.open,
      hadSave:startState.hadSave,
      automationBypass,
      forceOnboarding,
      guide:{ active:guide.active, stage:guide.stage, complete:guide.complete, skipped:guide.skipped, transitions:guide.transitions },
      flags:{ combatHit:guide.combatHit, dodged:guide.dodged, skillUsed:guide.skillUsed },
      recoveryCount:guide.recoveryCount,
      persisted:readGuide(),
    });
    window.__BRIAR_GLENDebug.setOnboardingStage = stage => { guide.active = true; guide.complete = false; setStage(stage); return window.__BRIAR_GLENDebug.getOnboardingState(); };
    window.__BRIAR_GLENDebug.skipOnboarding = () => { completeGuide(true); return true; };
    window.__BRIAR_GLENDebug.dismissStartScreen = () => { setStartOpen(false); return true; };
  }
})();
