  function draw() {
    ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
    const zone = zoneFor(player.x);
    ctx.fillStyle = '#111a14';
    ctx.fillRect(0, 0, viewport.w, viewport.h);

    drawGround(zone);
    drawRoute();

    const renderables = [];
    for (const o of worldObjects) renderables.push({ depth: o.x + o.y, kind: 'object', obj: o });
    for (const r of resources) if (r.active) renderables.push({ depth: r.x + r.y, kind: 'resource', obj: r });
    for (const e of enemies) if (!e.dead) renderables.push({ depth: e.x + e.y, kind: 'enemy', obj: e });
    renderables.push({ depth: player.x + player.y, kind: 'player', obj: player });
    renderables.sort((a, b) => a.depth - b.depth);

    for (const r of renderables) {
      if (r.kind === 'object') drawObject(r.obj);
      else if (r.kind === 'resource') drawResource(r.obj);
      else if (r.kind === 'enemy') drawEnemy(r.obj);
      else drawPlayer();
    }

    drawProjectiles();
    drawSlashes();
    drawParticles();
    drawFloaters();
    drawVignette();
  }

  function drawGround(zone) {
    const bg = zone.tint;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, viewport.w, viewport.h);

    // Soft zone bands make the world read as continuous while retaining distinct biomes.
    for (const z of zones) {
      const c1 = worldToScreen(z.min, -650);
      const c2 = worldToScreen(z.max, -650);
      const c3 = worldToScreen(z.max, 650);
      const c4 = worldToScreen(z.min, 650);
      ctx.beginPath(); ctx.moveTo(c1.x,c1.y); ctx.lineTo(c2.x,c2.y); ctx.lineTo(c3.x,c3.y); ctx.lineTo(c4.x,c4.y); ctx.closePath();
      ctx.fillStyle = z.tint;
      ctx.fill();
    }

    // Isometric grid / texture lines.
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(240,225,188,.055)';
    for (let x = -1000; x <= 2200; x += 120) {
      const a = worldToScreen(x, -650), b = worldToScreen(x, 650);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }
    for (let y = -650; y <= 650; y += 120) {
      const a = worldToScreen(-1000, y), b = worldToScreen(2200, y);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }

    // Darkening around the den.
    if (player.x > 1370) {
      const g = ctx.createRadialGradient(viewport.w/2, viewport.h/2, 80, viewport.w/2, viewport.h/2, Math.max(viewport.w,viewport.h)*.8);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(35,15,10,.34)');
      ctx.fillStyle = g; ctx.fillRect(0,0,viewport.w,viewport.h);
    }
  }

  function drawRoute() {
    const pts = [
      [-940,0],[-720,5],[-560,0],[-350,10],[-170,0],[120,-15],[380,15],[650,0],[880,5],[1130,-5],[1410,0],[1600,0],[1850,0],[2130,0]
    ].map(([x,y]) => worldToScreen(x,y));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = player.x > 1420 ? 'rgba(128,91,66,.65)' : 'rgba(155,133,91,.45)';
    ctx.lineWidth = 58 * camera.zoom;
    ctx.beginPath();
    pts.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(232,213,171,.13)';
    ctx.lineWidth = 4 * camera.zoom;
    ctx.setLineDash([16 * camera.zoom, 20 * camera.zoom]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function shadow(x, y, rx, ry, alpha = .28) {
    const p = worldToScreen(x, y);
    ctx.save();
    ctx.translate(p.x, p.y + 7 * camera.zoom);
    ctx.scale(1, .48);
    ctx.beginPath(); ctx.ellipse(0,0,rx*camera.zoom,ry*camera.zoom,0,0,TAU);
    ctx.fillStyle = `rgba(0,0,0,${alpha})`; ctx.fill(); ctx.restore();
  }

  function drawObject(o) {
    const p = worldToScreen(o.x, o.y);
    if (p.x < -180 || p.x > viewport.w + 180 || p.y < -200 || p.y > viewport.h + 180) return;
    const z = camera.zoom;
    const s = (o.s || 1) * z;

    if (o.type === 'tree') {
      shadow(o.x,o.y,26*s/z,17*s/z,.22);
      ctx.fillStyle = '#493b2d'; ctx.fillRect(p.x-5*s,p.y-32*s,10*s,38*s);
      circle(p.x-13*s,p.y-50*s,24*s,'#344d32');
      circle(p.x+13*s,p.y-55*s,27*s,'#3e5b36');
      circle(p.x,p.y-72*s,25*s,'#49683d');
    } else if (o.type === 'bush') {
      shadow(o.x,o.y,22*s/z,12*s/z,.18);
      circle(p.x-10*s,p.y-16*s,16*s,'#3f6338'); circle(p.x+9*s,p.y-16*s,18*s,'#4e743f');
    } else if (o.type === 'deadTree') {
      shadow(o.x,o.y,25*s/z,14*s/z,.24);
      ctx.strokeStyle='#50463a';ctx.lineWidth=9*s;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-55*s);ctx.lineTo(p.x-18*s,p.y-72*s);ctx.stroke();
      ctx.beginPath();ctx.moveTo(p.x,p.y-44*s);ctx.lineTo(p.x+21*s,p.y-63*s);ctx.stroke();
    } else if (o.type === 'rock' || o.type === 'denRock') {
      shadow(o.x,o.y,28*s/z,15*s/z,.28);
      ctx.beginPath();
      ctx.moveTo(p.x-27*s,p.y);ctx.lineTo(p.x-17*s,p.y-29*s);ctx.lineTo(p.x+7*s,p.y-38*s);ctx.lineTo(p.x+29*s,p.y-10*s);ctx.lineTo(p.x+20*s,p.y+2*s);ctx.closePath();
      ctx.fillStyle=o.type==='denRock'?'#453b36':'#5f6254';ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=2;ctx.stroke();
    } else if (o.type === 'ember') {
      shadow(o.x,o.y,10*s/z,7*s/z,.12);
      const flicker = Math.sin(performance.now()/170 + o.x)*3*s;
      circle(p.x,p.y-8*s,7*s+flicker*.15,'rgba(221,98,56,.65)');
      circle(p.x,p.y-11*s,3*s,'rgba(255,193,96,.9)');
    } else if (o.type === 'forge') {
      shadow(o.x,o.y,50,28,.3);
      ctx.fillStyle='#5d4a37';ctx.fillRect(p.x-32*z,p.y-43*z,64*z,43*z);
      ctx.fillStyle='#2d3028';ctx.beginPath();ctx.moveTo(p.x-40*z,p.y-42*z);ctx.lineTo(p.x,p.y-67*z);ctx.lineTo(p.x+40*z,p.y-42*z);ctx.closePath();ctx.fill();
      ctx.fillStyle='#c06a3e';ctx.fillRect(p.x+17*z,p.y-24*z,9*z,16*z);
      labelAt(p.x,p.y-78*z,'ALDEN • SMITH');
    } else if (o.type === 'board') {
      shadow(o.x,o.y,24,11,.2);
      ctx.fillStyle='#5a4431';ctx.fillRect(p.x-4*z,p.y-34*z,8*z,34*z);ctx.fillRect(p.x-29*z,p.y-51*z,58*z,31*z);
      ctx.strokeStyle='#a47b4b';ctx.lineWidth=2*z;ctx.strokeRect(p.x-25*z,p.y-47*z,50*z,23*z);
      labelAt(p.x,p.y-61*z,'CONTRACT BOARD');
    } else if (o.type === 'well') {
      shadow(o.x,o.y,35,18,.25);
      ctx.strokeStyle='#72725f';ctx.lineWidth=10*z;ctx.beginPath();ctx.ellipse(p.x,p.y-4*z,29*z,14*z,0,0,TAU);ctx.stroke();
    } else if (o.type === 'banner') {
      ctx.strokeStyle='#574636';ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-77*z);ctx.stroke();
      ctx.fillStyle='#8a5741';ctx.beginPath();ctx.moveTo(p.x+3*z,p.y-72*z);ctx.lineTo(p.x+43*z,p.y-65*z);ctx.lineTo(p.x+32*z,p.y-39*z);ctx.lineTo(p.x+3*z,p.y-45*z);ctx.closePath();ctx.fill();
    } else if (o.type === 'shortcut') {
      shadow(o.x,o.y,34,18,.28);
      ctx.strokeStyle=o.active?'rgba(191,213,137,.9)':'rgba(100,104,83,.75)';
      ctx.lineWidth=8*z;ctx.beginPath();ctx.arc(p.x,p.y-18*z,25*z,Math.PI,TAU);ctx.stroke();
      ctx.fillStyle=o.active?'rgba(129,169,89,.2)':'rgba(20,25,19,.28)';ctx.beginPath();ctx.ellipse(p.x,p.y-5*z,30*z,13*z,0,0,TAU);ctx.fill();
      if(o.active){
        ctx.strokeStyle='rgba(189,224,128,.4)';ctx.lineWidth=2*z;ctx.beginPath();ctx.arc(p.x,p.y-17*z,(16+Math.sin(performance.now()/250)*3)*z,0,TAU);ctx.stroke();
      }
      labelAt(p.x,p.y-55*z,o.destination==='town'?'ROOTWAY HOME':'OLD ROOTWAY');
    }
  }

  function drawResource(r) {
    const p = worldToScreen(r.x,r.y); const z = camera.zoom;
    shadow(r.x,r.y,18,10,.18);
    if(r.type==='herb'){
      ctx.strokeStyle='#345632';ctx.lineWidth=4*z;ctx.lineCap='round';
      for(let i=-2;i<=2;i++){
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo(p.x+i*5*z,p.y-12*z,p.x+i*8*z,p.y-(20+Math.abs(i)*2)*z);ctx.stroke();
      }
      circle(p.x-8*z,p.y-16*z,5*z,'#78b45f');circle(p.x+8*z,p.y-20*z,5*z,'#88c56a');
    }else{
      ctx.fillStyle='#6c6252';ctx.beginPath();ctx.moveTo(p.x-18*z,p.y);ctx.lineTo(p.x-12*z,p.y-22*z);ctx.lineTo(p.x+6*z,p.y-29*z);ctx.lineTo(p.x+20*z,p.y-8*z);ctx.lineTo(p.x+14*z,p.y+3*z);ctx.closePath();ctx.fill();
      ctx.fillStyle='#b76f4b';circle(p.x-5*z,p.y-12*z,5*z,'#b76f4b');circle(p.x+8*z,p.y-17*z,4*z,'#d08055');
    }
  }

