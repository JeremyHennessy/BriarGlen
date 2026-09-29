import { chromium } from 'playwright';
const target=process.argv[2]||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
try{
  for(const vp of [
    {name:'desktop',width:1280,height:800,touch:false},
    {name:'phone-landscape',width:844,height:390,touch:true},
    {name:'phone-portrait',width:390,height:844,touch:true},
  ]){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch});
    await context.addInitScript(()=>localStorage.clear());
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    await page.goto(target,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().id==='living-world-reboot',{timeout:5000});
    let state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    if(state.npcs.length!==4)throw new Error(`${vp.name}: expected four autonomous NPCs`);
    if(!state.npcs.every(n=>n.goalText&&Array.isArray(n.memory)))throw new Error(`${vp.name}: NPC cognition surface missing`);
    if(state.resources<30)throw new Error(`${vp.name}: resource world under-seeded`);

    await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('iron',5,2.4);d.give('wood',2,2.0);});
    if(!await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.craft('pick')))throw new Error(`${vp.name}: meaningful tool craft failed`);
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    if(state.player.equippedTool!=='pick'||state.player.inventory.pick.qty!==1)throw new Error(`${vp.name}: crafted tool not equipped`);

    await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.forceNpcNeed('alden','iron');d.give('iron',2,1.8);d.setPosition(812,545);});
    const helped=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.help('alden'));
    if(!helped)throw new Error(`${vp.name}: need-driven NPC help failed`);
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    const alden=state.npcs.find(n=>n.id==='alden');
    if(alden.trust<=0||!alden.memory.some(m=>m.text.includes('You brought')))throw new Error(`${vp.name}: NPC did not remember player help`);
    if(state.player.coins<=24)throw new Error(`${vp.name}: meaningful transaction did not pay`);

    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.useSkill('rapport'));
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    if(state.player.skills.rapport.xp<=0)throw new Error(`${vp.name}: active skill did not improve through use`);

    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.snapshot?.().npcs?.length===4,{timeout:5000});
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    if(state.npcs.find(n=>n.id==='alden').trust<=0)throw new Error(`${vp.name}: NPC memory/trust did not persist`);
    if(state.player.inventory.pick?.qty!==1)throw new Error(`${vp.name}: important crafted item did not persist`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors: ${errors.join(' | ')}`);
    const canvas=await page.locator('#game').boundingBox();if(!canvas||canvas.width<250||canvas.height<140)throw new Error(`${vp.name}: canvas unusable`);
    console.log(`PASS ${vp.name}: autonomous NPC goals + needs + memory + useful items + skill use + persistence`);
    await context.close();
  }
} finally { await browser.close(); }
