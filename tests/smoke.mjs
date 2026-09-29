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
    await context.addInitScript(()=>{if(!sessionStorage.getItem('briar-reboot-smoke-init')){localStorage.clear();sessionStorage.setItem('briar-reboot-smoke-init','1')}});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    await page.goto(target,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.3.0',{timeout:5000});
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

    await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setNpcStock('mira','tonic',2);d.forceNpcNeed('tamsin','tonic');d.rethink('tamsin');d.advance(8);});
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    const tamsin=state.npcs.find(n=>n.id==='tamsin'),mira=state.npcs.find(n=>n.id==='mira');
    if((tamsin.stock.tonic||0)<1||!(tamsin.relations?.mira>0))throw new Error(`${vp.name}: NPC-to-NPC supply decision failed`);
    if(!tamsin.memory.some(m=>m.text.includes('Mira supplied Field Tonic'))||!mira.memory.some(m=>m.text.includes('Tamsin came to me for Field Tonic')))throw new Error(`${vp.name}: NPC exchange memory failed`);

    await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setNpcStock('tamsin','tonic',0);d.setNpcStock('mira','tonic',0);d.setNpcStock('mira','briarleaf',0);d.setNpcStock('mira','mooncap',0);d.forceNpcNeed('tamsin','tonic');d.rethink('mira');d.rethink('tamsin');d.advance(120);});
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    const plannedMira=state.npcs.find(n=>n.id==='mira'),plannedTamsin=state.npcs.find(n=>n.id==='tamsin');
    if((plannedTamsin.stock.tonic||0)<1)throw new Error(`${vp.name}: downstream shortage did not resolve through producer planning ${JSON.stringify({mira:plannedMira, tamsin:plannedTamsin})}`);
    if(!plannedMira.memory.some(m=>m.text.includes('to make Field Tonic for a shortage'))||!plannedMira.memory.some(m=>m.text.includes('Prepared a Field Tonic')))throw new Error(`${vp.name}: producer did not remember causal production chain`);

    await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('blade',1,3);d.equip('blade');});
    const goodBlade=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.combatProfile());
    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.setDurability('blade',0));
    const brokenBlade=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.combatProfile());
    if(!goodBlade.bladeReady||goodBlade.damage<=brokenBlade.damage||brokenBlade.bladeReady||brokenBlade.range>=goodBlade.range)throw new Error(`${vp.name}: item quality/durability not mechanically meaningful`);
    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());

    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.snapshot?.().npcs?.length===4,{timeout:5000});
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    if(state.npcs.find(n=>n.id==='alden').trust<=0)throw new Error(`${vp.name}: NPC memory/trust did not persist`);
    if(state.player.inventory.pick?.qty!==1||state.player.inventory.blade?.durability!==0)throw new Error(`${vp.name}: important item state did not persist`);
    if(!(state.npcs.find(n=>n.id==='tamsin').relations?.mira>0))throw new Error(`${vp.name}: NPC relationship memory did not persist`);

    const dangerSetup=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setNpcStock('mira','tonic',0);d.setNpcStock('mira','briarleaf',0);d.setNpcStock('mira','mooncap',0);d.forceNpcNeed('tamsin','tonic');d.rethink('mira');const target={...d.npc('mira').target};const wolfId=d.spawnWolfAt(target.x,target.y);d.rethink('mira');return{wolfId,target};});
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    let riskMira=state.npcs.find(n=>n.id==='mira');
    if(riskMira.goal!=='avoid'||riskMira.blockedByDanger?.enemyId!==dangerSetup.wolfId)throw new Error(`${vp.name}: civilian did not defer dangerous work ${JSON.stringify(riskMira)}`);
    if(!riskMira.memory.some(m=>m.text.includes('wolf blocked the work')))throw new Error(`${vp.name}: civilian did not remember why work stopped`);

    await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.rethink('tamsin');d.advance(12);});
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    riskMira=state.npcs.find(n=>n.id==='mira');const riskTamsin=state.npcs.find(n=>n.id==='tamsin');
    const wolfCleared=await page.evaluate(id=>window.__BRIAR_GLEN_DEBUG__.enemy(id)?.dead===true,dangerSetup.wolfId);
    if(!wolfCleared)throw new Error(`${vp.name}: Warden did not clear reported danger`);
    if(riskMira.blockedByDanger)throw new Error(`${vp.name}: civilian danger block was not released`);
    if(!(riskMira.relations?.tamsin>0)||!riskMira.memory.some(m=>m.text.includes('Tamsin cleared the wolf'))||!riskTamsin.memory.some(m=>m.text.includes("blocking Mira's work")))throw new Error(`${vp.name}: danger response did not create social memory ${JSON.stringify({riskMira,riskTamsin})}`);

    await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.rethink('mira');d.advance(20);});
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());riskMira=state.npcs.find(n=>n.id==='mira');
    if((riskMira.stock.tonic||0)<1||!riskMira.memory.some(m=>m.text.includes('Gathered Briarleaf to make Field Tonic for a shortage'))||!riskMira.memory.some(m=>m.text.includes('Prepared a Field Tonic')))throw new Error(`${vp.name}: Mira did not resume and complete the interrupted production task after danger cleared ${JSON.stringify(riskMira)}`);

    if(errors.length)throw new Error(`${vp.name}: runtime errors: ${errors.join(' | ')}`);
    const canvas=await page.locator('#game').boundingBox();if(!canvas||canvas.width<250||canvas.height<140)throw new Error(`${vp.name}: canvas unusable`);
    console.log(`PASS ${vp.name}: autonomous NPC goals + causal production planning + risk-aware work + Warden response + social memory + meaningful items + skills + persistence`);
    await context.close();
  }
} finally { await browser.close(); }
