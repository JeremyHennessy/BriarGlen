(() => {
  'use strict';

  // Controls hotfix: screen-aligned isometric movement + aggressive browser-gesture suppression.
  const movementCodes = ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
  const build5Update = update;
  const MOVE_SCREEN_SCALE = 0.88;

  function inputScreenVector() {
    let sx = 0, sy = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) sy -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) sy += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) sx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) sx += 1;
    sx += touchMove.x;
    sy += touchMove.y;
    const mag = Math.hypot(sx, sy);
    if (mag > 1) {
      sx /= mag;
      sy /= mag;
    }
    return { sx, sy };
  }

  function screenToWorld(sx, sy) {
    // Exact inverse of worldToScreen's isometric projection (camera-independent).
    return {
      x: sx / 1.56 + sy / 0.78,
      y: -sx / 1.56 + sy / 0.78,
    };
  }

  update = function controlsFixedUpdate(dt) {
    const modalOpen =
      (ui.inventoryPanel && !ui.inventoryPanel.hidden) ||
      (ui.tradePanel && !ui.tradePanel.hidden);
    const screen = modalOpen ? { sx: 0, sy: 0 } : inputScreenVector();
    const hasMovement = Math.abs(screen.sx) > 0.001 || Math.abs(screen.sy) > 0.001;

    if (!hasMovement) {
      build5Update(dt);
      return;
    }

    const held = movementCodes.filter(code => keys.has(code));
    for (const code of held) keys.delete(code);
    const touchX = touchMove.x, touchY = touchMove.y;
    touchMove.x = 0;
    touchMove.y = 0;

    const world = screenToWorld(screen.sx, screen.sy);
    const facing = norm(world.x, world.y);
    player.facingX = facing.x;
    player.facingY = facing.y;
    const moveSpeed = player.speed * (player.dashTimer > 0 ? 2.65 : 1) * MOVE_SCREEN_SCALE;
    collideMove(player, world.x * moveSpeed * dt, world.y * moveSpeed * dt);

    try {
      build5Update(dt);
    } finally {
      for (const code of held) keys.add(code);
      touchMove.x = touchX;
      touchMove.y = touchY;
    }
  };

  function stopGesture(event) {
    if (event.cancelable) event.preventDefault();
  }

  // Safari can still interpret rapid multi-touch/double-tap gestures at the page level.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, stopGesture, { passive: false, capture: true });
  }
  document.addEventListener('touchmove', event => {
    if (event.touches && event.touches.length > 1) stopGesture(event);
  }, { passive: false, capture: true });
  document.addEventListener('dblclick', stopGesture, { passive: false, capture: true });

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.getControlState = () => ({
      projection: { xScale: .78, yScale: .39, moveScreenScale: MOVE_SCREEN_SCALE },
      touchAction: {
        shell: getComputedStyle(document.getElementById('game-shell')).touchAction,
        pad: getComputedStyle(ui.movePad).touchAction,
        controls: getComputedStyle(document.getElementById('touch-controls')).touchAction,
      },
      visualScale: window.visualViewport ? window.visualViewport.scale : 1,
    });
  }
})();