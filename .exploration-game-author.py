from pathlib import Path
p=Path('src/game.js')
s=p.read_text()
helper=Path('.exploration-game-helper.txt').read_text()
anchor="  function renderPlayHud(){\n"
assert s.count(anchor)==1
n=s.replace(anchor,helper+anchor)
call="  renderExpeditionSupplyPlan(p);\n"
assert n.count(call)==1
n=n.replace(call,call+"  renderExplorationLeads(p);\n")
old="navigation.active?direction:p.completed?(itemCount('trailpack')?'Your supplies remain in the Waycache':'Make · 2 Wolf Hides + 1 Ashwood'):direction"
new="navigation.active?direction:p.completed?(itemCount('trailpack')?'Journal · exploration leads':'Make · 2 Wolf Hides + 1 Ashwood'):direction"
assert n.count(old)==1
n=n.replace(old,new)
assert n.replace(new,old).replace("  renderExplorationLeads(p);\n","").replace(helper,"")==s
p.write_text(n)
print('PASS game presentation inversion')
