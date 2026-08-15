(() => {
  'use strict';

  // Build 11 journal state sync. Build 10 rebuilds journal lists whenever the
  // field book opens or changes tabs, so recreate the Fen rows after those
  // renders and then apply their current persistent completion state.
  const syncFenJournalRows = () => {
    const rows = [
      ['journal-milestones', 'fen-cross', 'Old Warden Crossing restored', !!progress.fenCrossingUnlocked, 'Not completed'],
      ['journal-milestones', 'fen-warden', 'Fen Warden defeated', !!progress.fenWardenDefeated, 'Not completed'],
      ['journal-milestones', 'fen-sigil', 'Fenward Sigil restored', !!progress.fenwardSigilOwned, 'Not completed'],
      ['journal-recipes', 'fen-sigil-recipe', 'Fenward Sigil • 3 Bog Amber', !!progress.fenWardenDefeated || !!progress.fenwardSigilOwned, 'Unknown recipe'],
      ['journal-gear', 'fen-sigil-gear', 'Fenward Sigil', !!progress.fenwardSigilOwned, 'Not acquired'],
    ];

    for (const [containerId, key, label, done, unknown] of rows) {
      const container = document.getElementById(containerId);
      if (!container) continue;
      let row = container.querySelector(`[data-build11="${key}"]`);
      if (!row) {
        row = document.createElement('div');
        row.dataset.build11 = key;
        row.innerHTML = '<span></span><b></b>';
        container.appendChild(row);
      }
      row.className = `journal-row ${done ? 'done' : 'locked'}`;
      row.querySelector('span').textContent = done ? '✓' : '•';
      row.querySelector('b').textContent = done ? label : unknown;
    }
  };

  const build11UpdateUI = updateUI;
  updateUI = function build11SyncedJournalUI() {
    build11UpdateUI();
    syncFenJournalRows();
  };

  for (const id of ['journal-milestones', 'journal-recipes', 'journal-gear']) {
    const list = document.getElementById(id);
    if (!list) continue;
    new MutationObserver(() => queueMicrotask(syncFenJournalRows))
      .observe(list, { childList: true });
  }

  syncFenJournalRows();
})();
