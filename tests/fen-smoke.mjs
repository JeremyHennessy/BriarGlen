import { chromium } from 'playwright';
const base=process.argv[2]||'http://127.0.0.1:4173/';
const sizes=[['phone-landscape',932,430],['phone-portrait',430,932],['desktop',1440,900]];
const assert=(v,m)=>{if(!v)throw new Error(m)};
for(const [name,width,height] of sizes){
 const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width,height}}); const errors=[];
 page.on('pageerror',e=>errors.push(String(e))); await page.goto(base,{waitUntil:'networkidle'}); await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'networkidle'});
 assert(await page.evaluate(()=>!!window.__BRIAR_GLENDebug),'debug surface missing');
 let s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getFenState()); assert(!s.crossingOpened && !s.discovered,'fen should start locked');
 await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(1050,-1200)); await page.evaluate(()=>window.__BRIAR_GLENDebug.interact()); s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getFenState()); assert(!s.crossingOpened,'crossing opened without progression');
 await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug; d.setProgress({reinforcedPickaxe:true,temperedSword:true,briarstringBow:true,moonrootStaff:true}); d.teleport(1050,-1200); d.interact();});
 s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getFenState()); assert(s.crossingOpened && s.discovered,'crossing did not open/chart');
 await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(1210,-1370)); await page.evaluate(()=>window.__BRIAR_GLENDebug.interact()); s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getFenState()); assert(s.mossglass>=1,'mossglass not gathered');
 await page.evaluate(()=>window.__BRIAR_GLENDebug.defeatFenWarden()); s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getFenState()); assert(s.wardenDefeated,'fen boss not defeated');
 await page.evaluate(()=>{window.__BRIAR_GLENDebug.teleport(1515,-1830);window.__BRIAR_GLENDebug.interact();}); s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getFenState()); assert(s.cacheClaimed && s.mossglass>=3,'fen reliquary reward missing');
 await page.evaluate(()=>window.__BRIAR_GLENDebug.openMap()); const map=await page.evaluate(()=>window.__BRIAR_GLENDebug.getMapState()); assert(map.discoveries.fen,'fen missing from map discovery');
 await page.evaluate(()=>window.__BRIAR_GLENDebug.closeMap()); await page.reload({waitUntil:'networkidle'}); s=await page.evaluate(()=>window.__BRIAR_GLENDebug.getFenState()); assert(s.crossingOpened&&s.wardenDefeated&&s.cacheClaimed,'fen progression did not persist');
 assert(errors.length===0,`runtime errors: ${errors.join('; ')}`); console.log(`PASS ${name}: Mosswater Fen + crossing + Mossglass + Drowned Warden persistent`); await browser.close();
}