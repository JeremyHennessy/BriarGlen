(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  const proofKeys=['assetVariantProof','landmarkStateProof','env46proof','envperf','terrain46','tperf','generatedArtSmoke','dressing','layoutProof','renderPerf','build30Recovery'];
  const historicalProof=[...params.keys()].some(k=>proofKeys.includes(k));
  const requested=params.get('sourceArt47')!=='0'&&!historicalProof&&!params.get('artScope')&&params.get('canvasArt')!=='1'&&params.get('generatedArt')!=='0';
  const pack=window.__BRIAR_GLEN_GENERATED_ART,debug=window.__BRIAR_GLENDebug;
  if(!pack?.atlas||!pack?.sprites||!debug)return;
  const baseGeneratedEnabled=debug.isGeneratedArtEnabled?.bind(debug);
  const state={version:'build47-visual-rebuild-v2',requested,historicalProof,ready:!requested,failed:false,frameDraws:0,totalDraws:0,terrainMode:'physical-ground-v2',sources:{},draws:{},baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}};
  const generatedAtlas=new Image();generatedAtlas.decoding='async';
  const external={
    cottage:{src:'assets/v24/cottage-authored.webp',width:96,height:96,anchor:.84},
    tree_deciduous:{src:'assets/v24/tall-tree-authored.webp',width:72,height:72,anchor:.91},
    tree_pine:{src:'assets/v24/pine-tree-authored.webp',width:76,height:76,anchor:.92},
    rock:{src:'assets/v47/rock-cluster.svg',width:58,height:51,anchor:.88},
    ore:{src:'assets/v47/ore-node.svg',width:47,height:42,anchor:.90},
    utility:{src:'assets/v47/utility-crates.svg',width:52,height:46,anchor:.91},
    sign:{src:'assets/v47/sign-lantern.svg',width:42,height:52,anchor:.91},
  };
  const images={};let pending=1+Object.keys(external).length,failures=[];
  function done(){pending--;if(pending>0)return;if(failures.length){state.failed=true;state.ready=false;state.failure=failures.join('; ');}else state.ready=true;}
  generatedAtlas.onload=done;generatedAtlas.onerror=()=>{failures.push('generated atlas');done();};generatedAtlas.src=pack.atlas;
  for(const[name,def]of Object.entries(external)){const image=new Image();image.decoding='async';image.onload=()=>{images[name]=image;state.sources[name]=def.src;done();};image.onerror=()=>{failures.push(def.src);done();};image.src=`${def.src}?v=47r2`;}
  function enabled(){return Boolean(requested&&state.ready&&!state.failed&&baseGeneratedEnabled?.());}
  function visible(p,w,h,margin=100){return p.x+w/2>-margin&&p.x-w/2<viewport.w+margin&&p.y>-margin&&p.y-h<viewport.h+margin;}
  function entityScale(o){const s=Number.isFinite(o?.s)?o.s:1;return Math.max(.94,Math.min(1.06,.99+(s-1)*.12));}
  function record(name){state.frameDraws++;state.totalDraws++;state.draws[name]=(state.draws[name]||0)+1;}
  function drawExternal(name,o,{scale=1,alpha=1,flip=false,dx=0,dy=0}={}){const def=external[name],image=images[name];if(!def||!image)return false;const p=worldToScreen(o.x,o.y),z=camera.zoom*scale*entityScale(o),w=def.width*z,h=def.height*z;if(!visible(p,w,h))return true;ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x+dx*camera.zoom,p.y+dy*camera.zoom);if(flip)ctx.scale(-1,1);ctx.drawImage(image,-w/2,-h*def.anchor,w,h);ctx.restore();record(name);return true;}
  const serviceScale={tavern:.72,forge:.74,alchemy:.72,market:.74,well:.76};
  function drawGenerated(name,o,{scale=1,alpha=1,flip=false,dx=0,dy=0}={}){const f=pack.sprites[name];if(!f)return false;const p=worldToScreen(o.x,o.y),z=camera.zoom*scale*entityScale(o),w=f.width*z,h=f.height*z;if(!visible(p,w,h))return true;ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x+dx*camera.zoom,p.y+dy*camera.zoom);if(flip)ctx.scale(-1,1);ctx.drawImage(generatedAtlas,f.sx,f.sy,f.sw,f.sh,-w/2,-h*f.anchor,w,h);ctx.restore();record(name);return true;}
  function treeName(o){return(Math.abs(Math.round(o.x*7+o.y*11))%3===0)?'tree_pine':'tree_deciduous';}
  const priorObject=drawObject;
  drawObject=function build47ScaleCorrectedObject(o){
    if(!enabled())return priorObject(o);
    if(o.type==='cottage'){if(drawExternal('cottage',o,{scale:.96}))return;}
    else if(o.type==='tree'){if(drawExternal(treeName(o),o,{scale:.96}))return;}
    else if(o.type==='fenTree'){if(drawExternal('tree_deciduous',o,{scale:.86,alpha:.90}))return;}
    else if(o.type==='stonepineTree'){if(drawExternal('tree_pine',o,{scale:.90,alpha:.94}))return;}
    else if(o.type==='rock'){if(drawExternal('rock',o,{scale:.94}))return;}
    else if(o.type==='quarryRock'){if(drawExternal('rock',o,{scale:.92,alpha:.92}))return;}
    else if(o.type==='denRock'){if(drawExternal('rock',o,{scale:.94,alpha:.88}))return;}
    else if(o.type==='tavern'){if(drawGenerated('tavern',o,{scale:serviceScale.tavern})){const p=worldToScreen(o.x,o.y);labelAt(p.x,p.y-82*camera.zoom,'THE HEARTH & BRIAR');return;}}
    else if(o.type==='forge'){if(drawGenerated('forge',o,{scale:serviceScale.forge})){drawExternal('utility',{x:o.x+48,y:o.y+25},{scale:.72,alpha:.92});const p=worldToScreen(o.x,o.y);labelAt(p.x,p.y-76*camera.zoom,'ALDEN • SMITH');return;}}
    else if(o.type==='alchemy'){if(drawGenerated('alchemy',o,{scale:serviceScale.alchemy})){const p=worldToScreen(o.x,o.y);labelAt(p.x,p.y-78*camera.zoom,'MIRA • ALCHEMY');return;}}
    else if(o.type==='merchant'){if(drawGenerated('market',o,{scale:serviceScale.market})){drawExternal('utility',{x:o.x-45,y:o.y+23},{scale:.66,alpha:.90,flip:true});const p=worldToScreen(o.x,o.y);labelAt(p.x,p.y-68*camera.zoom,'ROWAN • TRADER');return;}}
    else if(o.type==='well'){if(drawGenerated('well',o,{scale:serviceScale.well}))return;}
    else if(o.type==='board'){if(drawExternal('sign',o,{scale:.82}))return;}
    return priorObject(o);
  };
  const priorResource=drawResource;
  drawResource=function build47ScaleCorrectedResource(r){
    if(!enabled()||!r.active)return priorResource(r);
    // Only Copper uses the new unfiltered source node. Iron/Mossglass retain their dedicated
    // proven renderer until dedicated source sprites exist; do not hue-filter source art in-frame.
    if(r.type==='ore'&&drawExternal('ore',r,{scale:.94}))return;
    return priorResource(r);
  };
  window.__BRIAR_GLEN_RUNTIME?.registerHook?.('beforeDraw','build47-source-art-frame-reset',()=>{state.frameDraws=0;},2060);
  debug.isSourceArt47Enabled=enabled;
  debug.getSourceArt47State=()=>({version:state.version,requested:state.requested,historicalProof:state.historicalProof,enabled:enabled(),ready:state.ready,failed:state.failed,failure:state.failure||'',frameDraws:state.frameDraws,totalDraws:state.totalDraws,terrainMode:state.terrainMode,sources:{...state.sources},draws:{...state.draws},baseline:{...state.baseline},current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}});
})();