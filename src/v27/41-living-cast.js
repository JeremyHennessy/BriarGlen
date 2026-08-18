(() => {
  'use strict';

  // Build 31 revision: authored player, representative threats, service characters and visible townfolk.
  // All gameplay/world state remains authoritative in the verified historical runtime underneath.
  const params = new URLSearchParams(location.search);
  const rollbackRequested = params.get('canvasArt') === '1';
  const artScope = params.get('artScope') || '';
  const historicalScope = ['build25','build26','build27','build28','build29','build30'].includes(artScope);
  const characterExpanded = !rollbackRequested && !historicalScope;

  const debug = window.__BRIAR_GLENDebug;
  const baseGetArtState = debug?.getAuthoredArtState;
  if (!debug || typeof baseGetArtState !== 'function') {
    console.error('Build 31 Living Cast requires the verified authored-art runtime');
    return;
  }

  const defs = {
    player_sword:{src:'assets/v31/warden-sword.svg',width:76,height:104,anchor:.94,filter:'saturate(.88) brightness(.96) contrast(1.02)'},
    player_bow:{src:'assets/v31/warden-bow.svg',width:76,height:104,anchor:.94,filter:'saturate(.88) brightness(.96) contrast(1.02)'},
    player_staff:{src:'assets/v31/warden-staff.svg',width:76,height:104,anchor:.94,filter:'saturate(.90) brightness(.97) contrast(1.02)'},
    wolf:{src:'assets/v31/briar-wolf.svg',width:90,height:71,anchor:.88,filter:'saturate(.72) brightness(.91) contrast(1.03)'},
    boar:{src:'assets/v31/hollow-boar.svg',width:96,height:76,anchor:.88,filter:'saturate(.84) brightness(.94) contrast(1.03)'},
    boss:{src:'assets/v31/emberback.svg',width:132,height:98,anchor:.89,filter:'saturate(.92) brightness(.92) contrast(1.04)'},
    alden:{src:'assets/v31/alden.svg',width:54,height:75,anchor:.94,filter:'saturate(.88) brightness(.94) contrast(1.02)'},
    rowan:{src:'assets/v31/rowan.svg',width:54,height:75,anchor:.94,filter:'saturate(.90) brightness(.96) contrast(1.02)'},
    mira:{src:'assets/v31/mira.svg',width:54,height:75,anchor:.94,filter:'saturate(.90) brightness(.96) contrast(1.02)'},
    tessa:{src:'assets/v31/tessa.svg',width:48,height:66,anchor:.94,filter:'saturate(.82) brightness(.93)'},
    orin:{src:'assets/v31/orin.svg',width:48,height:66,anchor:.94,filter:'saturate(.82) brightness(.93)'},
    maeve:{src:'assets/v31/maeve.svg',width:48,height:66,anchor:.94,filter:'saturate(.82) brightness(.93)'},
    perrin:{src:'assets/v31/perrin.svg',width:48,height:66,anchor:.94,filter:'saturate(.82) brightness(.93)'},
  };
  const serviceAssets = { forge:'alden', merchant:'rowan', alchemy:'mira' };
  const serviceOffsets = { forge:{x:43,y:2}, merchant:{x:43,y:3}, alchemy:{x:43,y:3} };
  const townAssets = { Tessa:'tessa', Orin:'orin', Maeve:'maeve', Perrin:'perrin' };

  const replacementKeys = Object.keys(defs);
  const proof = {
    characterExpanded,
    enabled:characterExpanded,
    ready:!characterExpanded,
    failed:false,
    failure:'',
    assets:{},
    playerDraws:0,
    enemyDraws:0,
    npcDraws:0,
    fallbackDraws:0,
    replacements:Object.fromEntries(replacementKeys.map(key => [key,0])),
    drawSites:{},
  };

  if (characterExpanded) {
    document.documentElement.dataset.briarGlenCharacterArt = 'loading';
    Promise.all(Object.entries(defs).map(([name,def]) => new Promise((resolve,reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        proof.assets[name] = {loaded:true,width:image.naturalWidth,height:image.naturalHeight,image,src:def.src};
        resolve();
      };
      image.onerror = () => reject(new Error(`Build 31 character sprite failed to load: ${def.src}`));
      image.src = `${def.src}?v=31r2`;
    }))).then(() => {
      proof.ready = true;
      document.documentElement.dataset.briarGlenCharacterArt = 'ready';
      document.documentElement.dataset.briarGlenCast = 'authored-living-cast';
    }).catch(error => {
      proof.failed = true;
      proof.failure = String(error?.message || error);
      proof.ready = false;
      proof.enabled = false;
      document.documentElement.dataset.briarGlenCharacterArt = 'failed';
      console.error(error);
    });
  } else {
    document.documentElement.dataset.briarGlenCharacterArt = 'historical-scope';
  }

  function baseEnabled() {
    try { return !!baseGetArtState().enabled; } catch (_) { return true; }
  }

  function drawSprite(name,p,w,h,anchor,flip=false,alpha=1,filter='none') {
    const record = proof.assets[name];
    if (!record?.loaded) { proof.fallbackDraws += 1; return false; }
    ctx.save();
    ctx.translate(p.x,p.y);
    if (flip) ctx.scale(-1,1);
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = filter || 'none';
    ctx.drawImage(record.image,-w/2,-h*anchor,w,h);
    ctx.restore();
    return true;
  }

  function suppressHistoricalPixels(draw) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-10000,-10000,1,1);
    ctx.clip();
    draw();
    ctx.restore();
  }

  const priorDrawPlayer = drawPlayer;
  drawPlayer = function build31LivingCastDrawPlayer() {
    if (!proof.enabled || !proof.ready || !baseEnabled()) {
      priorDrawPlayer();
      return;
    }
    suppressHistoricalPixels(() => priorDrawPlayer());
    const p = worldToScreen(player.x,player.y);
    const asset = player.weaponType === 'bow' ? 'player_bow' : player.weaponType === 'staff' ? 'player_staff' : 'player_sword';
    const def = defs[asset];
    const scale = camera.zoom;
    const w = def.width * scale, h = def.height * scale;
    const blink = player.invuln > 0 && Math.floor(player.invuln*18)%2===0;
    const attackNudge = player.attackAnim > 0 ? Math.min(3.8*camera.zoom, player.attackAnim*8*camera.zoom) : 0;
    const facing = player.facingX < -.05;
    const sp = {x:p.x + (facing ? -attackNudge : attackNudge), y:p.y};
    shadow(player.x,player.y,24,13,.29);
    if (!drawSprite(asset,sp,w,h,def.anchor,facing,blink?.58:1,def.filter)) return;
    proof.playerDraws += 1;
    proof.replacements[asset] += 1;
    proof.drawSites.player = {asset,world:{x:player.x,y:player.y},screen:{x:p.x,y:p.y},size:{w,h},draws:(proof.drawSites.player?.draws||0)+1};
  };

  const priorDrawEnemy = drawEnemy;
  drawEnemy = function build31LivingCastDrawEnemy(e) {
    priorDrawEnemy(e);
    if (!proof.enabled || !proof.ready || !baseEnabled() || e.dead || !['wolf','boar','boss'].includes(e.type)) return;
    const name = e.type;
    const record = proof.assets[name];
    if (!record?.loaded) { proof.fallbackDraws += 1; return; }
    const p = worldToScreen(e.x,e.y);
    const def = defs[name];
    const entityScale = name === 'boss' ? 1.04 : Math.max(.84,Math.min(1.08,e.scale||1));
    const scale = camera.zoom * entityScale;
    const w = def.width*scale, h=def.height*scale;
    if (p.x < -w || p.x > viewport.w + w || p.y < -h || p.y > viewport.h + h) return;
    const flip = e.facingX < -.05;
    const alpha = e.hurt > 0 ? .78 : 1;
    const filter = e.hurt > 0 ? `${def.filter} brightness(1.18) saturate(.72)` : def.filter;
    if (!drawSprite(name,p,w,h,def.anchor,flip,alpha,filter)) return;
    proof.enemyDraws += 1;
    proof.replacements[name] += 1;
    const key = `${e.type}:${Math.round(e.homeX ?? e.x)},${Math.round(e.homeY ?? e.y)}`;
    proof.drawSites[key] = {asset:name,world:{x:e.x,y:e.y},screen:{x:p.x,y:p.y},size:{w,h},draws:(proof.drawSites[key]?.draws||0)+1};
  };

  const priorDrawObject = drawObject;
  drawObject = function build31LivingCastDrawObject(o) {
    const serviceAsset = serviceAssets[o.type];
    const townAsset = o.type === 'npc' ? townAssets[o.name] : null;
    if (!proof.enabled || !proof.ready || !baseEnabled() || (!serviceAsset && !townAsset)) {
      return priorDrawObject(o);
    }

    if (townAsset) {
      const record = proof.assets[townAsset];
      if (!record?.loaded) return priorDrawObject(o);
      suppressHistoricalPixels(() => priorDrawObject(o));
      const p=worldToScreen(o.x,o.y), def=defs[townAsset], scale=camera.zoom;
      const visible=p.x>-100&&p.x<viewport.w+100&&p.y>-120&&p.y<viewport.h+100;
      if (!visible) return;
      shadow(o.x,o.y,15,8,.18);
      if (drawSprite(townAsset,p,def.width*scale,def.height*scale,def.anchor,o.facingX<-.05,.96,def.filter)) {
        proof.npcDraws += 1;
        proof.replacements[townAsset] += 1;
        proof.drawSites[`npc:${o.name}`]={asset:townAsset,world:{x:o.x,y:o.y},screen:{x:p.x,y:p.y},draws:(proof.drawSites[`npc:${o.name}`]?.draws||0)+1};
        if (dist(player,o)<115) labelAt(p.x,p.y-63*scale,o.name.toUpperCase());
      }
      return;
    }

    // Service structures remain exactly as authored by the historical world renderer;
    // the named service character is a presentation-only figure beside the existing interaction site.
    priorDrawObject(o);
    const p=worldToScreen(o.x,o.y), def=defs[serviceAsset], offset=serviceOffsets[o.type], scale=camera.zoom;
    const sp={x:p.x+offset.x*scale,y:p.y+offset.y*scale};
    const visible=sp.x>-100&&sp.x<viewport.w+100&&sp.y>-120&&sp.y<viewport.h+100;
    if (!visible) return;
    if (drawSprite(serviceAsset,sp,def.width*scale,def.height*scale,def.anchor,false,.97,def.filter)) {
      proof.npcDraws += 1;
      proof.replacements[serviceAsset] += 1;
      proof.drawSites[`service:${o.type}`]={asset:serviceAsset,world:{x:o.x,y:o.y},screen:{x:sp.x,y:sp.y},draws:(proof.drawSites[`service:${o.type}`]?.draws||0)+1};
    }
  };

  function state() {
    const base = baseGetArtState();
    const effective = !!(characterExpanded && proof.enabled && proof.ready && base.enabled);
    return {
      characterExpanded,
      productionDefault:true,
      requested:characterExpanded,
      enabled:effective,
      ready:!!(proof.ready && base.ready),
      failed:!!(proof.failed || base.failed),
      failure:[base.failure,proof.failure].filter(Boolean).join(' • '),
      mode:characterExpanded ? 'authored-living-cast' : 'build30-cast-fallback',
      baseArtMode:base.mode,
      loadedCharacterAssets:Object.fromEntries(Object.entries(proof.assets).map(([name,value]) => [name,{loaded:value.loaded,width:value.width,height:value.height,src:value.src}])),
      playerDraws:proof.playerDraws,
      enemyDraws:proof.enemyDraws,
      npcDraws:proof.npcDraws,
      fallbackDraws:proof.fallbackDraws,
      replacements:{...proof.replacements},
      drawSites:Object.fromEntries(Object.entries(proof.drawSites).map(([key,value]) => [key,{...value,world:value.world?{...value.world}:undefined,screen:value.screen?{...value.screen}:undefined,size:value.size?{...value.size}:undefined}])),
      baseline:base.baseline,
      current:base.current,
    };
  }

  debug.getCharacterArtState = state;
  debug.setCharacterArtEnabled = value => {
    proof.enabled = !!(characterExpanded && proof.ready && value);
    return !!(proof.enabled && baseEnabled());
  };
})();
