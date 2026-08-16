(() => {
  'use strict';
  for (const src of ['src/v20/33-hollow-den-art.js','src/v20/34-release-info.js']) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  }
})();
