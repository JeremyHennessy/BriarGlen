(() => {
  'use strict';

  const BUILD_INFO = Object.freeze({
    version: '16',
    label: 'Art & World Identity',
    saveKey: 'briar-glen-vslice-v1',
    schema: 1,
  });

  window.__BRIAR_GLEN_BUILD = BUILD_INFO;
  document.documentElement.dataset.briarGlenBuild = BUILD_INFO.version;
  if (window.__BRIAR_GLENDebug) window.__BRIAR_GLENDebug.getBuildInfo = () => ({ ...BUILD_INFO });

  // Load after the art layer so the projection/haptic tuning becomes the final presentation wrapper.
  const feedback = document.createElement('script');
  feedback.src = 'src/v16/26-feedback-tuning.js';
  feedback.async = false;
  document.body.appendChild(feedback);
})();
