(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const rollback = Boolean(params.get('artScope')) || params.get('canvasArt') === '1' || params.get('layoutV1') === '1';
  const runtime = window.__BRIAR_GLEN_RUNTIME;
  const debug = window.__BRIAR_GLENDebug;
  if (!runtime || !debug) return;

  const layout = {
    version:'world-layout-v2', enabled:!rollback, style:'hub-loops-branches-v2', terrain:'organic-isometric-regions-v2',
    baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
    decorRepositioned:0,borderVisuals:0,ambient:[],ambientSpawnIn:1.2,ambientDraws:0,npcIdles:0,mapSvgUpdated:false,
  };

  const METRICS=Object.freeze({
    primaryLane:[180,240],secondaryLane:[120,170],gateLane:[90,125],interactableClearRadius:[95,120],
    normalArenaDiameter:[300,420],bossArenaDiameter:[420,600],enemyRespawnSuppressRadius:320,resourceRespawnSuppressRadius:180,
  });
  const ROUTES=Object.freeze({
    villageLoop:[[-900,145],[-825,-75],[-765,-265],[-620,-300],[-445,-205],[-350,-70],[-390,120],[-485,255],[-650,315],[-825,275],[-900,145]],
    villageSpine:[[-930,30],[-790,30],[-650,20],[-500,15],[-345,20],[-235,15]],
    meadowRoad:[[-245,15],[-120,72],[20,42],[150,-45],[300,-35],[445,72],[585,35],[675,5]],
    groveTrail:[[95,-12],[125,-190],[185,-350],[270,-520],[420,-650],[555,-735],[650,-820]],
    groveLoop:[[650,-820],[760,-730],[805,-580],[690,-505],[535,-545],[420,-650],[505,-790],[650,-820]],
    copperRoad:[[650,5],[760,85],[900,35],[1035,-35],[1165,55],[1295,-45],[1415,5]],
    denTrack:[[1410,5],[1515,72],[1635,38],[1740,-62],[1870,-35],[1995,72],[2110,92]],
    fenCauseway:[[1010,-1200],[1125,-1325],[1215,-1450],[1360,-1545],[1450,-1690],[1515,-1830]],
    fenLoop:[[1515,-1830],[1690,-1770],[1840,-1640],[1760,-1485],[1575,-1515],[1450,-1690]],
    stonepinePass:[[2240,-1500],[2390,-1450],[2520,-1515],[2690,-1365],[2840,-1495],[2980,-1640],[3190,-1840]],
    stonepineLoop:[[2690,-1365],[2790,-1235],[3015,-1415],[3190,-1840],[3000,-1945],[2740,-1605],[2690,-1365]],
    rootway:[[2070,115],[1850,360],[1420,500],[900,545],[250,520],[-300,440],[-845,-205]],
  });
  const RESPAWN=Object.freeze({
    herb:[28,38],mooncap:[34,46],ore:[36,50],iron:[42,58],mossglass:[44,60],resin:[46,62],
    wolf:[24,34],boar:[28,40],mireling:[34,46],bogstalker:[40,54],ridgehorn:[44,58],quarrywisp:[42,56],
  });
  const PERSISTENT_THREATS=new Set(['boss','grovekeeper','fenwarden','quarrysentinel']);

  function seeded(seed){let x=seed>>>0;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  const rng=seeded(420053), range=([a,b])=>a+rng()*(b-a);
  function setObject(o,x,y,s=o.s){o.x=x;o.y=y;if(Number.isFinite(s))o.s=s;layout.decorRepositioned++;}

  function arrangeDecor(){
    if(!layout.enabled)return;
    const trees=worldObjects.filter(o=>o.type==='tree');
    const treeLocks=[[70,-360,1.02],[200,330,.98],[420,-350,1.05],[550,330,.94]];
    trees.forEach((o,i)=>{
      if(i<treeLocks.length)return setObject(o,...treeLocks[i]);
      const u=rng();
      if(u<.25){const x=-955+rng()*710,side=rng()<.5?-1:1;setObject(o,x,side*(445+rng()*125),.82+rng()*.36);}
      else if(u<.62){const x=-170+rng()*820,side=rng()<.48?-1:1,y=side*(315+rng()*215);if(side<0&&x>60&&x<390)setObject(o,x+120,-520-rng()*95,.88+rng()*.34);else setObject(o,x,y,.80+rng()*.40);}
      else{const a=rng()*TAU,rx=300+rng()*150,ry=235+rng()*120;setObject(o,500+Math.cos(a)*rx,-790+Math.sin(a)*ry,.88+rng()*.38);}
    });
    const bushes=worldObjects.filter(o=>o.type==='bush');
    bushes.forEach((o,i)=>{const u=(i+.5)/Math.max(1,bushes.length);if(u<.45){const x=-850+rng()*620,side=rng()<.5?-1:1;setObject(o,x,side*(350+rng()*115),.72+rng()*.30);}else if(u<.72){const x=-120+rng()*760,side=rng()<.5?-1:1;setObject(o,x,side*(245+rng()*125),.70+rng()*.34);}else{const a=rng()*TAU;setObject(o,540+Math.cos(a)*(235+rng()*90),-770+Math.sin(a)*(185+rng()*70),.72+rng()*.32);}});
    const hollow=worldObjects.filter(o=>o.type==='rock'||o.type==='deadTree');
    const hollowLocks=[[820,-320,1.02],[965,340,1.0],[1170,-340,1.12],[1305,335,1.03]];
    hollow.forEach((o,i)=>{if(i<hollowLocks.length)return setObject(o,...hollowLocks[i]);const x=700+rng()*690,side=rng()<.5?-1:1;let y=side*(300+rng()*230);if(i%7===0)y=side*(210+rng()*55);setObject(o,x,y,o.type==='deadTree'?.72+rng()*.30:.78+rng()*.38);});
    const den=worldObjects.filter(o=>o.type==='denRock'||o.type==='ember');
    const denLocks=[[1575,-330,1.03],[1650,320,.98],[1865,-340,1.08],[1975,330,1.05]];let lockIndex=0;
    den.forEach(o=>{if(o.type==='denRock'&&lockIndex<denLocks.length)return setObject(o,...denLocks[lockIndex++]);if(o.type==='ember'){const x=1480+rng()*610,y=(rng()<.5?-1:1)*(145+rng()*115);setObject(o,x,y,.66+rng()*.28);}else{const a=rng()*TAU,rad=250+rng()*135;setObject(o,1880+Math.cos(a)*rad,Math.sin(a)*(250+rng()*105),.78+rng()*.36);}});
    worldObjects.filter(o=>o.type==='fenTree').forEach((o,i)=>{o.s=.88+(i%3)*.08;});
    worldObjects.filter(o=>o.type==='stonepineTree').forEach((o,i)=>{o.s=.92+(i%4)*.07;});
    worldObjects.filter(o=>o.type==='quarryRock').forEach((o,i)=>{o.s=.82+(i%4)*.09;});
  }

  function worldPoly(points,fill,stroke=null,width=1){const p=points.map(([x,y])=>worldToScreen(x,y));ctx.beginPath();p.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width*camera.zoom;ctx.stroke();}}
  function route(points,width,base,edge='rgba(56,45,31,.17)',dash=false){const p=points.map(([x,y])=>worldToScreen(x,y));ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=edge;ctx.lineWidth=(width+12)*camera.zoom;ctx.beginPath();p.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke();ctx.strokeStyle=base;ctx.lineWidth=width*camera.zoom;ctx.stroke();if(dash){ctx.strokeStyle='rgba(239,220,174,.14)';ctx.lineWidth=2.2*camera.zoom;ctx.setLineDash([14*camera.zoom,22*camera.zoom]);ctx.stroke();ctx.setLineDash([]);}ctx.restore();}

  function drawTerrainV2(){
    if(!layout.enabled)return;layout.borderVisuals=0;
    worldPoly([[-980,-430],[-780,-570],[-455,-515],[-225,-315],[-210,300],[-420,545],[-800,575],[-985,390]],'rgba(92,117,68,.16)');
    worldPoly([[-865,-125],[-760,-210],[-600,-195],[-475,-80],[-500,120],[-650,225],[-825,190]],'rgba(174,155,105,.09)','rgba(220,202,157,.07)',2);
    worldPoly([[-185,-250],[20,-330],[240,-250],[310,-90],[165,95],[-55,125]],'rgba(139,157,88,.08)');
    worldPoly([[275,70],[470,-15],[650,75],[650,300],[470,385],[305,285]],'rgba(153,166,91,.075)');
    worldPoly([[-40,-430],[170,-1060],[560,-1120],[885,-980],[900,-535],[660,-420],[315,-465]],'rgba(38,75,48,.16)','rgba(33,61,41,.12)',5);
    worldPoly([[650,-620],[1420,-620],[1400,-260],[1250,-205],[1090,-270],[915,-230],[750,-260]],'rgba(84,81,68,.16)');
    worldPoly([[650,620],[1420,620],[1400,275],[1260,220],[1090,285],[900,235],[720,285]],'rgba(75,75,63,.14)');
    worldPoly([[1420,-620],[2200,-620],[2200,620],[1420,620],[1495,325],[1600,245],[1860,355],[2070,225],[2140,0],[2050,-250],[1830,-365],[1605,-240],[1490,-320]],'rgba(69,36,27,.13)','rgba(142,75,51,.08)',4);
    worldPoly([[880,-1180],[2200,-1180],[2200,-2100],[880,-2100]],'rgba(29,68,66,.14)');
    for(const [x,y,rx,ry] of [[1120,-1450,150,90],[1450,-1690,205,105],[1790,-1620,185,100],[1900,-1890,150,85]]){const pts=[];for(let i=0;i<12;i++){const a=i/12*TAU;pts.push([x+Math.cos(a)*rx,y+Math.sin(a)*ry]);}worldPoly(pts,'rgba(80,105,78,.105)','rgba(149,177,143,.055)',2);}
    worldPoly([[2245,-1120],[3425,-1120],[3425,-1380],[3250,-1420],[3020,-1310],[2820,-1440],[2580,-1295],[2380,-1390]],'rgba(75,77,61,.15)');
    worldPoly([[2245,-2160],[3425,-2160],[3425,-1900],[3230,-1985],[3040,-1870],[2840,-2015],[2570,-1860],[2380,-1980]],'rgba(62,64,55,.16)');layout.borderVisuals=10;
  }
  function drawRoutesV2(){if(!layout.enabled)return;route(ROUTES.villageLoop,94,'rgba(146,124,84,.42)','rgba(66,54,38,.18)');route(ROUTES.villageSpine,118,'rgba(151,130,89,.46)','rgba(65,52,35,.18)',true);route(ROUTES.meadowRoad,142,'rgba(153,134,92,.42)','rgba(67,56,38,.16)',true);route(ROUTES.groveTrail,92,'rgba(104,104,67,.38)','rgba(38,55,34,.18)',true);route(ROUTES.groveLoop,76,'rgba(92,96,61,.32)','rgba(36,53,32,.18)');route(ROUTES.copperRoad,130,'rgba(132,113,78,.40)','rgba(56,52,42,.20)',true);route(ROUTES.denTrack,112,'rgba(112,76,58,.42)','rgba(57,35,29,.24)',true);route(ROUTES.fenCauseway,86,'rgba(102,102,78,.38)','rgba(37,62,56,.22)',true);route(ROUTES.fenLoop,64,'rgba(86,95,75,.30)','rgba(34,61,55,.20)');route(ROUTES.stonepinePass,94,'rgba(122,105,78,.38)','rgba(55,55,45,.23)',true);route(ROUTES.stonepineLoop,62,'rgba(105,95,72,.30)','rgba(50,51,43,.20)');if(progress.shortcutUnlocked)route(ROUTES.rootway,44,'rgba(90,102,62,.23)','rgba(52,57,39,.16)',true);}

  const priorDrawGround=drawGround;drawGround=function build42WorldGround(zone){priorDrawGround(zone);drawTerrainV2();};
  const priorDrawRoute=drawRoute;drawRoute=function build42WorldRoutes(){priorDrawRoute();drawRoutesV2();};

  const npcState=new WeakMap();
  function prepareNpc(npc){if(npcState.has(npc))return npcState.get(npc);const s={baseSpeed:npc.speed||38,lastWaypoint:npc.waypoint,idleUntil:0};npcState.set(npc,s);return s;}
  function ambientProfile(){const z=zoneFor(player.x,player.y).name;if(z==='BRIAR GLEN')return['sparrow','#c8b98d'];if(z==='MEADOW ROAD')return['butterfly','#d7c97b'];if(z==='MOONCAP GROVE')return['firefly','#cfc4e8'];if(z==='COPPER HOLLOW')return['dust','#bda77d'];if(z==='EMBERBACK DEN')return['ember','#e18a55'];if(z==='MOSSWATER FEN')return['firefly','#a8d5c4'];if(z==='STONEPINE REACH')return['needle','#a8a57d'];return['dust','#c4b58c'];}
  function spawnAmbient(){const cap=viewport.w<700?10:16;if(layout.ambient.length>=cap)return;const[kind,color]=ambientProfile(),a=rng()*TAU,rad=140+rng()*320;layout.ambient.push({kind,color,x:player.x+Math.cos(a)*rad,y:player.y+Math.sin(a)*rad,vx:(rng()-.5)*18,vy:(rng()-.5)*18,life:4+rng()*4,maxLife:8,phase:rng()*TAU});}

  let pendingResource=null,pendingKill=null,npcBefore=[];
  runtime.registerHook('beforeInteract','world-layout-v2-resource-before',()=>{
    pendingResource=null;if(!layout.enabled)return;
    const near=typeof nearestInteractable==='function'?nearestInteractable():null;
    if(near?.kind==='resource'&&near.obj?.active)pendingResource=near.obj;
  },2450);
  runtime.registerHook('afterInteract','world-layout-v2-resource-after',()=>{
    if(layout.enabled&&pendingResource&&!pendingResource.active&&RESPAWN[pendingResource.type])pendingResource.cooldown=Math.max(pendingResource.cooldown,range(RESPAWN[pendingResource.type]));
    pendingResource=null;
  },2450);
  runtime.registerHook('beforeKillEnemy','world-layout-v2-kill-before',payload=>{
    pendingKill=layout.enabled&&payload.enemy?{enemy:payload.enemy,wasDead:!!payload.enemy.dead}:null;
  },2450);
  runtime.registerHook('afterKillEnemy','world-layout-v2-kill-after',()=>{
    const p=pendingKill;pendingKill=null;
    if(!p||p.wasDead||!p.enemy.dead||PERSISTENT_THREATS.has(p.enemy.type)||!RESPAWN[p.enemy.type])return;
    p.enemy.respawn=range(RESPAWN[p.enemy.type]);
  },2450);
  runtime.registerHook('beforeUpdate','world-layout-v2-before-update',payload=>{
    if(!layout.enabled){npcBefore=[];return;}
    const dt=payload.dt,now=performance.now()/1000;
    const npcs=worldObjects.filter(o=>o.type==='npc');
    for(const npc of npcs){const s=prepareNpc(npc);npc.speed=now<s.idleUntil?0:s.baseSpeed;}
    npcBefore=npcs.map(n=>[n,n.waypoint]);
    for(const e of enemies)if(e.dead&&!PERSISTENT_THREATS.has(e.type)&&e.respawn<=dt+.08&&Math.hypot(player.x-e.homeX,player.y-e.homeY)<METRICS.enemyRespawnSuppressRadius)e.respawn=2.2+rng()*2.8;
    for(const r of resources)if(!r.active&&r.cooldown<=dt+.08&&Math.hypot(player.x-r.x,player.y-r.y)<METRICS.resourceRespawnSuppressRadius)r.cooldown=2+rng()*2.5;
  },2450);
  runtime.registerHook('afterUpdate','world-layout-v2-after-update',payload=>{
    if(!layout.enabled)return;
    const now=performance.now()/1000;
    for(const[npc,wp]of npcBefore){const s=prepareNpc(npc);if(npc.waypoint!==wp){s.lastWaypoint=npc.waypoint;s.idleUntil=now+1.2+rng()*2.3;layout.npcIdles++;}}
    layout.ambientSpawnIn-=payload.dt;if(layout.ambientSpawnIn<=0){spawnAmbient();layout.ambientSpawnIn=3.8+rng()*4.6;}
    for(const a of layout.ambient){a.life-=payload.dt;a.phase+=payload.dt*3.1;a.x+=a.vx*payload.dt;a.y+=a.vy*payload.dt;if(a.kind==='sparrow'){a.vx+=8*payload.dt;a.vy+=Math.sin(a.phase)*3*payload.dt;}}
    layout.ambient=layout.ambient.filter(a=>a.life>0);
  },2450);

  function drawAmbient(){if(!layout.enabled)return;layout.ambientDraws=0;for(const a of layout.ambient){const p=worldToScreen(a.x,a.y);if(p.x<-30||p.x>viewport.w+30||p.y<-30||p.y>viewport.h+30)continue;const fade=Math.min(1,a.life/.7);ctx.save();ctx.globalAlpha=.18+.42*fade;if(a.kind==='sparrow'){ctx.strokeStyle=a.color;ctx.lineWidth=1.3*camera.zoom;ctx.beginPath();ctx.arc(p.x-3,p.y,4,Math.PI*.15,Math.PI*.85);ctx.arc(p.x+4,p.y,4,Math.PI*.15,Math.PI*.85);ctx.stroke();}else if(a.kind==='butterfly'){ctx.fillStyle=a.color;const w=2.4+Math.sin(a.phase)*1.3;ctx.beginPath();ctx.ellipse(p.x-w,p.y,w,1.8,.4,0,TAU);ctx.ellipse(p.x+w,p.y,w,1.8,-.4,0,TAU);ctx.fill();}else if(a.kind==='firefly'){ctx.fillStyle=a.color;ctx.beginPath();ctx.arc(p.x,p.y,2.3+Math.sin(a.phase)*1.1,0,TAU);ctx.fill();}else if(a.kind==='ember'){ctx.fillStyle=a.color;ctx.beginPath();ctx.arc(p.x,p.y-6-Math.sin(a.phase)*5,1.7,0,TAU);ctx.fill();}else if(a.kind==='needle'){ctx.strokeStyle=a.color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x-3,p.y-2);ctx.lineTo(p.x+3,p.y+2);ctx.stroke();}else{ctx.fillStyle=a.color;ctx.beginPath();ctx.arc(p.x,p.y,1.2,0,TAU);ctx.fill();}ctx.restore();layout.ambientDraws++;}}
  runtime.registerHook('afterDraw','world-layout-v2-ambient',drawAmbient,2600);

  function updateMapSvg(){if(!layout.enabled)return;const svg=document.getElementById('warden-map-svg');if(!svg)return;let g=document.getElementById('world-layout-v2-map');if(!g){g=document.createElementNS('http://www.w3.org/2000/svg','g');g.id='world-layout-v2-map';g.setAttribute('pointer-events','none');g.innerHTML=`<path d="M98 348 C160 310 225 318 300 344 C365 368 425 330 500 344 C575 360 640 326 710 350 C775 372 842 342 914 362" fill="none" stroke="#aa9669" stroke-width="42" stroke-linecap="round" opacity=".22"/><path d="M296 342 C305 275 340 220 405 171 C455 133 515 112 585 105" fill="none" stroke="#6b6147" stroke-width="6" stroke-dasharray="10 12" opacity=".52"/><path d="M405 171 C510 150 610 175 660 240 C610 267 530 270 475 230 C440 205 420 187 405 171" fill="none" stroke="#566449" stroke-width="5" opacity=".34"/><path d="M585 105 C675 83 738 70 785 105 C750 137 710 164 680 202" fill="none" stroke="#506650" stroke-width="5" stroke-dasharray="8 12" opacity=".45"/><path d="M785 105 C840 75 890 62 932 82" fill="none" stroke="#655d49" stroke-width="5" stroke-dasharray="8 12" opacity=".45"/><ellipse cx="132" cy="348" rx="86" ry="58" fill="#718063" opacity=".13"/><ellipse cx="535" cy="337" rx="105" ry="62" fill="#6d7159" opacity=".11"/><ellipse cx="846" cy="355" rx="92" ry="68" fill="#755a4c" opacity=".10"/>`;const marker=svg.querySelector('.map-marker');svg.insertBefore(g,marker||svg.lastChild);}layout.mapSvgUpdated=true;}

  arrangeDecor();updateMapSvg();setTimeout(updateMapSvg,0);
  debug.getWorldLayoutV2State=()=>({version:layout.version,enabled:layout.enabled,style:layout.style,terrain:layout.terrain,metrics:{...METRICS},routes:Object.keys(ROUTES),respawnRules:{...RESPAWN},decorRepositioned:layout.decorRepositioned,borderVisuals:layout.borderVisuals,ambientActors:layout.ambient.length,ambientDraws:layout.ambientDraws,npcIdles:layout.npcIdles,mapSvgUpdated:layout.mapSvgUpdated,baseline:{...layout.baseline},current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},anchors:Object.fromEntries(['tavern','well','board','forge','alchemy','merchant','groveSign','fenGate','stonepineGate','stonepineCamp'].map(type=>{const o=worldObjects.find(x=>x.type===type);return[type,o?{x:o.x,y:o.y}:null];}))});
})();
