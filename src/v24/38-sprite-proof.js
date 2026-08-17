(() => {
  'use strict';

  // Build 24.1 proof: opt-in authored sprite integration for one Briar Glen hero cluster.
  // Disabled by default. No world entities, blockers, saves, combat, progression or UI are mutated.
  const requested = new URLSearchParams(location.search).get('spriteProof') === '1';
  const baseline = {
    objects: worldObjects.length,
    resources: resources.length,
    enemies: enemies.length,
  };
  const proof = {
    requested,
    enabled: requested,
    ready: !requested,
    failed: false,
    failure: '',
    mode: requested ? 'authored-hero-cluster' : 'build23-canvas',
    assets: {},
    draws: 0,
    fallbackDraws: 0,
    replacements: { cottage:0, tall_tree:0, pine_tree:0 },
    drawSites: {},
    baseline,
  };

  document.documentElement.dataset.spriteProof = requested ? 'loading' : 'off';

  // World-size values are intentionally conservative. The first working WebP proof showed that
  // source-art quality was correct but its visual mass overwhelmed the current Canvas world.
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

  const HERO_COTTAGE = { x:-575, y:-365 };
  const HERO_DEPTH = HERO_COTTAGE.x + HERO_COTTAGE.y;
  // Keep the authored trees beside/forward of the Warden House. A deep-background pine in the
  // earlier proof aligned with the roof ridge and read as if it were growing out of the cottage.
  const heroTrees = worldObjects
    .filter(o => o.type === 'tree' && Math.hypot(o.x - HERO_COTTAGE.x, o.y - HERO_COTTAGE.y) <= 300)
    .filter(o => (o.x + o.y) >= HERO_DEPTH - 130)
    .sort((a, b) => Math.hypot(a.x - HERO_COTTAGE.x, a.y - HERO_COTTAGE.y) - Math.hypot(b.x - HERO_COTTAGE.x, b.y - HERO_COTTAGE.y))
    .slice(0, 2);
  const heroTreeSet = new Set(heroTrees);
  const heroTreeAssets = new Map(heroTrees.map((tree, index) => [tree, index === 0 ? 'tall_tree' : 'pine_tree']));

  function inProofSlice(x, y) {
    return x >= -1000 && x <= 690 && !(x > -80 && y < -425);
  }

  function visible(p, margin = 180) {
    return p.x > -margin && p.x < viewport.w + margin && p.y > -margin && p.y < viewport.h + margin;
  }

  function isHeroCottage(o) {
    return o.type === 'cottage' && Math.hypot(o.x - HERO_COTTAGE.x, o.y - HERO_COTTAGE.y) < 12;
  }

  function isHeroTree(o) {
    return heroTreeSet.has(o);
  }

  function treeAsset(o) {
    return heroTreeAssets.get(o) || 'tall_tree';
  }

  function loadAsset(name, def) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        proof.assets[name] = { loaded:true, width:image.naturalWidth, height:image.naturalHeight, image, src:def.src };
        resolve();
      };
      image.onerror = () => reject(new Error(`Build 24.1 sprite failed to load: ${def.src}`));
      image.src = `${def.src}?v=24.1f`;
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
        console.error(error);
      });
  }

  const build23DrawObject = drawObject;
  drawObject = function build241SpriteProofDrawObject(o) {
    const selected = isHeroCottage(o) || isHeroTree(o);
    if (!proof.enabled || !proof.ready || !selected || !inProofSlice(o.x, o.y)) {
      return build23DrawObject(o);
    }

    const assetName = isHeroCottage(o) ? 'cottage' : treeAsset(o);
    const record = proof.assets[assetName];
    if (!record?.loaded) {
      proof.fallbackDraws += 1;
      return build23DrawObject(o);
    }

    const p = worldToScreen(o.x, o.y);
    if (!visible(p)) return;
    const def = defs[assetName];
    const treeScale = Math.max(.90, Math.min(1.02, .96 + ((o.s || 1) - 1) * .12));
    const scale = camera.zoom * (assetName === 'cottage' ? 1 : treeScale);
    const w = def.width * scale;
    const h = def.height * scale;

    shadow(o.x, o.y, def.shadow[0] * (assetName === 'cottage' ? 1 : treeScale), def.shadow[1] * (assetName === 'cottage' ? 1 : treeScale), def.shadow[2]);

    ctx.save();
    ctx.globalAlpha = .96;
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

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.getSpriteProofState = () => ({
      requested: proof.requested,
      enabled: proof.enabled,
      ready: proof.ready,
      failed: proof.failed,
      failure: proof.failure,
      mode: proof.mode,
      heroTreeTargets: heroTrees.map((tree, index) => ({
        x:tree.x, y:tree.y, depth:tree.x + tree.y, asset:heroTreeAssets.get(tree), order:index,
      })),
      loadedAssets: Object.fromEntries(Object.entries(proof.assets).map(([name, value]) => [name, { loaded:value.loaded, width:value.width, height:value.height, src:value.src }])),
      draws: proof.draws,
      fallbackDraws: proof.fallbackDraws,
      replacements: { ...proof.replacements },
      drawSites: Object.fromEntries(Object.entries(proof.drawSites).map(([key, site]) => [key, {
        asset:site.asset,
        world:{ ...site.world },
        screen:{ ...site.screen },
        size:{ ...site.size },
        anchor:site.anchor,
        draws:site.draws,
      }])),
      baseline: { ...proof.baseline },
      current: currentCounts(),
    });
    window.__BRIAR_GLENDebug.setSpriteProofEnabled = value => {
      proof.enabled = proof.requested && proof.ready && !!value;
      return proof.enabled;
    };
  }
})();
