(() => {
  'use strict';
  const legacy = window.__BRIAR_GLEN_PRE_GENERATED_DRAW_RESOURCE;
  const generated = drawResource;
  drawResource = function build41GeneratedArtCompatibleResource(r) {
    const state = window.__BRIAR_GLENDebug?.getGeneratedArtState?.();
    if (state?.enabled && r?.active && r.type === 'ore' && typeof legacy === 'function') legacy(r);
    return generated(r);
  };
  try { delete window.__BRIAR_GLEN_PRE_GENERATED_DRAW_RESOURCE; } catch (_) {}
})();
