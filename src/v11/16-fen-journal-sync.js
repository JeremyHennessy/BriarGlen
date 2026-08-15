(() => {
  'use strict';

  // Build 11 journal state sync. Build 10 rebuilds journal lists whenever the
  // field book opens or changes tabs, so observe those list rebuilds and then
  // restore the Fen rows from the persistent Build 11 state.
  const syncFenJournalRows = () => {
    const rows = [
      ['fen-cross', 'Old Warden Crossing restored', !!progress.fenCrossingUnlocked, 'Not completed'],
      ['fen-warden', 'Fen Warden defeated', !!progress.fenWardenDefeated, 'Not completed'],
      ['fen-sigil', 'Fenward Sigil restored', !!progress.fenwardSigilOwned, 'Not completed'],
      ['fen-sigil-recipe', 'Fenward Sigil • 3 Bog Amber', !!progress.fenWardenDefeated || !!progress.fenwardSigilOwned, 'Unknown recipe'],
      ['fen-sigil-gear', 'Fenward Sigil', !!progress.fenwardSigilOwned, 'Not acquired'],
    ];

    for (const [key, label, done, unknown] of rows) {
      const row = document.querySelector(`[data-build11="${key}"]`);
      if (!row) continue;
      row.className = `journal-row ${done ? 'done' : 'locked'}`;
      const icon = row.querySelector('span');
      const text = row.querySelector('b');
      if (icon) icon.textContent = done ? '✓' : '•';
      if (text) text.textContent = done ? label : unknown;
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
    new MutationObserver(() => {
      // Build 10 just replaced the direct children; Build 11's normal UI pass
      // will recreate its rows, then this microtask refreshes their completion.
      queueMicrotask(syncFenJournalRows);
    }).observe(list, { childList: true });
  }

  syncFenJournalRows();
})();
