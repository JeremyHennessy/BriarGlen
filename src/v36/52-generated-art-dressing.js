(() => {
  'use strict';
  const pack = window.__BRIAR_GLEN_GENERATED_ART;
  const debug = window.__BRIAR_GLENDebug;
  const runtime = window.__BRIAR_GLEN_RUNTIME;
  const state = {
    version:'build41-generated-dressing-v2',
    ready:false,
    failed:false,
    frameDraws:0,
    totalDraws:0,
    assets:{},
    baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
  };

  function enabled() {
    return Boolean(state.ready && !state.failed && debug?.isGeneratedArtEnabled?.());
  }

  if (!pack?.atlas || !pack?.sprites) {
    state.failed = true;
    if (debug) debug.getGeneratedDressingState = () => ({...state,enabled:false});
    return;
  }

  const atlas = new Image();
  atlas.decoding = 'async';
  atlas.onload = () => { state.ready = true; };
  atlas.onerror = () => { state.failed = true; state.ready = false; };
  atlas.src = pack.atlas;

  function drawProp(name, anchor, {dx=0,dy=0,scale=1,alpha=1,flipX=false}={}) {
    const f = pack.sprites[name];
    if (!f) return false;
    const p = worldToScreen(anchor.x, anchor.y);
    const z = camera.zoom * scale;
    const width = f.width * z;
    const height = f.height * z;
    const x = p.x + dx * camera.zoom;
    const y = p.y + dy * camera.zoom - height * f.anchor;
    if (x + width/2 < -120 || x - width/2 > viewport.w + 120 || y + height < -120 || y > viewport.h + 120) return false;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (flipX) {
      ctx.translate(x,0); ctx.scale(-1,1);
      ctx.drawImage(atlas,f.sx,f.sy,f.sw,f.sh,-width/2,y,width,height);
    } else {
      ctx.drawImage(atlas,f.sx,f.sy,f.sw,f.sh,x-width/2,y,width,height);
    }
    ctx.restore();
    state.frameDraws++;
    state.totalDraws++;
    state.assets[name] = (state.assets[name] || 0) + 1;
    return true;
  }

  function dress(o) {
    if (!enabled()) return;
    if (o.type === 'merchant') {
      drawProp('crate',o,{dx:45,dy:8,scale:.72});
      drawProp('sack',o,{dx:22,dy:9,scale:.62});
      drawProp('barrel',o,{dx:-43,dy:7,scale:.66});
    } else if (o.type === 'forge') {
      drawProp('barrel',o,{dx:-49,dy:7,scale:.68});
      drawProp('log_pile',o,{dx:50,dy:10,scale:.62});
      drawProp('crate',o,{dx:31,dy:7,scale:.58});
    } else if (o.type === 'tavern') {
      drawProp('bench',o,{dx:-58,dy:12,scale:.68});
      drawProp('wagon',o,{dx:78,dy:15,scale:.53,flipX:true});
      drawProp('barrel',o,{dx:47,dy:9,scale:.57});
    } else if (o.type === 'alchemy') {
      drawProp('sack',o,{dx:-44,dy:9,scale:.58});
      drawProp('crate',o,{dx:45,dy:8,scale:.60});
    } else if (o.type === 'well') {
      drawProp('path_stones',o,{dx:0,dy:11,scale:.76,alpha:.82});
    } else if (o.type === 'cottage') {
      const variant = Math.abs(Math.round(o.x * .17 + o.y * .23)) % 3;
      if (variant === 0) drawProp('hay_bales',o,{dx:53,dy:12,scale:.56});
      else if (variant === 1) drawProp('trough',o,{dx:-53,dy:12,scale:.58});
    } else if (o.type === 'stonepineCamp') {
      drawProp('campfire',o,{dx:0,dy:8,scale:.86});
      drawProp('log_pile',o,{dx:38,dy:12,scale:.54});
    }
  }

  const priorDrawObject = drawObject;
  drawObject = function build41GeneratedDressedObject(o) {
    priorDrawObject(o);
    dress(o);
  };

  if (runtime?.registerHook) {
    runtime.registerHook('beforeDraw','build41-generated-dressing-reset',()=>{state.frameDraws=0;},2050);
  }

  if (debug) {
    debug.getGeneratedDressingState = () => ({
      version:state.version,
      enabled:enabled(),ready:state.ready,failed:state.failed,
      frameDraws:state.frameDraws,totalDraws:state.totalDraws,assets:{...state.assets},
      baseline:{...state.baseline},
      current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
    });
  }
})();