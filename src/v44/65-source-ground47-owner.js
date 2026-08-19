(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  const proofKeys=['assetVariantProof','landmarkStateProof','env46proof','envperf','terrain46','tperf','generatedArtSmoke','dressing','layoutProof','renderPerf','build30Recovery'];
  const historicalProof=[...params.keys()].some(k=>proofKeys.includes(k));
  const requested=params.get('sourceArt47')!=='0'&&params.get('groundV2')!=='0'&&!historicalProof&&!params.get('artScope')&&params.get('canvasArt')!=='1';
  const debug=window.__BRIAR_GLENDebug;
  if(!debug)return;

  const TILE_WORLD=96,CHUNK_TILES=8,CHUNK_WORLD=TILE_WORLD*CHUNK_TILES,PIXEL_WORLD=3,CELL_PX=TILE_WORLD/PIXEL_WORLD,CHUNK_PX=CHUNK_TILES*CELL_PX,CACHE_LIMIT=18;
  const regions=['village','meadow','grove','fen','copper','stonepine','den'];
  const bg={village:'#665f4c',meadow:'#526a45',grove:'#3d5140',fen:'#435953',copper:'#5d5b55',stonepine:'#505448',den:'#413b38'};
  const rows=Object.fromEntries(regions.map((r,i)=>[r,i]));
  const atlas=new Image();atlas.decoding='async';
  const state={version:'build47-ground-owner-v2',requested,ready:!requested,failed:false,cacheBuilds:0,cacheHits:0,cacheMisses:0,evictions:0,frameChunks:0,frameCells:0,transitionCells:0,activeCache:0,maxCache:CACHE_LIMIT,lastDecal:'',physicalTileCount:requested?21:0,sourceMode:requested?'build47-physical-tiles':'build46-procedural'};
  if(requested){atlas.onload=()=>{state.ready=true;};atlas.onerror=()=>{state.failed=true;state.ready=false;};atlas.src='assets/v47/terrain-materials.svg?v=47-owner2';}
  const cache=new Map();let clock=0;

  function hash(a,b,c=47){let h=(2166136261^c)>>>0;for(const v of[a,b,c]){h^=v|0;h=Math.imul(h,16777619)>>>0;h^=h>>>13;}return h>>>0;}
  function regionAt(x,y){if(x>=2240&&y<=-1120)return'stonepine';if(x>=880&&x<=2200&&y<=-1180)return'fen';if(x>=-80&&x<=900&&y<=-430)return'grove';if(x<-210)return'village';if(x<660)return'meadow';if(x<1430)return'copper';return'den';}
  function seg(px,py,ax,ay,bx,by){const vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay,c1=vx*wx+vy*wy;if(c1<=0)return Math.hypot(px-ax,py-ay);const c2=vx*vx+vy*vy;if(c2<=c1)return Math.hypot(px-bx,py-by);const t=c1/c2;return Math.hypot(px-(ax+t*vx),py-(ay+t*vy));}
  const routes={meadow:[[-245,15],[-120,72],[20,42],[150,-45],[300,-35],[445,72],[585,35],[675,5]],grove:[[95,-12],[125,-190],[185,-350],[270,-520],[420,-650],[555,-735],[650,-820]],fen:[[1010,-1200],[1125,-1325],[1215,-1450],[1360,-1545],[1450,-1690],[1515,-1830]],stonepine:[[2240,-1500],[2390,-1450],[2520,-1515],[2690,-1365],[2840,-1495],[2980,-1640],[3190,-1840]],copper:[[650,5],[760,85],[900,35],[1035,-35],[1165,55],[1295,-45],[1415,5]],den:[[1410,5],[1515,72],[1635,38],[1740,-62],[1870,-35],[1995,72],[2110,92]]};
  function routeDist(region,x,y){const p=routes[region];if(!p)return 1e9;let d=1e9;for(let i=1;i<p.length;i++)d=Math.min(d,seg(x,y,...p[i-1],...p[i]));return d;}
  const clamp01=v=>Math.max(0,Math.min(1,v));
  function strength(region,x,y){if(region==='village'){const d=Math.min(Math.hypot(x+470,y-255)-80,Math.hypot(x+395,y+265)-65,Math.hypot(x+445,y-205)-70);return clamp01(1-d/105);}const width={meadow:82,grove:70,fen:64,copper:88,stonepine:66,den:78}[region]||72;let s=clamp01(1-(routeDist(region,x,y)-width*.42)/(width*.58));if(region==='grove')s=Math.max(s,clamp01(1-(Math.hypot(x-650,y+820)-65)/100));if(region==='stonepine')s=Math.max(s,clamp01(1-(Math.hypot(x-2690,y+1365)-64)/100));if(region==='den')s=Math.max(s,clamp01(1-(Math.hypot(x-1900,y)-105)/130));return s;}
  function crop(hashValue){return(hashValue%3)*64;}
  function drawBaseCrop(c,region,gx,gy,dx,dy,alpha=1,salt=71){const row=rows[region],h=hash(gx,gy,salt),ox=crop(h),oy=crop(h>>>5);c.globalAlpha=alpha;c.drawImage(atlas,ox,row*256+oy,128,128,dx,dy,CELL_PX,CELL_PX);c.globalAlpha=1;}
  function transitionNeighbor(region,wx,wy){const samples=[regionAt(wx-TILE_WORLD*.82,wy),regionAt(wx+TILE_WORLD*.82,wy),regionAt(wx,wy-TILE_WORLD*.82),regionAt(wx,wy+TILE_WORLD*.82)];const counts=new Map();for(const r of samples)if(r!==region)counts.set(r,(counts.get(r)||0)+1);let winner=null,count=0;for(const[r,n]of counts)if(n>count){winner=r;count=n;}return winner?{region:winner,count}:null;}
  function drawCell(c,region,gx,gy,wx,wy,dx,dy){drawBaseCrop(c,region,gx,gy,dx,dy,1,71);const transition=transitionNeighbor(region,wx,wy);if(transition){const alpha=.12+transition.count*.055;drawBaseCrop(c,transition.region,gx,gy,dx,dy,alpha,173);state.transitionCells++;}const row=rows[region],s=strength(region,wx,wy);if(s>.06){const h2=hash(gx,gy,113),fx=crop(h2),fy=crop(h2>>>5);c.globalAlpha=.18+s*.44;c.drawImage(atlas,256+fx,row*256+fy,128,128,dx,dy,CELL_PX,CELL_PX);c.globalAlpha=1;}const density={village:17,meadow:13,grove:12,fen:14,copper:15,stonepine:13,den:18}[region];if(s<.22&&hash(gx,gy,151)%density===0){const size=14+(hash(gx,gy,193)%8),pad=(CELL_PX-size)/2;c.globalAlpha=.48;c.drawImage(atlas,512,row*256,256,256,dx+pad,dy+pad,size,size);c.globalAlpha=1;state.lastDecal=`build47-${region}`;}}
  function buildChunk(cx,cy){const canvas=document.createElement('canvas');canvas.width=CHUNK_PX;canvas.height=CHUNK_PX;const c=canvas.getContext('2d',{alpha:false}),wx0=cx*CHUNK_WORLD,wy0=cy*CHUNK_WORLD;for(let ty=0;ty<CHUNK_TILES;ty++)for(let tx=0;tx<CHUNK_TILES;tx++){const wx=wx0+(tx+.5)*TILE_WORLD,wy=wy0+(ty+.5)*TILE_WORLD,region=regionAt(wx,wy),gx=Math.floor(wx/TILE_WORLD),gy=Math.floor(wy/TILE_WORLD);drawCell(c,region,gx,gy,wx,wy,tx*CELL_PX,ty*CELL_PX);}state.cacheBuilds++;return{canvas,last:++clock};}
  function chunk(cx,cy){const key=`${cx},${cy}`;let entry=cache.get(key);if(entry){entry.last=++clock;state.cacheHits++;return entry;}state.cacheMisses++;entry=buildChunk(cx,cy);cache.set(key,entry);if(cache.size>CACHE_LIMIT){let victim=null,old=Infinity;for(const[k,v]of cache)if(v.last<old){old=v.last;victim=k;}if(victim){cache.delete(victim);state.evictions++;}}state.activeCache=cache.size;return entry;}
  function enabled(){return Boolean(requested&&state.ready&&!state.failed);}
  function drawOwnedGround(){const region=regionAt(camera.x,camera.y);ctx.fillStyle=bg[region]||'#465047';ctx.fillRect(0,0,viewport.w,viewport.h);state.frameChunks=0;state.frameCells=0;state.transitionCells=0;const centerCx=Math.floor(camera.x/CHUNK_WORLD),centerCy=Math.floor(camera.y/CHUNK_WORLD),unit=PIXEL_WORLD;for(let cy=centerCy-1;cy<=centerCy+1;cy++)for(let cx=centerCx-1;cx<=centerCx+1;cx++){const entry=chunk(cx,cy),p=worldToScreen(cx*CHUNK_WORLD,cy*CHUNK_WORLD);ctx.save();ctx.translate(p.x,p.y);ctx.transform(.78*camera.zoom*unit,.39*camera.zoom*unit,-.78*camera.zoom*unit,.39*camera.zoom*unit,0,0);ctx.drawImage(entry.canvas,0,0);ctx.restore();state.frameChunks++;state.frameCells+=64;}}

  const priorGround=drawGround;
  drawGround=function build47OwnedGround(zone){if(!enabled())return priorGround(zone);drawOwnedGround();};

  const priorState=debug.getGroundV2State?.bind(debug);
  if(priorState){debug.getGroundV2State=()=>{const baseState=priorState();if(!enabled())return baseState;return{...baseState,enabled:true,ready:true,failed:false,physicalTileCount:21,sourceMode:'build47-physical-tiles',cacheBuilds:state.cacheBuilds,cacheHits:state.cacheHits,cacheMisses:state.cacheMisses,evictions:state.evictions,activeCache:cache.size,maxCache:state.maxCache,frameChunks:state.frameChunks,frameCells:state.frameCells,lastDecal:state.lastDecal};};}
  debug.getSourceGround47State=()=>({...state,enabled:enabled(),activeCache:cache.size,currentRegion:regionAt(camera.x,camera.y)});
})();