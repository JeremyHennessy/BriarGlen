(() => {
  'use strict';
  const legacy = window.__BRIAR_GLEN_PRE_GENERATED_DRAW_RESOURCE;
  const generated = drawResource;
  drawResource = function build41GeneratedArtCompatibleResource(r) {
    const state = window.__BRIAR_GLENDebug?.getGeneratedArtState?.();
    if (state?.enabled && r?.active && r.type === 'ore' && typeof legacy === 'function') legacy(r);
    return generated(r);
  };

  const debug = window.__BRIAR_GLENDebug;
  const priorGetArtState = debug?.getArtState;
  if (debug && typeof priorGetArtState === 'function') {
    debug.getArtState = () => {
      const state = priorGetArtState();
      const generatedState = debug.getGeneratedArtState?.();
      if (state?.enabled && generatedState?.enabled && state.frame) {
        const visibleGeneratedObjects = Object.entries(generatedState.drawSites || {}).filter(([key, site]) => {
          if (!(key.startsWith('object:') || key.startsWith('npc:'))) return false;
          const screen = site?.screen;
          return screen && screen.x > -230 && screen.x < innerWidth + 230 && screen.y > -230 && screen.y < innerHeight + 210;
        }).length;
        state.frame.customObjects = (state.frame.customObjects || 0) + visibleGeneratedObjects;
      }
      return state;
    };
  }

  try { delete window.__BRIAR_GLEN_PRE_GENERATED_DRAW_RESOURCE; } catch (_) {}
})();
