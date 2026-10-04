from pathlib import Path
p=Path('src/play-ui.js');old=p.read_text()
anchor='  // Capture panel navigation so arrows do not simultaneously move the character.\n'
added="""  // Reading keys belong to the focused panel, not the world. Keep native scroll/activation.
  sidebar.addEventListener('keydown', event => {
    const panel = event.target.closest('.play-panel');
    if (!panel || panel.hidden) return;
    const readingKey = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(event.code);
    const readingSpace = event.code === 'Space' && !event.target.closest('button,summary,[role="button"],input,textarea,select,[contenteditable="true"]');
    if (readingKey || readingSpace) event.stopPropagation();
  });
"""
assert old.count(anchor)==1
new=old.replace(anchor,added+anchor)
a='Use prioritizes residents, then landmarks, resources and loose items. Nearby can preview things just outside reach. The world keeps moving while panels are open.'
b='Use prioritizes residents, then landmarks, resources and loose items. Nearby can preview things just outside reach. With the panel itself focused, arrow keys and Space scroll it; Escape returns focus to the world. The world keeps moving while panels are open.'
assert new.count(a)==1;new=new.replace(a,b)
assert new.replace(added,'').replace(b,a)==old
p.write_text(new)
p=Path('tests/play-ui.mjs');old=p.read_text();a="import { proveExpeditionGuide } from './expedition-guide.mjs';";b="import { provePanelReading } from './panel-reading.mjs';\n"+a;assert old.count(a)==1
new=old.replace(a,b);a2='  await proveExpeditionGuide(page, vp);';b2=a2+'\n  await provePanelReading(page, vp);';assert new.count(a2)==1;new=new.replace(a2,b2);assert new.replace(b2,a2).replace(b,a)==old;p.write_text(new)
print('PASS exact inversion: only scoped panel reading-key listener, contextual help sentence and additive test invocation. All game code/styles/save/actions remain unchanged.')
