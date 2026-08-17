(() => {
  'use strict';

  // Build 28: extend the approved authored tree language into Mosswater Fen.
  // Default: Build 27 Mooncap Canopy + four curated Fen trees at Old Warden Crossing / Drowned Warden corridor.
  // ?artScope=build27 restores the exact approved Build 27 Mooncap Canopy.
  // ?artScope=build26 restores the exact approved Build 26 Greenway.
  // ?artScope=build25 restores the exact approved Build 25 Warden cluster.
  // ?canvasArt=1 restores the prior Canvas renderer. Gameplay/world state is never mutated.
  const params = new URLSearchParams(location.search);
  const rollbackRequested = params.get('canvasArt') === '1';
  const artScope = params.get('artScope') || '';
  const build25ScopeRequested = !rollbackRequested && artScope === 'build25';
  const build26ScopeRequested = !rollbackRequested && artScope === 'build26';
  const build27ScopeRequested = !rollbackRequested && artScope === 'build27';
  const requested = !rollbackRequested;
  const expanded = requested && !build25ScopeRequested;
  const groveExpanded = requested && !build25ScopeRequested && !build26ScopeRequested;
  const fenExpanded = requested && !build25ScopeRequested && !build26ScopeRequested && !build27ScopeRequested;
  const baseline = {
    objects: worldObjects.length,
    resources: resources.length,
    enemies: enemies.length,
  };
  const proof = {
    requested,
    rollbackRequested,
    build25ScopeRequested,
    build26ScopeRequested,
    build27ScopeRequested,
    expanded,
    groveExpanded,
    fenExpanded,
    productionDefault: true,
    enabled: requested,
    ready: !requested,
    failed: false,
    failure: '',
    mode: rollbackRequested
      ? 'build23-canvas'
      : build25ScopeRequested
        ? 'authored-hero-cluster'
        : build26ScopeRequested
          ? 'authored-greenway'
          : build27ScopeRequested
            ? 'authored-mooncap-canopy'
            : 'authored-mosswater-shroud',
    assets: {},
    draws: 0,
    fallbackDraws: 0,
    replacements: { cottage:0, tall_tree:0, pine_tree:0 },
    drawSites: {},
    baseline,
  };

  document.documentElement.dataset.spriteProof = requested ? 'loading' : 'canvas-rollback';
  document.documentElement.dataset.briarGlenArtRollout = proof.mode;

  const defs = {
    cottage: {
      src:'assets/v24/cottage-authored.webp', width:160, height:160, anchor:.84,
      filter:'saturate(.72) brightness(.84) contrast(.96)', shadow:[48,23,.25],
    },
    tall_tree: {
      src:'assets/v24/tall-tree-authored.webp', width:112, height:112, anchor:.91,
      filter:'hue-rotate(38deg) saturate(.50) brightness(.74) contrast(.96)', shadow:[27,13,.20],
    },
    pine_tree: {
      src:'assets/v24/pine-tree-authored.webp', width:118, height:118, anchor:.92,
      filter:'hue-rotate(16deg) saturate(.60) brightness(.78) contrast(.96)', shadow:[27,13,.20],
    },
  };

  const WARDEN_COTTAGE = { x:-575, y:-365, id:'warden-house' };
  const WILLOW_COTTAGE = { x:-905, y:330, id:'willow-cottage' };
  const WARDEN_DEPTH = WARDEN_COTTAGE.x + WARDEN_COTTAGE.y;
  const WILLOW_DEPTH = WILLOW_COTTAGE.x + WILLOW_COTTAGE.y;

  const build25Trees = worldObjects
    .filter(o => o.type === 'tree' && Math.hypot(o.x - WARDEN_COTTAGE.x, o.y - WARDEN_COTTAGE.y) <= 300)
    .filter(o => (o.x + o.y) >= WARDEN_DEPTH - 130)
    .sort((a, b) => Math.hypot(a.x - WARDEN_COTTAGE.x, a.y - WARDEN_COTTAGE.y) - Math.hypot(b.x - WARDEN_COTTAGE.x, b.y - WARDEN_COTTAGE.y))
    .slice(0, 2);
  const build25TreeSet = new Set(build25Trees);

  function nearestTrees(anchor, count, excluded, maxRadius = Infinity, minDepth = -Infinity) {
    return worldObjects
      .filter(o => o.type === 'tree' && !excluded.has(o))
      .filter(o => Math.hypot(o.x - anchor.x, o.y - anchor.y) <= maxRadius)
      .filter(o => (o.x + o.y) >= minDepth)
      .sort((a, b) => Math.hypot(a.x - anchor.x, a.y - anchor.y) - Math.hypot(b.x - anchor.x, b.y - anchor.y))
      .slice(0, count);
  }

  const usedTrees = new Set(build25Trees);
  const willowTrees = nearestTrees(WILLOW_COTTAGE, 2, usedTrees, 390, WILLOW_DEPTH - 170);
  willowTrees.forEach(tree => usedTrees.add(tree));

  const meadowAnchors = [
    { x:70, y:-360, asset:'pine_tree', id:'meadow-west' },
    { x:420, y:-350, asset:'tall_tree', id:'meadow-east' },
  ];
  const meadowTrees = meadowAnchors.map(anchor => {
    const [tree] = nearestTrees(anchor, 1, usedTrees, 360);
    if (tree) usedTrees.add(tree);
    return tree ? { tree, ...anchor } : null;
  }).filter(Boolean);

  const greenwayTrees = [...build25Trees, ...willowTrees, ...meadowTrees.map(entry => entry.tree)];
  const greenwayTreeSet = new Set(greenwayTrees);

  const groveAnchors = [
    { x:130, y:-500, asset:'tall_tree', id:'grove-entry-west' },
    { x:230, y:-660, asset:'pine_tree', id:'grove-entry-deep' },
    { x:510, y:-930, asset:'tall_tree', id:'grove-ruin-west' },
    { x:730, y:-980, asset:'pine_tree', id:'grove-ruin-east' },
  ];
  const groveUsed = new Set(greenwayTrees);
  const groveTrees = groveAnchors.map(anchor => {
    const [tree] = nearestTrees(anchor, 1, groveUsed, 42);
    if (tree) groveUsed.add(tree);
    return tree ? { tree, ...anchor } : null;
  }).filter(Boolean);
  const groveTreeSet = new Set(groveTrees.map(entry => entry.tree));

  const fenAnchors = [
    { x:1010, y:-1330, asset:'tall_tree', id:'fen-crossing-west' },
    { x:1190, y:-1435, asset:'pine_tree', id:'fen-crossing-deep' },
    { x:1580, y:-1550, asset:'tall_tree', id:'fen-warden-north' },
    { x:1780, y:-1690, asset:'pine_tree', id:'fen-reliquary-east' },
  ];
  const fenTrees = fenAnchors.map(anchor => {
    const tree = worldObjects
      .filter(o => o.type === 'fenTree')
      .sort((a,b) => Math.hypot(a.x-anchor.x,a.y-anchor.y) - Math.hypot(b.x-anchor.x,b.y-anchor.y))[0];
    return tree && Math.hypot(tree.x-anchor.x,tree.y-anchor.y) <= 10 ? { tree, ...anchor } : null;
  }).filter(Boolean);
  const fenTreeSet = new Set(fenTrees.map(entry => entry.tree));

  const treeAssets = new Map();
  build25Trees.forEach((tree,index) => treeAssets.set(tree,index === 0 ? 'tall_tree' : 'pine_tree'));
  willowTrees.forEach((tree,index) => treeAssets.set(tree,index === 0 ? 'tall_tree' : 'pine_tree'));
  meadowTrees.forEach(entry => treeAssets.set(entry.tree,entry.asset));
  groveTrees.forEach(entry => treeAssets.set(entry.tree,entry.asset));
  fenTrees.forEach(entry => treeAssets.set(entry.tree,entry.asset));

  function inArtSlice(x, y) {
    if (fenExpanded && y <= -1180 && y >= -2100 && x >= 880 && x <= 2200) return true;
    if (groveExpanded && y <= -430 && y >= -1120 && x >= -80 && x <= 900) return true;
    return x >= -1000 && x <= 690 && !(x > -80 && y < -425);
  }

  function visible(p, margin = 190) {
    return p.x > -margin && p.x < viewport.w + margin && p.y > -margin && p.y < viewport.h + margin;
  }

  function cottageKind(o) {
    if (o.type !== 'cottage') return null;
    if (Math.hypot(o.x - WARDEN_COTTAGE.x, o.y - WARDEN_COTTAGE.y) < 12) return 'warden';
    if (expanded && Math.hypot(o.x - WILLOW_COTTAGE.x, o.y - WILLOW_COTTAGE.y) < 12) return 'willow';
    return null;
  }

  function isAuthoredTree(o) {
    if (fenExpanded && fenTreeSet.has(o)) return true;
    if (groveExpanded && groveTreeSet.has(o)) return true;
    return expanded ? greenwayTreeSet.has(o) : build25TreeSet.has(o);
  }

  function treeAsset(o) {
    return treeAssets.get(o) || 'tall_tree';
  }

  function loadAsset(name, def) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        proof.assets[name] = { loaded:true, width:image.naturalWidth, height:image.naturalHeight, image, src:def.src };
        resolve();
      };
      image.onerror = () => reject(new Error(`Build 28 authored sprite failed to load: ${def.src}`));
      image.src = `${def.src}?v=28`;
    });
  }

  if (requested) {
    Promise.all(Object.entries(defs).map(([name, def]) => loadAsset(name, def)))
      .then(() => {
        proof.ready = true;
        document.documentElement.dataset.spriteProof = 'ready';
      })
      .catch(error => {
        proof.failed = true;
        proof.failure = String(error?.message || error);
        proof.ready = false;
        proof.enabled = false;
        document.documentElement.dataset.spriteProof = 'failed';
        document.documentElement.dataset.briarGlenArtRollout = 'failed';
        console.error(error);
      });
  }

  const priorDrawObject = drawObject;
  drawObject = function build28AuthoredMosswaterDrawObject(o) {
    const cottage = cottageKind(o);
    const authoredTree = isAuthoredTree(o);
    const selected = !!cottage || authoredTree;
    if (!proof.enabled || !proof.ready || !selected || !inArtSlice(o.x, o.y)) {
      return priorDrawObject(o);
    }

    const assetName = cottage ? 'cottage' : treeAsset(o);
    const record = proof.assets[assetName];
    if (!record?.loaded) {
      proof.fallbackDraws += 1;
      return priorDrawObject(o);
    }

    const p = worldToScreen(o.x, o.y);
    if (!visible(p)) return;
    const def = defs[assetName];
    const isBuild25Tree = build25TreeSet.has(o);
    const isGroveTree = groveTreeSet.has(o);
    const isFenTree = fenTreeSet.has(o);
    const treeMultiplier = isBuild25Tree ? 1 : isGroveTree ? .94 : isFenTree ? .82 : .90;
    const treeScale = Math.max(.90, Math.min(1.02, .96 + ((o.s || 1) - 1) * .12)) * treeMultiplier;
    const cottageScale = cottage === 'willow' ? .89 : 1;
    const scale = camera.zoom * (cottage ? cottageScale : treeScale);
    const w = def.width * scale;
    const h = def.height * scale;
    let filter = def.filter;
    if (cottage === 'willow') {
      filter = 'sepia(.10) saturate(.65) brightness(.83) contrast(.95)';
    } else if (!cottage && isFenTree) {
      filter = assetName === 'tall_tree'
        ? 'hue-rotate(78deg) saturate(.32) brightness(.62) contrast(1.02)'
        : 'hue-rotate(62deg) saturate(.34) brightness(.64) contrast(1.02)';
    } else if (!cottage && isGroveTree) {
      filter = assetName === 'tall_tree'
        ? 'hue-rotate(52deg) saturate(.47) brightness(.70) contrast(.97)'
        : 'hue-rotate(32deg) saturate(.52) brightness(.72) contrast(.97)';
    } else if (!cottage && !isBuild25Tree) {
      filter = assetName === 'tall_tree'
        ? 'hue-rotate(34deg) saturate(.46) brightness(.72) contrast(.95)'
        : 'hue-rotate(12deg) saturate(.55) brightness(.76) contrast(.95)';
    }
    const shadowScale = cottage ? cottageScale : treeScale;
    const shadowAlpha = cottage === 'willow' ? .22 : isFenTree ? .14 : isGroveTree ? .18 : def.shadow[2];

    shadow(o.x, o.y, def.shadow[0] * shadowScale, def.shadow[1] * shadowScale, shadowAlpha);

    ctx.save();
    ctx.globalAlpha = isFenTree ? .91 : .96;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = filter;
    ctx.drawImage(record.image, p.x - w / 2, p.y - h * def.anchor, w, h);
    ctx.restore();

    proof.draws += 1;
    proof.replacements[assetName] += 1;
    const siteKey = `${o.type}:${Math.round(o.x)},${Math.round(o.y)}`;
    proof.drawSites[siteKey] = {
      asset:assetName,
      variant:cottage || (isBuild25Tree ? 'build25-tree' : isFenTree ? 'fen-shroud-tree' : isGroveTree ? 'grove-canopy-tree' : 'greenway-tree'),
      world:{ x:o.x, y:o.y },
      screen:{ x:p.x, y:p.y },
      size:{ w, h },
      anchor:def.anchor,
      draws:(proof.drawSites[siteKey]?.draws || 0) + 1,
    };
  };

  function currentCounts() {
    return {
      objects: worldObjects.length,
      resources: resources.length,
      enemies: enemies.length,
    };
  }

  function targetRecord(tree, index) {
    return {
      x:tree.x, y:tree.y, depth:tree.x + tree.y,
      asset:treeAssets.get(tree), order:index,
    };
  }

  function state() {
    const baseTargets = groveExpanded
      ? [...greenwayTrees, ...groveTrees.map(entry => entry.tree)]
      : expanded
        ? greenwayTrees
        : build25Trees;
    const currentTreeTargets = fenExpanded
      ? [...baseTargets, ...fenTrees.map(entry => entry.tree)]
      : baseTargets;
    return {
      requested: proof.requested,
      rollbackRequested: proof.rollbackRequested,
      build25ScopeRequested: proof.build25ScopeRequested,
      build26ScopeRequested: proof.build26ScopeRequested,
      build27ScopeRequested: proof.build27ScopeRequested,
      expanded: proof.expanded,
      groveExpanded: proof.groveExpanded,
      fenExpanded: proof.fenExpanded,
      productionDefault: proof.productionDefault,
      enabled: proof.enabled,
      ready: proof.ready,
      failed: proof.failed,
      failure: proof.failure,
      mode: proof.mode,
      cottageTargets: expanded ? [WARDEN_COTTAGE, WILLOW_COTTAGE].map(value => ({...value})) : [{...WARDEN_COTTAGE}],
      heroTreeTargets: build25Trees.map(targetRecord),
      greenwayTreeTargets: expanded ? greenwayTrees.map(targetRecord) : build25Trees.map(targetRecord),
      willowTreeTargets: expanded ? willowTrees.map(targetRecord) : [],
      meadowTreeTargets: expanded ? meadowTrees.map((entry,index) => ({...targetRecord(entry.tree,index), anchor:entry.id})) : [],
      groveTreeTargets: groveExpanded ? groveTrees.map((entry,index) => ({...targetRecord(entry.tree,index), anchor:entry.id})) : [],
      fenTreeTargets: fenExpanded ? fenTrees.map((entry,index) => ({...targetRecord(entry.tree,index), anchor:entry.id})) : [],
      authoredTreeTargets: currentTreeTargets.map(targetRecord),
      loadedAssets: Object.fromEntries(Object.entries(proof.assets).map(([name, value]) => [name, { loaded:value.loaded, width:value.width, height:value.height, src:value.src }])),
      draws: proof.draws,
      fallbackDraws: proof.fallbackDraws,
      replacements: { ...proof.replacements },
      drawSites: Object.fromEntries(Object.entries(proof.drawSites).map(([key, site]) => [key, {
        asset:site.asset,
        variant:site.variant,
        world:{ ...site.world },
        screen:{ ...site.screen },
        size:{ ...site.size },
        anchor:site.anchor,
        draws:site.draws,
      }])),
      baseline: { ...proof.baseline },
      current: currentCounts(),
    };
  }

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.getSpriteProofState = state;
    window.__BRIAR_GLENDebug.getAuthoredArtState = state;
    window.__BRIAR_GLENDebug.setSpriteProofEnabled = value => {
      proof.enabled = !proof.rollbackRequested && proof.ready && !!value;
      document.documentElement.dataset.briarGlenArtRollout = proof.enabled ? proof.mode : 'build23-canvas';
      return proof.enabled;
    };
    window.__BRIAR_GLENDebug.setAuthoredArtEnabled = window.__BRIAR_GLENDebug.setSpriteProofEnabled;
  }
})();
