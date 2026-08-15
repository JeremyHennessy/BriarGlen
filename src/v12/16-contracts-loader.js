(() => {
  'use strict';
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'styles-v12.css';
  document.head.appendChild(style);

  const script = document.createElement('script');
  script.src = 'src/v12/16-contract-board.js';
  script.async = false;
  document.body.appendChild(script);
})();
