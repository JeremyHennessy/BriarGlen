(() => {
  'use strict';

  const params=new URLSearchParams(location.search);
  const requested=!params.get('artScope')&&params.get('canvasArt')!=='1'&&params.get('generatedArt')!=='0'&&params.get('landmarkPolish')!=='0';
  const pack=window.__BRIAR_GLEN_GENERATED_ART,debug=window.__BRIAR_GLENDebug;
  if(!pack?.atlas||!pack?.sprites||!debug)return;

  const state={
    version:'build44-landmark-state-v1',requested,ready:false,failed:false,
    frameDraws:0,totalDraws:0,archetypes:{},landmarks:{},
    baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
  };
  const atlas=new Image();atlas.decoding='async';atlas.onload=()=>{state.ready=true;};atlas.onerror=()=>{state.failed=true;state.ready=false;};atlas.src=pack.atlas;
  const hashCache=new WeakMap();

  function enabled(){const generated=debug.getGeneratedArtState?.();return Boolean(requested&&state.ready&&!state.failed&&generated?.enabled&&generated?.ready);}
  function hash(o){
    if(hashCache.has(o))return hashCache.get(o);
    const text=`${o?.type||''}|${o?.name||''}|${Math.round(o?.homeX??o?.x??0)}|${Math.round(o?.homeY??o?.y??0)}`;
    let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
    hashCache.set(o,h>>>0);return h>>>0;
  }
  function visible(p,margin=180){return p.x>-margin&&p.x<viewport.w+margin&&p.y>-margin&&p.y<viewport.h+margin;}
  function sprite(name,o,{dx=0,dy=0,scale=1,alpha=1,rotation=0,flipX=false}={}){
    if(!enabled())return false;const f=pack.sprites[name];if(!f)return false;
    const p=worldToScreen(o.x,o.y);if(!visible(p))return false;
    const z=camera.zoom*scale,w=f.width*z,h=f.height*z,x=p.x+dx*camera.zoom,y=p.y+dy*camera.zoom;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);if(rotation)ctx.rotate(rotation);if(flipX)ctx.scale(-1,1);
    ctx.drawImage(atlas,f.sx,f.sy,f.sw,f.sh,-w/2,-h*f.anchor,w,h);ctx.restore();
    state.frameDraws++;state.totalDraws++;return true;
  }
  function mark(group,key){const bucket=state[group];bucket[key]=(bucket[key]||0)+1;}

  function beforeObject(o){
    if(!enabled())return;
    if(o.type==='cottage'){
      const variant=hash(o)%3;
      if(variant===1){sprite('shed',o,{dx:-58,dy:9,scale:.50,alpha:.96,flipX:true});mark('archetypes','cottage-left-annex');}
      else if(variant===2){sprite('shed',o,{dx:58,dy:10,scale:.52,alpha:.96});mark('archetypes','cottage-right-annex');}
      else mark('archetypes','cottage-compact');
    }
    if(o.type==='fenGate'&&progress.fenCrossingOpened){
      sprite('fence',o,{dx:-62,dy:10,scale:.62,alpha:.62,rotation:-.05});
      sprite('fence',o,{dx:62,dy:10,scale:.62,alpha:.62,rotation:.05,flipX:true});
      mark('landmarks','fen-open-wings');
    }else if(o.type==='stonepineGate'&&progress.stonepinePassOpened){
      sprite('fence',o,{dx:-64,dy:10,scale:.62,alpha:.66,rotation:-.04});
      sprite('fence',o,{dx:64,dy:10,scale:.62,alpha:.66,rotation:.04,flipX:true});
      mark('landmarks','stonepine-open-wings');
    }
  }

  function afterObject(o){
    if(!enabled())return;
    if(o.type==='groveCache'){
      sprite('mooncap_clump',o,{dx:-42,dy:11,scale:.38,alpha:progress.groveCacheClaimed?.30:.72});
      sprite('stump',o,{dx:43,dy:12,scale:.34,alpha:.68});
      mark('landmarks',progress.groveCacheClaimed?'grove-cache-claimed':'grove-cache-ready');
    }else if(o.type==='fenCache'){
      sprite('path_stones',o,{dx:0,dy:15,scale:.52,alpha:.34});
      sprite('stump',o,{dx:44,dy:12,scale:.32,alpha:.54});
      mark('landmarks',progress.fenCacheClaimed?'fen-cache-claimed':'fen-cache-ready');
    }else if(o.type==='stonepineCache'){
      sprite('log_pile',o,{dx:-43,dy:13,scale:.34,alpha:.62});
      sprite('signpost',o,{dx:46,dy:7,scale:.42,alpha:.72});
      mark('landmarks',progress.stonepineCacheClaimed?'stonepine-cache-claimed':'stonepine-cache-ready');
    }else if(o.type==='fenGate'){
      sprite('lamp',o,{dx:-72,dy:3,scale:.42,alpha:.72});
      mark('landmarks',progress.fenCrossingOpened?'fen-gate-open':'fen-gate-closed');
    }else if(o.type==='stonepineGate'){
      sprite('signpost',o,{dx:-72,dy:5,scale:.48,alpha:.74});
      mark('landmarks',progress.stonepinePassOpened?'stonepine-gate-open':'stonepine-gate-closed');
    }else if(o.type==='shortcut'&&o.active){
      sprite('signpost',o,{dx:-52,dy:5,scale:.42,alpha:.70});
      sprite('log_pile',o,{dx:52,dy:13,scale:.30,alpha:.56});
      mark('landmarks','rootway-active');
    }else if(o.type==='stonepineCamp'){
      sprite('wagon',o,{dx:82,dy:18,scale:.38,alpha:.74,flipX:true});
      mark('landmarks','stonepine-camp-silhouette');
    }
  }

  const priorDrawObject=drawObject;
  drawObject=function build44LandmarkObject(o){beforeObject(o);const result=priorDrawObject(o);afterObject(o);return result;};
  window.__BRIAR_GLEN_RUNTIME?.registerHook?.('beforeDraw','build44-landmark-reset',()=>{state.frameDraws=0;},2090);

  debug.getLandmarkStatePolish=()=>({
    version:state.version,requested:state.requested,enabled:enabled(),ready:state.ready,failed:state.failed,
    frameDraws:state.frameDraws,totalDraws:state.totalDraws,archetypes:{...state.archetypes},landmarks:{...state.landmarks},
    baseline:{...state.baseline},current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
  });
})();
