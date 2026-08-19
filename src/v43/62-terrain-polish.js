(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  const requested=!params.get('artScope')&&params.get('canvasArt')!=='1'&&params.get('terrainPolish')!=='0';
  const pack=window.__BRIAR_GLEN_GENERATED_ART,debug=window.__BRIAR_GLENDebug;
  if(!pack?.atlas||!pack?.sprites||!debug)return;
  const slots=Object.freeze([
    'bg46_grove_cache_claimed','bg46_fen_cache_claimed','bg46_stonepine_cache_claimed',
    'bg46_fen_gate_open','bg46_stonepine_gate_open',
    'bg46_copper_depleted','bg46_iron_depleted','bg46_mossglass_depleted','bg46_resin_depleted',
    'bg46_rootway_active_marker'
  ]);
  const state={version:'build46c-terrain-polish-v1',requested,ready:false,failed:false,assetCount:slots.length,frameDraws:0,totalDraws:0,states:{},footBlends:0,baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}};
  const atlas=new Image();atlas.decoding='async';atlas.onload=()=>state.ready=true;atlas.onerror=()=>{state.failed=true;state.ready=false};atlas.src=pack.atlas;
  function enabled(){return Boolean(requested&&state.ready&&!state.failed&&debug.isGeneratedArtEnabled?.());}
  function visible(o,margin=150){const p=worldToScreen(o.x,o.y);return p.x>-margin&&p.x<viewport.w+margin&&p.y>-margin&&p.y<viewport.h+margin;}
  function sprite(name,o,{dx=0,dy=0,scale=1,alpha=1,flip=false}={}){if(!enabled()||!visible(o))return false;const f=pack.sprites[name];if(!f)return false;const p=worldToScreen(o.x,o.y),z=camera.zoom*scale,w=f.width*z,h=f.height*z;ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x+dx*camera.zoom,0);if(flip)ctx.scale(-1,1);ctx.drawImage(atlas,f.sx,f.sy,f.sw,f.sh,-w/2,p.y+dy*camera.zoom-h*f.anchor,w,h);ctx.restore();state.frameDraws++;state.totalDraws++;return true;}
  function mark(id){state.states[id]=(state.states[id]||0)+1;}
  function foot(o){if(!enabled()||!visible(o,220))return;if(!['cottage','tavern','forge','alchemy','merchant','well','fenGate','stonepineGate','stonepineCamp','rock','quarryRock','denRock','fenTree','stonepineTree'].includes(o.type))return;const p=worldToScreen(o.x,o.y),wide=['cottage','tavern','forge','alchemy','merchant'].includes(o.type),rx=(wide?48:25)*camera.zoom,ry=(wide?15:9)*camera.zoom;ctx.save();ctx.globalAlpha=wide?.075:.045;ctx.fillStyle=o.type.startsWith('fen')?'#526b5f':o.type.startsWith('stonepine')?'#665f4b':o.type.includes('den')?'#5b4035':'#5e543c';ctx.beginPath();ctx.ellipse(p.x,p.y+5*camera.zoom,rx,ry,0,0,TAU);ctx.fill();ctx.restore();state.footBlends++;}
  function objectState(o){
    if(!enabled())return;
    if(o.type==='groveCache'&&progress.groveCacheClaimed){sprite('chest',o,{dy:6,scale:.66,alpha:.28});sprite('stump',o,{dx:30,dy:12,scale:.24,alpha:.48});mark('bg46_grove_cache_claimed');}
    else if(o.type==='fenCache'&&progress.fenCacheClaimed){sprite('chest',o,{dy:6,scale:.66,alpha:.24});sprite('path_stones',o,{dy:15,scale:.42,alpha:.26});mark('bg46_fen_cache_claimed');}
    else if(o.type==='stonepineCache'&&progress.stonepineCacheClaimed){sprite('chest',o,{dy:6,scale:.66,alpha:.24});sprite('log_pile',o,{dx:-28,dy:13,scale:.24,alpha:.42});mark('bg46_stonepine_cache_claimed');}
    else if(o.type==='fenGate'&&progress.fenCrossingOpened){sprite('fence',o,{dx:-58,dy:10,scale:.46,alpha:.48});sprite('fence',o,{dx:58,dy:10,scale:.46,alpha:.48,flip:true});sprite('path_stones',o,{dy:15,scale:.56,alpha:.34});mark('bg46_fen_gate_open');}
    else if(o.type==='stonepineGate'&&progress.stonepinePassOpened){sprite('fence',o,{dx:-60,dy:10,scale:.46,alpha:.52});sprite('fence',o,{dx:60,dy:10,scale:.46,alpha:.52,flip:true});sprite('path_stones',o,{dy:15,scale:.56,alpha:.34});mark('bg46_stonepine_gate_open');}
    else if(o.type==='shortcut'&&o.active){sprite('signpost',o,{dx:-40,dy:5,scale:.34,alpha:.58});sprite('path_stones',o,{dy:15,scale:.48,alpha:.30});mark('bg46_rootway_active_marker');}
  }
  function depleted(){
    if(!enabled())return;
    for(const r of resources){if(r.active||!visible(r))continue;let id=null,name=null,scale=.46,alpha=.22;if(r.type==='ore'){id='bg46_copper_depleted';name='copper_ore';}else if(r.type==='iron'){id='bg46_iron_depleted';name='iron_ore';}else if(r.type==='mossglass'){id='bg46_mossglass_depleted';name='iron_ore';alpha=.18;}else if(r.type==='resin'){id='bg46_resin_depleted';name='log_pile';scale=.32;}if(!id)continue;sprite(name,r,{dy:9,scale,alpha});mark(id);}
  }
  const priorObject=drawObject;
  drawObject=function build46TerrainPolishObject(o){foot(o);const result=priorObject(o);objectState(o);return result;};
  window.__BRIAR_GLEN_RUNTIME?.registerHook?.('beforeDraw','build46c-terrain-reset',()=>{state.frameDraws=0;state.footBlends=0;},2120);
  window.__BRIAR_GLEN_RUNTIME?.registerHook?.('afterDraw','build46c-depleted-resources',depleted,2750);
  debug.getTerrainPolish46State=()=>({version:state.version,requested:state.requested,enabled:enabled(),ready:state.ready,failed:state.failed,assetCount:state.assetCount,registered:[...slots],frameDraws:state.frameDraws,totalDraws:state.totalDraws,states:{...state.states},footBlends:state.footBlends,baseline:{...state.baseline},current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}});
})();