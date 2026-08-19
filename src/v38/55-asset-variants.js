(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const requested = !params.get('artScope') && params.get('canvasArt') !== '1' && params.get('generatedArt') !== '0' && params.get('assetVariants') !== '0';
  const pack = window.__BRIAR_GLEN_GENERATED_ART;
  const debug = window.__BRIAR_GLENDebug;
  if (!pack?.atlas || !pack?.sprites || !debug) return;

  const state = {
    version:'build43-asset-variants-v4', requested, ready:false, failed:false,
    applied:0, overlayDraws:0, families:{}, overlays:{},
    baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
  };

  const atlas = new Image();
  atlas.decoding='async';
  atlas.onload=()=>{state.ready=true;};
  atlas.onerror=()=>{state.failed=true;state.ready=false;};
  atlas.src=pack.atlas;

  const hashCache=new WeakMap(),objectCache=new WeakMap(),resourceCache=new WeakMap(),enemyCache=new WeakMap(),recorded=new WeakSet();

  function enabled(){return Boolean(requested&&state.ready&&!state.failed&&debug.isGeneratedArtEnabled?.());}
  function baseHash(entity){
    if(hashCache.has(entity))return hashCache.get(entity);
    const text=`${entity?.type||''}|${entity?.name||''}|${Math.round(entity?.homeX??entity?.x??0)}|${Math.round(entity?.homeY??entity?.y??0)}`;
    let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
    hashCache.set(entity,h>>>0);return h>>>0;
  }
  function seededIndex(entity,salt,length){let h=(baseHash(entity)^Math.imul((salt+1)>>>0,2654435761))>>>0;h^=h>>>16;h=Math.imul(h,2246822507)>>>0;h^=h>>>13;return h%length;}
  function choice(entity,values,salt=0){return values[seededIndex(entity,salt,values.length)];}

  // Build 43 intentionally avoids Canvas image filters in the hot render path. Variation comes
  // from stable scale, existing silhouette mix, facing, prop composition and state graphics.
  function computeObjectVariant(o){
    if(o.type==='cottage')return{family:'cottage',scale:choice(o,[.96,1,1.035],11)};
    if(o.type==='tree')return{family:'tree',scale:choice(o,[.93,1,1.07],13)};
    if(o.type==='bush')return{family:'bush',scale:choice(o,[.9,1,1.08],15)};
    if(o.type==='rock')return{family:'rock',scale:choice(o,[.9,1,1.09],17)};
    if(o.type==='garden')return{family:'garden',scale:choice(o,[.92,1,1.06],19)};
    if(o.type==='npc'&&!['Orin','Perrin','Maeve'].includes(o.name))return{family:'villager',scale:choice(o,[.97,1,1.035],21)};
    return null;
  }
  function objectVariant(o){if(!objectCache.has(o))objectCache.set(o,computeObjectVariant(o));return objectCache.get(o);}
  function computeResourceVariant(r){const scales={herb:[.9,1,1.08],mooncap:[.92,1,1.06],ore:[.9,1,1.08],iron:[.92,1,1.07],mossglass:[.92,1,1.05],resin:[.9,1,1.07]};return scales[r.type]?{family:`resource-${r.type}`,scale:choice(r,scales[r.type],31)}:null;}
  function resourceVariant(r){if(!resourceCache.has(r))resourceCache.set(r,computeResourceVariant(r));return resourceCache.get(r);}
  function computeEnemyVariant(e){return ['boss','grovekeeper','fenwarden','quarrysentinel'].includes(e.type)?null:{family:`enemy-${e.type}`,scale:choice(e,[.95,1,1.045],41)};}
  function enemyVariant(e){if(!enemyCache.has(e))enemyCache.set(e,computeEnemyVariant(e));return enemyCache.get(e);}

  function recordVariant(spec,entity){if(!spec||recorded.has(entity))return;recorded.add(entity);const key=`${spec.family}:${seededIndex(entity,99,3)}`;state.families[key]=(state.families[key]||0)+1;state.applied++;}
  function withVariant(entity,spec,draw){
    if(!enabled()||!spec)return draw();
    const hadS=Object.prototype.hasOwnProperty.call(entity,'s'),oldS=entity.s,base=Number.isFinite(oldS)?oldS:1;
    entity.s=base*(spec.scale||1);
    try{return draw();}finally{if(hadS)entity.s=oldS;else delete entity.s;recordVariant(spec,entity);}
  }

  function drawRaw(name,anchor,{dx=0,dy=0,scale=1,alpha=1,rotation=0,flipX=false}={}){
    const f=pack.sprites[name];if(!f)return false;
    const p=worldToScreen(anchor.x,anchor.y),z=camera.zoom*scale,w=f.width*z,h=f.height*z,x=p.x+dx*camera.zoom,y=p.y+dy*camera.zoom;
    if(x+w/2<-140||x-w/2>viewport.w+140||y<-180||y-h>viewport.h+140)return false;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);if(rotation)ctx.rotate(rotation);if(flipX)ctx.scale(-1,1);
    ctx.drawImage(atlas,f.sx,f.sy,f.sw,f.sh,-w/2,-h*f.anchor,w,h);ctx.restore();
    state.overlayDraws++;state.overlays[name]=(state.overlays[name]||0)+1;return true;
  }

  function beforeObject(o){
    if(!enabled())return;
    if(o.type==='forge')drawRaw('shed',o,{dx:76,dy:11,scale:.7});
    else if(o.type==='stonepineCamp')drawRaw('shed',o,{dx:-48,dy:12,scale:.68,alpha:.9,flipX:true});
    else if(o.type==='fenGate'&&!progress.fenCrossingOpened)drawRaw('fence',o,{dy:8,scale:1.12,alpha:.86,rotation:-.04});
    else if(o.type==='stonepineGate'&&!progress.stonepinePassOpened)drawRaw('fence',o,{dy:8,scale:1.12,alpha:.88,rotation:.04});
  }
  function afterObject(o){
    if(!enabled())return;
    if(o.type==='groveCache')drawRaw('chest',o,{dy:5,scale:.82,alpha:progress.groveCacheClaimed?.48:1});
    else if(o.type==='fenCache')drawRaw('chest',o,{dy:5,scale:.84,alpha:progress.fenCacheClaimed?.46:.86});
    else if(o.type==='stonepineCache')drawRaw('chest',o,{dy:5,scale:.84,alpha:progress.stonepineCacheClaimed?.46:.9});
    else if(o.type==='fenGate'){drawRaw('signpost',o,{dx:-57,dy:5,scale:.72,alpha:.88});if(progress.fenCrossingOpened)drawRaw('path_stones',o,{dx:15,dy:12,scale:.86,alpha:.62});}
    else if(o.type==='stonepineGate'){drawRaw('signpost',o,{dx:-58,dy:5,scale:.72,alpha:.9});if(progress.stonepinePassOpened)drawRaw('path_stones',o,{dx:15,dy:12,scale:.86,alpha:.62});}
    else if(o.type==='shortcut'&&o.active){drawRaw('path_stones',o,{dy:12,scale:.78,alpha:.62});drawRaw('stump',o,{dx:46,dy:9,scale:.48,alpha:.78});}
  }

  const priorObject=drawObject;
  drawObject=function build43VariantObject(o){beforeObject(o);const result=withVariant(o,objectVariant(o),()=>priorObject(o));afterObject(o);return result;};
  const priorResource=drawResource;drawResource=function build43VariantResource(r){return withVariant(r,resourceVariant(r),()=>priorResource(r));};
  const priorEnemy=drawEnemy;drawEnemy=function build43VariantEnemy(e){return withVariant(e,enemyVariant(e),()=>priorEnemy(e));};

  debug.getAssetVariantState=()=>({version:state.version,requested:state.requested,enabled:enabled(),ready:state.ready,failed:state.failed,applied:state.applied,overlayDraws:state.overlayDraws,families:{...state.families},overlays:{...state.overlays},baseline:{...state.baseline},current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}});
})();