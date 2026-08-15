(() => {
  'use strict';

  // Build 5.6: mobile input stabilization. Keep world/gameplay behavior intact.
  const MOBILE_SPEED_SCALE = 0.86;
  const MOBILE_DEADZONE = 0.14;

  // Touch joystick values are screen-space. Convert them into world-space so
  // "up" on the pad tracks visually up the isometric screen instead of drifting diagonally.
  const originalUpdate = update;
  update = function build56Update(dt) {
    const tx = touchMove.x;
    const ty = touchMove.y;
    const mag = Math.hypot(tx, ty);
    if (mag > MOBILE_DEADZONE) {
      // Inverse of the isometric projection: sx=.78(x-y), sy=.39(x+y).
      const sx = tx / mag;
      const sy = ty / mag;
      const wx = sx / 1.56 + sy / .78;
      const wy = sy / .78 - sx / 1.56;
      const wn = norm(wx, wy);
      touchMove.x = wn.x * mag * MOBILE_SPEED_SCALE;
      touchMove.y = wn.y * mag * MOBILE_SPEED_SCALE;
    } else {
      touchMove.x = 0;
      touchMove.y = 0;
    }
    originalUpdate(dt);
    touchMove.x = tx;
    touchMove.y = ty;
  };

  // Prevent browser gesture zoom while playing. This is intentionally scoped to
  // the game shell so normal browser controls outside the game remain untouched.
  const shell = document.getElementById('game-shell');
  if (shell) {
    shell.style.touchAction = 'none';
    shell.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
    shell.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
    shell.addEventListener('gestureend', e => e.preventDefault(), { passive: false });
    shell.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  }

  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouchEnd <= 320 && shell?.contains(e.target)) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.getInputState = () => ({
      touchAction: shell?.style.touchAction || '',
      speedScale: MOBILE_SPEED_SCALE,
      deadzone: MOBILE_DEADZONE,
    });
    window.__BRIAR_GLENDebug.screenDirectionToWorld = (x, y) => {
      const mag = Math.hypot(x, y) || 1;
      const sx = x / mag, sy = y / mag;
      return norm(sx / 1.56 + sy / .78, sy / .78 - sx / 1.56);
    };
  }
})();