(() => {
  'use strict';
  for (const src of ['src/v19/31-biome-art.js','src/v19/32-release-info.js','src/v20/33-loader.js']) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  }
})();
