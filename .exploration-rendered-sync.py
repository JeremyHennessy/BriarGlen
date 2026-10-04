from pathlib import Path
p=Path('tests/expedition-guide.mjs');s=p.read_text()
a="  await leadSummary.focus();await page.keyboard.press('Enter');assert.equal(await leads.getAttribute('open'),null);"
b=a+"\n  // Finish the native close render before the next held key; immediate mixed-touch input can lose Chromium activation.\n  assert.deepEqual(await leadSummary.evaluate(el=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({focused:document.activeElement===el,open:el.parentElement.open}))))),{focused:true,open:false});"
assert s.count(a)==1;p.write_text(s.replace(a,b))
p=Path('.exploration-visual-final.mjs');s=p.read_text()
a="await summary.focus();await page.keyboard.press('Enter');assert.equal(await leads.getAttribute('open'),null);"
b=a+"\n      assert.deepEqual(await summary.evaluate(el=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({focused:document.activeElement===el,open:el.parentElement.open}))))),{focused:true,open:false});"
assert s.count(a)==1;p.write_text(s.replace(a,b))
print('Test-only pre-key synchronization: native closed disclosure rendered and focused, with all original activation/state assertions retained.')
