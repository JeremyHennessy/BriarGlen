(() => {
  'use strict';

  const HOOK_TYPES = Object.freeze([
    'beforeUpdate','afterUpdate','beforeDraw','afterDraw',
    'beforeInteract','afterInteract','beforeDamageEnemy','afterDamageEnemy',
    'beforeKillEnemy','afterKillEnemy','afterUpdateUI',
  ]);
  const buckets = Object.fromEntries(HOOK_TYPES.map(type => [type, []]));
  const counters = Object.fromEntries(HOOK_TYPES.map(type => [type, 0]));
  let sequence = 0;

  function sortBucket(type) {
    buckets[type].sort((a,b) => a.priority - b.priority || a.sequence - b.sequence);
  }

  function registerHook(type, id, fn, priority = 0) {
    if (!buckets[type]) throw new Error(`Unknown Briar Glen runtime hook: ${type}`);
    if (typeof fn !== 'function') throw new TypeError('Runtime hook must be a function');
    const key = String(id || `hook-${++sequence}`);
    unregisterHook(type, key);
    buckets[type].push({ id:key, fn, priority:Number(priority)||0, sequence:++sequence });
    sortBucket(type);
    return () => unregisterHook(type, key);
  }

  function unregisterHook(type, id) {
    if (!buckets[type]) return false;
    const index = buckets[type].findIndex(entry => entry.id === id);
    if (index < 0) return false;
    buckets[type].splice(index, 1);
    return true;
  }

  function dispatch(type, payload) {
    counters[type] += 1;
    for (const entry of [...buckets[type]]) entry.fn(payload);
    return payload;
  }

  const legacy = Object.freeze({
    update, draw, interact, damageEnemy, killEnemy, updateUI,
  });

  update = function runtimeUpdate(dt) {
    const payload = dispatch('beforeUpdate', { dt, cancel:false, result:undefined });
    if (!payload.cancel) payload.result = legacy.update(payload.dt);
    dispatch('afterUpdate', payload);
    return payload.result;
  };

  draw = function runtimeDraw() {
    const payload = dispatch('beforeDraw', { cancel:false, result:undefined });
    if (!payload.cancel) payload.result = legacy.draw();
    dispatch('afterDraw', payload);
    return payload.result;
  };

  interact = function runtimeInteract(...args) {
    const payload = dispatch('beforeInteract', { args:[...args], cancel:false, result:undefined });
    if (!payload.cancel) payload.result = legacy.interact(...payload.args);
    dispatch('afterInteract', payload);
    return payload.result;
  };

  damageEnemy = function runtimeDamageEnemy(enemy, amount, opts = {}) {
    const payload = dispatch('beforeDamageEnemy', { enemy, amount, opts, cancel:false, result:undefined });
    if (!payload.cancel) payload.result = legacy.damageEnemy(payload.enemy, payload.amount, payload.opts);
    dispatch('afterDamageEnemy', payload);
    return payload.result;
  };

  killEnemy = function runtimeKillEnemy(enemy) {
    const payload = dispatch('beforeKillEnemy', { enemy, cancel:false, result:undefined });
    if (!payload.cancel) payload.result = legacy.killEnemy(payload.enemy);
    dispatch('afterKillEnemy', payload);
    return payload.result;
  };

  updateUI = function runtimeUpdateUI() {
    const result = legacy.updateUI();
    dispatch('afterUpdateUI', { result });
    return result;
  };

  const runtime = Object.freeze({
    version: '20.1',
    hookTypes: HOOK_TYPES,
    registerHook,
    unregisterHook,
    getState: () => ({
      version:'20.1',
      manifestId:window.__BRIAR_GLEN_MANIFEST?.id || null,
      manifestScripts:window.__BRIAR_GLEN_MANIFEST?.scripts?.length || 0,
      topLevelBootstrapCount:document.querySelectorAll('script[src="src/runtime/boot.js"]').length,
      managedScriptCount:document.querySelectorAll('script[data-runtime-managed="true"]').length,
      legacyLoaderScriptCount:[...document.querySelectorAll('script[src]')].filter(script => /16-contracts-loader|27-loader|29-loader|31-loader|33-loader/.test(script.getAttribute('src') || '')).length,
      hooks:Object.fromEntries(HOOK_TYPES.map(type => [type, buckets[type].map(({id,priority}) => ({id,priority}))])),
      dispatchCounts:{...counters},
      wrappers:{
        update:update.name, draw:draw.name, interact:interact.name,
        damageEnemy:damageEnemy.name, killEnemy:killEnemy.name, updateUI:updateUI.name,
      },
    }),
  });

  window.__BRIAR_GLEN_RUNTIME = runtime;
  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.getRuntimeArchitectureState = runtime.getState;
    window.__BRIAR_GLENDebug.registerRuntimeHook = registerHook;
    window.__BRIAR_GLENDebug.unregisterRuntimeHook = unregisterHook;
  }
})();
