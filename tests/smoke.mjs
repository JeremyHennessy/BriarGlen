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
    await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.9.0',{timeout:5000});
    let state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    if(state.npcs.length!==4)throw new Error(`${vp.name}: expected four autonomous NPCs`);
    if(!state.npcs.every(n=>n.goalText&&Array.isArray(n.memory)))throw new Error(`${vp.name}: NPC cognition surface missing`);
    if(state.resources<30)throw new Error(`${vp.name}: resource world under-seeded`);

    await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('iron',5,2.4);d.give('wood',2,2.0);});
    if(!await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.craft('pick')))throw new Error(`${vp.name}: meaningful tool craft failed`);
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    if(state.player.equippedTool!=='pick'||state.player.inventory.pick.qty!==1)throw new Error(`${vp.name}: crafted tool not equipped`);
    let pickStory=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.artifact('pick'));
    if(pickStory?.provenance?.maker!=='You'||pickStory.provenance.madeDay!==1||!pickStory.provenance.history.some(x=>x.includes('Forged by You')))throw new Error(`${vp.name}: crafted tool has no maker/material lineage ${JSON.stringify(pickStory)}`);
    const duplicatePick=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.craft('pick'));
    if(duplicatePick)throw new Error(`${vp.name}: singular equipment was incorrectly collapsed into an anonymous stack`);
    await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setDurability('pick',40);d.useSkill('smithing');});
    pickStory=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.artifact('pick'));
    if(pickStory.provenance.repairs!==1||pickStory.maxDurability!==98||pickStory.durability<=40||!pickStory.provenance.history.some(x=>x.includes('Mended by You')))throw new Error(`${vp.name}: Smithing did not leave a persistent repair history ${JSON.stringify(pickStory)}`);

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
    pickStory=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.artifact('pick'));
    if(pickStory?.provenance?.maker!=='You'||pickStory.provenance.repairs!==1||pickStory.maxDurability!==98)throw new Error(`${vp.name}: item lineage/repair history did not persist ${JSON.stringify(pickStory)}`);
    if(!(state.npcs.find(n=>n.id==='tamsin').relations?.mira>0))throw new Error(`${vp.name}: NPC relationship memory did not persist`);

    const transferProbe=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,forced=d.forceNpcNeed('tamsin','pick'),before=d.snapshot(),request=d.npc('tamsin')?.request?{...d.npc('tamsin').request}:null,helped=d.help('tamsin'),after=d.snapshot();return{forced,helped,request,playerPickBefore:before.player.inventory.pick||null,tamsinBefore:before.npcs.find(n=>n.id==='tamsin'),playerPickAfter:after.player.inventory.pick||null,tamsinAfter:after.npcs.find(n=>n.id==='tamsin')};});
    if(!transferProbe.helped)throw new Error(`${vp.name}: crafted tool could not become part of NPC life ${JSON.stringify(transferProbe)}`);
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    let lineageTamsin=state.npcs.find(n=>n.id==='tamsin');
    if(state.player.inventory.pick||lineageTamsin.stock.pick!==1||lineageTamsin.stockMeta?.pick?.provenance?.maker!=='You'||lineageTamsin.stockMeta.pick.provenance.repairs!==1||!lineageTamsin.memory.some(m=>m.text.includes('you made')))throw new Error(`${vp.name}: exact crafted item history did not transfer to NPC ownership ${JSON.stringify(lineageTamsin)}`);
    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.advance(8));
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());lineageTamsin=state.npcs.find(n=>n.id==='tamsin');
    if(lineageTamsin.stock.pick!==1||lineageTamsin.stockMeta?.pick?.provenance?.maker!=='You'||lineageTamsin.stockMeta.pick.provenance.repairs!==1)throw new Error(`${vp.name}: stale artifact procurement replaced a fulfilled singular gear need ${JSON.stringify(lineageTamsin)}`);
    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.snapshot?.().npcs?.length===4,{timeout:5000});
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());lineageTamsin=state.npcs.find(n=>n.id==='tamsin');
    if(lineageTamsin.stockMeta?.pick?.provenance?.maker!=='You'||lineageTamsin.stockMeta.pick.provenance.repairs!==1)throw new Error(`${vp.name}: NPC-owned item lineage did not persist`);

    const fieldcraftSetup=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setNpcStock('mira','tonic',0);d.setNpcStock('mira','briarleaf',0);d.setNpcStock('mira','mooncap',0);d.forceNpcNeed('tamsin','tonic');d.rethink('mira');const target={...d.npc('mira').target};const wolfId=d.spawnWolfAt(target.x,target.y);d.rethink('mira');const m=d.npc('mira');d.setPosition(m.x,m.y);const used=d.useSkill('fieldcraft');return{wolfId,target,used};});
    if(!fieldcraftSetup.used)throw new Error(`${vp.name}: Fieldcraft Survey could not be used on a blocked worker`);
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    let routeMira=state.npcs.find(n=>n.id==='mira');
    if(routeMira.blockedByDanger||routeMira.avoidEnemyId!==fieldcraftSetup.wolfId||routeMira.goal!=='seek'||!routeMira.routeOverride?.resourceId)throw new Error(`${vp.name}: Survey did not convert danger into a safe work route ${JSON.stringify(routeMira)}`);
    if(!routeMira.memory.some(m=>m.text.includes('surveyed a safer route'))||routeMira.trust<=0||state.player.skills.fieldcraft.xp<7)throw new Error(`${vp.name}: Fieldcraft solution left no social/skill consequence ${JSON.stringify(routeMira)}`);
    for(let i=0;i<15;i++){
      const gathered=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.npc('mira').memory.some(m=>m.text.includes('Gathered Briarleaf to make Field Tonic for a shortage')));
      if(gathered)break;
      await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.advance(10));
    }
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());routeMira=state.npcs.find(n=>n.id==='mira');
    const detourWolfAlive=await page.evaluate(id=>window.__BRIAR_GLEN_DEBUG__.enemy(id)?.dead===false,fieldcraftSetup.wolfId);
    if(!detourWolfAlive||!routeMira.memory.some(m=>m.text.includes('Gathered Briarleaf to make Field Tonic for a shortage'))||state.npcs.find(n=>n.id==='tamsin').memory.some(m=>m.text.includes('Cleared a wolf')))throw new Error(`${vp.name}: Fieldcraft did not solve the blockage as a non-combat alternative ${JSON.stringify(routeMira)}`);

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

    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.rethink('mira'));
    for(let i=0;i<12;i++){
      const done=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.npc('mira').memory.some(m=>m.text.includes('Prepared a Field Tonic')));
      if(done)break;
      await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.advance(10));
    }
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());riskMira=state.npcs.find(n=>n.id==='mira');const resumedTamsin=state.npcs.find(n=>n.id==='tamsin');
    const tonicInTown=state.npcs.reduce((sum,n)=>sum+(n.stock.tonic||0),0);
    if(tonicInTown<1||!riskMira.memory.some(m=>m.text.includes('Gathered Briarleaf to make Field Tonic for a shortage'))||!riskMira.memory.some(m=>m.text.includes('Prepared a Field Tonic')))throw new Error(`${vp.name}: Mira did not resume and complete the interrupted production task after danger cleared ${JSON.stringify({riskMira,resumedTamsin})}`);

    const brokered=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setNpcStock('mira','tonic',1);d.setNpcStock('tamsin','tonic',0);d.forceNpcNeed('tamsin','tonic');const t=d.npc('tamsin');d.setPosition(t.x,t.y);return d.useSkill('rapport');});
    if(!brokered)throw new Error(`${vp.name}: Rapport could not broker a live need`);
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    let brokerTamsin=state.npcs.find(n=>n.id==='tamsin'),brokerMira=state.npcs.find(n=>n.id==='mira');
    if(brokerTamsin.goal!=='await'||brokerTamsin.brokeredNeed?.supplierId!=='mira'||brokerMira.goal!=='deliver'||brokerMira.socialCommitment?.requesterId!=='tamsin'||brokerMira.socialCommitment?.itemId!=='tonic')throw new Error(`${vp.name}: Rapport did not create a two-sided social commitment ${JSON.stringify({brokerTamsin,brokerMira})}`);
    if(state.player.skills.rapport.xp<7||!brokerTamsin.memory.some(m=>m.text.includes('connected Mira'))||!brokerMira.memory.some(m=>m.text.includes("Tamsin's need")))throw new Error(`${vp.name}: Rapport commitment left no skill/social memory ${JSON.stringify({brokerTamsin,brokerMira})}`);
    for(let i=0;i<8;i++){
      const delivered=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.npc('tamsin').memory.some(m=>m.text.includes('kept the Field Tonic promise you brokered')));
      if(delivered)break;
      await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.advance(3));
    }
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());brokerTamsin=state.npcs.find(n=>n.id==='tamsin');brokerMira=state.npcs.find(n=>n.id==='mira');
    if((brokerTamsin.stock.tonic||0)<1||brokerTamsin.brokeredNeed||brokerMira.socialCommitment||!(brokerTamsin.relations?.mira>0)||!(brokerMira.relations?.tamsin>0)||brokerTamsin.trust<=0||brokerMira.trust<=0)throw new Error(`${vp.name}: brokered delivery did not resolve into real inventory/relationship consequences ${JSON.stringify({brokerTamsin,brokerMira})}`);
    if(!brokerTamsin.memory.some(m=>m.text.includes('promise you brokered'))||!brokerMira.memory.some(m=>m.text.includes('after you connected us')))throw new Error(`${vp.name}: NPCs did not remember the player's brokerage ${JSON.stringify({brokerTamsin,brokerMira})}`);
    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.snapshot?.().npcs?.length===4,{timeout:5000});
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());brokerTamsin=state.npcs.find(n=>n.id==='tamsin');brokerMira=state.npcs.find(n=>n.id==='mira');
    if(!(brokerTamsin.relations?.mira>0)||!brokerTamsin.memory.some(m=>m.text.includes('promise you brokered'))||!brokerMira.memory.some(m=>m.text.includes('after you connected us')))throw new Error(`${vp.name}: brokered social history did not persist`);

    const equipmentSetup=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();const issued=d.npcArtifact('tamsin','blade');d.setNpcArtifactDurability('tamsin','blade',0);d.forceNpcNeed('mira','briarleaf');d.rethink('mira');const target={...d.npc('mira').target};const wolfId=d.spawnWolfAt(target.x,target.y);d.rethink('mira');d.rethink('tamsin');d.advance(4);return{issued,wolfId,target};});
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    let equippedTamsin=state.npcs.find(n=>n.id==='tamsin'),equippedMira=state.npcs.find(n=>n.id==='mira');
    const blockedWolfAlive=await page.evaluate(id=>window.__BRIAR_GLEN_DEBUG__.enemy(id)?.dead===false,equipmentSetup.wolfId);
    if(equipmentSetup.issued?.provenance?.maker!=='Alden'||!blockedWolfAlive||equippedTamsin.goal!=='gear'||equippedTamsin.request?.id!=='blade')throw new Error(`${vp.name}: broken Warden equipment did not block capability/create replacement need ${JSON.stringify({equipmentSetup,equippedTamsin})}`);
    if(!equippedMira.blockedByDanger)throw new Error(`${vp.name}: danger report vanished while Warden lacked usable gear`);

    const replacement=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setSkillLevel('smithing',2);d.give('iron',4,2.8);d.give('wood',1,2.5);d.give('hide',1,2.4);const crafted=d.craft('blade');const before=d.artifact('blade');const t=d.npc('tamsin');d.setPosition(t.x,t.y);const helped=d.help('tamsin');d.rethink('tamsin');return{crafted,helped,before,owned:d.npcArtifact('tamsin','blade')};});
    if(!replacement.crafted||!replacement.helped||replacement.before?.provenance?.maker!=='You'||replacement.owned?.provenance?.maker!=='You')throw new Error(`${vp.name}: player-forged replacement blade did not transfer as the same living item ${JSON.stringify(replacement)}`);

    for(let i=0;i<10;i++){
      const dead=await page.evaluate(id=>window.__BRIAR_GLEN_DEBUG__.enemy(id)?.dead===true,equipmentSetup.wolfId);
      if(dead)break;
      await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.advance(4));
    }
    const replacementWolfDead=await page.evaluate(id=>window.__BRIAR_GLEN_DEBUG__.enemy(id)?.dead===true,equipmentSetup.wolfId);
    const usedBlade=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.npcArtifact('tamsin','blade'));
    state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());equippedTamsin=state.npcs.find(n=>n.id==='tamsin');equippedMira=state.npcs.find(n=>n.id==='mira');
    if(!replacementWolfDead||usedBlade?.provenance?.maker!=='You'||usedBlade.durability>=usedBlade.maxDurability||!usedBlade.provenance.history.some(x=>x.includes('Used by Tamsin to clear danger')))throw new Error(`${vp.name}: owned Warden Blade did not determine/usefully wear through NPC capability ${JSON.stringify({usedBlade,equippedTamsin})}`);
    if(!equippedTamsin.memory.some(m=>m.text.includes('blade you forged'))||!equippedMira.memory.some(m=>m.text.includes('Tamsin cleared the wolf'))||!(equippedMira.relations?.tamsin>0))throw new Error(`${vp.name}: NPC capability use left no social/maker consequence ${JSON.stringify({equippedTamsin,equippedMira})}`);

    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.9.0',{timeout:5000});
    const persistedBlade=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.npcArtifact('tamsin','blade'));
    if(persistedBlade?.provenance?.maker!=='You'||persistedBlade.durability!==usedBlade.durability||!persistedBlade.provenance.history.some(x=>x.includes('Used by Tamsin to clear danger')))throw new Error(`${vp.name}: NPC capability item history/condition did not persist ${JSON.stringify(persistedBlade)}`);

    const serviceSetup=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();const before=d.npcArtifact('tamsin','blade');d.setNpcArtifactDurability('tamsin','blade',0);d.forceNpcNeed('mira','briarleaf');d.rethink('mira');const target={...d.npc('mira').target};const wolfId=d.spawnWolfAt(target.x,target.y);d.rethink('mira');d.rethink('tamsin');d.advance(2);d.give('iron',1,1.5);d.setSkillLevel('smithing',3);const t=d.npc('tamsin');d.setPosition(t.x,t.y);const coinsBefore=d.snapshot().player.coins;const repaired=d.useSkill('smithing');return{before,wolfId,coinsBefore,repaired,after:d.npcArtifact('tamsin','blade'),state:d.snapshot()};});
    if(!serviceSetup.repaired||serviceSetup.before?.provenance?.maker!=='Alden'||serviceSetup.after?.provenance?.maker!=='Alden'||serviceSetup.after.provenance.repairs!==1||serviceSetup.after.durability<=0||serviceSetup.after.maxDurability!==serviceSetup.before.maxDurability||!serviceSetup.after.provenance.history.some(x=>x.includes('Serviced by You for Tamsin')))throw new Error(`${vp.name}: Smithing service did not restore the same NPC-owned artifact ${JSON.stringify(serviceSetup)}`);
    const serviceTamsin=serviceSetup.state.npcs.find(n=>n.id==='tamsin');
    if(serviceSetup.state.player.coins<=serviceSetup.coinsBefore||serviceSetup.state.player.inventory.iron||serviceSetup.state.player.skills.smithing.xp<8||serviceTamsin.trust<=0||!serviceTamsin.memory.some(m=>m.text.includes('serviced my Warden Blade')))throw new Error(`${vp.name}: NPC repair produced no economic/skill/social consequence ${JSON.stringify(serviceSetup.state)}`);

    for(let i=0;i<10;i++){
      const dead=await page.evaluate(id=>window.__BRIAR_GLEN_DEBUG__.enemy(id)?.dead===true,serviceSetup.wolfId);
      if(dead)break;
      await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.advance(4));
    }
    const servicedWolfDead=await page.evaluate(id=>window.__BRIAR_GLEN_DEBUG__.enemy(id)?.dead===true,serviceSetup.wolfId);
    const servicedBlade=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.npcArtifact('tamsin','blade'));
    if(!servicedWolfDead||servicedBlade?.provenance?.maker!=='Alden'||servicedBlade.provenance.repairs!==1||servicedBlade.durability>=serviceSetup.after.durability||!servicedBlade.provenance.history.some(x=>x.includes('Used by Tamsin to clear danger')))throw new Error(`${vp.name}: repaired NPC equipment did not restore real Warden capability ${JSON.stringify(servicedBlade)}`);

    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.9.0',{timeout:5000});
    const persistedServiceBlade=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.npcArtifact('tamsin','blade'));
    if(persistedServiceBlade?.provenance?.maker!=='Alden'||persistedServiceBlade.provenance.repairs!==1||persistedServiceBlade.durability!==servicedBlade.durability||!persistedServiceBlade.provenance.history.some(x=>x.includes('Serviced by You for Tamsin')))throw new Error(`${vp.name}: NPC Smithing service history did not persist ${JSON.stringify(persistedServiceBlade)}`);

    const herbalToolSetup=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setNpcStock('mira','tonic',0);d.setNpcStock('mira','briarleaf',2);d.setNpcStock('mira','mooncap',1);d.forceNpcNeed('tamsin','tonic');const original=d.npcArtifact('mira','shears');d.setNpcArtifactDurability('mira','shears',0);d.rethink('mira');d.advance(1);return{original,broken:d.npcArtifact('mira','shears'),state:d.snapshot()};});
    let professionMira=herbalToolSetup.state.npcs.find(n=>n.id==='mira');
    if(herbalToolSetup.original?.provenance?.maker!=='Alden'||herbalToolSetup.broken?.durability!==0||(professionMira.stock.tonic||0)!==0||professionMira.goal!=='gear'||professionMira.request?.id!=='shears')throw new Error(`${vp.name}: broken Herbal Shears did not halt medicine work/create service demand ${JSON.stringify(herbalToolSetup)}`);

    const herbalRepair=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('iron',1,1.5);d.setSkillLevel('smithing',3);const m=d.npc('mira');d.setPosition(m.x,m.y);const coinsBefore=d.snapshot().player.coins;const repaired=d.useSkill('smithing');const after=d.npcArtifact('mira','shears');d.advance(1);return{coinsBefore,repaired,after,used:d.npcArtifact('mira','shears'),state:d.snapshot()};});
    professionMira=herbalRepair.state.npcs.find(n=>n.id==='mira');
    if(!herbalRepair.repaired||herbalRepair.after?.provenance?.maker!=='Alden'||herbalRepair.after.provenance.repairs!==1||herbalRepair.after.durability<=0||!herbalRepair.after.provenance.history.some(x=>x.includes('Serviced by You for Mira')))throw new Error(`${vp.name}: Mira's exact work tool was not restored by Smithing ${JSON.stringify(herbalRepair)}`);
    if((professionMira.stock.tonic||0)<1||herbalRepair.used.durability>=herbalRepair.after.durability||!herbalRepair.used.provenance.history.some(x=>x.includes('Used by Mira to prepare Field Tonic'))||herbalRepair.state.player.coins<=herbalRepair.coinsBefore||professionMira.trust<=0)throw new Error(`${vp.name}: repaired Herbal Shears did not restore productive/economic capability ${JSON.stringify(herbalRepair)}`);

    const forgeToolSetup=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setNpcStock('alden','pick',0);d.setNpcStock('alden','iron',3);d.setNpcStock('alden','wood',1);d.forceNpcNeed('tamsin','pick');const original=d.npcArtifact('alden','hammer');d.setNpcArtifactDurability('alden','hammer',0);d.rethink('alden');d.advance(1);return{original,broken:d.npcArtifact('alden','hammer'),state:d.snapshot()};});
    let professionAlden=forgeToolSetup.state.npcs.find(n=>n.id==='alden');
    if(forgeToolSetup.original?.provenance?.maker!=='Alden'||forgeToolSetup.broken?.durability!==0||(professionAlden.stock.pick||0)!==0||professionAlden.goal!=='gear'||professionAlden.request?.id!=='hammer')throw new Error(`${vp.name}: broken Forge Hammer did not halt smith production/create service demand ${JSON.stringify(forgeToolSetup)}`);

    const forgeRepair=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.give('iron',1,1.5);d.setSkillLevel('smithing',4);const a=d.npc('alden');d.setPosition(a.x,a.y);const coinsBefore=d.snapshot().player.coins;const repaired=d.useSkill('smithing');const after=d.npcArtifact('alden','hammer');d.advance(1);d.rethink('tamsin');d.advance(14);return{coinsBefore,repaired,after,used:d.npcArtifact('alden','hammer'),state:d.snapshot()};});
    professionAlden=forgeRepair.state.npcs.find(n=>n.id==='alden');const professionTamsin=forgeRepair.state.npcs.find(n=>n.id==='tamsin');
    if(!forgeRepair.repaired||forgeRepair.after?.provenance?.maker!=='Alden'||forgeRepair.after.provenance.repairs!==1||forgeRepair.after.durability<=0||!forgeRepair.after.provenance.history.some(x=>x.includes('Serviced by You for Alden')))throw new Error(`${vp.name}: Alden's exact Forge Hammer was not restored by Smithing ${JSON.stringify(forgeRepair)}`);
    if(!forgeRepair.used.provenance.history.some(x=>x.includes('Used by Alden to forge an Iron Pick'))||forgeRepair.used.durability>=forgeRepair.after.durability||forgeRepair.state.player.coins<=forgeRepair.coinsBefore||professionAlden.trust<=0)throw new Error(`${vp.name}: repaired Forge Hammer did not restore productive/economic capability ${JSON.stringify(forgeRepair)}`);
    if((professionTamsin.stock.pick||0)<1||!professionTamsin.memory.some(m=>m.text.includes('Alden supplied Iron Pick')))throw new Error(`${vp.name}: restored forge production did not propagate to downstream NPC need ${JSON.stringify({professionAlden,professionTamsin})}`);

    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.9.0',{timeout:5000});
    const persistedHammer=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.npcArtifact('alden','hammer'));
    if(persistedHammer?.provenance?.maker!=='Alden'||persistedHammer.provenance.repairs!==1||persistedHammer.durability!==forgeRepair.used.durability||!persistedHammer.provenance.history.some(x=>x.includes('Used by Alden to forge an Iron Pick')))throw new Error(`${vp.name}: profession-tool service/use history did not persist ${JSON.stringify(persistedHammer)}`);

    if(errors.length)throw new Error(`${vp.name}: runtime errors: ${errors.join(' | ')}`);
    const canvas=await page.locator('#game').boundingBox();if(!canvas||canvas.width<250||canvas.height<140)throw new Error(`${vp.name}: canvas unusable`);
    console.log(`PASS ${vp.name}: living AI + causal production + profession-tool dependencies + service economy + equipment capability + persistent item lineage`);
    await context.close();
  }
} finally { await browser.close(); }
