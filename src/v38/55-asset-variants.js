(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const requested = !params.get('artScope') && params.get('canvasArt') !== '1' && params.get('generatedArt') !== '0' && params.get('assetVariants') !== '0';
  const pack = window.__BRIAR_GLEN_GENERATED_ART;
  const debug = window.__BRIAR_GLENDebug;
  if (!pack?.atlas || !pack?.sprites || !debug) return;

  const state = {
    version:'build43-asset-variants-v2',
    requested,
    ready:false,
    failed:false,
    applied:0,
    overlayDraws:0,
    families:{},
    overlays:{},
    baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
  };

  const atlas = new Image();
  atlas.decoding='async';
  atlas.onload=()=>{state.ready=true;};
  atlas.onerror=()=>{state.failed=true;state.ready=false;};
  atlas.src=pack.atlas;

  const hashCache=new WeakMap();
  const objectCache=new WeakMap();
  const resourceCache=new WeakMap();
  const enemyCache=new WeakMap();
  const recorded=new WeakSet();

  function enabled(){
    const generated=debug.getGeneratedArtState?.();
    return Boolean(requested && state.ready && !state.failed && generated?.enabled && generated?.ready);
  }

  function baseHash(entity){
    if(hashCache.has(entity))return hashCache.get(entity);
    const text=`${entity?.type||''}|${entity?.name||''}|${Math.round(entity?.homeX??entity?.x??0)}|${Math.round(entity?.homeY??entity?.y??0)}`;
    let h=2166136261>>>0;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
    hashCache.set(entity,h>>>0);return h>>>0;
  }
  function seededIndex(entity,salt,length){
    let h=(baseHash(entity)^Math.imul((salt+1)>>>0,2654435761))>>>0;
    h^=h>>>16;h=Math.imul(h,2246822507)>>>0;h^=h>>>13;
    return h%length;
  }
  function choice(entity,values,salt=0){return values[seededIndex(entity,salt,values.length)];}

  // Hot-path families rely on scale/silhouette/composition variation only. Reapplying Canvas
  // color filters to 100+ trees/rocks/resources every frame was needlessly expensive on phones.
  // Restrained filter variation is retained only for the tiny cottage/villager families.
  function computeObjectVariant(o){
    const scale=choice(o,[.96,1,1.035],11);
    if(o.type==='cottage')return{family:'cottage',scale,filter:choice(o,['saturate(.94) brightness(1.01)','sepia(.055) saturate(.9) brightness(1.02)','hue-rotate(-5deg) saturate(.9) brightness(.98)'],12)};
    if(o.type==='tree')return{family:'tree',scale:choice(o,[.93,1,1.07],13)};
    if(o.type==='bush')return{family:'bush',scale:choice(o,[.9,1,1.08],15)};
    if(o.type==='rock')return{family:'rock',scale:choice(o,[.9,1,1.09],17)};
    if(o.type==='garden')return{family:'garden',scale:choice(o,[.92,1,1.06],19)};
    if(o.type==='npc' && !['Orin','Perrin','Maeve'].includes(o.name))return{family:'villager',scale:choice(o,[.97,1,1.035],21),filter:choice(o,['saturate(.92)','sepia(.035) saturate(.9)','hue-rotate(5deg) saturate(.86) brightness(.99)'],22)};
    return null;
  }
  function objectVariant(o){if(!objectCache.has(o))objectCache.set(o,computeObjectVariant(o));return objectCache.get(o);}

  function computeResourceVariant(r){
    const scales={herb:[.9,1,1.08],mooncap:[.92,1,1.06],ore:[.9,1,1.08],iron:[.92,1,1.07],mossglass:[.92,1,1.05],resin:[.9,1,1.07]};
    if(!scales[r.type])return null;
    return{family:`resource-${r.type}`,scale:choice(r,scales[r.type],31)};
  }
  function resourceVariant(r){if(!resourceCache.has(r))resourceCache.set(r,computeResourceVariant(r));return resourceCache.get(r);}

  function computeEnemyVariant(e){
    if(['boss','grovekeeper','fenwarden','quarrysentinel'].includes(e.type))return null;
    return{family:`enemy-${e.type}`,scale:choice(e,[.95,1,1.045],41)};
  }
  function enemyVariant(e){if(!enemyCache.has(e))enemyCache.set(e,computeEnemyVariant(e));return enemyCache.get(e);}

  function recordVariant(spec,entity){
    if(!spec||recorded.has(entity))return;
    recorded.add(entity);
    const key=`${spec.family}:${seededIndex(entity,99,3)}`;
    state.families[key]=(state.families[key]||0)+1;
    state.applied++;
  }

  function withVariant(entity,spec,draw){
    if(!enabled()||!spec)return draw();
    const hadS=Object.prototype.hasOwnProperty.call(entity,'s');
    const oldS=entity.s;
    const base=Number.isFinite(oldS)?oldS:1;
    entity.s=base*(spec.scale||1);
    if(spec.filter){
      ctx.save();ctx.filter=spec.filter;
      try{return draw();}
      finally{ctx.restore();if(hadS)entity.s=oldS;else delete entity.s;recordVariant(spec,entity);}
    }
    try{return draw();}
    finally{if(hadS)entity.s=oldS;else delete entity.s;recordVariant(spec,entity);}
  }

  function drawRaw(name,anchor,{dx=0,dy=0,scale=1,alpha=1,filter=null,rotation=0,flipX=false}={}){
    if(!enabled())return false;
    const f=pack.sprites[name];if(!f)return false;
    const p=worldToScreen(anchor.x,anchor.y),z=camera.zoom*scale;
    const w=f.width*z,h=f.height*z,x=p.x+dx*camera.zoom,y=p.y+dy*camera.zoom;
    if(x+w/2<-140||x-w/2>viewport.w+140||y<-180||y-h>viewport.h+140)return false;
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.globalAlpha=alpha;
    if(filter)ctx.filter=filter;
    ctx.translate(x,y);if(rotation)ctx.rotate(rotation);if(flipX)ctx.scale(-1,1);
    ctx.drawImage(atlas,f.sx,f.sy,f.sw,f.sh,-w/2,-h*f.anchor,w,h);ctx.restore();
    state.overlayDraws++;state.overlays[name]=(state.overlays[name]||0)+1;return true;
  }

  function beforeObject(o){
    if(!enabled())return;
    if(o.type==='forge')drawRaw('shed',o,{dx:76,dy:11,scale:.7,filter:'saturate(.78) brightness(.9)'});
    else if(o.type==='stonepineCamp')drawRaw('shed',o,{dx:-48,dy:12,scale:.68,filter:'saturate(.58) brightness(.78) contrast(1.04)',flipX:true});
    else if(o.type==='fenGate'&&!progress.fenCrossingOpened)drawRaw('fence',o,{dy:8,scale:1.12,filter:'hue-rotate(28deg) saturate(.52) brightness(.72)',rotation:-.04});
    else if(o.type==='stonepineGate'&&!progress.stonepinePassOpened)drawRaw('fence',o,{dy:8,scale:1.12,filter:'saturate(.62) brightness(.78)',rotation:.04});
  }

  function afterObject(o){
    if(!enabled())return;
    if(o.type==='groveCache')drawRaw('chest',o,{dy:5,scale:.82,alpha:progress.groveCacheClaimed?.52:1,filter:progress.groveCacheClaimed?'saturate(.35) brightness(.7)':'saturate(.88) brightness(.96)'});
    else if(o.type==='fenCache')drawRaw('chest',o,{dy:5,scale:.84,alpha:progress.fenCacheClaimed?.52:1,filter:progress.fenCacheClaimed?'hue-rotate(38deg) saturate(.28) brightness(.62)':'hue-rotate(38deg) saturate(.55) brightness(.8)'});
    else if(o.type==='stonepineCache')drawRaw('chest',o,{dy:5,scale:.84,alpha:progress.stonepineCacheClaimed?.52:1,filter:progress.stonepineCacheClaimed?'saturate(.28) brightness(.64)':'saturate(.58) brightness(.82)'});
    else if(o.type==='fenGate'){
      drawRaw('signpost',o,{dx:-57,dy:5,scale:.72,filter:'hue-rotate(26deg) saturate(.58) brightness(.78)'});
      if(progress.fenCrossingOpened)drawRaw('path_stones',o,{dx:15,dy:12,scale:.86,alpha:.72,filter:'hue-rotate(28deg) saturate(.48) brightness(.82)'});
    }else if(o.type==='stonepineGate'){
      drawRaw('signpost',o,{dx:-58,dy:5,scale:.72,filter:'saturate(.66) brightness(.82)'});
      if(progress.stonepinePassOpened)drawRaw('path_stones',o,{dx:15,dy:12,scale:.86,alpha:.72,filter:'saturate(.55) brightness(.8)'});
    }else if(o.type==='shortcut'&&o.active){
      drawRaw('path_stones',o,{dy:12,scale:.78,alpha:.72,filter:'hue-rotate(10deg) saturate(.68) brightness(.88)'});
      drawRaw('stump',o,{dx:46,dy:9,scale:.48,alpha:.85,filter:'saturate(.65) brightness(.78)'});
    }
  }

  const priorObject=drawObject;
  drawObject=function build43VariantObject(o){
    beforeObject(o);
    const result=withVariant(o,objectVariant(o),()=>priorObject(o));
    afterObject(o);
    return result;
  };

  const priorResource=drawResource;
  drawResource=function build43VariantResource(r){return withVariant(r,resourceVariant(r),()=>priorResource(r));};

  const priorEnemy=drawEnemy;
  drawEnemy=function build43VariantEnemy(e){return withVariant(e,enemyVariant(e),()=>priorEnemy(e));};

  debug.getAssetVariantState=()=>({
    version:state.version,requested:state.requested,enabled:enabled(),ready:state.ready,failed:state.failed,
    applied:state.applied,overlayDraws:state.overlayDraws,families:{...state.families},overlays:{...state.overlays},
    baseline:{...state.baseline},current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
  });
})();
