from pathlib import Path
import hashlib,re
p=Path('src/game.js');old=p.read_text()
assert hashlib.sha1(f'blob {len(p.read_bytes())}\0'.encode()+p.read_bytes()).hexdigest()=='db8fce4e4df16bc0712aee5ff4ed4154b9b65c0b'
helper='''  // Presentation-only DOM continuity: keep controls alive between unchanged world refreshes.
  const interactivePanelMarkup=new WeakMap();
  function updateInteractivePanel(container,html,context){
    const previous=interactivePanelMarkup.get(container);
    if(previous?.html===html&&previous.context===context)return false;
    const active=container.contains(document.activeElement)?document.activeElement:null;
    const attribute=active?['data-skill','data-equip','data-near','data-cache-store','data-cache-take'].find(key=>active.hasAttribute(key)):null;
    const value=attribute?active.getAttribute(attribute):null,panel=container.closest('.play-panel'),scrollTop=panel?.scrollTop;
    container.innerHTML=html;interactivePanelMarkup.set(container,{html,context});
    if(active&&panel&&!panel.hidden){
      const replacement=previous?.context===context&&attribute?[...container.querySelectorAll(`[${attribute}]`)].find(el=>el.getAttribute(attribute)===value&&!el.disabled):null;
      (replacement||panel).focus({preventScroll:true});panel.scrollTop=scrollTop;
    }
    return true;
  }
'''
new=old
line=next(l for l in old.splitlines() if 'function renderSkills(){' in l)
changed=line.replace('UI.skills.innerHTML=','const html=',1).replace(';for(const b of UI.skills.querySelectorAll',";if(!updateInteractivePanel(UI.skills,html,'skills'))return;for(const b of UI.skills.querySelectorAll",1)
assert changed!=line;new=new.replace(line,helper+changed,1)
line=next(l for l in old.splitlines() if 'function renderInventory(){' in l)
changed=line.replace('UI.inventory.innerHTML=','const html=',1).replace(';for(const row of UI.inventory.querySelectorAll',";if(!updateInteractivePanel(UI.inventory,html,'inventory'))return;for(const row of UI.inventory.querySelectorAll",1)
assert changed!=line;new=new.replace(line,changed,1)
line=next(l for l in old.splitlines() if 'function renderNearby(' in l)
changed=line.replace('l=nearestLandmark(55);','l=nearestLandmark(55),context=l||n||r||d||null;',1)
pat=r'UI\.nearby\.innerHTML=(.*?);(?=return;|for\(const b|UI\.nearby\.querySelector)'
changed,count=re.subn(pat,lambda m:f'if(!updateInteractivePanel(UI.nearby,{m.group(1)},context))return;',changed)
assert count==9
changed=changed.replace("UI.nearby.textContent='Walk up to someone or something useful.';","updateInteractivePanel(UI.nearby,'Walk up to someone or something useful.',null);")
new=new.replace(line,changed,1)
restored=new.replace(helper,'',1)
for name in ['renderSkills','renderInventory','renderNearby']:
 a=next(l for l in old.splitlines() if f'function {name}(' in l)
 b=next(l for l in restored.splitlines() if f'function {name}(' in l)
 restored=restored.replace(b,a,1)
assert restored==old
p.write_text(new)
u=Path('tests/play-ui.mjs');s=u.read_text();s="import { proveLiveUiStability } from './live-ui-stability.mjs';\n"+s
needle='  await proveInteractionUi(page,vp);';assert s.count(needle)==1;s=s.replace(needle,needle+'\n  await proveLiveUiStability(page,vp);',1);u.write_text(s)
print('PASS exact gameplay/source preservation; only live-panel markup replacement and additive test integration changed')