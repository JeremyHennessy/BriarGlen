(() => {
  'use strict';

  // Build 20: Copper Hollow + Emberback Den visual identity.
  // Renderer-only layer over the verified Build 19 runtime.
  const art20 = {
    enabled: true,
    style: 'storybook-hollow-den-v1',
    frames: 0,
    hollowMarks: [],
    denMarks: [],
    frame: {
      hollowGround: 0, denGround: 0,
      hollowObjects: 0, denObjects: 0,
      hollowResources: 0, hollowEnemies: 0, denEnemies: 0,
      telegraphs: 0, ambient: 0,
    },
  };
  document.documentElement.dataset.briarGlenHollowDen = art20.style;

  function seeded(seed) {
    let x = seed >>> 0;
    return () => {
      x += 0x6D2B79F5;
      let t = x;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const hollowRand = seeded(200041);
  for (let i = 0; i < 180; i++) {
    art20.hollowMarks.push({
      x: 660 + hollowRand() * 760,
      y: -570 + hollowRand() * 1140,
      kind: hollowRand() < .38 ? 'shale' : hollowRand() < .64 ? 'cut' : hollowRand() < .84 ? 'copper' : 'track',
      s: .55 + hollowRand() * 1.05,
      phase: hollowRand() * TAU,
      variant: Math.floor(hollowRand() * 4),
    });
  }

  const denRand = seeded(200042);
  for (let i = 0; i < 155; i++) {
    art20.denMarks.push({
      x: 1430 + denRand() * 720,
      y: -540 + denRand() * 1080,
      kind: denRand() < .38 ? 'ash' : denRand() < .66 ? 'scorch' : denRand() < .86 ? 'fissure' : 'bone',
      s: .55 + denRand() * 1.05,
      phase: denRand() * TAU,
      variant: Math.floor(denRand() * 4),
    });
  }

  function visible(p, margin = 100) {
    return p.x >= -margin && p.x <= viewport.w + margin && p.y >= -margin && p.y <= viewport.h + margin;
  }
  function inHollow(x, y) { return x >= 650 && x < 1420 && y >= -620 && y <= 620; }
  function inDen(x, y) { return x >= 1420 && x <= 2200 && y >= -620 && y <= 620; }

  function regionPoly(minX, maxX, minY, maxY, fill) {
    const pts = [[minX,minY],[maxX,minY],[maxX,maxY],[minX,maxY]].map(([x,y]) => worldToScreen(x,y));
    ctx.save(); ctx.fillStyle = fill; ctx.beginPath();
    pts.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function drawHollowMark(m) {
    const p = worldToScreen(m.x,m.y); if (!visible(p,45)) return;
    const z=camera.zoom,s=m.s*z;
    if (m.kind === 'shale') {
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate((m.variant-.5)*.12);
      ctx.fillStyle=m.variant%2?'rgba(86,89,78,.28)':'rgba(104,103,86,.25)';
      ctx.beginPath();ctx.moveTo(-8*s,0);ctx.lineTo(-3*s,-3*s);ctx.lineTo(8*s,-2*s);ctx.lineTo(5*s,2*s);ctx.closePath();ctx.fill();ctx.restore();
    } else if (m.kind === 'cut') {
      ctx.strokeStyle='rgba(183,169,132,.15)';ctx.lineWidth=1.1*z;
      ctx.beginPath();ctx.moveTo(p.x-9*s,p.y+2*s);ctx.lineTo(p.x+9*s,p.y-2*s);ctx.stroke();
    } else if (m.kind === 'copper') {
      ctx.globalAlpha=.32;circle(p.x,p.y,2.2*s,m.variant%2?'#b87850':'#d09162');ctx.globalAlpha=1;
    } else {
      ctx.strokeStyle='rgba(72,66,56,.18)';ctx.lineWidth=1.6*z;
      ctx.beginPath();ctx.moveTo(p.x-8*s,p.y-3*s);ctx.lineTo(p.x+8*s,p.y+3*s);ctx.moveTo(p.x-7*s,p.y+2*s);ctx.lineTo(p.x+9*s,p.y+8*s);ctx.stroke();
    }
    art20.frame.hollowGround++;
  }

  function drawDenMark(m) {
    const p=worldToScreen(m.x,m.y); if(!visible(p,45)) return;
    const z=camera.zoom,s=m.s*z,now=performance.now();
    if(m.kind==='ash'){
      ctx.fillStyle='rgba(49,42,38,.24)';ctx.beginPath();ctx.ellipse(p.x,p.y,7*s,3*s,.2,0,TAU);ctx.fill();
    } else if(m.kind==='scorch'){
      ctx.save();ctx.strokeStyle='rgba(80,45,35,.27)';ctx.lineWidth=2*z;ctx.beginPath();ctx.arc(p.x,p.y,7*s,0,TAU);ctx.stroke();ctx.restore();
    } else if(m.kind==='fissure'){
      const glow=.15+Math.sin(now/520+m.phase)*.035;
      ctx.strokeStyle=`rgba(234,103,54,${glow})`;ctx.lineWidth=1.4*z;ctx.beginPath();ctx.moveTo(p.x-7*s,p.y+2*s);ctx.lineTo(p.x-1*s,p.y-3*s);ctx.lineTo(p.x+3*s,p.y+2*s);ctx.lineTo(p.x+8*s,p.y-2*s);ctx.stroke();
    } else {
      ctx.strokeStyle='rgba(202,188,158,.26)';ctx.lineWidth=2*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x-5*s,p.y);ctx.lineTo(p.x+6*s,p.y-3*s);ctx.stroke();
      circle(p.x-6*s,p.y+.2*s,2.2*s,'rgba(202,188,158,.23)');circle(p.x+7*s,p.y-3.2*s,2.2*s,'rgba(202,188,158,.23)');
    }
    art20.frame.denGround++;
  }

  function drawQuarryBenches() {
    const shelves=[
      [[720,-520],[930,-520],[1010,-390],[790,-390]],
      [[1040,350],[1320,350],[1370,510],[1090,510]],
      [[1130,-510],[1370,-510],[1410,-385],[1190,-385]],
    ];
    ctx.save();
    for(const shelf of shelves){
      const pts=shelf.map(([x,y])=>worldToScreen(x,y));ctx.fillStyle='rgba(91,91,78,.18)';ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();
      ctx.strokeStyle='rgba(188,173,137,.18)';ctx.lineWidth=2*camera.zoom;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);ctx.lineTo(pts[1].x,pts[1].y);ctx.stroke();
    }
    ctx.restore();
  }

  function drawDenHeat() {
    if(!inDen(player.x,player.y)) return;
    const g=ctx.createRadialGradient(viewport.w*.52,viewport.h*.52,40,viewport.w*.52,viewport.h*.52,Math.max(viewport.w,viewport.h)*.75);
    g.addColorStop(0,'rgba(118,48,30,.045)');g.addColorStop(.55,'rgba(93,36,25,.075)');g.addColorStop(1,'rgba(31,14,12,.16)');
    ctx.fillStyle=g;ctx.fillRect(0,0,viewport.w,viewport.h);
  }

  const build19DrawGround = drawGround;
  drawGround = function build20DrawGround(zone) {
    art20.frames++;
    art20.frame={hollowGround:0,denGround:0,hollowObjects:0,denObjects:0,hollowResources:0,hollowEnemies:0,denEnemies:0,telegraphs:0,ambient:0};
    build19DrawGround(zone);
    if(!art20.enabled) return;
    regionPoly(650,1420,-620,620,'rgba(91,87,72,.055)');
    regionPoly(1420,2200,-620,620,'rgba(72,37,29,.08)');
    drawQuarryBenches();
    for(const m of art20.hollowMarks) drawHollowMark(m);
    for(const m of art20.denMarks) drawDenMark(m);
    drawDenHeat();
  };

  const build19DrawRoute = drawRoute;
  drawRoute = function build20DrawRoute() {
    build19DrawRoute();
    if(!art20.enabled) return;
    const hollow=[700,860,1030,1200,1380].map(x=>worldToScreen(x,20));
    ctx.save();ctx.strokeStyle='rgba(68,60,49,.26)';ctx.lineWidth=2*camera.zoom;
    for(const offset of[-9,9]){ctx.beginPath();hollow.forEach((p,i)=>i?ctx.lineTo(p.x,p.y+offset*camera.zoom):ctx.moveTo(p.x,p.y+offset*camera.zoom));ctx.stroke();}
    ctx.strokeStyle='rgba(171,146,103,.18)';ctx.lineWidth=1.2*camera.zoom;
    for(let x=735;x<1390;x+=65){const a=worldToScreen(x,-9),b=worldToScreen(x,39);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    const den=[1450,1600,1770,1940,2110].map(x=>worldToScreen(x,0));ctx.strokeStyle='rgba(230,111,62,.12)';ctx.lineWidth=3*camera.zoom;ctx.setLineDash([10*camera.zoom,22*camera.zoom]);ctx.beginPath();den.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);ctx.restore();
  };

  function hollowRockAccent(o,p,z){
    ctx.save();ctx.strokeStyle='rgba(206,185,142,.22)';ctx.lineWidth=1.4*z;ctx.beginPath();ctx.moveTo(p.x-18*z,p.y-17*z);ctx.lineTo(p.x+5*z,p.y-28*z);ctx.lineTo(p.x+18*z,p.y-12*z);ctx.stroke();
    if(o.type==='rock'){ctx.globalAlpha=.28;circle(p.x+4*z,p.y-19*z,2.6*z,'#c98256');ctx.globalAlpha=1;}
    ctx.restore();
  }
  function denRockAccent(p,z){
    ctx.save();ctx.strokeStyle='rgba(229,102,57,.28)';ctx.lineWidth=1.4*z;ctx.beginPath();ctx.moveTo(p.x-16*z,p.y-8*z);ctx.lineTo(p.x-5*z,p.y-22*z);ctx.lineTo(p.x+3*z,p.y-13*z);ctx.lineTo(p.x+16*z,p.y-27*z);ctx.stroke();ctx.restore();
  }
  function deadTreeAccent(p,z){
    ctx.save();ctx.strokeStyle='rgba(187,157,112,.18)';ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(p.x-7*z,p.y-50*z);ctx.lineTo(p.x+7*z,p.y-38*z);ctx.stroke();ctx.restore();
  }
  function emberAccent(o,p,z){
    const pulse=.13+Math.sin(performance.now()/260+o.x)*.04;ctx.save();ctx.globalAlpha=pulse;const g=ctx.createRadialGradient(p.x,p.y-8*z,1,p.x,p.y-8*z,26*z);g.addColorStop(0,'rgba(255,150,77,.9)');g.addColorStop(1,'rgba(220,73,40,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y-8*z,26*z,0,TAU);ctx.fill();ctx.restore();
  }

  const build19DrawObject=drawObject;
  drawObject=function build20DrawObject(o){
    build19DrawObject(o); if(!art20.enabled) return;
    const p=worldToScreen(o.x,o.y),z=camera.zoom*(o.s||1);if(!visible(p,110))return;
    if(inHollow(o.x,o.y) && (o.type==='rock'||o.type==='deadTree')){o.type==='rock'?hollowRockAccent(o,p,z):deadTreeAccent(p,z);art20.frame.hollowObjects++;}
    if(inDen(o.x,o.y) && (o.type==='denRock'||o.type==='ember')){o.type==='denRock'?denRockAccent(p,z):emberAccent(o,p,z);art20.frame.denObjects++;}
  };

  const build19DrawResource=drawResource;
  drawResource=function build20DrawResource(r){
    build19DrawResource(r); if(!art20.enabled || !r.active || !inHollow(r.x,r.y)) return;
    const p=worldToScreen(r.x,r.y),z=camera.zoom;if(!visible(p,70))return;
    if(r.type==='ore'){
      ctx.save();ctx.globalAlpha=.18;ctx.strokeStyle='#e2a16e';ctx.lineWidth=1.3*z;ctx.beginPath();ctx.ellipse(p.x,p.y+3*z,23*z,8*z,0,0,TAU);ctx.stroke();ctx.restore();art20.frame.hollowResources++;
    } else if(r.type==='iron'){
      ctx.save();ctx.globalAlpha=.25;ctx.strokeStyle='#cbd6da';ctx.lineWidth=1.5*z;ctx.beginPath();ctx.moveTo(p.x-15*z,p.y-7*z);ctx.lineTo(p.x+14*z,p.y-22*z);ctx.stroke();ctx.globalAlpha=.1;circle(p.x,p.y-11*z,24*z,'#aebdc3');ctx.restore();art20.frame.hollowResources++;
    }
  };

  function drawChargeLane(e,p,z,color){
    if(e.pendingAttack!=='charge' && !(e.chargeTimer>0)) return;
    const tx=Number.isFinite(e.telegraphTargetX)?e.telegraphTargetX:player.x,ty=Number.isFinite(e.telegraphTargetY)?e.telegraphTargetY:player.y;
    const t=worldToScreen(tx,ty);ctx.save();ctx.globalAlpha=.2;ctx.strokeStyle=color;ctx.lineWidth=20*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x,p.y-11*z);ctx.lineTo(t.x,t.y-11*z);ctx.stroke();ctx.globalAlpha=.6;ctx.lineWidth=2*z;ctx.stroke();ctx.restore();art20.frame.telegraphs++;
  }
  function boarAccent(e,p,z){
    ctx.save();ctx.strokeStyle='rgba(219,191,146,.54)';ctx.lineWidth=2.2*z;ctx.lineCap='round';for(const sx of[-1,1]){ctx.beginPath();ctx.moveTo(p.x+sx*15*z,p.y-28*z);ctx.lineTo(p.x+sx*27*z,p.y-20*z);ctx.stroke();}ctx.restore();drawChargeLane(e,p,z,'#d08a55');
  }
  function emberbackAccent(e,p,z){
    ctx.save();ctx.globalAlpha=.12;circle(p.x,p.y-33*z,54*z,'#d8623f');ctx.globalAlpha=1;
    ctx.strokeStyle='rgba(244,178,108,.64)';ctx.lineWidth=3*z;for(const sx of[-1,1]){ctx.beginPath();ctx.moveTo(p.x+sx*18*z,p.y-43*z);ctx.lineTo(p.x+sx*34*z,p.y-57*z);ctx.lineTo(p.x+sx*40*z,p.y-43*z);ctx.stroke();}
    ctx.strokeStyle='rgba(112,54,38,.7)';ctx.lineWidth=4*z;ctx.beginPath();ctx.arc(p.x,p.y-26*z,34*z,.15*Math.PI,.85*Math.PI);ctx.stroke();ctx.restore();
    drawChargeLane(e,p,z,'#ef7147');
    if(e.pendingAttack==='slam'){
      ctx.save();ctx.strokeStyle='rgba(247,119,67,.46)';ctx.lineWidth=4*z;ctx.setLineDash([8*z,7*z]);ctx.beginPath();ctx.ellipse(p.x,p.y,155*z,78*z,0,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore();art20.frame.telegraphs++;
    }
  }

  const build19DrawEnemy=drawEnemy;
  drawEnemy=function build20DrawEnemy(e){
    build19DrawEnemy(e);if(!art20.enabled||e.dead)return;
    const p=worldToScreen(e.x,e.y),z=camera.zoom*(e.scale||1);if(!visible(p,125))return;
    if(e.type==='boar'&&inHollow(e.x,e.y)){boarAccent(e,p,z);art20.frame.hollowEnemies++;}
    else if(e.type==='boss'&&inDen(e.x,e.y)){emberbackAccent(e,p,z);art20.frame.denEnemies++;}
  };

  function drawAmbient(){
    const now=performance.now();
    if(inHollow(player.x,player.y)){
      ctx.save();for(let i=0;i<14;i++){const wx=player.x-260+((i*83+now*.006)%560),wy=player.y-180+(i%5)*88,p=worldToScreen(wx,wy);if(!visible(p,25))continue;ctx.globalAlpha=.08+(i%3)*.025;circle(p.x,p.y,(1.2+(i%2)*.5)*camera.zoom,i%4===0?'#d39868':'#c2b490');art20.frame.ambient++;}ctx.restore();
    }
    if(inDen(player.x,player.y)){
      ctx.save();for(let i=0;i<18;i++){const a=i*.81+now/1600,wx=player.x+Math.cos(a)*250,wy=player.y+Math.sin(a*1.3)*170,p=worldToScreen(wx,wy);if(!visible(p,30))continue;ctx.globalAlpha=.12+.06*Math.sin(now/430+i);circle(p.x,p.y-14*camera.zoom,(1.3+(i%3)*.5)*camera.zoom,i%3===0?'#ffd08a':'#e66d45');art20.frame.ambient++;}ctx.restore();
    }
  }
  const build19DrawParticles=drawParticles;
  drawParticles=function build20DrawParticles(){build19DrawParticles();if(art20.enabled)drawAmbient();};

  if(window.__BRIAR_GLENDebug){
    window.__BRIAR_GLENDebug.setHollowDenArtEnabled=value=>{art20.enabled=!!value;return art20.enabled;};
    window.__BRIAR_GLENDebug.getHollowDenArtState=()=>({
      enabled:art20.enabled,style:art20.style,frames:art20.frames,
      hollowMarkCount:art20.hollowMarks.length,denMarkCount:art20.denMarks.length,
      frame:{...art20.frame},zone:zoneFor(player.x,player.y).name,
      entityCounts:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
    });
  }
})();
