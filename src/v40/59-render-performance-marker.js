(() => {
  'use strict';
  const debug=window.__BRIAR_GLENDebug;
  if(!debug)return;
  debug.getRenderPerformanceState=()=>({
    version:'build45-render-performance-v1',
    generatedFastState:Boolean(debug.isGeneratedArtEnabled),
    generatedArtEnabled:Boolean(debug.isGeneratedArtEnabled?.()),
    rules:'docs/RENDER_PERFORMANCE_RULES.md',
  });
})();
