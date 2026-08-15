(() => {
  'use strict';
  for (const src of ['src/v18/29-stonepine-integration.js','src/v18/30-release-info.js']) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  }
})();
