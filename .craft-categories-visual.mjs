import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {proveCraftCategories} from './tests/craft-categories.mjs';
const engine=process.env.ENGINE,records=[];assert.ok(['chromium','webkit'].includes(engine));
const sizes=[[1440,900],[844,390],[390,844],[667,375],[375,667],[568,320],[320,568]];
const safe=page=>page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setPosition(900,600);for(const n of d.snapshot().npcs){const live=d.npc(n.id);live.x=30;live.y=30;live.think=60;live.target={x:30,y:30};}d.advance(0);});
const geometry=async page=>{const g=await page.evaluate(()=>{const p=document.querySelector('.play-panel:not([hidden])');return{w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,pw:p.clientWidth,psw:p.scrollWidth,panels:document.querySelectorAll('.play-panel:not([hidden])').length,controls:['attack-btn','interact-btn','quick-brace','quick-tonic'].map(id=>{const el=document.getElementById(id),b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return{id,b:b.toJSON(),hit:hit===el||el.contains(hit)};})};});assert.equal(g.panels,1);assert.ok(g.sw<=g.w+1&&g.sh<=g.h+1&&g.psw<=g.pw+1,'Page/panel fit');for(const c of g.controls)assert.ok(c.hit&&c.b.width>=44&&c.b.height>=44&&c.b.left>=0&&c.b.top>=0&&c.b.right<=g.w+1&&c.b.bottom<=g.h+1,'Persistent controls remain visible and hittable');return g;};
await mkdir('evidence/screens',{recursive:true});const browser=await {chromium,webkit}[engine].launch();
try{for(const [width,height] of sizes)for(const version of ['before','after']){
  const after=version==='after',touch=width<1000,name=`${engine}-${width}x${height}-${version}`,context=await browser.newContext({viewport:{width,height},hasTouch:touch}),page=await context.newPage(),errors=[],r={engine,width,height,version};records.push(r);page.on('pageerror',e=>errors.push(e.message));
  const activate=async s=>touch?page.locator(s).tap():page.locator(s).click();
  await page.goto(`http://127.0.0.1:${after?4173:4174}/`);await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');await safe(page);
  await page.screenshot({path:`evidence/screens/${name}-default.png`});await activate('[data-panel=craft]');
  await page.screenshot({path:`evidence/screens/${name}-make-top.png`});r.initial=await geometry(page);
  if(after){
    assert.equal(await page.locator('[data-craft-filter=all]').getAttribute('aria-pressed'),'true');
    await proveCraftCategories(page,{width,height,touch,name});
    for(const id of ['all','supplies','gear','care']){
      await activate(`[data-craft-filter=${id}]`);r[id]=await geometry(page);
      const visible=await page.locator('.craft-filters button').evaluateAll(nodes=>nodes.map(el=>{const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return{width:b.width,height:b.height,hit:hit===el||el.contains(hit)};}));
      assert.ok(visible.every(b=>b.width>=44&&b.height>=44&&b.hit),'Each category is hittable, not merely in layout');
    }
    // Same-scene outer layout cannot change when Make is filtered.
    const unchanged=await page.evaluate(()=>{const selectors=['#game','.action-deck','.sidebar','.panel-tabs','#hp','#energy','.objective-strip'];const rects=()=>selectors.map(s=>document.querySelector(s).getBoundingClientRect().toJSON());const before=rects();document.querySelector('[data-craft-filter=supplies]').click();return{before,after:rects()};});assert.deepEqual(unchanged.after,unchanged.before,'Make filtering never resizes world/HUD/panels');
    for(const id of ['nearby','pack','character','journal','craft']){await activate(`[data-panel=${id}]`);await geometry(page);}
    if(touch){await page.setViewportSize({width:height,height:width});await page.waitForTimeout(250);await geometry(page);await page.setViewportSize({width,height});await page.waitForTimeout(250);await geometry(page);await page.addStyleTag({content:'body{padding:20px 12px 16px!important}#app{height:calc(100dvh - 36px)!important}'});await page.waitForTimeout(250);await geometry(page);await page.screenshot({path:`evidence/screens/${name}-insets.png`});}
  }else{await page.locator('[data-craft=arrows]').scrollIntoViewIfNeeded();await page.screenshot({path:`evidence/screens/${name}-original-supplies.png`});}
  assert.deepEqual(errors,[]);r.errors=errors;r.pass=true;await context.close();await writeFile('evidence/visual.json',JSON.stringify(records,null,2));
}console.log(`PASS ${engine}:14 actual before-after Make presentations;7 full category flows; all panels, exact outer geometry, native actions, orientation/insets and hit-testing`);}
finally{await writeFile('evidence/visual.json',JSON.stringify(records,null,2));await browser.close();}
