(() => {
  'use strict';

  const params=new URLSearchParams(location.search);
  const requested=!params.get('artScope')&&params.get('canvasArt')!=='1'&&params.get('generatedArt')!=='0'&&params.get('assetVariants')!=='0';
  const pack=window.__BRIAR_GLEN_GENERATED_ART,debug=window.__BRIAR_GLENDebug;
  if(!pack?.atlas||!pack?.sprites||!debug)return;

  const state={version:'build43-regional-props-v4',requested,ready:false,failed:false,frameDraws:0,totalDraws:0,clusters:{},assets:{},baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}};
  const atlas=new Image();atlas.decoding='async';atlas.onload=()=>{state.ready=true};atlas.onerror=()=>{state.failed=true;state.ready=false};atlas.src=pack.atlas;
  const hashCache=new WeakMap();
  const eligible=new Set(['forge','alchemy','merchant','tavern','board','well','cottage','groveCache','fenCache','stonepineCache','stonepineCamp','ruin','fenRuin','stonepineRuin','quarryRock','stonepineTree']);

  function enabled(){return Boolean(requested&&state.ready&&!state.failed&&debug.isGeneratedArtEnabled?.());}
  function hash(o){
    if(hashCache.has(o))return hashCache.get(o);
    const t=`${o?.type||''}|${o?.name||''}|${Math.round(o?.x||0)}|${Math.round(o?.y||0)}`;let h=2166136261>>>0;
    for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
    hashCache.set(o,h>>>0);return h>>>0;
  }

  function prop(name,o,{dx=0,dy=0,scale=1,alpha=1,rotation=0,flipX=false}={}){
    const f=pack.sprites[name];if(!f)return false;
    const p=worldToScreen(o.x,o.y),z=camera.zoom*scale,w=f.width*z,h=f.height*z,x=p.x+dx*camera.zoom,y=p.y+dy*camera.zoom;
    if(x+w/2<-140||x-w/2>viewport.w+140||y<-180||y-h>viewport.h+140)return false;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);if(rotation)ctx.rotate(rotation);if(flipX)ctx.scale(-1,1);
    ctx.drawImage(atlas,f.sx,f.sy,f.sw,f.sh,-w/2,-h*f.anchor,w,h);ctx.restore();
    state.frameDraws++;state.totalDraws++;state.assets[name]=(state.assets[name]||0)+1;return true;
  }

  function mark(cluster){state.clusters[cluster]=(state.clusters[cluster]||0)+1;}

  function dress(o){
    if(!enabled()||!eligible.has(o.type))return;
    if(o.type==='forge'){
      prop('wagon',o,{dx:93,dy:23,scale:.42,flipX:true,alpha:.92});prop('path_stones',o,{dx:-10,dy:16,scale:.56,alpha:.52});mark('workyard');
    }else if(o.type==='alchemy'){
      prop('herb_clump',o,{dx:-58,dy:12,scale:.48,alpha:.92});prop('flower_clump',o,{dx:58,dy:13,scale:.44,alpha:.9});mark('alchemy-garden');
    }else if(o.type==='merchant'){
      prop('path_stones',o,{dx:4,dy:15,scale:.58,alpha:.48});prop('bench',o,{dx:78,dy:14,scale:.48,alpha:.9});mark('market-edge');
    }else if(o.type==='tavern'){
      prop('sack',o,{dx:-78,dy:11,scale:.48});prop('hay_bales',o,{dx:96,dy:17,scale:.42,alpha:.92});mark('hearth-quarter');
    }else if(o.type==='board'){
      prop('path_stones',o,{dy:15,scale:.55,alpha:.5});mark('village-green');
    }else if(o.type==='well'){
      const h=hash(o);if(h%2===0)prop('flower_clump',o,{dx:48,dy:13,scale:.38,alpha:.82});mark('village-green');
    }else if(o.type==='cottage'){
      const v=hash(o)%4;
      if(v===0){prop('flower_clump',o,{dx:-62,dy:14,scale:.46});prop('crate',o,{dx:60,dy:13,scale:.42});}
      else if(v===1){prop('barrel',o,{dx:62,dy:13,scale:.42});prop('sack',o,{dx:43,dy:13,scale:.38});}
      else if(v===2){prop('bench',o,{dx:-66,dy:14,scale:.46});prop('flower_clump',o,{dx:58,dy:14,scale:.38});}
      else {prop('trough',o,{dx:62,dy:16,scale:.42});prop('hay_bales',o,{dx:-59,dy:16,scale:.38});}
      mark(`cottage-${v}`);
    }else if(o.type==='groveCache'){
      prop('stump',o,{dx:-48,dy:13,scale:.44,alpha:.78});prop('log_pile',o,{dx:48,dy:15,scale:.42,alpha:.82});mark('grove-cache');
    }else if(o.type==='fenCache'){
      prop('stump',o,{dx:-48,dy:13,scale:.42,alpha:.68});prop('path_stones',o,{dx:40,dy:15,scale:.5,alpha:.4});mark('fen-cache');
    }else if(o.type==='stonepineCache'){
      prop('log_pile',o,{dx:-49,dy:14,scale:.42,alpha:.72});prop('crate',o,{dx:45,dy:13,scale:.4,alpha:.76});mark('stonepine-cache');
    }else if(o.type==='stonepineCamp'){
      prop('bench',o,{dx:-48,dy:15,scale:.5,alpha:.76});prop('crate',o,{dx:49,dy:13,scale:.42,alpha:.78});prop('sack',o,{dx:66,dy:14,scale:.34,alpha:.76});mark('stonepine-camp');
    }else{
      const h=hash(o);
      if(o.type==='ruin'&&h%3===0){prop('stump',o,{dx:(h%2?34:-34),dy:13,scale:.36,alpha:.72});mark('grove-ruin');}
      else if(o.type==='fenRuin'&&h%2===0){prop('stump',o,{dx:34,dy:13,scale:.34,alpha:.62});mark('fen-ruin');}
      else if(o.type==='stonepineRuin'&&h%2===0){prop('crate',o,{dx:-34,dy:13,scale:.34,alpha:.68});mark('stonepine-ruin');}
      else if(o.type==='quarryRock'&&h%5===0){prop(h%2?'crate':'barrel',o,{dx:h%2?32:-32,dy:14,scale:.34,alpha:.7});mark('quarry-work');}
      else if(o.type==='stonepineTree'&&h%6===0){prop('stump',o,{dx:30,dy:14,scale:.34,alpha:.66});mark('stonepine-forest');}
    }
  }

  const prior=drawObject;
  drawObject=function build43RegionalPropsObject(o){const result=prior(o);dress(o);return result;};
  window.__BRIAR_GLEN_RUNTIME?.registerHook?.('beforeDraw','build43-regional-props-reset',()=>{state.frameDraws=0;},2075);
  debug.getRegionalPropState=()=>({version:state.version,requested:state.requested,enabled:enabled(),ready:state.ready,failed:state.failed,frameDraws:state.frameDraws,totalDraws:state.totalDraws,clusters:{...state.clusters},assets:{...state.assets},baseline:{...state.baseline},current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}});
})();