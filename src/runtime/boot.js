(() => {
  'use strict';

  // Canonical parser-time runtime manifest introduced in Build 20.1.
  // Historical loaders remain in source control for rollback but are not part of the live load path.
  const scripts = [
    'src/v2/01.js',
    'src/v2/02.js',
    'src/v2/03.js',
    'src/v2/04.js',
    'src/v2/05.js',
    'src/v2/06.js',
    'src/v3/07-rpg.js',
    'src/v4/08-economy.js',
    'src/v5/09-world.js',
    'src/v5/10-controls-fix.js',
    'src/v7/11-aiming-gear.js',
    'src/v8/12-weapon-skills.js',
    'src/v9/13-crafting-progression.js',
    'src/v10/14-map-journal.js',
    'src/v11/15-mosswater-fen.js',
    'src/v12/16-contract-board.js',
    'src/v12/17-release-info.js',
    'src/v13/18-game-feel.js',
    'src/v14/20-economy2.js',
    'src/v15/22-combat-identity.js',
    'src/v16/24-art-direction.js',
    'src/v16/26-feedback-tuning.js',
    'src/v17/27-stonepine-reach.js',
    'src/v17/27b-stonepine-melee.js',
    'src/v18/29-stonepine-integration.js',
    'src/v19/31-biome-art.js',
    'src/v20/33-hollow-den-art.js',
    'src/runtime/hooks.js',
    'src/v21/35-onboarding.js',
    'src/v22/36-balance-pacing.js',
    'src/v23/37-final-polish.js',
    'src/v24/38-sprite-proof.js',
    'src/v25/39-stonepine-timberline.js',
    'src/v26/40-copper-ember.js',
    'src/v27/41-specialist-crafting.js',
    'src/v28/42-warden-response-orders.js',
    'src/runtime/release-info.js',
  ];

  const manifest = Object.freeze({
    id: 'briar-glen-runtime-v20.1',
    mode: 'canonical-parser-manifest',
    saveKey: 'briar-glen-vslice-v1',
    scripts: Object.freeze([...scripts]),
    legacyLoaderFilesRetained: Object.freeze([
      'src/v12/16-contracts-loader.js',
      'src/v17/27-loader.js',
      'src/v18/29-loader.js',
      'src/v19/31-loader.js',
      'src/v20/33-loader.js',
    ]),
  });
  window.__BRIAR_GLEN_MANIFEST = manifest;
  document.documentElement.dataset.briarGlenBootstrap = manifest.id;

  // New Game is initiated late in the prior document, whose visibilitychange handler can save once more
  // during navigation. Resolve that intent here, before the legacy loadGame() path executes.
  try {
    if (sessionStorage.getItem('briar-glen-start-intent') === 'new') {
      localStorage.removeItem(manifest.saveKey);
      localStorage.removeItem('briar-glen-onboarding-v1');
      localStorage.removeItem('briar-glen-run-metrics-v1');
      localStorage.removeItem('briar-glen-vertical-slice-complete-v1');
    }
  } catch (_) { /* storage may be unavailable in private contexts */ }

  if (document.readyState !== 'loading') {
    throw new Error('Briar Glen canonical bootstrap must execute while the document is loading');
  }
  const hasV12Style = [...document.styleSheets].some(sheet => (sheet.href || '').includes('styles-v12.css'));
  const style = hasV12Style ? '' : '<link rel="stylesheet" href="styles-v12.css" data-runtime-style="v12">';
  const tags = scripts.map(src => `<script src="${src}" data-runtime-managed="true"><\/script>`).join('');
  document.write(style + tags);
})();