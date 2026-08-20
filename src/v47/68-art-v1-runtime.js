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
    version:'storybook-canvas-v2',
    renderer:'single-owner-painterly-storybook',
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
  function rand01(x,y,s=0){return hash(x,y,s)/4294967295;}
  function clamp01(v){return Math.max(0,Math.min(1,v));}
  function rr(x,y,w,h,r){const q=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+q,y);ctx.arcTo(x+w,y,x+w,y+h,q);ctx.arcTo(x+w,y+h,x,y+h,q);ctx.arcTo(x,y+h,x,y,q);ctx.arcTo(x,y,x+w,y,q);ctx.closePath();}
  function ellipse(x,y,rx,ry,fill,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();ctx.restore();}
  function strokeLine(points,color,width,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();ctx.restore();}
  function grad(x0,y0,x1,y1,a,b,c){const g=ctx.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,a);g.addColorStop(.62,b);g.addColorStop(1,c||b);return g;}
  function visible(p,w=220,h=220,m=180){return p.x+w/2>-m&&p.x-w/2<viewport.w+m&&p.y>-m&&p.y-h<viewport.h+m;}
  function shadowAt(p,rx,ry,alpha=.22){ellipse(p.x,p.y+5*camera.zoom,rx*camera.zoom,ry*camera.zoom,'#1e241d',alpha);}
  function count(kind){state.frameDraws++;state.totalDraws++;if(kind==='object')state.objectDraws++;else if(kind==='resource')state.resourceDraws++;else if(kind==='enemy')state.enemyDraws++;else if(kind==='player')state.playerDraws++;}

  const groundPatterns = new Map();
  function buildPattern(region){
    const s=REGION_STYLE[region],c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
    g.fillStyle=s.base;g.fillRect(0,0,512,512);
    // Broad mottled color fields establish painterly ground mass instead of flat fill.
    for(let i=0;i<120;i++){
      const x=hash(i,17,3)%512,y=hash(i,31,7)%512,rx=18+(hash(i,41,9)%62),ry=8+(hash(i,43,12)%30);
      g.globalAlpha=.018+((hash(i,55,11)%100)/100)*.045;
      g.fillStyle=i%4===0?s.light:i%4===1?s.dark:i%4===2?s.accent:s.base;
      g.beginPath();g.ellipse(x,y,rx,ry,(hash(i,77,2)%628)/100,0,TAU);g.fill();
    }
    // Fine leaf litter / grass clumps / mineral flecks.
    for(let i=0;i<640;i++){
      const x=hash(i,91,13)%512,y=hash(i,97,17)%512,r=.6+(hash(i,101,19)%28)/10;
      g.globalAlpha=.025+((hash(i,103,23)%100)/100)*.075;
      g.fillStyle=i%5===0?s.light:i%5===1?s.dark:i%7===0?s.accent:'rgba(236,219,177,.35)';
      g.beginPath();g.ellipse(x,y,r*1.8,r*.55,(hash(i,107,29)%628)/100,0,TAU);g.fill();
      if(i%4===0){
        g.strokeStyle=i%8===0?s.light:s.dark;g.lineWidth=.7;g.beginPath();g.moveTo(x,y);g.lineTo(x+((i%3)-1)*2,y-3-(i%5));g.stroke();
      }
    }
    if(region==='den'){
      for(let i=0;i<65;i++){const x=hash(i,211,31)%512,y=hash(i,223,33)%512;g.globalAlpha=.10;g.fillStyle=i%3===0?'#8e4c36':'#2f2b29';g.beginPath();g.arc(x,y,1+(i%4),0,TAU);g.fill();}
    }
    if(region==='fen'){
      for(let i=0;i<55;i++){const x=hash(i,251,37)%512,y=hash(i,263,39)%512;g.globalAlpha=.055;g.strokeStyle='#8fa58d';g.lineWidth=.8;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+4,y-5,x+2,y-10);g.stroke();}
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
    const region=regionAt(camera.x,camera.y),s=REGION_STYLE[region];
    ctx.fillStyle=pattern(region);ctx.fillRect(0,0,viewport.w,viewport.h);
    // World-anchored large patches keep the floor from reading as a screen-space texture sheet.
    const gx=Math.floor(camera.x/150),gy=Math.floor(camera.y/150),z=camera.zoom;
    for(let ix=-8;ix<=8;ix++)for(let iy=-7;iy<=7;iy++){
      const cx=(gx+ix)*150,cy=(gy+iy)*150,h=hash(gx+ix,gy+iy,51),p=worldToScreen(cx+(h%75)-37,cy+((h>>>8)%75)-37);
      if(p.x<-160||p.x>viewport.w+160||p.y<-120||p.y>viewport.h+120)continue;
      const a=.018+((h>>>16)%30)/1000,rx=(32+(h%45))*z,ry=(10+((h>>>5)%23))*z;
      ellipse(p.x,p.y,rx,ry,(h%3===0?s.light:h%3===1?s.dark:s.accent),a);
      if(h%5===0 && region!=='den'){
        ctx.save();ctx.strokeStyle=h%2?'rgba(45,65,39,.32)':'rgba(118,139,88,.28)';ctx.lineWidth=Math.max(.8,1.1*z);ctx.lineCap='round';
        for(let k=0;k<3;k++){const ox=((h>>>(k*3))%25-12)*z,oy=((h>>>(k*4+2))%15-7)*z;ctx.beginPath();ctx.moveTo(p.x+ox,p.y+oy);ctx.lineTo(p.x+ox+(k-1)*2*z,p.y+oy-(4+k*2)*z);ctx.stroke();}
        ctx.restore();
      }
      if((region==='village'||region==='meadow'||region==='grove') && h%17===0){
        const cols=['#d7c06d','#c97a6c','#b68caf','#e0d59a'];for(let k=0;k<3;k++)ellipse(p.x+(k-1)*5*z,p.y-(3+(k%2)*4)*z,1.8*z,1.8*z,cols[(h+k)%cols.length],.72);
      }
    }
    if(region==='fen'){
      for(let i=0;i<6;i++){const wx=1100+i*185,wy=-1350-(i%3)*185,p=worldToScreen(wx,wy);ellipse(p.x,p.y,78*z,22*z,P.water,.12);ellipse(p.x-8*z,p.y-2*z,55*z,12*z,'#89a18c',.045);}
    }
    if(region==='den'){
      for(let i=0;i<9;i++){const wx=1460+i*78,wy=((i%4)-2)*180,p=worldToScreen(wx,wy);ellipse(p.x,p.y,30*z,10*z,P.ember,.035);}
    }
    const sun=ctx.createLinearGradient(0,0,viewport.w,viewport.h);sun.addColorStop(0,'rgba(255,237,181,.115)');sun.addColorStop(.48,'rgba(255,237,181,.015)');sun.addColorStop(1,region==='den'?'rgba(39,22,18,.22)':'rgba(24,34,24,.13)');ctx.fillStyle=sun;ctx.fillRect(0,0,viewport.w,viewport.h);
  }

  function drawRouteArt(){
    const r=regionAt(camera.x,camera.y),pts=ROUTES[r==='village'?'meadow':r],z=camera.zoom,s=REGION_STYLE[r];
    if(r==='village'){
      const p=worldToScreen(-620,30),rx=218*z,ry=110*z;
      ellipse(p.x,p.y+4*z,rx*1.04,ry*1.03,'#4f493d',.16);
      ellipse(p.x,p.y,rx,ry,'#9a8767',.60);
      ctx.save();ctx.beginPath();ctx.ellipse(p.x,p.y,rx,ry,0,0,TAU);ctx.clip();
      // Irregular cobbles with warm highlights and darker grout.
      const cell=16*z;for(let yy=p.y-ry-10*z;yy<p.y+ry+10*z;yy+=cell*.73){for(let xx=p.x-rx-10*z;xx<p.x+rx+10*z;xx+=cell){const h=hash(Math.round(xx/z),Math.round(yy/z),71),ox=((h%7)-3)*z,oy=(((h>>>4)%5)-2)*z,w=(8+(h%7))*z,hg=(4+((h>>>8)%5))*z;ctx.fillStyle=(h%3===0)?'rgba(190,171,133,.22)':'rgba(90,80,64,.15)';ctx.beginPath();ctx.ellipse(xx+ox,yy+oy,w,hg,(h%30)/10,0,TAU);ctx.fill();ctx.strokeStyle='rgba(55,50,42,.18)';ctx.lineWidth=.8*z;ctx.stroke();}}
      ctx.restore();
    }
    if(!pts)return;
    const sp=pts.map(([x,y])=>{const p=worldToScreen(x,y);return[p.x,p.y];});
    strokeLine(sp,'rgba(47,41,34,.24)',82*z,1);strokeLine(sp,s.edge,72*z,.52);strokeLine(sp,s.path,60*z,.82);strokeLine(sp,'rgba(233,216,178,.14)',4*z,1);
    // Soft grass/stone breakup at the path edges.
    for(let i=0;i<sp.length-1;i++){
      const [ax,ay]=sp[i],[bx,by]=sp[i+1];for(let k=1;k<=5;k++){const t=k/6,h=hash(i,k,93),x=ax+(bx-ax)*t,y=ay+(by-ay)*t,side=(h%2?1:-1),nx=-(by-ay),ny=bx-ax,len=Math.hypot(nx,ny)||1,off=(31+((h>>>5)%11))*z;const px=x+nx/len*off*side,py=y+ny/len*off*side;if(h%3===0)ellipse(px,py,3.5*z,2*z,'rgba(99,92,72,.32)',1);else{ctx.save();ctx.strokeStyle='rgba(62,88,52,.40)';ctx.lineWidth=1*z;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+((h%5)-2)*z,py-5*z);ctx.stroke();ctx.restore();}}
    }
  }

  function drawTimberBuilding(o,kind='cottage'){
    const p=worldToScreen(o.x,o.y),z=camera.zoom*(o.s||1),cfg={cottage:[154,108],tavern:[178,126],forge:[160,112],alchemy:[160,112],shed:[126,90]}[kind]||[154,108];
    const h=cfg[0]*z,w=cfg[1]*z;if(!visible(p,w,h))return true;shadowAt(p,w*.46/z,18*(o.s||1),.28);
    ctx.save();ctx.translate(p.x,p.y);
    const wallTop=-h*.57,wallBottom=-h*.09,roofPeak=-h*.98,roofEave=-h*.49;
    // Stone foundation: individual uneven blocks, not a flat strip.
    ctx.fillStyle='#66655c';rr(-w*.42,-h*.17,w*.84,h*.14,4*z);ctx.fill();
    ctx.strokeStyle='rgba(218,209,188,.18)';ctx.lineWidth=1*z;for(let i=-3;i<=3;i++){const x=i*w*.115;ctx.beginPath();ctx.moveTo(x,-h*.17);ctx.lineTo(x+(i%2)*3*z,-h*.04);ctx.stroke();}
    // Warm plaster/wood wall body.
    ctx.fillStyle=grad(-w*.45,wallTop,w*.45,wallBottom,'#d1ba91','#a88e6b','#80684f');rr(-w*.39,wallTop,w*.78,wallBottom-wallTop,4*z);ctx.fill();
    // Subtle plaster mottling.
    for(let i=0;i<9;i++){const hh=hash(Math.round(o.x),i,117),x=(-.32+(hh%64)/100)*w,y=wallTop+(.10+((hh>>>6)%65)/100)*(wallBottom-wallTop);ellipse(x,y,(3+(hh%5))*z,(1.3+(hh%3))*z,i%2?'#eee1c3':'#7d6b56',.08);}
    // Timber frame with diagonals.
    ctx.strokeStyle='rgba(62,45,33,.82)';ctx.lineWidth=4.2*z;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
    for(const q of [-.27,.27]){ctx.moveTo(q*w,wallTop);ctx.lineTo(q*w,wallBottom);}ctx.moveTo(-w*.38,wallTop+h*.20);ctx.lineTo(w*.38,wallTop+h*.20);ctx.moveTo(-w*.37,wallBottom-h*.03);ctx.lineTo(-w*.08,wallTop+h*.20);ctx.moveTo(w*.37,wallBottom-h*.03);ctx.lineTo(w*.08,wallTop+h*.20);ctx.stroke();
    // Roof mass + layered shingles/thatch strokes.
    const roofTop=kind==='forge'?'#555047':kind==='tavern'?'#746044':'#8a744e',roofMid=kind==='forge'?'#45413a':kind==='tavern'?'#5e4d39':'#6f5d43',roofLow='#4f4638';ctx.fillStyle=grad(0,roofPeak,0,roofEave,roofTop,roofMid,roofLow);ctx.beginPath();ctx.moveTo(-w*.56,roofEave);ctx.lineTo(0,roofPeak);ctx.lineTo(w*.56,roofEave);ctx.lineTo(w*.43,roofEave+h*.085);ctx.lineTo(-w*.43,roofEave+h*.085);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(238,220,177,.15)';ctx.lineWidth=1.2*z;for(let row=0;row<6;row++){const yy=roofPeak+(row+1)*(roofEave-roofPeak)/7,half=w*.08+row*w*.065;for(let q=-1;q<=1;q++) {ctx.beginPath();ctx.moveTo(-half+q*9*z,yy);ctx.lineTo(half+q*9*z,yy+3*z);ctx.stroke();}}
    // Door, window glow, ledge and small material details.
    ctx.fillStyle='#49362c';rr(-w*.095,wallBottom-h*.29,w*.19,h*.29,3*z);ctx.fill();ctx.strokeStyle='rgba(218,183,124,.28)';ctx.lineWidth=1.5*z;ctx.stroke();ellipse(-w*.035,wallBottom-h*.14,1.7*z,1.7*z,'#d6b274',.9);
    ctx.fillStyle='#d7a765';ctx.globalAlpha=.72;rr(w*.16,wallTop+h*.14,w*.14,h*.14,2*z);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle='#5a4432';ctx.lineWidth=1.6*z;ctx.strokeRect(w*.16,wallTop+h*.14,w*.14,h*.14);ctx.beginPath();ctx.moveTo(w*.23,wallTop+h*.14);ctx.lineTo(w*.23,wallTop+h*.28);ctx.moveTo(w*.16,wallTop+h*.21);ctx.lineTo(w*.30,wallTop+h*.21);ctx.stroke();
    if(kind==='forge'){
      ctx.fillStyle='#494740';rr(w*.24,roofPeak+h*.02,w*.14,h*.37,3*z);ctx.fill();ctx.strokeStyle='rgba(220,215,193,.12)';ctx.lineWidth=1.2*z;for(let q=0;q<4;q++){ctx.beginPath();ctx.moveTo(w*.25,roofPeak+h*(.08+q*.07));ctx.lineTo(w*.36,roofPeak+h*(.06+q*.07));ctx.stroke();}
      ellipse(w*.23,wallBottom-h*.08,13*z,7*z,'rgba(130,60,38,.32)',1);ellipse(w*.23,wallBottom-h*.09,7*z,4*z,P.ember,.82);ellipse(w*.23,wallBottom-h*.10,3*z,2*z,P.emberHot,.95);
      ctx.strokeStyle=P.iron;ctx.lineWidth=4*z;ctx.beginPath();ctx.moveTo(-w*.27,wallBottom-h*.05);ctx.lineTo(-w*.16,wallBottom-h*.22);ctx.moveTo(-w*.31,wallBottom-h*.12);ctx.lineTo(-w*.14,wallBottom-h*.12);ctx.stroke();
    }
    if(kind==='alchemy'){
      ctx.fillStyle='#5e806c';ctx.beginPath();ctx.moveTo(-w*.35,wallTop+h*.22);ctx.lineTo(w*.35,wallTop+h*.22);ctx.lineTo(w*.27,wallTop+h*.36);ctx.lineTo(-w*.27,wallTop+h*.36);ctx.closePath();ctx.fill();for(const q of [-.21,-.07,.08,.22])ellipse(q*w,wallBottom-h*.055,4*z,7*z,q<0?'#79a080':'#9b82a7',.92);
    }
    if(kind==='tavern'){
      ctx.fillStyle='#82503e';ctx.beginPath();ctx.moveTo(w*.31,wallTop+h*.10);ctx.lineTo(w*.58,wallTop+h*.17);ctx.lineTo(w*.48,wallTop+h*.35);ctx.lineTo(w*.31,wallTop+h*.29);ctx.closePath();ctx.fill();ctx.strokeStyle='#5b4234';ctx.lineWidth=2*z;ctx.stroke();
    }
    ctx.restore();count('object');return true;
  }

  function drawMarket(o){
    const p=worldToScreen(o.x,o.y),z=camera.zoom*(o.s||1),h=132*z,w=140*z;if(!visible(p,w,h))return true;shadowAt(p,60*(o.s||1),16*(o.s||1),.25);ctx.save();ctx.translate(p.x,p.y);
    ctx.strokeStyle='#533b2c';ctx.lineWidth=6*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-w*.39,-h*.04);ctx.lineTo(-w*.39,-h*.72);ctx.moveTo(w*.39,-h*.04);ctx.lineTo(w*.39,-h*.72);ctx.stroke();
    ctx.fillStyle=grad(0,-h*.84,0,-h*.48,'#d1aa72','#b06c54','#80453e');ctx.beginPath();ctx.moveTo(-w*.52,-h*.53);ctx.lineTo(-w*.42,-h*.80);ctx.lineTo(w*.42,-h*.80);ctx.lineTo(w*.52,-h*.53);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(255,231,186,.22)';ctx.lineWidth=2*z;for(let i=-3;i<=3;i+=2){ctx.beginPath();ctx.moveTo(i*w*.07,-h*.79);ctx.lineTo(i*w*.085,-h*.54);ctx.stroke();}
    ctx.fillStyle=P.wood;rr(-w*.46,-h*.30,w*.92,h*.24,4*z);ctx.fill();ctx.strokeStyle='#4c3729';ctx.lineWidth=2*z;ctx.stroke();
    const goods=[[-.31,'#7d8f59'],[-.15,'#b88d4f'],[0,'#b56e58'],[.16,'#d4bc72'],[.32,'#6f845b']];for(const [q,c] of goods){ctx.fillStyle=c;rr(q*w-w*.055,-h*.27,w*.11,h*.12,2*z);ctx.fill();ellipse(q*w,-h*.30,4*z,3*z,'rgba(235,222,187,.28)',1);}
    ctx.fillStyle='#755138';rr(-w*.31,-h*.055,w*.22,h*.11,3*z);ctx.fill();ctx.fillStyle='#846342';rr(w*.08,-h*.05,w*.20,h*.10,3*z);ctx.fill();ctx.restore();count('object');return true;
  }

  function drawTree(o,type='broadleaf'){
    const p=worldToScreen(o.x,o.y),s=o.s||1,z=camera.zoom*s,h=(type==='pine'?160:type==='fen'?154:158)*z,w=(type==='pine'?96:126)*z;if(!visible(p,w,h))return true;shadowAt(p,(type==='pine'?35:48)*s,15*s,.22);ctx.save();ctx.translate(p.x,p.y);
    // Trunk with lit edge and branching structure.
    ctx.strokeStyle='#4a3529';ctx.lineWidth=11*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-2*z);ctx.lineTo(-2*z,-h*.50);ctx.stroke();ctx.strokeStyle='rgba(174,126,78,.32)';ctx.lineWidth=3*z;ctx.beginPath();ctx.moveTo(-3*z,-4*z);ctx.lineTo(-5*z,-h*.48);ctx.stroke();
    if(type==='pine'){
      const cols=['#294434','#35503a','#426044','#55704e'];for(let i=0;i<6;i++){const yy=-h*(.27+i*.105),ww=w*(.50-i*.052);ctx.fillStyle=grad(-ww,yy,ww,yy,cols[Math.max(0,i%3)],cols[Math.min(3,i%3+1)],cols[0]);ctx.beginPath();ctx.moveTo(0,yy-h*.24);ctx.lineTo(-ww,yy+h*.08);ctx.quadraticCurveTo(-ww*.35,yy+h*.02,0,yy+h*.045);ctx.quadraticCurveTo(ww*.35,yy+h*.02,ww,yy+h*.08);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(181,201,151,.11)';ctx.lineWidth=1.2*z;ctx.beginPath();ctx.moveTo(-ww*.65,yy);ctx.lineTo(ww*.35,yy-h*.08);ctx.stroke();}
    }else{
      const cols=type==='fen'?['#36564c','#476559','#5b7662','#70866c']:['#3b5938','#4c6940','#607b49','#78915a'];
      const blobs=[];for(let i=0;i<14;i++){const hh=hash(Math.round(o.x),i,131),a=(i/14)*TAU,r=.19+((hh%12)/100),cx=Math.cos(a)*(w*.26)+(((hh>>>5)%17)-8)*z,cy=-h*(.66+Math.sin(a)*.11)-(((hh>>>10)%16)-8)*z;blobs.push([cx,cy,r*w]);}
      blobs.sort((a,b)=>a[1]-b[1]);for(let i=0;i<blobs.length;i++){const [cx,cy,r]=blobs[i],g=ctx.createRadialGradient(cx-r*.25,cy-r*.32,1,cx,cy,r);g.addColorStop(0,cols[3]);g.addColorStop(.45,cols[2]);g.addColorStop(.78,cols[1]);g.addColorStop(1,cols[0]);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(cx,cy,r,r*.74,0,0,TAU);ctx.fill();if(i%3===0)ellipse(cx-r*.18,cy-r*.18,r*.12,r*.07,'rgba(226,225,168,.15)',1);}
      ctx.strokeStyle='rgba(67,55,39,.38)';ctx.lineWidth=4*z;for(const q of [-1,1]){ctx.beginPath();ctx.moveTo(-2*z,-h*.45);ctx.quadraticCurveTo(q*15*z,-h*.58,q*31*z,-h*.62);ctx.stroke();}
      if(type==='fen'){ctx.strokeStyle='rgba(119,147,116,.46)';ctx.lineWidth=1.7*z;for(const x of [-.24,-.05,.18,.31]){ctx.beginPath();ctx.moveTo(x*w,-h*.66);ctx.quadraticCurveTo(x*w+7*z,-h*.44,x*w-2*z,-h*.22);ctx.stroke();}}
    }
    ctx.restore();count('object');return true;
  }

  function drawRock(o,kind='rock'){
    const p=worldToScreen(o.x,o.y),s=o.s||1,z=camera.zoom*s,h=(kind==='dead'?92:66)*z,w=88*z;if(!visible(p,w,h))return true;shadowAt(p,34*s,10*s,.20);ctx.save();ctx.translate(p.x,p.y);
    if(kind==='dead'){
      ctx.strokeStyle='#493f34';ctx.lineWidth=10*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-3*z,-h*.72);ctx.lineTo(-22*z,-h*.90);ctx.moveTo(-2*z,-h*.55);ctx.lineTo(22*z,-h*.80);ctx.moveTo(0,-h*.38);ctx.lineTo(-24*z,-h*.50);ctx.stroke();ctx.strokeStyle='rgba(175,139,91,.18)';ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(-4*z,-5*z);ctx.lineTo(-6*z,-h*.68);ctx.stroke();
    }else{
      const base=kind==='den'?'#5a4842':kind==='quarry'?'#727069':P.stone;ctx.fillStyle=grad(-w/2,-h,w/2,0,'#a7a497',base,'#4d514b');ctx.beginPath();ctx.moveTo(-w*.44,0);ctx.lineTo(-w*.34,-h*.48);ctx.lineTo(-w*.12,-h*.78);ctx.lineTo(w*.08,-h*.88);ctx.lineTo(w*.31,-h*.58);ctx.lineTo(w*.45,-h*.18);ctx.lineTo(w*.30,0);ctx.closePath();ctx.fill();
      ctx.strokeStyle='rgba(235,228,206,.22)';ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(-w*.25,-h*.44);ctx.lineTo(-w*.08,-h*.70);ctx.lineTo(w*.08,-h*.79);ctx.moveTo(w*.08,-h*.79);ctx.lineTo(w*.28,-h*.54);ctx.stroke();
      if(kind==='den'){ellipse(w*.08,-h*.26,5*z,3*z,P.ember,.30);}
      if(kind==='quarry'){ctx.strokeStyle='rgba(73,66,59,.28)';ctx.lineWidth=1.5*z;ctx.beginPath();ctx.moveTo(-w*.08,-h*.20);ctx.lineTo(w*.23,-h*.45);ctx.stroke();}
    }
    ctx.restore();count('object');return true;
  }

  function drawSmallObject(o){
    const p=worldToScreen(o.x,o.y),s=o.s||1,z=camera.zoom*s;if(!visible(p,130*z,115*z))return true;shadowAt(p,24*s,8*s,.15);ctx.save();ctx.translate(p.x,p.y);
    switch(o.type){
      case 'bush': case 'garden': {
        const col=o.type==='garden'?'#587248':P.green2;for(const [x,y,r] of [[-14,-18,16],[9,-20,19],[0,-31,17]])ellipse(x*z,y*z,r*z,r*z*.72,col,.95);if(o.type==='garden')for(const [x,c] of [[-14,'#d5bd6c'],[1,'#c8796f'],[16,'#b58bb0']])ellipse(x*z,-27*z,3*z,3*z,c,.9);break;
      }
      case 'well':ctx.strokeStyle=P.stoneLight;ctx.lineWidth=11*z;ctx.beginPath();ctx.ellipse(0,-9*z,30*z,14*z,0,0,TAU);ctx.stroke();ctx.strokeStyle=P.woodDark;ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(-25*z,-9*z);ctx.lineTo(-25*z,-52*z);ctx.moveTo(25*z,-9*z);ctx.lineTo(25*z,-52*z);ctx.moveTo(-27*z,-48*z);ctx.lineTo(27*z,-48*z);ctx.stroke();break;
      case 'lamp':ctx.strokeStyle=P.woodDark;ctx.lineWidth=6*z;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-68*z);ctx.stroke();ctx.fillStyle='#54493a';rr(-11*z,-72*z,22*z,28*z,4*z);ctx.fill();ellipse(0,-57*z,7*z,9*z,'#efbd72',.78);break;
      case 'fence':ctx.strokeStyle=P.wood;ctx.lineWidth=7*z;ctx.beginPath();ctx.moveTo(-40*z,0);ctx.lineTo(-40*z,-47*z);ctx.moveTo(40*z,0);ctx.lineTo(40*z,-47*z);ctx.moveTo(-42*z,-33*z);ctx.lineTo(42*z,-25*z);ctx.moveTo(-42*z,-14*z);ctx.lineTo(42*z,-8*z);ctx.stroke();break;
      case 'board': case 'groveSign': case 'fenSign': case 'stonepineSign':ctx.strokeStyle=P.woodDark;ctx.lineWidth=7*z;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-58*z);ctx.stroke();ctx.fillStyle=P.woodLight;rr(-32*z,-66*z,64*z,30*z,5*z);ctx.fill();ctx.strokeStyle='rgba(70,53,39,.55)';ctx.lineWidth=2*z;ctx.stroke();break;
      case 'banner':ctx.strokeStyle=P.woodDark;ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-82*z);ctx.stroke();ctx.fillStyle='#855444';ctx.beginPath();ctx.moveTo(4*z,-76*z);ctx.lineTo(42*z,-68*z);ctx.lineTo(31*z,-40*z);ctx.lineTo(4*z,-47*z);ctx.closePath();ctx.fill();break;
      case 'ember':ellipse(0,-10*z,12*z,7*z,'rgba(201,91,54,.34)',1);ellipse(-3*z,-13*z,6*z,11*z,P.ember,.85);ellipse(3*z,-15*z,3*z,7*z,P.emberHot,.95);break;
      case 'ruin': case 'fenRuin': case 'stonepineRuin':ctx.fillStyle=P.stone;ctx.beginPath();ctx.moveTo(-36*z,0);ctx.lineTo(-29*z,-38*z);ctx.lineTo(-7*z,-48*z);ctx.lineTo(0,-24*z);ctx.lineTo(18*z,-55*z);ctx.lineTo(35*z,-10*z);ctx.lineTo(29*z,0);ctx.closePath();ctx.fill();break;
      case 'shortcut': case 'fenGate': case 'stonepineGate': {const active=o.active!==false;ctx.strokeStyle=active?'#8a865e':'#5f5d53';ctx.lineWidth=10*z;ctx.beginPath();ctx.arc(0,-18*z,30*z,Math.PI,TAU);ctx.stroke();ctx.fillStyle=active?'rgba(173,188,116,.18)':'rgba(33,37,33,.14)';ctx.beginPath();ctx.ellipse(0,-2*z,34*z,14*z,0,0,TAU);ctx.fill();break;}
      case 'groveCache': case 'fenCache': case 'stonepineCache':ctx.fillStyle=P.wood;rr(-28*z,-28*z,56*z,28*z,5*z);ctx.fill();ctx.strokeStyle=P.iron;ctx.lineWidth=4*z;ctx.stroke();break;
      case 'fenPool':ellipse(0,-4*z,46*z,17*z,P.water,.38);ellipse(-7*z,-7*z,25*z,8*z,'#7c9a85',.18);break;
      case 'stonepineCamp':ctx.fillStyle='#8f7a56';ctx.beginPath();ctx.moveTo(-42*z,0);ctx.lineTo(0,-70*z);ctx.lineTo(42*z,0);ctx.closePath();ctx.fill();ctx.fillStyle='#5b4936';ctx.beginPath();ctx.moveTo(-3*z,-8*z);ctx.lineTo(0,-48*z);ctx.lineTo(12*z,-8*z);ctx.closePath();ctx.fill();break;
      case 'wagon': {ctx.fillStyle=P.woodLight;rr(-43*z,-43*z,86*z,35*z,5*z);ctx.fill();ellipse(-30*z,0,16*z,16*z,P.woodDark);ellipse(30*z,0,16*z,16*z,P.woodDark);ctx.strokeStyle=P.woodDark;ctx.lineWidth=6*z;ctx.beginPath();ctx.moveTo(40*z,-25*z);ctx.lineTo(72*z,-43*z);ctx.stroke();break;}
      default:ctx.restore();return false;
    }
    ctx.restore();count('object');return true;
  }

  function drawHumanAt(entity,role='villager',isPlayer=false){
    const p=worldToScreen(entity.x,entity.y),z=camera.zoom*(isPlayer?1:(entity.s||1)),h=(isPlayer?70:67)*z,w=39*z;if(!visible(p,w,h,130))return true;shadowAt(p,18*(entity.s||1),6.5*(entity.s||1),.22);ctx.save();ctx.translate(p.x,p.y);
    const palette={player:['#3d6548','#294638','#78915f'],alden:['#7b5140','#4b382f','#a5785d'],rowan:['#755f43','#4a4033','#aa895c'],mira:['#526e64','#3b554e','#83998a'],villager:['#70634e','#4c4539','#927e5c']}[role]||['#70634e','#4c4539','#927e5c'];
    // Boots and legs anchor the human scale against the world.
    ctx.strokeStyle='#41372f';ctx.lineWidth=5*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-7*z,-8*z);ctx.lineTo(-9*z,2*z);ctx.moveTo(7*z,-8*z);ctx.lineTo(9*z,2*z);ctx.stroke();
    // Tunic / cloak with soft light from upper left.
    ctx.fillStyle=grad(-w*.35,-h*.62,w*.35,0,palette[2],palette[0],palette[1]);ctx.beginPath();ctx.moveTo(-w*.38,-3*z);ctx.lineTo(-w*.29,-h*.53);ctx.quadraticCurveTo(-w*.08,-h*.67,0,-h*.65);ctx.quadraticCurveTo(w*.18,-h*.65,w*.30,-h*.53);ctx.lineTo(w*.40,-3*z);ctx.quadraticCurveTo(0,5*z,-w*.38,-3*z);ctx.fill();
    // Belt and pouch.
    ctx.strokeStyle='rgba(65,46,34,.76)';ctx.lineWidth=3*z;ctx.beginPath();ctx.moveTo(-w*.30,-h*.27);ctx.lineTo(w*.31,-h*.27);ctx.stroke();ctx.fillStyle='#76563f';rr(w*.17,-h*.30,8*z,10*z,2*z);ctx.fill();
    // Head / hair / small face accents.
    ellipse(0,-h*.73,10*z,11*z,'#c8a57e',1);ctx.fillStyle='#47382e';ctx.beginPath();ctx.arc(0,-h*.76,11*z,Math.PI,TAU);ctx.fill();ctx.strokeStyle='#9a765e';ctx.lineWidth=1*z;ctx.beginPath();ctx.moveTo(-3*z,-h*.69);ctx.lineTo(3*z,-h*.69);ctx.stroke();
    // Arms, shaded on the lower-right side.
    ctx.strokeStyle='#c39c75';ctx.lineWidth=4.5*z;ctx.beginPath();ctx.moveTo(-w*.24,-h*.45);ctx.lineTo(-w*.43,-h*.29);ctx.moveTo(w*.24,-h*.45);ctx.lineTo(w*.43,-h*.29);ctx.stroke();
    if(role==='alden'){ctx.fillStyle='#6b6e68';rr(-11*z,-h*.49,22*z,17*z,3*z);ctx.fill();ctx.strokeStyle='rgba(230,222,198,.18)';ctx.lineWidth=1*z;ctx.stroke();}
    if(role==='rowan'){ctx.fillStyle='#a78958';ctx.beginPath();ctx.moveTo(-12*z,-h*.62);ctx.lineTo(0,-h*.68);ctx.lineTo(12*z,-h*.62);ctx.lineTo(8*z,-h*.54);ctx.lineTo(-8*z,-h*.54);ctx.closePath();ctx.fill();}
    if(role==='mira'){ellipse(w*.25,-h*.42,4*z,7*z,'#8ea68c',.9);ellipse(-w*.27,-h*.38,3*z,6*z,'#a184a7',.85);ctx.strokeStyle='#758c72';ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(-w*.29,-h*.34);ctx.lineTo(-w*.36,-h*.47);ctx.stroke();}
    if(isPlayer){
      // Hood/cape shoulder line and current weapon overlay.
      ctx.strokeStyle='rgba(205,213,171,.20)';ctx.lineWidth=1.4*z;ctx.beginPath();ctx.moveTo(-w*.24,-h*.52);ctx.quadraticCurveTo(0,-h*.60,w*.25,-h*.52);ctx.stroke();
      const fx=player.facingX||1,fy=player.facingY||0,a=Math.atan2(fy,fx);ctx.save();ctx.translate(fx*9*z,-h*.36+fy*3*z);ctx.rotate(a*.55+.15);
      if(player.weaponType==='bow'){ctx.strokeStyle='#8d6747';ctx.lineWidth=3*z;ctx.beginPath();ctx.arc(9*z,-2*z,17*z,-1.15,1.1);ctx.stroke();ctx.strokeStyle='#ddcaa4';ctx.lineWidth=1.2*z;ctx.beginPath();ctx.moveTo(16*z,-18*z);ctx.lineTo(2*z,-2*z);ctx.lineTo(16*z,14*z);ctx.stroke();}
      else if(player.weaponType==='staff'){ctx.strokeStyle='#65513d';ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(-3*z,5*z);ctx.lineTo(23*z,-21*z);ctx.stroke();ellipse(26*z,-24*z,7*z,7*z,'#75b899',.45);ellipse(26*z,-24*z,3*z,3*z,'#d6f1dd',.9);}
      else {ctx.strokeStyle=player.reinforced?'#ddd5bb':'#a9aaa1';ctx.lineWidth=4*z;ctx.beginPath();ctx.moveTo(0,2*z);ctx.lineTo(27*z,-17*z);ctx.stroke();ctx.strokeStyle='rgba(245,238,218,.28)';ctx.lineWidth=1*z;ctx.beginPath();ctx.moveTo(3*z,0);ctx.lineTo(25*z,-15*z);ctx.stroke();}
      ctx.restore();
    }
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
  drawObject=function artV1Object(o){
    if(state.failed)return;
    if(o.type==='npc')return drawHumanAt(o,npcRole(o),false);
    if(['cottage','tavern','forge','alchemy','shed'].includes(o.type))return drawTimberBuilding(o,o.type);
    if(o.type==='merchant')return drawMarket(o);
    if(o.type==='tree')return drawTree(o,Math.abs(Math.round(o.x*7+o.y*11))%4===0?'pine':'broadleaf');
    if(o.type==='fenTree')return drawTree(o,'fen');
    if(o.type==='stonepineTree')return drawTree(o,'pine');
    if(['rock','quarryRock','denRock','deadTree'].includes(o.type))return drawRock(o,o.type==='deadTree'?'dead':o.type==='denRock'?'den':o.type==='quarryRock'?'quarry':'rock');
    if(drawSmallObject(o))return;
    state.failed=true;state.enabled=false;state.failure=`NO-FALLBACK draw miss object:${o.type}`;console.error(`[art-v1] ${state.failure}`);
  };

  drawResource=function artV1Resource(r){
    if(state.failed||!r.active)return;const p=worldToScreen(r.x,r.y),z=camera.zoom;if(!visible(p,70*z,60*z,120))return;shadowAt(p,15,6,.14);ctx.save();ctx.translate(p.x,p.y);
    if(r.type==='herb'||r.type==='mooncap'){
      ctx.strokeStyle=r.type==='mooncap'?'#6e7256':'#44613e';ctx.lineWidth=3*z;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(i*4*z,-12*z,i*7*z,-22*z);ctx.stroke();}
      if(r.type==='mooncap'){for(const x of [-10,0,10]){ctx.fillStyle='#c9b7a2';ctx.beginPath();ctx.arc(x*z,-17*z,6*z,Math.PI,TAU);ctx.fill();}}
      else {ellipse(-8*z,-17*z,5*z,4*z,'#7da667');ellipse(7*z,-20*z,5*z,4*z,'#88b06f');}
    } else if(r.type==='resin'){
      ctx.strokeStyle=P.wood;ctx.lineWidth=7*z;ctx.lineCap='round';for(const y of [-4,-11,-18]){ctx.beginPath();ctx.moveTo(-18*z,y*z);ctx.lineTo(18*z,(y-2)*z);ctx.stroke();}
      ellipse(8*z,-17*z,4*z,5*z,'#b48348',.85);
    } else {
      const stone=r.type==='mossglass'?'#66847d':r.type==='iron'?P.iron:P.stone;ctx.fillStyle=grad(-20*z,-35*z,20*z,0,P.stoneLight,stone,P.stoneDark);ctx.beginPath();ctx.moveTo(-19*z,0);ctx.lineTo(-14*z,-24*z);ctx.lineTo(2*z,-34*z);ctx.lineTo(20*z,-9*z);ctx.lineTo(13*z,0);ctx.closePath();ctx.fill();
      const ore=r.type==='mossglass'?'#91b8a8':r.type==='iron'?'#a6aaa2':'#b87250';ellipse(-4*z,-15*z,5*z,4*z,ore);ellipse(8*z,-20*z,4*z,4*z,ore);
    }
    ctx.restore();count('resource');
  };

  function enemyStatus(e,p){const bossLike=['boss','fenwarden','quarrysentinel'].includes(e.type);if(e.hp>=e.maxHp&&!bossLike)return;const w=(bossLike?112:58)*camera.zoom,y=p.y-(bossLike?97:61)*camera.zoom;ctx.fillStyle='rgba(0,0,0,.42)';rr(p.x-w/2,y,w,7*camera.zoom,4*camera.zoom);ctx.fill();ctx.fillStyle=e.type==='fenwarden'?'#6d9a8e':e.type==='quarrysentinel'?'#a07d5a':e.type==='boss'?P.ember:'#b66d55';rr(p.x-w/2,y,w*(e.hp/e.maxHp),7*camera.zoom,4*camera.zoom);ctx.fill();if(bossLike&&typeof labelAt==='function')labelAt(p.x,y-9*camera.zoom,e.type==='boss'?'EMBERBACK':e.type==='fenwarden'?'DROWNED WARDEN':'QUARRY SENTINEL');}
  function qbody(p,z,col,headX=20,headY=-28){ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(p.x,p.y-18*z,30*z,17*z,0,0,TAU);ctx.fill();ellipse(p.x+headX*z,p.y+headY*z,14*z,12*z,col);ctx.strokeStyle=col;ctx.lineWidth=6*z;ctx.lineCap='round';for(const x of [-14,10]){ctx.beginPath();ctx.moveTo(p.x+x*z,p.y-7*z);ctx.lineTo(p.x+(x-2)*z,p.y+5*z);ctx.stroke();}}
  drawEnemy=function artV1Enemy(e){
    if(state.failed||e.dead)return;const p=worldToScreen(e.x,e.y),z=camera.zoom*(e.scale||1);if(!visible(p,160*z,130*z,160))return;
    if(['ridgehorn','quarrywisp','quarrysentinel'].includes(e.type)&&typeof drawStoneTelegraph==='function')drawStoneTelegraph(e,p,z);else if(typeof drawEnemyTelegraph==='function')drawEnemyTelegraph(e,p);
    shadowAt(p,26*(e.scale||1),10*(e.scale||1),.22);ctx.save();ctx.globalAlpha=e.hurt>0?.74:1;
    if(e.type==='wolf'){
      qbody(p,z,'#5e665e',18,-26);ctx.fillStyle='#4b524c';ctx.beginPath();ctx.moveTo(p.x+20*z,p.y-39*z);ctx.lineTo(p.x+27*z,p.y-50*z);ctx.lineTo(p.x+29*z,p.y-36*z);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(p.x+10*z,p.y-38*z);ctx.lineTo(p.x+8*z,p.y-49*z);ctx.lineTo(p.x+18*z,p.y-36*z);ctx.closePath();ctx.fill();ctx.strokeStyle='#52594f';ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(p.x-28*z,p.y-20*z);ctx.quadraticCurveTo(p.x-47*z,p.y-34*z,p.x-41*z,p.y-47*z);ctx.stroke();
    }else if(e.type==='boar'||e.type==='boss'||e.type==='ridgehorn'){
      const col=e.type==='boss'?'#7c4939':e.type==='ridgehorn'?'#6f6758':'#6f5140';qbody(p,z,col,20,-24);
      if(e.type==='boss'){for(const side of [-1,1]){ctx.fillStyle=P.emberHot;ctx.beginPath();ctx.moveTo(p.x+(18+side*5)*z,p.y-36*z);ctx.lineTo(p.x+(22+side*13)*z,p.y-49*z);ctx.lineTo(p.x+(25+side*5)*z,p.y-34*z);ctx.closePath();ctx.fill();}ellipse(p.x-6*z,p.y-27*z,13*z,8*z,P.ember,.25);}
      else if(e.type==='ridgehorn'){ctx.strokeStyle='#d1c4a4';ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(p.x+15*z,p.y-35*z);ctx.quadraticCurveTo(p.x+12*z,p.y-55*z,p.x+1*z,p.y-56*z);ctx.moveTo(p.x+26*z,p.y-34*z);ctx.quadraticCurveTo(p.x+35*z,p.y-51*z,p.x+45*z,p.y-49*z);ctx.stroke();}
      else {ctx.fillStyle='#d7c4a1';ctx.beginPath();ctx.moveTo(p.x+27*z,p.y-24*z);ctx.lineTo(p.x+38*z,p.y-18*z);ctx.lineTo(p.x+28*z,p.y-15*z);ctx.closePath();ctx.fill();}
    }else if(e.type==='grovekeeper'){
      ctx.strokeStyle='#4e5d42';ctx.lineWidth=13*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-58*z);ctx.moveTo(p.x,p.y-42*z);ctx.lineTo(p.x-25*z,p.y-25*z);ctx.moveTo(p.x,p.y-42*z);ctx.lineTo(p.x+25*z,p.y-25*z);ctx.stroke();ellipse(p.x,p.y-66*z,22*z,18*z,'#637956');ellipse(p.x-13*z,p.y-70*z,15*z,14*z,'#758b5d');ellipse(p.x+16*z,p.y-69*z,14*z,15*z,'#6d8358');
    }else if(e.type==='mireling'){
      ctx.fillStyle='#55766a';ctx.beginPath();ctx.moveTo(p.x-27*z,p.y);ctx.quadraticCurveTo(p.x-25*z,p.y-25*z,p.x-8*z,p.y-31*z);ctx.quadraticCurveTo(p.x+4*z,p.y-39*z,p.x+14*z,p.y-26*z);ctx.quadraticCurveTo(p.x+29*z,p.y-21*z,p.x+27*z,p.y);ctx.closePath();ctx.fill();ellipse(p.x-7*z,p.y-18*z,3*z,4*z,'#c9d7bd');ellipse(p.x+8*z,p.y-18*z,3*z,4*z,'#c9d7bd');
    }else if(e.type==='bogstalker'){
      qbody(p,z,'#4e6258',17,-29);ctx.strokeStyle='#405348';ctx.lineWidth=4*z;ctx.beginPath();ctx.moveTo(p.x-10*z,p.y-33*z);ctx.lineTo(p.x-22*z,p.y-52*z);ctx.moveTo(p.x+2*z,p.y-34*z);ctx.lineTo(p.x+6*z,p.y-55*z);ctx.stroke();
    }else if(e.type==='fenwarden'){
      ctx.fillStyle='#526b67';ctx.beginPath();ctx.moveTo(p.x-23*z,p.y);ctx.lineTo(p.x-17*z,p.y-61*z);ctx.lineTo(p.x,p.y-79*z);ctx.lineTo(p.x+19*z,p.y-60*z);ctx.lineTo(p.x+26*z,p.y);ctx.closePath();ctx.fill();ctx.fillStyle='#6f817d';rr(p.x-17*z,p.y-65*z,34*z,27*z,4*z);ctx.fill();ellipse(p.x,p.y-78*z,13*z,13*z,'#6e7d79');ellipse(p.x-4*z,p.y-79*z,2*z,2*z,'#b7d4c7');ellipse(p.x+4*z,p.y-79*z,2*z,2*z,'#b7d4c7');
    }else if(e.type==='quarrywisp'){
      ellipse(p.x,p.y-33*z,18*z,18*z,'#869483',.72);ellipse(p.x,p.y-33*z,8*z,8*z,'#c4cfb7',.85);ctx.fillStyle='#686d65';for(let i=0;i<4;i++){const a=i*TAU/4+.4;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*23*z,p.y-33*z+Math.sin(a)*12*z);ctx.lineTo(p.x+Math.cos(a+.22)*31*z,p.y-33*z+Math.sin(a+.22)*18*z);ctx.lineTo(p.x+Math.cos(a-.22)*29*z,p.y-33*z+Math.sin(a-.22)*17*z);ctx.closePath();ctx.fill();}
    }else if(e.type==='quarrysentinel'){
      ctx.fillStyle='#64665f';rr(p.x-25*z,p.y-62*z,50*z,57*z,8*z);ctx.fill();ellipse(p.x,p.y-71*z,20*z,17*z,'#73756d');ctx.strokeStyle='#565951';ctx.lineWidth=12*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x-23*z,p.y-47*z);ctx.lineTo(p.x-39*z,p.y-14*z);ctx.moveTo(p.x+23*z,p.y-47*z);ctx.lineTo(p.x+40*z,p.y-14*z);ctx.stroke();ellipse(p.x-6*z,p.y-73*z,3*z,3*z,'#d2c59b');ellipse(p.x+6*z,p.y-73*z,3*z,3*z,'#d2c59b');
    }
    ctx.restore();count('enemy');enemyStatus(e,p);
  };
  drawPlayer=function artV1Player(){if(state.failed)return;drawHumanAt(player,'player',true);};
})();
