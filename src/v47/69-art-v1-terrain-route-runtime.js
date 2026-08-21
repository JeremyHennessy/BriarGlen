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
  const VERSION = 'art-v1-terrain-route-v1-q75';
  const ATLAS_CELL = 96;
  const ATLAS_WIDTH = 288;
  const ATLAS_HEIGHT = 672;
  const rows = { village:0, meadow:1, grove:2, fen:3, copper:4, stonepine:5, den:6 };
  const routeWidths = { village:112, meadow:132, grove:88, fen:86, copper:122, stonepine:88, den:104 };
  const routeSets = [
    {region:'village',points:[[-900,145],[-825,-75],[-765,-265],[-620,-300],[-445,-205],[-350,-70],[-390,120],[-485,255],[-650,315],[-825,275],[-900,145]]},
    {region:'village',points:[[-930,30],[-790,30],[-650,20],[-500,15],[-345,20],[-235,15]]},
    {region:'meadow',points:[[-245,15],[-120,72],[20,42],[150,-45],[300,-35],[445,72],[585,35],[675,5]]},
    {region:'grove',points:[[95,-12],[125,-190],[185,-350],[270,-520],[420,-650],[555,-735],[650,-820]]},
    {region:'grove',points:[[650,-820],[760,-730],[805,-580],[690,-505],[535,-545],[420,-650],[505,-790],[650,-820]],widthScale:.78},
    {region:'copper',points:[[650,5],[760,85],[900,35],[1035,-35],[1165,55],[1295,-45],[1415,5]]},
    {region:'den',points:[[1410,5],[1515,72],[1635,38],[1740,-62],[1870,-35],[1995,72],[2110,92]]},
    {region:'fen',points:[[1010,-1200],[1125,-1325],[1215,-1450],[1360,-1545],[1450,-1690],[1515,-1830]]},
    {region:'fen',points:[[1515,-1830],[1690,-1770],[1840,-1640],[1760,-1485],[1575,-1515],[1450,-1690]],widthScale:.74},
    {region:'stonepine',points:[[2240,-1500],[2390,-1450],[2520,-1515],[2690,-1365],[2840,-1495],[2980,-1640],[3190,-1840]]},
    {region:'stonepine',points:[[2690,-1365],[2790,-1235],[3015,-1415],[3190,-1840],[3000,-1945],[2740,-1605],[2690,-1365]],widthScale:.72},
  ];
  const rootway = {region:'grove',points:[[2070,115],[1850,360],[1420,500],[900,545],[250,520],[-300,440],[-845,-205]],widthScale:.50};

  const state = {
    version:VERSION, familyId:FAMILY_ID, recipeId:RECIPE_ID, requested,
    ready:!requested, failed:false, atlasWidth:0, atlasHeight:0,
    routeOwner:'art-v1-q75-polyline-dabs', legacyRouteUsed:false,
    drawCalls:0, frameDabs:0, visibleRoutes:0,
  };

  const atlas = new Image();
  atlas.decoding = 'async';
  if (requested) {
    atlas.onload = () => {
      state.atlasWidth = atlas.naturalWidth;
      state.atlasHeight = atlas.naturalHeight;
      if (state.atlasWidth !== ATLAS_WIDTH || state.atlasHeight !== ATLAS_HEIGHT) {
        state.failed = true; state.ready = false; return;
      }
      state.ready = true;
    };
    atlas.onerror = () => { state.failed = true; state.ready = false; };
    atlas.src = 'assets/art-v1/terrain/terrain-atlas-v1.webp?v=terrain-route-v1-q75';
  }

  const dabCache = new Map();
  function hash(a,b,c=1){let h=(2166136261^c)>>>0;for(const v of[a,b,c]){h^=v|0;h=Math.imul(h,16777619)>>>0;h^=h>>>13;}return h>>>0;}
  function routeDab(region,variant){
    const key=`${region}:${variant}`;
    if(dabCache.has(key))return dabCache.get(key);
    const size=144,cn=document.createElement('canvas');cn.width=cn.height=size;
    const c=cn.getContext('2d'),row=rows[region],seed=row*41+variant*73+19;
    c.imageSmoothingEnabled=true;
    c.drawImage(atlas,ATLAS_CELL,row*ATLAS_CELL,ATLAS_CELL,ATLAS_CELL,0,0,size,size);
    const mask=document.createElement('canvas');mask.width=mask.height=size;const m=mask.getContext('2d');
    m.globalCompositeOperation='lighter';
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2+seed*.091;
      const offset=i===0?0:size*(.08+.025*((seed+i)%4));
      const cx=size*.5+Math.cos(a)*offset,cy=size*.5+Math.sin(a)*offset;
      const rx=size*(i===0?.44:.29+.018*((seed+i)%5));
      const g=m.createRadialGradient(cx,cy,rx*.12,cx,cy,rx);
      g.addColorStop(0,'rgba(255,255,255,.98)');g.addColorStop(.60,'rgba(255,255,255,.86)');g.addColorStop(.86,'rgba(255,255,255,.34)');g.addColorStop(1,'rgba(255,255,255,0)');
      m.fillStyle=g;m.fillRect(0,0,size,size);
    }
    c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);c.globalCompositeOperation='source-over';
    dabCache.set(key,cn);return cn;
  }
  function visible(p,pad){return p.x>-pad&&p.x<viewport.w+pad&&p.y>-pad&&p.y<viewport.h+pad;}
  function paintWorldDab(region,wx,wy,angle,width,seed,alpha){
    const p=worldToScreen(wx,wy),pad=width*camera.zoom*1.6;if(!visible(p,pad))return false;
    const variant=seed%3,dab=routeDab(region,variant),length=width*(1.30+((seed>>>4)%13)/100);
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x,p.y);
    ctx.transform(.78*camera.zoom,.39*camera.zoom,-.78*camera.zoom,.39*camera.zoom,0,0);
    ctx.rotate(angle+(((seed>>>9)%11)-5)*Math.PI/180);
    ctx.drawImage(dab,-length/2,-width/2,length,width);ctx.restore();
    state.frameDabs++;return true;
  }
  function paintSegment(region,a,b,width,segmentIndex){
    const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<1)return false;
    const angle=Math.atan2(dy,dx),nx=-dy/len,ny=dx/len,spacing=Math.max(34,width*.30),steps=Math.max(1,Math.ceil(len/spacing));let any=false;
    for(let i=0;i<=steps;i++){
      const t=i/steps,seed=hash(segmentIndex,i,rows[region]+211),jitter=(((seed&1023)/1023)-.5)*width*.16;
      const wx=a[0]+dx*t+nx*jitter,wy=a[1]+dy*t+ny*jitter;
      any=paintWorldDab(region,wx,wy,angle,width,seed,.58)||any;
      if((i+segmentIndex)%3===0){
        const seed2=hash(segmentIndex,i,rows[region]+503),j2=((((seed2>>>3)&1023)/1023)-.5)*width*.10;
        paintWorldDab(region,wx+nx*j2,wy+ny*j2,angle,width*.72,seed2,.28);
      }
    }
    return any;
  }
  function paintRouteSet(set,setIndex){
    const width=(routeWidths[set.region]||96)*(set.widthScale||1);let any=false;
    for(let i=1;i<set.points.length;i++)any=paintSegment(set.region,set.points[i-1],set.points[i],width,setIndex*97+i)||any;
    if(any)state.visibleRoutes++;
  }
  function drawPainterlyRoutes(){
    if(!state.ready||state.failed)return;
    state.frameDabs=0;state.visibleRoutes=0;
    routeSets.forEach(paintRouteSet);
    if(typeof progress!=='undefined'&&progress?.shortcutUnlocked)paintRouteSet(rootway,routeSets.length+1);
    state.drawCalls++;
  }

  const priorRoute = drawRoute;
  drawRoute = function artV1TerrainPainterlyRoutes(...args){
    if(!requested)return priorRoute(...args);
    state.legacyRouteUsed=false;
    drawPainterlyRoutes();
  };

  debug.getArtV1TerrainRouteState = () => ({...state});
})();
