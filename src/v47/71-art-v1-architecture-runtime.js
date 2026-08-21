(() => {
  'use strict';

  const params=new URLSearchParams(location.search);
  const proofKeys=['assetVariantProof','landmarkStateProof','env46proof','envperf','terrain46','tperf','generatedArtSmoke','dressing','layoutProof','renderPerf','build30Recovery'];
  const historicalProof=[...params.keys()].some(k=>proofKeys.includes(k));
  const requested=params.get('artV1Architecture')==='1'&&!historicalProof;
  const debug=window.__BRIAR_GLENDebug;
  if(!debug)return;

  const FAMILY_ID='briar-glen-art-v1';
  const RECIPE_ID='briar-glen-art-v1-painted-family-v1';
  const VERSION='art-v1-architecture-preview-v1';
  const ATLAS_W=1024,ATLAS_H=1024;
  const roles=Object.freeze({
    cottage:{rect:[42,21,216,242],anchor:.96,target:190},
    tavern:{rect:[331,20,350,248],anchor:.96,target:210},
    board:{rect:[757,51,238,157],anchor:.93,target:118},
    forge:{rect:[35,348,280,311],anchor:.97,target:190},
    market:{rect:[386,364,266,180],anchor:.94,target:135},
    alchemy:{rect:[720,373,272,162],anchor:.94,target:122},
    well:{rect:[32,734,186,198],anchor:.94,target:125},
    gate:{rect:[308,750,410,152],anchor:.92,target:108},
  });
  const ownedTypes=new Set(['cottage','tavern','forge','merchant','alchemy','well','board','fenGate','stonepineGate']);
  const baseline={objects:worldObjects.length,resources:resources.length,enemies:enemies.length};
  const state={
    version:VERSION,familyId:FAMILY_ID,recipeId:RECIPE_ID,requested,historicalProof,
    ready:!requested,enabled:false,failed:false,failClosed:true,fallbackUsed:false,legacyArchitectureUsed:false,
    atlasPath:'assets/art-v1/architecture/architecture-atlas-v1.webp',atlasWidth:0,atlasHeight:0,
    frameDraws:0,totalDraws:0,draws:{},gateDraws:{locked:0,open:0},
    baseline,roleCount:Object.keys(roles).length,sourceMasterCount:8,entityLayoutPreserved:true,
  };

  const atlas=new Image();atlas.decoding='async';
  if(requested){
    atlas.onload=()=>{
      state.atlasWidth=atlas.naturalWidth;state.atlasHeight=atlas.naturalHeight;
      if(state.atlasWidth!==ATLAS_W||state.atlasHeight!==ATLAS_H){state.failed=true;state.ready=false;state.enabled=false;return;}
      state.ready=true;state.enabled=true;
    };
    atlas.onerror=()=>{state.failed=true;state.ready=false;state.enabled=false;};
    atlas.src=`${state.atlasPath}?v=architecture-v1`;
  }

  function stable01(o,salt=1){let h=(Math.round((o.x||0)*11)^Math.round((o.y||0)*17)^salt^String(o.type||'').split('').reduce((a,c)=>Math.imul(a^c.charCodeAt(0),16777619),2166136261))>>>0;h^=h>>>16;h=Math.imul(h,2246822507)>>>0;h^=h>>>13;return(h>>>0)/4294967296;}
  function roleFor(o){switch(o?.type){case'cottage':return'cottage';case'tavern':return'tavern';case'forge':return'forge';case'merchant':return'market';case'alchemy':return'alchemy';case'well':return'well';case'board':return'board';case'fenGate':case'stonepineGate':return'gate';default:return null;}}
  function visible(p,w,h,m=260){return p.x+w/2>-m&&p.x-w/2<viewport.w+m&&p.y>-m&&p.y-h<viewport.h+m;}
  function record(role){state.frameDraws++;state.totalDraws++;state.draws[role]=(state.draws[role]||0)+1;}
  function drawRole(role,o){
    const def=roles[role];if(!def)return false;
    const [sx,sy,sw,sh]=def.rect,p=worldToScreen(o.x,o.y);
    const objectScale=Number.isFinite(o.s)?Math.max(.88,Math.min(1.14,o.s)):1;
    const individual=(role==='cottage'?(.97+stable01(o,71)*.06):1);
    const h=def.target*objectScale*individual*camera.zoom,w=h*(sw/sh);
    if(!visible(p,w,h))return true;
    const flip=role==='cottage'&&stable01(o,73)>.5;
    ctx.save();ctx.translate(p.x,p.y);if(flip)ctx.scale(-1,1);ctx.drawImage(atlas,sx,sy,sw,sh,-w/2,-h*def.anchor,w,h);ctx.restore();
    record(role);return true;
  }
  function gateOpen(o){return o.type==='fenGate'?Boolean(progress.fenCrossingOpened):Boolean(progress.stonepinePassOpened);}
  function drawGateState(o){
    const open=gateOpen(o),p=worldToScreen(o.x,o.y),z=camera.zoom;
    if(open){
      const g=ctx.createRadialGradient(p.x,p.y-4*z,2,p.x,p.y-4*z,56*z);g.addColorStop(0,'rgba(210,217,150,.12)');g.addColorStop(1,'rgba(210,217,150,0)');ctx.fillStyle=g;ctx.fillRect(p.x-60*z,p.y-64*z,120*z,72*z);state.gateDraws.open++;
    }else{
      ctx.save();ctx.translate(p.x,p.y-28*z);ctx.rotate(-.08);ctx.lineCap='round';ctx.strokeStyle='rgba(78,55,37,.96)';ctx.lineWidth=9*z;ctx.beginPath();ctx.moveTo(-44*z,0);ctx.lineTo(45*z,0);ctx.stroke();ctx.strokeStyle='rgba(210,174,111,.17)';ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(-40*z,-2*z);ctx.lineTo(39*z,-2*z);ctx.stroke();ctx.restore();state.gateDraws.locked++;
    }
  }
  function drawLabel(o,role){
    const p=worldToScreen(o.x,o.y),z=camera.zoom;
    if(role==='tavern')labelAt(p.x,p.y-218*z,'THE HEARTH & BRIAR');
    else if(role==='forge')labelAt(p.x,p.y-198*z,'ALDEN • SMITH');
    else if(role==='market')labelAt(p.x,p.y-145*z,'ROWAN • TRADER');
    else if(role==='alchemy')labelAt(p.x,p.y-136*z,'MIRA • ALCHEMY');
    else if(role==='board')labelAt(p.x,p.y-120*z,'CONTRACT BOARD');
    else if(o.type==='fenGate')labelAt(p.x,p.y-112*z,'MOSSWATER CROSSING');
    else if(o.type==='stonepineGate')labelAt(p.x,p.y-112*z,'STONEPINE PASS');
  }

  const priorObject=drawObject;
  drawObject=function artV1ArchitectureObject(o){
    if(!requested||!ownedTypes.has(o?.type))return priorObject(o);
    state.fallbackUsed=false;state.legacyArchitectureUsed=false;
    if(!state.ready||state.failed)return;
    const role=roleFor(o);if(!role||!roles[role]){state.failed=true;state.enabled=false;return;}
    if(!drawRole(role,o)){state.failed=true;state.enabled=false;return;}
    if(role==='gate')drawGateState(o);
    drawLabel(o,role);
  };

  window.__BRIAR_GLEN_RUNTIME?.registerHook?.('beforeDraw','art-v1-architecture-frame-reset',()=>{state.frameDraws=0;},2100);
  debug.getArtV1ArchitectureState=()=>({
    ...state,enabled:Boolean(requested&&state.ready&&!state.failed),draws:{...state.draws},gateDraws:{...state.gateDraws},baseline:{...baseline},
    current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
    gateState:{fen:Boolean(progress.fenCrossingOpened),stonepine:Boolean(progress.stonepinePassOpened)},
  });
  debug.getArtV1ArchitectureAnchors=()=>worldObjects.filter(o=>ownedTypes.has(o?.type)).map(o=>({type:o.type,role:roleFor(o),x:o.x,y:o.y,s:Number.isFinite(o.s)?o.s:1}));
})();
