(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const proofKeys = ['assetVariantProof','landmarkStateProof','env46proof','envperf','terrain46','tperf','generatedArtSmoke','dressing','layoutProof','renderPerf','build30Recovery'];
  const historicalProof = [...params.keys()].some(k => proofKeys.includes(k));
  const requested = params.get('artV1Terrain') === '1' && !historicalProof;
  const debug = window.__BRIAR_GLENDebug;
  if (!debug) return;

  const FAMILY_ID = 'briar-glen-art-v1';
  const RECIPE_ID = 'briar-glen-art-v1-painted-family-v1';
  const VERSION = 'art-v1-terrain-preview-v1';
  const TILE_WORLD = 96;
  const CHUNK_TILES = 8;
  const CHUNK_WORLD = TILE_WORLD * CHUNK_TILES;
  const PIXEL_WORLD = 3;
  const CHUNK_PX = CHUNK_WORLD / PIXEL_WORLD;
  const CACHE_LIMIT = 20;
  const ATLAS_CELL = 32;
  const ATLAS_WIDTH = 96;
  const ATLAS_HEIGHT = 224;
  const regions = ['village','meadow','grove','fen','copper','stonepine','den'];
  const rows = { village:0, meadow:1, grove:2, fen:3, copper:4, stonepine:5, den:6 };

  const anchors = {
    village:{x:-610,y:0,sx:520,sy:900,bias:1.05}, meadow:{x:260,y:0,sx:510,sy:760,bias:1.02},
    grove:{x:480,y:-790,sx:560,sy:500,bias:1.30}, fen:{x:1500,y:-1650,sx:760,sy:620,bias:1.38},
    copper:{x:1050,y:0,sx:540,sy:760,bias:1.05}, stonepine:{x:2800,y:-1520,sx:850,sy:680,bias:1.38},
    den:{x:1870,y:0,sx:590,sy:760,bias:1.08},
  };
  const routes = {
    meadow:[[-245,15],[-120,72],[20,42],[150,-45],[300,-35],[445,72],[585,35],[675,5]],
    grove:[[95,-12],[125,-190],[185,-350],[270,-520],[420,-650],[555,-735],[650,-820]],
    fen:[[1010,-1200],[1125,-1325],[1215,-1450],[1360,-1545],[1450,-1690],[1515,-1830]],
    stonepine:[[2240,-1500],[2390,-1450],[2520,-1515],[2690,-1365],[2840,-1495],[2980,-1640],[3190,-1840]],
    copper:[[650,5],[760,85],[900,35],[1035,-35],[1165,55],[1295,-45],[1415,5]],
    den:[[1410,5],[1515,72],[1635,38],[1740,-62],[1870,-35],[1995,72],[2110,92]],
  };

  const baseRgb = {
    village:[151,139,97], meadow:[109,120,74], grove:[82,101,66], fen:[75,96,82],
    copper:[132,106,76], stonepine:[89,95,73], den:[88,74,62],
  };
  const routeRgb = {
    village:[181,163,117], meadow:[156,137,91], grove:[117,118,83], fen:[102,110,94],
    copper:[154,126,94], stonepine:[122,114,85], den:[115,92,75],
  };

  const state = {
    version:VERSION, familyId:FAMILY_ID, recipeId:RECIPE_ID, requested, enabled:false, ready:!requested, failed:false,
    failClosed:true, fallbackUsed:false, atlasPath:'assets/art-v1/terrain/terrain-atlas-v1.webp', atlasWidth:0, atlasHeight:0,
    physicalTileCount:21, cacheBuilds:0, cacheHits:0, cacheMisses:0, evictions:0, frameChunks:0, frameCells:0,
    activeCache:0, currentRegion:'', materialPrimary:'', materialSecondary:'', materialMix:0, drawCalls:0,
    texturePasses:3, textureSpacing:92,
  };

  const atlas = new Image();
  atlas.decoding = 'async';
  if (requested) {
    atlas.onload = () => {
      state.atlasWidth = atlas.naturalWidth;
      state.atlasHeight = atlas.naturalHeight;
      if (state.atlasWidth !== ATLAS_WIDTH || state.atlasHeight !== ATLAS_HEIGHT) {
        state.failed = true; state.ready = false; state.enabled = false; return;
      }
      state.ready = true; state.enabled = true;
    };
    atlas.onerror = () => { state.failed = true; state.ready = false; state.enabled = false; };
    atlas.src = `${state.atlasPath}?v=terrain-v1`;
  }

  const cache = new Map();
  const dabCache = new Map();
  let clock = 0;

  function hash(a,b,c=1){let h=(2166136261^c)>>>0;for(const v of[a,b,c]){h^=v|0;h=Math.imul(h,16777619)>>>0;h^=h>>>13;}return h>>>0;}
  function rand01(a,b,c=1){return hash(a,b,c)/4294967295;}
  function regionAt(x,y){if(x>=2240&&y<=-1120)return'stonepine';if(x>=880&&x<=2200&&y<=-1180)return'fen';if(x>=-80&&x<=900&&y<=-430)return'grove';if(x<-210)return'village';if(x<660)return'meadow';if(x<1430)return'copper';return'den';}
  function seg(px,py,ax,ay,bx,by){const vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay,c1=vx*wx+vy*wy;if(c1<=0)return Math.hypot(px-ax,py-ay);const c2=vx*vx+vy*vy;if(c2<=c1)return Math.hypot(px-bx,py-by);const t=c1/c2;return Math.hypot(px-(ax+t*vx),py-(ay+t*vy));}
  function routeDist(region,x,y){const p=routes[region];if(!p)return 1e9;let d=1e9;for(let i=1;i<p.length;i++)d=Math.min(d,seg(x,y,...p[i-1],...p[i]));return d;}
  const clamp01 = v => Math.max(0,Math.min(1,v));
  function routeStrength(region,x,y){
    if(region==='village'){
      const radial=Math.hypot(x+470,y-255);
      const ring=clamp01(1-Math.abs(radial-155)/92);
      const north=clamp01(1-Math.abs(x+470)/92)*clamp01(1-Math.abs(y+255)/430);
      const south=clamp01(1-Math.abs(x+445)/98)*clamp01(1-Math.abs(y-205)/430);
      return Math.max(ring,north,south);
    }
    const width={meadow:100,grove:82,fen:76,copper:102,stonepine:78,den:90}[region]||86;
    return clamp01(1-(routeDist(region,x,y)-width*.30)/(width*.86));
  }
  function boundaryNoise(x,y){return(Math.sin(x*.0057+y*.0041)+Math.cos(x*.0031-y*.0063)+Math.sin((x-y)*.0027))*.12;}
  function materialMixAt(x,y){
    const n=boundaryNoise(x,y),out=[];
    for(const region of regions){const a=anchors[region],dx=(x-a.x)/(a.sx*(1+n*.16)),dy=(y-a.y)/(a.sy*(1-n*.12)),w=Math.exp(-.5*(dx*dx+dy*dy))*a.bias;out.push({region,w});}
    out.sort((a,b)=>b.w-a.w);const a=out[0],b=out[1],sum=Math.max(.0001,a.w+b.w),secondary=Math.min(.34,(b.w/sum)*.60);
    return {primary:a.region,secondary:b.region,secondaryAlpha:secondary,key:`${a.region}:${b.region}:${Math.round(secondary*10)/10}`};
  }
  function blendRgb(a,b,t){return [a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t,a[2]*(1-t)+b[2]*t];}
  function terrainNoise(x,y,seed=1){
    return Math.sin(x*.0089+y*.0067+seed)*.43 + Math.cos(x*.0041-y*.0103+seed*1.31)*.29 + Math.sin((x-y)*.0025+seed*.51)*.18 + Math.cos((x+y)*.017+seed*.19)*.10;
  }

  function makeContinuousField(cx,cy){
    const N=160,low=document.createElement('canvas');low.width=low.height=N;const lc=low.getContext('2d'),img=lc.createImageData(N,N),d=img.data;
    const wx0=cx*CHUNK_WORLD,wy0=cy*CHUNK_WORLD,step=CHUNK_WORLD/N;let p=0;
    for(let py=0;py<N;py++)for(let px=0;px<N;px++){
      const wx=wx0+(px+.5)*step,wy=wy0+(py+.5)*step,local=materialMixAt(wx,wy),semantic=regionAt(wx,wy);
      const primary=baseRgb[local.primary]||baseRgb[semantic],secondary=baseRgb[local.secondary]||primary;
      let rgb=blendRgb(primary,secondary,local.secondaryAlpha);
      const routeWarp=terrainNoise(wx*.76,wy*.82,23)*.060 + terrainNoise(wx*1.47,wy*1.39,89)*.024;
      const rs=routeStrength(semantic,wx,wy),organic=clamp01(rs + routeWarp);
      rgb=blendRgb(rgb,routeRgb[semantic]||rgb,organic*.32);
      const broad=terrainNoise(wx,wy,17);
      const medium=terrainNoise(wx*1.93,wy*1.79,43);
      const fine=terrainNoise(wx*4.35,wy*4.11,97);
      const grit=terrainNoise(wx*8.7,wy*8.2,151);
      const edgeShade=(1-organic)*terrainNoise(wx*.53,wy*.53,71)*2.1;
      d[p++]=Math.max(0,Math.min(255,Math.round(rgb[0]+broad*8.0+medium*4.6+fine*3.0+grit*1.2+edgeShade)));
      d[p++]=Math.max(0,Math.min(255,Math.round(rgb[1]+broad*7.0+medium*4.1+fine*2.6+grit*1.0+edgeShade)));
      d[p++]=Math.max(0,Math.min(255,Math.round(rgb[2]+broad*6.0+medium*3.6+fine*2.2+grit*.9+edgeShade)));
      d[p++]=255;
    }
    lc.putImageData(img,0,0);return low;
  }

  function atlasDab(region,role){
    const key=`${region}:${role}`;if(dabCache.has(key))return dabCache.get(key);
    const size=64,cn=document.createElement('canvas');cn.width=cn.height=size;const c=cn.getContext('2d'),row=rows[region],col=role==='base'?0:role==='route'?1:2;
    c.imageSmoothingEnabled=true;c.drawImage(atlas,col*ATLAS_CELL,row*ATLAS_CELL,ATLAS_CELL,ATLAS_CELL,0,0,size,size);
    c.globalCompositeOperation='destination-in';
    const g=c.createRadialGradient(size*.5,size*.5,size*.06,size*.5,size*.5,size*.5);g.addColorStop(0,'rgba(255,255,255,.99)');g.addColorStop(.58,'rgba(255,255,255,.90)');g.addColorStop(.82,'rgba(255,255,255,.45)');g.addColorStop(.96,'rgba(255,255,255,.08)');g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.fillRect(0,0,size,size);c.globalCompositeOperation='source-over';dabCache.set(key,cn);return cn;
  }

  function paintDabPass(c,cx,cy,pass){
    const wx0=cx*CHUNK_WORLD,wy0=cy*CHUNK_WORLD;
    const spacing=pass===0?92:pass===1?127:171,margin=190,seed=pass===0?173:pass===1?367:541;
    const minMx=Math.floor((wx0-margin)/spacing),maxMx=Math.ceil((wx0+CHUNK_WORLD+margin)/spacing),minMy=Math.floor((wy0-margin)/spacing),maxMy=Math.ceil((wy0+CHUNK_WORLD+margin)/spacing);
    for(let my=minMy;my<=maxMy;my++)for(let mx=minMx;mx<=maxMx;mx++){
      const jx=(rand01(mx,my,101+pass*43)-.5)*spacing*.92,jy=(rand01(mx,my,131+pass*47)-.5)*spacing*.92;
      const wx=mx*spacing+jx+(pass===1?spacing*.37:pass===2?spacing*.19:0),wy=my*spacing+jy+(pass===1?spacing*.23:pass===2?spacing*.41:0);
      const px=(wx-wx0)/PIXEL_WORLD,py=(wy-wy0)/PIXEL_WORLD,region=regionAt(wx,wy),rs=routeStrength(region,wx,wy),h=hash(mx,my,seed);
      const role=rs>.31?'route':'base';
      const size=(pass===0?48:pass===1?40:32)+(h%(pass===0?38:pass===1?33:27));
      const alpha=role==='route'
        ? (pass===0?.22+rs*.11:pass===1?.14+rs*.07:.08+rs*.04)
        : (pass===0?.20:pass===1?.13:.075);
      c.save();c.globalAlpha=alpha;c.translate(px,py);c.rotate(((h>>>8)%37-18)*Math.PI/180);c.drawImage(atlasDab(region,role),-size/2,-size/2,size,size);c.restore();
      if(rs<.18 && hash(mx,my,211+pass*23)%11===0){
        const as=14+(h>>>13)%12;c.save();c.globalAlpha=pass===0?.26:pass===1?.16:.10;c.drawImage(atlasDab(region,'accent'),px-as/2,py-as/2,as,as);c.restore();
      }
    }
  }

  function paintSourceDabs(c,cx,cy){
    paintDabPass(c,cx,cy,0);
    paintDabPass(c,cx,cy,1);
    c.save();c.globalCompositeOperation='soft-light';paintDabPass(c,cx,cy,2);c.restore();
  }

  function buildChunk(cx,cy,material){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=CHUNK_PX;const c=canvas.getContext('2d',{alpha:false});c.imageSmoothingEnabled=true;
    c.drawImage(makeContinuousField(cx,cy),0,0,CHUNK_PX,CHUNK_PX);
    paintSourceDabs(c,cx,cy);
    state.cacheBuilds++;return {canvas,last:++clock};
  }
  function chunk(cx,cy,material){const key=`${material.key}:${cx},${cy}`;let e=cache.get(key);if(e){e.last=++clock;state.cacheHits++;return e;}state.cacheMisses++;e=buildChunk(cx,cy,material);cache.set(key,e);if(cache.size>CACHE_LIMIT){let victim=null,old=Infinity;for(const[k,v]of cache)if(v.last<old){old=v.last;victim=k;}if(victim){cache.delete(victim);state.evictions++;}}state.activeCache=cache.size;return e;}
  function visible(cx,cy){const p=worldToScreen(cx*CHUNK_WORLD+CHUNK_WORLD/2,cy*CHUNK_WORLD+CHUNK_WORLD/2),hw=CHUNK_WORLD*.80*camera.zoom,hh=CHUNK_WORLD*.43*camera.zoom;return p.x+hw>-160&&p.x-hw<viewport.w+160&&p.y+hh>-120&&p.y-hh<viewport.h+120;}
  function drawFailClosed(){ctx.save();ctx.fillStyle='#24211d';ctx.fillRect(0,0,viewport.w,viewport.h);ctx.fillStyle='rgba(137,67,49,.28)';for(let y=0;y<viewport.h;y+=48)for(let x=0;x<viewport.w;x+=48)if(((x+y)/48)%2===0)ctx.fillRect(x,y,48,48);ctx.restore();}
  function drawOwnedGround(){
    if(!state.ready||state.failed){drawFailClosed();return;}
    const material=materialMixAt(camera.x,camera.y);state.materialPrimary=material.primary;state.materialSecondary=material.secondary;state.materialMix=material.secondaryAlpha;state.currentRegion=regionAt(camera.x,camera.y);
    state.frameChunks=0;state.frameCells=0;const centerCx=Math.floor(camera.x/CHUNK_WORLD),centerCy=Math.floor(camera.y/CHUNK_WORLD),unit=PIXEL_WORLD;
    for(let cy=centerCy-2;cy<=centerCy+2;cy++)for(let cx=centerCx-2;cx<=centerCx+2;cx++){
      if(!visible(cx,cy))continue;const entry=chunk(cx,cy,material),p=worldToScreen(cx*CHUNK_WORLD,cy*CHUNK_WORLD);
      ctx.save();ctx.translate(p.x,p.y);ctx.transform(.78*camera.zoom*unit,.39*camera.zoom*unit,-.78*camera.zoom*unit,.39*camera.zoom*unit,0,0);ctx.drawImage(entry.canvas,0,0);ctx.restore();state.frameChunks++;state.frameCells+=64;
    }
    state.drawCalls++;
  }

  const priorGround = drawGround;
  drawGround = function artV1TerrainGround(zone){if(!requested)return priorGround(zone);state.fallbackUsed=false;drawOwnedGround();};
  debug.getArtV1TerrainState = () => ({...state,activeCache:cache.size,currentRegion:state.currentRegion||regionAt(camera.x,camera.y)});
})();
