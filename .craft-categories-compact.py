from pathlib import Path
p=Path('src/play-ui.js');old=p.read_text()
a="const craftStatus = document.createElement('p');"
b="const craftStatus = cards.craft.querySelector('.card-title small');"
assert old.count(a)==1
new=old.replace(a,b)
a2='  craftList.before(craftFilters, craftStatus);';b2='  craftList.before(craftFilters);'
assert new.count(a2)==1;new=new.replace(a2,b2)
assert new.replace(b2,a2).replace(b,a)==old;p.write_text(new)
p=Path('src/play-ui.css');old=p.read_text()
rule='#craft-filter-status{font-size:11px;line-height:1.4;color:var(--muted);margin:5px 0}'
assert old.count(rule)==1;p.write_text(old.replace(rule,''))
print('Make count reuses its existing heading, reclaiming a separate status row on short screens; no action or outer layout change.')
