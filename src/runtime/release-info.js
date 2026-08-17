(() => {
  'use strict';
  const BUILD_INFO = Object.freeze({
    version:'25',
    label:'Briar Glen Art Rollout',
    saveKey:'briar-glen-vslice-v1',
    schema:1,
    runtime:'canonical-manifest-hooks-v1',
  });
  window.__BRIAR_GLEN_BUILD = BUILD_INFO;
  document.documentElement.dataset.briarGlenBuild = BUILD_INFO.version;
  document.documentElement.dataset.briarGlenRuntime = BUILD_INFO.runtime;
  if (window.__BRIAR_GLENDebug) window.__BRIAR_GLENDebug.getBuildInfo = () => ({...BUILD_INFO});
})();
