  function drawEnemyTelegraph(e, p) {
    if (e.windup <= 0 || !e.pendingAttack) return;
    const t = e.windupMax ? e.windup / e.windupMax : 0;
    const pulse = .38 + Math.sin(performance.now() / 70) * .08;
    ctx.save();
    ctx.globalAlpha = clamp(.9 - t * .25, .4, .9);
    if (e.pendingAttack === 'charge') {
      const target = worldToScreen(e.telegraphTargetX, e.telegraphTargetY);
      ctx.strokeStyle = `rgba(226,92,58,${pulse})`;
      ctx.lineWidth = 34 * camera.zoom;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 12 * camera.zoom); ctx.lineTo(target.x, target.y - 12 * camera.zoom); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,196,126,.7)';
      ctx.lineWidth = 3 * camera.zoom;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 12 * camera.zoom); ctx.lineTo(target.x, target.y - 12 * camera.zoom); ctx.stroke();
    } else {
      const radius = e.pendingAttack === 'slam' ? 155 : e.attackRange + 28;
      ctx.strokeStyle = e.pendingAttack === 'slam' ? `rgba(231,87,51,${pulse + .15})` : `rgba(226,129,72,${pulse})`;
      ctx.lineWidth = (e.pendingAttack === 'slam' ? 5 : 3) * camera.zoom;
      ctx.setLineDash(e.pendingAttack === 'slam' ? [10 * camera.zoom, 8 * camera.zoom] : []);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, radius * 1.08 * camera.zoom, radius * .54 * camera.zoom, 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawEnemy(e) {
    const p=worldToScreen(e.x,e.y), z=camera.zoom*e.scale;
    drawEnemyTelegraph(e, p);
    shadow(e.x,e.y,26*e.scale,15*e.scale,.3);
    if(e.type==='boss' && !player.reinforced){
      ctx.save();
      ctx.strokeStyle='rgba(232,177,103,.48)';ctx.lineWidth=3*camera.zoom;
      ctx.setLineDash([7*camera.zoom,6*camera.zoom]);
      ctx.beginPath();ctx.ellipse(p.x,p.y-24*camera.zoom,52*camera.zoom,31*camera.zoom,0,0,TAU);ctx.stroke();
      ctx.setLineDash([]);ctx.restore();
    }
    ctx.save();ctx.translate(p.x,p.y);
    if(e.hurt>0) ctx.globalAlpha=.72;
    ctx.fillStyle=e.hurt>0?'#e9c7a6':e.color;
    ctx.beginPath();ctx.ellipse(0,-17*z,28*z,18*z,0,0,TAU);ctx.fill();
    const fx=e.facingX*10*z, fy=e.facingY*4*z;
    circle(fx+17*z, -25*z+fy, 14*z, e.hurt>0?'#efd0ad':e.color);
    ctx.strokeStyle=e.color;ctx.lineWidth=6*z;ctx.lineCap='round';
    for(const lx of [-14,11]){ctx.beginPath();ctx.moveTo(lx*z,-7*z);ctx.lineTo((lx-2)*z,6*z);ctx.stroke();}
    if(e.type==='boss'){
      ctx.fillStyle='#e2c397';
      ctx.beginPath();ctx.moveTo(fx+22*z,-36*z+fy);ctx.lineTo(fx+35*z,-47*z+fy);ctx.lineTo(fx+30*z,-29*z+fy);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(fx+8*z,-36*z+fy);ctx.lineTo(fx+2*z,-50*z+fy);ctx.lineTo(fx+17*z,-31*z+fy);ctx.closePath();ctx.fill();
    }
    ctx.restore();

    if(e.hp<e.maxHp || e.type==='boss'){
      const w=(e.type==='boss'?110:58)*camera.zoom;
      const y=p.y-(e.type==='boss'?90:58)*camera.zoom;
      ctx.fillStyle='rgba(0,0,0,.45)';roundRect(p.x-w/2,y,w,7*camera.zoom,4*camera.zoom);ctx.fill();
      ctx.fillStyle=e.type==='boss'?'#b9543d':'#b86a50';roundRect(p.x-w/2,y,w*(e.hp/e.maxHp),7*camera.zoom,4*camera.zoom);ctx.fill();
      if(e.type==='boss') labelAt(p.x,y-9*camera.zoom,'EMBERBACK');
    }
  }

  function drawPlayer() {
    const p=worldToScreen(player.x,player.y), z=camera.zoom;
    shadow(player.x,player.y,22,13,.32);
    const blink=player.invuln>0 && Math.floor(player.invuln*18)%2===0;
    ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=blink?.55:1;
    ctx.fillStyle='#3f604a';ctx.beginPath();ctx.moveTo(-16*z,0);ctx.lineTo(-12*z,-37*z);ctx.lineTo(0,-48*z);ctx.lineTo(14*z,-37*z);ctx.lineTo(18*z,2*z);ctx.closePath();ctx.fill();
    ctx.fillStyle='#c6a47f';circle(0,-48*z,11*z,'#c6a47f');
    ctx.fillStyle='#2c362f';ctx.beginPath();ctx.arc(0,-50*z,12*z,Math.PI,TAU);ctx.fill();
    const a=Math.atan2(player.facingY,player.facingX);
    ctx.save();
    ctx.translate(player.facingX*10*z,-22*z+player.facingY*4*z);
    ctx.rotate(a*.55+.15);
    if(player.weaponType==='sword'){
      ctx.strokeStyle=player.reinforced?'#e1d6b7':'#b5b0a0';ctx.lineWidth=(player.reinforced?5:4)*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(25*z,-15*z);ctx.stroke();
      ctx.strokeStyle='#8d623c';ctx.lineWidth=5*z;ctx.beginPath();ctx.moveTo(-3*z,2*z);ctx.lineTo(4*z,-3*z);ctx.stroke();
    }else if(player.weaponType==='bow'){
      ctx.strokeStyle='#9b7247';ctx.lineWidth=3*z;ctx.beginPath();ctx.arc(8*z,-4*z,18*z,-1.15,1.1);ctx.stroke();
      ctx.strokeStyle='#d8c9aa';ctx.lineWidth=1.2*z;ctx.beginPath();ctx.moveTo(16*z,-20*z);ctx.lineTo(1*z,-4*z);ctx.lineTo(16*z,12*z);ctx.stroke();
      if(player.attackAnim>0){ctx.strokeStyle='#e5c98f';ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(0,-4*z);ctx.lineTo(27*z,-4*z);ctx.stroke();}
    }else{
      ctx.strokeStyle='#6f5a43';ctx.lineWidth=5*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-4*z,5*z);ctx.lineTo(24*z,-20*z);ctx.stroke();
      const glow=5+Math.sin(performance.now()/120)*1.5;
      circle(27*z,-23*z,glow*z,'rgba(132,211,173,.8)');
      circle(27*z,-23*z,2.5*z,'#d8f4e4');
    }
    ctx.restore();
    ctx.restore();
  }

  function drawProjectiles(){
    for(const p of projectiles){
      const s=worldToScreen(p.x,p.y), z=camera.zoom;
      if(p.type==='bow'){
        const a=Math.atan2(p.vy,p.vx);
        ctx.save();ctx.translate(s.x,s.y-18*z);ctx.rotate(a*.5);
        ctx.strokeStyle='#e6d3a8';ctx.lineWidth=2*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-9*z,0);ctx.lineTo(9*z,0);ctx.stroke();
        ctx.fillStyle='#b9a074';ctx.beginPath();ctx.moveTo(10*z,0);ctx.lineTo(4*z,-3*z);ctx.lineTo(4*z,3*z);ctx.closePath();ctx.fill();ctx.restore();
      }else{
        const glow=8+Math.sin(performance.now()/85+p.x)*2;
        ctx.globalAlpha=.2;circle(s.x,s.y-16*z,glow*z,p.color);ctx.globalAlpha=1;
        circle(s.x,s.y-16*z,5*z,p.color);circle(s.x,s.y-16*z,2*z,'#ddf8e8');
      }
    }
  }

  function drawSlashes(){
    for(const s of slashes){
      const p=worldToScreen(s.x,s.y), a=Math.atan2(s.facingY,s.facingX), t=s.life/s.maxLife;
      ctx.save();ctx.translate(p.x,p.y-20*camera.zoom);ctx.rotate(a*.6);
      ctx.strokeStyle=`rgba(247,226,177,${t*.75})`;ctx.lineWidth=6*camera.zoom;ctx.lineCap='round';
      ctx.beginPath();ctx.arc(0,0,s.reach*.58*camera.zoom,-1.1,.65);ctx.stroke();ctx.restore();
    }
  }

  function drawParticles(){
    for(const p of particles){
      const s=worldToScreen(p.x,p.y);const alpha=clamp(p.life/.5,0,1);
      ctx.globalAlpha=alpha;circle(s.x,s.y-p.z*camera.zoom,2.5*camera.zoom,p.color);ctx.globalAlpha=1;
    }
  }

  function drawFloaters(){
    ctx.textAlign='center';ctx.font=`800 ${Math.max(10,12*camera.zoom)}px system-ui`;
    for(const f of floaters){
      const p=worldToScreen(f.x,f.y);const age=1-f.life/f.maxLife;
      ctx.globalAlpha=clamp(f.life*1.5,0,1);ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillText(f.text,p.x+1,p.y-32-age*28+1);ctx.fillStyle=f.color;ctx.fillText(f.text,p.x,p.y-32-age*28);ctx.globalAlpha=1;
    }
  }

  function drawVignette(){
    const g=ctx.createRadialGradient(viewport.w/2,viewport.h/2,Math.min(viewport.w,viewport.h)*.25,viewport.w/2,viewport.h/2,Math.max(viewport.w,viewport.h)*.72);
    g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(4,9,6,.32)');ctx.fillStyle=g;ctx.fillRect(0,0,viewport.w,viewport.h);
  }

  function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
  function roundRect(x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
  }
  function labelAt(x,y,text){
    ctx.font=`800 ${Math.max(8,9*camera.zoom)}px system-ui`;ctx.textAlign='center';ctx.fillStyle='rgba(244,233,208,.84)';ctx.fillText(text,x,y);
  }

