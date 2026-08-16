(() => {
  'use strict';

  // Build 19: visual identity rollout for Mooncap Grove + Mosswater Fen.
  // Presentation only. Existing world objects, resources, enemies, combat and saves remain authoritative.
  const biomeArt = {
    enabled: true,
    style: 'storybook-biomes-v1',
    frames: 0,
    groveMarks: [],
    fenMarks: [],
    frame: {
      groveGround: 0,
      fenGround: 0,
      groveObjects: 0,
      fenObjects: 0,
      groveResources: 0,
      fenResources: 0,
      groveEnemies: 0,
      fenEnemies: 0,
      ambient: 0,
    },
  };

  document.documentElement.dataset.briarGlenBiomes = biomeArt.style;

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

  const groveRand = seeded(190031);
  for (let i = 0; i < 150; i++) {
    biomeArt.groveMarks.push({
      x: -60 + groveRand() * 930,
      y: -455 - groveRand() * 635,
      kind: groveRand() < .5 ? 'fern' : groveRand() < .72 ? 'leaf' : groveRand() < .9 ? 'mushroom' : 'stone',
      s: .55 + groveRand() * .95,
      phase: groveRand() * TAU,
      variant: Math.floor(groveRand() * 4),
    });
  }

  const fenRand = seeded(190032);
  for (let i = 0; i < 185; i++) {
    biomeArt.fenMarks.push({
      x: 910 + fenRand() * 1240,
      y: -1210 - fenRand() * 820,
      kind: fenRand() < .43 ? 'reed' : fenRand() < .68 ? 'water' : fenRand() < .87 ? 'mud' : 'moss',
      s: .55 + fenRand() * 1.05,
      phase: fenRand() * TAU,
      variant: Math.floor(fenRand() * 4),
    });
  }

  function visible(p, margin = 120) {
    return p.x >= -margin && p.x <= viewport.w + margin && p.y >= -margin && p.y <= viewport.h + margin;
  }

  function inGrove(x, y) {
    return y <= -430 && y >= -1120 && x >= -80 && x <= 900;
  }

  function inFen(x, y) {
    return y <= -1180 && y >= -2100 && x >= 880 && x <= 2200;
  }

  function softEllipse(p, rx, ry, inner, outer) {
    const z = camera.zoom;
    const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, rx * z);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.save();
    ctx.scale(1, ry / Math.max(1, rx));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y * rx / Math.max(1, ry), rx*z, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawGroveMark(mark) {
    const p = worldToScreen(mark.x, mark.y);
    if (!visible(p, 36)) return;
    const z = camera.zoom, s = mark.s*z;
    if (mark.kind === 'fern') {
      ctx.save();
      ctx.strokeStyle = mark.variant % 2 ? 'rgba(93,139,78,.58)' : 'rgba(74,121,70,.54)';
      ctx.lineWidth = 1.2*z;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.quadraticCurveTo(p.x+2*s,p.y-7*s,p.x+1*s,p.y-15*s); ctx.stroke();
      for (let i=2;i<=5;i++) {
        const y=p.y-i*2.5*s,w=(7-i*.65)*s;
        ctx.beginPath();ctx.moveTo(p.x,y);ctx.quadraticCurveTo(p.x-w*.45,y-2*s,p.x-w,y-1*s);ctx.stroke();
        ctx.beginPath();ctx.moveTo(p.x,y);ctx.quadraticCurveTo(p.x+w*.45,y-2*s,p.x+w,y-1*s);ctx.stroke();
      }
      ctx.restore();
    } else if (mark.kind === 'leaf') {
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(mark.phase);
      ctx.fillStyle = mark.variant % 2 ? 'rgba(155,125,67,.28)' : 'rgba(108,117,64,.29)';
      ctx.beginPath();ctx.ellipse(0,0,5*s,2*s,.2,0,TAU);ctx.fill();ctx.restore();
    } else if (mark.kind === 'mushroom') {
      ctx.strokeStyle='rgba(223,218,188,.58)';ctx.lineWidth=1.5*z;
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-7*s);ctx.stroke();
      ctx.fillStyle=mark.variant%2?'rgba(157,130,187,.66)':'rgba(119,151,116,.58)';
      ctx.beginPath();ctx.arc(p.x,p.y-8*s,4*s,Math.PI,TAU);ctx.lineTo(p.x+4*s,p.y-8*s);ctx.closePath();ctx.fill();
    } else {
      ctx.fillStyle='rgba(104,108,91,.26)';ctx.beginPath();ctx.ellipse(p.x,p.y,5*s,2.4*s,.15,0,TAU);ctx.fill();
    }
    biomeArt.frame.groveGround += 1;
  }

  function drawFenMark(mark) {
    const p = worldToScreen(mark.x, mark.y);
    if (!visible(p, 42)) return;
    const z = camera.zoom, s = mark.s*z;
    const now = performance.now();
    if (mark.kind === 'reed') {
      ctx.save();ctx.strokeStyle=mark.variant%2?'rgba(113,137,93,.58)':'rgba(87,119,86,.56)';ctx.lineWidth=1.4*z;ctx.lineCap='round';
      for(let i=-2;i<=2;i++){
        const bend=Math.sin(mark.phase+i+now/1200)*2*s;
        ctx.beginPath();ctx.moveTo(p.x+i*2.2*s,p.y);ctx.quadraticCurveTo(p.x+i*2*s+bend,p.y-8*s,p.x+i*2.4*s+bend*.5,p.y-17*s);ctx.stroke();
      }
      ctx.restore();
    } else if (mark.kind === 'water') {
      const shimmer=.12+Math.sin(mark.phase+now/850)*.035;
      ctx.strokeStyle=`rgba(174,211,198,${shimmer})`;ctx.lineWidth=1.2*z;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(p.x-8*s,p.y);ctx.quadraticCurveTo(p.x,p.y-2*s,p.x+8*s,p.y);ctx.stroke();
    } else if (mark.kind === 'mud') {
      ctx.fillStyle='rgba(73,75,61,.2)';ctx.beginPath();ctx.ellipse(p.x,p.y,7*s,3*s,.08,0,TAU);ctx.fill();
      ctx.strokeStyle='rgba(142,139,111,.1)';ctx.lineWidth=.8*z;ctx.stroke();
    } else {
      ctx.fillStyle='rgba(84,127,92,.33)';
      for(const [dx,dy] of [[-4,0],[2,-2],[6,1]])circle(p.x+dx*s,p.y+dy*s,2.6*s,'rgba(84,127,92,.33)');
    }
    biomeArt.frame.fenGround += 1;
  }

  function drawGroveCanopyShade() {
    const corners=[[-80,-430],[900,-430],[900,-1120],[-80,-1120]].map(([x,y])=>worldToScreen(x,y));
    ctx.save();
    const grad=ctx.createLinearGradient(0,0,viewport.w,viewport.h);
    grad.addColorStop(0,'rgba(18,49,31,.08)');
    grad.addColorStop(.55,'rgba(25,61,35,.14)');
    grad.addColorStop(1,'rgba(11,37,26,.19)');
    ctx.fillStyle=grad;ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();
    ctx.restore();
  }

  function drawFenWaterVeins() {
    const paths=[
      [[980,-1300],[1170,-1450],[1370,-1555],[1580,-1710],[1870,-1900]],
      [[1200,-1250],[1430,-1390],[1700,-1485],[1990,-1700]],
    ];
    for(const points of paths){
      const s=points.map(([x,y])=>worldToScreen(x,y));ctx.save();ctx.lineCap='round';ctx.strokeStyle='rgba(93,150,140,.12)';ctx.lineWidth=30*camera.zoom;ctx.beginPath();s.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.strokeStyle='rgba(190,224,211,.09)';ctx.lineWidth=2*camera.zoom;ctx.setLineDash([18*camera.zoom,20*camera.zoom]);ctx.stroke();ctx.restore();
    }
  }

  const build18DrawGround = drawGround;
  drawGround = function build19DrawGround(zone) {
    biomeArt.frames += 1;
    biomeArt.frame = { groveGround:0, fenGround:0, groveObjects:0, fenObjects:0, groveResources:0, fenResources:0, groveEnemies:0, fenEnemies:0, ambient:0 };
    build18DrawGround(zone);
    if (!biomeArt.enabled) return;
    drawGroveCanopyShade();
    drawFenWaterVeins();
    for(const mark of biomeArt.groveMarks)drawGroveMark(mark);
    for(const mark of biomeArt.fenMarks)drawFenMark(mark);
  };

  function groveTreeAccent(o,p,z) {
    const s=(o.s||1)*z;
    ctx.save();
    ctx.globalAlpha=.22;circle(p.x-15*s,p.y-77*s,23*s,'#79935b');circle(p.x+18*s,p.y-68*s,18*s,'#93a867');ctx.globalAlpha=1;
    ctx.strokeStyle='rgba(87,115,61,.64)';ctx.lineWidth=1.5*z;ctx.lineCap='round';
    for(const dx of[-11,3,14]){ctx.beginPath();ctx.moveTo(p.x+dx*s,p.y-56*s);ctx.quadraticCurveTo(p.x+(dx+8)*s,p.y-31*s,p.x+(dx+4)*s,p.y-9*s);ctx.stroke();}
    ctx.restore();
  }

  function groveRuinAccent(o,p,z) {
    ctx.save();ctx.strokeStyle='rgba(112,151,83,.62)';ctx.lineWidth=2*z;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(p.x-15*z,p.y-24*z);ctx.quadraticCurveTo(p.x-2*z,p.y-39*z,p.x+13*z,p.y-34*z);ctx.stroke();
    for(const [x,y] of [[-16,-22],[-5,-34],[10,-31],[15,-20]])circle(p.x+x*z,p.y+y*z,2.5*z,'#708f58');
    ctx.restore();
  }

  function groveCacheAccent(p,z) {
    const pulse=.12+Math.sin(performance.now()/650)*.025;
    ctx.save();ctx.globalAlpha=pulse;ctx.strokeStyle='#b9d68c';ctx.lineWidth=2*z;ctx.beginPath();ctx.ellipse(p.x,p.y-12*z,31*z,15*z,0,0,TAU);ctx.stroke();ctx.restore();
  }

  function fenTreeAccent(o,p,z) {
    ctx.save();ctx.strokeStyle='rgba(87,113,91,.62)';ctx.lineWidth=1.4*z;ctx.lineCap='round';
    for(const dx of[-10,4,13]){ctx.beginPath();ctx.moveTo(p.x+dx*z,p.y-40*z);ctx.quadraticCurveTo(p.x+(dx-6)*z,p.y-23*z,p.x+(dx-2)*z,p.y-4*z);ctx.stroke();}
    ctx.globalAlpha=.16;circle(p.x-9*z,p.y-61*z,20*z,'#8bb19a');ctx.globalAlpha=1;ctx.restore();
  }

  function fenPoolAccent(o,p,z) {
    ctx.save();ctx.globalAlpha=.18;ctx.strokeStyle='#b6ded0';ctx.lineWidth=1.2*z;
    const phase=performance.now()/900+o.x*.01;
    for(let i=0;i<3;i++){
      const ox=Math.sin(phase+i)*19*z, oy=Math.cos(phase*.8+i)*5*z;
      ctx.beginPath();ctx.ellipse(p.x+ox,p.y+oy,(13+i*4)*z,(3+i)*z,0,0,TAU);ctx.stroke();
    }
    ctx.restore();
  }

  function fenRuinAccent(p,z) {
    ctx.save();ctx.fillStyle='rgba(72,108,79,.48)';
    for(const [x,y] of [[-19,-16],[-10,-27],[2,-18],[14,-9]])circle(p.x+x*z,p.y+y*z,3.3*z,'rgba(72,108,79,.48)');
    ctx.strokeStyle='rgba(111,151,116,.38)';ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(p.x-21*z,p.y-6*z);ctx.quadraticCurveTo(p.x-6*z,p.y-27*z,p.x+18*z,p.y-31*z);ctx.stroke();ctx.restore();
  }

  function fenCacheAccent(p,z) {
    ctx.save();ctx.globalAlpha=.18+Math.sin(performance.now()/700)*.035;ctx.strokeStyle='#b1d8ca';ctx.lineWidth=2*z;ctx.beginPath();ctx.ellipse(p.x,p.y-10*z,32*z,14*z,0,0,TAU);ctx.stroke();ctx.restore();
  }

  const build18DrawObject = drawObject;
  drawObject = function build19DrawObject(o) {
    build18DrawObject(o);
    if (!biomeArt.enabled) return;
    const p=worldToScreen(o.x,o.y),z=camera.zoom;if(!visible(p,100))return;
    if(inGrove(o.x,o.y)){
      if(o.type==='tree'){groveTreeAccent(o,p,z);biomeArt.frame.groveObjects++;}
      else if(o.type==='ruin'){groveRuinAccent(o,p,z);biomeArt.frame.groveObjects++;}
      else if(o.type==='groveCache'){groveCacheAccent(p,z);biomeArt.frame.groveObjects++;}
      else if(o.type==='bush'){ctx.globalAlpha=.18;circle(p.x,p.y-18*z,20*z,'#94ac6d');ctx.globalAlpha=1;biomeArt.frame.groveObjects++;}
    }
    if(inFen(o.x,o.y)){
      if(o.type==='fenTree'){fenTreeAccent(o,p,z);biomeArt.frame.fenObjects++;}
      else if(o.type==='fenPool'){fenPoolAccent(o,p,z);biomeArt.frame.fenObjects++;}
      else if(o.type==='fenRuin'){fenRuinAccent(p,z);biomeArt.frame.fenObjects++;}
      else if(o.type==='fenCache'){fenCacheAccent(p,z);biomeArt.frame.fenObjects++;}
    }
  };

  const build18DrawResource = drawResource;
  drawResource = function build19DrawResource(r) {
    build18DrawResource(r);
    if (!biomeArt.enabled || !r.active) return;
    const p=worldToScreen(r.x,r.y),z=camera.zoom;if(!visible(p,70))return;
    if(r.type==='mooncap' && inGrove(r.x,r.y)){
      const pulse=.12+Math.sin(performance.now()/450+r.x)*.035;
      ctx.save();ctx.globalAlpha=pulse;const g=ctx.createRadialGradient(p.x,p.y-14*z,2,p.x,p.y-14*z,28*z);g.addColorStop(0,'rgba(192,163,230,.9)');g.addColorStop(1,'rgba(120,97,168,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y-14*z,28*z,0,TAU);ctx.fill();ctx.restore();
      biomeArt.frame.groveResources++;
    } else if(r.type==='mossglass' && inFen(r.x,r.y)){
      ctx.save();ctx.globalAlpha=.2;ctx.strokeStyle='#d3eee4';ctx.lineWidth=1.4*z;ctx.beginPath();ctx.ellipse(p.x,p.y+4*z,24*z,8*z,0,0,TAU);ctx.stroke();ctx.globalAlpha=.22;circle(p.x,p.y-21*z,14*z,'#9ed0bf');ctx.restore();
      biomeArt.frame.fenResources++;
    }
  };

  function grovekeeperAccent(e,p,z) {
    ctx.save();
    ctx.strokeStyle='rgba(203,221,151,.72)';ctx.lineWidth=3*z;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(p.x-12*z,p.y-54*z);ctx.lineTo(p.x-31*z,p.y-72*z);ctx.lineTo(p.x-39*z,p.y-91*z);ctx.moveTo(p.x+12*z,p.y-54*z);ctx.lineTo(p.x+31*z,p.y-72*z);ctx.lineTo(p.x+39*z,p.y-91*z);ctx.stroke();
    ctx.strokeStyle='rgba(126,166,94,.62)';ctx.lineWidth=2*z;for(const sx of[-1,1]){ctx.beginPath();ctx.moveTo(p.x+sx*29*z,p.y-72*z);ctx.lineTo(p.x+sx*43*z,p.y-75*z);ctx.moveTo(p.x+sx*35*z,p.y-82*z);ctx.lineTo(p.x+sx*49*z,p.y-91*z);ctx.stroke();}
    ctx.globalAlpha=.13;circle(p.x,p.y-44*z,48*z,'#a4c37c');ctx.restore();
  }

  function mirelingAccent(e,p,z) {
    ctx.save();ctx.fillStyle='rgba(101,144,104,.62)';
    for(const [x,y,r] of [[-14,-12,6],[-5,-27,7],[8,-24,5],[15,-11,6]])circle(p.x+x*z,p.y+y*z,r*z,'rgba(101,144,104,.62)');
    ctx.strokeStyle='rgba(174,202,151,.48)';ctx.lineWidth=1.5*z;ctx.beginPath();ctx.moveTo(p.x-12*z,p.y-8*z);ctx.quadraticCurveTo(p.x,p.y-31*z,p.x+16*z,p.y-10*z);ctx.stroke();ctx.restore();
  }

  function bogAccent(e,p,z) {
    ctx.save();ctx.strokeStyle='rgba(161,188,158,.52)';ctx.lineWidth=2*z;ctx.lineCap='round';
    for(const sx of[-1,1]){ctx.beginPath();ctx.moveTo(p.x+sx*12*z,p.y-38*z);ctx.lineTo(p.x+sx*27*z,p.y-52*z);ctx.lineTo(p.x+sx*36*z,p.y-47*z);ctx.stroke();}
    ctx.globalAlpha=.12;circle(p.x,p.y-31*z,37*z,'#8aaf98');ctx.restore();
  }

  function wardenAccent(e,p,z) {
    ctx.save();ctx.strokeStyle='rgba(182,216,204,.64)';ctx.lineWidth=2.5*z;
    ctx.beginPath();ctx.arc(p.x,p.y-57*z,27*z,Math.PI*1.05,Math.PI*1.95);ctx.stroke();
    ctx.strokeStyle='rgba(91,142,133,.65)';ctx.lineWidth=3*z;for(const sx of[-1,1]){ctx.beginPath();ctx.moveTo(p.x+sx*21*z,p.y-37*z);ctx.quadraticCurveTo(p.x+sx*35*z,p.y-18*z,p.x+sx*29*z,p.y+2*z);ctx.stroke();}
    ctx.globalAlpha=.1;circle(p.x,p.y-42*z,57*z,'#95c4b5');ctx.restore();
  }

  const build18DrawEnemy = drawEnemy;
  drawEnemy = function build19DrawEnemy(e) {
    build18DrawEnemy(e);
    if (!biomeArt.enabled || e.dead) return;
    const p=worldToScreen(e.x,e.y),z=camera.zoom*(e.scale||1);if(!visible(p,110))return;
    if(e.type==='grovekeeper'){grovekeeperAccent(e,p,z);biomeArt.frame.groveEnemies++;}
    else if(e.type==='mireling'){mirelingAccent(e,p,z);biomeArt.frame.fenEnemies++;}
    else if(e.type==='bogstalker'){bogAccent(e,p,z);biomeArt.frame.fenEnemies++;}
    else if(e.type==='fenwarden'){wardenAccent(e,p,z);biomeArt.frame.fenEnemies++;}
  };

  function drawAmbient() {
    const now=performance.now();
    if(inGrove(player.x,player.y)){
      ctx.save();
      for(let i=0;i<16;i++){
        const angle=i*.73+now/4200;
        const wx=player.x+Math.cos(angle)*260+(i%4)*45;
        const wy=player.y+Math.sin(angle*1.17)*190;
        const p=worldToScreen(wx,wy);if(!visible(p,20))continue;
        const pulse=.18+.1*Math.sin(now/520+i);
        ctx.globalAlpha=pulse;circle(p.x,p.y-20*camera.zoom,(1.4+(i%3)*.45)*camera.zoom,i%3===0?'#d4c4ee':'#c3d98f');biomeArt.frame.ambient++;
      }
      ctx.restore();
    }
    if(inFen(player.x,player.y)){
      ctx.save();
      for(let i=0;i<9;i++){
        const wx=player.x-300+(i*91+now*.008)%650;
        const wy=player.y-150+(i%4)*95;
        const p=worldToScreen(wx,wy);if(!visible(p,70))continue;
        ctx.globalAlpha=.035+(i%3)*.012;ctx.fillStyle='#d4e5dd';ctx.beginPath();ctx.ellipse(p.x,p.y,95*camera.zoom,17*camera.zoom,0,0,TAU);ctx.fill();biomeArt.frame.ambient++;
      }
      ctx.restore();
    }
  }

  const build18DrawParticles = drawParticles;
  drawParticles = function build19DrawParticles() {
    build18DrawParticles();
    if (!biomeArt.enabled) return;
    drawAmbient();
  };

  if(window.__BRIAR_GLENDebug){
    window.__BRIAR_GLENDebug.setBiomeArtEnabled=value=>{biomeArt.enabled=!!value;return biomeArt.enabled;};
    window.__BRIAR_GLENDebug.getBiomeArtState=()=>({
      enabled:biomeArt.enabled,style:biomeArt.style,frames:biomeArt.frames,
      groveMarkCount:biomeArt.groveMarks.length,fenMarkCount:biomeArt.fenMarks.length,
      frame:{...biomeArt.frame},
      entityCounts:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
      zone:zoneFor(player.x,player.y).name,
    });
  }
})();
