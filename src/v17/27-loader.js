(() => {
  'use strict';
  for (const src of [
    'src/v17/27-stonepine-reach.js',
    'src/v17/27b-stonepine-melee.js',
    'src/v17/28-release-info.js',
  ]) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  }
})();
