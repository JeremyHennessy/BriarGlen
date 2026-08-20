(() => {
  'use strict';
  const debug=window.__BRIAR_GLENDebug;
  if(!debug?.isArtV1Enabled?.()) return;

  const TAU2=Math.PI*2;
  const R={
    meadow:[[-420,0],[-245,15],[-120,72],[20,42],[150,-45],[300,-35],[445,72],[585,35],[675,5]],
    grove:[[95,-12],[125,-190],[185,-350],[270,-520],[420,-650],[555,-735],[650,-820]],
    fen:[[1010,-1200],[1125,-1325],[1215,-1450],[1360,-1545],[1450,-1690],[1515,-1830]],
    copper:[[650,5],[760,85],[900,35],[1035,-35],[1165,55],[1295,-45],[1415,5]],
    den:[[1410,5],[1515,72],[1635,38],[1740,-62],[1870,-35],[1995,72],[2110,92]],
    stonepine:[[2240,-1500],[2390,-1450],[2520,-1515],[2690,-1365],[2840,-1495],[2980,-1640],[3190,-1840]],
  };
  function region(x,y){if(x>=2240&&y<=-1120)return'stonepine';if(x>=880&&x<=2200&&y<=-1180)return'fen';if(x>=-80&&x<=900&&y<=-430)return'grove';if(x<-210)return'village';if(x<660)return'meadow';if(x<1430)return'copper';return'den';}
  function hsh(x,y,s=0){let h=(Math.imul((x|0)^s,374761393)+Math.imul((y|0),668265263))|0;h=(h^(h>>>13))*1274126177|0;return(h^(h>>>16))>>>0;}
  function ell(x,y,rx,ry,c,a=1){ctx.save();ctx.globalAlpha*=a;ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU2);ctx.fill();ctx.restore();}
  function seg(px,py,ax,ay,bx,by){const vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay,d=vx*vx+vy*vy||1,t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/d));return Math.hypot(px-(ax+t*vx),py-(ay+t*vy));}
  function clearance(r,x,y){if(r==='village')return Math.hypot(x+620,y-30)-215;const q=R[r];if(!q)return 999;let d=9999;for(let i=0;i<q.length-1;i++)d=Math.min(d,seg(x,y,q[i][0],q[i][1],q[i+1][0],q[i+1][1]));return d;}
  function decor(){
    const r=region(camera.x,camera.y),z=camera.zoom,step=112,gx=Math.floor(camera.x/step),gy=Math.floor(camera.y/step);
    for(let ix=-10;ix<=10;ix++)for(let iy=-9;iy<=9;iy++){
      const h=hsh(gx+ix,gy+iy,177);if(h%100>49)continue;
      const x=(gx+ix)*step+((h>>>5)%70)-35,y=(gy+iy)*step+((h>>>12)%70)-35,c=clearance(r,x,y);if(c<72)continue;
      const p=worldToScreen(x,y);if(p.x<-70||p.x>viewport.w+70||p.y<-70||p.y>viewport.h+70)continue;
      ctx.save();ctx.globalAlpha=.9;
      if(r==='den'){
        if(h%3===0){ell(p.x,p.y,6*z,2.6*z,'#352f2c',.55);ell(p.x+2*z,p.y-2*z,1.6*z,1.6*z,'#c76543',.50);}else{ctx.strokeStyle='rgba(72,61,55,.65)';ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(p.x-5*z,p.y);ctx.lineTo(p.x+5*z,p.y-4*z);ctx.stroke();}
      }else if(r==='copper'||r==='stonepine'){
        ell(p.x,p.y,(4+h%5)*z,(2+h%3)*z,r==='copper'?'#777367':'#6c7468',.62);
        if(h%4===0){ctx.strokeStyle=r==='stonepine'?'rgba(55,80,54,.60)':'rgba(87,77,58,.52)';ctx.lineWidth=1.2*z;for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(p.x+(k-1)*4*z,p.y);ctx.lineTo(p.x+(k-1)*5*z,p.y-(4+k)*z);ctx.stroke();}}
      }else if(r==='fen'){
        ctx.strokeStyle='rgba(104,132,105,.72)';ctx.lineWidth=1.5*z;ctx.lineCap='round';for(let k=-2;k<=2;k++){ctx.beginPath();ctx.moveTo(p.x+k*3*z,p.y);ctx.quadraticCurveTo(p.x+k*4*z,p.y-7*z,p.x+(k*3+((h>>>(k+3))&3)-1)*z,p.y-(12+(k&1)*5)*z);ctx.stroke();}if(h%5===0)ell(p.x+5*z,p.y-4*z,2.1*z,2.1*z,'#c7b978',.75);
      }else{
        const g=r==='grove'?['#3f623e','#547347','#6f8654']:['#4e7044','#668451','#7d965e'];ctx.strokeStyle=g[h%3];ctx.lineWidth=1.35*z;ctx.lineCap='round';const n=4+h%4;for(let k=0;k<n;k++){const ox=(k-(n-1)/2)*2.6*z,lean=(((h>>>(k+2))%5)-2)*z;ctx.beginPath();ctx.moveTo(p.x+ox,p.y);ctx.quadraticCurveTo(p.x+ox+lean*.35,p.y-5*z,p.x+ox+lean,p.y-(9+(k%3)*3)*z);ctx.stroke();}
        if(h%4===0){const f=['#dcc977','#c67d70','#af8cad','#e2d9a1'];for(let k=0;k<2+h%2;k++)ell(p.x+(k-1)*5*z,p.y-(6+(k%2)*4)*z,1.9*z,1.9*z,f[(h+k)%4],.85);}if(c>150&&h%11===0){ell(p.x-5*z,p.y-8*z,11*z,7*z,g[0],.75);ell(p.x+6*z,p.y-10*z,12*z,8*z,g[1],.77);ell(p.x,p.y-15*z,9*z,7*z,g[2],.72);}
      }
      ctx.restore();
    }
  }
  const ground=drawGround;drawGround=function artV1WorldPolishGround(){ground();decor();};

  const oldZoneFor=zoneFor;
  zoneFor=function artV1ExpandedZoneFor(x){
    const y=player?.y??camera.y;
    if(x>=2240&&y<=-1120)return{name:'STONEPINE REACH',min:2240,max:3600,tint:'#596451'};
    if(x>=880&&x<=2200&&y<=-1180)return{name:'MOSSWATER FEN',min:880,max:2200,tint:'#526b62'};
    if(x>=-80&&x<=900&&y<=-430)return{name:'MOONCAP GROVE',min:-80,max:900,tint:'#4e684d'};
    return oldZoneFor(x);
  };

  const base=debug.getArtV1State;
  debug.getArtV1State=()=>({...base(),polish:{version:'world-polish-v1',ambientDecor:true,expandedZoneIdentity:true}});
})();
