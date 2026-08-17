(() => {
  'use strict';

  // Build 30: authored Copper Hollow + Emberback Den foreground props.
  // Build 29 and all earlier authored presentation remain intact underneath this late wrapper.
  // Existing world objects/resources remain authoritative for coordinates, depth, interaction and gameplay.
  const params = new URLSearchParams(location.search);
  const rollbackRequested = params.get('canvasArt') === '1';
  const artScope = params.get('artScope') || '';
  const historicalScope = ['build25','build26','build27','build28','build29'].includes(artScope);
  const hollowDenExpanded = !rollbackRequested && !historicalScope;

  const debug = window.__BRIAR_GLENDebug;
  const baseGetState = debug?.getAuthoredArtState;
  const baseToggle = debug?.setAuthoredArtEnabled;
  if (!debug || typeof baseGetState !== 'function') {
    console.error('Build 30 Copper & Ember requires the verified authored-art runtime');
    return;
  }

  const defs = {
    hollow_rock: {
      src:'assets/v30/hollow-rock-authored.svg', width:122, height:92, anchor:.88,
      filter:'saturate(.86) brightness(.90) contrast(1.01)', shadow:[31,14,.19],
    },
    dead_tree: {
      src:'assets/v30/dead-tree-authored.svg', width:108, height:138, anchor:.96,
      filter:'saturate(.78) brightness(.88) contrast(1.02)', shadow:[25,12,.18],
    },
    copper_ore: {
      src:'assets/v30/copper-ore-authored.svg', width:84, height:65, anchor:.86,
      filter:'saturate(.92) brightness(.94) contrast(1.02)', shadow:[21,10,.16],
    },
    den_rock: {
      src:'assets/v30/den-rock-authored.svg', width:118, height:89, anchor:.89,
      filter:'saturate(.78) brightness(.78) contrast(1.06)', shadow:[30,14,.23],
    },
    ember_cluster: {
      src:'assets/v30/ember-cluster-authored.svg', width:68, height:57, anchor:.82,
      filter:'saturate(1.02) brightness(.92) contrast(1.05)', shadow:[16,8,.13],
    },
  };

  const objectAnchors = [
    { type:'deadTree', x:847, y:-144, asset:'dead_tree', id:'hollow-dead-tree' },
    { type:'rock', x:1204, y:-101, asset:'hollow_rock', id:'hollow-copper-rock' },
    { type:'denRock', x:1525, y:-156, asset:'den_rock', id:'den-threshold-rock' },
    { type:'ember', x:1700, y:-141, asset:'ember_cluster', id:'den-threshold-ember' },
    { type:'ember', x:1921, y:-247, asset:'ember_cluster', id:'den-boss-ember' },
    { type:'denRock', x:2020, y:128, asset:'den_rock', id:'den-rootway-rock' },
  ];
  const resourceAnchors = [
    { type:'ore', x:900, y:-140, asset:'copper_ore', id:'hollow-ore-west' },
    { type:'ore', x:1185, y:120, asset:'copper_ore', id:'hollow-ore-east' },
  ];

  function nearest(list, anchor, tolerance = 6) {
    const item = list
      .filter(value => value.type === anchor.type)
      .sort((a,b) => Math.hypot(a.x-anchor.x,a.y-anchor.y) - Math.hypot(b.x-anchor.x,b.y-anchor.y))[0];
    return item && Math.hypot(item.x-anchor.x,item.y-anchor.y) <= tolerance ? item : null;
  }

  const objectTargets = objectAnchors.map(anchor => {
    const item = nearest(worldObjects, anchor);
    return item ? { item, ...anchor, kind:'object' } : null;
  }).filter(Boolean);
  const resourceTargets = resourceAnchors.map(anchor => {
    const item = nearest(resources, anchor, 2);
    return item ? { item, ...anchor, kind:'resource' } : null;
  }).filter(Boolean);
  const targetByObject = new Map(objectTargets.map(entry => [entry.item, entry]));
  const targetByResource = new Map(resourceTargets.map(entry => [entry.item, entry]));

  const proof = {
    hollowDenExpanded,
    enabled:hollowDenExpanded,
    ready:!hollowDenExpanded,
    failed:false,
    failure:'',
    assets:{},
    draws:0,
    fallbackDraws:0,
    replacements:{ hollow_rock:0, dead_tree:0, copper_ore:0, den_rock:0, ember_cluster:0 },
    drawSites:{},
  };

  if (hollowDenExpanded) {
    document.documentElement.dataset.briarGlenCopperEmber = 'loading';
    Promise.all(Object.entries(defs).map(([name, def]) => new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        proof.assets[name] = { loaded:true, width:image.naturalWidth, height:image.naturalHeight, image, src:def.src };
        resolve();
      };
      image.onerror = () => reject(new Error(`Build 30 authored prop failed to load: ${def.src}`));
      image.src = `${def.src}?v=30`;
    })))
      .then(() => {
        proof.ready = true;
        document.documentElement.dataset.briarGlenCopperEmber = 'ready';
        document.documentElement.dataset.briarGlenArtRollout = 'authored-copper-ember';
      })
      .catch(error => {
        proof.failed = true;
        proof.failure = String(error?.message || error);
        proof.ready = false;
        proof.enabled = false;
        document.documentElement.dataset.briarGlenCopperEmber = 'failed';
        console.error(error);
      });
  } else {
    document.documentElement.dataset.briarGlenCopperEmber = 'historical-scope';
  }

  function visible(p, margin = 180) {
    return p.x > -margin && p.x < viewport.w + margin && p.y > -margin && p.y < viewport.h + margin;
  }

  function drawAuthored(entry, entity, sitePrefix) {
    const def = defs[entry.asset];
    const record = proof.assets[entry.asset];
    if (!record?.loaded) { proof.fallbackDraws += 1; return; }
    const p = worldToScreen(entity.x, entity.y);
    if (!visible(p)) return;

    const entityScale = Number.isFinite(entity.s) ? Math.max(.78, Math.min(1.16, .94 + (entity.s - 1) * .18)) : .96;
    const scale = camera.zoom * entityScale;
    const w = def.width * scale;
    const h = def.height * scale;

    if (entry.asset === 'ember_cluster') {
      const pulse = .08 + (Math.sin(performance.now()/310 + entity.x*.01) + 1) * .018;
      const g = ctx.createRadialGradient(p.x,p.y-h*.35,2,p.x,p.y-h*.35,36*scale);
      g.addColorStop(0,`rgba(244,111,58,${pulse+.08})`);
      g.addColorStop(1,'rgba(209,62,40,0)');
      ctx.save(); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y-h*.35,36*scale,0,TAU); ctx.fill(); ctx.restore();
    }

    shadow(entity.x, entity.y, def.shadow[0]*entityScale, def.shadow[1]*entityScale, def.shadow[2]);
    ctx.save();
    ctx.globalAlpha = entry.asset === 'ember_cluster' ? .97 : .98;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = def.filter;
    ctx.drawImage(record.image, p.x-w/2, p.y-h*def.anchor, w, h);
    ctx.restore();

    proof.draws += 1;
    proof.replacements[entry.asset] += 1;
    const siteKey = `${sitePrefix}:${entry.type}:${Math.round(entity.x)},${Math.round(entity.y)}`;
    proof.drawSites[siteKey] = {
      asset:entry.asset,
      variant:entry.id,
      kind:entry.kind,
      world:{x:entity.x,y:entity.y},
      screen:{x:p.x,y:p.y},
      size:{w,h},
      anchor:def.anchor,
      draws:(proof.drawSites[siteKey]?.draws || 0)+1,
    };
  }

  const priorDrawObject = drawObject;
  drawObject = function build30CopperEmberDrawObject(o) {
    priorDrawObject(o);
    if (!proof.enabled || !proof.ready) return;
    const entry = targetByObject.get(o);
    if (entry) drawAuthored(entry, o, 'object');
  };

  const priorDrawResource = drawResource;
  drawResource = function build30CopperEmberDrawResource(r) {
    priorDrawResource(r);
    if (!proof.enabled || !proof.ready || !r.active) return;
    const entry = targetByResource.get(r);
    if (entry) drawAuthored(entry, r, 'resource');
  };

  function targetRecord(entry, index) {
    return {
      kind:entry.kind,
      type:entry.type,
      x:entry.item.x,
      y:entry.item.y,
      depth:entry.item.x+entry.item.y,
      asset:entry.asset,
      anchor:entry.id,
      order:index,
    };
  }

  function state() {
    const base = baseGetState();
    const hollowDenTargets = hollowDenExpanded
      ? [...objectTargets, ...resourceTargets].map(targetRecord)
      : [];
    return {
      ...base,
      build29ScopeRequested:!rollbackRequested && artScope === 'build29',
      hollowDenExpanded,
      productionDefault:true,
      enabled:hollowDenExpanded ? !!(base.enabled && proof.enabled) : base.enabled,
      ready:!!(base.ready && proof.ready),
      failed:!!(base.failed || proof.failed),
      failure:[base.failure, proof.failure].filter(Boolean).join(' • '),
      mode:hollowDenExpanded ? 'authored-copper-ember' : base.mode,
      hollowDenObjectTargets:hollowDenExpanded ? objectTargets.map(targetRecord) : [],
      hollowOreTargets:hollowDenExpanded ? resourceTargets.map(targetRecord) : [],
      authoredEnvironmentTargets:hollowDenTargets,
      loadedHollowDenAssets:Object.fromEntries(Object.entries(proof.assets).map(([name,value]) => [name, {
        loaded:value.loaded,width:value.width,height:value.height,src:value.src,
      }])),
      hollowDenDraws:proof.draws,
      hollowDenFallbackDraws:proof.fallbackDraws,
      hollowDenReplacements:{...proof.replacements},
      drawSites:{...(base.drawSites || {}), ...Object.fromEntries(Object.entries(proof.drawSites).map(([key,site]) => [key, {
        asset:site.asset,variant:site.variant,kind:site.kind,
        world:{...site.world},screen:{...site.screen},size:{...site.size},anchor:site.anchor,draws:site.draws,
      }]))},
    };
  }

  function setEnabled(value) {
    const baseEnabled = typeof baseToggle === 'function' ? baseToggle(value) : !!value;
    proof.enabled = !!(hollowDenExpanded && proof.ready && value && baseEnabled);
    const snapshot = baseGetState();
    document.documentElement.dataset.briarGlenArtRollout = proof.enabled
      ? 'authored-copper-ember'
      : snapshot.mode || 'build23-canvas';
    return hollowDenExpanded ? !!(baseEnabled && proof.enabled) : !!baseEnabled;
  }

  debug.getAuthoredArtState = state;
  debug.getSpriteProofState = state;
  debug.setAuthoredArtEnabled = setEnabled;
  debug.setSpriteProofEnabled = setEnabled;
})();
