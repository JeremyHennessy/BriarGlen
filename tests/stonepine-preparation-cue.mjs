import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

async function setupStartedStonepine(page){
  await page.evaluate(()=>{
    const d=window.__BRIAR_GLEN_DEBUG__;
    d.reset();d.clearEnemies();d.setHp(100);d.setEnergy(100);
    for(const n of d.snapshot().npcs){const live=d.npc(n.id);live.x=30;live.y=30;live.think=60;live.target={x:30,y:30};}
    const ledger=d.landmarks().find(l=>l.id==='stonepine-trail-ledger');
    d.setPosition(ledger.x,ledger.y);d.advance(0);
  });
}

async function proveNarrowPreparationCue(sourcePage){
  const context=await sourcePage.context().browser().newContext({viewport:{width:568,height:320},hasTouch:true});
  const page=await context.newPage();
  try{
    await page.goto(sourcePage.url(),{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');
    await setupStartedStonepine(page);
    await page.locator('#interact-btn').tap();
    await page.waitForFunction(()=>document.querySelector('#objective-text')?.textContent.includes('Chart Stonepine Overlook'));
    await page.waitForFunction(()=>!document.querySelector('#objective-preparation')?.hidden);
    const g=await page.evaluate(()=>{
      const box=s=>document.querySelector(s).getBoundingClientRect().toJSON();
      return{
        w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,
        strip:box('.objective-strip'),message:box('#objective-preparation'),inner:box('.objective-strip>div'),
        canvas:box('#game'),deck:box('.action-deck'),
        controls:['#attack-btn','#interact-btn','#quick-brace','#quick-tonic'].map(box)
      };
    });
    assert.ok(g.sw<=g.w+1&&g.sh<=g.h+1,'narrow: preparation cue caused page overflow '+JSON.stringify(g));
    assert.ok(g.message.left>=g.inner.left-1&&g.message.right<=g.inner.right+1,'narrow: warning escaped objective content '+JSON.stringify(g));
    assert.ok(g.strip.bottom<=g.canvas.top+1&&g.canvas.bottom<=g.deck.top+1,'narrow: warning overlaps world/actions '+JSON.stringify(g));
    assert.ok(g.canvas.width>=250&&g.canvas.height>=100,'narrow: warning crowded out world '+JSON.stringify(g));
    for(const b of g.controls)assert.ok(b.width>=44&&b.height>=44&&b.left>=0&&b.right<=g.w+1&&b.bottom<=g.h+1,'narrow: essential action inaccessible '+JSON.stringify(b));
    if(process.env.UI_EVIDENCE_DIR){
      await mkdir(process.env.UI_EVIDENCE_DIR,{recursive:true});
      await page.screenshot({path:process.env.UI_EVIDENCE_DIR+'/narrow-stonepine-preparation.png'});
    }
  }finally{await context.close();}
}

export async function proveStonepinePreparationCue(page,vp){
  const activate=async selector=>{const el=page.locator(selector);if(vp.touch)await el.tap();else await el.click();};
  const durable=()=>page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{
    coins:p.coins,inventory:p.inventory,skills:p.skills,expeditions:p.expeditions,deeds:p.deeds,discoveries:p.discoveries,
    equippedWeapon:p.equippedWeapon,equippedTool:p.equippedTool,equippedArmor:p.equippedArmor
  };});

  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setHp(100);d.setEnergy(100);d.advance(0);});
  await page.waitForTimeout(220);
  assert.equal(await page.locator('#objective-preparation').isVisible(),false,vp.name+': warning must not appear before Stonepine starts');

  await setupStartedStonepine(page);
  await activate('#interact-btn');
  await page.waitForFunction(()=>document.querySelector('#objective-text')?.textContent.includes('Chart Stonepine Overlook'));
  await page.waitForFunction(()=>!document.querySelector('#objective-preparation')?.hidden);
  assert.match(await page.locator('#objective-preparation').innerText(),/Prepare first · equip or make a working weapon/);
  assert.match(await page.locator('#objective-direction').innerText(),/Stonepine Ridge/);
  assert.equal(await page.locator('#attack-readiness').innerText(),'Unarmed');

  const afterStart=await durable();
  await activate('#objective-open');
  assert.equal(await page.locator('#panel-journal').isVisible(),true);
  assert.equal(await page.locator('.journal-sections [aria-selected=true]').getAttribute('data-journal-section'),'plan');
  assert.match(await page.locator('#guide-preparation').innerText(),/No working weapon equipped; make one or equip it in Pack/);
  assert.deepEqual(await durable(),afterStart,'Opening preparation plan must not alter gameplay state');

  const layout=await page.evaluate(()=>{
    const box=s=>document.querySelector(s).getBoundingClientRect().toJSON();
    return{
      w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,
      inner:box('.objective-strip>div'),warning:box('#objective-preparation'),strip:box('.objective-strip'),canvas:box('#game')
    };
  });
  assert.ok(layout.sw<=layout.w+1&&layout.sh<=layout.h+1,vp.name+': warning caused page overflow '+JSON.stringify(layout));
  assert.ok(layout.warning.left>=layout.inner.left-1&&layout.warning.right<=layout.inner.right+1,vp.name+': warning overflows objective '+JSON.stringify(layout));
  assert.ok(layout.strip.bottom<=layout.canvas.top+1,vp.name+': warning overlaps world '+JSON.stringify(layout));
  if(process.env.UI_EVIDENCE_DIR){
    await mkdir(process.env.UI_EVIDENCE_DIR,{recursive:true});
    await page.screenshot({path:process.env.UI_EVIDENCE_DIR+'/'+vp.name+'-stonepine-preparation-unarmed.png'});
  }

  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('blade',1,2.8);d.advance(0);});
  await page.waitForTimeout(180);
  await activate('[data-panel="pack"]');
  await activate('#inventory [data-equip="blade"]');
  await page.waitForFunction(()=>document.querySelector('#loadout-weapon')?.dataset.condition==='good');
  await page.waitForFunction(()=>document.querySelector('#objective-preparation')?.hidden===true);
  assert.equal(await page.locator('#loadout-weapon-name').innerText(),'Iron Blade');
  assert.match(await page.locator('#objective-text').innerText(),/Chart Stonepine Overlook/);
  assert.match(await page.locator('#objective-direction').innerText(),/Stonepine Ridge/);

  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setDurability('blade',0);d.advance(0);});
  await page.waitForFunction(()=>document.querySelector('#loadout-weapon')?.dataset.condition==='broken');
  await page.waitForFunction(()=>document.querySelector('#objective-preparation')?.hidden===false);
  assert.match(await page.locator('#objective-preparation').innerText(),/working weapon/);

  await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setDurability('blade',50);d.advance(0);});
  await page.waitForFunction(()=>document.querySelector('#objective-preparation')?.hidden===true);
  const prepared=await durable();
  for(const panel of ['nearby','journal','pack','character','craft','nearby'])await activate('[data-panel="'+panel+'"]');
  assert.deepEqual(await durable(),prepared,'Preparation presentation/navigation must not mutate progress');

  await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());
  const saved=await durable();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');
  assert.deepEqual(await durable(),saved,'Preparation cue must add no save state');
  assert.match(await page.locator('#objective-text').innerText(),/Chart Stonepine Overlook/);
  await page.waitForFunction(()=>document.querySelector('#objective-preparation')?.hidden===true);

  if(vp.name==='desktop')await proveNarrowPreparationCue(page);
  console.log('PASS '+vp.name+': Stonepine persistent preparation cue, Journal agreement, weapon/broken transitions, layout and save neutrality');
}
