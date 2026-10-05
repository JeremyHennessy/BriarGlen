from pathlib import Path
p=Path('tests/craft-categories.mjs');old=p.read_text()
a="  await setup();await activate('[data-panel=\"craft\"]');await choose('all');"
b="""  await setup();
  // The prior canonical proof really attacks; reset() intentionally leaves transient cooldowns alone.
  await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player.attackCd===0,null,{timeout:1500});
  await activate('[data-panel="craft"]');await choose('all');"""
assert old.count(a)==1
new=old.replace(a,b);assert new.replace(b,a)==old;p.write_text(new)
