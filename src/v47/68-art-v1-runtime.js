(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const historicalKeys = new Set([
    'assetVariantProof','landmarkStateProof','env46proof','envperf','terrain46','tperf',
    'generatedArtSmoke','dressing','layoutProof','renderPerf','build30Recovery','ground46',
    'sourceArt47Proof','livingCast48Proof','sceneCohesion49Proof','build47rebuild','build47perf',
    'cast48','cohesion49','artScope'
  ]);
  const historical = [...params.keys()].some(k => historicalKeys.has(k));
  const requested = !historical && params.get('artV1') !== '0' && params.get('canvasArt') !== '1';
  const debug = window.__BRIAR_GLENDebug;
  if (!debug) return;

  const state = {
    familyId:'briar-glen-art-v1',
    version:'storybook-canvas-v1',
    renderer:'single-owner-procedural-storybook',
    approval:'standing-user-authorization',
    requested,
    enabled:requested,
    ready:requested,
    failed:false,
    failure:'',
    noFallback:true,
    legacyFallbackCount:0,
    missingWorldTypes:[],
    frameDraws:0,
    totalDraws:0,
    objectDraws:0,
    resourceDraws:0,
    enemyDraws:0,
    playerDraws:0,
    baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
    scale:{player:68,npc:66,wolf:47,boar:52,emberback:88,cottage:150,forge:146,market:128,broadleaf:151,pine:154},
  };

  document.documentElement.dataset.briarGlenArtV1 = requested ? 'ready' : 'off';
  debug.isArtV1Enabled = () => requested && !state.failed;
  debug.getArtV1State = () => ({...state,current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}});
  if (!requested) return;

  const P = {
    ink:'#3d382f', inkSoft:'#514a3e', cream:'#e8d8b9', warm:'#d8b47b',
    wood:'#755437', woodDark:'#4f3a2c', woodLight:'#a27a4d', timber:'#493629',
    stone:'#7a786d', stoneLight:'#a3a08f', stoneDark:'#55574f',
    iron:'#797a72', ironLight:'#aaa99e', roof:'#62543e', roofDark:'#453b31',
    thatch:'#b99a61', leather:'#72503c', cloth:'#7b6651',
    green:'#56704b', green2:'#668254', greenDark:'#354a37', greenLight:'#829965',
    pine:'#405b42', fen:'#526861', fenDark:'#344c47', copper:'#8a6248',
    ember:'#c76543', emberHot:'#f0b56a', water:'#587a76', moss:'#60785d',
    shadow:'rgba(25,27,21,.22)',
  };

  const REGION_STYLE = {
    village:{base:'#667056',light:'#798263',dark:'#515b48',path:'#a48b64',edge:'#76664f',accent:'#8b845f'},
    meadow:{base:'#627b4e',light:'#78915e',dark:'#506744',path:'#aa9169',edge:'#796951',accent:'#90a16b'},
    grove:{base:'#4e684d',light:'#617d59',dark:'#3d573f',path:'#8d7e5f',edge:'#655d4d',accent:'#6f8c63'},
    fen:{base:'#526b62',light:'#637d72',dark:'#3f5853',path:'#85785e',edge:'#5d5a4d',accent:'#65817a'},
    copper:{base:'#65675a',light:'#78796a',dark:'#505348',path:'#96775f',edge:'#6b584b',accent:'#8d684f'},
    stonepine:{base:'#596451',light:'#6c765d',dark:'#464f43',path:'#88775f',edge:'#62594c',accent:'#738066'},
    den:{base:'#554c45',light:'#675a4f',dark:'#413a36',path:'#795b4c',edge:'#563f37',accent:'#8a5b46'},
  };

  function regionAt(x,y){
    if(x>=2240&&y<=-1120)return'stonepine';
    if(x>=880&&x<=2200&&y<=-1180)return'fen';
    if(x>=-80&&x<=900&&y<=-430)return'grove';
    if(x<-210)return'village';
    if(x<660)return'meadow';
    if(x<1430)return'copper';
    return'den';
  }

  function hash(x,y,s=0){let h=(Math.imul((x|0)^s,374761393)+Math.imul((y|0),668265263))|0;h=(h^(h>>>13))*1274126177|0;return (h^(h>>>16))>>>0;}
  function rr(x,y,w,h,r){const q=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+q,y);ctx.arcTo(x+w,y,x+w,y+h,q);ctx.arcTo(x+w,y+h,x,y+h,q);ctx.arcTo(x,y+h,x,y,q);ctx.arcTo(x,y,x+w,y,q);ctx.closePath();}
  function ellipse(x,y,rx,ry,fill,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();ctx.restore();}
  function strokeLine(points,color,width,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();ctx.restore();}
  function grad(x0,y0,x1,y1,a,b,c){const g=ctx.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,a);g.addColorStop(.62,b);g.addColorStop(1,c||b);return g;}
  function visible(p,w=220,h=220,m=180){return p.x+w/2>-m&&p.x-w/2<viewport.w+m&&p.y>-m&&p.y-h<viewport.h+m;}
  function shadowAt(p,rx,ry,alpha=.22){ellipse(p.x,p.y+5*camera.zoom,rx*camera.zoom,ry*camera.zoom,'#1e241d',alpha);}
  function count(kind){state.frameDraws++;state.totalDraws++;if(kind==='object')state.objectDraws++;else if(kind==='resource')state.resourceDraws++;else if(kind==='enemy')state.enemyDraws++;else if(kind==='player')state.playerDraws++;}

  const groundPatterns = new Map();
  function buildPattern(region){
    const s=REGION_STYLE[region],c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
    g.fillStyle=s.base;g.fillRect(0,0,256,256);
    for(let i=0;i<150;i++){
      const x=(hash(i,17,3)%256),y=(hash(i,31,7)%256),r=1+(hash(i,41,9)%8);
      g.globalAlpha=.035+((hash(i,55,11)%100)/100)*.07;
      g.fillStyle=i%3===0?s.light:i%3===1?s.dark:s.accent;
      g.beginPath();g.ellipse(x,y,r*1.6,r*.7,(hash(i,77,2)%628)/100,0,TAU);g.fill();
    }
    for(let i=0;i<36;i++){
      const x=hash(i,111,5)%256,y=hash(i,113,8)%256;
      g.globalAlpha=.08;g.strokeStyle=s.dark;g.lineWidth=1;
      g.beginPath();g.moveTo(x,y);g.lineTo(x+2+(i%4),y-4-(i%5));g.stroke();
    }
    g.globalAlpha=1;return ctx.createPattern(c,'repeat');
  }
  function pattern(region){if(!groundPatterns.has(region))groundPatterns.set(region,buildPattern(region));return groundPatterns.get(region);}

  const ROUTES={
    meadow:[[-420,0],[-245,15],[-120,72],[20,42],[150,-45],[300,-35],[445,72],[585,35],[675,5]],
    grove:[[95,-12],[125,-190],[185,-350],[270,-520],[420,-650],[555,-735],[650,-820]],
    fen:[[1010,-1200],[1125,-1325],[1215,-1450],[1360,-1545],[1450,-1690],[1515,-1830]],
    copper:[[650,5],[760,85],[900,35],[1035,-35],[1165,55],[1295,-45],[1415,5]],
    den:[[1410,5],[1515,72],[1635,38],[1740,-62],[1870,-35],[1995,72],[2110,92]],
    stonepine:[[2240,-1500],[2390,-1450],[2520,-1515],[2690,-1365],[2840,-1495],[2980,-1640],[3190,-1840]],
  };

  function drawGroundArt(){
    state.frameDraws=0;
    const region=regionAt(camera.x,camera.y);
    ctx.fillStyle=pattern(region);ctx.fillRect(0,0,viewport.w,viewport.h);
    const wash=ctx.createRadialGradient(viewport.w*.48,viewport.h*.42,10,viewport.w*.48,viewport.h*.42,Math.max(viewport.w,viewport.h)*.75);
    wash.addColorStop(0,'rgba(255,240,195,.055)');wash.addColorStop(1,region==='den'?'rgba(35,20,16,.22)':'rgba(24,34,24,.10)');ctx.fillStyle=wash;ctx.fillRect(0,0,viewport.w,viewport.h);
    if(region==='fen')for(let i=0;i<6;i++){const x=(i*173+71)%viewport.w,y=(i*97+108)%viewport.h;ellipse(x,y,70,24,P.water,.10);}
    if(region==='den')for(let i=0;i<9;i++){const x=(i*137+91)%viewport.w,y=(i*79+50)%viewport.h;ellipse(x,y,28,10,P.ember,.045);}
  }

  function drawRouteArt(){
    const r=regionAt(camera.x,camera.y),pts=ROUTES[r==='village'?'meadow':r];
    if(r==='village'){
      const p=worldToScreen(-620,30),z=camera.zoom;
      ellipse(p.x,p.y,210*z,105*z,'#756a54',.32);ellipse(p.x,p.y-2*z,184*z,90*z,'#9b8b68',.40);
      ctx.save();ctx.globalAlpha=.13;ctx.strokeStyle='#d3c39f';ctx.lineWidth=1.2*z;
      for(let a=0;a<TAU;a+=.27){const rx=150*z+(Math.sin(a*7)*17*z),ry=73*z;ctx.beginPath();ctx.arc(p.x+Math.cos(a)*rx*.35,p.y+Math.sin(a)*ry*.35,3.5*z,0,TAU);ctx.stroke();}ctx.restore();
    }
    if(!pts)return;
    const sp=pts.map(([x,y])=>{const p=worldToScreen(x,y);return[p.x,p.y];}),z=camera.zoom,s=REGION_STYLE[r];
    strokeLine(sp,'rgba(57,48,38,.18)',72*z);strokeLine(sp,s.edge,64*z,.45);strokeLine(sp,s.path,54*z,.75);strokeLine(sp,'rgba(224,205,166,.16)',3*z);
  }

  function drawTimberBuilding(o,kind='cottage'){
    const p=worldToScreen(o.x,o.y),z=camera.zoom*(o.s||1),cfg={cottage:[148,100],tavern:[172,116],forge:[152,102],alchemy:[154,104],shed:[118,84]}[kind]||[148,100];
    const h=cfg[0]*z,w=cfg[1]*z;if(!visible(p,w,h))return true;shadowAt(p,w*.42/z,16*(o.s||1),.24);ctx.save();ctx.translate(p.x,p.y);
    const wallTop=-h*.58,wallBottom=-h*.10,roofPeak=-h*.95,roofEave=-h*.50;
    ctx.fillStyle=grad(-w/2,wallTop,w/2,wallBottom,'#c7b18a','#a78d68','#80694f');rr(-w*.39,wallTop,w*.78,wallBottom-wallTop,5*z);ctx.fill();
    ctx.fillStyle=P.stoneDark;ctx.globalAlpha=.85;rr(-w*.41,-h*.14,w*.82,h*.12,3*z);ctx.fill();ctx.globalAlpha=1;
    ctx.fillStyle=kind==='tavern'?grad(0,roofPeak,0,roofEave,'#786344','#5f4d39','#493d31'):kind==='forge'?grad(0,roofPeak,0,roofEave,'#5a5145','#484238','#37352f'):grad(0,roofPeak,0,roofEave,'#8a744e','#6e5d43','#55493a');
    ctx.beginPath();ctx.moveTo(-w*.54,roofEave);ctx.lineTo(0,roofPeak);ctx.lineTo(w*.54,roofEave);ctx.lineTo(w*.42,roofEave+h*.07);ctx.lineTo(-w*.42,roofEave+h*.07);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(47,39,30,.72)';ctx.lineWidth=4*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-w*.25,wallTop);ctx.lineTo(-w*.25,wallBottom);ctx.moveTo(w*.25,wallTop);ctx.lineTo(w*.25,wallBottom);ctx.moveTo(-w*.38,wallTop+h*.20);ctx.lineTo(w*.38,wallTop+h*.20);ctx.stroke();
    ctx.fillStyle='#49362c';rr(-w*.09,wallBottom-h*.27,w*.18,h*.27,3*z);ctx.fill();ctx.fillStyle='#d5a765';ctx.globalAlpha=.58;rr(w*.17,wallTop+h*.16,w*.13,h*.13,2*z);ctx.fill();ctx.globalAlpha=1;
    if(kind==='forge'){ctx.fillStyle='#4f4a40';rr(w*.24,roofPeak+h*.03,w*.13,h*.34,3*z);ctx.fill();ellipse(w*.24,wallBottom-h*.07,8*z,5*z,P.ember,.72);ellipse(w*.24,wallBottom-h*.07,3*z,2*z,P.emberHot,.9);}
    if(kind==='alchemy'){ctx.fillStyle='#5f7c68';ctx.beginPath();ctx.moveTo(-w*.32,wallTop+h*.23);ctx.lineTo(w*.32,wallTop+h*.23);ctx.lineTo(w*.25,wallTop+h*.34);ctx.lineTo(-w*.25,wallTop+h*.34);ctx.closePath();ctx.fill();for(const q of [-.18,0,.18])ellipse(q*w,wallBottom-h*.06,4*z,7*z,q===0?'#9879a2':'#6e9579',.9);}
    if(kind==='tavern'){ctx.fillStyle='#7e4e3e';ctx.beginPath();ctx.moveTo(w*.32,wallTop+h*.12);ctx.lineTo(w*.55,wallTop+h*.17);ctx.lineTo(w*.46,wallTop+h*.34);ctx.lineTo(w*.32,wallTop+h*.29);ctx.closePath();ctx.fill();}
    ctx.restore();count('object');return true;
  }

  function drawMarket(o){
    const p=worldToScreen(o.x,o.y),z=camera.zoom*(o.s||1),h=128*z,w=132*z;if(!visible(p,w,h))return true;shadowAt(p,56*(o.s||1),15*(o.s||1),.22);ctx.save();ctx.translate(p.x,p.y);
    ctx.fillStyle=P.wood;rr(-w*.43,-h*.28,w*.86,h*.22,4*z);ctx.fill();ctx.strokeStyle=P.woodDark;ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(-w*.38,-h*.05);ctx.lineTo(-w*.38,-h*.70);ctx.moveTo(w*.38,-h*.05);ctx.lineTo(w*.38,-h*.70);ctx.stroke();
    ctx.fillStyle=grad(0,-h*.80,0,-h*.48,'#c99064','#a3614e','#71453e');ctx.beginPath();ctx.moveTo(-w*.50,-h*.53);ctx.lineTo(-w*.40,-h*.78);ctx.lineTo(w*.40,-h*.78);ctx.lineTo(w*.50,-h*.53);ctx.closePath();ctx.fill();
    for(const q of [-.25,0,.25]){ctx.fillStyle=q===0?'#b79658':'#6f8455';rr(q*w-w*.08,-h*.28,w*.16,h*.12,3*z);ctx.fill();}ctx.restore();count('object');return true;
  }

  function drawTree(o,type='broadleaf'){
    const p=worldToScreen(o.x,o.y),s=o.s||1,z=camera.zoom*s,h=(type==='pine'?154:type==='fen'?148:151)*z,w=(type==='pine'?86:116)*z;if(!visible(p,w,h))return true;shadowAt(p,(type==='pine'?32:42)*s,14*s,.18);ctx.save();ctx.translate(p.x,p.y);
    ctx.strokeStyle=P.woodDark;ctx.lineWidth=10*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-3*z);ctx.lineTo(0,-h*.48);ctx.stroke();
    if(type==='pine'){const cols=['#314c38','#3d5a40','#4b6848'];for(let i=0;i<4;i++){const yy=-h*(.32+i*.15),ww=w*(.52-i*.08);ctx.fillStyle=cols[i%3];ctx.beginPath();ctx.moveTo(0,yy-h*.30);ctx.lineTo(-ww,yy+h*.08);ctx.quadraticCurveTo(0,yy+h*.02,ww,yy+h*.08);ctx.closePath();ctx.fill();}}
    else {const cols=type==='fen'?['#405c51','#4f6a5d','#617862']:['#47633f','#577548','#688352'];const blobs=[[-.23,-.58,.28],[.20,-.62,.31],[0,-.79,.29],[-.05,-.48,.30],[.29,-.78,.21],[-.30,-.77,.20]];for(const [x,y,r] of blobs){const g=ctx.createRadialGradient(x*w*.7,y*h,2,x*w*.7,y*h,r*w);g.addColorStop(0,cols[2]);g.addColorStop(.58,cols[1]);g.addColorStop(1,cols[0]);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x*w*.7,y*h,r*w,r*w*.78,0,0,TAU);ctx.fill();}if(type==='fen'){ctx.strokeStyle='rgba(96,128,101,.52)';ctx.lineWidth=2*z;for(const x of [-.22,.04,.28]){ctx.beginPath();ctx.moveTo(x*w,-h*.55);ctx.quadraticCurveTo(x*w+8*z,-h*.36,x*w-2*z,-h*.20);ctx.stroke();}}}
    ctx.restore();count('object');return true;
  }

  function drawRock(o,kind='rock'){
    const p=worldToScreen(o.x,o.y),s=o.s||1,z=camera.zoom*s,h=(kind==='dead'?88:62)*z,w=82*z;if(!visible(p,w,h))return true;shadowAt(p,31*s,10*s,.18);ctx.save();ctx.translate(p.x,p.y);
    if(kind==='dead'){ctx.strokeStyle='#4b4439';ctx.lineWidth=9*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-2*z,-h*.70);ctx.lineTo(-19*z,-h*.88);ctx.moveTo(-2*z,-h*.58);ctx.lineTo(20*z,-h*.78);ctx.stroke();}
    else {const base=kind==='den'?'#574944':kind==='quarry'?'#6f6d65':P.stone;ctx.fillStyle=grad(-w/2,-h,w/2,0,P.stoneLight,base,P.stoneDark);ctx.beginPath();ctx.moveTo(-w*.42,0);ctx.lineTo(-w*.30,-h*.58);ctx.lineTo(-w*.05,-h*.82);ctx.lineTo(w*.28,-h*.62);ctx.lineTo(w*.43,-h*.20);ctx.lineTo(w*.28,0);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(236,227,205,.18)';ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(-w*.18,-h*.50);ctx.lineTo(w*.05,-h*.66);ctx.lineTo(w*.25,-h*.48);ctx.stroke();}
    ctx.restore();count('object');return true;
  }

  function drawSmallObject(o){
    const p=worldToScreen(o.x,o.y),s=o.s||1,z=camera.zoom*s;if(!visible(p,130*z,115*z))return true;shadowAt(p,24*s,8*s,.15);ctx.save();ctx.translate(p.x,p.y);
    switch(o.type){
      case 'bush': case 'garden': {const col=o.type==='garden'?'#587248':P.green2;for(const [x,y,r] of [[-14,-18,16],[9,-20,19],[0,-31,17]])ellipse(x*z,y*z,r*z,r*z*.72,col,.95);if(o.type==='garden')for(const [x,c] of [[-14,'#d5bd6c'],[1,'#c8796f'],[16,'#b58bb0']])ellipse(x*z,-27*z,3*z,3*z,c,.9);break;}
      case 'well':ctx.strokeStyle=P.stoneLight;ctx.lineWidth=11*z;ctx.beginPath();ctx.ellipse(0,-9*z,30*z,14*z,0,0,TAU);ctx.stroke();ctx.strokeStyle=P.woodDark;ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(-25*z,-9*z);ctx.lineTo(-25*z,-52*z);ctx.moveTo(25*z,-9*z);ctx.lineTo(25*z,-52*z);ctx.moveTo(-27*z,-48*z);ctx.lineTo(27*z,-48*z);ctx.stroke();break;
      case 'lamp':ctx.strokeStyle=P.woodDark;ctx.lineWidth=6*z;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-68*z);ctx.stroke();ctx.fillStyle='#54493a';rr(-11*z,-72*z,22*z,28*z,4*z);ctx.fill();ellipse(0,-57*z,7*z,9*z,'#efbd72',.78);break;
      case 'fence':ctx.strokeStyle=P.wood;ctx.lineWidth=7*z;ctx.beginPath();ctx.moveTo(-40*z,0);ctx.lineTo(-40*z,-47*z);ctx.moveTo(40*z,0);ctx.lineTo(40*z,-47*z);ctx.moveTo(-42*z,-33*z);ctx.lineTo(42*z,-25*z);ctx.moveTo(-42*z,-14*z);ctx.lineTo(42*z,-8*z);ctx.stroke();break;
      case 'board': case 'groveSign': case 'fenSign': case 'stonepineSign':ctx.strokeStyle=P.woodDark;ctx.lineWidth=7*z;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-58*z);ctx.stroke();ctx.fillStyle=P.woodLight;rr(-32*z,-66*z,64*z,30*z,5*z);ctx.fill();ctx.strokeStyle='rgba(70,53,39,.55)';ctx.lineWidth=2*z;ctx.stroke();break;
      case 'banner':ctx.strokeStyle=P.woodDark;ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-82*z);ctx.stroke();ctx.fillStyle='#855444';ctx.beginPath();ctx.moveTo(4*z,-76*z);ctx.lineTo(42*z,-68*z);ctx.lineTo(31*z,-40*z);ctx.lineTo(4*z,-47*z);ctx.closePath();ctx.fill();break;
      case 'ember':ellipse(0,-10*z,12*z,7*z,'rgba(201,91,54,.34)');ellipse(-3*z,-13*z,6*z,11*z,P.ember,.85);ellipse(3*z,-15*z,3*z,7*z,P.emberHot,.95);break;
      case 'ruin': case 'fenRuin': case 'stonepineRuin':ctx.fillStyle=P.stone;ctx.beginPath();ctx.moveTo(-36*z,0);ctx.lineTo(-29*z,-38*z);ctx.lineTo(-7*z,-48*z);ctx.lineTo(0,-24*z);ctx.lineTo(18*z,-55*z);ctx.lineTo(35*z,-10*z);ctx.lineTo(29*z,0);ctx.closePath();ctx.fill();break;
      case 'shortcut': case 'fenGate': case 'stonepineGate': {const active=o.active!==false;ctx.strokeStyle=active?'#8a865e':'#5f5d53';ctx.lineWidth=10*z;ctx.beginPath();ctx.arc(0,-18*z,30*z,Math.PI,TAU);ctx.stroke();ctx.fillStyle=active?'rgba(173,188,116,.18)':'rgba(33,37,33,.14)';ctx.beginPath();ctx.ellipse(0,-2*z,34*z,14*z,0,0,TAU);ctx.fill();break;}
      case 'groveCache': case 'fenCache': case 'stonepineCache':ctx.fillStyle=P.wood;rr(-28*z,-28*z,56*z,28*z,5*z);ctx.fill();ctx.strokeStyle=P.iron;ctx.lineWidth=4*z;ctx.stroke();break;
      case 'fenPool':ellipse(0,-4*z,46*z,17*z,P.water,.38);ellipse(-7*z,-7*z,25*z,8*z,'#7c9a85',.18);break;
      case 'stonepineCamp':ctx.fillStyle='#8f7a56';ctx.beginPath();ctx.moveTo(-42*z,0);ctx.lineTo(0,-70*z);ctx.lineTo(42*z,0);ctx.closePath();ctx.fill();ctx.fillStyle='#5b4936';ctx.beginPath();ctx.moveTo(-3*z,-8*z);ctx.lineTo(0,-48*z);ctx.lineTo(12*z,-8*z);ctx.closePath();ctx.fill();break;
      case 'wagon':ctx.fillStyle=P.woodLight;rr(-43*z,-43*z,86*z,35*z,5*z);ctx.fill();ellipse(-30*z,0,16*z,16*z,P.woodDark);ellipse(30*z,0,16*z,16*z,P.woodDark);ctx.strokeStyle=P.woodDark;ctx.lineWidth=6*z;ctx.beginPath();ctx.moveTo(40*z,-25*z);ctx.lineTo(72*z,-43*z);ctx.stroke();break;
      default:ctx.restore();return false;
    }
    ctx.restore();count('object');return true;
  }

  function drawHumanAt(entity,role='villager',isPlayer=false){
    const p=worldToScreen(entity.x,entity.y),z=camera.zoom*(isPlayer?1:(entity.s||1)),h=(isPlayer?68:66)*z,w=38*z;if(!visible(p,w,h,130))return true;shadowAt(p,19*(entity.s||1),7*(entity.s||1),.20);ctx.save();ctx.translate(p.x,p.y);
    const palette={player:['#3f6249','#304b3a','#6d8460'],alden:['#78513f','#503b32','#98705a'],rowan:['#6c5a43','#4e4336','#9b7c55'],mira:['#5a6e64','#42564f','#7e8f78'],villager:['#6d624e','#50483c','#8a7a5e']}[role]||['#6d624e','#50483c','#8a7a5e'];
    ctx.fillStyle=grad(0,-h*.65,0,0,palette[2],palette[0],palette[1]);ctx.beginPath();ctx.moveTo(-w*.40,0);ctx.lineTo(-w*.31,-h*.55);ctx.quadraticCurveTo(0,-h*.72,w*.30,-h*.55);ctx.lineTo(w*.42,0);ctx.closePath();ctx.fill();ellipse(0,-h*.73,10*z,11*z,'#c5a47d');ctx.fillStyle='#4a3b31';ctx.beginPath();ctx.arc(0,-h*.76,11*z,Math.PI,TAU);ctx.fill();
    ctx.strokeStyle='#c7a17a';ctx.lineWidth=5*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-w*.24,-h*.44);ctx.lineTo(-w*.43,-h*.27);ctx.moveTo(w*.24,-h*.44);ctx.lineTo(w*.43,-h*.27);ctx.stroke();
    if(role==='alden'){ctx.fillStyle='#6d6f69';rr(-10*z,-h*.47,20*z,16*z,3*z);ctx.fill();}if(role==='mira'){ellipse(w*.25,-h*.42,4*z,7*z,'#8ea68c',.9);ellipse(-w*.27,-h*.38,3*z,6*z,'#a184a7',.85);}
    if(isPlayer){const fx=player.facingX||1,fy=player.facingY||0,a=Math.atan2(fy,fx);ctx.save();ctx.translate(fx*9*z,-h*.36+fy*3*z);ctx.rotate(a*.55+.15);if(player.weaponType==='bow'){ctx.strokeStyle='#8d6747';ctx.lineWidth=3*z;ctx.beginPath();ctx.arc(9*z,-2*z,17*z,-1.15,1.1);ctx.stroke();ctx.strokeStyle='#ddcaa4';ctx.lineWidth=1.2*z;ctx.beginPath();ctx.moveTo(16*z,-18*z);ctx.lineTo(2*z,-2*z);ctx.lineTo(16*z,14*z);ctx.stroke();}else if(player.weaponType==='staff'){ctx.strokeStyle='#65513d';ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(-3*z,5*z);ctx.lineTo(23*z,-21*z);ctx.stroke();ellipse(26*z,-24*z,6*z,6*z,'#8acda9',.85);}else{ctx.strokeStyle=player.reinforced?'#ddd5bb':'#a9aaa1';ctx.lineWidth=4*z;ctx.beginPath();ctx.moveTo(0,2*z);ctx.lineTo(27*z,-17*z);ctx.stroke();}ctx.restore();}
    ctx.restore();count(isPlayer?'player':'object');return true;
  }

  function npcRole(o){const n=String(o.name||o.label||'').toLowerCase();if(n.includes('alden')||n.includes('perrin')||n.includes('smith'))return'alden';if(n.includes('rowan')||n.includes('maeve')||n.includes('merchant')||n.includes('trader'))return'rowan';if(n.includes('mira')||n.includes('orin')||n.includes('alchem'))return'mira';return'villager';}

  const knownObjectTypes=new Set(['npc','cottage','tavern','forge','alchemy','merchant','well','tree','fenTree','stonepineTree','bush','garden','rock','quarryRock','denRock','deadTree','ember','lamp','fence','board','groveSign','fenSign','stonepineSign','ruin','fenRuin','stonepineRuin','shortcut','fenGate','stonepineGate','groveCache','fenCache','stonepineCache','fenPool','stonepineCamp','banner','shed','wagon']);
  const knownResourceTypes=new Set(['herb','mooncap','ore','iron','mossglass','resin']);
  const knownEnemyTypes=new Set(['wolf','boar','boss','grovekeeper','mireling','bogstalker','fenwarden','ridgehorn','quarrywisp','quarrysentinel']);
  for(const o of worldObjects)if(!knownObjectTypes.has(o.type))state.missingWorldTypes.push(`object:${o.type}`);
  for(const r of resources)if(!knownResourceTypes.has(r.type))state.missingWorldTypes.push(`resource:${r.type}`);
  for(const e of enemies)if(!knownEnemyTypes.has(e.type))state.missingWorldTypes.push(`enemy:${e.type}`);
  if(state.missingWorldTypes.length){state.failed=true;state.enabled=false;state.failure=`NO-FALLBACK preflight: ${[...new Set(state.missingWorldTypes)].join(', ')}`;console.error(`[art-v1] ${state.failure}`);document.documentElement.dataset.briarGlenArtV1='failed';}

  drawGround=function artV1Ground(){drawGroundArt();};
  drawRoute=function artV1Route(){drawRouteArt();};
  drawObject=function artV1Object(o){if(state.failed)return;if(o.type==='npc')return drawHumanAt(o,npcRole(o),false);if(['cottage','tavern','forge','alchemy','shed'].includes(o.type))return drawTimberBuilding(o,o.type);if(o.type==='merchant')return drawMarket(o);if(o.type==='tree')return drawTree(o,Math.abs(Math.round(o.x*7+o.y*11))%4===0?'pine':'broadleaf');if(o.type==='fenTree')return drawTree(o,'fen');if(o.type==='stonepineTree')return drawTree(o,'pine');if(['rock','quarryRock','denRock','deadTree'].includes(o.type))return drawRock(o,o.type==='deadTree'?'dead':o.type==='denRock'?'den':o.type==='quarryRock'?'quarry':'rock');if(drawSmallObject(o))return;state.failed=true;state.enabled=false;state.failure=`NO-FALLBACK draw miss object:${o.type}`;console.error(`[art-v1] ${state.failure}`);};

  drawResource=function artV1Resource(r){
    if(state.failed||!r.active)return;const p=worldToScreen(r.x,r.y),z=camera.zoom;if(!visible(p,70*z,60*z,120))return;shadowAt(p,15,6,.14);ctx.save();ctx.translate(p.x,p.y);
    if(r.type==='herb'||r.type==='mooncap'){ctx.strokeStyle=r.type==='mooncap'?'#6e7256':'#44613e';ctx.lineWidth=3*z;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(i*4*z,-12*z,i*7*z,-22*z);ctx.stroke();}if(r.type==='mooncap'){for(const x of [-10,0,10]){ctx.fillStyle='#c9b7a2';ctx.beginPath();ctx.arc(x*z,-17*z,6*z,Math.PI,TAU);ctx.fill();}}else{ellipse(-8*z,-17*z,5*z,4*z,'#7da667');ellipse(7*z,-20*z,5*z,4*z,'#88b06f');}}
    else if(r.type==='resin'){ctx.strokeStyle=P.wood;ctx.lineWidth=7*z;ctx.lineCap='round';for(const y of [-4,-11,-18]){ctx.beginPath();ctx.moveTo(-18*z,y*z);ctx.lineTo(18*z,(y-2)*z);ctx.stroke();}ellipse(8*z,-17*z,4*z,5*z,'#b48348',.85);}
    else{const stone=r.type==='mossglass'?'#66847d':r.type==='iron'?P.iron:P.stone;ctx.fillStyle=grad(-20*z,-35*z,20*z,0,P.stoneLight,stone,P.stoneDark);ctx.beginPath();ctx.moveTo(-19*z,0);ctx.lineTo(-14*z,-24*z);ctx.lineTo(2*z,-34*z);ctx.lineTo(20*z,-9*z);ctx.lineTo(13*z,0);ctx.closePath();ctx.fill();const ore=r.type==='mossglass'?'#91b8a8':r.type==='iron'?'#a6aaa2':'#b87250';ellipse(-4*z,-15*z,5*z,4*z,ore);ellipse(8*z,-20*z,4*z,4*z,ore);}ctx.restore();count('resource');
  };

  function enemyStatus(e,p){const bossLike=['boss','fenwarden','quarrysentinel'].includes(e.type);if(e.hp>=e.maxHp&&!bossLike)return;const w=(bossLike?112:58)*camera.zoom,y=p.y-(bossLike?97:61)*camera.zoom;ctx.fillStyle='rgba(0,0,0,.42)';rr(p.x-w/2,y,w,7*camera.zoom,4*camera.zoom);ctx.fill();ctx.fillStyle=e.type==='fenwarden'?'#6d9a8e':e.type==='quarrysentinel'?'#a07d5a':e.type==='boss'?P.ember:'#b66d55';rr(p.x-w/2,y,w*(e.hp/e.maxHp),7*camera.zoom,4*camera.zoom);ctx.fill();if(bossLike&&typeof labelAt==='function')labelAt(p.x,y-9*camera.zoom,e.type==='boss'?'EMBERBACK':e.type==='fenwarden'?'DROWNED WARDEN':'QUARRY SENTINEL');}
  function qbody(p,z,col,headX=20,headY=-28){ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(p.x,p.y-18*z,30*z,17*z,0,0,TAU);ctx.fill();ellipse(p.x+headX*z,p.y+headY*z,14*z,12*z,col);ctx.strokeStyle=col;ctx.lineWidth=6*z;ctx.lineCap='round';for(const x of [-14,10]){ctx.beginPath();ctx.moveTo(p.x+x*z,p.y-7*z);ctx.lineTo(p.x+(x-2)*z,p.y+5*z);ctx.stroke();}}
  drawEnemy=function artV1Enemy(e){
    if(state.failed||e.dead)return;const p=worldToScreen(e.x,e.y),z=camera.zoom*(e.scale||1);if(!visible(p,160*z,130*z,160))return;if(['ridgehorn','quarrywisp','quarrysentinel'].includes(e.type)&&typeof drawStoneTelegraph==='function')drawStoneTelegraph(e,p,z);else if(typeof drawEnemyTelegraph==='function')drawEnemyTelegraph(e,p);shadowAt(p,26*(e.scale||1),10*(e.scale||1),.22);ctx.save();ctx.globalAlpha=e.hurt>0?.74:1;
    if(e.type==='wolf'){qbody(p,z,'#5e665e',18,-26);ctx.fillStyle='#4b524c';ctx.beginPath();ctx.moveTo(p.x+20*z,p.y-39*z);ctx.lineTo(p.x+27*z,p.y-50*z);ctx.lineTo(p.x+29*z,p.y-36*z);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(p.x+10*z,p.y-38*z);ctx.lineTo(p.x+8*z,p.y-49*z);ctx.lineTo(p.x+18*z,p.y-36*z);ctx.closePath();ctx.fill();ctx.strokeStyle='#52594f';ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(p.x-28*z,p.y-20*z);ctx.quadraticCurveTo(p.x-47*z,p.y-34*z,p.x-41*z,p.y-47*z);ctx.stroke();}
    else if(e.type==='boar'||e.type==='boss'||e.type==='ridgehorn'){const col=e.type==='boss'?'#7c4939':e.type==='ridgehorn'?'#6f6758':'#6f5140';qbody(p,z,col,20,-24);if(e.type==='boss'){for(const side of [-1,1]){ctx.fillStyle=P.emberHot;ctx.beginPath();ctx.moveTo(p.x+(18+side*5)*z,p.y-36*z);ctx.lineTo(p.x+(22+side*13)*z,p.y-49*z);ctx.lineTo(p.x+(25+side*5)*z,p.y-34*z);ctx.closePath();ctx.fill();}ellipse(p.x-6*z,p.y-27*z,13*z,8*z,P.ember,.25);}else if(e.type==='ridgehorn'){ctx.strokeStyle='#d1c4a4';ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(p.x+15*z,p.y-35*z);ctx.quadraticCurveTo(p.x+12*z,p.y-55*z,p.x+1*z,p.y-56*z);ctx.moveTo(p.x+26*z,p.y-34*z);ctx.quadraticCurveTo(p.x+35*z,p.y-51*z,p.x+45*z,p.y-49*z);ctx.stroke();}else{ctx.fillStyle='#d7c4a1';ctx.beginPath();ctx.moveTo(p.x+27*z,p.y-24*z);ctx.lineTo(p.x+38*z,p.y-18*z);ctx.lineTo(p.x+28*z,p.y-15*z);ctx.closePath();ctx.fill();}}
    else if(e.type==='grovekeeper'){ctx.strokeStyle='#4e5d42';ctx.lineWidth=13*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-58*z);ctx.moveTo(p.x,p.y-42*z);ctx.lineTo(p.x-25*z,p.y-25*z);ctx.moveTo(p.x,p.y-42*z);ctx.lineTo(p.x+25*z,p.y-25*z);ctx.stroke();ellipse(p.x,p.y-66*z,22*z,18*z,'#637956');ellipse(p.x-13*z,p.y-70*z,15*z,14*z,'#758b5d');ellipse(p.x+16*z,p.y-69*z,14*z,15*z,'#6d8358');}
    else if(e.type==='mireling'){ctx.fillStyle='#55766a';ctx.beginPath();ctx.moveTo(p.x-27*z,p.y);ctx.quadraticCurveTo(p.x-25*z,p.y-25*z,p.x-8*z,p.y-31*z);ctx.quadraticCurveTo(p.x+4*z,p.y-39*z,p.x+14*z,p.y-26*z);ctx.quadraticCurveTo(p.x+29*z,p.y-21*z,p.x+27*z,p.y);ctx.closePath();ctx.fill();ellipse(p.x-7*z,p.y-18*z,3*z,4*z,'#c9d7bd');ellipse(p.x+8*z,p.y-18*z,3*z,4*z,'#c9d7bd');}
    else if(e.type==='bogstalker'){qbody(p,z,'#4e6258',17,-29);ctx.strokeStyle='#405348';ctx.lineWidth=4*z;ctx.beginPath();ctx.moveTo(p.x-10*z,p.y-33*z);ctx.lineTo(p.x-22*z,p.y-52*z);ctx.moveTo(p.x+2*z,p.y-34*z);ctx.lineTo(p.x+6*z,p.y-55*z);ctx.stroke();}
    else if(e.type==='fenwarden'){ctx.fillStyle='#526b67';ctx.beginPath();ctx.moveTo(p.x-23*z,p.y);ctx.lineTo(p.x-17*z,p.y-61*z);ctx.lineTo(p.x,p.y-79*z);ctx.lineTo(p.x+19*z,p.y-60*z);ctx.lineTo(p.x+26*z,p.y);ctx.closePath();ctx.fill();ctx.fillStyle='#6f817d';rr(p.x-17*z,p.y-65*z,34*z,27*z,4*z);ctx.fill();ellipse(p.x,p.y-78*z,13*z,13*z,'#6e7d79');ellipse(p.x-4*z,p.y-79*z,2*z,2*z,'#b7d4c7');ellipse(p.x+4*z,p.y-79*z,2*z,2*z,'#b7d4c7');}
    else if(e.type==='quarrywisp'){ellipse(p.x,p.y-33*z,18*z,18*z,'#869483',.72);ellipse(p.x,p.y-33*z,8*z,8*z,'#c4cfb7',.85);ctx.fillStyle='#686d65';for(let i=0;i<4;i++){const a=i*TAU/4+.4;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*23*z,p.y-33*z+Math.sin(a)*12*z);ctx.lineTo(p.x+Math.cos(a+.22)*31*z,p.y-33*z+Math.sin(a+.22)*18*z);ctx.lineTo(p.x+Math.cos(a-.22)*29*z,p.y-33*z+Math.sin(a-.22)*17*z);ctx.closePath();ctx.fill();}}
    else if(e.type==='quarrysentinel'){ctx.fillStyle='#64665f';rr(p.x-25*z,p.y-62*z,50*z,57*z,8*z);ctx.fill();ellipse(p.x,p.y-71*z,20*z,17*z,'#73756d');ctx.strokeStyle='#565951';ctx.lineWidth=12*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x-23*z,p.y-47*z);ctx.lineTo(p.x-39*z,p.y-14*z);ctx.moveTo(p.x+23*z,p.y-47*z);ctx.lineTo(p.x+40*z,p.y-14*z);ctx.stroke();ellipse(p.x-6*z,p.y-73*z,3*z,3*z,'#d2c59b');ellipse(p.x+6*z,p.y-73*z,3*z,3*z,'#d2c59b');}
    ctx.restore();count('enemy');enemyStatus(e,p);
  };
  drawPlayer=function artV1Player(){if(state.failed)return;drawHumanAt(player,'player',true);};
})();
