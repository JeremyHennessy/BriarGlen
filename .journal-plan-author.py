from pathlib import Path
import difflib
changes={}
def edit(path,old,new):
    p=Path(path);s=p.read_text();assert s.count(old)==1,(path,'anchor count',s.count(old));n=s.replace(old,new);assert n.replace(new,old)==s
    changes.setdefault(path,s);p.write_text(n)

p='src/play-ui.js'
old="guide.innerHTML = '<div class=\"card-title\"><span>Stonepine expedition</span><small>Optional adventure</small></div><div id=\"guide-body\"></div><h3>Before you leave</h3><p id=\"guide-preparation\"></p><p class=\"guide-note\">Gather Ashwood in Greenwood, herbs in South Meadow and Moss Fen, and hides from wolves. Make a bow and arrows, brew medicine, and rest before heading for the ridge. The world keeps moving while panels are open.</p>';"
new="""guide.innerHTML = '<div class="card-title"><span>Stonepine expedition</span><small>Optional adventure</small></div><div class="guide-tools" role="group" aria-label="Expedition preparation panels"><button type="button" data-guide-panel="pack">Check gear</button><button type="button" data-guide-panel="craft">Make supplies</button><button type="button" data-guide-panel="character">Skills &amp; recovery</button></div><h3>Field preparation</h3><p id="guide-preparation"></p><h3>Waycache provisions</h3><div class="guide-provisions"><p id="guide-bread-plan"></p><p id="guide-arrows-plan"></p><p id="guide-deposit-help"></p></div><h3>Route checklist</h3><div id="guide-body"></div><details class="guide-sources"><summary>Where to get supplies</summary><p class="guide-note">Gather Ashwood in Greenwood, herbs in South Meadow and Moss Fen, and hides from wolves. Make a bow and arrows, brew medicine, and rest before heading for the ridge. Keep Brown Bread for the cache; check Nearby trades when you need more. Bring extra arrows for bow combat. The world keeps moving while panels are open.</p></details>';"""
edit(p,old,new)
old="  $('#objective-open').addEventListener('click', () => setPanel('journal', true));"
new="""  // Navigation only: these shortcuts never craft, equip, travel or spend a resource.
  guide.addEventListener('click', event => {
    const button = event.target.closest('[data-guide-panel]');
    if (button && guide.contains(button)) setPanel(button.dataset.guidePanel, true);
  });
"""+old
edit(p,old,new)

p='src/game.js'
helper="""  // Read existing progress only: carried supplies are not Waycache deposits.
  function renderExpeditionSupplyPlan(p){
    const set=(id,value,state)=>{const el=document.getElementById(id);if(!el)return;if(el.textContent!==value)el.textContent=value;if(state)el.dataset.state=state;};
    for(const [id,required,label] of [['bread',1,'Brown Bread'],['arrows',6,'Trail Arrows']]){
      const stored=p[id],carried=itemCount(id),remaining=Math.max(0,required-stored),missing=Math.max(0,remaining-carried);
      const state=p.completed?'complete':remaining===0?'stored':missing===0?'carry':'missing';
      const next=p.completed?'Route recorded':remaining===0?'Deposit met':missing>0?`Need ${missing} more to carry; ${remaining} still to store`:`Carry enough; store ${remaining} in Nearby`;
      set(`guide-${id}-plan`,`${label} · Carried ${carried} · Stored ${stored}/${required} · ${next}`,state);
    }
    set('guide-deposit-help',p.completed?'Expedition recorded. Your stored provisions may be taken without undoing the reward.':p.ready?'Return to the Trail Ledger. Leave the provisions in the Waycache until the expedition is recorded.':!p.cache?'Secure the Waycache first, then store provisions in Nearby. Carried items alone do not count.':'At the Waycache, use Store 1 in Nearby for each item. Leave the deposits there until you return to the Trail Ledger.');
  }
"""
edit(p,'  function renderPlayHud(){',helper+'  function renderPlayHud(){')
old="  renderInteractionCue(p);";new=old+'\n  renderExpeditionSupplyPlan(p);';edit(p,old,new)

p='src/play-ui.css';s=Path(p).read_text();css="""
/* Journal planning reuses the existing panel; links remain stable during live updates. */
.guide-tools{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.guide-tools button{min-height:44px;flex:1 1 90px;font-size:12px;padding:7px 9px}.guide-provisions p{padding:7px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere}.guide-provisions [data-state=stored],.guide-provisions [data-state=complete]{color:var(--good)}.guide-provisions [data-state=missing]{color:var(--warn)}.guide-provisions [data-state=carry]{color:var(--accent)}.guide-sources summary{min-height:44px}.expedition-guide .guide-tools+h3{margin-top:12px}
"""
changes[p]=s;Path(p).write_text(s+css)
for path,old in changes.items():
    print(''.join(difflib.unified_diff(old.splitlines(True),Path(path).read_text().splitlines(True),fromfile='before/'+path,tofile='after/'+path)))
