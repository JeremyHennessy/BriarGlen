(() => {
  'use strict';

  // Build 11: Mosswater Fen / Old Warden Crossing.
  // Additive world layer; Builds 2–10 remain intact underneath.
  const fenZone = { name: 'MOSSWATER FEN', tint: '#334f47' };
  const fenState = {
    crossingX: 1060,
    entryY: -1180,
    deepY: -1770,
    bossX: 1450,
    bossY: -1760,
  };

  if (typeof progress.fenDiscovered !== 'boolean') progress.fenDiscovered = false;
  if (typeof progress.fenCrossingOpened !== 'boolean') progress.fenCrossingOpened = false;
  if (typeof progress.fenWardenDefeated !== 'boolean') progress.fenWardenDefeated = false;
  if (typeof progress.fenCacheClaimed !== 'boolean') progress.fenCacheClaimed = false;
  if (!progress.mapDiscoveries) progress.mapDiscoveries = {};
  if (typeof progress.mapDiscoveries.fen !== 'boolean') progress.mapDiscoveries.fen = !!progress.fenDiscovered;
  if (!Number.isFinite(player.inventory.mossglass)) player.inventory.mossglass = 0;

  WORLD.maxX = Math.max(WORLD.maxX, 2360);
  WORLD.minY = Math.min(WORLD.minY, -2100);

  addObject('fenSign', 900, -1035, { label: 'Old Warden Crossing' });
  addObject('fenGate', 1050, -1200, { label: 'Old Warden Crossing' });
  addObject('fenCache', 1515, -1830, { label: 'Sunken Warden Reliquary' });
  addObject('fenRuin', 1360, -1660, { piece: 0 });
  addObject('fenRuin', 1530, -1695, { piece: 1 });
  addObject('fenRuin', 1615, -1815, { piece: 2 });

  [[1010,-1330],[1190,-1435],[1350,-1515],[1580,-1550],[1780,-1690],[1910,-1860]].forEach(([x,y]) => addObject('fenTree', x, y));
  [[1110,-1500],[1290,-1650],[1690,-1770],[1840,-1510],[1980,-1930]].forEach(([x,y]) => addObject('fenPool', x, y));
  [[1210,-1370],[1430,-1450],[1650,-1610],[1870,-1780]].forEach(([x,y]) => addResource('mossglass', x, y));

  const mirelingA = addEnemy('mireling', 1240, -1480, { name:'Mireling', hp:78, maxHp:78, speed:108, damage:12, aggro:320, attackRange:50, radius:25, color:'#58766b', homeX:1240, homeY:-1480 });
  const mirelingB = addEnemy('mireling', 1710, -1590, { name:'Mireling', hp:78, maxHp:78, speed:108, damage:12, aggro:320, attackRange:50, radius:25, color:'#58766b', homeX:1710, homeY:-1590 });
  const bogStalker = addEnemy('bogstalker', 1830, -1840, { name:'Bog Stalker', hp:118, maxHp:118, speed:92, damage:17, aggro:370, attackRange:60, radius:30, color:'#526158', homeX:1830, homeY:-1840 });
  const fenWarden = addEnemy('fenwarden', fenState.bossX, fenState.bossY, { name:'Drowned Warden', hp:260, maxHp:260, speed:96, damage:20, aggro:480, attackRange:67, radius:38, scale:1.45, color:'#476b67', homeX:fenState.bossX, homeY:fenState.bossY });
  if (progress.fenWardenDefeated) { fenWarden.dead = true; fenWarden.hp = 0; fenWarden.respawn = 99999; }

  const build10ZoneFor = zoneFor;
  zoneFor = function build11ZoneFor(x, y = player.y) {
    if (y <= -1180 && x >= 900 && x <= 2150) return fenZone;
    return build10ZoneFor(x, y);
  };

  const build10NearestInteractable = nearestInteractable;
  nearestInteractable = function build11NearestInteractable() {
    const base = build10NearestInteractable();
    const extras = worldObjects
      .filter(o => ['fenSign','fenGate','fenCache'].includes(o.type))
      .map(o => ({ kind:o.type, obj:o, d:dist(player,o) }))
      .filter(c => c.d <= (c.kind === 'fenGate' ? 115 : 100));
    for (const r of resources) if (r.active && r.type === 'mossglass') extras.push({ kind:'resource', obj:r, d:dist(player,r) });
    extras.sort((a,b) => a.d-b.d);
    if (extras[0] && (!base || extras[0].d < base.d)) return extras[0];
    return base;
  };

  function fenReady() {
    return !!(progress.reinforcedPickaxe && (progress.temperedSword || progress.briarstringBow || progress.moonrootStaff));
  }

  const build10Interact = interact;
  interact = function build11Interact() {
    const near = nearestInteractable();
    if (near?.kind === 'fenSign') {
      toast(fenReady() ? 'Old Warden Crossing • masterwork expedition route' : 'Old Warden Crossing • Reinforced Pickaxe + masterwork weapon recommended');
      return;
    }
    if (near?.kind === 'fenGate') {
      if (!fenReady()) { toast('The flooded crossing needs a Reinforced Pickaxe and a masterwork weapon'); return; }
      if (!progress.fenCrossingOpened) {
        progress.fenCrossingOpened = true;
        progress.fenDiscovered = true;
        progress.mapDiscoveries.fen = true;
        spawnParticles(near.obj.x, near.obj.y, '#8aa39a', 22, .9);
        toast('Old Warden Crossing opened — Mosswater Fen charted');
        saveGame();
      } else toast('Old Warden Crossing is open');
      return;
    }
    if (near?.kind === 'resource' && near.obj.type === 'mossglass') {
      if (!progress.fenCrossingOpened) { toast('The fen route is still sealed'); return; }
      near.obj.active = false; near.obj.cooldown = 42;
      player.inventory.mossglass += 1;
      spawnParticles(near.obj.x, near.obj.y, '#8bb4a7', 14, .7);
      addFloater(near.obj.x, near.obj.y - 14, 'MOSSG LASS +1'.replace(' ', ''), '#b9ddd2');
      toast('Mossglass recovered'); saveGame(); return;
    }
    if (near?.kind === 'fenCache') {
      if (!progress.fenWardenDefeated) { toast('The reliquary is bound to the Drowned Warden'); return; }
      if (progress.fenCacheClaimed) { toast('The Sunken Warden Reliquary is empty'); return; }
      progress.fenCacheClaimed = true;
      player.coins += 160;
      player.inventory.oil = (player.inventory.oil || 0) + 2;
      player.inventory.mossglass += 2;
      spawnParticles(near.obj.x, near.obj.y, '#b9d5c8', 28, 1.1);
      addFloater(near.obj.x, near.obj.y - 28, '+160 c • 2 OIL • 2 MOSSGLASS', '#d9eadf');
      toast('Sunken Warden Reliquary recovered'); saveGame(); return;
    }
    return build10Interact();
  };

  const build10KillEnemy = killEnemy;
  killEnemy = function build11KillEnemy(e) {
    if (!e || e.dead) return;
    const boss = e.type === 'fenwarden';
    build10KillEnemy(e);
    if (boss && e.dead && !progress.fenWardenDefeated) {
      progress.fenWardenDefeated = true;
      e.respawn = 99999;
      player.coins += 70;
      addFloater(e.x, e.y - 45, 'DROWNED WARDEN • +70 c', '#b9d5c8');
      toast('The Drowned Warden falls — search the sunken reliquary');
      saveGame();
    }
  };

  const build10ObjectiveText = objectiveText;
  objectiveText = function build11ObjectiveText() {
    if (!(progress.temperedSword && progress.briarstringBow && progress.moonrootStaff)) return build10ObjectiveText();
    if (!progress.fenCrossingOpened) return 'Alden marks an old expedition route beyond Mooncap Grove: Old Warden Crossing.';
    if (!progress.fenWardenDefeated) return 'Explore Mosswater Fen and find what guards the drowned Warden ruins.';
    if (!progress.fenCacheClaimed) return 'The Drowned Warden is defeated. Recover the Sunken Warden Reliquary.';
    return 'Mosswater Fen secured. The old Warden route is open again.';
  };

  const build10ObjectiveProgress = objectiveProgress;
  objectiveProgress = function build11ObjectiveProgress() {
    if (!(progress.temperedSword && progress.briarstringBow && progress.moonrootStaff)) return build10ObjectiveProgress();
    if (!progress.fenCrossingOpened) return 'OLD WARDEN CROSSING • NORTH OF MOONCAP GROVE';
    if (!progress.fenWardenDefeated) return `${player.inventory.mossglass || 0} MOSSGLASS • DROWNED RUINS AHEAD`;
    if (!progress.fenCacheClaimed) return 'SUNKEN RELIQUARY • SEARCH THE RUINS';
    return `FEN SECURED • ${player.inventory.mossglass || 0} MOSSGLASS`;
  };

  const build10Update = update;
  update = function build11Update(dt) {
    if (!progress.fenCrossingOpened && player.y < -1205 && player.x >= 900 && player.x <= 1160) {
      player.y = -1165;
    }
    build10Update(dt);
    if (progress.fenCrossingOpened && !progress.fenDiscovered && zoneFor(player.x, player.y).name === fenZone.name) {
      progress.fenDiscovered = true; progress.mapDiscoveries.fen = true; toast('Mosswater Fen discovered'); saveGame();
    }
  };

  const build10UpdateUI = updateUI;
  updateUI = function build11UpdateUI() {
    build10UpdateUI();
    if (ui.questTitle && progress.temperedSword && progress.briarstringBow && progress.moonrootStaff) ui.questTitle.textContent = 'Old Warden Crossing';
    const near = nearestInteractable();
    if (near?.kind === 'fenSign') ui.context.textContent = 'USE • Read Old Warden Crossing marker';
    else if (near?.kind === 'fenGate') ui.context.textContent = progress.fenCrossingOpened ? 'USE • Old Warden Crossing open' : fenReady() ? 'USE • Open Old Warden Crossing' : 'Crossing • Masterwork gear required';
    else if (near?.kind === 'fenCache') ui.context.textContent = progress.fenCacheClaimed ? 'USE • Empty reliquary' : progress.fenWardenDefeated ? 'USE • Recover reliquary' : 'Sunken Reliquary • Bound';
    else if (near?.kind === 'resource' && near.obj.type === 'mossglass') ui.context.textContent = 'USE • Recover Mossglass';
  };

  const build10DrawGround = drawGround;
  drawGround = function build11DrawGround(zone) {
    build10DrawGround(zone);
    const pts = [[860,-1120],[2180,-1120],[2180,-2070],[860,-2070]].map(([x,y])=>worldToScreen(x,y));
    ctx.save(); ctx.fillStyle='rgba(34,76,68,.68)'; ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.closePath(); ctx.fill(); ctx.restore();
  };

  const build10DrawRoute = drawRoute;
  drawRoute = function build11DrawRoute() {
    build10DrawRoute();
    const points=[[650,-850],[780,-1010],[930,-1130],[1060,-1250],[1210,-1400],[1390,-1560],[1530,-1730],[1780,-1840],[2010,-1940]];
    const s=points.map(([x,y])=>worldToScreen(x,y));
    ctx.save(); ctx.lineCap='round'; ctx.strokeStyle='rgba(145,130,94,.34)'; ctx.lineWidth=29*camera.zoom; ctx.beginPath(); s.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.stroke(); ctx.strokeStyle='rgba(71,72,54,.5)'; ctx.lineWidth=4*camera.zoom; ctx.setLineDash([10*camera.zoom,12*camera.zoom]); ctx.stroke(); ctx.restore();
  };

  const build10DrawObject = drawObject;
  drawObject = function build11DrawObject(o) {
    if (!['fenSign','fenGate','fenCache','fenRuin','fenTree','fenPool'].includes(o.type)) return build10DrawObject(o);
    const p=worldToScreen(o.x,o.y), z=camera.zoom;
    if (o.type==='fenPool') { ctx.save(); ctx.fillStyle='rgba(70,113,105,.48)'; ctx.beginPath(); ctx.ellipse(p.x,p.y,48*z,20*z,0,0,TAU); ctx.fill(); ctx.strokeStyle='rgba(169,205,191,.25)'; ctx.stroke(); ctx.restore(); return; }
    if (o.type==='fenTree') { shadow(o.x,o.y,30,14,.22); ctx.fillStyle='#3d4d45'; ctx.fillRect(p.x-4*z,p.y-42*z,8*z,42*z); circle(p.x,p.y-53*z,25*z,'#47665a'); circle(p.x-15*z,p.y-44*z,18*z,'#526f61'); return; }
    if (o.type==='fenSign') { ctx.fillStyle='#67543c'; ctx.fillRect(p.x-3*z,p.y-38*z,6*z,38*z); ctx.fillStyle='#8a7450'; ctx.fillRect(p.x-29*z,p.y-48*z,58*z,18*z); labelAt(p.x,p.y-61*z,'OLD WARDEN CROSSING'); return; }
    if (o.type==='fenGate') { ctx.strokeStyle=progress.fenCrossingOpened?'#6f7566':'#8b7652'; ctx.lineWidth=7*z; ctx.beginPath(); ctx.moveTo(p.x-45*z,p.y); ctx.lineTo(p.x-32*z,p.y-52*z); ctx.moveTo(p.x+45*z,p.y); ctx.lineTo(p.x+32*z,p.y-52*z); if(!progress.fenCrossingOpened){ctx.moveTo(p.x-32*z,p.y-34*z);ctx.lineTo(p.x+32*z,p.y-34*z);} ctx.stroke(); return; }
    if (o.type==='fenRuin') { ctx.fillStyle='#69726a'; ctx.fillRect(p.x-24*z,p.y-20*z,48*z,20*z); ctx.fillStyle='#556059'; ctx.fillRect(p.x-18*z,p.y-42*z,13*z,24*z); return; }
    if (o.type==='fenCache') { ctx.fillStyle=progress.fenCacheClaimed?'#4e5a52':'#789080'; ctx.fillRect(p.x-24*z,p.y-18*z,48*z,18*z); ctx.strokeStyle='#b7c9b7'; ctx.strokeRect(p.x-24*z,p.y-18*z,48*z,18*z); labelAt(p.x,p.y-32*z,'SUNKEN RELIQUARY'); }
  };

  const build10DrawResource = drawResource;
  drawResource = function build11DrawResource(r) {
    if (r.type !== 'mossglass')