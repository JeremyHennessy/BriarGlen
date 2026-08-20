(() => {
  'use strict';
  const params=new URLSearchParams(location.search),debug=window.__BRIAR_GLENDebug,runtime=window.__BRIAR_GLEN_RUNTIME;
  if(!debug||!runtime)return;
  const source47=debug.getSourceArt47State?.();
  const requested=params.get('livingCast48')!=='0'&&params.get('sourceArt47')!=='0'&&!source47?.historicalProof&&!params.get('artScope')&&params.get('canvasArt')!=='1'&&params.get('generatedArt')!=='0';
  const state={version:'build48-living-cast-v2',requested,ready:!requested,failed:false,failure:'',frameDraws:0,totalDraws:0,draws:{},baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}};
  const atlas=new Image();atlas.decoding='async';
  const CELL=256;
  const frames={
    warden:[0,0,58,74,.94],alden:[1,0,54,72,.94],rowan:[2,0,53,71,.94],mira:[3,0,53,72,.94],
    briar_wolf:[0,1,74,58,.82],hollow_boar:[1,1,80,61,.84],emberback:[2,1,104,78,.85],grovekeeper:[3,1,72,94,.92],
    mireling:[0,2,60,48,.82],bog_stalker:[1,2,78,60,.83],drowned_warden:[2,2,78,96,.93],ridgehorn:[3,2,80,62,.84],
    quarry_wisp:[0,3,66,66,.76],quarry_sentinel:[1,3,82,100,.93],villager:[2,3,52,70,.94]
  };
  atlas.onload=()=>{state.ready=true;};atlas.onerror=()=>{state.failed=true;state.failure='assets/v48/living-cast.svg';};atlas.src='assets/v48/living-cast.svg?v=48';
  function enabled(){return Boolean(requested&&state.ready&&!state.failed&&debug.isSourceArt47Enabled?.());}
  function note(name){state.frameDraws++;state.totalDraws++;state.draws[name]=(state.draws[name]||0)+1;}
  function visible(p,w,h){return p.x+w/2>-120&&p.x-w/2<viewport.w+120&&p.y>-140&&p.y-h<viewport.h+100;}
  function drawSprite(name,o,{scale=1,alpha=1,flip=false,dy=0}={}){
    const f=frames[name];if(!f||!enabled())return false;const[col,row,nw,nh,anchor]=f,p=worldToScreen(o.x,o.y),z=camera.zoom*scale,w=nw*z,h=nh*z,y=p.y+dy*camera.zoom;
    if(!visible({x:p.x,y},w,h))return true;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(atlas,col*CELL,row*CELL,CELL,CELL,-w/2,-h*anchor,w,h);ctx.restore();note(name);return true;
  }
  function npcName(o){const n=String(o.name||o.label||'').toLowerCase();if(n.includes('perrin')||n.includes('alden')||n.includes('smith'))return'alden';if(n.includes('maeve')||n.includes('rowan')||n.includes('trader')||n.includes('merchant'))return'rowan';if(n.includes('orin')||n.includes('mira')||n.includes('alchem'))return'mira';return'villager';}
  function enemyName(e){return({wolf:'briar_wolf',boar:'hollow_boar',boss:'emberback',grovekeeper:'grovekeeper',mireling:'mireling',bogstalker:'bog_stalker',fenwarden:'drowned_warden',ridgehorn:'ridgehorn',quarrywisp:'quarry_wisp',quarrysentinel:'quarry_sentinel'})[e.type]||null;}
  const enemyScale={wolf:.94,boar:.95,boss:1.04,grovekeeper:1.0,mireling:.9,bogstalker:.96,fenwarden:1.02,ridgehorn:.97,quarrywisp:.95,quarrysentinel:1.02};
  function enemyStatus(e){const bossLike=['boss','fenwarden','quarrysentinel'].includes(e.type);if(e.hp>=e.maxHp&&!bossLike)return;const p=worldToScreen(e.x,e.y),w=(bossLike?112:58)*camera.zoom,y=p.y-(bossLike?96:62)*camera.zoom;ctx.fillStyle='rgba(0,0,0,.45)';roundRect(p.x-w/2,y,w,7*camera.zoom,4*camera.zoom);ctx.fill();ctx.fillStyle=e.type==='boss'?'#b9543d':e.type==='fenwarden'?'#6c9d90':e.type==='quarrysentinel'?'#9b714b':'#b86a50';roundRect(p.x-w/2,y,w*(e.hp/e.maxHp),7*camera.zoom,4*camera.zoom);ctx.fill();const label=e.type==='boss'?'EMBERBACK':e.type==='fenwarden'?'DROWNED WARDEN':e.type==='quarrysentinel'?'QUARRY SENTINEL':'';if(label)labelAt(p.x,y-9*camera.zoom,label);}

  const priorObject=drawObject;drawObject=function build48LivingNpc(o){if(!enabled()||o.type!=='npc')return priorObject(o);shadow(o.x,o.y,18,10,.22);if(drawSprite(npcName(o),o,{scale:.96,flip:Number(o.facingX||1)<0,dy:2}))return;return priorObject(o);};

  const priorEnemy=drawEnemy;drawEnemy=function build48LivingEnemy(e){if(!enabled()||e.dead)return priorEnemy(e);const name=enemyName(e);if(!name)return priorEnemy(e);const p=worldToScreen(e.x,e.y),z=camera.zoom*(e.scale||1);if(['ridgehorn','quarrywisp','quarrysentinel'].includes(e.type)&&typeof drawStoneTelegraph==='function')drawStoneTelegraph(e,p,z);else if(typeof drawEnemyTelegraph==='function')drawEnemyTelegraph(e,p);shadow(e.x,e.y,e.type==='boss'?36:26,e.type==='boss'?20:15,.28);if(e.type==='boss'&&!player.reinforced){ctx.save();ctx.strokeStyle='rgba(232,177,103,.48)';ctx.lineWidth=3*camera.zoom;ctx.setLineDash([7*camera.zoom,6*camera.zoom]);ctx.beginPath();ctx.ellipse(p.x,p.y-24*camera.zoom,52*camera.zoom,31*camera.zoom,0,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore();}const drawn=drawSprite(name,e,{scale:enemyScale[e.type]||1,flip:Number(e.facingX||1)<0,alpha:e.hurt>0?.72:1,dy:3});if(!drawn)return priorEnemy(e);enemyStatus(e);};

  const priorPlayer=drawPlayer;drawPlayer=function build48LivingPlayer(){if(!enabled())return priorPlayer();const p=worldToScreen(player.x,player.y),z=camera.zoom,blink=player.invuln>0&&Math.floor(player.invuln*18)%2===0;shadow(player.x,player.y,20,12,.29);if(!drawSprite('warden',player,{scale:1,flip:player.facingX<0,alpha:blink?.55:1,dy:2}))return priorPlayer();const a=Math.atan2(player.facingY,player.facingX);ctx.save();ctx.globalAlpha=blink?.55:1;ctx.translate(p.x+player.facingX*9*z,p.y-25*z+player.facingY*4*z);ctx.rotate(a*.55+.12);if(player.weaponType==='sword'){ctx.strokeStyle='#4e3b2e';ctx.lineWidth=6*z;ctx.beginPath();ctx.moveTo(-5*z,5*z);ctx.lineTo(4*z,-2*z);ctx.stroke();ctx.strokeStyle=player.reinforced?'#e5ddc5':'#b9b5a7';ctx.lineWidth=(player.reinforced?5:4)*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(2*z,-2*z);ctx.lineTo(29*z,-19*z);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=1.2*z;ctx.beginPath();ctx.moveTo(8*z,-7*z);ctx.lineTo(27*z,-18*z);ctx.stroke();}else if(player.weaponType==='bow'){ctx.strokeStyle='#8c693f';ctx.lineWidth=3*z;ctx.beginPath();ctx.arc(9*z,-4*z,19*z,-1.15,1.1);ctx.stroke();ctx.strokeStyle='#e0d3b6';ctx.lineWidth=1.2*z;ctx.beginPath();ctx.moveTo(17*z,-21*z);ctx.lineTo(1*z,-4*z);ctx.lineTo(17*z,13*z);ctx.stroke();if(player.attackAnim>0){ctx.strokeStyle='#ead39d';ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(1*z,-4*z);ctx.lineTo(29*z,-4*z);ctx.stroke();}}else{ctx.strokeStyle='#6f563e';ctx.lineWidth=5*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-4*z,5*z);ctx.lineTo(25*z,-21*z);ctx.stroke();const glow=6+Math.sin(performance.now()/120)*1.4;circle(28*z,-24*z,glow*z,'rgba(132,211,173,.72)');circle(28*z,-24*z,2.5*z,'#d8f4e4');}ctx.restore();};

  runtime.registerHook('beforeDraw','build48-living-cast-frame-reset',()=>{state.frameDraws=0;},2070);
  debug.isLivingCast48Enabled=enabled;debug.getLivingCast48State=()=>({version:state.version,requested:state.requested,enabled:enabled(),ready:state.ready,failed:state.failed,failure:state.failure,frameDraws:state.frameDraws,totalDraws:state.totalDraws,draws:{...state.draws},baseline:{...state.baseline},current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},uniqueEnemyAssets:Object.keys(enemyScale).length,source:'assets/v48/living-cast.svg'});
})();
