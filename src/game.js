(() => {
  'use strict';

  const BUILD = Object.freeze({version:'0.1.0',id:'living-world-reboot',saveKey:'briar-glen-reboot-v1'});
  const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
  const UI={clock:document.getElementById('clock'),coins:document.getElementById('coins'),hp:document.getElementById('hp'),energy:document.getElementById('energy'),standing:document.getElementById('standing'),knownFor:document.getElementById('known-for'),skills:document.getElementById('skills'),inventory:document.getElementById('inventory'),packWeight:document.getElementById('pack-weight'),nearby:document.getElementById('nearby'),nearbyType:document.getElementById('nearby-type'),log:document.getElementById('log'),toast:document.getElementById('toast'),worldLine:document.getElementById('world-line')};
  const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const rand=(a,b)=>a+Math.random()*(b-a);

  const itemDefs=Object.freeze({
    briarleaf:{name:'Briarleaf',weight:.2,base:4,kind:'herb',color:'#8fcf72'},
    mooncap:{name:'Mooncap',weight:.2,base:9,kind:'herb',color:'#b9a3d9'},
    iron:{name:'Iron Ore',weight:1.2,base:12,kind:'ore',color:'#9fa8ad'},
    wood:{name:'Ashwood',weight:.8,base:7,kind:'wood',color:'#aa8457'},
    hide:{name:'Wolf Hide',weight:.7,base:15,kind:'hide',color:'#b99878'},
    bread:{name:'Brown Bread',weight:.3,base:6,kind:'food',color:'#d7ad69'},
    tonic:{name:'Field Tonic',weight:.2,base:22,kind:'medicine',color:'#7fcaad'},
    pick:{name:'Iron Pick',weight:2,base:50,kind:'tool',color:'#b9c1c4'},
    blade:{name:'Warden Blade',weight:2.4,base:80,kind:'weapon',color:'#d2d6d7'},
  });

  const recipes=Object.freeze({
    tonic:{skill:'herbcraft',level:1,input:{briarleaf:2,mooncap:1},output:'tonic'},
    pick:{skill:'smithing',level:1,input:{iron:3,wood:1},output:'pick'},
    blade:{skill:'smithing',level:2,input:{iron:4,wood:1,hide:1},output:'blade'},
  });

  const skillDefs=Object.freeze({
    fieldcraft:{name:'Fieldcraft',key:'1',active:'Survey',desc:'See nearby resources and their quality.'},
    smithing:{name:'Smithing',key:'2',active:'Mend',desc:'Repair your tool or blade using iron.'},
    guard:{name:'Guard',key:'3',active:'Brace',desc:'Block the next hit and counter.'},
    rapport:{name:'Rapport',key:'4',active:'Read Need',desc:'Reveal what a nearby person actually wants.'},
    herbcraft:{name:'Herbcraft',key:null,active:null,desc:'Brew useful medicine from plants.'},
  });

  const world={w:1800,h:1200,minute:8*60,day:1,weather:'clear',weatherTimer:220,events:[],resources:[],enemies:[],drops:[],townNeeds:{food:0,medicine:0,metal:0},serial:1};
  const camera={x:0,y:0};
  const player={x:900,y:600,r:12,speed:170,hp:100,maxHp:100,energy:100,maxEnergy:100,coins:24,attackCd:0,attackArc:0,guarded:false,surveyUntil:0,readNeedUntil:0,equippedTool:null,equippedWeapon:null,knownFor:'nothing yet',standing:'Unknown',inventory:{},skills:{}};
  for(const key of Object.keys(skillDefs))player.skills[key]={xp:0,level:1};

  const zones=[
    {id:'village',name:'Briar Glen',x:650,y:390,w:500,h:420,color:'#596c4e'},
    {id:'forest',name:'Greenwood',x:1160,y:220,w:560,h:470,color:'#354b34'},
    {id:'quarry',name:'Old Quarry',x:80,y:180,w:520,h:470,color:'#51504c'},
    {id:'marsh',name:'Moss Fen',x:1020,y:760,w:640,h:360,color:'#3a5550'},
    {id:'meadow',name:'South Meadow',x:160,y:720,w:720,h:390,color:'#60784f'},
  ];

  const buildings=[
    {id:'forge',name:'Alden’s Forge',x:760,y:500,w:105,h:80,color:'#714a36'},
    {id:'apothecary',name:'Mira’s Garden',x:930,y:465,w:110,h:75,color:'#4e704a'},
    {id:'market',name:'Rowan’s Stall',x:820,y:650,w:120,h:62,color:'#7b6741'},
    {id:'hall',name:'Warden Hall',x:990,y:625,w:110,h:78,color:'#5d615f'},
  ];

  const npcTemplates=[
    {id:'alden',name:'Alden',role:'smith',home:{x:812,y:545},work:{x:812,y:545},color:'#c48b63',needBias:{iron:1.8,wood:1.1,bread:1}},
    {id:'mira',name:'Mira',role:'herbalist',home:{x:985,y:520},work:{x:985,y:520},color:'#8fb783',needBias:{briarleaf:1.4,mooncap:1.8,bread:1}},
    {id:'rowan',name:'Rowan',role:'trader',home:{x:870,y:680},work:{x:870,y:680},color:'#d1b26c',needBias:{bread:1.7,tonic:1,wood:.8}},
    {id:'tamsin',name:'Tamsin',role:'warden',home:{x:1030,y:670},work:{x:1110,y:570},color:'#7aa2c3',needBias:{tonic:1.5,hide:1.3,bread:1}},
  ];

  let npcs=[];
  function newNPC(t){return{...t,x:t.home.x,y:t.home.y,r:11,energy:80,hunger:20,mood:60,trust:0,goal:'idle',goalText:'Taking stock',target:{...t.home},memory:[],stock:{bread:1},request:null,think:0,tradeCooldown:0,lastPlayerHelp:0};}

  function qualityLabel(q){return q>=2.6?'fine':q>=1.7?'good':'plain';}
  function itemCount(id){return player.inventory[id]?.qty||0;}
  function addItem(id,qty=1,quality=1){if(!itemDefs[id])return;const slot=player.inventory[id]||(player.inventory[id]={qty:0,qualitySum:0,durability:itemDefs[id].kind==='tool'||itemDefs[id].kind==='weapon'?100:null});slot.qty+=qty;slot.qualitySum+=quality*qty;if(slot.durability==null&&(itemDefs[id].kind==='tool'||itemDefs[id].kind==='weapon'))slot.durability=100;log(`Picked up ${qty} ${itemDefs[id].name}${quality>1.05?` (${qualityLabel(quality)})`:''}.`,'world');}
  function removeItem(id,qty=1){const slot=player.inventory[id];if(!slot||slot.qty<qty)return false;const avg=slot.qualitySum/slot.qty;slot.qty-=qty;slot.qualitySum=Math.max(0,slot.qualitySum-avg*qty);if(slot.qty<=0){delete player.inventory[id];if(player.equippedTool===id)player.equippedTool=null;if(player.equippedWeapon===id)player.equippedWeapon=null;}return true;}
  function avgQuality(id){const s=player.inventory[id];return s&&s.qty?s.qualitySum/s.qty:1;}
  function hasItems(req){return Object.entries(req).every(([id,q])=>itemCount(id)>=q);}
  function consume(req){if(!hasItems(req))return false;for(const [id,q] of Object.entries(req))removeItem(id,q);return true;}
  function inventoryWeight(){return Object.entries(player.inventory).reduce((sum,[id,s])=>sum+(itemDefs[id]?.weight||0)*s.qty,0);}

  function skillXp(id,amount){const s=player.skills[id];if(!s)return;const before=s.level;s.xp+=amount;while(s.xp>=s.level*40&&s.level<5){s.xp-=s.level*40;s.level++;}if(s.level>before){toast(`${skillDefs[id].name} reached ${s.level}`);log(`${skillDefs[id].name} improved. New actions may be stronger.`,'world');}}
  function useSkill(id){const s=player.skills[id];if(!s)return false;
    if(id==='fieldcraft'){player.surveyUntil=performance.now()+7000;player.energy=Math.max(0,player.energy-8);skillXp(id,3);toast('Survey: quality and resources revealed');return true;}
    if(id==='smithing'){const target=player.equippedWeapon||player.equippedTool;if(!target||!player.inventory[target]){toast('Equip a tool or blade first');return false;}if(itemCount('iron')<1){toast('Mend needs 1 Iron Ore');return false;}removeItem('iron',1);player.inventory[target].durability=clamp((player.inventory[target].durability||0)+35,0,100);skillXp(id,4);toast(`${itemDefs[target].name} mended`);return true;}
    if(id==='guard'){if(player.energy<10){toast('Too tired to brace');return false;}player.energy-=10;player.guarded=true;skillXp(id,2);toast('Braced: next hit will be blocked');return true;}
    if(id==='rapport'){const n=nearestNPC(110);if(!n){toast('No one close enough to read');return false;}player.readNeedUntil=performance.now()+8000;n.memory.push({day:world.day,text:`You paid attention when ${n.goalText.toLowerCase()}.`});skillXp(id,3);toast(`${n.name}: ${npcNeedText(n)}`);return true;}
    return false;
  }

  function log(text,type='world'){world.events.push({id:world.serial++,text,type,day:world.day,minute:world.minute});if(world.events.length>70)world.events.shift();renderLog();}
  let toastTimer=0;function toast(text){UI.toast.textContent=text;UI.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>UI.toast.classList.remove('show'),1500);}

  function zoneAt(x,y){return zones.find(z=>x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h)||null;}
  function spawnResource(type,x,y,quality=1){world.resources.push({id:`r${world.serial++}`,type,x,y,r:type==='iron'?12:9,quality,respawn:0,available:true});}
  function seedResources(){world.resources.length=0;
    for(let i=0;i<16;i++)spawnResource('briarleaf',rand(180,830),rand(760,1060),rand(.9,1.8));
    for(let i=0;i<10;i++)spawnResource('mooncap',rand(1220,1660),rand(780,1080),rand(1.1,2.4));
    for(let i=0;i<14;i++)spawnResource('iron',rand(140,540),rand(250,610),rand(.8,2.5));
    for(let i=0;i<14;i++)spawnResource('wood',rand(1210,1680),rand(270,640),rand(.8,2.2));
  }
  function spawnWolf(x,y){world.enemies.push({id:`w${world.serial++}`,type:'wolf',x,y,r:12,hp:36,maxHp:36,attackCd:0,wander:rand(0,10),dead:false});}
  function seedEnemies(){world.enemies.length=0;for(let i=0;i<6;i++)spawnWolf(rand(1240,1670),rand(300,650));for(let i=0;i<3;i++)spawnWolf(rand(350,800),rand(820,1040));}

  function reset(){world.minute=8*60;world.day=1;world.weather='clear';world.weatherTimer=220;world.events=[];world.serial=1;player.x=900;player.y=600;player.hp=100;player.energy=100;player.coins=24;player.inventory={};player.equippedTool=null;player.equippedWeapon=null;player.knownFor='nothing yet';player.standing='Unknown';for(const k of Object.keys(player.skills))player.skills[k]={xp:0,level:1};npcs=npcTemplates.map(newNPC);seedResources();seedEnemies();addItem('bread',2,1);log('A new day begins in Briar Glen. Everyone here has needs of their own.','world');save();}

  function memory(n,text){n.memory.push({day:world.day,text});if(n.memory.length>12)n.memory.shift();}
  function npcNeedScore(n,id){const stock=n.stock[id]||0,bias=n.needBias[id]||0;return bias*Math.max(0,3-stock)+(id==='bread'?n.hunger/35:0);}
  function topNeed(n){let best={id:'bread',score:0};for(const id of Object.keys(n.needBias)){const score=npcNeedScore(n,id);if(score>best.score)best={id,score};}return best;}
  function npcNeedText(n){const need=topNeed(n);return need.score>.6?`${itemDefs[need.id].name} matters most right now.`:'No urgent shortage.';}
  function requestFor(n){const need=topNeed(n);if(need.score<1.1)return null;const qty=need.score>3?2:1;const reward=Math.round(itemDefs[need.id].base*qty*(1.35+need.score*.08));return{id:need.id,qty,reward,createdDay:world.day};}
  function chooseNpcGoal(n){const hour=(world.minute/60)%24;const need=topNeed(n);const night=hour>=21||hour<6;const scores={sleep:night?6+(100-n.energy)/15:(100-n.energy)/40,work:(hour>=7&&hour<18?4:0)+(n.role==='trader'?1:0),eat:n.hunger/14,seek:need.score*1.6,social:n.mood<45?2.5:0,idle:1};let goal=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
    if(goal==='sleep'){n.target={...n.home};n.goalText='Heading home to rest';}
    else if(goal==='work'){n.target={...n.work};n.goalText=`Working as the ${n.role}`;}
    else if(goal==='eat'){n.target={x:870,y:680};n.goalText='Looking for food';}
    else if(goal==='seek'){const id=need.id;const spot=id==='iron'?{x:360,y:430}:id==='wood'?{x:1430,y:450}:id==='mooncap'?{x:1370,y:930}:id==='briarleaf'?{x:520,y:900}:{x:870,y:680};n.target=spot;n.goalText=`Trying to secure ${itemDefs[id].name}`;}
    else if(goal==='social'){const other=npcs.find(o=>o!==n)||n;n.target={x:other.x+25,y:other.y};n.goalText=`Checking in with ${other.name}`;}
