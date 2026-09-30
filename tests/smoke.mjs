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
    await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.21.0',{timeout:5000});
    let state=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    if(state.npcs.length!==4)throw new Error(`${vp.name}: expected four autonomous NPCs`);
    if(!state.npcs.every(n=>n.goalText&&Array.isArray(n.memory)))throw new Error(`${vp.name}: NPC cognition surface missing`);
    if(state.resources<30)throw new Error(`${vp.name}: resource world under-seeded`);

    if(vp.touch){
      const canvas=page.locator('#game'),box=await canvas.boundingBox();
      if(!box)throw new Error(`${vp.name}: canvas missing for touch navigation`);
      const beforeTap=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player);
      await canvas.tap({position:{x:box.width*.78,y:box.height*.5}});
      const navAfterTap=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.navigation());
      if(!navAfterTap.active)throw new Error(`${vp.name}: real canvas tap did not start navigation`);
      await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.advance(1.2));
      const afterTap=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot().player);
      if(afterTap.x<=beforeTap.x+80)throw new Error(`${vp.name}: tap-to-move did not materially move player ${JSON.stringify({beforeTap,afterTap,navAfterTap})}`);

      await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.tapWorld(1500,600);});
      await page.keyboard.down('ArrowLeft');
      const cancelled=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.navigation());
      await page.keyboard.up('ArrowLeft');
      if(cancelled.active)throw new Error(`${vp.name}: manual movement did not cancel tap navigation`);

      const npcTap=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setPosition(1250,545);return d.tapTarget('npc','alden');});
      if(!npcTap)throw new Error(`${vp.name}: could not target NPC for smart tap`);
      for(let i=0;i<60;i++){const nav=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.navigation());if(!nav.active)break;await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.advance(.2));}
      const nearAlden=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,s=d.snapshot(),a=d.npc('alden');return{gap:Math.hypot(s.player.x-a.x,s.player.y-a.y),nav:d.navigation()};});
      const nearbyText=await page.locator('#nearby').innerText();
      if(nearAlden.nav.active||nearAlden.gap>72||!nearbyText.includes('Alden'))throw new Error(`${vp.name}: smart tap did not walk to and interact with NPC ${JSON.stringify({nearAlden,nearbyText})}`);

      const gathered=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__,r=d.resourceOfType('iron');if(!r)return{ok:false};d.setPosition(r.x+110,r.y);const before=d.snapshot().player.inventory.iron?.qty||0,ok=d.tapTarget('resource',r.id);for(let i=0;i<20&&d.navigation().active;i++)d.advance(.2);const after=d.snapshot().player.inventory.iron?.qty||0;return{ok,before,after,nav:d.navigation()};});
      if(!gathered.ok||gathered.nav.active||gathered.after<=gathered.before)throw new Error(`${vp.name}: smart tap did not walk to and gather resource ${JSON.stringify(gathered)}`);
    }

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
    const bladeUse=usedBlade.provenance.history.find(x=>x.includes('Used by Tamsin to clear danger for ')),helpedName=bladeUse?.match(/danger for (.+) on Day/)?.[1],helpedReporter=state.npcs.find(n=>n.name===helpedName);
    if(!equippedTamsin.memory.some(m=>m.text.includes('blade you forged'))||!helpedReporter||!helpedReporter.memory.some(m=>m.text.includes('Tamsin cleared the wolf'))||!(helpedReporter.relations?.tamsin>0)||helpedReporter.blockedByDanger?.enemyId===equipmentSetup.wolfId)throw new Error(`${vp.name}: restored Warden capability did not create social/maker consequence for the NPC actually helped ${JSON.stringify({bladeUse,helpedName,equippedTamsin,helpedReporter})}`);

    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.21.0',{timeout:5000});
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

    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.21.0',{timeout:5000});
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

    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.21.0',{timeout:5000});
    const persistedHammer=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.npcArtifact('alden','hammer'));
    if(persistedHammer?.provenance?.maker!=='Alden'||persistedHammer.provenance.repairs!==1||persistedHammer.durability!==forgeRepair.used.durability||!persistedHammer.provenance.history.some(x=>x.includes('Used by Alden to forge an Iron Pick')))throw new Error(`${vp.name}: profession-tool service/use history did not persist ${JSON.stringify(persistedHammer)}`);

    const personalCall=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setSkillLevel('smithing',3);d.setNpcArtifactDurability('mira','shears',0);d.give('iron',1,1.4);const m=d.npc('mira');d.setPosition(m.x,m.y);const serviced=d.useSkill('smithing');const immediate=d.snapshot();const rowanKnewImmediately=!!d.npc('rowan').knowledge?.smith?.sources?.some(s=>(s.npcId||s)==='mira');d.rethink('mira');const referralGoal=d.npc('mira').goal;for(let i=0;i<15&&!d.npc('rowan').knowledge?.smith?.sources?.some(s=>(s.npcId||s)==='mira');i++)d.advance(1);const afterReferral=d.snapshot();d.setNpcArtifactDurability('mira','shears',0);d.setPosition(1350,620);const before=d.snapshot(),start=Math.hypot(d.npc('mira').x-before.player.x,d.npc('mira').y-before.player.y);d.rethink('mira');const goal=d.npc('mira').goal;d.advance(4);const after=d.snapshot(),end=Math.hypot(d.npc('mira').x-after.player.x,d.npc('mira').y-after.player.y);return{serviced,immediate,rowanKnewImmediately,referralGoal,afterReferral,before,after,start,end,goal,mira:d.npc('mira')};});
    const personalMira=personalCall.after.npcs.find(n=>n.id==='mira'),referredRowan=personalCall.afterReferral.npcs.find(n=>n.id==='rowan'),referringMira=personalCall.afterReferral.npcs.find(n=>n.id==='mira');
    if(!personalCall.serviced||personalCall.immediate.player.servicesCompleted!==1||personalCall.rowanKnewImmediately||personalCall.referralGoal!=='refer'||personalCall.immediate.npcs.find(n=>n.id==='mira').pendingReferral?.recipientId!=='rowan')throw new Error(`${vp.name}: Smithing referral was not queued as a real social action ${JSON.stringify(personalCall.immediate)}`);
    if(!referredRowan.knowledge?.smith?.sources?.some(s=>(s.npcId||s)==='mira')||!referredRowan.memory.some(m=>m.text.includes('Mira told me you keep people\'s gear working'))||referringMira.pendingReferral||!referringMira.memory.some(m=>m.text.includes('I told Rowan')))throw new Error(`${vp.name}: Mira did not physically deliver the Smithing referral to Rowan ${JSON.stringify(personalCall.afterReferral)}`);
    if(personalCall.goal!=='seekService'||personalMira.seekingServiceFor!=='shears'||(personalCall.end>75&&personalCall.end>=personalCall.start-100)||!personalMira.memory.some(m=>m.text.includes('went looking for you')))throw new Error(`${vp.name}: personally-serviced NPC did not seek the known smith when gear failed again ${JSON.stringify(personalCall)}`);

    const townCall=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.setNpcArtifactDurability('mira','shears',50);d.rethink('mira');d.setNpcArtifactDurability('tamsin','blade',0);d.give('iron',1,1.4);const t=d.npc('tamsin');d.setPosition(t.x,t.y);const second=d.useSkill('smithing');const immediateSecond=d.snapshot();const aldenKnewImmediately=!!d.npc('alden').knowledge?.smith?.sources?.some(s=>(s.npcId||s)==='tamsin');d.rethink('tamsin');const firstGoal=d.npc('tamsin').goal,pendingDuringInterruption=d.npc('tamsin').pendingReferral?.recipientId||null;if(firstGoal!=='refer'){d.clearEnemies();d.rethink('tamsin');}const referralGoal=d.npc('tamsin').goal;for(let i=0;i<18&&!d.npc('alden').knowledge?.smith?.sources?.some(s=>(s.npcId||s)==='tamsin');i++)d.advance(1);const afterSecond=d.snapshot();const aldenBefore=d.npc('alden');const hadPersonalHistory=aldenBefore.memory.some(m=>m.text.includes('You serviced my '));d.setNpcArtifactDurability('alden','hammer',0);d.setPosition(1300,545);const before=d.snapshot(),start=Math.hypot(d.npc('alden').x-before.player.x,d.npc('alden').y-before.player.y);d.rethink('alden');const goal=d.npc('alden').goal;for(let i=0;i<24;i++){const s=d.snapshot(),a=d.npc('alden'),gap=Math.hypot(a.x-s.player.x,a.y-s.player.y);if(gap<=70)break;d.advance(1);}const approached=d.snapshot(),end=Math.hypot(d.npc('alden').x-approached.player.x,d.npc('alden').y-approached.player.y);d.give('iron',1,1.4);const third=d.useSkill('smithing');return{second,third,immediateSecond,aldenKnewImmediately,firstGoal,pendingDuringInterruption,referralGoal,afterSecond,approached,final:d.snapshot(),start,end,goal,hadPersonalHistory,alden:d.npc('alden')};});
    const townAlden=townCall.final.npcs.find(n=>n.id==='alden'),referredAlden=townCall.afterSecond.npcs.find(n=>n.id==='alden'),referringTamsin=townCall.afterSecond.npcs.find(n=>n.id==='tamsin');
    if(!townCall.second||townCall.immediateSecond.player.servicesCompleted!==2||townCall.aldenKnewImmediately||townCall.pendingDuringInterruption!=='alden'||townCall.immediateSecond.npcs.find(n=>n.id==='tamsin').pendingReferral?.recipientId!=='alden')throw new Error(`${vp.name}: Tamsin's referral was not preserved while higher-priority work could intervene ${JSON.stringify(townCall)}`);
    if(townCall.referralGoal!=='refer')throw new Error(`${vp.name}: queued referral did not resume after urgent interruption cleared ${JSON.stringify(townCall)}`);
    if(townCall.hadPersonalHistory||!referredAlden.knowledge?.smith?.sources?.some(s=>(s.npcId||s)==='tamsin')||!referredAlden.memory.some(m=>m.text.includes('Tamsin told me you keep people\'s gear working'))||referringTamsin.pendingReferral||!referringTamsin.memory.some(m=>m.text.includes('I told Alden')))throw new Error(`${vp.name}: Smithing reputation did not arrive through Tamsin physically telling Alden ${JSON.stringify(townCall.afterSecond)}`);
    if(townCall.goal!=='seekService'||townCall.end>75)throw new Error(`${vp.name}: referred unserviced NPC did not seek the player into service range ${JSON.stringify(townCall)}`);
    if(!townCall.third||townCall.final.player.servicesCompleted!==3||townAlden.seekingServiceFor||townAlden.trust<=0||!townAlden.memory.some(m=>m.text.includes('serviced my Forge Hammer'))||townCall.final.player.knownFor!=='keeping the Glen’s gear working')throw new Error(`${vp.name}: sought-out service did not resolve into specialist reputation/consequences ${JSON.stringify(townCall.final)}`);

    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.21.0',{timeout:5000});
    const persistedSpecialist=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot());
    const persistedAlden=persistedSpecialist.npcs.find(n=>n.id==='alden'),persistedRowan=persistedSpecialist.npcs.find(n=>n.id==='rowan');
    if(persistedSpecialist.player.servicesCompleted!==3||persistedSpecialist.player.knownFor!=='keeping the Glen’s gear working'||!persistedAlden.memory.some(m=>m.text.includes('serviced my Forge Hammer'))||!persistedAlden.knowledge?.smith?.sources?.some(s=>(s.npcId||s)==='tamsin')||!persistedRowan.knowledge?.smith?.sources?.some(s=>(s.npcId||s)==='mira'))throw new Error(`${vp.name}: social specialist reputation did not persist ${JSON.stringify(persistedSpecialist.player)}`);

    const lowTrustBelief=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setSkillLevel('smithing',3);d.setRelation('alden','tamsin',-4);d.setNpcArtifactDurability('tamsin','blade',0);d.give('iron',1,1.4);const t=d.npc('tamsin');d.setPosition(t.x,t.y);const serviced=d.useSkill('smithing');d.rethink('tamsin');for(let i=0;i<100&&!d.npc('alden').knowledge?.smith?.sources?.some(s=>(s.npcId||s)==='tamsin');i++)d.advance(.5);const heard=d.snapshot(),evidence=d.smithEvidence('alden');d.setNpcArtifactDurability('alden','hammer',0);d.setPosition(1300,545);const goal=d.rethink('alden');return{serviced,heard,evidence,goal,alden:d.npc('alden')};});
    const lowAlden=lowTrustBelief.heard.npcs.find(n=>n.id==='alden'),lowSource=lowAlden.knowledge?.smith?.sources?.find(s=>(s.npcId||s)==='tamsin');
    if(!lowTrustBelief.serviced||!lowSource||lowSource.confidence>=.5||lowTrustBelief.evidence>=.5||!lowAlden.memory.some(m=>m.text.includes('not sure I trust that recommendation'))||lowTrustBelief.goal==='seekService')throw new Error(`${vp.name}: low-trust rumor incorrectly became actionable Smithing knowledge ${JSON.stringify(lowTrustBelief)}`);

    const trustedBelief=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setSkillLevel('smithing',3);d.setRelation('alden','tamsin',4);d.setNpcArtifactDurability('tamsin','blade',0);d.give('iron',1,1.4);const t=d.npc('tamsin');d.setPosition(t.x,t.y);const first=d.useSkill('smithing');d.rethink('tamsin');for(let i=0;i<100&&!d.npc('alden').knowledge?.smith?.sources?.some(s=>(s.npcId||s)==='tamsin');i++)d.advance(.5);const heard=d.snapshot(),heardEvidence=d.smithEvidence('alden'),relationBefore=d.npc('alden').relations?.tamsin||0;d.setNpcArtifactDurability('alden','hammer',0);d.setPosition(1300,545);const goal=d.rethink('alden');for(let i=0;i<24;i++){const s=d.snapshot(),a=d.npc('alden'),gap=Math.hypot(a.x-s.player.x,a.y-s.player.y);if(gap<=70)break;d.advance(1);}d.give('iron',1,1.4);const second=d.useSkill('smithing'),final=d.snapshot(),relationAfter=d.npc('alden').relations?.tamsin||0;return{first,second,heard,heardEvidence,goal,final,relationBefore,relationAfter,alden:d.npc('alden')};});
    const trustedAlden=trustedBelief.final.npcs.find(n=>n.id==='alden'),trustedSource=trustedAlden.knowledge?.smith?.sources?.find(s=>(s.npcId||s)==='tamsin');
    if(!trustedBelief.first||trustedBelief.heardEvidence<.7||trustedBelief.goal!=='seekService'||!trustedBelief.second)throw new Error(`${vp.name}: trusted referral did not drive a real specialist service decision ${JSON.stringify(trustedBelief)}`);
    if(!trustedSource||trustedSource.status!=='confirmed'||trustedSource.confidence<.7||(trustedAlden.knowledge?.smith?.direct?.confidence||0)<.65||trustedAlden.knowledge.smith.direct.services!==1||!trustedAlden.memory.some(m=>m.text.includes("Tamsin's recommendation was right"))||trustedBelief.relationAfter<=trustedBelief.relationBefore)throw new Error(`${vp.name}: direct service did not confirm referral evidence/relationship ${JSON.stringify(trustedBelief)}`);

    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.21.0',{timeout:5000});
    const persistedBelief=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot()),beliefAlden=persistedBelief.npcs.find(n=>n.id==='alden'),beliefSource=beliefAlden.knowledge?.smith?.sources?.find(s=>(s.npcId||s)==='tamsin');
    if((beliefAlden.knowledge?.smith?.direct?.confidence||0)<.65||beliefSource?.status!=='confirmed'||beliefSource.confidence<.7||!beliefAlden.memory.some(m=>m.text.includes("Tamsin's recommendation was right")))throw new Error(`${vp.name}: Smithing belief evidence did not persist ${JSON.stringify(beliefAlden.knowledge)}`);

    const staleBelief=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setSkillLevel('smithing',3);d.setRelation('alden','tamsin',4);d.setNpcArtifactDurability('tamsin','blade',0);d.give('iron',1,1.4);const t=d.npc('tamsin');d.setPosition(t.x,t.y);const serviced=d.useSkill('smithing');d.rethink('tamsin');for(let i=0;i<100&&!d.npc('alden').knowledge?.smith?.sources?.some(s=>(s.npcId||s)==='tamsin');i++)d.advance(.5);const fresh=d.smithEvidence('alden');d.setDay(6);const stale=d.smithEvidence('alden');d.setNpcArtifactDurability('alden','hammer',0);d.setPosition(1300,545);const goal=d.rethink('alden');return{serviced,fresh,stale,goal,state:d.snapshot()};});
    const staleAlden=staleBelief.state.npcs.find(n=>n.id==='alden'),staleSource=staleAlden.knowledge?.smith?.sources?.find(s=>(s.npcId||s)==='tamsin');
    if(!staleBelief.serviced||staleBelief.fresh<.7||staleBelief.stale>=.5||staleBelief.goal==='seekService'||!staleSource||staleSource.status!=='heard')throw new Error(`${vp.name}: hearsay did not age from actionable to stale ${JSON.stringify(staleBelief)}`);

    const contradiction=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setSkillLevel('smithing',3);d.setRelation('alden','tamsin',4);d.setNpcArtifactDurability('tamsin','blade',0);d.give('iron',1,1.4);const t=d.npc('tamsin');d.setPosition(t.x,t.y);const first=d.useSkill('smithing');d.rethink('tamsin');for(let i=0;i<100&&!d.npc('alden').knowledge?.smith?.sources?.some(s=>(s.npcId||s)==='tamsin');i++)d.advance(.5);const beforeBad=d.snapshot(),relationBefore=d.npc('alden').relations?.tamsin||0;d.setNpcArtifactDurability('alden','hammer',0);d.setPosition(1300,545);d.rethink('alden');for(let i=0;i<40;i++){const s=d.snapshot(),a=d.npc('alden'),gap=Math.hypot(a.x-s.player.x,a.y-s.player.y);if(gap<=70)break;d.advance(.5);}d.setSkillLevel('smithing',1);d.give('iron',1,1.1);const poor=d.useSkill('smithing'),afterBad=d.snapshot(),badEvidence=d.smithEvidence('alden'),relationAfterBad=d.npc('alden').relations?.tamsin||0;d.setNpcArtifactDurability('alden','hammer',0);d.setSkillLevel('smithing',4);d.give('iron',1,2);const a=d.npc('alden');d.setPosition(a.x,a.y);const recovery=d.useSkill('smithing'),afterRecovery=d.snapshot(),recoveredEvidence=d.smithEvidence('alden'),relationAfterRecovery=d.npc('alden').relations?.tamsin||0;d.setDay(6);const agedDirect=d.smithEvidence('alden');return{first,poor,recovery,beforeBad,afterBad,afterRecovery,badEvidence,recoveredEvidence,agedDirect,relationBefore,relationAfterBad,relationAfterRecovery,final:d.snapshot()};});
    const badAlden=contradiction.afterBad.npcs.find(n=>n.id==='alden'),badSource=badAlden.knowledge?.smith?.sources?.find(s=>(s.npcId||s)==='tamsin'),recoveredAlden=contradiction.afterRecovery.npcs.find(n=>n.id==='alden'),recoveredSource=recoveredAlden.knowledge?.smith?.sources?.find(s=>(s.npcId||s)==='tamsin');
    if(!contradiction.first||!contradiction.poor||!badSource||badSource.status!=='contradicted'||(badAlden.knowledge?.smith?.direct?.confidence||1)>=.5||contradiction.badEvidence>=.5||!badAlden.memory.some(m=>m.text.includes("Tamsin's recommendation did not hold up"))||contradiction.relationAfterBad>=contradiction.relationBefore)throw new Error(`${vp.name}: poor direct work did not contradict the trusted referral ${JSON.stringify(contradiction.afterBad)}`);
    if(!contradiction.recovery||!recoveredSource||recoveredSource.status!=='confirmed'||(recoveredAlden.knowledge?.smith?.direct?.confidence||0)<.65||contradiction.recoveredEvidence<.65||!recoveredAlden.memory.some(m=>m.text.includes("Tamsin's recommendation was right"))||contradiction.relationAfterRecovery<=contradiction.relationAfterBad)throw new Error(`${vp.name}: later strong work did not rehabilitate Smithing belief ${JSON.stringify(contradiction.afterRecovery)}`);
    if(contradiction.agedDirect<.5)throw new Error(`${vp.name}: first-hand evidence decayed as fast as hearsay ${JSON.stringify(contradiction)}`);

    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.21.0',{timeout:5000});
    const persistedDynamicBelief=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot()),dynamicAlden=persistedDynamicBelief.npcs.find(n=>n.id==='alden'),dynamicSource=dynamicAlden.knowledge?.smith?.sources?.find(s=>(s.npcId||s)==='tamsin');
    if(dynamicSource?.status!=='confirmed'||(dynamicAlden.knowledge?.smith?.direct?.confidence||0)<.65||persistedDynamicBelief.day!==6)throw new Error(`${vp.name}: recovered/aged reputation state did not persist ${JSON.stringify(dynamicAlden.knowledge)}`);

    const friendRoute=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setNpcStock('mira','tonic',1);d.setNpcStock('rowan','tonic',1);d.setNpcStock('tamsin','tonic',0);d.setRelation('tamsin','rowan',3);d.setRelation('rowan','tamsin',3);d.setRelation('tamsin','mira',0);d.setRelation('mira','tamsin',0);d.forceNpcNeed('tamsin','tonic');const goal=d.rethink('tamsin'),chosen=d.npc('tamsin').seekSource;for(let i=0;i<50&&(d.npc('tamsin').stock.tonic||0)<1;i++)d.advance(.25);return{goal,chosen,state:d.snapshot()};});
    const friendTamsin=friendRoute.state.npcs.find(n=>n.id==='tamsin'),friendRowan=friendRoute.state.npcs.find(n=>n.id==='rowan');
    if(friendRoute.goal!=='seek'||friendRoute.chosen!=='rowan'||(friendTamsin.stock.tonic||0)<1||!friendTamsin.memory.some(m=>m.text.includes('Rowan supplied Field Tonic'))||!friendRowan.memory.some(m=>m.text.includes('Tamsin came to me for Field Tonic')))throw new Error(`${vp.name}: strong relationship did not redirect supply toward trusted partner ${JSON.stringify(friendRoute)}`);

    const damagedCooperation=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setSkillLevel('smithing',3);d.setRelation('alden','tamsin',-.8);d.setRelation('tamsin','alden',0);d.setNpcArtifactDurability('tamsin','blade',0);d.give('iron',1,1.4);const t=d.npc('tamsin');d.setPosition(t.x,t.y);const first=d.useSkill('smithing');d.rethink('tamsin');for(let i=0;i<100&&!d.npc('alden').knowledge?.smith?.sources?.some(s=>(s.npcId||s)==='tamsin');i++)d.advance(.5);const referral=d.snapshot(),refEvidence=d.smithEvidence('alden'),relationAfterReferral=d.npc('alden').relations?.tamsin||0;d.setNpcArtifactDurability('alden','hammer',0);d.setPosition(1300,545);const serviceGoal=d.rethink('alden');for(let i=0;i<220;i++){const s=d.snapshot(),a=d.npc('alden'),gap=Math.hypot(a.x-s.player.x,a.y-s.player.y);if(gap<=70)break;d.advance(.25);}d.setSkillLevel('smithing',1);d.give('iron',1,1.1);const poor=d.useSkill('smithing'),afterPoor=d.snapshot(),relationAfterPoor=d.npc('alden').relations?.tamsin||0;d.setNpcStock('alden','pick',1);d.setNpcStock('rowan','pick',1);d.setNpcStock('tamsin','pick',0);d.forceNpcNeed('tamsin','pick');const routeGoal=d.rethink('tamsin'),chosen=d.npc('tamsin').seekSource;for(let i=0;i<80&&(d.npc('tamsin').stock.pick||0)<1;i++)d.advance(.25);return{first,referral,refEvidence,relationAfterReferral,serviceGoal,poor,afterPoor,relationAfterPoor,routeGoal,chosen,final:d.snapshot()};});
    const damagedTamsin=damagedCooperation.final.npcs.find(n=>n.id==='tamsin'),damagedAlden=damagedCooperation.final.npcs.find(n=>n.id==='alden'),damagedRowan=damagedCooperation.final.npcs.find(n=>n.id==='rowan');
    if(!damagedCooperation.first||damagedCooperation.refEvidence<.5||damagedCooperation.serviceGoal!=='seekService'||!damagedCooperation.poor||damagedCooperation.relationAfterReferral<=-.8||damagedCooperation.relationAfterPoor> -1)throw new Error(`${vp.name}: poor recommended work did not damage referrer relationship enough to affect cooperation ${JSON.stringify(damagedCooperation)}`);
    if(damagedCooperation.routeGoal!=='seek'||damagedCooperation.chosen!=='rowan'||(damagedTamsin.stock.pick||0)<1||!damagedTamsin.memory.some(m=>m.text.includes('Rowan supplied Iron Pick'))||damagedTamsin.memory.some(m=>m.text.includes('Alden supplied Iron Pick'))||!damagedRowan.memory.some(m=>m.text.includes('Tamsin came to me for Iron Pick')))throw new Error(`${vp.name}: damaged Alden/Tamsin relationship did not reroute tool supply through Rowan ${JSON.stringify({damagedCooperation,damagedTamsin,damagedAlden,damagedRowan})}`);

    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.21.0',{timeout:5000});
    // Later rescues or cooperation can legitimately heal the relationship; persist the reroute outcome/history, not a frozen trust score.
    const persistedCooperation=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot()),persistedCoopTamsin=persistedCooperation.npcs.find(n=>n.id==='tamsin');
    if((persistedCoopTamsin.stock.pick||0)<1||!persistedCoopTamsin.memory.some(m=>m.text.includes('Rowan supplied Iron Pick'))||persistedCoopTamsin.memory.some(m=>m.text.includes('Alden supplied Iron Pick')))throw new Error(`${vp.name}: relationship-driven supply reroute history did not persist ${JSON.stringify(persistedCooperation.npcs)}`);

    const keptPromise=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setNpcStock('mira','tonic',1);d.setNpcStock('tamsin','tonic',0);d.forceNpcNeed('tamsin','tonic');const t=d.npc('tamsin');d.setPosition(t.x,t.y);const brokered=d.useSkill('rapport');for(let i=0;i<80&&!d.npc('tamsin').memory.some(m=>m.text.includes('kept the Field Tonic promise'));i++)d.advance(.25);return{brokered,state:d.snapshot()};});
    const keptMira=keptPromise.state.npcs.find(n=>n.id==='mira'),keptTamsin=keptPromise.state.npcs.find(n=>n.id==='tamsin');
    if(!keptPromise.brokered||(keptTamsin.stock.tonic||0)<1||keptMira.reliability?.kept!==1||keptMira.reliability?.broken!==0||(keptTamsin.relations?.mira||0)<=0||(keptMira.relations?.tamsin||0)<=0||!keptMira.memory.some(m=>m.text.includes('kept my Field Tonic promise')))throw new Error(`${vp.name}: fulfilled social promise did not build visible reliability/trust ${JSON.stringify(keptPromise)}`);

    const brokenPromise=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.setRelation('tamsin','mira',-.5);d.setRelation('mira','tamsin',-.5);d.setNpcStock('mira','tonic',1);d.setNpcStock('tamsin','tonic',0);d.forceNpcNeed('tamsin','tonic');const t=d.npc('tamsin');d.setPosition(t.x,t.y);const brokered=d.useSkill('rapport'),supplier=d.npc('mira').socialCommitment?.requesterId?'mira':null;d.setNpcStock('mira','tonic',0);d.advance(.25);const afterBreak=d.snapshot();d.setNpcStock('mira','tonic',1);d.setNpcStock('rowan','tonic',1);d.setNpcStock('tamsin','tonic',0);d.forceNpcNeed('tamsin','tonic');const routeGoal=d.rethink('tamsin'),chosen=d.npc('tamsin').seekSource;for(let i=0;i<80&&(d.npc('tamsin').stock.tonic||0)<1;i++)d.advance(.25);return{brokered,supplier,afterBreak,routeGoal,chosen,final:d.snapshot()};});
    const brokenMira=brokenPromise.afterBreak.npcs.find(n=>n.id==='mira'),brokenTamsin=brokenPromise.afterBreak.npcs.find(n=>n.id==='tamsin'),reroutedTamsin=brokenPromise.final.npcs.find(n=>n.id==='tamsin'),reroutedRowan=brokenPromise.final.npcs.find(n=>n.id==='rowan');
    if(!brokenPromise.brokered||brokenPromise.supplier!=='mira'||brokenMira.reliability?.broken!==1||brokenMira.reliability?.kept!==0||(brokenTamsin.relations?.mira||0)>-1||!brokenTamsin.memory.some(m=>m.text.includes('Mira broke the Field Tonic promise'))||!brokenMira.memory.some(m=>m.text.includes('I broke my Field Tonic promise')))throw new Error(`${vp.name}: broken promise did not damage local reliability/relationship ${JSON.stringify(brokenPromise.afterBreak)}`);
    if(brokenPromise.routeGoal!=='seek'||brokenPromise.chosen!=='rowan'||(reroutedTamsin.stock.tonic||0)<1||!reroutedTamsin.memory.some(m=>m.text.includes('Rowan supplied Field Tonic'))||reroutedTamsin.memory.some(m=>m.text.includes('Mira supplied Field Tonic'))||!reroutedRowan.memory.some(m=>m.text.includes('Tamsin came to me for Field Tonic')))throw new Error(`${vp.name}: broken promise did not reroute future cooperation ${JSON.stringify(brokenPromise)}`);

    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.21.0',{timeout:5000});
    const persistedPromise=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.snapshot()),persistedPromiseMira=persistedPromise.npcs.find(n=>n.id==='mira'),persistedPromiseTamsin=persistedPromise.npcs.find(n=>n.id==='tamsin');
    if(persistedPromiseMira.reliability?.broken!==1||(persistedPromiseTamsin.relations?.mira||0)>-1||!persistedPromiseTamsin.memory.some(m=>m.text.includes('Rowan supplied Field Tonic')))throw new Error(`${vp.name}: promise reliability/cooperation consequence did not persist ${JSON.stringify(persistedPromise.npcs)}`);

    const autonomousHelp=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.forceNpcNeed('alden','iron');const enabled=d.setApprentice(true);for(let i=0;i<420&&!d.apprentice().objectiveHistory.some(o=>o.id==='request:alden:iron'&&o.status==='completed');i++)d.advance(.25);return{enabled,agent:d.apprentice(),state:d.snapshot()};});
    const autonomousAlden=autonomousHelp.state.npcs.find(n=>n.id==='alden');
    if(!autonomousHelp.enabled||!autonomousAlden.memory.some(m=>m.text.includes('You brought')&&m.text.includes('Iron Ore'))||autonomousHelp.agent.decisions<4||autonomousHelp.agent.successes<4||(autonomousHelp.agent.values?.gather?.tries||0)<2||(autonomousHelp.agent.values?.help?.tries||0)<2||(autonomousHelp.agent.contexts?.['gather:npc:alden:iron']?.tries||0)<2||(autonomousHelp.agent.contexts?.['help:npc:alden:iron']?.tries||0)<2||!autonomousHelp.agent.objectiveHistory.some(o=>o.id==='request:alden:iron'&&o.status==='completed')||!autonomousHelp.agent.memory.some(m=>m.text.includes('Objective completed')))throw new Error(`${vp.name}: Autonomous Apprentice did not carry Alden's objective across gather/help steps with contextual learning ${JSON.stringify(autonomousHelp)}`);
    if(autonomousHelp.state.player.coins<=24||autonomousAlden.trust<=0)throw new Error(`${vp.name}: autonomous help produced no real economic/social consequence ${JSON.stringify(autonomousHelp.state.player)}`);

    const energyPause=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();for(const id of ['alden','mira','rowan','tamsin'])d.setNpcStock(id,'bread',5);d.setNpcArtifactDurability('tamsin','blade',0);d.setEnergy(35);d.setApprentice(true);d.advance(.3);const before=d.apprentice();d.setEnergy(6);d.advance(.2);const paused=d.apprentice(),pausedEnergy=d.snapshot().player.energy;d.advance(20);return{before,paused,pausedEnergy,resumed:d.apprentice(),state:d.snapshot(),blade:d.npcArtifact('tamsin','blade')};});
    const serviceRetained=energyPause.resumed.objective?.id==='service:tamsin:blade'||energyPause.resumed.objectiveHistory.some(o=>o.id==='service:tamsin:blade'&&o.status==='completed');
    if(energyPause.before.objective?.id!=='service:tamsin:blade'||energyPause.paused.objective?.id!=='service:tamsin:blade'||energyPause.paused.plan?.kind!=='rest'||energyPause.paused.interruptions!==1||!energyPause.paused.memory.some(m=>m.text.includes('too exhausted'))||!serviceRetained||(energyPause.resumed.contexts?.['rest:low-energy']?.tries||0)<1||energyPause.state.player.energy<20)throw new Error(`${vp.name}: Apprentice did not pause, rest, and preserve the same service objective ${JSON.stringify(energyPause)}`);

    const autonomousService=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();d.give('iron',1,1.4);d.setNpcArtifactDurability('tamsin','blade',0);const enabled=d.setApprentice(true);for(let i=0;i<180&&(d.npcArtifact('tamsin','blade')?.provenance?.repairs||0)<1;i++)d.advance(.25);return{enabled,agent:d.apprentice(),state:d.snapshot(),blade:d.npcArtifact('tamsin','blade')};});
    const autonomousTamsin=autonomousService.state.npcs.find(n=>n.id==='tamsin');
    if(!autonomousService.enabled||!autonomousTamsin.memory.some(m=>m.text.includes('Warden Blade')&&(m.text.includes('serviced')||m.text.includes('repaired')))||(autonomousService.agent.values?.service?.tries||0)<1||(autonomousService.agent.contexts?.['service:npc:tamsin:blade']?.tries||0)<1||!autonomousService.agent.objectiveHistory.some(o=>o.id==='service:tamsin:blade'&&o.status==='completed')||autonomousService.blade?.durability<=0||autonomousService.blade?.provenance?.repairs<1||autonomousService.state.player.skills.smithing.xp<8)throw new Error(`${vp.name}: Autonomous Apprentice did not independently complete and learn the Tamsin service objective ${JSON.stringify(autonomousService)}`);

    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.21.0',{timeout:5000});
    const persistedApprentice=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.apprentice());
    if((persistedApprentice.values?.service?.tries||0)<1||(persistedApprentice.contexts?.['service:npc:tamsin:blade']?.tries||0)<1||!persistedApprentice.objectiveHistory.some(o=>o.id==='service:tamsin:blade'&&o.status==='completed')||persistedApprentice.memory.length<1||persistedApprentice.decisions<1)throw new Error(`${vp.name}: Apprentice contextual learning/objective history did not persist ${JSON.stringify(persistedApprentice)}`);
    const apprenticeButton=page.locator('#apprentice-toggle');if(!await apprenticeButton.isVisible())throw new Error(`${vp.name}: Apprentice control is not visible`);
    await page.keyboard.press('ArrowLeft');
    const afterManual=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.apprentice());
    if(afterManual.enabled||!afterManual.memory.some(m=>m.text.includes('Manual keyboard input took control')))throw new Error(`${vp.name}: manual input did not instantly take control back from the Apprentice ${JSON.stringify(afterManual)}`);

    const emergentIdentity=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();const full={alden:{iron:3,wood:3,bread:5},mira:{briarleaf:3,mooncap:3,bread:5},rowan:{bread:5,tonic:3,wood:3},tamsin:{tonic:3,hide:3,pick:1,bread:5}};for(const [npc,items] of Object.entries(full))for(const [id,qty] of Object.entries(items))d.setNpcStock(npc,id,qty);const jobs=[['alden','hammer'],['mira','shears'],['tamsin','blade']],episodes=[];for(const [npc,item] of jobs){d.give('iron',1,1.5);d.setNpcArtifactDurability(npc,item,0);const before=d.npcArtifact(npc,item)?.provenance?.repairs||0;d.setApprentice(true);for(let i=0;i<120&&(d.npcArtifact(npc,item)?.provenance?.repairs||0)<=before;i++)d.advance(.25);episodes.push({npc,item,repaired:d.npcArtifact(npc,item)?.provenance?.repairs||0,identity:d.apprenticeIdentity()});d.setApprentice(false);}return{episodes,agent:d.apprentice(),identity:d.apprenticeIdentity(),serviceBias:d.apprenticeBias('service'),combatBias:d.apprenticeBias('combat'),state:d.snapshot()};});
    if(emergentIdentity.identity.label!=='Smith'||emergentIdentity.identity.key!=='smith'||emergentIdentity.identity.confidence<.5||(emergentIdentity.agent.specialties?.smith||0)<2.25||emergentIdentity.serviceBias<=emergentIdentity.combatBias||!emergentIdentity.agent.memory.some(m=>m.text.includes('Identity emerging: Smith')))throw new Error(`${vp.name}: repeated successful Smithing did not produce an emergent, non-class-selected Smith identity ${JSON.stringify(emergentIdentity)}`);
    if((emergentIdentity.agent.values?.service?.tries||0)<3||emergentIdentity.state.player.skills.smithing.xp<24)throw new Error(`${vp.name}: Smith identity appeared without enough real service experience ${JSON.stringify(emergentIdentity.agent)}`);
    const identityText=await page.locator('#apprentice-score').innerText();
    if(!identityText.includes('Smith'))throw new Error(`${vp.name}: emergent Apprentice identity is not visible in the UI ${identityText}`);
    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.21.0',{timeout:5000});
    const persistedIdentity=await page.evaluate(()=>({agent:window.__BRIAR_GLEN_DEBUG__.apprentice(),identity:window.__BRIAR_GLEN_DEBUG__.apprenticeIdentity(),serviceBias:window.__BRIAR_GLEN_DEBUG__.apprenticeBias('service')}));
    if(persistedIdentity.identity.label!=='Smith'||(persistedIdentity.agent.specialties?.smith||0)<2.25||persistedIdentity.serviceBias<=0)throw new Error(`${vp.name}: emergent Apprentice identity/specialty evidence did not persist ${JSON.stringify(persistedIdentity)}`);

    const providerClient=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.clearEnemies();const deliveries=[];for(let i=0;i<2;i++){d.forceNpcNeed('alden','iron');const a=d.npc('alden'),req={...a.request};d.give('iron',req.qty,1.5);d.setPosition(a.x,a.y);deliveries.push({ok:d.help('alden'),qty:req.qty,evidence:d.providerEvidence('alden','iron')});}const learned=d.snapshot(),evidence=d.providerEvidence('alden','iron');d.forceNpcNeed('alden','iron');const req={...d.npc('alden').request};d.give('iron',req.qty,1.5);d.setPosition(1500,545);const start=Math.hypot(d.npc('alden').x-1500,d.npc('alden').y-545),goal=d.rethink('alden');for(let i=0;i<160;i++){const s=d.snapshot(),a=d.npc('alden'),gap=Math.hypot(a.x-s.player.x,a.y-s.player.y);if(gap<=70)break;d.advance(.25);}const approached=d.snapshot(),a=d.npc('alden'),end=Math.hypot(a.x-approached.player.x,a.y-approached.player.y),beforeThird=a.knowledge?.provider?.items?.iron?.deliveries||0;d.setApprentice(true);for(let i=0;i<120&&(d.npc('alden').knowledge?.provider?.items?.iron?.deliveries||0)<=beforeThird;i++)d.advance(.25);return{deliveries,learned,evidence,goal,start,end,beforeThird,after:d.snapshot(),agent:d.apprentice(),providerEvidence:d.providerEvidence('alden','iron')};});
    const providerAldenLearned=providerClient.learned.npcs.find(n=>n.id==='alden'),providerAlden=providerClient.after.npcs.find(n=>n.id==='alden'),ironProvider=providerAlden.knowledge?.provider?.items?.iron;
    if(!providerClient.deliveries.every(x=>x.ok)||providerClient.deliveries[0].evidence>=.6||providerClient.evidence<.6||ironProvider?.deliveries<3||providerClient.providerEvidence<.6||!providerAldenLearned.memory.some(m=>m.text.includes('rely on you for it')))throw new Error(`${vp.name}: repeated real deliveries did not create item-specific provider knowledge ${JSON.stringify(providerClient)}`);
    if(providerClient.goal!=='seekProvider'||providerClient.end>75||providerClient.end>=providerClient.start||!providerAlden.memory.some(m=>m.text.includes("you've supplied my Iron Ore before"))||providerAlden.seekingProviderFor)throw new Error(`${vp.name}: proven repeat client did not physically seek the player for known supplies ${JSON.stringify(providerClient)}`);
    if((providerClient.agent.contexts?.['help:npc:alden:iron']?.tries||0)<1||!providerAlden.memory.filter(m=>m.text.includes('You brought')&&m.text.includes('Iron Ore')).length)throw new Error(`${vp.name}: Apprentice did not answer the seeking repeat client through its normal Help action ${JSON.stringify(providerClient.agent)}`);
    await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__BRIAR_GLEN_DEBUG__?.build?.().version==='0.21.0',{timeout:5000});
    const persistedProvider=await page.evaluate(()=>({state:window.__BRIAR_GLEN_DEBUG__.snapshot(),evidence:window.__BRIAR_GLEN_DEBUG__.providerEvidence('alden','iron')})),persistedProviderAlden=persistedProvider.state.npcs.find(n=>n.id==='alden');
    if(persistedProvider.evidence<.6||(persistedProviderAlden.knowledge?.provider?.items?.iron?.deliveries||0)<3||!persistedProviderAlden.memory.some(m=>m.text.includes('rely on you for it')))throw new Error(`${vp.name}: repeat-client provider knowledge did not persist ${JSON.stringify(persistedProviderAlden.knowledge)}`);

    if(vp.name==='desktop'){
      const soak=await page.evaluate(()=>{const d=window.__BRIAR_GLEN_DEBUG__;d.reset();d.setApprentice(true);d.advance(180);return{agent:d.apprentice(),state:d.snapshot()};});
      const learnedContexts=Object.entries(soak.agent.contexts||{}).filter(([,v])=>(v.tries||0)>0),successRate=soak.agent.decisions?soak.agent.successes/soak.agent.decisions:0,active=soak.agent.plan;
      if(soak.agent.decisions<8||soak.agent.successes<3||learnedContexts.length<3||successRate<.25||(active?.elapsed||0)>55||(active?.kind==='combat'&&soak.state.player.energy<8))throw new Error(`${vp.name}: long autonomous soak exposed a stuck/unsafe Apprentice loop ${JSON.stringify({agent:soak.agent,state:soak.state.player,contexts:learnedContexts})}`);
      const topContexts=learnedContexts.sort((a,b)=>Number(b[1].value||0)-Number(a[1].value||0)).slice(0,5).map(([key,v])=>({key,tries:v.tries,value:Number(v.value||0).toFixed(2),failStreak:v.failStreak||0}));
      const soakIdentity=await page.evaluate(()=>window.__BRIAR_GLEN_DEBUG__.apprenticeIdentity());if(soakIdentity.label==='Unformed')throw new Error(`${vp.name}: long autonomous soak never formed a play identity ${JSON.stringify({agent:soak.agent,identity:soakIdentity})}`);console.log(`APPRENTICE_SOAK ${JSON.stringify({decisions:soak.agent.decisions,successes:soak.agent.successes,successRate:Number(successRate.toFixed(2)),interruptions:soak.agent.interruptions,objectives:soak.agent.objectiveHistory.length,identity:soakIdentity,topContexts,knownFor:soak.state.player.knownFor,standing:soak.state.player.standing,coins:soak.state.player.coins})}`);
    }

    if(errors.length)throw new Error(`${vp.name}: runtime errors: ${errors.join(' | ')}`);
    const canvas=await page.locator('#game').boundingBox();if(!canvas||canvas.width<250||canvas.height<140)throw new Error(`${vp.name}: canvas unusable`);
    console.log(`PASS ${vp.name}: mobile tap play + Autonomous Apprentice emergent identity + repeat-client provider recognition + living AI + promise reliability + relationship-driven cooperation + persistent item lineage`);
    await context.close();
  }
} finally { await browser.close(); }
