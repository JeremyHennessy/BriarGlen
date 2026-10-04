from pathlib import Path
p=Path('tests/smoke.mjs');old=p.read_text()
a="d.advance(8);m.hunger=0;d.rethink('mira');const after={goal:m.goal,blocked:m.blockedByDanger?"
b="d.advance(8);m.hunger=0;for(const other of d.enemies())if(other.id!==wolfId)d.enemy(other.id).dead=true;d.rethink('mira');const after={goal:m.goal,blocked:m.blockedByDanger?"
assert old.count(a)==1
new=old.replace(a,b)
a2='    const autonomousDangerDetour=await page.evaluate('
b2='    // Keep this single reported-wolf fixture isolated from incidental respawns; the reported threat stays alive.\n'+a2
assert new.count(a2)==1;new=new.replace(a2,b2)
assert new.replace(b2,a2).replace(b,a)==old
p.write_text(new)
print('PASS exact test-only fixture inversion; original 30+8-second windows and both outcome assertions unchanged. Runtime respawn and hazard safety untouched.')
