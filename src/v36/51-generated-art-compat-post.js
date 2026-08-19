(() => {
  'use strict';
  const debug = window.__BRIAR_GLENDebug;

  // Preserve Build 30's authored Copper-ore draw-site diagnostics while the generated sprite
  // remains the visible top layer. Historical/rollback modes still fall through exactly once.
  const legacyResource = window.__BRIAR_GLEN_PRE_GENERATED_DRAW_RESOURCE;
  const generatedResource = drawResource;
  drawResource = function build41GeneratedArtCompatibleResource(r) {
    const state = debug?.getGeneratedArtState?.();
    if (state?.enabled && r?.active && r.type === 'ore' && typeof legacyResource === 'function') legacyResource(r);
    return generatedResource(r);
  };

  function generatedVisibleEntries(margin = 230) {
    const generatedState = debug?.getGeneratedArtState?.();
    if (!generatedState?.enabled) return [];
    return Object.entries(generatedState.drawSites || {}).map(([key, site]) => {
      const [kind, type] = key.split(':');
      const world = site?.world;
      if (!world || !Number.isFinite(world.x) || !Number.isFinite(world.y)) return null;
      const screen = worldToScreen(world.x, world.y);
      if (screen.x <= -margin || screen.x >= innerWidth + margin || screen.y <= -margin || screen.y >= innerHeight + margin) return null;
      return { kind, type, world };
    }).filter(Boolean);
  }

  function countGenerated(entries, predicate) {
    let count = 0;
    for (const entry of entries) if (predicate(entry)) count += 1;
    return count;
  }

  // Build 16 diagnostics: generated replacements are still authored/custom visual objects.
  const priorGetArtState = debug?.getArtState;
  if (debug && typeof priorGetArtState === 'function') {
    debug.getArtState = () => {
      const state = priorGetArtState();
      if (!state?.enabled || !state.frame) return state;
      const entries = generatedVisibleEntries();
      const inFirstSlice = ({ world }) => world.x >= -1000 && world.x <= 690 && !(world.x > -80 && world.y < -425);
      state.frame.customObjects += countGenerated(entries, entry => inFirstSlice(entry) && (entry.kind === 'object' || entry.kind === 'npc'));
      state.frame.customResources += countGenerated(entries, entry => inFirstSlice(entry) && entry.kind === 'resource' && ['herb','mooncap'].includes(entry.type));
      return state;
    };
  }

  // Build 19 diagnostics: count generated replacements in the same Grove/Fen authored families.
  const priorGetBiomeArtState = debug?.getBiomeArtState;
  if (debug && typeof priorGetBiomeArtState === 'function') {
    debug.getBiomeArtState = () => {
      const state = priorGetBiomeArtState();
      if (!state?.enabled || !state.frame) return state;
      const entries = generatedVisibleEntries();
      const inGrove = ({ world }) => world.y <= -430 && world.y >= -1120 && world.x >= -80 && world.x <= 900;
      const inFen = ({ world }) => world.y <= -1180 && world.y >= -2100 && world.x >= 880 && world.x <= 2200;
      state.frame.groveObjects += countGenerated(entries, e => inGrove(e) && e.kind === 'object' && ['tree','ruin','groveCache','bush'].includes(e.type));
      state.frame.groveResources += countGenerated(entries, e => inGrove(e) && e.kind === 'resource' && e.type === 'mooncap');
      state.frame.groveEnemies += countGenerated(entries, e => inGrove(e) && e.kind === 'enemy' && e.type === 'grovekeeper');
      state.frame.fenObjects += countGenerated(entries, e => inFen(e) && e.kind === 'object' && ['fenTree','fenPool','fenRuin','fenCache'].includes(e.type));
      state.frame.fenResources += countGenerated(entries, e => inFen(e) && e.kind === 'resource' && e.type === 'mossglass');
      state.frame.fenEnemies += countGenerated(entries, e => inFen(e) && e.kind === 'enemy' && ['mireling','bogstalker','fenwarden'].includes(e.type));
      return state;
    };
  }

  // Build 20 diagnostics: generated Hollow/Den replacements satisfy the same visual-family counters.
  const priorGetHollowDenArtState = debug?.getHollowDenArtState;
  if (debug && typeof priorGetHollowDenArtState === 'function') {
    debug.getHollowDenArtState = () => {
      const state = priorGetHollowDenArtState();
      if (!state?.enabled || !state.frame) return state;
      const entries = generatedVisibleEntries();
      const inHollow = ({ world }) => world.x >= 650 && world.x < 1420 && world.y >= -620 && world.y <= 620;
      const inDen = ({ world }) => world.x >= 1420 && world.x <= 2200 && world.y >= -620 && world.y <= 620;
      state.frame.hollowObjects += countGenerated(entries, e => inHollow(e) && e.kind === 'object' && ['rock','deadTree'].includes(e.type));
      state.frame.hollowResources += countGenerated(entries, e => inHollow(e) && e.kind === 'resource' && ['ore','iron'].includes(e.type));
      state.frame.hollowEnemies += countGenerated(entries, e => inHollow(e) && e.kind === 'enemy' && e.type === 'boar');
      state.frame.denObjects += countGenerated(entries, e => inDen(e) && e.kind === 'object' && ['denRock','ember'].includes(e.type));
      state.frame.denEnemies += countGenerated(entries, e => inDen(e) && e.kind === 'enemy' && e.type === 'boss');
      return state;
    };
  }

  try { delete window.__BRIAR_GLEN_PRE_GENERATED_DRAW_RESOURCE; } catch (_) {}
})();
