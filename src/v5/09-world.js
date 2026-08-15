(() => {
  'use strict';

  // Build 5.5: settlement atmosphere + first real exploration branch.
  // Builds 2–4 remain untouched underneath this additive world layer.
  const groveZone = { name: 'MOONCAP GROVE', tint: '#314b3a' };
  const settlementNpcs = [];

  if (typeof progress.groveDiscovered !== 'boolean') progress.groveDiscovered = false;
  if (typeof progress.grovekeeperDefeated !== 'boolean') progress.grovekeeperDefeated = false;
  if (typeof progress.groveCacheClaimed !== 'boolean') progress.groveCacheClaimed = false;

  WORLD.minY = -1120;

  addObject('tavern', -765, -285, { label: 'The Hearth & Briar' });
  addObject('cottage', -905, 330, { label: 'Willow Cottage', roof: '#6f5a42' });
  blockers.push({ x: -905, y: 330, r: 56 });
  addObject('cottage', -575, -365, { label: 'Warden House', roof: '#665440' });
  blockers.push({ x: -575, y: -365, r: 52 });
  addObject('garden', -785, 355, { rows: 4 });

  [
    [-900, 75], [-760, -95], [-610, 75], [-500, -110], [-345, 80], [-255, -95]
  ].forEach(([x, y]) => addObject('lamp', x, y));

  [
    [-955, 245, -955, 440], [-840, 440, -955, 440], [-690, 430, -840, 440],
    [-665, -430, -505, -430], [-505, -430, -460, -360],
    [-890, -390, -840, -455]
  ].forEach(([x, y, x2, y2]) => addObject('fence', x, y, { x2, y2 }));

  addObject('groveSign', 155, -115, { label: 'Mooncap Grove' });

  function addTownNpc(name, x, y, color, waypoints, speed = 42) {
    const npc = addObject('npc', x, y, {
      name, color, waypoints, waypoint: 0, speed,
      facingX: 1, facingY: 0,
    });
    settlementNpcs.push(npc);
    return npc;
  }

  addTownNpc('Tessa', -850, 25, '#6b7c58', [[-850,25],[-700,35],[-590,-35],[-700,-110]], 38);
  addTownNpc('Orin', -520, 85, '#6a617c', [[-520,85],[-385,45],[-300,-80],[-455,-65]], 44);
  addTownNpc('Maeve', -815, 255, '#8b6753', [[-815,255],[-720,185],[-640,255],[-735,330]], 34);
  addTownNpc('Perrin', -340, 135, '#526c70', [[-340,135],[-255,70],[-320,-25],[-435,40]], 46);

  [[235,-310],[350,-505],[500,-660],[685,-760]].forEach(([x,y]) => addResource('mooncap', x, y));
  [[285,-385],[445,-570],[610,-710]].forEach(([x,y]) => addResource('herb', x, y));

  [
    [130,-500,1.05],[230,-660,.85],[360,-770,1.1],[510,-930,.95],[730,-980,1.15],
    [720,-520,.9],[820,-690,1.05],[85,-850,.95]
  ].forEach(([x,y,s]) => addObject('tree', x, y, { s: s * 1.2 }));
  [
    [260,-740,.9],[390,-850,.85],[690,-900,1.05],[760,-760,.8]
  ].forEach(([x,y,s]) => addObject('bush', x, y, { s }));

  addObject('ruin', 565, -855, { piece: 0 });
  addObject('ruin', 665, -905, { piece: 1 });
  addObject('ruin', 735, -830, { piece: 2 });
  addObject('groveCache', 650, -850, { label: 'Old Warden Cache' });

  blockers.push({ x: 560, y: -855, r: 30 });
  blockers.push({ x: 730, y: -830, r: 28 });

  addEnemy('wolf', 310, -470, { homeX: 310, homeY: -470 });
  addEnemy('wolf', 500, -650, { homeX: 500, homeY: -650 });
  const groveKeeper = addEnemy('grovekeeper', 650, -790, {
    name: 'Grovekeeper', hp: 150, maxHp: 150, speed: 104, damage: 15,
    aggro: 390, attackRange: 56, scale: 1.25, radius: 31, color: '#4f6a48',
    homeX: 650, homeY: -790,
  });
  if (progress.grovekeeperDefeated) {
    groveKeeper.dead = true;
    groveKeeper.hp = 0;
    groveKeeper.respawn = 99999;
  }

  const build4ZoneFor = zoneFor;
  zoneFor = function build5ZoneFor(x, y = player.y) {
    if (y <= -430 && x >= -80 && x <= 900) return groveZone;
    return build4ZoneFor(x);
  };

  const build4ObjectiveText = objectiveText;
  objectiveText = function build5ObjectiveText() {
    if (!progress.patrolComplete) return build4ObjectiveText();
    if (!progress.groveDiscovered) return 'A weathered sign on Meadow Road points north toward Mooncap Grove.';
    if (!progress.grovekeeperDefeated) return 'Explore Mooncap Grove and investigate the old Warden ruins.';
    if (!progress.groveCacheClaimed) return 'The Grovekeeper is down. Search the old ruins for a Warden cache.';
    return 'Mooncap Grove explored. Briar Glen has room to breathe again.';
  };

  const build4ObjectiveProgress = objectiveProgress;
  objectiveProgress = function build5ObjectiveProgress() {
    if (!progress.patrolComplete) return build4ObjectiveProgress();
    if (!progress.groveDiscovered) return 'NEW ROUTE • NORTH FORK';
    if (!progress.grovekeeperDefeated) return 'MOONCAP GROVE • RUINS AHEAD';
    if (!progress.groveCacheClaimed) return 'OLD WARDEN CACHE • SEARCH RUINS';
    return 'GROVE EXPLORED • CACHE RECOVERED';
  };

  nearestInteractable = function build5NearestInteractable() {
    const candidates = [];
    for (const r of resources) if (r.active) candidates.push({ kind: 'resource', obj: r, d: dist(player, r) });
    for (const o of worldObjects) {
      if (['forge','board','shortcut','well','alchemy','merchant','groveSign','groveCache','tavern'].includes(o.type)) {
        candidates.push({ kind: o.type, obj: o, d: dist(player, o) });
      }
    }
    candidates.sort((a, b) => a.d - b.d);
    const c = candidates[0];
    if (!c) return null;
    const range = c.kind === 'shortcut' ? 105 : ['alchemy','merchant','groveCache','tavern'].includes(c.kind) ? 100 : 90;
    return c.d <= range ? c : null;
  };

  const build4Interact = interact;
  interact = function build5Interact() {
    const near = nearestInteractable();
    if (near?.kind === 'groveSign') {
      if (!progress.groveDiscovered) {
        progress.groveDiscovered = true;
        toast('New route discovered — Mooncap Grove');
        addFloater(near.obj.x, near.obj.y - 20, 'MOONCAP GROVE', '#b9d8b0');
        saveGame();
      } else {
        toast('Mooncap Grove • north trail');
      }
      return;
    }
    if (near?.kind === 'tavern') {
      toast('The Hearth & Briar is warm, noisy and full of road gossip');
      return;
    }
    if (near?.kind === 'groveCache') {
      if (!progress.grovekeeperDefeated) {
        toast('The old cache is sealed — something large prowls the ruins');
        return;
      }
      if (progress.groveCacheClaimed) {
        toast('The Old Warden Cache is empty');
        return;
      }
      progress.groveCacheClaimed = true;
      player.coins += 90;
      player.inventory.tonic += 1;
      player.inventory.hide += 1;
      spawnParticles(near.obj.x, near.obj.y, '#d9c47f', 24, 1);
      addFloater(near.obj.x, near.obj.y - 24, '+90 COINS • TONIC • HIDE', '#f3db98');
      toast('Old Warden Cache recovered');
      saveGame();
      return;
    }
    return build4Interact();
  };

  const build4KillEnemy = killEnemy;
  killEnemy = function build5KillEnemy(e) {
    if (!e || e.dead) return;
    const keeper = e.type === 'grovekeeper';
    build4KillEnemy(e);
    if (keeper && e.dead && !progress.grovekeeperDefeated) {
      progress.grovekeeperDefeated = true;
      e.respawn = 99999;
      player.coins += 35;
      addFloater(e.x, e.y - 42, 'GROVEKEEPER DEFEATED • +35 c', '#d9d39a');
      toast('The Grovekeeper falls — search the old ruins');
      saveGame();
    }
  };

  function updateNpc(npc, dt) {
    const target = npc.waypoints[npc.waypoint];
    if (!target) return;
    const dx = target[0] - npc.x, dy = target[1] - npc.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) {
      npc.waypoint = (npc.waypoint + 1) % npc.waypoints.length;
      return;
    }
    const n = norm(dx, dy);
    npc.facingX = n.x; npc.facingY = n.y;
    npc.x += n.x * npc.speed * dt;
    npc.y += n.y * npc.speed * dt;
  }

  const build4Update = update;
  update = function build5Update(dt) {
    build4Update(dt);
    const modalOpen = (ui.inventoryPanel && !ui.inventoryPanel.hidden) || (ui.tradePanel && !ui.tradePanel.hidden);
    if (modalOpen) return;
    for (const npc of settlementNpcs) updateNpc(npc, dt);
    if (!progress.groveDiscovered && zoneFor(player.x).name === groveZone.name) {
      progress.groveDiscovered = true;
      toast('Mooncap Grove discovered');
      saveGame();
    }
  };

  const build4UpdateUI = updateUI;
  updateUI = function build5UpdateUI() {
    build4UpdateUI();
    if (ui.questTitle && progress.patrolComplete) ui.questTitle.textContent = 'Whispers in the Grove';
    const near = nearestInteractable();
    if (near?.kind === 'groveSign') ui.context.textContent = 'USE • Read Mooncap Grove sign';
    else if (near?.kind === 'groveCache') {
      ui.context.textContent = progress.groveCacheClaimed ? 'USE • Empty Warden Cache' : progress.grovekeeperDefeated ? 'USE • Open Warden Cache' : 'Warden Cache • Sealed';
    } else if (near?.kind === 'tavern') ui.context.textContent = 'USE • The Hearth & Briar';
  };

  function pathStroke(points, width, color, edge = null) {
    const screen = points.map(([x,y]) => worldToScreen(x,y));
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (edge) {
      ctx.strokeStyle = edge;
      ctx.lineWidth = (width + 7) * camera.zoom;
      ctx.beginPath(); screen.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y)); ctx.stroke();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width * camera.zoom;
    ctx.beginPath(); screen.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y)); ctx.stroke();
    ctx.restore();
  }

  const build4DrawGround = drawGround;
  drawGround = function build5DrawGround(zone) {
    build4DrawGround(zone);
    const grove = [[-80,-420],[880,-420],[880,-1100],[-80,-1100]].map(([x,y]) => worldToScreen(x,y));
    ctx.save();
    ctx.fillStyle = 'rgba(31, 67, 48, .62)';
    ctx.beginPath(); grove.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y)); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  const build4DrawRoute = drawRoute;
  drawRoute = function build5DrawRoute() {
    build4DrawRoute();
    pathStroke([[-930,35],[-760,15],[-610,20],[-445,20],[-270,15]], 30, 'rgba(169,147,104,.38)');
    pathStroke([[-760,15],[-770,-155],[-765,-270]], 23, 'rgba(161,137,95,.34)');
    pathStroke([[-610,20],[-625,150],[-650,245]], 22, 'rgba(161,137,95,.34)');
    pathStroke([[-445,20],[-425,140],[-470,245]], 22, 'rgba(161,137,95,.34)');
    pathStroke([[-445,20],[-390,-90],[-335,-190]], 22, 'rgba(161,137,95,.34)');
    pathStroke([[125,-25],[175,-135],[245,-275],[330,-430],[420,-570],[520,-700],[620,-815]], 31, 'rgba(126,112,78,.43)', 'rgba(45,62,44,.23)');
  };

  const build4DrawObject = drawObject;
  drawObject = function build5DrawObject(o) {
    if (!['tavern','cottage','lamp','fence','garden','groveSign','ruin','groveCache','npc'].includes(o.type)) return build4DrawObject(o);
    const p = worldToScreen(o.x, o.y), z = camera.zoom;
    if (p.x < -220 || p.x > viewport.w + 220 || p.y < -230 || p.y > viewport.h + 210) return;

    if (o.type === 'tavern') {
      shadow(o.x,o.y,66,34,.32);
      ctx.fillStyle='#5c4937'; ctx.fillRect(p.x-54*z,p.y-55*z,108*z,55*z);
      ctx.fillStyle='#332f29'; ctx.beginPath(); ctx.moveTo(p.x-66*z,p.y-54*z); ctx.lineTo(p.x,p.y-92*z); ctx.lineTo(p.x+67*z,p.y-54*z); ctx.closePath(); ctx.fill();
      circle(p.x+32*z,p.y-34*z,5*z,'#d59b51');
      ctx.fillStyle='#7d5238'; ctx.fillRect(p.x-15*z,p.y-34*z,25*z,34*z);
      ctx.strokeStyle='#b98b54'; ctx.lineWidth=2*z; ctx.beginPath(); ctx.moveTo(p.x+55*z,p.y-55*z); ctx.lineTo(p.x+72*z,p.y-48*z); ctx.stroke();
      labelAt(p.x,p.y-104*z,'THE HEARTH & BRIAR');
      return;
    }

    if (o.type === 'cottage') {
      shadow(o.x,o.y,43,23,.27);
      ctx.fillStyle='#66513d'; ctx.fillRect(p.x-34*z,p.y-39*z,68*z,39*z);
      ctx.fillStyle=o.roof || '#705942'; ctx.beginPath(); ctx.moveTo(p.x-43*z,p.y-38*z); ctx.lineTo(p.x,p.y-66*z); ctx.lineTo(p.x+43*z,p.y-38*z); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#c9a66a'; ctx.fillRect(p.x+12*z,p.y-27*z,9*z,10*z);
      ctx.fillStyle='#5a3d2d'; ctx.fillRect(p.x-8*z,p.y-25*z,17*z,25*z);
      return;
    }

    if (o.type === 'lamp') {
      ctx.save();
      ctx.strokeStyle='#3f392f'; ctx.lineWidth=4*z; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x,p.y-46*z); ctx.stroke();
      const glow = 14 + Math.sin(performance.now()/210 + o.x) * 2;
      ctx.globalAlpha=.14; circle(p.x,p.y-49*z,glow*z,'#ffd88a');
      ctx.globalAlpha=1; circle(p.x,p.y-49*z,4.5*z,'#e5b661');
      ctx.restore();
      return;
    }

    if (o.type === 'fence') {
      const b = worldToScreen(o.x2,o.y2);
      ctx.save(); ctx.strokeStyle='#654e38'; ctx.lineWidth=5*z; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(p.x,p.y-9*z); ctx.lineTo(b.x,b.y-9*z); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x,p.y+1*z); ctx.lineTo(b.x,b.y+1*z); ctx.stroke();
      for (let t=0;t<=1;t+=.25) {
        const x=p.x+(b.x-p.x)*t, y=p.y+(b.y-p.y)*t;
        ctx.beginPath();ctx.moveTo(x,y+5*z);ctx.lineTo(x,y-18*z);ctx.stroke();
      }
      ctx.restore(); return;
    }

    if (o.type === 'garden') {
      shadow(o.x,o.y,42,23,.12);
      ctx.save(); ctx.strokeStyle='rgba(83,58,37,.72)'; ctx.lineWidth=4*z;
      for(let i=-2;i<=2;i++){
        const off=i*11*z; ctx.beginPath();ctx.moveTo(p.x-34*z,p.y+off*.45);ctx.lineTo(p.x+35*z,p.y+off*.45);ctx.stroke();
        for(let j=-2;j<=2;j++) circle(p.x+j*14*z,p.y+off*.45-3*z,2.3*z,i%2?'#6f914d':'#789b55');
      }
      ctx.restore(); return;
    }

    if (o.type === 'groveSign') {
      shadow(o.x,o.y,18,8,.16);
      ctx.strokeStyle='#5a4935';ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-46*z);ctx.stroke();
      ctx.fillStyle='#795d3d';ctx.fillRect(p.x-29*z,p.y-45*z,58*z,17*z);
      ctx.fillStyle='#d7c49a';ctx.font=`800 ${Math.max(7,8*z)}px system-ui`;ctx.textAlign='center';ctx.fillText('MOONCAP GROVE',p.x,p.y-33*z);
      return;
    }

    if (o.type === 'ruin') {
      shadow(o.x,o.y,28,15,.25);
      ctx.fillStyle='#64675a';
      if (o.piece === 0) {
        ctx.fillRect(p.x-9*z,p.y-46*z,18*z,46*z);ctx.fillRect(p.x-16*z,p.y-52*z,32*z,8*z);
      } else if (o.piece === 1) {
        ctx.fillRect(p.x-8*z,p.y-30*z,16*z,30*z);ctx.beginPath();ctx.moveTo(p.x-22*z,p.y);ctx.lineTo(p.x+22*z,p.y);ctx.lineTo(p.x+13*z,p.y-10*z);ctx.closePath();ctx.fill();
      } else {
        ctx.beginPath();ctx.moveTo(p.x-30*z,p.y);ctx.lineTo(p.x-19*z,p.y-32*z);ctx.lineTo(p.x+6*z,p.y-25*z);ctx.lineTo(p.x+25*z,p.y-3*z);ctx.closePath();ctx.fill();
      }
      ctx.strokeStyle='rgba(230,231,211,.1)';ctx.lineWidth=2*z;ctx.stroke();
      return;
    }

    if (o.type === 'groveCache') {
      shadow(o.x,o.y,23,12,.2);
      ctx.fillStyle=progress.groveCacheClaimed?'#51483b':'#745638';
      ctx.fillRect(p.x-22*z,p.y-18*z,44*z,18*z);
      ctx.fillStyle=progress.groveCacheClaimed?'#39362f':'#8d6d47';
      ctx.beginPath();ctx.arc(p.x,p.y-18*z,22*z,Math.PI,TAU);ctx.lineTo(p.x+22*z,p.y-18*z);ctx.closePath();ctx.fill();
      ctx.strokeStyle=progress.grovekeeperDefeated?'#d3b86f':'#8d6a55';ctx.lineWidth=2*z;ctx.strokeRect(p.x-22*z,p.y-18*z,44*z,18*z);
      if (!progress.groveCacheClaimed) labelAt(p.x,p.y-47*z,'OLD WARDEN CACHE');
      return;
    }

    if (o.type === 'npc') {
      shadow(o.x,o.y,15,9,.2);
      ctx.save();ctx.translate(p.x,p.y);
      ctx.fillStyle=o.color;ctx.beginPath();ctx.moveTo(-10*z,0);ctx.lineTo(-8*z,-29*z);ctx.lineTo(0,-37*z);ctx.lineTo(9*z,-28*z);ctx.lineTo(11*z,0);ctx.closePath();ctx.fill();
      circle(0,-39*z,8*z,'#c7a37e');
      ctx.fillStyle='#3a332c';ctx.beginPath();ctx.arc(0,-41*z,8*z,Math.PI,TAU);ctx.fill();
      ctx.restore();
      if (dist(player,o) < 115) labelAt(p.x,p.y-56*z,o.name.toUpperCase());
    }
  };

  const build4DrawEnemy = drawEnemy;
  drawEnemy = function build5DrawEnemy(e) {
    build4DrawEnemy(e);
    if (e.type !== 'grovekeeper' || e.dead) return;
    const p = worldToScreen(e.x,e.y), z=camera.zoom;
    ctx.save();ctx.strokeStyle='rgba(173,211,139,.62)';ctx.lineWidth=2*z;ctx.setLineDash([5*z,5*z]);
    ctx.beginPath();ctx.ellipse(p.x,p.y-18*z,39*z,22*z,0,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore();
    labelAt(p.x,p.y-76*z,'GROVEKEEPER');
  };

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.interact = () => interact();
    window.__BRIAR_GLENDebug.defeatGrovekeeper = () => {
      if (!groveKeeper.dead) {
        groveKeeper.hp = 0;
        killEnemy(groveKeeper);
      }
    };
    window.__BRIAR_GLENDebug.getWorldState = () => ({
      zone: zoneFor(player.x).name,
      bounds: { minY: WORLD.minY, maxY: WORLD.maxY },
      grove: {
        discovered: progress.groveDiscovered,
        keeperDefeated: progress.grovekeeperDefeated,
        cacheClaimed: progress.groveCacheClaimed,
        keeperDead: groveKeeper.dead,
      },
      settlement: {
        npcCount: settlementNpcs.length,
        npcs: settlementNpcs.map(n => ({ name:n.name, x:n.x, y:n.y })),
        tavernCount: worldObjects.filter(o => o.type === 'tavern').length,
        cottageCount: worldObjects.filter(o => o.type === 'cottage').length,
        lampCount: worldObjects.filter(o => o.type === 'lamp').length,
      },
    });
  }

  updateUI();
})();