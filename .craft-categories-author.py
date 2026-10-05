from pathlib import Path
import hashlib

def blob(name):
    b=Path(name).read_bytes();return hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()
for name,expected in {'src/play-ui.js':'bc96a9b42d089d183312e027a6df45f665b0183e','src/play-ui.css':'dc7c14b879f0eef861063bcc3f7d509a5e501822','tests/play-ui.mjs':'ea0d86376c1a962860c173cf919efc53aab225be'}.items():
    assert blob(name)==expected,name
p=Path('src/play-ui.js');old=p.read_text()
anchor='  const setPanel = (id, focus = false) => {\n'
added='''  // Presentation-only categories: retain every original recipe/care button and handler.
  const craftList = cards.craft.querySelector('.nearby'); craftList.id = 'craft-list';
  const craftCategories = [['all','All'], ['supplies','Supplies'], ['gear','Gear'], ['care','Care']];
  const craftFilters = document.createElement('div'); craftFilters.className = 'craft-filters';
  craftFilters.setAttribute('role', 'group'); craftFilters.setAttribute('aria-label', 'Make categories');
  for (const [id, label] of craftCategories) craftFilters.insertAdjacentHTML('beforeend', `<button type="button" data-craft-filter="${id}" aria-pressed="${id === 'all'}" aria-controls="craft-list">${label}</button>`);
  const craftStatus = document.createElement('p'); craftStatus.id = 'craft-filter-status'; craftStatus.setAttribute('role', 'status');
  craftList.before(craftFilters, craftStatus);
  const gearRecipes = new Set(['pick','blade','bow','bedroll','trailpack','jerkin']);
  const craftEntries = [...craftList.querySelectorAll('.recipe-row')].map(row => ({node:row, category:gearRecipes.has(row.querySelector('[data-craft]').dataset.craft) ? 'gear' : 'supplies'}));
  for (const id of ['patch-jerkin','make-camp','drink-tonic']) craftEntries.push({node:document.getElementById(id), category:'care'});
  const selectCraftCategory = id => {
    const category = craftCategories.find(([key]) => key === id); if (!category) return;
    for (const entry of craftEntries) entry.node.hidden = id !== 'all' && entry.category !== id;
    for (const button of craftFilters.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.craftFilter === id));
    craftStatus.textContent = `${category[1]} · ${craftEntries.filter(entry => !entry.node.hidden).length} actions`;
  };
  craftFilters.addEventListener('click', event => {
    const button = event.target.closest('[data-craft-filter]'); if (!button || !craftFilters.contains(button)) return;
    selectCraftCategory(button.dataset.craftFilter); button.focus({preventScroll:true});
  });
  selectCraftCategory('all');
'''
assert old.count(anchor)==1;new=old.replace(anchor,added+anchor);assert new.replace(added,'')==old;p.write_text(new)
p=Path('src/play-ui.css');old=p.read_text();added='''
/* Make categories change visibility only; original actions and readiness remain intact. */
.craft-filters{display:grid;grid-template-columns:repeat(4,minmax(44px,1fr));gap:4px;margin:8px 0}.craft-filters button{min-height:44px;min-width:44px;padding:5px 2px;font-size:11px;background:var(--panel2);border:1px solid var(--line);border-radius:7px;cursor:pointer}.craft-filters button[aria-pressed=true]{color:var(--accent);border-color:var(--accent)}#craft-filter-status{font-size:11px;line-height:1.4;color:var(--muted);margin:5px 0}#craft-list>[hidden]{display:none!important}
'''
p.write_text(old+added);assert p.read_text()[:-len(added)]==old
p=Path('tests/play-ui.mjs');old=p.read_text();a="import { proveNarrowActions } from './narrow-actions.mjs';";b="import { proveCraftCategories } from './craft-categories.mjs';\n"+a;assert old.count(a)==1
new=old.replace(a,b);a2='  await proveNarrowActions(page, vp);';b2=a2+'\n  await proveCraftCategories(page, vp);';assert new.count(a2)==1;new=new.replace(a2,b2);assert new.replace(b2,a2).replace(b,a)==old;p.write_text(new)
print('PASS exact inversion: only Make category controls/scoped CSS and additive proof invocation; game.js and prior assertions untouched')
for name in ['src/play-ui.js','src/play-ui.css','tests/play-ui.mjs']:print(name,blob(name))
