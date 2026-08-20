(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  const proofKeys=['assetVariantProof','landmarkStateProof','env46proof','envperf','terrain46','tperf','generatedArtSmoke','dressing','layoutProof','renderPerf','build30Recovery'];
  const historicalProof=[...params.keys()].some(k=>proofKeys.includes(k));
  const sourceSpritesRequested=params.get('sourceSprites47')!=='0';
  const requested=sourceSpritesRequested&&params.get('sourceArt47')!=='0'&&!historicalProof&&!params.get('artScope')&&params.get('canvasArt')!=='1'&&params.get('generatedArt')!=='0';
  const pack=window.__BRIAR_GLEN_GENERATED_ART,debug=window.__BRIAR_GLENDebug;
  if(!pack?.atlas||!pack?.sprites||!debug)return;
  const baseGeneratedEnabled=debug.isGeneratedArtEnabled?.bind(debug);
  const state={version:'build49-world-scale-reset-v1',requested,sourceSpritesRequested,historicalProof,ready:!requested,failed:false,frameDraws:0,totalDraws:0,frameSuppressed:0,totalSuppressed:0,terrainMode:'physical-ground-v2',sources:{},draws:{},baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}};
  const generatedAtlas=new Image();generatedAtlas.decoding='async';

  // Reference-scale reset. The positive Briar Glen references keep the avatar readable while
  // buildings and trees carry materially larger silhouettes. We restore that relationship here
  // instead of shrinking the whole world to solve density/overlap.
  const external={
    cottage:{src:'assets/v24/cottage-authored.webp',width:150,height:150,anchor:.86},
    tree_deciduous:{src:'assets/v24/tall-tree-authored.webp',width:126,height:150,anchor:.93},
    tree_pine:{src:'assets/v24/pine-tree-authored.webp',width:116,height:154,anchor:.94},
    rock:{src:'assets/v47/rock-cluster.svg',width:70,height:60,anchor:.88},
    ore:{src:'assets/v47/ore-node.svg',width:50,height:45,anchor:.90},
    utility:{src:'assets/v47/utility-crates.svg',width:60,height:52,anchor:.91},
    sign:{src:'assets/v47/sign-lantern.svg',width:54,height:66,anchor:.92}
  };
  const serviceScale={tavern:.95,forge:.95,alchemy:.92,market:.92,well:.92};
  const scaleContract=Object.freeze({
    basis:'approved-reference-avatar-1x',
    cottageHeight:147,
    deciduousTreeHeight:147,
    pineTreeHeight:151,
    tavernHeight:165,
    forgeHeight:143,
    alchemyHeight:153,
    marketHeight:125,
    wellHeight:103,
    lampHeight:83,
    rockHeight:58,
    signHeight:59
  });

  const images={};let pending=1+Object.keys(external).length,failures=[];
  function done(){pending--;if(pending>0)return;if(failures.length){state.failed=true;state.ready=false;state.failure=failures.join('; ');}else state.ready=true;}
  function rasterize(image,def){const c=document.createElement('canvas'),scale=2;c.width=Math.max(1,Math.ceil(def.width*scale));c.height=Math.max(1,Math.ceil(def.height*scale));const x=c.getContext('2d',{alpha:true});x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(image,0,0,c.width,c.height);return c;}
  generatedAtlas.onload=done;generatedAtlas.onerror=()=>{failures.push('generated atlas');done();};generatedAtlas.src=pack.atlas;
  for(const[name,def]of Object.entries(external)){const image=new Image();image.decoding='async';image.onload=()=>{images[name]=rasterize(image,def);state.sources[name]=def.src;done();};image.onerror=()=>{failures.push(def.src);done();};image.src=`${def.src}?v=49scale1`;}
  function enabled(){return Boolean(requested&&state.ready&&!state.failed&&baseGeneratedEnabled?.());}
  function visible(p,w,h,margin=150){return p.x+w/2>-margin&&p.x-w/2<viewport.w+margin&&p.y>-margin&&p.y-h<viewport.h+margin;}
  function entityScale(o){const s=Number.isFinite(o?.s)?o.s:1;return Math.max(.92,Math.min(1.08,.99+(s-1)*.14));}
  function record(name){state.frameDraws++;state.totalDraws++;state.draws[name]=(state.draws[name]||0)+1;}
  function stable01(o){let h=(Math.round((o.x||0)*11)^Math.round((o.y||0)*17)^String(o.type||'').split('').reduce((a,c)=>Math.imul(a^c.charCodeAt(0),16777619),2166136261))>>>0;h^=h>>>16;h=Math.imul(h,2246822507)>>>0;h^=h>>>13;return(h>>>0)/4294967296;}
  function collisionAnchor(o){if(!Array.isArray(blockers))return false;return blockers.some(b=>Math.hypot((o.x||0)-b.x,(o.y||0)-b.y)<14);}
  function keepDecor(o,rate){if(collisionAnchor(o))return true;if(stable01(o)<=rate)return true;state.frameSuppressed++;state.totalSuppressed++;return false;}
  function drawExternal(name,o,{scale=1,alpha=1,flip=false,dx=0,dy=0}={}){const def=external[name],image=images[name];if(!def||!image)return false;const p=worldToScreen(o.x,o.y),z=camera.zoom*scale*entityScale(o),w=def.width*z,h=def.height*z,x=p.x+dx*camera.zoom,y=p.y+dy*camera.zoom;if(!visible({x,y},w,h))return true;if(!flip&&alpha===1){ctx.drawImage(image,x-w/2,y-h*def.anchor,w,h);}else{ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(image,-w/2,-h*def.anchor,w,h);ctx.restore();}record(name);return true;}
  function drawGenerated(name,o,{scale=1,alpha=1,flip=false,dx=0,dy=0}={}){const f=pack.sprites[name];if(!f)return false;const p=worldToScreen(o.x,o.y),z=camera.zoom*scale*entityScale(o),w=f.width*z,h=f.height*z,x=p.x+dx*camera.zoom,y=p.y+dy*camera.zoom;if(!visible({x,y},w,h))return true;if(!flip&&alpha===1){ctx.drawImage(generatedAtlas,f.sx,f.sy,f.sw,f.sh,x-w/2,y-h*f.anchor,w,h);}else{ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(generatedAtlas,f.sx,f.sy,f.sw,f.sh,-w/2,-h*f.anchor,w,h);ctx.restore();}record(name);return true;}
  function treeName(o){return(Math.abs(Math.round(o.x*7+o.y*11))%3===0)?'tree_pine':'tree_deciduous';}

  const priorObject=drawObject;
  drawObject=function build49ReferenceScaleObject(o){
    if(!enabled())return priorObject(o);
    if(o.type==='cottage'){if(drawExternal('cottage',o,{scale:.98}))return;}
    else if(o.type==='tree'){if(!keepDecor(o,.48))return;if(drawExternal(treeName(o),o,{scale:.98}))return;}
    else if(o.type==='fenTree'){if(!keepDecor(o,.60))return;if(drawExternal('tree_deciduous',o,{scale:.92,alpha:.96}))return;}
    else if(o.type==='stonepineTree'){if(!keepDecor(o,.60))return;if(drawExternal('tree_pine',o,{scale:.94,alpha:.97}))return;}
    else if(o.type==='rock'){if(!keepDecor(o,.68))return;if(drawExternal('rock',o,{scale:.96}))return;}
    else if(o.type==='quarryRock'){if(!keepDecor(o,.68))return;if(drawExternal('rock',o,{scale:.90,alpha:.95}))return;}
    else if(o.type==='denRock'){if(!keepDecor(o,.74))return;if(drawExternal('rock',o,{scale:.92,alpha:.94}))return;}
    else if(['ruin','fenRuin','stonepineRuin'].includes(o.type)){if(drawExternal('rock',o,{scale:.82,alpha:.90}))return;}
    else if(o.type==='deadTree'){if(!keepDecor(o,.56))return;if(drawGenerated('stump',o,{scale:.78}))return;}
    else if(o.type==='bush'){if(!keepDecor(o,.44))return;if(drawGenerated('bush',o,{scale:.80}))return;}
    else if(o.type==='garden'){if(drawGenerated('flower_clump',o,{scale:.80}))return;}
    else if(o.type==='fence'){if(drawGenerated('fence',o,{scale:.78}))return;}
    else if(o.type==='lamp'){if(drawGenerated('lamp',o,{scale:.88}))return;}
    else if(o.type==='ember'){if(!keepDecor(o,.66))return;if(drawGenerated('campfire',o,{scale:.55,alpha:.92}))return;}
    else if(['groveSign','fenSign','stonepineSign'].includes(o.type)){if(drawExternal('sign',o,{scale:.90}))return;}
    else if(o.type==='tavern'){if(drawGenerated('tavern',o,{scale:serviceScale.tavern})){const p=worldToScreen(o.x,o.y);labelAt(p.x,p.y-169*camera.zoom,'THE HEARTH & BRIAR');return;}}
    else if(o.type==='forge'){if(drawGenerated('forge',o,{scale:serviceScale.forge})){drawExternal('utility',{x:o.x+72,y:o.y+38},{scale:.86,alpha:.92});const p=worldToScreen(o.x,o.y);labelAt(p.x,p.y-149*camera.zoom,'ALDEN • SMITH');return;}}
    else if(o.type==='alchemy'){if(drawGenerated('alchemy',o,{scale:serviceScale.alchemy})){const p=worldToScreen(o.x,o.y);labelAt(p.x,p.y-160*camera.zoom,'MIRA • ALCHEMY');return;}}
    else if(o.type==='merchant'){if(drawGenerated('market',o,{scale:serviceScale.market})){drawExternal('utility',{x:o.x-65,y:o.y+34},{scale:.82,alpha:.90,flip:true});const p=worldToScreen(o.x,o.y);labelAt(p.x,p.y-132*camera.zoom,'ROWAN • TRADER');return;}}
    else if(o.type==='well'){if(drawGenerated('well',o,{scale:serviceScale.well}))return;}
    else if(o.type==='board'){if(drawExternal('sign',o,{scale:1.0}))return;}
    return priorObject(o);
  };

  const priorResource=drawResource;
  drawResource=function build49ReferenceScaleResource(r){
    if(!enabled()||!r.active)return priorResource(r);
    if(r.type==='ore'&&drawExternal('ore',r,{scale:1.0}))return;
    if(r.type==='herb'&&drawGenerated('herb_clump',r,{scale:.70}))return;
    if(r.type==='mooncap'&&drawGenerated('mooncap_clump',r,{scale:.70}))return;
    if(r.type==='resin'&&drawGenerated('log_pile',r,{scale:.55}))return;
    return priorResource(r);
  };

  window.__BRIAR_GLEN_RUNTIME?.registerHook?.('beforeDraw','build47-source-art-frame-reset',()=>{state.frameDraws=0;state.frameSuppressed=0;},2060);
  debug.isSourceArt47Enabled=enabled;
  debug.getSourceArt47State=()=>({version:state.version,requested:state.requested,sourceSpritesRequested:state.sourceSpritesRequested,historicalProof:state.historicalProof,enabled:enabled(),ready:state.ready,failed:state.failed,failure:state.failure||'',frameDraws:state.frameDraws,totalDraws:state.totalDraws,frameSuppressed:state.frameSuppressed,totalSuppressed:state.totalSuppressed,terrainMode:state.terrainMode,sources:{...state.sources},draws:{...state.draws},scaleContract:{...scaleContract},densityContract:{genericTree:.48,fenTree:.60,stonepineTree:.60,bush:.44,rock:.68,denRock:.74},baseline:{...state.baseline},current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}});
})();