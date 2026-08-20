(() => {
  'use strict';
  const params=new URLSearchParams(location.search),debug=window.__BRIAR_GLENDebug,runtime=window.__BRIAR_GLEN_RUNTIME;
  if(!debug||!runtime)return;
  const source47=debug.getSourceArt47State?.();
  const requested=params.get('livingCast48')!=='0'&&params.get('sourceArt47')!=='0'&&!source47?.historicalProof&&!params.get('artScope')&&params.get('canvasArt')!=='1'&&params.get('generatedArt')!=='0';
  const state={version:'build49-reference-scale-cast-v1',requested,ready:!requested,failed:false,failure:'',frameDraws:0,totalDraws:0,draws:{},baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}};
  const atlas=new Image();atlas.decoding='async';
  const CELL=256;

  // Approved-reference scale: avatar stays readable on phone, but is no longer comparable in
  // height to trees, cottages or service buildings. Typical beasts sit below avatar height;
  // named/boss threats rise above it.
  const frames={
    warden:[0,0,52,68,.94],alden:[1,0,50,66,.94],rowan:[2,0,49,65,.94],mira:[3,0,49,66,.94],
    briar_wolf:[0,1,62,47,.82],hollow_boar:[1,1,70,51,.84],emberback:[2,1,104,88,.85],grovekeeper:[3,1,62,82,.92],
    mireling:[0,2,48,40,.82],bog_stalker:[1,2,64,50,.83],drowned_warden:[2,2,66,88,.93],ridgehorn:[3,2,72,54,.84],
    quarry_wisp:[0,3,52,52,.76],quarry_sentinel:[1,3,70,92,.93],villager:[2,3,48,64,.94]
  };
  const enemyScale={wolf:.98,boar:1,boss:1,grovekeeper:1,mireling:.96,bogstalker:.98,fenwarden:1,ridgehorn:.98,quarrywisp:.98,quarrysentinel:1};
  const scaleContract=Object.freeze({
    basis:'approved-reference-avatar-1x',
    wardenHeight:68,npcHeight:66,wolfHeight:46,boarHeight:51,emberbackHeight:88,grovekeeperHeight:82,
    mirelingHeight:38,bogStalkerHeight:49,drownedWardenHeight:88,ridgehornHeight:53,quarryWispHeight:51,quarrySentinelHeight:92
  });

  atlas.onload=()=>{state.ready=true;};atlas.onerror=()=>{state.failed=true;state.failure='assets/v48/living-cast.svg';};atlas.src='assets/v48/living-cast.svg?v=49scale1';
  function enabled(){return Boolean(requested&&state.ready&&!state.failed&&debug.isSourceArt47Enabled?.());}
  function note(name){state.frameDraws++;state.totalDraws++;state.draws[name]=(state.draws[name]||0)+1;}
  function visible(p,w,h){return p.x+w/2>-120&&p.x-w/2<viewport.w+120&&p.y>-140&&p.y-h<viewport.h+100;}
  function drawSprite(name,o,{scale=1,alpha=1,flip=false,dy=0}={}){const f=frames[name];if(!f||!enabled())return false;const[col,row,nw,nh,anchor]=f,p=worldToScreen(o.x,o.y),z=camera.zoom*scale,w=nw*z,h=nh*z,y=p.y+dy*camera.zoom;if(!visible({x:p.x,y},w,h))return true;ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(atlas,col*CELL,row*CELL,CELL,CELL,-w/2,-h*anchor,w,h);ctx.restore();note(name);return true;}
  function npcName(o){const n=String(o.name||o.label||'').toLowerCase();if(n.includes('perrin')||n.includes('alden')||n.includes('smith'))return'alden';if(n.includes('maeve')||n.includes('rowan')||n.includes('trader')||n.includes('merchant'))return'rowan';if(n.includes('orin')||n.includes('mira')||n.includes('alchem'))return'mira';return'villager';}
  function enemyName(e){return({wolf:'briar_wolf',boar:'hollow_boar',boss:'emberback',grovekeeper:'grovekeeper',mireling:'mireling',bogstalker:'bog_stalker',fenwarden:'drowned_warden',ridgehorn:'ridgehorn',quarrywisp:'quarry_wisp',quarrysentinel:'quarry_sentinel'})[e.type]||null;}
  function enemyStatus(e){const bossLike=['boss','fenwarden','quarrysentinel'].includes(e.type);if(e.hp>=e.maxHp&&!bossLike)return;const p=worldToScreen(e.x,e.y),w=(bossLike?104:54)*camera.zoom,y=p.y-(bossLike?91:56)*camera.zoom;ctx.fillStyle='rgba(0,0,0,.45)';roundRect(p.x-w/2,y,w,7*camera.zoom,4*camera.zoom);ctx.fill();ctx.fillStyle=e.type==='boss'?'#b9543d':e.type==='fenwarden'?'#6c9d90':e.type==='quarrysentinel'?'#9b714b':'#b86a50';roundRect(p.x-w/2,y,w*(e.hp/e.maxHp),7*camera.zoom,4*camera.zoom);ctx.fill();const label=e.type==='boss'?'EMBERBACK':e.type==='fenwarden'?'DROWNED WARDEN':e.type==='quarrysentinel'?'QUARRY SENTINEL':'';if(label)labelAt(p.x,y-9*camera.zoom,label);}

  const priorObject=drawObject;
  drawObject=function build49ReferenceScaleNpc(o){if(!enabled()||o.type!=='npc')return priorObject(o);shadow(o.x,o.y,17,9,.21);if(drawSprite(npcName(o),o,{scale:1,flip:Number(o.facingX||1)<0,dy:2}))return;return priorObject(o);};

  const priorEnemy=drawEnemy;
  drawEnemy=function build49ReferenceScaleEnemy(e){
    if(!enabled()||e.dead)return priorEnemy(e);const name=enemyName(e);if(!name)return priorEnemy(e);const p=worldToScreen(e.x,e.y),z=camera.zoom*(e.scale||1);
    if(['ridgehorn','quarrywisp','quarrysentinel'].includes(e.type)&&typeof drawStoneTelegraph==='function')drawStoneTelegraph(e,p,z);else if(typeof drawEnemyTelegraph==='function')drawEnemyTelegraph(e,p);
    shadow(e.x,e.y,e.type==='boss'?31:23,e.type==='boss'?17:13,.27);
    if(e.type==='boss'&&!player.reinforced){ctx.save();ctx.strokeStyle='rgba(232,177,103,.48)';ctx.lineWidth=3*camera.zoom;ctx.setLineDash([7*camera.zoom,6*camera.zoom]);ctx.beginPath();ctx.ellipse(p.x,p.y-21*camera.zoom,48*camera.zoom,28*camera.zoom,0,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore();}
    const drawn=drawSprite(name,e,{scale:enemyScale[e.type]||1,flip:Number(e.facingX||1)<0,alpha:e.hurt>0?.72:1,dy:3});if(!drawn)return priorEnemy(e);enemyStatus(e);
  };

  const priorPlayer=drawPlayer;
  drawPlayer=function build49ReferenceScalePlayer(){
    if(!enabled())return priorPlayer();const p=worldToScreen(player.x,player.y),z=camera.zoom,blink=player.invuln>0&&Math.floor(player.invuln*18)%2===0;
    shadow(player.x,player.y,18,10,.29);
    if(!drawSprite('warden',player,{scale:1,flip:player.facingX<0,alpha:blink?.55:1,dy:2}))return priorPlayer();
    const a=Math.atan2(player.facingY,player.facingX);ctx.save();ctx.globalAlpha=blink?.55:1;ctx.translate(p.x+player.facingX*8*z,p.y-23*z+player.facingY*3*z);ctx.rotate(a*.55+.12);
    if(player.weaponType==='sword'){ctx.strokeStyle='#4e3b2e';ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(-4*z,4*z);ctx.lineTo(3*z,-2*z);ctx.stroke();ctx.strokeStyle=player.reinforced?'#e5ddc5':'#b9b5a7';ctx.lineWidth=(player.reinforced?4.5:3.5)*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(2*z,-2*z);ctx.lineTo(25*z,-17*z);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=1*z;ctx.beginPath();ctx.moveTo(7*z,-6*z);ctx.lineTo(23*z,-16*z);ctx.stroke();}
    else if(player.weaponType==='bow'){ctx.strokeStyle='#8c693f';ctx.lineWidth=2.5*z;ctx.beginPath();ctx.arc(8*z,-3*z,16*z,-1.15,1.1);ctx.stroke();ctx.strokeStyle='#e0d3b6';ctx.lineWidth=1*z;ctx.beginPath();ctx.moveTo(15*z,-17*z);ctx.lineTo(1*z,-3*z);ctx.lineTo(15*z,11*z);ctx.stroke();if(player.attackAnim>0){ctx.strokeStyle='#ead39d';ctx.lineWidth=1.7*z;ctx.beginPath();ctx.moveTo(1*z,-3*z);ctx.lineTo(25*z,-3*z);ctx.stroke();}}
    else{ctx.strokeStyle='#6f563e';ctx.lineWidth=4*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-3*z,4*z);ctx.lineTo(22*z,-18*z);ctx.stroke();const glow=5+Math.sin(performance.now()/120)*1.2;circle(24*z,-20*z,glow*z,'rgba(132,211,173,.72)');circle(24*z,-20*z,2.2*z,'#d8f4e4');}
    ctx.restore();
  };

  runtime.registerHook('beforeDraw','build48-living-cast-frame-reset',()=>{state.frameDraws=0;},2070);
  debug.isLivingCast48Enabled=enabled;
  debug.getLivingCast48State=()=>({version:state.version,requested:state.requested,enabled:enabled(),ready:state.ready,failed:state.failed,failure:state.failure,frameDraws:state.frameDraws,totalDraws:state.totalDraws,draws:{...state.draws},scaleContract:{...scaleContract},baseline:{...state.baseline},current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},uniqueEnemyAssets:Object.keys(enemyScale).length,source:'assets/v48/living-cast.svg'});
})();