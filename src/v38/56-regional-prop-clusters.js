(() => {
  'use strict';

  const params=new URLSearchParams(location.search);
  const requested=!params.get('artScope')&&params.get('canvasArt')!=='1'&&params.get('generatedArt')!=='0'&&params.get('assetVariants')!=='0';
  const pack=window.__BRIAR_GLEN_GENERATED_ART,debug=window.__BRIAR_GLENDebug;
  if(!pack?.atlas||!pack?.sprites||!debug)return;

  const state={version:'build43-regional-props-v1',requested,ready:false,failed:false,frameDraws:0,totalDraws:0,clusters:{},assets:{},baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}};
  const atlas=new Image();atlas.decoding='async';atlas.onload=()=>{state.ready=true};atlas.onerror=()=>{state.failed=true;state.ready=false};atlas.src=pack.atlas;

  function enabled(){const g=debug.getGeneratedArtState?.();return Boolean(requested&&state.ready&&!state.failed&&g?.enabled&&g?.ready);}
  function hash(o,salt=0){const t=`${o?.type||''}|${o?.name||''}|${Math.round(o?.x||0)}|${Math.round(o?.y||0)}|${salt}`;let h=2166136261>>>0;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}

  function prop(name,o,{dx=0,dy=0,scale=1,alpha=1,filter=null,rotation=0,flipX=false}={}){
    if(!enabled())return false;const f=pack.sprites[name];if(!f)return false;
    const p=worldToScreen(o.x,o.y),z=camera.zoom*scale,w=f.width*z,h=f.height*z,x=p.x+dx*camera.zoom,y=p.y+dy*camera.zoom;
    if(x+w/2<-140||x-w/2>viewport.w+140||y<-180||y-h>viewport.h+140)return false;
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.globalAlpha=alpha;if(filter)ctx.filter=filter;
    ctx.translate(x,y);if(rotation)ctx.rotate(rotation);if(flipX)ctx.scale(-1,1);ctx.drawImage(atlas,f.sx,f.sy,f.sw,f.sh,-w/2,-h*f.anchor,w,h);ctx.restore();
    state.frameDraws++;state.totalDraws++;state.assets[name]=(state.assets[name]||0)+1;return true;
  }

  function mark(cluster){state.clusters[cluster]=(state.clusters[cluster]||0)+1;}

  function dress(o){
    if(!enabled())return;
    const h=hash(o,7);
    if(o.type==='forge'){
      prop('wagon',o,{dx:93,dy:23,scale:.42,flipX:true,filter:'saturate(.78) brightness(.86)'});
      prop('path_stones',o,{dx:-10,dy:16,scale:.56,alpha:.52});mark('workyard');
    }else if(o.type==='alchemy'){
      prop('herb_clump',o,{dx:-58,dy:12,scale:.48,filter:'saturate(.88)'});
      prop('flower_clump',o,{dx:58,dy:13,scale:.44,filter:'hue-rotate(8deg) saturate(.82)'});mark('alchemy-garden');
    }else if(o.type==='merchant'){
      prop('path_stones',o,{dx:4,dy:15,scale:.58,alpha:.48});
      prop('bench',o,{dx:78,dy:14,scale:.48,filter:'saturate(.76) brightness(.9)'});mark('market-edge');
    }else if(o.type==='tavern'){
      prop('sack',o,{dx:-78,dy:11,scale:.48});
      prop('hay_bales',o,{dx:96,dy:17,scale:.42,filter:'saturate(.78) brightness(.92)'});mark('hearth-quarter');
    }else if(o.type==='board'){
      prop('path_stones',o,{dy:15,scale:.55,alpha:.5});mark('village-green');
    }else if(o.type==='well'){
      if(h%2===0)prop('flower_clump',o,{dx:48,dy:13,scale:.38,alpha:.82});mark('village-green');
    }else if(o.type==='cottage'){
      const v=h%4;
      if(v===0){prop('flower_clump',o,{dx:-62,dy:14,scale:.46});prop('crate',o,{dx:60,dy:13,scale:.42});}
      else if(v===1){prop('barrel',o,{dx:62,dy:13,scale:.42});prop('sack',o,{dx:43,dy:13,scale:.38});}
      else if(v===2){prop('bench',o,{dx:-66,dy:14,scale:.46});prop('flower_clump',o,{dx:58,dy:14,scale:.38});}
      else {prop('trough',o,{dx:62,dy:16,scale:.42});prop('hay_bales',o,{dx:-59,dy:16,scale:.38});}
      mark(`cottage-${v}`);
    }else if(o.type==='groveCache'){
      prop('stump',o,{dx:-48,dy:13,scale:.44,filter:'hue-rotate(6deg) saturate(.62) brightness(.78)'});
      prop('log_pile',o,{dx:48,dy:15,scale:.42,filter:'hue-rotate(7deg) saturate(.66) brightness(.8)'});mark('grove-cache');
    }else if(o.type==='fenCache'){
      prop('stump',o,{dx:-48,dy:13,scale:.42,filter:'hue-rotate(36deg) saturate(.42) brightness(.65)'});
      prop('path_stones',o,{dx:40,dy:15,scale:.5,alpha:.46,filter:'hue-rotate(32deg) saturate(.44) brightness(.72)'});mark('fen-cache');
    }else if(o.type==='stonepineCache'){
      prop('log_pile',o,{dx:-49,dy:14,scale:.42,filter:'saturate(.55) brightness(.72)'});
      prop('crate',o,{dx:45,dy:13,scale:.4,filter:'saturate(.6) brightness(.76)'});mark('stonepine-cache');
    }else if(o.type==='stonepineCamp'){
      prop('bench',o,{dx:-48,dy:15,scale:.5,filter:'saturate(.55) brightness(.74)'});
      prop('crate',o,{dx:49,dy:13,scale:.42,filter:'saturate(.58) brightness(.76)'});
      prop('sack',o,{dx:66,dy:14,scale:.34,filter:'saturate(.52) brightness(.75)'});mark('stonepine-camp');
    }else if(o.type==='ruin'&&h%3===0){
      prop('stump',o,{dx:(h%2?34:-34),dy:13,scale:.36,filter:'saturate(.6) brightness(.7)'});mark('grove-ruin');
    }else if(o.type==='fenRuin'&&h%2===0){
      prop('stump',o,{dx:34,dy:13,scale:.34,filter:'hue-rotate(38deg) saturate(.38) brightness(.62)'});mark('fen-ruin');
    }else if(o.type==='stonepineRuin'&&h%2===0){
      prop('crate',o,{dx:-34,dy:13,scale:.34,filter:'saturate(.48) brightness(.68)'});mark('stonepine-ruin');
    }else if(o.type==='quarryRock'&&h%5===0){
      prop(h%2?'crate':'barrel',o,{dx:h%2?32:-32,dy:14,scale:.34,filter:'saturate(.48) brightness(.68)'});mark('quarry-work');
    }else if(o.type==='stonepineTree'&&h%6===0){
      prop('stump',o,{dx:30,dy:14,scale:.34,filter:'saturate(.45) brightness(.62)'});mark('stonepine-forest');
    }
  }

  const prior=drawObject;
  drawObject=function build43RegionalPropsObject(o){const result=prior(o);dress(o);return result;};
  window.__BRIAR_GLEN_RUNTIME?.registerHook?.('beforeDraw','build43-regional-props-reset',()=>{state.frameDraws=0;},2075);

  debug.getRegionalPropState=()=>({version:state.version,requested:state.requested,enabled:enabled(),ready:state.ready,failed:state.failed,frameDraws:state.frameDraws,totalDraws:state.totalDraws,clusters:{...state.clusters},assets:{...state.assets},baseline:{...state.baseline},current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}});
})();
