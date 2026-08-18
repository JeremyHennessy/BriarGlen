(() => {
  'use strict';

  const debug = window.__BRIAR_GLENDebug;
  if (!debug) return;

  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'styles-v39.css';
  style.dataset.build39Style = 'true';
  document.head.appendChild(style);
  document.documentElement.dataset.build39PhoneUi = 'true';

  const panels = Object.freeze([
    ['inventory', 'inventory-panel'],
    ['trade', 'trade-panel'],
    ['craft', 'craft-panel'],
    ['map', 'warden-overlay'],
    ['board', 'board2-panel'],
  ]);

  function openPanels() {
    return panels
      .filter(([, id]) => {
        const panel = document.getElementById(id);
        return panel && !panel.hidden;
      })
      .map(([name]) => name);
  }

  /* Prevent keyboard shortcuts from opening a second full-screen window. */
  addEventListener('keydown', event => {
    const open = openPanels();
    if (!open.length || event.code === 'Escape') return;
    const current = open[0];
    const closesCurrent =
      (current === 'inventory' && event.code === 'KeyI') ||
      (current === 'map' && ['KeyJ', 'KeyK'].includes(event.code));
    if (closesCurrent) return;
    if (['KeyI', 'KeyC', 'KeyJ', 'KeyK', 'KeyE'].includes(event.code)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  debug.getPhoneUi39State = () => ({
    openPanels: openPanels(),
    oneBlockingWindow: openPanels().length <= 1,
    rotateNoticeVisible: !!document.getElementById('rotate-note')?.offsetParent,
    cssLoaded: [...document.styleSheets].some(sheet => (sheet.href || '').includes('styles-v39.css')),
  });
})();
