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

  const defs = {
    cottage: {
      src:'assets/v24/cottage-authored.webp', width:210, height:210, anchor:.84,
      filter:'saturate(.82) brightness(.88) contrast(.96)', shadow:[64,31,.30],
    },
    tall_tree: {
      src:'assets/v24/tall-tree-authored.webp', width:174, height:174, anchor:.91,
      filter:'hue-rotate(44deg) saturate(.58) brightness(.78) contrast(.94)', shadow:[36,18,.25],
    },
    pine_tree: {
      src:'assets/v24/pine-tree-authored.webp', width:178, height:178, anchor:.92,
      filter:'saturate(.72) brightness(.82) contrast(.96)', shadow:[34,17,.24],
    },
  };

  const HERO_COTTAGE = { x:-575, y:-365 };
  const HERO_TREE_RADIUS = 260;

  function inProofSlice(x, y) {
    return x >= -1000 && x <= 690 && !(x > -80 && y < -425);
  }

  function visible(p, margin = 210) {
    return p.x > -margin && p.x < viewport.w + margin && p.y > -margin && p.y < viewport.h + margin;
  }

  function isHeroCottage(o) {
    return o.type === 'cottage' && Math.hypot(o.x - HERO_COTTAGE.x, o.y - HERO_COTTAGE.y) < 12;
  }

  function isHeroTree(o) {
    return o.type === 'tree' && Math.hypot(o.x - HERO_COTTAGE.x, o.y - HERO_COTTAGE.y) < HERO_TREE_RADIUS;
  }

  function treeAsset(o) {
    return o.x < -600 ? 'pine_tree' : 'tall_tree';
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
      image.src = `${def.src}?v=24.1d`;
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
    const scale = (o.s || 1) * camera.zoom;
    const w = def.width * scale;
    const h = def.height * scale;

    shadow(o.x, o.y, def.shadow[0] * (o.s || 1), def.shadow[1] * (o.s || 1), def.shadow[2]);
    if (assetName === 'tall_tree') {
      ctx.save();
      ctx.fillStyle = 'rgba(70,53,35,.82)';
      ctx.fillRect(p.x - 5*scale, p.y - 38*scale, 10*scale, 40*scale);
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = .97;
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
