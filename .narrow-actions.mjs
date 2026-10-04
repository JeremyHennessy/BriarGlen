import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

// Dedicated 320px-high landscape coverage, once per browser suite, in its own save context.
// Existing canonical viewport minima and assertions remain unchanged.
export async function proveNarrowActions(sourcePage, vp) {
  if (vp.name !== 'desktop') return;
  const context = await sourcePage.context().browser().newContext({viewport:{width:568,height:320},hasTouch:true});
  const page = await context.newPage(), errors = [], records = [];
  page.on('pageerror', error => errors.push(error.message));
  const evidence = process.env.UI_EVIDENCE_DIR;
  const snapshot = () => page.evaluate(() => window.__BRIAR_GLEN_DEBUG__.snapshot().player);
  const checkLayout = async label => {
    const g = await page.evaluate(() => {
      const box = s => document.querySelector(s).getBoundingClientRect().toJSON();
      const targets = [...document.querySelectorAll('.action-deck button')].map(el => {
        const b = el.getBoundingClientRect();
        return {id:el.id||el.dataset.move,b:b.toJSON(),hits:[[.5,.5],[.1,.1],[.9,.1],[.1,.9],[.9,.9]].map(([x,y])=>{
          const top=document.elementFromPoint(b.x+b.width*x,b.y+b.height*y);return top===el||el.contains(top);
        })};
      });
      return {w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,canvas:box('#game'),side:box('.sidebar'),deck:box('.action-deck'),panels:document.querySelectorAll('.play-panel:not([hidden])').length,targets};
    });
    records.push({label,...g});
    assert.equal(g.panels,1,`${label}: single visible panel`);
    assert.ok(g.sw<=g.w+1&&g.sh<=g.h+1,`${label}: no page overflow`);
    assert.equal(g.targets.length,8,`${label}: all four directions and four actions present`);
    for(const t of g.targets){
      assert.ok(t.b.width>=44&&t.b.height>=44,`${label}: ${t.id} retains 44px touch size`);
      assert.ok(t.b.left>=0&&t.b.top>=0&&t.b.right<=g.w+1&&t.b.bottom<=g.h+1,`${label}: ${t.id} onscreen`);
      assert.ok(t.hits.every(Boolean),`${label}: ${t.id} is not covered by another element`);
    }
    assert.ok(g.canvas.width>=250&&g.canvas.height>=100,`${label}: usable world in this additional short viewport`);
    assert.ok(g.canvas.bottom<=g.deck.top,`${label}: actions do not cover the world`);
    if(g.w>g.h)assert.ok(g.side.bottom<=g.deck.top,`${label}: actions have their own lane below the sidebar`);
    if(evidence)await page.screenshot({path:`${evidence}/narrow-${label}.png`});
  };
  try {
    if(evidence)await mkdir(evidence,{recursive:true});
    await page.goto(sourcePage.url());
    await page.waitForFunction(()=>!!document.querySelector('#guide-preparation')?.textContent);
    for(const [width,height] of [[568,320],[620,375],[666,375]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(160);
      for(const id of ['nearby','pack','craft','character','journal']){
        await page.locator(`[data-panel=${id}]`).tap();await checkLayout(`${width}x${height}-${id}`);
      }
    }
    await page.setViewportSize({width:568,height:320});
    await page.waitForTimeout(160);
    assert.match(await page.locator('.play-stage').ariaSnapshot(),/region "Adventure"/);

    // Clearly synthetic setup; outcomes use the original, native controls and unaccelerated time.
    await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();});
    for(const [direction,axis,sign] of [['left','x',-1],['up','y',-1],['down','y',1],['right','x',1]]){
      await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setPosition(900,600);d.setEnergy(100);});
      const before=await snapshot(), b=await page.locator(`[data-move=${direction}]`).boundingBox();
      assert.ok(b);await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
      try{await page.waitForTimeout(180);}finally{await page.mouse.up();}
      const after=await snapshot();assert.ok((after[axis]-before[axis])*sign>0,`${direction}: held visible direction moves correctly`);
    }
    await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setPosition(900,600);d.setEnergy(60);});
    await page.locator('#attack-btn').tap();
    const attacked=await snapshot();assert.ok(attacked.energy<60&&attacked.attackCd>0,'Native Attack executes instead of clicking the sidebar');
    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.setEnergy(100));
    await page.locator('#quick-brace').tap();assert.equal((await snapshot()).guarded,true,'Native Brace remains reachable');
    await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('tonic',1);d.setHp(40);});
    await page.locator('#quick-tonic').tap();const healed=await snapshot();
    assert.ok(healed.hp>40);assert.equal(healed.inventory.tonic,undefined,'Native Tonic consumes the actual supply once');
    await page.evaluate(()=>{
      const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();
      for(const n of d.snapshot().npcs){d.npc(n.id).x=30;d.npc(n.id).y=30;}
      const l=d.landmarks().find(l=>l.id==='stonepine-trail-ledger');d.setPosition(l.x,l.y);d.advance(0);
    });
    await page.locator('#interact-btn').tap();
    await page.waitForFunction(()=>document.querySelector('#objective-text').textContent.includes('Chart Stonepine Overlook'));
    await checkLayout('native-actions');
    await page.locator('[data-panel=journal]').tap();
    await page.setViewportSize({width:320,height:568});await page.waitForTimeout(220);await checkLayout('portrait-rotation');
    await page.setViewportSize({width:568,height:320});await page.waitForTimeout(220);await checkLayout('restored-landscape');
    await page.addStyleTag({content:'body{padding:20px 12px 16px!important}#app{height:calc(100dvh - 36px)!important}'});
    await page.waitForTimeout(160);await checkLayout('insets');
    assert.deepEqual(errors,[]);
    console.log('PASS narrow landscape: all eight 44px hit targets, every panel, real held movement and Attack/Use/Brace/Tonic, region semantics, rotation and insets; isolated save context');
  } finally {
    if(evidence)await writeFile(`${evidence}/narrow-results.json`,JSON.stringify({records,errors},null,2));
    await context.close();
  }
}
