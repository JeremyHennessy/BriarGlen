(() => {
  'use strict';

  // Build 13: presentation/game-feel only. Earlier layers remain authoritative for
  // damage, cooldowns, rewards, progression and saves.
  const AUDIO_PREF_KEY = 'briar-glen-audio-muted';
  const feel = {
    hitStop: 0,
    flash: 0,
    walking: false,
    walkPhase: 0,
    walkDistance: 0,
    afterimageClock: 0,
    afterimages: [],
    impacts: [],
    deaths: [],
    routedAudioEvents: 0,
    playedAudioEvents: 0,
    recentAudio: [],
    stepEvents: 0,
    afterimagesGenerated: 0,
    impactsGenerated: 0,
    deathsGenerated: 0,
    muted: readMuted(),
    audioReady: false,
    audioContext: null,
    masterGain: null,
    ambientGain: null,
    ambientFilter: null,
    ambientSource: null,
    ambientHum: null,
    ambientZone: '',
    lastPlayerX: player.x,
    lastPlayerY: player.y,
  };

  function readMuted() {
    try { return localStorage.getItem(AUDIO_PREF_KEY) === '1'; }
    catch (_) { return false; }
  }

  function writeMuted() {
    try { localStorage.setItem(AUDIO_PREF_KEY, feel.muted ? '1' : '0'); }
    catch (_) { /* private browsing/storage restrictions are non-fatal */ }
  }

  const shell = document.getElementById('game-shell');
  const soundButton = document.createElement('button');
  soundButton.id = 'sound-btn';
  soundButton.type = 'button';
  soundButton.setAttribute('aria-label', 'Toggle game sound');
  soundButton.title = 'Toggle sound';
  shell.appendChild(soundButton);

  function syncSoundButton() {
    soundButton.textContent = feel.muted ? '🔇' : '🔊';
    soundButton.setAttribute('aria-pressed', feel.muted ? 'true' : 'false');
    soundButton.dataset.muted = feel.muted ? 'true' : 'false';
  }

  function setMuted(value) {
    feel.muted = !!value;
    writeMuted();
    syncSoundButton();
    if (feel.masterGain && feel.audioContext) {
      const now = feel.audioContext.currentTime;
      feel.masterGain.gain.cancelScheduledValues(now);
      feel.masterGain.gain.setTargetAtTime(feel.muted ? 0.0001 : 0.12, now, 0.025);
    }
    return feel.muted;
  }

  function ensureAudio() {
    if (feel.audioReady && feel.audioContext) {
      if (feel.audioContext.state === 'suspended') feel.audioContext.resume().catch(() => {});
      return feel.audioContext;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    try {
      const audio = new AudioCtor();
      const master = audio.createGain();
      master.gain.value = feel.muted ? 0.0001 : 0.12;
      master.connect(audio.destination);

      const ambientGain = audio.createGain();
      ambientGain.gain.value = 0.0001;
      const ambientFilter = audio.createBiquadFilter();
      ambientFilter.type = 'lowpass';
      ambientFilter.frequency.value = 650;
      ambientGain.connect(ambientFilter);
      ambientFilter.connect(master);

      const seconds = 2;
      const buffer = audio.createBuffer(1, audio.sampleRate * seconds, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const source = audio.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(ambientGain);
      source.start();

      const hum = audio.createOscillator();
      const humGain = audio.createGain();
      hum.type = 'sine';
      hum.frequency.value = 72;
      humGain.gain.value = 0.012;
      hum.connect(humGain);
      humGain.connect(ambientFilter);
      hum.start();

      feel.audioContext = audio;
      feel.masterGain = master;
      feel.ambientGain = ambientGain;
      feel.ambientFilter = ambientFilter;
      feel.ambientSource = source;
      feel.ambientHum = hum;
      feel.audioReady = true;
      updateAmbience(true);
      if (audio.state === 'suspended') audio.resume().catch(() => {});
      return audio;
    } catch (_) {
      return null;
    }
  }

  function tone(startFreq, endFreq, duration, gainValue, type = 'sine', delay = 0) {
    const audio = feel.audioContext;
    if (!audio || feel.muted) return;
    const now = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, startFreq), now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), now + Math.min(0.012, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(feel.masterGain);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function noise(duration, gainValue, cutoff = 1200, delay = 0) {
    const audio = feel.audioContext;
    if (!audio || feel.muted) return;
    const now = audio.currentTime + delay;
    const samples = Math.max(1, Math.floor(audio.sampleRate * duration));
    const buffer = audio.createBuffer(1, samples, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(Math.max(0.0002, gainValue), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(feel.masterGain);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  function playSound(kind) {
    const audio = feel.audioContext;
    if (!audio || feel.muted) return;
    feel.playedAudioEvents += 1;
    if (kind === 'sword') {
      noise(.075, .045, 2400); tone(260, 115, .09, .035, 'triangle');
    } else if (kind === 'bow') {
      tone(720, 270, .075, .032, 'triangle'); noise(.045, .025, 3200, .018);
    } else if (kind === 'staff') {
      tone(330, 720, .17, .028, 'sine'); tone(165, 360, .19, .018, 'triangle', .015);
    } else if (kind === 'hit') {
      noise(.055, .045, 950); tone(125, 72, .065, .03, 'triangle');
    } else if (kind === 'heavy-hit') {
      noise(.085, .065, 720); tone(92, 42, .12, .05, 'sawtooth');
    } else if (kind === 'kill') {
      noise(.12, .045, 650); tone(170, 52, .2, .035, 'triangle');
    } else if (kind === 'hurt') {
      noise(.07, .04, 650); tone(115, 58, .1, .035, 'sawtooth');
    } else if (kind === 'dash') {
      noise(.11, .04, 2200); tone(360, 130, .12, .025, 'triangle');
    } else if (kind === 'step') {
      noise(.035, .014, 420);
    } else if (kind === 'gather') {
      tone(420, 650, .11, .018, 'sine');
    } else if (kind === 'mine') {
      tone(195, 88, .09, .035, 'square'); noise(.05, .025, 1100, .012);
    } else if (kind === 'tonic') {
      tone(380, 760, .2, .022, 'sine');
    } else if (kind === 'skill') {
      tone(210, 490, .14, .028, 'triangle'); noise(.06, .022, 1800);
    } else if (kind === 'ui') {
      tone(520, 620, .055, .012, 'sine');
    }
  }

  function routeSound(kind) {
    feel.routedAudioEvents += 1;
    feel.recentAudio.push(kind);
    if (feel.recentAudio.length > 16) feel.recentAudio.shift();
    if (feel.audioReady && !feel.muted) playSound(kind);
  }

  function ambienceProfile() {
    const zone = zoneFor(player.x, player.y)?.name || '';
    if (zone.includes('MOSSWATER')) return { zone, gain: .034, cutoff: 360, hum: 52 };
    if (zone.includes('MOONCAP')) return { zone, gain: .026, cutoff: 720, hum: 78 };
    if (zone.includes('EMBERBACK')) return { zone, gain: .025, cutoff: 300, hum: 48 };
    if (zone.includes('COPPER')) return { zone, gain: .022, cutoff: 520, hum: 62 };
    if (zone.includes('BRIAR GLEN')) return { zone, gain: .018, cutoff: 980, hum: 82 };
    return { zone, gain: .022, cutoff: 820, hum: 74 };
  }

  function updateAmbience(force = false) {
    if (!feel.audioReady || !feel.audioContext || !feel.ambientGain || !feel.ambientFilter) return;
    const profile = ambienceProfile();
    if (!force && profile.zone === feel.ambientZone) return;
    feel.ambientZone = profile.zone;
    const now = feel.audioContext.currentTime;
    feel.ambientGain.gain.setTargetAtTime(feel.muted ? 0.0001 : profile.gain, now, .4);
    feel.ambientFilter.frequency.setTargetAtTime(profile.cutoff, now, .45);
    feel.ambientHum?.frequency.setTargetAtTime(profile.hum, now, .45);
  }

  function addImpact(e, dealt, heavy) {
    feel.impacts.push({ x: e.x, y: e.y, life: heavy ? .28 : .2, maxLife: heavy ? .28 : .2, heavy, dealt });
    feel.impactsGenerated += 1;
    const recoil = norm(e.x - player.x, e.y - player.y);
    e.__feelRecoilX = recoil.x;
    e.__feelRecoilY = recoil.y;
    e.__feelRecoilLife = heavy ? .14 : .1;
    feel.hitStop = Math.max(feel.hitStop, heavy ? .055 : .026);
    feel.flash = Math.max(feel.flash, heavy ? .18 : .1);
    camera.shake = Math.max(camera.shake, heavy ? 9 : 5.5);
    routeSound(heavy ? 'heavy-hit' : 'hit');
  }

  function addDeath(e) {
    feel.deaths.push({ x: e.x, y: e.y, life: .42, maxLife: .42, radius: e.radius || 28 });
    feel.deathsGenerated += 1;
    feel.flash = Math.max(feel.flash, .14);
    camera.shake = Math.max(camera.shake, e.type === 'boss' || e.type === 'fenwarden' || e.type === 'grovekeeper' ? 12 : 6.5);
    routeSound('kill');
  }

  function updateFeel(dt, movementDistance = 0) {
    feel.flash = Math.max(0, feel.flash - dt * 2.8);
    for (const item of feel.afterimages) item.life -= dt;
    for (const item of feel.impacts) item.life -= dt;
    for (const item of feel.deaths) item.life -= dt;
    feel.afterimages = feel.afterimages.filter(item => item.life > 0);
    feel.impacts = feel.impacts.filter(item => item.life > 0);
    feel.deaths = feel.deaths.filter(item => item.life > 0);
    for (const e of enemies) if (e.__feelRecoilLife > 0) e.__feelRecoilLife = Math.max(0, e.__feelRecoilLife - dt);

    if (movementDistance > .05) {
      feel.walkDistance += movementDistance;
      feel.walkPhase += movementDistance * .075;
      feel.walking = player.dashTimer <= 0;
      if (player.dashTimer <= 0 && feel.walkDistance >= 68) {
        feel.walkDistance %= 68;
        feel.stepEvents += 1;
        routeSound('step');
      }
    } else {
      feel.walking = false;
    }

    if (player.dashTimer > 0 && movementDistance > .1) {
      feel.afterimageClock -= dt;
      if (feel.afterimageClock <= 0) {
        feel.afterimageClock = .038;
        feel.afterimages.push({
          x: player.x, y: player.y, facingX: player.facingX, facingY: player.facingY,
          life: .2, maxLife: .2,
        });
        feel.afterimagesGenerated += 1;
      }
    } else {
      feel.afterimageClock = 0;
    }

    updateAmbience();
  }

  const build12Update = update;
  update = function build13Update(dt) {
    if (feel.hitStop > 0) {
      feel.hitStop = Math.max(0, feel.hitStop - dt);
      updateFeel(dt * .35, 0);
      updateUI();
      return;
    }
    const beforeX = player.x;
    const beforeY = player.y;
    build12Update(dt);
    const movement = Math.hypot(player.x - beforeX, player.y - beforeY);
    updateFeel(dt, movement);
    feel.lastPlayerX = player.x;
    feel.lastPlayerY = player.y;
  };

  const build12DamageEnemy = damageEnemy;
  damageEnemy = function build13DamageEnemy(e, amount, opts = {}) {
    const before = e?.hp;
    const result = build12DamageEnemy(e, amount, opts);
    if (e && Number.isFinite(before) && e.hp < before) {
      const dealt = before - e.hp;
      addImpact(e, dealt, dealt >= 40);
    }
    return result;
  };

  const build12KillEnemy = killEnemy;
  killEnemy = function build13KillEnemy(e) {
    const wasAlive = !!e && !e.dead;
    const result = build12KillEnemy(e);
    if (wasAlive && e?.dead) addDeath(e);
    return result;
  };

  const build12DamagePlayer = damagePlayer;
  damagePlayer = function build13DamagePlayer(amount, source) {
    const before = player.hp;
    const result = build12DamagePlayer(amount, source);
    if (player.hp < before) {
      feel.hitStop = Math.max(feel.hitStop, .035);
      feel.flash = Math.max(feel.flash, .24);
      camera.shake = Math.max(camera.shake, 8);
      routeSound('hurt');
    }
    return result;
  };

  const build12Attack = attack;
  attack = function build13Attack() {
    const beforeCd = player.attackCd;
    const beforeProjectiles = projectiles.length;
    const beforeSlashes = slashes.length;
    const weapon = player.weaponType;
    const result = build12Attack();
    const triggered = player.attackCd > beforeCd + .005 || projectiles.length > beforeProjectiles || slashes.length > beforeSlashes;
    if (triggered) routeSound(weapon === 'bow' ? 'bow' : weapon === 'staff' ? 'staff' : 'sword');
    return result;
  };

  const build12Dash = dash;
  dash = function build13Dash() {
    const before = player.dashTimer;
    const result = build12Dash();
    if (player.dashTimer > before + .01) {
      feel.afterimageClock = 0;
      routeSound('dash');
    }
    return result;
  };

  const build12Interact = interact;
  interact = function build13Interact() {
    const before = {
      herb: player.inventory.herb || 0,
      mooncap: player.inventory.mooncap || 0,
      ore: player.inventory.ore || 0,
      iron: player.inventory.iron || 0,
      mossglass: player.inventory.mossglass || 0,
    };
    const result = build12Interact();
    const after = player.inventory;
    if ((after.herb || 0) > before.herb || (after.mooncap || 0) > before.mooncap) routeSound('gather');
    if ((after.ore || 0) > before.ore || (after.iron || 0) > before.iron || (after.mossglass || 0) > before.mossglass) routeSound('mine');
    return result;
  };

  const build12SelectWeapon = selectWeapon;
  selectWeapon = function build13SelectWeapon(type, notify = true) {
    const before = player.weaponType;
    const result = build12SelectWeapon(type, notify);
    if (player.weaponType !== before) routeSound('ui');
    return result;
  };

  function drawAfterimage(item) {
    const p = worldToScreen(item.x, item.y);
    const z = camera.zoom;
    const alpha = Math.max(0, item.life / item.maxLife) * .23;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.fillStyle = '#9fc7ad';
    ctx.beginPath();
    ctx.moveTo(-13*z, 0); ctx.lineTo(-9*z, -31*z); ctx.lineTo(0, -40*z); ctx.lineTo(11*z, -30*z); ctx.lineTo(14*z, 1*z); ctx.closePath();
    ctx.fill();
    circle(item.facingX*5*z, -42*z + item.facingY*2*z, 8*z, '#c6d8c9');
    ctx.restore();
  }

  const build12DrawPlayer = drawPlayer;
  drawPlayer = function build13DrawPlayer() {
    for (const image of feel.afterimages) drawAfterimage(image);
    const bob = feel.walking ? Math.sin(feel.walkPhase) * 2.1 * camera.zoom : 0;
    ctx.save();
    ctx.translate(0, bob);
    build12DrawPlayer();
    ctx.restore();
    if (player.attackAnim > 0) {
      const p = worldToScreen(player.x, player.y);
      const t = Math.min(1, player.attackAnim / .24);
      ctx.save();
      ctx.globalAlpha = .16 * t;
      ctx.strokeStyle = player.weaponType === 'staff' ? '#9bd8b8' : '#f0d7a0';
      ctx.lineWidth = 3 * camera.zoom;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 17*camera.zoom, 31*camera.zoom, 16*camera.zoom, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  };

  const build12DrawEnemy = drawEnemy;
  drawEnemy = function build13DrawEnemy(e) {
    if (!e?.__feelRecoilLife) return build12DrawEnemy(e);
    const ratio = Math.min(1, e.__feelRecoilLife / .12);
    const origin = worldToScreen(e.x, e.y);
    const displaced = worldToScreen(e.x + (e.__feelRecoilX || 0) * 10, e.y + (e.__feelRecoilY || 0) * 10);
    ctx.save();
    ctx.translate((displaced.x - origin.x) * ratio, (displaced.y - origin.y) * ratio);
    build12DrawEnemy(e);
    ctx.restore();
  };

  const build12DrawParticles = drawParticles;
  drawParticles = function build13DrawParticles() {
    build12DrawParticles();
    for (const impact of feel.impacts) {
      const p = worldToScreen(impact.x, impact.y);
      const t = 1 - impact.life / impact.maxLife;
      const radius = (impact.heavy ? 42 : 27) * (0.55 + t * .75) * camera.zoom;
      ctx.save();
      ctx.globalAlpha = (1 - t) * (impact.heavy ? .8 : .58);
      ctx.strokeStyle = impact.heavy ? '#ffe1a0' : '#f2c986';
      ctx.lineWidth = (impact.heavy ? 4 : 2.5) * camera.zoom;
      ctx.beginPath(); ctx.arc(p.x, p.y - 22*camera.zoom, radius, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    for (const death of feel.deaths) {
      const p = worldToScreen(death.x, death.y);
      const t = 1 - death.life / death.maxLife;
      ctx.save();
      ctx.globalAlpha = (1 - t) * .55;
      ctx.strokeStyle = '#d9c28e';
      ctx.lineWidth = 3 * camera.zoom;
      ctx.beginPath(); ctx.arc(p.x, p.y - 15*camera.zoom, (death.radius * .65 + t * 46) * camera.zoom, 0, TAU); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + .35;
        const r = (16 + t * 52) * camera.zoom;
        circle(p.x + Math.cos(a)*r, p.y - 18*camera.zoom + Math.sin(a)*r*.55, (3.2 - t*1.5)*camera.zoom, '#bda77b');
      }
      ctx.restore();
    }
  };

  const build12DrawVignette = drawVignette;
  drawVignette = function build13DrawVignette() {
    build12DrawVignette();
    const lowHealth = Math.max(0, .32 - player.hp / player.maxHp) / .32;
    const alpha = Math.max(feel.flash, lowHealth * .18);
    if (alpha <= .003) return;
    ctx.save();
    const g = ctx.createRadialGradient(viewport.w/2, viewport.h/2, Math.min(viewport.w, viewport.h)*.22, viewport.w/2, viewport.h/2, Math.max(viewport.w, viewport.h)*.7);
    g.addColorStop(0, 'rgba(130,40,28,0)');
    g.addColorStop(1, `rgba(130,40,28,${Math.min(.34, alpha)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewport.w, viewport.h);
    ctx.restore();
  };

  // Resume/create Web Audio only from user gestures so iOS/Safari autoplay policy is respected.
  addEventListener('pointerdown', () => ensureAudio(), { capture: true, passive: true });
  addEventListener('keydown', () => ensureAudio(), { capture: true });

  soundButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    ensureAudio();
    setMuted(!feel.muted);
  });

  // Skill implementation is intentionally private to Build 8, so observe user intent
  // without reaching into that module. Gameplay/cooldown validation still belongs to Build 8.
  ui.skill?.addEventListener('pointerdown', () => routeSound('skill'), { capture: true });
  addEventListener('keydown', event => {
    if (event.code === 'KeyF' && !event.repeat) routeSound('skill');
  }, { capture: true });

  document.addEventListener('click', event => {
    const button = event.target.closest?.('button');
    if (!button || button === soundButton) return;
    if (/tonic/i.test(button.id || '') || /tonic/i.test(button.textContent || '')) routeSound('tonic');
    else if (/craft|buy|sell|accept|turnin/i.test(button.id || '') || button.matches?.('.board2-accept')) routeSound('ui');
  }, { capture: true });

  syncSoundButton();

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.attack = () => attack();
    window.__BRIAR_GLENDebug.dash = () => dash();
    window.__BRIAR_GLENDebug.interact = () => interact();
    window.__BRIAR_GLENDebug.selectWeapon = type => selectWeapon(type);
    window.__BRIAR_GLENDebug.setFeelMuted = value => setMuted(value);
    window.__BRIAR_GLENDebug.getFeelState = () => ({
      muted: feel.muted,
      audioReady: feel.audioReady,
      routedAudioEvents: feel.routedAudioEvents,
      playedAudioEvents: feel.playedAudioEvents,
      recentAudio: [...feel.recentAudio],
      hitStop: feel.hitStop,
      flash: feel.flash,
      walking: feel.walking,
      stepEvents: feel.stepEvents,
      afterimages: feel.afterimages.length,
      afterimagesGenerated: feel.afterimagesGenerated,
      impacts: feel.impacts.length,
      impactsGenerated: feel.impactsGenerated,
      deaths: feel.deaths.length,
      deathsGenerated: feel.deathsGenerated,
      ambientZone: feel.ambientZone,
    });
    window.__BRIAR_GLENDebug.damageFeelTarget = (amount = 10) => {
      const target = enemies.filter(e => !e.dead).sort((a, b) => dist(player, a) - dist(player, b))[0];
      if (!target) return null;
      const before = target.hp;
      damageEnemy(target, amount, { knock: 0 });
      return { type: target.type, before, after: target.hp, dead: target.dead };
    };
    window.__BRIAR_GLENDebug.killFeelTarget = () => {
      const target = enemies.filter(e => !e.dead && e.type !== 'boss').sort((a, b) => dist(player, a) - dist(player, b))[0];
      if (!target) return null;
      const before = target.hp;
      damageEnemy(target, target.hp + 9999, { knock: 0 });
      return { type: target.type, before, after: target.hp, dead: target.dead };
    };
  }
})();
