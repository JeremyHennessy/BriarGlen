(() => {
  'use strict';

  // Build 29: additive authored-tree presentation for Stonepine Reach.
  // The verified Build 28 renderer remains intact underneath this wrapper.
  // Existing Stonepine world objects remain authoritative for position, depth and gameplay.
  const params = new URLSearchParams(location.search);
  const rollbackRequested = params.get('canvasArt') === '1';
  const artScope = params.get('artScope') || '';
  const historicalScope = ['build25','build26','build27','build28'].includes(artScope);
  const stonepineExpanded = !rollbackRequested && !historicalScope;

  const debug = window.__BRIAR_GLENDebug;
  const baseGetState = debug?.getAuthoredArtState;
  const baseToggle = debug?.setAuthoredArtEnabled;
  if (!debug || typeof baseGetState !== 'function') {
    console.error('Build 29 Stonepine Timberline requires the verified authored-art runtime');
    return;
  }

  const defs = {
    tall_tree: {
      src:'assets/v24/tall-tree-authored.webp', width:112, height:112, anchor:.91,
      filter:'hue-rotate(4deg) saturate(.48) brightness(.78) contrast(1.02) sepia(.12)',
      shadow:[26,12,.16],
    },
    pine_tree: {
      src:'assets/v24/pine-tree-authored.webp', width:118, height:118, anchor:.92,
      filter:'hue-rotate(-8deg) saturate(.54) brightness(.82) contrast(1.02) sepia(.10)',
      shadow:[27,13,.17],
    },
  };

  const anchors = [
    { x:2360, y:-1260, asset:'pine_tree', id:'stonepine-pass-north' },
    { x:2780, y:-1540, asset:'pine_tree', id:'stonepine-camp-east' },
    { x:3040, y:-1490, asset:'tall_tree', id:'stonepine-quarry-west' },
    { x:3320, y:-1600, asset:'pine_tree', id:'stonepine-quarry-east' },
  ];

  const targets = anchors.map(anchor => {
    const tree = worldObjects.find(o => o.type === 'stonepineTree' && Math.hypot(o.x-anchor.x,o.y-anchor.y) <= 2);
    return tree ? { tree, ...anchor } : null;
  }).filter(Boolean);
  const targetSet = new Set(targets.map(entry => entry.tree));
  const assetFor = new Map(targets.map(entry => [entry.tree, entry.asset]));

  const proof = {
    stonepineExpanded,
    enabled: stonepineExpanded,
    ready: !stonepineExpanded,
    failed: false,
    failure: '',
    assets: {},
    draws: 0,
    fallbackDraws: 0,
    replacements: { tall_tree:0, pine_tree:0 },
    drawSites: {},
  };

  if (stonepineExpanded) {
    document.documentElement.dataset.briarGlenStonepineArt = 'loading';
    Promise.all(Object.entries(defs).map(([name, def]) => new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        proof.assets[name] = { loaded:true, width:image.naturalWidth, height:image.naturalHeight, image, src:def.src };
        resolve();
      };
      image.onerror = () => reject(new Error(`Build 29 authored sprite failed to load: ${def.src}`));
      image.src = `${def.src}?v=29`;
    })))
      .then(() => {
        proof.ready = true;
        document.documentElement.dataset.briarGlenStonepineArt = 'ready';
        document.documentElement.dataset.briarGlenArtRollout = 'authored-stonepine-timberline';
      })
      .catch(error => {
        proof.failed = true;
        proof.failure = String(error?.message || error);
        proof.ready = false;
        proof.enabled = false;
        document.documentElement.dataset.briarGlenStonepineArt = 'failed';
        console.error(error);
      });
  } else {
    document.documentElement.dataset.briarGlenStonepineArt = 'historical-scope';
  }

  function visible(p, margin = 190) {
    return p.x > -margin && p.x < viewport.w + margin && p.y > -margin && p.y < viewport.h + margin;
  }

  const priorDrawObject = drawObject;
  drawObject = function build29StonepineTimberlineDrawObject(o) {
    if (!proof.enabled || !proof.ready || !targetSet.has(o)) return priorDrawObject(o);

    const assetName = assetFor.get(o) || 'pine_tree';
    const record = proof.assets[assetName];
    if (!record?.loaded) {
      proof.fallbackDraws += 1;
      return priorDrawObject(o);
    }

    const p = worldToScreen(o.x, o.y);
    if (!visible(p)) return;
    const def = defs[assetName];
    const baseScale = Math.max(.84, Math.min(1.04, .92 + ((o.s || 1) - 1) * .16));
    const treeScale = baseScale * .88;
    const scale = camera.zoom * treeScale;
    const w = def.width * scale;
    const h = def.height * scale;

    shadow(o.x, o.y, def.shadow[0] * treeScale, def.shadow[1] * treeScale, def.shadow[2]);
    ctx.save();
    ctx.globalAlpha = .95;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = def.filter;
    ctx.drawImage(record.image, p.x - w / 2, p.y - h * def.anchor, w, h);
    ctx.restore();

    proof.draws += 1;
    proof.replacements[assetName] += 1;
    const siteKey = `${o.type}:${Math.round(o.x)},${Math.round(o.y)}`;
    proof.drawSites[siteKey] = {
      asset:assetName,
      variant:'stonepine-timberline-tree',
      world:{ x:o.x, y:o.y },
      screen:{ x:p.x, y:p.y },
      size:{ w, h },
      anchor:def.anchor,
      draws:(proof.drawSites[siteKey]?.draws || 0) + 1,
    };
  };

  function targetRecord(entry, index) {
    return {
      x:entry.tree.x,
      y:entry.tree.y,
      depth:entry.tree.x + entry.tree.y,
      asset:entry.asset,
      anchor:entry.id,
      order:index,
    };
  }

  function state() {
    const base = baseGetState();
    const stonepineTargets = stonepineExpanded ? targets.map(targetRecord) : [];
    const baseTargets = Array.isArray(base.authoredTreeTargets) ? base.authoredTreeTargets : [];
    const replacements = { ...(base.replacements || {}) };
    replacements.tall_tree = (replacements.tall_tree || 0) + proof.replacements.tall_tree;
    replacements.pine_tree = (replacements.pine_tree || 0) + proof.replacements.pine_tree;
    return {
      ...base,
      build28ScopeRequested: !rollbackRequested && artScope === 'build28',
      stonepineExpanded,
      productionDefault:true,
      enabled: stonepineExpanded ? !!(base.enabled && proof.enabled) : base.enabled,
      ready: !!(base.ready && proof.ready),
      failed: !!(base.failed || proof.failed),
      failure: [base.failure, proof.failure].filter(Boolean).join(' • '),
      mode: stonepineExpanded ? 'authored-stonepine-timberline' : base.mode,
      stonepineTreeTargets: stonepineTargets,
      authoredTreeTargets: stonepineExpanded ? [...baseTargets, ...stonepineTargets] : baseTargets,
      loadedStonepineAssets: Object.fromEntries(Object.entries(proof.assets).map(([name,value]) => [name, {
        loaded:value.loaded, width:value.width, height:value.height, src:value.src,
      }])),
      stonepineDraws: proof.draws,
      stonepineFallbackDraws: proof.fallbackDraws,
      replacements,
      drawSites: { ...(base.drawSites || {}), ...Object.fromEntries(Object.entries(proof.drawSites).map(([key,site]) => [key, {
        asset:site.asset,
        variant:site.variant,
        world:{ ...site.world },
        screen:{ ...site.screen },
        size:{ ...site.size },
        anchor:site.anchor,
        draws:site.draws,
      }])) },
    };
  }

  function setEnabled(value) {
    const baseEnabled = typeof baseToggle === 'function' ? baseToggle(value) : !!value;
    proof.enabled = !!(stonepineExpanded && proof.ready && value && baseEnabled);
    const snapshot = baseGetState();
    document.documentElement.dataset.briarGlenArtRollout = proof.enabled
      ? 'authored-stonepine-timberline'
      : snapshot.mode || 'build23-canvas';
    return stonepineExpanded ? !!(baseEnabled && proof.enabled) : !!baseEnabled;
  }

  debug.getAuthoredArtState = state;
  debug.getSpriteProofState = state;
  debug.setAuthoredArtEnabled = setEnabled;
  debug.setSpriteProofEnabled = setEnabled;
})();
