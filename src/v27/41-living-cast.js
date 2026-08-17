(() => {
  'use strict';

  // Build 31: authored player + representative creature/boss presentation.
  // The verified Build 30 environment renderer remains intact underneath this late layer.
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
    player_sword:{src:'assets/v31/warden-sword.svg',width:62,height:78,anchor:.96,filter:'saturate(.88) brightness(.94) contrast(1.02)'},
    player_bow:{src:'assets/v31/warden-bow.svg',width:62,height:78,anchor:.96,filter:'saturate(.88) brightness(.94) contrast(1.02)'},
    player_staff:{src:'assets/v31/warden-staff.svg',width:62,height:78,anchor:.96,filter:'saturate(.9) brightness(.96) contrast(1.02)'},
    wolf:{src:'assets/v31/briar-wolf.svg',width:80,height:52,anchor:.90,filter:'saturate(.72) brightness(.88) contrast(1.05)'},
    boar:{src:'assets/v31/hollow-boar.svg',width:86,height:58,anchor:.89,filter:'saturate(.84) brightness(.91) contrast(1.04)'},
    boss:{src:'assets/v31/emberback.svg',width:116,height:82,anchor:.90,filter:'saturate(.9) brightness(.88) contrast(1.06)'},
  };

  const proof = {
    characterExpanded,
    enabled:characterExpanded,
    ready:!characterExpanded,
    failed:false,
    failure:'',
    assets:{},
    playerDraws:0,
    enemyDraws:0,
    fallbackDraws:0,
    replacements:{player_sword:0,player_bow:0,player_staff:0,wolf:0,boar:0,boss:0},
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
      image.src = `${def.src}?v=31`;
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

  function drawSprite(name,p,w,h,anchor,flip,alpha,filter) {
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

  const priorDrawPlayer = drawPlayer;
  drawPlayer = function build31LivingCastDrawPlayer() {
    priorDrawPlayer();
    if (!proof.enabled || !proof.ready || !baseEnabled()) return;
    const p = worldToScreen(player.x,player.y);
    const asset = player.weaponType === 'bow' ? 'player_bow' : player.weaponType === 'staff' ? 'player_staff' : 'player_sword';
    const def = defs[asset];
    const scale = camera.zoom * .98;
    const w = def.width * scale, h = def.height * scale;
    const blink = player.invuln > 0 && Math.floor(player.invuln*18)%2===0;
    const attackNudge = player.attackAnim > 0 ? Math.min(3.5*camera.zoom, player.attackAnim*8*camera.zoom) : 0;
    const facing = player.facingX < -.05;
    const sp = {x:p.x + (facing ? -attackNudge : attackNudge), y:p.y};
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
    const flip = e.facingX < -.05;
    const alpha = e.hurt > 0 ? .78 : 1;
    const filter = e.hurt > 0 ? `${def.filter} brightness(1.18) saturate(.72)` : def.filter;
    if (!drawSprite(name,p,w,h,def.anchor,flip,alpha,filter)) return;
    proof.enemyDraws += 1;
    proof.replacements[name] += 1;
    const key = `${e.type}:${Math.round(e.homeX ?? e.x)},${Math.round(e.homeY ?? e.y)}`;
    proof.drawSites[key] = {asset:name,world:{x:e.x,y:e.y},screen:{x:p.x,y:p.y},size:{w,h},draws:(proof.drawSites[key]?.draws||0)+1};
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