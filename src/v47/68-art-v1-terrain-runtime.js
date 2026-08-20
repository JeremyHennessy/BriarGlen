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
  const CELL_PX = TILE_WORLD / PIXEL_WORLD;
  const CHUNK_PX = CHUNK_TILES * CELL_PX;
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
  const state = {
    version:VERSION, familyId:FAMILY_ID, recipeId:RECIPE_ID, requested, enabled:false, ready:!requested, failed:false,
    failClosed:true, fallbackUsed:false, atlasPath:'assets/art-v1/terrain/terrain-atlas-v1.webp', atlasWidth:0, atlasHeight:0,
    physicalTileCount:21, cacheBuilds:0, cacheHits:0, cacheMisses:0, evictions:0, frameChunks:0, frameCells:0,
    activeCache:0, currentRegion:'', materialPrimary:'', materialSecondary:'', materialMix:0, drawCalls:0,
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
  let clock = 0;
  function hash(a,b,c=1){let h=(2166136261^c)>>>0;for(const v of[a,b,c]){h^=v|0;h=Math.imul(h,16777619)>>>0;h^=h>>>13;}return h>>>0;}
  function regionAt(x,y){if(x>=2240&&y<=-1120)return'stonepine';if(x>=880&&x<=2200&&y<=-1180)return'fen';if(x>=-80&&x<=900&&y<=-430)return'grove';if(x<-210)return'village';if(x<660)return'meadow';if(x<1430)return'copper';return'den';}
  function seg(px,py,ax,ay,bx,by){const vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay,c1=vx*wx+vy*wy;if(c1<=0)return Math.hypot(px-ax,py-ay);const c2=vx*vx+vy*vy;if(c2<=c1)return Math.hypot(px-bx,py-by);const t=c1/c2;return Math.hypot(px-(ax+t*vx),py-(ay+t*vy));}
  function routeDist(region,x,y){const p=routes[region];if(!p)return 1e9;let d=1e9;for(let i=1;i<p.length;i++)d=Math.min(d,seg(x,y,...p[i-1],...p[i]));return d;}
  const clamp01 = v => Math.max(0,Math.min(1,v));
  function routeStrength(region,x,y){
    if(region==='village'){
      const radial=Math.hypot(x+470,y-255), approach=Math.min(Math.abs(x+470),Math.abs(y-255));
      return Math.max(clamp01(1-Math.abs(radial-155)/85),clamp01(1-approach/120));
    }
    const width={meadow:92,grove:76,fen:70,copper:94,stonepine:72,den:84}[region]||80;
    return clamp01(1-(routeDist(region,x,y)-width*.40)/(width*.70));
  }
  function boundaryNoise(x,y){return(Math.sin(x*.0057+y*.0041)+Math.cos(x*.0031-y*.0063)+Math.sin((x-y)*.0027))*.12;}
  function materialMixAt(x,y){
    const n=boundaryNoise(x,y), out=[];
    for(const region of regions){const a=anchors[region],dx=(x-a.x)/(a.sx*(1+n*.16)),dy=(y-a.y)/(a.sy*(1-n*.12)),w=Math.exp(-.5*(dx*dx+dy*dy))*a.bias;out.push({region,w});}
    out.sort((a,b)=>b.w-a.w);const a=out[0],b=out[1],sum=Math.max(.0001,a.w+b.w),secondary=Math.min(.34,(b.w/sum)*.60);
    return{primary:a.region,secondary:b.region,secondaryAlpha:secondary,key:`${a.region}:${b.region}:${Math.round(secondary*10)/10}`};
  }
  function sampleRect(region,role){
    const row=rows[region],col=role==='base'?0:role==='route'?1:2;
    return [col*ATLAS_CELL,row*ATLAS_CELL,ATLAS_CELL,ATLAS_CELL];
  }
  function drawSample(c,region,role,gx,gy,dx,dy,alpha=1,salt=1){
    const [sx,sy,sw,sh]=sampleRect(region,role),h=hash(gx,gy,salt),flipX=Boolean(h&1),flipY=Boolean(h&2);
    c.save();
    c.globalAlpha=alpha;
    c.translate(dx+(flipX?CELL_PX:0),dy+(flipY?CELL_PX:0));
    c.scale(flipX?-1:1,flipY?-1:1);
    c.drawImage(atlas,sx,sy,sw,sh,0,0,CELL_PX,CELL_PX);
    c.restore();
  }
  function buildChunk(cx,cy,material){
    const canvas=document.createElement('canvas');canvas.width=CHUNK_PX;canvas.height=CHUNK_PX;const c=canvas.getContext('2d',{alpha:false});
    const wx0=cx*CHUNK_WORLD,wy0=cy*CHUNK_WORLD;
    for(let ty=0;ty<CHUNK_TILES;ty++)for(let tx=0;tx<CHUNK_TILES;tx++){
      const wx=wx0+(tx+.5)*TILE_WORLD,wy=wy0+(ty+.5)*TILE_WORLD,gx=Math.floor(wx/TILE_WORLD),gy=Math.floor(wy/TILE_WORLD),dx=tx*CELL_PX,dy=ty*CELL_PX;
      const semantic=regionAt(wx,wy), local=materialMixAt(wx,wy), primary=local.primary||material.primary, secondary=local.secondary||material.secondary;
      drawSample(c,primary,'base',gx,gy,dx,dy,1,71);
      if(local.secondaryAlpha>.035)drawSample(c,secondary,'base',gx,gy,dx,dy,local.secondaryAlpha,173);
      const rs=routeStrength(semantic,wx,wy);
      if(rs>.04)drawSample(c,semantic,'route',gx,gy,dx,dy,.12+rs*.68,113);
      const density={village:18,meadow:15,grove:13,fen:14,copper:16,stonepine:14,den:18}[semantic];
      if(rs<.26&&hash(gx,gy,197)%density===0)drawSample(c,semantic,'accent',gx,gy,dx,dy,.42,229);
    }
    state.cacheBuilds++;return{canvas,last:++clock};
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
  drawGround = function artV1TerrainGround(zone){
    if(!requested)return priorGround(zone);
    state.fallbackUsed=false;
    drawOwnedGround();
  };

  debug.getArtV1TerrainState = () => ({...state,activeCache:cache.size,currentRegion:state.currentRegion||regionAt(camera.x,camera.y)});
})();
