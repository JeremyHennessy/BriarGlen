(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const proofKeys = ['assetVariantProof','landmarkStateProof','env46proof','envperf','terrain46','tperf','generatedArtSmoke','dressing','layoutProof','renderPerf','build30Recovery'];
  const historicalProof = [...params.keys()].some(k => proofKeys.includes(k));
  const requested = params.get('artV1Vegetation') === '1' && !historicalProof;
  const debug = window.__BRIAR_GLENDebug;
  if (!debug) return;

  const FAMILY_ID = 'briar-glen-art-v1';
  const RECIPE_ID = 'briar-glen-art-v1-painted-family-v1';
  const VERSION = 'art-v1-vegetation-preview-v1';
  const ATLAS_W = 640, ATLAS_H = 480;
  const roles = Object.freeze({
    broadleafLarge:{rect:[7,70,145,165],anchor:.96,targetHeight:154},
    broadleafMedium:{rect:[167,58,145,177],anchor:.96,targetHeight:146},
    pineFull:{rect:[332,15,136,220],anchor:.97,targetHeight:156},
    pineSlim:{rect:[516,15,88,220],anchor:.97,targetHeight:151},
    floweringBush:{rect:[12,350,104,95],anchor:.91,targetHeight:66},
    denseHedge:{rect:[133,357,118,81],anchor:.91,targetHeight:61},
    meadowWildflowers:{rect:[261,356,117,82],anchor:.90,targetHeight:54},
    fenReeds:{rect:[395,350,105,95],anchor:.92,targetHeight:69},
    stonepineScrub:{rect:[517,352,118,91],anchor:.92,targetHeight:64},
  });
  const vegetationTypes = new Set(['tree','fenTree','stonepineTree','bush','garden']);
  const baseline = {objects:worldObjects.length,resources:resources.length,enemies:enemies.length};
  const state = {
    version:VERSION,familyId:FAMILY_ID,recipeId:RECIPE_ID,requested,historicalProof,
    ready:!requested,enabled:false,failed:false,failClosed:true,fallbackUsed:false,
    atlasPath:'assets/art-v1/vegetation/vegetation-atlas-v1.webp',atlasWidth:0,atlasHeight:0,
    frameDraws:0,totalDraws:0,frameSuppressed:0,totalSuppressed:0,draws:{},baseline,
  };

  const atlas = new Image(); atlas.decoding='async';
  if (requested) {
    atlas.onload = () => {
      state.atlasWidth=atlas.naturalWidth; state.atlasHeight=atlas.naturalHeight;
      if(state.atlasWidth!==ATLAS_W||state.atlasHeight!==ATLAS_H){state.failed=true;state.ready=false;state.enabled=false;return;}
      state.ready=true; state.enabled=true;
    };
    atlas.onerror = () => { state.failed=true; state.ready=false; state.enabled=false; };
    atlas.src = `${state.atlasPath}?v=vegetation-v1`;
  }

  function stable01(o,salt=1){
    let h=(Math.round((o.x||0)*11)^Math.round((o.y||0)*17)^salt^String(o.type||'').split('').reduce((a,c)=>Math.imul(a^c.charCodeAt(0),16777619),2166136261))>>>0;
    h^=h>>>16;h=Math.imul(h,2246822507)>>>0;h^=h>>>13;return(h>>>0)/4294967296;
  }
  function collisionAnchor(o){return Array.isArray(blockers)&&blockers.some(b=>Math.hypot((o.x||0)-b.x,(o.y||0)-b.y)<14);}
  function keepDecor(o,rate){if(collisionAnchor(o)||stable01(o,29)<=rate)return true;state.frameSuppressed++;state.totalSuppressed++;return false;}
  function regionAt(x,y){if(x>=2240&&y<=-1120)return'stonepine';if(x>=880&&x<=2200&&y<=-1180)return'fen';if(x>=-80&&x<=900&&y<=-430)return'grove';if(x<-210)return'village';if(x<660)return'meadow';if(x<1430)return'copper';return'den';}
  function visible(p,w,h,m=170){return p.x+w/2>-m&&p.x-w/2<viewport.w+m&&p.y>-m&&p.y-h<viewport.h+m;}
  function record(name){state.frameDraws++;state.totalDraws++;state.draws[name]=(state.draws[name]||0)+1;}
  function roleFor(o){
    if(o.type==='fenTree')return stable01(o,41)<.58?'broadleafMedium':'broadleafLarge';
    if(o.type==='stonepineTree')return stable01(o,43)<.48?'pineSlim':'pineFull';
    if(o.type==='tree'){
      const r=regionAt(o.x,o.y),v=stable01(o,47);
      if(r==='stonepine')return v<.52?'pineFull':'pineSlim';
      if(r==='meadow'&&v<.18)return'pineSlim';
      return v<.52?'broadleafLarge':'broadleafMedium';
    }
    if(o.type==='garden')return'meadowWildflowers';
    if(o.type==='bush'){
      const r=regionAt(o.x,o.y),v=stable01(o,53);
      if(r==='fen')return'fenReeds';
      if(r==='stonepine')return'stonepineScrub';
      return v<.52?'floweringBush':'denseHedge';
    }
    return null;
  }
  function drawRole(name,o,{alpha=1,flip=false,heightScale=1}={}){
    const def=roles[name]; if(!def)return false;
    const [sx,sy,sw,sh]=def.rect,p=worldToScreen(o.x,o.y),h=def.targetHeight*heightScale*camera.zoom,w=h*(sw/sh);
    if(!visible(p,w,h))return true;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x,p.y);if(flip)ctx.scale(-1,1);
    ctx.drawImage(atlas,sx,sy,sw,sh,-w/2,-h*def.anchor,w,h);ctx.restore();record(name);return true;
  }

  const priorObject = drawObject;
  drawObject = function artV1VegetationObject(o){
    if(!requested || !vegetationTypes.has(o?.type)) return priorObject(o);
    state.fallbackUsed=false;
    if(!state.ready||state.failed){return;}
    if(o.type==='tree'&&!keepDecor(o,.48))return;
    if(o.type==='fenTree'&&!keepDecor(o,.60))return;
    if(o.type==='stonepineTree'&&!keepDecor(o,.60))return;
    if(o.type==='bush'&&!keepDecor(o,.44))return;
    const role=roleFor(o);if(!role){state.failed=true;state.enabled=false;return;}
    drawRole(role,o,{flip:stable01(o,61)>.5,alpha:o.type==='fenTree'?.97:1});
  };

  window.__BRIAR_GLEN_RUNTIME?.registerHook?.('beforeDraw','art-v1-vegetation-frame-reset',()=>{state.frameDraws=0;state.frameSuppressed=0;},2090);
  debug.getArtV1VegetationState = () => ({
    ...state,enabled:Boolean(requested&&state.ready&&!state.failed),draws:{...state.draws},baseline:{...baseline},
    current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
    densityContract:{tree:.48,fenTree:.60,stonepineTree:.60,bush:.44},roleCount:Object.keys(roles).length,
  });
})();
