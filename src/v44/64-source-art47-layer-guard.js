(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  const historicalProof=[...params.keys()].some(k=>['assetVariantProof','landmarkStateProof','env46proof','env46perf','terrain46','terrain46perf','generatedArtSmoke'].includes(k));
  const requested=params.get('sourceArt47')!=='0'&&!historicalProof&&!params.get('artScope')&&params.get('canvasArt')!=='1'&&params.get('generatedArt')!=='0';
  const debug=window.__BRIAR_GLENDebug;if(!debug)return;
  const legacyGeneratedEnabled=debug.isGeneratedArtEnabled?.bind(debug);
  const state={version:'build47-layer-guard-v2',requested,historicalProof,legacyLayersSuppressed:false};
  if(requested&&legacyGeneratedEnabled){
    // Build 47 owns environment scale/density in normal play. Base generated objects/enemies keep
    // rendering through their internal renderer and the source layer captured the original gate.
    // Historical proof URLs deliberately retain the Build 46 dressing layers so their rollback
    // contracts continue to be tested independently.
    debug.isGeneratedArtEnabled=()=>false;
    state.legacyLayersSuppressed=true;
  }
  debug.getSourceArt47LayerGuard=()=>({...state,sourceEnabled:Boolean(debug.isSourceArt47Enabled?.())});
})();