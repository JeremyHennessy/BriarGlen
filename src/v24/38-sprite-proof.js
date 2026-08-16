(() => {
  'use strict';

  // Build 24.1 proof: opt-in authored sprite integration for Briar Glen + Meadow Road.
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
    mode: requested ? 'authored-sprites' : 'build23-canvas',
    assets: {},
    draws: 0,
    fallbackDraws: 0,
    replacements: { cottage:0, tall_tree:0, pine_tree:0 },
    baseline,
  };

  document.documentElement.dataset.spriteProof = requested ? 'loading' : 'off';

  const defs = {
    cottage: { src:'assets/v24/cottage-authored.png', width:182, height:182, anchor:.83 },
    tall_tree: { src:'assets/v24/tall-tree-authored.png', width:150, height:150, anchor:.88 },
    pine_tree: { src:'assets/v24/pine-tree-authored.png', width:156, height:156, anchor:.90 },
  };

  function inProofSlice(x, y) {
    return x >= -1000 && x <= 690 && !(x > -80 && y < -425);
  }

  function visible(p, margin = 180) {
    return p.x > -margin && p.x < viewport.w + margin && p.y > -margin && p.y < viewport.h + margin;
  }

  function treeAsset(o) {
    // Stable coordinate-based variation: no gameplay state and no random-frame flicker.
    const key = Math.abs(Math.floor(o.x * .031 + o.y * .017));
    return key % 4 === 0 ? 'pine_tree' : 'tall_tree';
  }

  function loadAsset(name, def) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        proof.assets[name] = { loaded:true, width:image.naturalWidth, height:image.naturalHeight, image };
        resolve();
      };
      image.onerror = () => reject(new Error(`Build 24.1 sprite failed to load: ${def.src}`));
      image.src = `${def.src}?v=24.1`;
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
    if (!proof.enabled || !proof.ready || !inProofSlice(o.x, o.y) || !['tree','cottage'].includes(o.type)) {
      return build23DrawObject(o);
    }

    const assetName = o.type === 'cottage' ? 'cottage' : treeAsset(o);
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

    ctx.save();
    ctx.globalAlpha = .99;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(record.image, p.x - w / 2, p.y - h * def.anchor, w, h);
    ctx.restore();

    proof.draws += 1;
    proof.replacements[assetName] += 1;
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
      loadedAssets: Object.fromEntries(Object.entries(proof.assets).map(([name, value]) => [name, { loaded:value.loaded, width:value.width, height:value.height }])),
      draws: proof.draws,
      fallbackDraws: proof.fallbackDraws,
      replacements: { ...proof.replacements },
      baseline: { ...proof.baseline },
      current: currentCounts(),
    });
    window.__BRIAR_GLENDebug.setSpriteProofEnabled = value => {
      proof.enabled = proof.requested && proof.ready && !!value;
      return proof.enabled;
    };
  }
})();
