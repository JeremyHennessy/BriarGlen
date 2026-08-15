(() => {
  'use strict';

  // Build 16: first finished visual slice — Briar Glen + Meadow Road.
  // Pure presentation layer: no world objects, blockers, progression, combat or save rules are changed.
  const art = {
    enabled: true,
    slice: 'BRIAR GLEN + MEADOW ROAD',
    style: 'warm-storybook-v1',
    frames: 0,
    details: [],
    lights: [],
    baseline: {
      objects: worldObjects.length,
      resources: resources.length,
      enemies: enemies.length,
    },
    frame: {
      groundDetails: 0,
      lightPools: 0,
      customObjects: 0,
      customResources: 0,
      playerAccents: 0,
      enemyAccents: 0,
    },
  };

  document.documentElement.dataset.briarGlenArt = art.style;

  function artRand(seed) {
    let a = seed >>> 0;
    return () => {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const rand = artRand(160816);
  for (let i = 0; i < 220; i++) {
    const x = -975 + rand() * 1650;
    const y = -610 + rand() * 1220;
    // Mooncap Grove gets its own future art pass; stop this slice at the north fork.
    if (x > -80 && y < -425) continue;
    const town = x < -210;
    const roll = rand();
    const kind = town
      ? roll < .46 ? 'grass' : roll < .68 ? 'leaf' : roll < .86 ? 'stone' : 'flower'
      : roll < .52 ? 'grass' : roll < .72 ? 'flower' : roll < .9 ? 'stone' : 'leaf';
    art.details.push({
      x, y, kind,
      s: .65 + rand() * .8,
      turn: (rand() - .5) * .9,
      variant: Math.floor(rand() * 4),
    });
  }

  art.lights = worldObjects
    .filter(o => o.type === 'lamp')
    .map(o => ({ x: o.x, y: o.y - 18, radius: 78, alpha: .12 }))
    .concat([
      { x: -765, y: -285, radius: 112, alpha: .11 },
      { x: -470, y: 255, radius: 88, alpha: .08 },
      { x: -650, y: 260, radius: 80, alpha: .07 },
    ]);

  function inFirstSlice(x, y) {
    return x >= -1000 && x <= 690 && !(x > -80 && y < -425);
  }

  function visible(p, margin = 150) {
    return p.x > -margin && p.x < viewport.w + margin && p.y > -margin && p.y < viewport.h + margin;
  }

  function artShadow(x, y, rx, ry, alpha = .24, offsetX = 7, offsetY = 8) {
    const p = worldToScreen(x, y);
    const z = camera.zoom;
    ctx.save();
    ctx.translate(p.x + offsetX*z, p.y + offsetY*z);
    ctx.scale(1, .48);
    const g = ctx.createRadialGradient(0, 0, 2*z, 0, 0, rx*z);
    g.addColorStop(0, `rgba(8,14,9,${alpha})`);
    g.addColorStop(.68, `rgba(8,14,9,${alpha*.58})`);
    g.addColorStop(1, 'rgba(8,14,9,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx*z, ry*z, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawGrassMark(d, p, z) {
    const s = d.s*z;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(d.turn);
    ctx.strokeStyle = d.variant % 2 ? 'rgba(87,126,67,.58)' : 'rgba(112,145,77,.48)';
    ctx.lineWidth = Math.max(.8, 1.35*z);
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i*2.4*s, 1*s);
      ctx.quadraticCurveTo(i*3.4*s, -4*s, (i*4.2 + (i === 0 ? 1 : 0))*s, -9*s);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLeafMark(d, p, z) {
    const s = d.s*z;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(d.turn);
    ctx.fillStyle = d.variant % 2 ? 'rgba(161,125,69,.34)' : 'rgba(121,103,61,.32)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.5*s, 1.9*s, .4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(86,68,42,.28)';
    ctx.lineWidth = .7*z;
    ctx.beginPath(); ctx.moveTo(-3*s, 0); ctx.lineTo(4*s, 0); ctx.stroke();
    ctx.restore();
  }

  function drawStoneMark(d, p, z) {
    const s = d.s*z;
    ctx.fillStyle = d.variant % 2 ? 'rgba(116,117,98,.28)' : 'rgba(88,96,78,.25)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 4.5*s, 2.4*s, d.turn, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(234,225,196,.08)';
    ctx.lineWidth = .7*z;
    ctx.stroke();
  }

  function drawFlowerMark(d, p, z) {
    const s = d.s*z;
    ctx.strokeStyle = 'rgba(74,112,64,.42)';
    ctx.lineWidth = 1*z;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 6*s); ctx.stroke();
    const color = ['#d8c17a','#d8aa91','#b9c989','#c0add1'][d.variant % 4];
    ctx.globalAlpha = .55;
    circle(p.x, p.y - 7*s, 2.1*s, color);
    ctx.globalAlpha = 1;
  }

  function drawGroundDetails() {
    const z = camera.zoom;
    for (const d of art.details) {
      const p = worldToScreen(d.x, d.y);
      if (!visible(p, 32)) continue;
      if (d.kind === 'grass') drawGrassMark(d, p, z);
      else if (d.kind === 'leaf') drawLeafMark(d, p, z);
      else if (d.kind === 'stone') drawStoneMark(d, p, z);
      else drawFlowerMark(d, p, z);
      art.frame.groundDetails += 1;
    }
  }

  function drawLightPools() {
    const nightBias = .85 + Math.sin(performance.now()/1700) * .04;
    for (const light of art.lights) {
      const p = worldToScreen(light.x, light.y);
      if (!visible(p, light.radius)) continue;
      const r = light.radius * camera.zoom;
      const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r);
      g.addColorStop(0, `rgba(255,207,118,${light.alpha * nightBias})`);
      g.addColorStop(.35, `rgba(232,174,92,${light.alpha*.55})`);
      g.addColorStop(1, 'rgba(220,155,72,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x-r, p.y-r, r*2, r*2);
      art.frame.lightPools += 1;
    }
  }

  const build15DrawGround = drawGround;
  drawGround = function build16DrawGround(zone) {
    art.frames += 1;
    art.frame = { groundDetails: 0, lightPools: 0, customObjects: 0, customResources: 0, playerAccents: 0, enemyAccents: 0 };
    build15DrawGround(zone);
    if (!art.enabled) return;
    drawGroundDetails();
    drawLightPools();
  };

  function strokeWorldPath(points, width, color, dash = []) {
    const screen = points.map(([x,y]) => worldToScreen(x,y));
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width * camera.zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(dash.map(v => v*camera.zoom));
    ctx.beginPath();
    screen.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
    ctx.stroke();
    ctx.restore();
  }

  const build15DrawRoute = drawRoute;
  drawRoute = function build16DrawRoute() {
    build15DrawRoute();
    if (!art.enabled) return;
    // Wagon ruts and a subtle highlighted foot-worn centre make the main road feel authored.
    const roadA = [[-965,-20],[-720,-12],[-470,-18],[-205,-14],[95,-25],[385,-5],[640,-8]];
    const roadB = [[-965,24],[-720,30],[-470,24],[-205,28],[95,16],[385,35],[640,30]];
    strokeWorldPath(roadA, 2.3, 'rgba(77,61,42,.34)', [15,18]);
    strokeWorldPath(roadB, 2.3, 'rgba(77,61,42,.31)', [13,20]);
    strokeWorldPath([[-920,5],[-700,8],[-470,5],[-245,8]], 1.4, 'rgba(232,210,160,.12)', [6,28]);
  };

  function drawStoryTree(o, p, z) {
    const s = (o.s || 1) * z;
    artShadow(o.x,o.y,34*(o.s||1),17*(o.s||1),.23);
    ctx.save();
    ctx.translate(p.x,p.y);
    ctx.fillStyle='#493828';
    ctx.beginPath();
    ctx.moveTo(-6*s,4*s); ctx.lineTo(-5*s,-39*s); ctx.lineTo(-1*s,-55*s); ctx.lineTo(5*s,-39*s); ctx.lineTo(7*s,4*s); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle='rgba(221,188,132,.18)'; ctx.lineWidth=1.4*s;
    ctx.beginPath();ctx.moveTo(-2*s,-4*s);ctx.lineTo(0,-43*s);ctx.stroke();
    const clusters = [
      [-17,-59,24,'#334f34'], [16,-61,26,'#3f5e3b'], [0,-79,28,'#486b42'],
      [-29,-77,18,'#3b5a38'], [27,-83,19,'#527448'], [0,-99,18,'#5b7d4d'],
    ];
    for (const [cx,cy,r,c] of clusters) circle(cx*s,cy*s,r*s,c);
    ctx.globalAlpha=.22;
    circle(-8*s,-91*s,11*s,'#b3c982');
    circle(20*s,-76*s,9*s,'#9fbd72');
    ctx.globalAlpha=1;
    ctx.restore();
  }

  function drawStoryBush(o, p, z) {
    const s=(o.s||1)*z;
    artShadow(o.x,o.y,26*(o.s||1),12*(o.s||1),.14,5,5);
    ctx.save();ctx.translate(p.x,p.y);
    circle(-16*s,-14*s,17*s,'#35583a');
    circle(3*s,-22*s,21*s,'#456b43');
    circle(20*s,-14*s,15*s,'#53784b');
    ctx.globalAlpha=.2;circle(-2*s,-31*s,9*s,'#b1c986');ctx.globalAlpha=1;
    ctx.fillStyle='#d5b86e';
    for (const [x,y] of [[-13,-17],[8,-23],[19,-10]]) circle(x*s,y*s,1.8*s,'#d5b86e');
    ctx.restore();
  }

  function drawRoof(p,z,w,h,color) {
    ctx.fillStyle='rgba(16,19,15,.28)';
    ctx.beginPath();ctx.moveTo(p.x-w*.55*z,p.y-h*.72*z);ctx.lineTo(p.x,p.y-h*1.18*z);ctx.lineTo(p.x+w*.58*z,p.y-h*.7*z);ctx.lineTo(p.x+w*.48*z,p.y-h*.59*z);ctx.lineTo(p.x,p.y-h*1.03*z);ctx.lineTo(p.x-w*.46*z,p.y-h*.59*z);ctx.closePath();ctx.fill();
    ctx.fillStyle=color;
    ctx.beginPath();ctx.moveTo(p.x-w*.58*z,p.y-h*.78*z);ctx.lineTo(p.x,p.y-h*1.2*z);ctx.lineTo(p.x+w*.58*z,p.y-h*.78*z);ctx.lineTo(p.x+w*.48*z,p.y-h*.63*z);ctx.lineTo(p.x,p.y-h*1.04*z);ctx.lineTo(p.x-w*.48*z,p.y-h*.63*z);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(238,207,151,.13)';ctx.lineWidth=1*z;
    for(let i=-3;i<=3;i++){
      ctx.beginPath();ctx.moveTo(p.x+i*w*.12*z,p.y-h*(.93-Math.abs(i)*.035)*z);ctx.lineTo(p.x+i*w*.13*z,p.y-h*.69*z);ctx.stroke();
    }
  }

  function warmWindow(x,y,w,h,z) {
    ctx.fillStyle='rgba(65,45,29,.72)';ctx.fillRect(x-1*z,y-1*z,w+2*z,h+2*z);
    ctx.fillStyle='rgba(239,181,87,.9)';ctx.fillRect(x,y,w,h);
    ctx.fillStyle='rgba(255,226,151,.28)';ctx.fillRect(x+1*z,y+1*z,w*.42,h*.4);
    ctx.strokeStyle='rgba(70,47,29,.6)';ctx.lineWidth=1*z;
    ctx.beginPath();ctx.moveTo(x+w/2,y);ctx.lineTo(x+w/2,y+h);ctx.moveTo(x,y+h/2);ctx.lineTo(x+w,y+h/2);ctx.stroke();
  }

  function drawStoryTavern(o,p,z) {
    artShadow(o.x,o.y,72,35,.34);
    ctx.fillStyle='#624b37';ctx.fillRect(p.x-56*z,p.y-57*z,112*z,57*z);
    ctx.fillStyle='rgba(226,194,143,.18)';ctx.fillRect(p.x-50*z,p.y-51*z,100*z,3*z);
    ctx.strokeStyle='#3d3026';ctx.lineWidth=4*z;
    for (const x of [-43,0,43]) {ctx.beginPath();ctx.moveTo(p.x+x*z,p.y-55*z);ctx.lineTo(p.x+x*z,p.y);ctx.stroke();}
    drawRoof(p,z,118,76,'#34352d');
    ctx.fillStyle='#6c432e';ctx.fillRect(p.x-14*z,p.y-35*z,27*z,35*z);
    ctx.fillStyle='#b48752';circle(p.x+8*z,p.y-18*z,1.8*z,'#b48752');
    warmWindow(p.x-43*z,p.y-37*z,18*z,15*z,z);
    warmWindow(p.x+25*z,p.y-39*z,19*z,15*z,z);
    ctx.fillStyle='#59432f';roundRect(p.x+51*z,p.y-66*z,34*z,17*z,3*z);ctx.fill();
    ctx.strokeStyle='#b98c52';ctx.lineWidth=1.4*z;ctx.stroke();
    ctx.fillStyle='#e5cd94';ctx.font=`800 ${Math.max(6,7*z)}px system-ui`;ctx.textAlign='center';ctx.fillText('HEARTH',p.x+68*z,p.y-55*z);
    labelAt(p.x,p.y-109*z,'THE HEARTH & BRIAR');
  }

  function drawStoryCottage(o,p,z) {
    artShadow(o.x,o.y,47,23,.28);
    ctx.fillStyle='#6c563f';ctx.fillRect(p.x-35*z,p.y-42*z,70*z,42*z);
    ctx.strokeStyle='#493829';ctx.lineWidth=3*z;
    ctx.beginPath();ctx.moveTo(p.x,p.y-41*z);ctx.lineTo(p.x,p.y);ctx.stroke();
    drawRoof(p,z,78,52,o.roof || '#725b42');
    ctx.fillStyle='#563a2a';ctx.fillRect(p.x-8*z,p.y-27*z,16*z,27*z);
    warmWindow(p.x+14*z,p.y-29*z,11*z,11*z,z);
    ctx.fillStyle='rgba(235,215,170,.16)';ctx.fillRect(p.x-29*z,p.y-35*z,19*z,2*z);
  }

  function drawStoryForge(o,p,z) {
    artShadow(o.x,o.y,54,28,.31);
    ctx.fillStyle='#5d4937';ctx.fillRect(p.x-34*z,p.y-47*z,68*z,47*z);
    ctx.strokeStyle='#3f3329';ctx.lineWidth=3*z;
    ctx.strokeRect(p.x-29*z,p.y-42*z,58*z,42*z);
    drawRoof(p,z,80,55,'#30332d');
    ctx.fillStyle='#34342e';ctx.fillRect(p.x+17*z,p.y-75*z,12*z,32*z);
    ctx.fillStyle='rgba(92,75,56,.55)';ctx.fillRect(p.x+19*z,p.y-81*z,8*z,8*z);
    const pulse=.75+Math.sin(performance.now()/180)*.15;
    ctx.globalAlpha=pulse;warmWindow(p.x+13*z,p.y-27*z,13*z,16*z,z);ctx.globalAlpha=1;
    ctx.strokeStyle='#9b7650';ctx.lineWidth=4*z;ctx.beginPath();ctx.moveTo(p.x-18*z,p.y-5*z);ctx.lineTo(p.x-3*z,p.y-13*z);ctx.lineTo(p.x+8*z,p.y-6*z);ctx.stroke();
    labelAt(p.x,p.y-91*z,'ALDEN • SMITH');
  }

  function drawStoryAlchemy(o,p,z) {
    artShadow(o.x,o.y,46,22,.25);
    ctx.fillStyle='#5d4b3b';ctx.fillRect(p.x-35*z,p.y-33*z,70*z,33*z);
    drawRoof(p,z,78,45,'#604b68');
    ctx.strokeStyle='#3e332d';ctx.lineWidth=3*z;ctx.strokeRect(p.x-29*z,p.y-29*z,58*z,29*z);
    for(const [x,c] of [[-18,'#8fd0aa'],[0,'#9c81bf'],[18,'#d9bd73']]){
      ctx.globalAlpha=.18;circle(p.x+x*z,p.y-35*z,9*z,c);ctx.globalAlpha=1;circle(p.x+x*z,p.y-35*z,4*z,c);
    }
    labelAt(p.x,p.y-70*z,'MIRA • ALCHEMY');
  }

  function drawStoryMerchant(o,p,z) {
    artShadow(o.x,o.y,41,20,.22);
    ctx.fillStyle='#5b4532';ctx.fillRect(p.x-35*z,p.y-26*z,70*z,26*z);
    ctx.fillStyle='#8b6a42';ctx.beginPath();ctx.moveTo(p.x-43*z,p.y-27*z);ctx.lineTo(p.x-29*z,p.y-53*z);ctx.lineTo(p.x+29*z,p.y-53*z);ctx.lineTo(p.x+43*z,p.y-27*z);ctx.closePath();ctx.fill();
    ctx.fillStyle='#cfb06a';ctx.fillRect(p.x-29*z,p.y-51*z,16*z,18*z);
    ctx.fillStyle='#8fa276';ctx.fillRect(p.x-6*z,p.y-48*z,14*z,15*z);
    ctx.fillStyle='#9e6c50';ctx.fillRect(p.x+15*z,p.y-50*z,13*z,17*z);
    ctx.strokeStyle='#e0bf75';ctx.lineWidth=1*z;ctx.beginPath();ctx.moveTo(p.x-43*z,p.y-27*z);ctx.lineTo(p.x+43*z,p.y-27*z);ctx.stroke();
    labelAt(p.x,p.y-65*z,'ROWAN • TRADER');
  }

  function drawStoryBoard(o,p,z) {
    artShadow(o.x,o.y,27,11,.16,4,5);
    ctx.fillStyle='#5c432d';ctx.fillRect(p.x-4*z,p.y-37*z,8*z,37*z);
    ctx.fillStyle='#6f5034';roundRect(p.x-33*z,p.y-59*z,66*z,35*z,3*z);ctx.fill();
    ctx.strokeStyle='#ba8d53';ctx.lineWidth=2*z;ctx.stroke();
    ctx.fillStyle='#d7c59c';
    for(const [x,y,w,h] of [[-23,-51,18,12],[2,-52,20,14],[-7,-38,25,8]]) ctx.fillRect(p.x+x*z,p.y+y*z,w*z,h*z);
    ctx.fillStyle='#9b5f47';circle(p.x+10*z,p.y-43*z,2.8*z,'#9b5f47');
    labelAt(p.x,p.y-68*z,'CONTRACT BOARD');
  }

  function drawStoryWell(o,p,z) {
    artShadow(o.x,o.y,36,17,.2);
    ctx.fillStyle='#6e7064';ctx.beginPath();ctx.ellipse(p.x,p.y-4*z,30*z,14*z,0,0,TAU);ctx.fill();
    ctx.fillStyle='#252f2c';ctx.beginPath();ctx.ellipse(p.x,p.y-8*z,22*z,9*z,0,0,TAU);ctx.fill();
    ctx.strokeStyle='#99998a';ctx.lineWidth=5*z;ctx.beginPath();ctx.ellipse(p.x,p.y-5*z,29*z,13*z,0,0,TAU);ctx.stroke();
    ctx.strokeStyle='#554332';ctx.lineWidth=4*z;ctx.beginPath();ctx.moveTo(p.x-22*z,p.y-9*z);ctx.lineTo(p.x-22*z,p.y-49*z);ctx.lineTo(p.x+22*z,p.y-49*z);ctx.lineTo(p.x+22*z,p.y-9*z);ctx.stroke();
    ctx.strokeStyle='#6c5237';ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(p.x-4*z,p.y-49*z);ctx.lineTo(p.x+5*z,p.y-31*z);ctx.stroke();
  }

  function drawStoryLamp(o,p,z) {
    ctx.strokeStyle='#3c352b';ctx.lineWidth=4*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-50*z);ctx.stroke();
    ctx.fillStyle='#332f29';ctx.beginPath();ctx.moveTo(p.x-7*z,p.y-52*z);ctx.lineTo(p.x,p.y-61*z);ctx.lineTo(p.x+7*z,p.y-52*z);ctx.lineTo(p.x+5*z,p.y-41*z);ctx.lineTo(p.x-5*z,p.y-41*z);ctx.closePath();ctx.fill();
    ctx.globalAlpha=.18;circle(p.x,p.y-48*z,(17+Math.sin(performance.now()/240+o.x)*2)*z,'#ffd98b');ctx.globalAlpha=1;
    circle(p.x,p.y-49*z,4*z,'#f0bd63');
  }

  function drawStoryBanner(o,p,z) {
    ctx.strokeStyle='#4d3c2d';ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-82*z);ctx.stroke();
    ctx.fillStyle='#884f3d';ctx.beginPath();ctx.moveTo(p.x+3*z,p.y-77*z);ctx.quadraticCurveTo(p.x+24*z,p.y-72*z,p.x+45*z,p.y-69*z);ctx.lineTo(p.x+35*z,p.y-40*z);ctx.quadraticCurveTo(p.x+18*z,p.y-45*z,p.x+3*z,p.y-48*z);ctx.closePath();ctx.fill();
    ctx.fillStyle='#dabd76';ctx.globalAlpha=.7;ctx.beginPath();ctx.moveTo(p.x+18*z,p.y-68*z);ctx.lineTo(p.x+29*z,p.y-64*z);ctx.lineTo(p.x+23*z,p.y-50*z);ctx.lineTo(p.x+12*z,p.y-55*z);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
  }

  function drawStoryNpc(o,p,z) {
    artShadow(o.x,o.y,16,8,.15,3,4);
    ctx.save();ctx.translate(p.x,p.y);
    ctx.fillStyle=o.color;ctx.beginPath();ctx.moveTo(-11*z,0);ctx.lineTo(-9*z,-30*z);ctx.lineTo(0,-39*z);ctx.lineTo(10*z,-29*z);ctx.lineTo(12*z,0);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(245,225,181,.18)';ctx.beginPath();ctx.moveTo(-8*z,-24*z);ctx.lineTo(8*z,-28*z);ctx.lineTo(5*z,-21*z);ctx.lineTo(-7*z,-17*z);ctx.closePath();ctx.fill();
    circle(o.facingX*2*z,-41*z+o.facingY*z,8*z,'#c9a47e');
    ctx.fillStyle='#332d28';ctx.beginPath();ctx.arc(o.facingX*2*z,-43*z+o.facingY*z,8*z,Math.PI,TAU);ctx.fill();
    ctx.fillStyle='#5b4431';ctx.fillRect(-8*z,-3*z,6*z,5*z);ctx.fillRect(3*z,-3*z,6*z,5*z);
    ctx.restore();
    if (dist(player,o)<115) labelAt(p.x,p.y-59*z,o.name.toUpperCase());
  }

  function drawStoryFence(o,p,z) {
    const b=worldToScreen(o.x2,o.y2);
    ctx.save();ctx.strokeStyle='#684d33';ctx.lineWidth=5*z;ctx.lineCap='round';
    for(const yoff of [-9,2]){ctx.beginPath();ctx.moveTo(p.x,p.y+yoff*z);ctx.lineTo(b.x,b.y+yoff*z);ctx.stroke();}
    for(let t=0;t<=1.001;t+=.25){const x=p.x+(b.x-p.x)*t,y=p.y+(b.y-p.y)*t;ctx.beginPath();ctx.moveTo(x,y+6*z);ctx.lineTo(x-1*z,y-20*z);ctx.stroke();ctx.strokeStyle='rgba(221,188,132,.16)';ctx.lineWidth=1*z;ctx.beginPath();ctx.moveTo(x+1*z,y+3*z);ctx.lineTo(x,y-17*z);ctx.stroke();ctx.strokeStyle='#684d33';ctx.lineWidth=5*z;}
    ctx.restore();
  }

  function drawStoryGarden(o,p,z) {
    artShadow(o.x,o.y,43,20,.08,3,4);
    ctx.save();
    for(let i=-2;i<=2;i++){
      const off=i*10*z;ctx.strokeStyle='rgba(83,57,36,.68)';ctx.lineWidth=4*z;ctx.beginPath();ctx.moveTo(p.x-35*z,p.y+off*.45);ctx.lineTo(p.x+36*z,p.y+off*.45);ctx.stroke();
      for(let j=-2;j<=2;j++){
        const c=(i+j)%2?'#739654':'#8aa65c';circle(p.x+j*14*z,p.y+off*.45-3*z,3*z,c);
        if((i+j)%3===0){ctx.globalAlpha=.65;circle(p.x+j*14*z+2*z,p.y+off*.45-6*z,1.2*z,'#d7bd78');ctx.globalAlpha=1;}
      }
    }
    ctx.restore();
  }

  const build15DrawObject = drawObject;
  drawObject = function build16DrawObject(o) {
    if (!art.enabled || !inFirstSlice(o.x,o.y)) return build15DrawObject(o);
    const p=worldToScreen(o.x,o.y), z=camera.zoom;
    if (!visible(p,230)) return;
    const handled = new Set(['tree','bush','tavern','cottage','forge','alchemy','merchant','board','well','lamp','banner','npc','fence','garden']);
    if (!handled.has(o.type)) return build15DrawObject(o);
    art.frame.customObjects += 1;
    if(o.type==='tree') drawStoryTree(o,p,z);
    else if(o.type==='bush') drawStoryBush(o,p,z);
    else if(o.type==='tavern') drawStoryTavern(o,p,z);
    else if(o.type==='cottage') drawStoryCottage(o,p,z);
    else if(o.type==='forge') drawStoryForge(o,p,z);
    else if(o.type==='alchemy') drawStoryAlchemy(o,p,z);
    else if(o.type==='merchant') drawStoryMerchant(o,p,z);
    else if(o.type==='board') drawStoryBoard(o,p,z);
    else if(o.type==='well') drawStoryWell(o,p,z);
    else if(o.type==='lamp') drawStoryLamp(o,p,z);
    else if(o.type==='banner') drawStoryBanner(o,p,z);
    else if(o.type==='npc') drawStoryNpc(o,p,z);
    else if(o.type==='fence') drawStoryFence(o,p,z);
    else if(o.type==='garden') drawStoryGarden(o,p,z);
  };

  function drawStoryHerb(r,p,z) {
    artShadow(r.x,r.y,16,7,.08,3,3);
    ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle='#365d39';ctx.lineWidth=2.2*z;ctx.lineCap='round';
    for(let i=-2;i<=2;i++){
      ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(i*5*z,-9*z,i*7*z,-21*z);ctx.stroke();
      ctx.fillStyle=i%2?'#78a85c':'#8bbb64';ctx.beginPath();ctx.ellipse(i*6*z,-14*z,5*z,2.6*z,i*.35,0,TAU);ctx.fill();
    }
    ctx.globalAlpha=.55;circle(2*z,-23*z,2.1*z,'#d7c36e');ctx.globalAlpha=1;ctx.restore();
  }

  function drawStoryMooncap(r,p,z) {
    artShadow(r.x,r.y,17,8,.1,3,3);
    ctx.save();ctx.translate(p.x,p.y);
    for(const [x,h,s] of [[-7,15,.82],[5,20,1],[13,12,.68]]){
      ctx.strokeStyle='#ded7c3';ctx.lineWidth=2.6*z*s;ctx.beginPath();ctx.moveTo(x*z,0);ctx.lineTo(x*z,-h*z);ctx.stroke();
      ctx.fillStyle=s>.9?'#9278b8':'#826aa8';ctx.beginPath();ctx.arc(x*z,-(h+2)*z,9*z*s,Math.PI,TAU);ctx.lineTo((x+9*s)*z,-(h+2)*z);ctx.closePath();ctx.fill();
      ctx.globalAlpha=.22;circle((x-2)*z,-(h+5)*z,2.5*z*s,'#efe7ff');ctx.globalAlpha=1;
    }
    ctx.restore();
  }

  const build15DrawResource = drawResource;
  drawResource = function build16DrawResource(r) {
    if (!art.enabled || !inFirstSlice(r.x,r.y) || !['herb','mooncap'].includes(r.type)) return build15DrawResource(r);
    const p=worldToScreen(r.x,r.y),z=camera.zoom;if(!visible(p,70))return;
    art.frame.customResources += 1;
    if(r.type==='herb')drawStoryHerb(r,p,z);else drawStoryMooncap(r,p,z);
  };

  const build15DrawPlayer = drawPlayer;
  drawPlayer = function build16DrawPlayer() {
    build15DrawPlayer();
    if (!art.enabled) return;
    const p=worldToScreen(player.x,player.y),z=camera.zoom;
    const a=Math.atan2(player.facingY,player.facingX);
    art.frame.playerAccents += 1;
    ctx.save();ctx.translate(p.x,p.y);
    // Warden mantle and hood give the player a recognisable silhouette without replacing Build 13 motion/afterimages.
    ctx.fillStyle='rgba(36,61,43,.96)';ctx.beginPath();ctx.moveTo(-17*z,-31*z);ctx.quadraticCurveTo(0,-45*z,18*z,-30*z);ctx.lineTo(12*z,-20*z);ctx.quadraticCurveTo(0,-27*z,-13*z,-19*z);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#9b8658';ctx.lineWidth=1.4*z;ctx.beginPath();ctx.moveTo(-13*z,-21*z);ctx.quadraticCurveTo(0,-27*z,13*z,-21*z);ctx.stroke();
    ctx.fillStyle='#2c4b37';ctx.beginPath();ctx.arc(0,-50*z,13*z,Math.PI*.88,TAU+.2);ctx.lineTo(8*z,-38*z);ctx.lineTo(-8*z,-39*z);ctx.closePath();ctx.fill();
    circle(player.facingX*3*z,-49*z+player.facingY*1.5*z,6.7*z,'#c7a681');
    // Belt, field satchel and Warden clasp.
    ctx.strokeStyle='#5b3f2d';ctx.lineWidth=4*z;ctx.beginPath();ctx.moveTo(-13*z,-13*z);ctx.lineTo(14*z,-13*z);ctx.stroke();
    ctx.fillStyle='#c5a45f';circle(0,-31*z,2.8*z,'#c5a45f');
    ctx.fillStyle='#604731';roundRect(-18*z,-14*z,8*z,12*z,2*z);ctx.fill();
    ctx.fillStyle='#4b392b';ctx.fillRect(-9*z,-2*z,6*z,4*z);ctx.fillRect(4*z,-2*z,6*z,4*z);
    // Small weapon-specific readability accents.
    ctx.save();ctx.translate(player.facingX*12*z,-23*z+player.facingY*4*z);ctx.rotate(a*.55+.15);
    if(player.weaponType==='sword'){
      ctx.strokeStyle='#d8bb78';ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(1*z,0);ctx.lineTo(9*z,-6*z);ctx.stroke();
      ctx.globalAlpha=.45;ctx.strokeStyle='#fff1c5';ctx.lineWidth=1*z;ctx.beginPath();ctx.moveTo(10*z,-7*z);ctx.lineTo(27*z,-17*z);ctx.stroke();ctx.globalAlpha=1;
    }else if(player.weaponType==='bow'){
      ctx.strokeStyle='#b7a06f';ctx.lineWidth=1.3*z;ctx.beginPath();ctx.arc(9*z,-4*z,20*z,-1.12,1.08);ctx.stroke();
    }else{
      ctx.strokeStyle='rgba(145,214,178,.55)';ctx.lineWidth=1.7*z;ctx.beginPath();ctx.arc(27*z,-23*z,9*z,0,TAU);ctx.stroke();
    }
    ctx.restore();ctx.restore();
  };

  const build15DrawEnemy = drawEnemy;
  drawEnemy = function build16DrawEnemy(e) {
    build15DrawEnemy(e);
    if (!art.enabled || e.dead || !['wolf','boar'].includes(e.type)) return;
    const p=worldToScreen(e.x,e.y),z=camera.zoom*e.scale;
    if(!visible(p,90))return;
    art.frame.enemyAccents += 1;
    ctx.save();ctx.translate(p.x,p.y);
    const fx=e.facingX*10*z,fy=e.facingY*4*z;
    if(e.type==='wolf'){
      ctx.fillStyle=e.hurt>0?'#efd0ad':'#596056';
      ctx.beginPath();ctx.moveTo(fx+11*z,-36*z+fy);ctx.lineTo(fx+14*z,-49*z+fy);ctx.lineTo(fx+21*z,-38*z+fy);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(fx+22*z,-36*z+fy);ctx.lineTo(fx+29*z,-47*z+fy);ctx.lineTo(fx+32*z,-33*z+fy);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#4c524b';ctx.lineWidth=5*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-23*z,-18*z);ctx.quadraticCurveTo(-39*z,-32*z,-31*z,-43*z);ctx.stroke();
    }else{
      ctx.strokeStyle='#e3cfaa';ctx.lineWidth=2.4*z;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(fx+25*z,-20*z+fy);ctx.quadraticCurveTo(fx+36*z,-16*z+fy,fx+34*z,-7*z+fy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(fx+17*z,-18*z+fy);ctx.quadraticCurveTo(fx+27*z,-13*z+fy,fx+25*z,-5*z+fy);ctx.stroke();
      ctx.strokeStyle='#554337';ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(-12*z,-35*z);ctx.lineTo(-5*z,-39*z);ctx.lineTo(2*z,-36*z);ctx.lineTo(9*z,-39*z);ctx.stroke();
    }
    ctx.restore();
  };

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.setArtEnabled = value => { art.enabled = !!value; return art.enabled; };
    window.__BRIAR_GLENDebug.getArtState = () => ({
      enabled: art.enabled,
      slice: art.slice,
      style: art.style,
      frames: art.frames,
      detailCount: art.details.length,
      lightSourceCount: art.lights.length,
      frame: { ...art.frame },
      baseline: { ...art.baseline },
      current: {
        objects: worldObjects.length,
        resources: resources.length,
        enemies: enemies.length,
      },
    });
  }
})();