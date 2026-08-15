(() => {
  'use strict';

  const BUILD_INFO = Object.freeze({
    version: '12.1',
    label: 'Stability Pass',
    saveKey: 'briar-glen-vslice-v1',
    schema: 1,
  });

  window.__BRIAR_GLEN_BUILD = BUILD_INFO;
  document.documentElement.dataset.briarGlenBuild = BUILD_INFO.version;

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.getBuildInfo = () => ({ ...BUILD_INFO });
  }
})();
