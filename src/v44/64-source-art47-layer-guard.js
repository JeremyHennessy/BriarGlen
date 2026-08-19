(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  const requested=params.get('sourceArt47')!=='0'&&!params.get('artScope')&&params.get('canvasArt')!=='1'&&params.get('generatedArt')!=='0';
  const debug=window.__BRIAR_GLENDebug;if(!debug)return;
  const legacyGeneratedEnabled=debug.isGeneratedArtEnabled?.bind(debug);
  const state={version:'build47-layer-guard-v1',requested,legacyLayersSuppressed:false};
  if(requested&&legacyGeneratedEnabled){
    // Build 47 owns environment scale/density. Base generated objects/enemies keep rendering
    // through their internal renderer and the source layer captured the original gate earlier.
    // Later Build 41/43/44/46 dressing wrappers consult this public gate and are intentionally
    // suppressed to prevent the stacking/overlap seen in the rejected Build 47 screenshots.
    debug.isGeneratedArtEnabled=()=>false;
    state.legacyLayersSuppressed=true;
  }
  debug.getSourceArt47LayerGuard=()=>({...state,sourceEnabled:Boolean(debug.isSourceArt47Enabled?.())});
})();