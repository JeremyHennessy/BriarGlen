(() => {
  'use strict';
  const params=new URLSearchParams(location.search),debug=window.__BRIAR_GLENDebug,runtime=window.__BRIAR_GLEN_RUNTIME;
  if(!debug||!runtime)return;
  const source47=debug.getSourceArt47State?.();
  const requested=params.get('sceneCohesion49')!=='0'&&params.get('livingCast48')!=='0'&&params.get('sourceArt47')!=='0'&&!source47?.historicalProof&&!params.get('artScope')&&params.get('canvasArt')!=='1'&&params.get('generatedArt')!=='0';
  const state={version:'build49-hub-meadow-cohesion-v2-reference-scale',requested,ready:!requested,failed:false,failure:'',frameDraws:0,totalDraws:0,culled:0,draws:{},baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}};
  const CELL=256,source=new Image();source.decoding='async';let atlas=null;
  const frames={
    flower_box:[0,0,70,46,.90],market_stall:[1,0,126,108,.92],smith_rack:[2,0,92,82,.92],herb_stall:[3,0,100,88,.92],
    handcart:[0,1,100,70,.88],hay_bundle:[1,1,72,48,.86],fence_section:[2,1,100,60,.90],direction_sign:[3,1,58,72,.93],
    wildflower_patch:[0,2,82,40,.78],roadside_stones:[1,2,78,42,.84],hedge_clump:[2,2,90,58,.84],lantern_post:[3,2,56,88,.94]
  };

  // The hub already owns full forge/alchemy/market structures. Build 49 adds supporting
  // details only; it does not duplicate another service building beside them.
  const props=[
    {id:'cottage-planter',region:'village',sprite:'flower_box',x:-905,y:392,s:.90,clearance:330},
    {id:'rowan-cart',region:'village',sprite:'handcart',x:-250,y:-310,s:.74,clearance:285},
    {id:'alden-tools',region:'village',sprite:'smith_rack',x:-550,y:344,s:.82,clearance:294},
    {id:'mira-planter',region:'village',sprite:'flower_box',x:-430,y:-350,s:.88,clearance:305},
    {id:'west-hay',region:'village',sprite:'hay_bundle',x:-835,y:382,s:.88,clearance:315},
    {id:'south-hay',region:'village',sprite:'hay_bundle',x:-710,y:420,s:.82,clearance:350},
    {id:'east-marker',region:'village',sprite:'direction_sign',x:-205,y:165,s:.82,clearance:160},
    {id:'east-lantern',region:'village',sprite:'lantern_post',x:-250,y:-245,s:.82,clearance:195},
    {id:'meadow-flowers-w1',region:'meadow',sprite:'wildflower_patch',x:-85,y:335,s:.90,clearance:275},
    {id:'meadow-stones-w1',region:'meadow',sprite:'roadside_stones',x:40,y:-345,s:.88,clearance:300},
    {id:'meadow-hedge-w1',region:'meadow',sprite:'hedge_clump',x:130,y:405,s:.86,clearance:365},
    {id:'meadow-flowers-mid-n',region:'meadow',sprite:'wildflower_patch',x:260,y:-405,s:.94,clearance:365},
    {id:'meadow-hay-mid-s',region:'meadow',sprite:'hay_bundle',x:325,y:390,s:.84,clearance:350},
    {id:'meadow-stones-mid-n',region:'meadow',sprite:'roadside_stones',x:405,y:-365,s:.90,clearance:325},
    {id:'meadow-flowers-east-s',region:'meadow',sprite:'wildflower_patch',x:515,y:360,s:.94,clearance:320},
    {id:'meadow-hedge-east-n',region:'meadow',sprite:'hedge_clump',x:570,y:-420,s:.86,clearance:380},
    {id:'meadow-fence-east-s',region:'meadow',sprite:'fence_section',x:625,y:315,s:.78,clearance:275},
    {id:'meadow-sign-fork',region:'meadow',sprite:'direction_sign',x:125,y:-260,s:.74,clearance:205}
  ].map(p=>({...p,depth:p.x+p.y})).sort((a,b)=>a.depth-b.depth);
  const laneSafetyViolations=props.filter(p=>p.clearance<155).length;

  source.onload=()=>{try{const c=document.createElement('canvas');c.width=1024;c.height=768;const x=c.getContext('2d',{alpha:true});x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(source,0,0);atlas=c;state.ready=true;}catch(error){state.failed=true;state.failure=String(error?.message||error);}};
  source.onerror=()=>{state.failed=true;state.failure='assets/v49/hub-meadow-props.svg';};
  source.src='assets/v49/hub-meadow-props.svg?v=49scale2';
  function enabled(){return Boolean(requested&&state.ready&&!state.failed&&debug.isSourceArt47Enabled?.()&&debug.isLivingCast48Enabled?.());}
  function visible(p,w,h){return p.x+w/2>-150&&p.x-w/2<viewport.w+150&&p.y>-150&&p.y-h<viewport.h+120;}
  function drawProp(prop){const f=frames[prop.sprite];if(!f||!atlas||!enabled())return false;const[col,row,nw,nh,anchor]=f,p=worldToScreen(prop.x,prop.y),z=camera.zoom*prop.s,w=nw*z,h=nh*z;if(!visible(p,w,h)){state.culled++;return true;}ctx.save();ctx.globalAlpha=.96;ctx.drawImage(atlas,col*CELL,row*CELL,CELL,CELL,p.x-w/2,p.y-h*anchor,w,h);ctx.restore();state.frameDraws++;state.totalDraws++;state.draws[prop.sprite]=(state.draws[prop.sprite]||0)+1;return true;}
  let cursor=0;
  function reset(){cursor=0;state.frameDraws=0;state.culled=0;}
  function flushTo(depth){if(!enabled())return;while(cursor<props.length&&props[cursor].depth<=depth)drawProp(props[cursor++]);}
  function flushAll(){if(!enabled())return;while(cursor<props.length)drawProp(props[cursor++]);}
  runtime.registerHook('beforeDraw','build49-scene-cohesion-reset',reset,2080);
  const priorObject=drawObject;drawObject=function build49SceneObject(o){flushTo(o.x+o.y);return priorObject(o);};
  const priorResource=drawResource;drawResource=function build49SceneResource(r){flushTo(r.x+r.y);return priorResource(r);};
  const priorEnemy=drawEnemy;drawEnemy=function build49SceneEnemy(e){flushTo(e.x+e.y);return priorEnemy(e);};
  const priorPlayer=drawPlayer;drawPlayer=function build49ScenePlayer(){flushTo(player.x+player.y);return priorPlayer();};
  const priorProjectiles=drawProjectiles;drawProjectiles=function build49SceneProjectiles(){flushAll();return priorProjectiles();};
  debug.isSceneCohesion49Enabled=enabled;
  debug.getSceneCohesion49State=()=>({version:state.version,requested:state.requested,enabled:enabled(),ready:state.ready,failed:state.failed,failure:state.failure,frameDraws:state.frameDraws,totalDraws:state.totalDraws,culled:state.culled,draws:{...state.draws},source:'assets/v49/hub-meadow-props.svg',propCount:props.length,villageProps:props.filter(p=>p.region==='village').length,meadowProps:props.filter(p=>p.region==='meadow').length,laneSafetyViolations,minLaneClearance:Math.min(...props.map(p=>p.clearance)),baseline:{...state.baseline},current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},source47Enabled:Boolean(debug.isSourceArt47Enabled?.()),cast48Enabled:Boolean(debug.isLivingCast48Enabled?.())});
})();