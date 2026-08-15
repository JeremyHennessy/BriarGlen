(() => {
  'use strict';

  // Build 16 feedback tuning: keep impact information, remove the harsh per-object jitter.
  // The original projection sampled a new random shake for every worldToScreen call, so
  // different objects could jump in different directions during the same frame.
  const tuning = {
    shakeScale: .22,
    shakeCap: 7,
    hapticScale: .55,
    hapticCapMs: 18,
    frameX: 0,
    frameY: 0,
    rawShake: 0,
    renderedAmplitude: 0,
    frames: 0,
    hapticCalls: 0,
    lastHapticMs: 0,
  };

  // Coherent whole-frame projection: every world element receives the same small offset.
  worldToScreen = function build16WorldToScreen(x, y) {
    const isoX = (x - y) * .78;
    const isoY = (x + y) * .39;
    const camIsoX = (camera.x - camera.y) * .78;
    const camIsoY = (camera.x + camera.y) * .39;
    return {
      x: viewport.w / 2 + (isoX - camIsoX) * camera.zoom + tuning.frameX,
      y: viewport.h / 2 + (isoY - camIsoY) * camera.zoom + tuning.frameY,
    };
  };

  const build16Draw = draw;
  draw = function build16TunedDraw() {
    const now = performance.now();
    const raw = Math.max(0, camera.shake || 0);
    const amp = Math.min(raw, tuning.shakeCap) * tuning.shakeScale;
    tuning.rawShake = raw;
    tuning.renderedAmplitude = amp;
    // Smooth, low-amplitude oscillation reads as impact without high-frequency rattling.
    tuning.frameX = Math.sin(now * .052) * amp;
    tuning.frameY = Math.cos(now * .047 + 1.1) * amp * .72;
    tuning.frames += 1;
    return build16Draw();
  };

  const build15Vibrate = vibrate;
  vibrate = function build16Vibrate(ms = 20) {
    const tuned = Math.max(1, Math.min(tuning.hapticCapMs, Math.round(ms * tuning.hapticScale)));
    tuning.hapticCalls += 1;
    tuning.lastHapticMs = tuned;
    return build15Vibrate(tuned);
  };

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.getFeedbackTuningState = () => ({ ...tuning });
    window.__BRIAR_GLENDebug.setCameraShake = value => { camera.shake = Math.max(0, Number(value) || 0); };
    window.__BRIAR_GLENDebug.projectPoint = (x, y) => worldToScreen(x, y);
    window.__BRIAR_GLENDebug.testHaptic = ms => vibrate(ms);
  }
})();
