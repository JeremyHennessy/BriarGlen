import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const patch=await readFile('.narrow-candidate.css','utf8'),records=[];
const sizes=[[1440,900],[844,390],[390,844],[667,375],[375,667],[568,320],[600,320],[620,375],[640,360],[666,375],[620,551]];
// A single browser task prevents unrelated native world-notice changes between the two measurements.
const measureAndApply=(page,css='')=>page.evaluate(css=>{
  const measure=()=>{
    const box=s=>document.querySelector(s).getBoundingClientRect().toJSON();
    const targets=[...document.querySelectorAll('.action-deck button')].filter(el=>el.getClientRects().length>0).map(el=>{
      const b=el.getBoundingClientRect();return{id:el.id||el.dataset.move,b:b.toJSON(),hits:[[.5,.5],[.1,.1],[.9,.1],[.1,.9],[.9,.9]].map(([x,y])=>{const top=document.elementFromPoint(b.x+b.width*x,b.y+b.height*y);return top===el||el.contains(top);})};
    });
    return{w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,canvas:box('#game'),side:box('.sidebar'),deck:box('.action-deck'),tabs:box('.panel-tabs'),hp:box('#hp'),energy:box('#energy'),panels:document.querySelectorAll('.play-panel:not([hidden])').length,notice:document.querySelector('.world-notice').textContent,targets};
  };
  const before=measure();if(css){const style=document.createElement('style');style.textContent=css;document.head.append(style);}return{before,after:measure()};
},css);
const accepted=g=>g.panels===1&&g.sw<=g.w+1&&g.sh<=g.h+1&&g.targets.length===(g.w<=1100?8:4)&&g.targets.every(t=>t.hits.every(Boolean)&&t.b.width>=44&&t.b.height>=44&&t.b.left>=0&&t.b.top>=0&&t.b.right<=g.w+1&&t.b.bottom<=g.h+1);
try{for(const [engine,type] of Object.entries({chromium,webkit})){
  const browser=await type.launch();
  try{for(const [width,height] of sizes){
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<1100}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const r={engine,width,height,errors};records.push(r);
    try{
      await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>!!document.querySelector('#guide-preparation')?.textContent);
      await page.screenshot({path:`evidence/screens/${engine}-${width}x${height}-before.png`});
      const pair=await measureAndApply(page,patch);Object.assign(r,pair);r.beforeAccepted=accepted(pair.before);r.afterAccepted=accepted(pair.after);
      if(width===568)assert.equal(r.beforeAccepted,false,'Original action occlusion must reproduce');
      assert.ok(r.afterAccepted,JSON.stringify(r));
      assert.equal(pair.before.notice,pair.after.notice,'Both CSS measurements use the same live notice');
      assert.ok(pair.after.canvas.width>=pair.before.canvas.width-1&&pair.after.canvas.height>=pair.before.canvas.height-1,'Do not repair controls by shrinking the world');
      if(!(width<=666&&height<=550&&width>height))for(const k of ['canvas','side','deck','tabs','hp','energy'])assert.deepEqual(pair.after[k],pair.before[k],`Out-of-scope geometry changed: ${k}`);
      if(width<=666&&height<=550&&width>height)assert.ok(pair.after.side.bottom<=pair.after.deck.top&&pair.after.canvas.bottom<=pair.after.deck.top,'Shared action row must be below both columns');
      await page.screenshot({path:`evidence/screens/${engine}-${width}x${height}-after.png`});
      const aria=await page.locator('.play-stage').ariaSnapshot();assert.match(aria,/region "Adventure"/);if(width===568)await writeFile(`evidence/${engine}-adventure.yml`,aria);
      r.panels=[];
      for(const id of ['pack','craft','character','journal','nearby']){await page.locator(`[data-panel=${id}]`).click();const g=(await measureAndApply(page)).after;r.panels.push({id,g});assert.ok(accepted(g),`${engine} ${width}x${height}: ${id}`);}
      await page.locator('[data-panel=journal]').click();await page.screenshot({path:`evidence/screens/${engine}-${width}x${height}-journal.png`});
      if(width<1100){await page.setViewportSize({width:height,height:width});await page.waitForTimeout(220);r.rotated=(await measureAndApply(page)).after;assert.ok(accepted(r.rotated),`${engine} ${width}x${height}: rotation`);await page.setViewportSize({width,height});await page.waitForTimeout(220);r.restored=(await measureAndApply(page)).after;assert.ok(accepted(r.restored),`${engine} ${width}x${height}: restored`);}
      if(width===568){await page.addStyleTag({content:'body{padding:20px 12px 16px!important}#app{height:calc(100dvh - 36px)!important}'});await page.waitForTimeout(220);r.insets=(await measureAndApply(page)).after;assert.ok(accepted(r.insets),'Inset controls must be hit-testable');await page.screenshot({path:`evidence/screens/${engine}-${width}x${height}-insets.png`});}
      assert.deepEqual(errors,[]);r.complete=true;console.log(JSON.stringify({engine,width,height,before:r.beforeAccepted,after:r.afterAccepted,canvas:pair.after.canvas}));
    }finally{await context.close();}
  }}finally{await browser.close();}
}console.log('PASS22 same-scene before/after comparisons; original occlusion reproduced, all visible action targets hittable, world not shrunk, all out-of-scope rectangles exactly unchanged, region semantics/panels/rotation/insets retained.');}
catch(error){await writeFile('evidence/error.txt',error.stack||String(error));throw error;}
finally{await writeFile('evidence/results.json',JSON.stringify(records,null,2));}
