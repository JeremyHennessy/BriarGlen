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
  const VERSION = 'art-v1-vegetation-preview-v3-clean-atlas';
  const ATLAS_W = 512, ATLAS_H = 384;
  const roles = Object.freeze({
    broadleaf_large:{rect:[0,0,128,240],anchor:.933,content:.463,target:190},
    broadleaf_medium:{rect:[128,0,128,240],anchor:.933,content:.483,target:174},
    pine_full:{rect:[256,0,128,240],anchor:.921,content:.629,target:188},
    pine_slim:{rect:[384,0,128,240],anchor:.904,content:.800,target:182},
    flowering_bush:{rect:[0,240,103,144],anchor:.917,content:.507,target:72},
    dense_hedge:{rect:[103,240,103,144],anchor:.917,content:.382,target:66},
    meadow_wildflowers:{rect:[206,240,102,144],anchor:.917,content:.368,target:58},
    fen_reeds:{rect:[308,240,102,144],anchor:.917,content:.500,target:82},
    stonepine_scrub:{rect:[410,240,102,144],anchor:.917,content:.417,target:72},
  });
  const vegetationTypes = new Set(['tree','fenTree','stonepineTree','bush','garden']);
  const baseline = {objects:worldObjects.length,resources:resources.length,enemies:enemies.length};
  const state = {
    version:VERSION,familyId:FAMILY_ID,recipeId:RECIPE_ID,requested,historicalProof,
    ready:!requested,enabled:false,failed:false,failClosed:true,fallbackUsed:false,
    atlasPath:'assets/art-v1/vegetation/vegetation-atlas-v3.webp',atlasWidth:0,atlasHeight:0,
    frameDraws:0,totalDraws:0,draws:{},baseline,roleCount:Object.keys(roles).length,
    sourceMasterCount:9,densityPreserved:true,legacyVegetationUsed:false,
  };

  const atlas = new Image(); atlas.decoding='async';
  if (requested) {
    atlas.onload = () => {
      state.atlasWidth=atlas.naturalWidth; state.atlasHeight=atlas.naturalHeight;
      if(state.atlasWidth!==ATLAS_W||state.atlasHeight!==ATLAS_H){state.failed=true;state.ready=false;state.enabled=false;return;}
      state.ready=true; state.enabled=true;
    };
    atlas.onerror = () => { state.failed=true; state.ready=false; state.enabled=false; };
    atlas.src = `${state.atlasPath}?v=vegetation-v3`;
  }

  function stable01(o,salt=1){
    let h=(Math.round((o.x||0)*11)^Math.round((o.y||0)*17)^salt^String(o.type||'').split('').reduce((a,c)=>Math.imul(a^c.charCodeAt(0),16777619),2166136261))>>>0;
    h^=h>>>16;h=Math.imul(h,2246822507)>>>0;h^=h>>>13;return(h>>>0)/4294967296;
  }
  function regionAt(x,y){if(x>=2240&&y<=-1120)return'stonepine';if(x>=880&&x<=2200&&y<=-1180)return'fen';if(x>=-80&&x<=900&&y<=-430)return'grove';if(x<-210)return'village';if(x<660)return'meadow';if(x<1430)return'copper';return'den';}
  function visible(p,w,h,m=190){return p.x+w/2>-m&&p.x-w/2<viewport.w+m&&p.y>-m&&p.y-h<viewport.h+m;}
  function record(name){state.frameDraws++;state.totalDraws++;state.draws[name]=(state.draws[name]||0)+1;}
  function roleFor(o){
    if(o.type==='fenTree'){
      if(stable01(o,79)<.15)return'fen_reeds';
      return stable01(o,41)<.58?'broadleaf_medium':'broadleaf_large';
    }
    if(o.type==='stonepineTree'){
      if(stable01(o,79)<.08)return'stonepine_scrub';
      return stable01(o,43)<.48?'pine_slim':'pine_full';
    }
    if(o.type==='tree'){
      const r=regionAt(o.x,o.y),v=stable01(o,47);
      if(r==='stonepine')return v<.52?'pine_full':'pine_slim';
      if(r==='meadow'&&v<.24)return'pine_slim';
      return v<.52?'broadleaf_large':'broadleaf_medium';
    }
    if(o.type==='garden')return'meadow_wildflowers';
    if(o.type==='bush'){
      const r=regionAt(o.x,o.y),v=stable01(o,53);
      if(r==='fen')return'fen_reeds';
      if(r==='stonepine')return'stonepine_scrub';
      return v<.52?'flowering_bush':'dense_hedge';
    }
    return null;
  }
  function drawRole(name,o){
    const def=roles[name]; if(!def)return false;
    const [sx,sy,sw,sh]=def.rect,p=worldToScreen(o.x,o.y);
    const objectScale=Number.isFinite(o.s)?Math.max(.72,Math.min(1.35,o.s)):1;
    const individual=.94+stable01(o,67)*.12;
    const visibleTarget=def.target*objectScale*individual*camera.zoom;
    const h=visibleTarget/def.content,w=h*(sw/sh);
    if(!visible(p,w,h))return true;
    const flip=stable01(o,61)>.5;
    ctx.save();ctx.globalAlpha=o.type==='fenTree'?.98:1;ctx.translate(p.x,p.y);if(flip)ctx.scale(-1,1);
    ctx.drawImage(atlas,sx,sy,sw,sh,-w/2,-h*def.anchor,w,h);ctx.restore();record(name);return true;
  }

  const priorObject = drawObject;
  drawObject = function artV1VegetationObject(o){
    if(!requested || !vegetationTypes.has(o?.type)) return priorObject(o);
    state.fallbackUsed=false;state.legacyVegetationUsed=false;
    if(!state.ready||state.failed)return;
    const role=roleFor(o);if(!role||!roles[role]){state.failed=true;state.enabled=false;return;}
    drawRole(role,o);
  };

  window.__BRIAR_GLEN_RUNTIME?.registerHook?.('beforeDraw','art-v1-vegetation-frame-reset',()=>{state.frameDraws=0;},2095);
  debug.getArtV1VegetationState=()=>({
    ...state,enabled:Boolean(requested&&state.ready&&!state.failed),draws:{...state.draws},baseline:{...baseline},
    current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
  });
  debug.getArtV1VegetationAnchors=()=>worldObjects
    .filter(o=>vegetationTypes.has(o?.type))
    .map(o=>({type:o.type,role:roleFor(o),region:regionAt(o.x,o.y),x:o.x,y:o.y,s:Number.isFinite(o.s)?o.s:1}));
})();
