(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const requested = params.get('sourceArt47') !== '0'
    && params.get('canvasArt') !== '1'
    && !params.get('artScope');
  const debug = window.__BRIAR_GLENDebug;
  if (!debug) return;

  const state = {
    version:'build47-source-art-v2', requested, ready:!requested, failed:false, failure:'',
    terrainAtlasLoaded:false, terrainTileCount:21, spriteSourceCount:11,
    chunkBuilds:0, cacheHits:0, cacheMisses:0, evictions:0, frameChunks:0,
    terrainDraws:0, spriteDraws:0, objectDraws:0, resourceDraws:0, utilityDraws:0,
    replacements:{}, baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
  };

  const SOURCE_TILE_PX = 256;
  const REGIONS = ['village','meadow','grove','fen','copper','stonepine','den'];
  const tileRects = Object.fromEntries(REGIONS.map((region,row)=>[
    region,
    {
      base:{sx:0,sy:row*SOURCE_TILE_PX,sw:SOURCE_TILE_PX,sh:SOURCE_TILE_PX},
      functional:{sx:SOURCE_TILE_PX,sy:row*SOURCE_TILE_PX,sw:SOURCE_TILE_PX,sh:SOURCE_TILE_PX},
      decal:{sx:SOURCE_TILE_PX*2,sy:row*SOURCE_TILE_PX,sw:SOURCE_TILE_PX,sh:SOURCE_TILE_PX},
    }
  ]));

  const spriteDefs = {
    cottage:{src:'assets/v24/cottage-authored.webp',width:160,height:160,anchor:.84,shadow:[47,22,.20]},
    tree_deciduous:{src:'assets/v24/tall-tree-authored.webp',width:112,height:112,anchor:.91,shadow:[27,13,.16]},
    tree_pine:{src:'assets/v24/pine-tree-authored.webp',width:118,height:118,anchor:.92,shadow:[27,13,.16]},
    rock:{src:'assets/v47/rock-cluster-authored.svg',width:108,height:92,anchor:.88,shadow:[34,14,.17]},
    utility:{src:'assets/v47/utility-crates-authored.svg',width:116,height:104,anchor:.91,shadow:[35,14,.15]},
    ore:{src:'assets/v47/ore-node-authored.svg',width:94,height:82,anchor:.90,shadow:[30,12,.16]},
    fence_sign:{src:'assets/v47/fence-sign-lantern-authored.svg',width:118,height:110,anchor:.91,shadow:[34,13,.14]},
    hollow_rock:{src:'assets/v30/hollow-rock-authored.svg',width:108,height:86,anchor:.89,shadow:[33,13,.16]},
    den_rock:{src:'assets/v30/den-rock-authored.svg',width:110,height:88,anchor:.89,shadow:[34,13,.17]},
    dead_tree:{src:'assets/v30/dead-tree-authored.svg',width:94,height:116,anchor:.93,shadow:[24,11,.14]},
    ember:{src:'assets/v30/ember-cluster-authored.svg',width:74,height:60,anchor:.87,shadow:[22,9,.13]},
  };

  const atlas = new Image(); atlas.decoding='async';
  const sprites = {};

  function loadImage(src){
    return new Promise((resolve,reject)=>{
      const image=new Image(); image.decoding='async';
      image.onload=()=>resolve(image);
      image.onerror=()=>reject(new Error(`Build 47 source art failed to load: ${src}`));
      image.src=`${src}?v=47`;
    });
  }

  if(requested){
    Promise.all([
      new Promise((resolve,reject)=>{
        atlas.onload=()=>{state.terrainAtlasLoaded=true;resolve();};
        atlas.onerror=()=>reject(new Error('Build 47 terrain atlas failed to load'));
        atlas.src='assets/v47/terrain-atlas.webp?v=47';
      }),
      ...Object.entries(spriteDefs).map(async([name,def])=>{sprites[name]=await loadImage(def.src);}),
    ]).then(()=>{
      state.ready=true;
      document.documentElement.dataset.briarGlenSourceArt='ready';
    }).catch(error=>{
      state.failed=true; state.failure=String(error?.message||error); state.ready=false;
      document.documentElement.dataset.briarGlenSourceArt='failed'; console.error(error);
    });
  }else document.documentElement.dataset.briarGlenSourceArt='inactive';

  function enabled(){return Boolean(requested&&state.ready&&!state.failed);}
  function hash(a,b,c=47){let h=(2166136261^c)>>>0;for(const v of[a,b,c]){h^=v|0;h=Math.imul(h,16777619)>>>0;h^=h>>>13;}return h>>>0;}
  function note(name,kind){
    state.spriteDraws++; state.replacements[name]=(state.replacements[name]||0)+1;
    if(kind==='object')state.objectDraws++; else if(kind==='resource')state.resourceDraws++; else if(kind==='utility')state.utilityDraws++;
  }
  function drawSprite(name,entity,{scale=1,alpha=1,filter='',flipX=false,offsetX=0,offsetY=0,kind='object'}={}){
    const image=sprites[name],def=spriteDefs[name]; if(!image||!def)return false;
    const p=worldToScreen(entity.x,entity.y);
    const entityScale=Number.isFinite(entity.s)?Math.max(.82,Math.min(1.18,entity.s)):1;
    const z=camera.zoom*scale*entityScale,w=def.width*z,h=def.height*z;
    if(p.x+w<-180||p.x-w>viewport.w+180||p.y<-190||p.y-h>viewport.h+150)return true;
    if(def.shadow&&typeof shadow==='function')shadow(entity.x,entity.y,def.shadow[0]*scale*entityScale,def.shadow[1]*scale*entityScale,def.shadow[2]);
    ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';if(filter)ctx.filter=filter;
    ctx.translate(p.x+offsetX*camera.zoom,p.y+offsetY*camera.zoom);if(flipX)ctx.scale(-1,1);
    ctx.drawImage(image,-w/2,-h*def.anchor,w,h);ctx.restore();note(name,kind);return true;
  }
  function treeChoice(o){return hash(Math.round(o.x),Math.round(o.y),141)%3===0?'tree_pine':'tree_deciduous';}
  function objectSpec(o){
    if(o.type==='cottage')return{name:'cottage',scale:.98};
    if(o.type==='tree')return{name:treeChoice(o),scale:.96};
    if(o.type==='stonepineTree')return{name:'tree_pine',scale:.91,filter:'saturate(.82) brightness(.88)'};
    if(o.type==='fenTree')return{name:'tree_deciduous',scale:.84,filter:'hue-rotate(25deg) saturate(.58) brightness(.75)'};
    if(o.type==='rock')return{name:'rock',scale:.92};
    if(o.type==='quarryRock')return{name:'hollow_rock',scale:.96};
    if(o.type==='denRock')return{name:'den_rock',scale:.98};
    if(o.type==='deadTree')return{name:'dead_tree',scale:.92};
    if(o.type==='ember')return{name:'ember',scale:.70,alpha:.94};
    return null;
  }
  function resourceSpec(r){
    if(r.type==='ore')return{name:'ore',scale:.82};
    if(r.type==='iron')return{name:'ore',scale:.84,filter:'hue-rotate(165deg) saturate(.28) brightness(.92)'};
    if(r.type==='mossglass')return{name:'ore',scale:.72,filter:'hue-rotate(78deg) saturate(.65) brightness(1.02)'};
    return null;
  }

  // This module intentionally loads immediately after the generated-art base renderer and before
  // Build 43/44 variation + landmark wrappers. That preserves their approved annex/state overlays
  // while replacing the base object/resource silhouette with physical source files.
  const priorObject=drawObject;
  drawObject=function build47SourceObject(o){
    if(!enabled())return priorObject(o);
    const spec=objectSpec(o);
    if(spec&&drawSprite(spec.name,o,{...spec,flipX:Number(o.facingX||1)<0,kind:'object'}))return;
    const result=priorObject(o);
    if(o.type==='forge')drawSprite('utility',{x:o.x+62,y:o.y+28},{scale:.63,alpha:.94,kind:'utility'});
    else if(o.type==='merchant')drawSprite('utility',{x:o.x-56,y:o.y+24},{scale:.56,alpha:.92,flipX:true,kind:'utility'});
    else if(o.type==='board')drawSprite('fence_sign',o,{scale:.66,alpha:.95,kind:'utility'});
    return result;
  };

  const priorResource=drawResource;
  drawResource=function build47SourceResource(r){
    if(!enabled()||!r.active)return priorResource(r);
    const spec=resourceSpec(r);
    if(!spec)return priorResource(r);
    // Preserve the approved Build 30 authored-resource renderer and its diagnostics underneath.
    // The Build 47 physical source file is the final visible layer, but historical recovery proof
    // must remain observable instead of being bypassed by the replacement wrapper.
    const result=priorResource(r);
    drawSprite(spec.name,r,{...spec,kind:'resource'});
    return result;
  };

  const internal={state,atlas,tileRects,enabled,hash};
  window.__BRIAR_GLEN_BUILD47_SOURCE_ART_INTERNAL=internal;
  debug.isBuild47SourceArtEnabled=enabled;
  debug.getBuild47SourceArtState=()=>({
    version:state.version,requested:state.requested,enabled:enabled(),ready:state.ready,failed:state.failed,failure:state.failure,
    terrainAtlasLoaded:state.terrainAtlasLoaded,terrainTileCount:state.terrainTileCount,spriteSourceCount:state.spriteSourceCount,
    activeCache:state.activeCache||0,maxCache:state.maxCache||18,chunkBuilds:state.chunkBuilds,cacheHits:state.cacheHits,cacheMisses:state.cacheMisses,evictions:state.evictions,
    frameChunks:state.frameChunks,terrainDraws:state.terrainDraws,spriteDraws:state.spriteDraws,objectDraws:state.objectDraws,resourceDraws:state.resourceDraws,utilityDraws:state.utilityDraws,
    replacements:{...state.replacements},baseline:{...state.baseline},current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}
  });
})();