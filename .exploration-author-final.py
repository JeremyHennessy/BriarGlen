from pathlib import Path
import hashlib

base_hashes={'src/game.js':'bbe35f9f86c33b4408f73a20ae4ea803e2c7105e','src/play-ui.js':'1934bab8c9f2d9cdaeb71a708fcf1f74c1cd5917','tests/expedition-guide.mjs':'67036eec07fc510cba02ef223b6b418df0b524f1'}
for name,want in base_hashes.items():
    b=Path(name).read_bytes()
    assert hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()==want,name

def apply(name,changes):
    p=Path(name);old=p.read_text();new=old
    for a,b in changes:
        assert new.count(a)==1,(name,a)
        new=new.replace(a,b)
    inverse=new
    for a,b in reversed(changes):
        assert inverse.count(b)==1,(name,b)
        inverse=inverse.replace(b,a)
    assert inverse==old,name
    p.write_text(new)

anchor='  renderExpeditionSupplyPlan(p);\n'
line='  const leads=document.getElementById(\'exploration-leads\');if(leads)leads.hidden=!p.completed;\n'
apply('src/game.js',[(anchor,anchor+line)])
anchor='The world keeps moving while panels are open.</p></details>\';'
markup='<details id="exploration-leads" hidden><summary>Exploration leads</summary><p class="guide-note">Beyond Stonepine: these are existing places to explore, not new tracked quests. You may have visited them already.</p><p><strong>Old Quarry · Deep Quarry Seam.</strong> Defeating Emberback reopens the seam. Equip a working Iron Pick and bring 14 energy to mine fine Iron Ore; it can be worked once each day.</p><p><strong>Moss Fen · Moonwell Hollow.</strong> Visit after dusk for fine Mooncaps. Its harvest is available once each night.</p><p><strong>Far Moss Fen · Mirecaller.</strong> Defeating this creature leaves a Mireglass Lens in the reeds. Pick it up and carry it to extend Survey from 7 to 11 seconds.</p></details>'
apply('src/play-ui.js',[(anchor,'The world keeps moving while panels are open.</p></details>'+markup+"';")])
changes=[]
a="  await shot('fresh');"
changes.append((a,"  assert.equal(await page.locator('#exploration-leads').isVisible(),false,'Exploration leads stay hidden before route completion');\n"+a))
a="  await shot('ready-return');"
changes.append((a,"  assert.equal(await page.locator('#exploration-leads').isVisible(),false,'Deposits alone must not reveal completion-only leads');\n"+a))
a="  await shot('recorded');"
b="""  const leads=page.locator('#exploration-leads'),leadSummary=leads.locator('summary');
  assert.equal(await leads.isVisible(),true);assert.equal(await leads.getAttribute('open'),null,'New leads are collapsed by default');
  const beforeLeads=await state();await activate('#exploration-leads summary');
  assert.notEqual(await leads.getAttribute('open'),null);
  assert.match(await leads.innerText(),/Emberback.*working Iron Pick.*14 energy/s);
  assert.match(await leads.innerText(),/Moonwell Hollow.*after dusk.*once each night/s);
  assert.match(await leads.innerText(),/Mireglass Lens.*7 to 11 seconds/s);
  assert.deepEqual(await state(),beforeLeads,'Reading leads never grants discoveries, items or progress');
  await leadSummary.focus();await page.keyboard.press('Enter');assert.equal(await leads.getAttribute('open'),null);
  await page.keyboard.down('Space');await page.waitForTimeout(650);await page.keyboard.up('Space');
  assert.notEqual(await leads.getAttribute('open'),null);assert.deepEqual(await state(),beforeLeads);
  assert.equal(await leadSummary.evaluate(el=>document.activeElement===el),true);await shot('exploration-leads');
"""+a
changes.append((a,b))
a="  await page.waitForFunction(()=>document.querySelector('#guide-arrows-plan')?.dataset.state==='complete');"
changes.append((a,a+"\n  assert.equal(await page.locator('#exploration-leads').isVisible(),true);assert.equal(await page.locator('#exploration-leads').getAttribute('open'),null,'Reload derives availability without persisting disclosure state');"))
a="  console.log(`PASS ${vp.name}: guide navigation, held input, carried vs stored, partial deposits, withdraw/return/reward, large counts, save and stable controls`);"
changes.append((a,"  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.advance(0);});assert.equal(await page.locator('#exploration-leads').isVisible(),false,'Fresh reset hides previously revealed leads');\n"+a))
apply('tests/expedition-guide.mjs',changes)
for name in base_hashes:
    b=Path(name).read_bytes();print(name,hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest())
print('PASS exact source inversion. One read-only visibility line, static disclosure, additive lifecycle tests only.')
