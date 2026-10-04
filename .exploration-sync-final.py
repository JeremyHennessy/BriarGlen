from pathlib import Path
p=Path('tests/expedition-guide.mjs');s=p.read_text()
a="  assert.notEqual(await leads.getAttribute('open'),null);assert.deepEqual(await state(),beforeLeads);"
b="  await page.waitForFunction(()=>document.querySelector('#exploration-leads').open,null,{timeout:1000});\n"+a
assert s.count(a)==1;p.write_text(s.replace(a,b))
p=Path('.exploration-visual-final.mjs');s=p.read_text()
a="await page.keyboard.up('Space');assert.notEqual(await leads.getAttribute('open'),null);"
b="await page.keyboard.up('Space');await page.waitForFunction(()=>document.querySelector('#exploration-leads').open,null,{timeout:1000});assert.notEqual(await leads.getAttribute('open'),null);"
assert s.count(a)==1;p.write_text(s.replace(a,b))
print('Test synchronization only: wait for actual native disclosure activation, same positive state/focus/player equality assertions.')
