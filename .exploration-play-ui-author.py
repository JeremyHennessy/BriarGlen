from pathlib import Path
p=Path('src/play-ui.js')
s=p.read_text()
old="The world keeps moving while panels are open.</p></details>';"
new="The world keeps moving while panels are open.</p></details><section id=\"exploration-leads\" hidden><h3>Exploration leads</h3><p class=\"guide-note\">Stonepine proved the route. These are broad field leads, not tracked quests.</p><div id=\"lead-quarry\" class=\"guide-step\"></div><div id=\"lead-moonwell\" class=\"guide-step\"></div><div id=\"lead-mireglass\" class=\"guide-step\"></div></section>';"
assert s.count(old)==1
n=s.replace(old,new)
assert n.replace(new,old)==s
p.write_text(n)
print('PASS play-ui markup inversion')
