(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const historicalScope = Boolean(params.get('artScope'));
  const rollbackRequested = params.get('canvasArt') === '1';
  const explicitlyDisabled = params.get('generatedArt') === '0';
  const requested = !historicalScope && !rollbackRequested && !explicitlyDisabled;
  const pack = window.__BRIAR_GLEN_GENERATED_ART;
  const debug = window.__BRIAR_GLENDebug;

  const proof = {
    version: pack?.version || 'build41-generated-art-v1',
    requested,
    enabled: requested,
    ready: !requested,
    failed: false,
    failure: '',
    atlas: { loaded: false, width: 0, height: 0 },
    baseline: {
      objects: worldObjects.length,
      resources: resources.length,
      enemies: enemies.length,
    },
    draws: 0,
    objectDraws: 0,
    resourceDraws: 0,
    enemyDraws: 0,
    npcDraws: 0,
    uiIcons: 0,
    replacements: {},
    drawSites: {},
  };

  document.documentElement.dataset.briarGlenGeneratedArt = requested ? 'loading' : 'inactive';

  if (!pack?.atlas || !pack?.sprites) {
    proof.failed = true;
    proof.failure = 'Generated art data pack missing';
    proof.enabled = false;
    document.documentElement.dataset.briarGlenGeneratedArt = 'failed';
    console.error(proof.failure);
    return;
  }

  const atlas = new Image();
  atlas.decoding = 'async';
  const iconCache = new Map();
  const siteIds = new WeakMap();
  let nextSiteId = 1;

  function frame(name) {
    return pack.sprites[name] || null;
  }

  function isEnabledFast() {
    return Boolean(proof.enabled && proof.ready && !proof.failed);
  }

  function stableSiteKey(kind, name, entity) {
    if (!entity || !Number.isFinite(entity.x) || !Number.isFinite(entity.y)) return null;
    let id = siteIds.get(entity);
    if (!id) {
      id = nextSiteId++;
      siteIds.set(entity, id);
    }
    return `${kind}:${entity.type || name}:${id}`;
  }

  // Diagnostics are intentionally bounded by entity identity. The previous coordinate-based key
  // created a new object every time a moving NPC crossed a rounded world coordinate, causing the
  // debug map (and every deep state snapshot) to grow for the lifetime of the session.
  function record(kind, name, entity, screen, width, height) {
    proof.draws += 1;
    if (kind === 'object') proof.objectDraws += 1;
    else if (kind === 'resource') proof.resourceDraws += 1;
    else if (kind === 'enemy') proof.enemyDraws += 1;
    else if (kind === 'npc') proof.npcDraws += 1;
    proof.replacements[name] = (proof.replacements[name] || 0) + 1;

    const key = stableSiteKey(kind, name, entity);
    if (!key) return;
    let site = proof.drawSites[key];
    if (!site) {
      site = proof.drawSites[key] = {
        asset: name,
        world: { x: entity.x, y: entity.y },
        screen: { x: screen.x, y: screen.y },
        size: { width, height },
        draws: 0,
      };
    } else {
      site.asset = name;
      site.world.x = entity.x;
      site.world.y = entity.y;
      site.screen.x = screen.x;
      site.screen.y = screen.y;
      site.size.width = width;
      site.size.height = height;
    }
    site.draws += 1;
  }

  function visible(p, margin = 220) {
    return p.x > -margin && p.x < viewport.w + margin && p.y > -margin && p.y < viewport.h + margin;
  }

  function sprite(name, entity, options = {}) {
    const f = frame(name);
    if (!f || !isEnabledFast()) return false;
    const p = worldToScreen(entity.x, entity.y);
    if (!visible(p, options.margin || 240)) return false;
    const objectScale = Number.isFinite(entity.s)
      ? Math.max(.70, Math.min(1.35, .98 + (entity.s - 1) * .22))
      : 1;
    const scale = camera.zoom * objectScale * (options.scale || 1);
    const width = (options.width || f.width) * scale;
    const height = (options.height || f.height) * scale;
    const anchor = Number.isFinite(options.anchor) ? options.anchor : f.anchor;
    const offsetX = (options.offsetX || 0) * camera.zoom;
    const offsetY = (options.offsetY || 0) * camera.zoom;

    ctx.save();
    ctx.globalAlpha = Number.isFinite(options.alpha) ? options.alpha : 1;
    if (options.filter) ctx.filter = options.filter;
    if (options.flipX) {
      ctx.translate(p.x + offsetX, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(
        atlas, f.sx, f.sy, f.sw, f.sh,
        -width / 2, p.y + offsetY - height * anchor, width, height
      );
    } else {
      ctx.drawImage(
        atlas, f.sx, f.sy, f.sw, f.sh,
        p.x + offsetX - width / 2, p.y + offsetY - height * anchor, width, height
      );
    }
    ctx.restore();
    record(options.kind || 'object', name, entity, p, width, height);
    return true;
  }

  function treeAsset(o) {
    const seed = Math.abs(Math.round(o.x * 7 + o.y * 11));
    return seed % 3 === 0 ? 'tree_pine' : 'tree_deciduous';
  }

  function objectAsset(o) {
    switch (o.type) {
      case 'cottage': return { name: 'cottage' };
      case 'tavern': return { name: 'tavern', scale: 1.02 };
      case 'forge': return { name: 'forge', scale: 1.02 };
      case 'alchemy': return { name: 'alchemy' };
      case 'merchant': return { name: 'market' };
      case 'well': return { name: 'well' };
      case 'tree': return { name: treeAsset(o) };
      case 'bush': return { name: 'bush' };
      case 'rock': return { name: 'rock' };
      case 'denRock': return { name: 'rock', filter: 'saturate(.62) brightness(.72) contrast(1.08)' };
      case 'quarryRock': return { name: 'rock', filter: 'saturate(.72) brightness(.86) contrast(1.05)' };
      case 'deadTree': return { name: 'stump', scale: .9 };
      case 'ember': return { name: 'campfire', scale: .52, alpha: .9 };
      case 'lamp': return { name: 'lamp', scale: .82 };
      case 'fence': return { name: 'fence', scale: .9 };
      case 'garden': return { name: 'flower_clump', scale: 1.05 };
      case 'board':
      case 'groveSign':
      case 'fenSign':
      case 'stonepineSign': return { name: 'signpost', scale: .85 };
      case 'ruin':
      case 'fenRuin':
      case 'stonepineRuin': return { name: 'rock', scale: .72, filter: 'saturate(.58) brightness(.82)' };
      case 'fenTree': return { name: 'tree_deciduous', scale: .86, filter: 'hue-rotate(42deg) saturate(.55) brightness(.72)' };
      case 'stonepineTree': return { name: 'tree_pine', scale: .93, filter: 'saturate(.72) brightness(.82)' };
      // Dynamic stateful visuals deliberately remain on the verified Canvas renderer:
      // shortcut, fenGate, stonepineGate, groveCache, fenCache, stonepineCache,
      // fenPool, stonepineCamp and banner.
      default: return null;
    }
  }

  function npcAsset(o) {
    if (o.type !== 'npc') return null;
    if (o.name === 'Orin') return 'alchemist_npc';
    if (o.name === 'Perrin') return 'smith_npc';
    if (o.name === 'Maeve') return 'merchant_npc';
    return 'villager';
  }

  function resourceAsset(r) {
    switch (r.type) {
      case 'herb': return { name: 'herb_clump', scale: .72 };
      case 'mooncap': return { name: 'mooncap_clump', scale: .72 };
      case 'ore': return { name: 'copper_ore', scale: .82 };
      case 'iron': return { name: 'iron_ore', scale: .82 };
      case 'mossglass': return { name: 'iron_ore', scale: .65, filter: 'hue-rotate(95deg) saturate(.82) brightness(1.08)' };
      case 'resin': return { name: 'log_pile', scale: .48, filter: 'saturate(.9) brightness(.92)' };
      default: return null;
    }
  }

  function enemyAsset(e) {
    switch (e.type) {
      case 'wolf': return { name: 'wolf_enemy', scale: .92 };
      case 'boar': return { name: 'emberback_boss', scale: .70, filter: 'saturate(.58) brightness(.78) contrast(.96)' };
      case 'boss': return { name: 'emberback_boss', scale: 1.05 };
      case 'grovekeeper': return { name: 'grovekeeper', scale: 1.0 };
      case 'mireling': return { name: 'slime_enemy', scale: .8, filter: 'hue-rotate(35deg) saturate(.72) brightness(.82)' };
      case 'bogstalker': return { name: 'wolf_enemy', scale: 1.0, filter: 'hue-rotate(36deg) saturate(.48) brightness(.74)' };
      case 'fenwarden': return { name: 'grovekeeper', scale: 1.15, filter: 'hue-rotate(42deg) saturate(.42) brightness(.68)' };
      case 'ridgehorn': return { name: 'emberback_boss', scale: .74, filter: 'hue-rotate(18deg) saturate(.30) brightness(.76) contrast(.98)' };
      case 'quarrywisp': return { name: 'slime_enemy', scale: .72, filter: 'hue-rotate(165deg) saturate(.35) brightness(1.12)' };
      case 'quarrysentinel': return { name: 'grovekeeper', scale: 1.18, filter: 'hue-rotate(20deg) saturate(.22) brightness(.70) contrast(1.06)' };
      default: return null;
    }
  }

  function drawEnemyStatus(e) {
    const bossLike = ['boss','fenwarden','quarrysentinel'].includes(e.type);
    if (e.hp >= e.maxHp && !bossLike) return;
    const p = worldToScreen(e.x, e.y);
    const width = (bossLike ? 112 : 58) * camera.zoom;
    const y = p.y - (bossLike ? 96 : 62) * camera.zoom;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    roundRect(p.x - width / 2, y, width, 7 * camera.zoom, 4 * camera.zoom);
    ctx.fill();
    const color = e.type === 'boss' ? '#b9543d' : e.type === 'fenwarden' ? '#6c9d90' : e.type === 'quarrysentinel' ? '#9b714b' : '#b86a50';
    ctx.fillStyle = color;
    roundRect(p.x - width / 2, y, width * (e.hp / e.maxHp), 7 * camera.zoom, 4 * camera.zoom);
    ctx.fill();
    const label = e.type === 'boss' ? 'EMBERBACK' : e.type === 'fenwarden' ? 'DROWNED WARDEN' : e.type === 'quarrysentinel' ? 'QUARRY SENTINEL' : '';
    if (label) labelAt(p.x, y - 9 * camera.zoom, label);
  }

  const priorDrawObject = drawObject;
  drawObject = function build41GeneratedArtObject(o) {
    if (!isEnabledFast()) return priorDrawObject(o);

    const npc = npcAsset(o);
    if (npc) {
      const drawn = sprite(npc, o, {
        kind: 'npc',
        scale: .72,
        flipX: Number(o.facingX || 1) < 0,
        offsetY: 3,
      });
      if (drawn) return;
      return priorDrawObject(o);
    }

    const spec = objectAsset(o);
    if (!spec) return priorDrawObject(o);
    const drawn = sprite(spec.name, o, { kind: 'object', ...spec });
    if (!drawn) return priorDrawObject(o);

    const p = worldToScreen(o.x,o.y);
    if (o.type === 'tavern') labelAt(p.x, p.y - 112*camera.zoom, 'THE HEARTH & BRIAR');
    else if (o.type === 'forge') labelAt(p.x, p.y - 102*camera.zoom, 'ALDEN • SMITH');
    else if (o.type === 'alchemy') labelAt(p.x, p.y - 105*camera.zoom, 'MIRA • ALCHEMY');
    else if (o.type === 'merchant') labelAt(p.x, p.y - 88*camera.zoom, 'ROWAN • TRADER');
  };

  const priorDrawResource = drawResource;
  drawResource = function build41GeneratedArtResource(r) {
    if (!isEnabledFast() || !r.active) return priorDrawResource(r);
    const spec = resourceAsset(r);
    if (!spec) return priorDrawResource(r);
    if (!sprite(spec.name, r, { kind: 'resource', ...spec })) return priorDrawResource(r);
  };

  const priorDrawEnemy = drawEnemy;
  drawEnemy = function build41GeneratedArtEnemy(e) {
    if (!isEnabledFast() || e.dead) return priorDrawEnemy(e);
    const spec = enemyAsset(e);
    if (!spec) return priorDrawEnemy(e);

    const p = worldToScreen(e.x,e.y);
    const z = camera.zoom * (e.scale || 1);
    // Preserve verified attack tells. Stonepine has a bespoke telegraph; all other threats
    // continue using the base telegraph state machine.
    if (['ridgehorn','quarrywisp','quarrysentinel'].includes(e.type) && typeof drawStoneTelegraph === 'function') {
      drawStoneTelegraph(e, p, z);
    } else if (typeof drawEnemyTelegraph === 'function') {
      drawEnemyTelegraph(e, p);
    }

    const drawn = sprite(spec.name, e, {
      kind: 'enemy',
      ...spec,
      flipX: Number(e.facingX || 1) < 0,
      offsetY: 4,
      alpha: e.hurt > 0 ? .72 : 1,
    });
    if (!drawn) return priorDrawEnemy(e);
    drawEnemyStatus(e);
  };

  function spriteDataUrl(name, size = 56) {
    const key = `${name}:${size}`;
    if (iconCache.has(key)) return iconCache.get(key);
    const f = frame(name);
    if (!f || !proof.ready) return '';
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    const scale = Math.min(size / f.sw, size / f.sh) * .9;
    const w = f.sw * scale;
    const h = f.sh * scale;
    c.drawImage(atlas, f.sx, f.sy, f.sw, f.sh, (size-w)/2, (size-h)/2, w, h);
    const url = canvas.toDataURL('image/png');
    iconCache.set(key, url);
    return url;
  }

  function applyIcon(element, name, size = 38) {
    if (!element || !frame(name)) return;
    const url = spriteDataUrl(name, size * 2);
    if (!url) return;
    element.textContent = '';
    element.style.backgroundImage = `url("${url}")`;
    element.style.backgroundPosition = 'center';
    element.style.backgroundRepeat = 'no-repeat';
    element.style.backgroundSize = 'contain';
    element.style.display = 'inline-block';
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
    element.style.flex = '0 0 auto';
    proof.uiIcons += 1;
  }

  function applyUiArt() {
    const panelMap = {
      'panel-herb-count': 'icon_herb',
      'panel-mooncap-count': 'icon_mooncap',
      'panel-ore-count': 'icon_copper',
      'panel-iron-count': 'icon_iron',
      'panel-hide-count': 'icon_hide',
      'panel-tonic-count': 'icon_tonic',
      'panel-oil-count': 'icon_oil',
    };
    for (const [id, name] of Object.entries(panelMap)) {
      const count = document.getElementById(id);
      applyIcon(count?.closest('.inventory-item')?.querySelector('.item-icon'), name, 38);
    }

    applyIcon(document.querySelector('.inventory-strip .item-dot.herb'), 'icon_herb', 22);
    applyIcon(document.querySelector('.inventory-strip .item-dot.ore'), 'icon_copper', 22);

    const craftNames = ['icon_pickaxe','icon_sword','icon_bow','icon_staff','icon_oil'];
    document.querySelectorAll('.craft-item .craft-icon').forEach((el, i) => applyIcon(el, craftNames[i], 44));

    const tradeNames = ['icon_shield','icon_staff','icon_tonic','icon_hide'];
    document.querySelectorAll('.trade-item .trade-icon').forEach((el, i) => applyIcon(el, tradeNames[i], 44));

    const doll = document.querySelector('.satchel34-body');
    if (doll) {
      const url = spriteDataUrl('warden', 256);
      doll.style.backgroundImage = `url("${url}")`;
      doll.style.backgroundSize = 'contain';
      doll.style.backgroundRepeat = 'no-repeat';
      doll.style.backgroundPosition = 'center bottom';
      doll.style.minHeight = '190px';
      doll.dataset.generatedArt = 'warden';
      proof.uiIcons += 1;
    }
  }

  function setEnabled(value) {
    proof.enabled = Boolean(value && requested && proof.ready && !proof.failed);
    document.documentElement.dataset.briarGlenGeneratedArt = proof.enabled ? 'ready' : (proof.failed ? 'failed' : 'disabled');
    return proof.enabled;
  }

  function state() {
    return {
      version: proof.version,
      requested: proof.requested,
      enabled: proof.enabled,
      ready: proof.ready,
      failed: proof.failed,
      failure: proof.failure,
      atlas: { ...proof.atlas },
      baseline: { ...proof.baseline },
      entityCounts: {
        objects: worldObjects.length,
        resources: resources.length,
        enemies: enemies.length,
      },
      draws: proof.draws,
      objectDraws: proof.objectDraws,
      resourceDraws: proof.resourceDraws,
      enemyDraws: proof.enemyDraws,
      npcDraws: proof.npcDraws,
      uiIcons: proof.uiIcons,
      replacements: { ...proof.replacements },
      drawSiteCount: Object.keys(proof.drawSites).length,
      drawSites: Object.fromEntries(Object.entries(proof.drawSites).map(([key,value]) => [key, {
        asset: value.asset,
        world: { ...value.world },
        screen: { ...value.screen },
        size: { ...value.size },
        draws: value.draws,
      }])),
    };
  }

  if (window.__BRIAR_GLEN_RUNTIME?.registerHook) {
    window.__BRIAR_GLEN_RUNTIME.registerHook('beforeDraw','build45-generated-art-smoothing',()=>{
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
    },2020);
  }

  if (debug) {
    debug.getGeneratedArtState = state;
    debug.isGeneratedArtEnabled = isEnabledFast;
    debug.setGeneratedArtEnabled = setEnabled;
  }

  if (requested) {
    atlas.onload = () => {
      proof.ready = true;
      proof.atlas = { loaded: true, width: atlas.naturalWidth, height: atlas.naturalHeight };
      document.documentElement.dataset.briarGlenGeneratedArt = 'ready';
      applyUiArt();
    };
    atlas.onerror = () => {
      proof.failed = true;
      proof.failure = 'Generated art atlas failed to load';
      proof.enabled = false;
      proof.ready = false;
      document.documentElement.dataset.briarGlenGeneratedArt = 'failed';
      console.error(proof.failure);
    };
    atlas.src = pack.atlas;
  }
})();