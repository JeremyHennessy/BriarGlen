import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {proveExpeditionGuide} from './tests/expedition-guide.mjs';
const engine=process.env.ENGINE,records=[];
assert.ok(['chromium','webkit'].includes(engine));
const sizes=[{name:'desktop',width:1440,height:900},{name:'landscape',width:844,height:390},{name:'portrait',width:390,height:844},{name:'small-landscape',width:667,height:375},{name:'small-portrait',width:375,height:667},{name:'narrow-landscape',width:568,height:320},{name:'narrow-portrait',width:320,height:568}];
await mkdir('evidence/screens',{recursive:true});
const stable=page=>page.evaluate(()=>{const p=window.__BRIAR_GLEN_DEBUG__.snapshot().player;return{x:p.x,y:p.y,hp:p.hp,energy:p.energy,coins:p.coins,inventory:p.inventory,skills:p.skills,deeds:p.deeds,discoveries:p.discoveries,expeditions:p.expeditions,equippedWeapon:p.equippedWeapon,equippedArmor:p.equippedArmor,equippedTool:p.equippedTool};});
const safe=page=>page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.clearEnemies();d.setPosition(900,600);d.setHp(100);d.setEnergy(100);for(const n of d.snapshot().npcs){const live=d.npc(n.id);live.x=30;live.y=30;live.think=60;live.target={x:30,y:30};}d.advance(0);});
const geometry=async page=>{const g=await page.evaluate(()=>{const panel=document.querySelector('.play-panel:not([hidden])');return{w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,pw:panel.clientWidth,psw:panel.scrollWidth,panels:document.querySelectorAll('.play-panel:not([hidden])').length,controls:['attack-btn','interact-btn','quick-brace','quick-tonic'].map(id=>{const el=document.getElementById(id),b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return{id,b:b.toJSON(),hit:el===hit||el.contains(hit)};})};});assert.equal(g.panels,1);assert.ok(g.sw<=g.w+1&&g.sh<=g.h+1&&g.psw<=g.pw+1,'Page and panel stay within viewport');for(const c of g.controls)assert.ok(c.hit&&c.b.width>=44&&c.b.height>=44&&c.b.left>=0&&c.b.top>=0&&c.b.right<=g.w+1&&c.b.bottom<=g.h+1,'All persistent actions stay visible and hittable');return g;};
const browser=await {chromium,webkit}[engine].launch();
try{for(const vp of sizes){
  let oldGuide=null;
  for(const version of ['before','after']){
    const after=version==='after',touch=vp.width<1000,context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:touch}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));const name=`${engine}-${vp.name}-${version}`,r={engine,vp,version};records.push(r);
    const shot=async label=>page.screenshot({path:`evidence/screens/${name}-${label}.png`});
    const activate=async s=>touch?page.locator(s).tap():page.locator(s).click();
    await page.goto(`http://127.0.0.1:${after?4173:4174}/`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#guide-preparation')?.textContent.includes('health'));
    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.reset());await safe(page);await shot('default');
    await activate('#objective-open');r.freshGeometry=await geometry(page);await shot('fresh-journal');
    const markup=await page.locator('.expedition-guide').evaluate(el=>{const clone=el.cloneNode(true);clone.querySelector('#exploration-leads')?.remove();return clone.innerHTML;});
    if(!after)oldGuide=markup;else{assert.equal(markup,oldGuide,'Approved pre-completion Journal markup remains exactly unchanged');assert.equal(await page.locator('#exploration-leads').isVisible(),false);}
    // Presentation fixture only: known normal save with completion and previously visited side content.
    // The permanent test separately earns completion using the existing interactions and deposit lifecycle.
    await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.save();const raw=JSON.parse(localStorage.getItem('briar-glen-reboot-v1'));raw.player.expeditions.stonepine={started:true,completed:true,rewarded:true};raw.player.deeds.emberback=1;for(const l of raw.world.landmarks)if(['moonwell-hollow','deep-quarry-seam'].includes(l.id))l.discovered=true;localStorage.setItem('briar-glen-reboot-v1',JSON.stringify(raw));});
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#guide-arrows-plan')?.dataset.state==='complete');await safe(page);await activate('#objective-open');await shot('completed-journal');
    if(after){
      const leads=page.locator('#exploration-leads'),summary=leads.locator('summary');assert.equal(await leads.isVisible(),true);assert.equal(await leads.getAttribute('open'),null);
      const before=await stable(page);await activate('#exploration-leads summary');assert.notEqual(await leads.getAttribute('open'),null);assert.deepEqual(await stable(page),before);
      await page.locator('#exploration-leads p').last().scrollIntoViewIfNeeded();r.expandedGeometry=await geometry(page);await shot('expanded-leads');
      await summary.focus();await page.keyboard.press('Enter');assert.equal(await leads.getAttribute('open'),null);
      await page.keyboard.down('Space');await page.waitForTimeout(650);await page.keyboard.up('Space');assert.notEqual(await leads.getAttribute('open'),null);assert.deepEqual(await stable(page),before,'Reading with native held keys never executes gameplay');
      await page.waitForTimeout(250);assert.equal(await summary.evaluate(el=>document.activeElement===el),true);assert.equal(await leads.getAttribute('open'),'');
      for(const id of ['pack','craft','character','nearby','journal']){await activate(`[data-panel=${id}]`);await geometry(page);}assert.deepEqual(await stable(page),before);
      if(touch){await page.setViewportSize({width:vp.height,height:vp.width});await page.waitForTimeout(250);await geometry(page);await page.setViewportSize({width:vp.width,height:vp.height});await page.waitForTimeout(250);await geometry(page);await page.addStyleTag({content:'body{padding:20px 12px 16px!important}#app{height:calc(100dvh - 36px)!important}'});await page.waitForTimeout(250);r.insets=await geometry(page);await shot('insets');}
      // Run the same permanent guide lifecycle on this viewport; fixtures are explicit, not human-play claims.
      await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');
      await proveExpeditionGuide(page,{...vp,touch,name:`${engine}-${vp.name}`});r.lifecycle=true;
    }
    assert.deepEqual(errors,[]);r.errors=errors;r.pass=true;await context.close();
    await writeFile('evidence/visual.json',JSON.stringify(records,null,2));
  }
}console.log(`PASS ${engine}:14 actual before-after presentations;7 full guide lifecycles; unchanged pre-completion markup, native reading, all panels, portrait/landscape/insets and44px center hit tests`);}
finally{await writeFile('evidence/visual.json',JSON.stringify(records,null,2));await browser.close();}
