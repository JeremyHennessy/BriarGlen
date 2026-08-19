(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  const requested=!params.get('artScope')&&params.get('canvasArt')!=='1'&&params.get('generatedArt')!=='0'&&params.get('env46')!=='0';
  const pack=window.__BRIAR_GLEN_GENERATED_ART,debug=window.__BRIAR_GLENDebug;
  if(!pack?.atlas||!pack?.sprites||!debug)return;

  const state={version:'build46b-environment-v1',requested,ready:false,failed:false,assetCount:0,placementCount:0,frameDraws:0,totalDraws:0,assets:{},regions:{},baseline:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}};
  const atlas=new Image();atlas.decoding='async';atlas.onload=()=>state.ready=true;atlas.onerror=()=>{state.failed=true;state.ready=false};atlas.src=pack.atlas;
  const defs=Object.freeze({
    bg46_market_stall_b:[['shed',0,0,.72,1,false],['crate',-42,8,.38,.9,false],['flower_clump',45,10,.34,.85,false]],
    bg46_village_well_b:[['well',0,2,.62,.9,false],['lamp',42,2,.42,.8,false]],
    bg46_lantern_post_b:[['lamp',0,0,.82,.94,false],['signpost',-22,8,.32,.72,true]],
    bg46_supply_handcart_a:[['wagon',0,5,.56,.94,true],['sack',34,10,.34,.82,false]],
    bg46_fence_b:[['fence',0,8,.72,.86,false],['flower_clump',36,12,.30,.76,false]],
    bg46_signpost_b:[['signpost',0,0,.64,.9,false],['rock',24,12,.24,.58,false]],
    bg46_garden_patch_b:[['flower_clump',-22,10,.42,.86,false],['herb_clump',22,11,.38,.82,false],['trough',0,14,.30,.62,false]],
    bg46_washline_a:[['fence',0,9,.50,.66,false],['sack',-20,6,.24,.70,false],['sack',20,6,.22,.60,true]],
    bg46_meadow_shrub_a:[['bush',0,9,.54,.88,false],['herb_clump',24,12,.28,.72,false]],
    bg46_meadow_shrub_b:[['bush',0,10,.46,.84,true],['flower_clump',-22,12,.30,.78,false]],
    bg46_fieldstone_cluster_a:[['rock',-18,10,.34,.78,false],['rock',17,13,.24,.68,true],['rock',2,15,.18,.55,false]],
    bg46_stump_log_a:[['stump',-16,8,.38,.82,false],['log_pile',20,13,.32,.72,false]],
    bg46_wildflower_patch_a:[['flower_clump',-16,11,.34,.85,false],['flower_clump',18,13,.28,.72,true]],
    bg46_roadside_marker_a:[['signpost',0,3,.44,.78,false],['rock',22,13,.22,.55,false]],
    bg46_mushroom_cluster_b:[['mooncap_clump',-16,12,.40,.9,false],['mooncap_clump',18,13,.28,.72,true]],
    bg46_mushroom_cluster_c:[['mooncap_clump',0,11,.34,.84,false],['stump',22,12,.28,.62,false]],
    bg46_mossy_stump_b:[['stump',0,9,.44,.82,false],['mooncap_clump',22,12,.26,.66,false]],
    bg46_grove_ruin_fragment_a:[['rock',-12,10,.42,.68,false],['rock',20,13,.28,.58,true],['stump',4,8,.24,.52,false]],
    bg46_grove_ruin_fragment_b:[['rock',0,10,.38,.66,false],['fence',26,10,.28,.48,true]],
    bg46_root_arch_a:[['stump',-25,8,.34,.70,false],['stump',25,8,.34,.70,true],['log_pile',0,-5,.34,.62,false]],
    bg46_fen_reeds_a:[['herb_clump',-14,11,.34,.60,false],['herb_clump',16,13,.28,.52,true]],
    bg46_fen_reeds_b:[['herb_clump',0,11,.38,.58,false],['bush',24,13,.24,.42,false]],
    bg46_fen_wet_root_a:[['stump',0,9,.40,.58,false],['herb_clump',22,13,.25,.46,false]],
    bg46_fen_plank_marker_a:[['fence',0,10,.42,.50,false],['signpost',24,4,.32,.60,false]],
    bg46_fen_lily_patch_a:[['flower_clump',-15,12,.28,.48,false],['flower_clump',16,13,.24,.42,true]],
    bg46_fen_bog_post_a:[['signpost',0,3,.46,.62,false],['herb_clump',21,13,.24,.42,false]],
    bg46_mine_brace_a:[['fence',0,7,.66,.72,false],['stump',-30,7,.28,.60,false],['stump',30,7,.28,.60,true]],
    bg46_mine_brace_b:[['fence',0,8,.58,.68,true],['crate',28,12,.28,.62,false]],
    bg46_quarry_toolpile_a:[['crate',-16,11,.34,.72,false],['barrel',17,10,.30,.68,false],['icon_pickaxe',4,0,.36,.62,false]],
    bg46_quarry_rubble_a:[['rock',-18,11,.38,.72,false],['rock',17,13,.28,.60,true]],
    bg46_quarry_rubble_b:[['rock',0,10,.42,.68,true],['rock',27,14,.22,.52,false],['rock',-25,14,.20,.48,false]],
    bg46_ore_spoil_a:[['copper_ore',0,10,.46,.82,false],['rock',31,14,.22,.50,false]],
    bg46_rail_fragment_a:[['fence',0,14,.48,.54,false],['path_stones',0,16,.38,.42,false]],
    bg46_timber_rack_a:[['fence',0,8,.58,.62,false],['log_pile',0,13,.38,.74,false]],
    bg46_resin_station_a:[['barrel',-14,10,.34,.70,false],['log_pile',18,13,.32,.68,false],['signpost',30,4,.24,.48,false]],
    bg46_pine_stump_a:[['stump',0,9,.40,.74,false],['log_pile',22,13,.26,.56,false]],
    bg46_logpile_b:[['log_pile',0,12,.42,.72,true],['stump',28,11,.24,.54,false]],
    bg46_frontier_lean_to_a:[['shed',0,4,.58,.72,false],['log_pile',34,13,.28,.58,false]],
    bg46_gravel_berm_a:[['rock',-20,12,.32,.62,false],['rock',16,13,.26,.56,true],['path_stones',0,15,.38,.38,false]],
    bg46_scorched_rock_a:[['rock',0,10,.42,.58,false],['campfire',23,12,.18,.38,false]],
    bg46_scorched_rock_b:[['rock',0,10,.36,.56,true],['rock',26,14,.24,.46,false],['campfire',-24,12,.15,.32,false]],
    bg46_ember_vent_a:[['campfire',0,11,.30,.58,false],['rock',20,14,.20,.40,false]],
    bg46_char_pile_a:[['log_pile',0,12,.36,.50,false],['campfire',0,8,.18,.42,false]],
    bg46_den_spike_marker_a:[['signpost',0,3,.42,.50,false],['stump',22,11,.22,.42,false]],
    bg46_heated_outcrop_a:[['rock',0,10,.44,.58,false],['campfire',0,7,.14,.36,false],['rock',28,13,.20,.40,true]],
    bg46_wooden_footbridge_a:[['path_stones',0,14,.62,.50,false],['fence',-30,6,.34,.56,false],['fence',30,6,.34,.56,true]],
    bg46_campfire_cauldron_a:[['campfire',0,9,.52,.78,false],['barrel',22,12,.24,.50,false],['log_pile',-24,13,.22,.48,false]],
  });
  state.assetCount=Object.keys(defs).length;
  function enabled(){return Boolean(requested&&state.ready&&!state.failed&&debug.isGeneratedArtEnabled?.());}
  function visible(o,margin=180){const p=worldToScreen(o.x,o.y);return p.x>-margin&&p.x<viewport.w+margin&&p.y>-margin&&p.y<viewport.h+margin;}
  function part(name,o,dx,dy,scale,alpha,flip){const f=pack.sprites[name];if(!f||!visible(o))return false;const p=worldToScreen(o.x,o.y),z=camera.zoom*scale,w=f.width*z,h=f.height*z;ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x+dx*camera.zoom,0);if(flip)ctx.scale(-1,1);ctx.drawImage(atlas,f.sx,f.sy,f.sw,f.sh,-w/2,p.y+dy*camera.zoom-h*f.anchor,w,h);ctx.restore();state.frameDraws++;state.totalDraws++;return true;}
  function composite(id,o){if(!enabled())return false;const d=defs[id];if(!d)return false;let drew=false;for(const p of d)drew=part(p[0],o,p[1],p[2],p[3],p[4],p[5])||drew;if(drew)state.assets[id]=(state.assets[id]||0)+1;return drew;}
  const placements=new Map();
  function bind(o,id){if(!o||!defs[id])return;let a=placements.get(o);if(!a){a=[];placements.set(o,a);}a.push(id);state.placementCount++;}
  function sorted(filter){return worldObjects.filter(filter).sort((a,b)=>a.x-b.x||a.y-b.y);}
  function closest(x,y,filter){let best=null,bd=Infinity;for(const o of worldObjects){if(filter&&!filter(o))continue;const d=Math.hypot(o.x-x,o.y-y);if(d<bd){bd=d;best=o;}}return best;}
  bind(worldObjects.find(o=>o.type==='merchant'),'bg46_market_stall_b');bind(worldObjects.find(o=>o.type==='well'),'bg46_village_well_b');bind(worldObjects.find(o=>o.type==='board'),'bg46_lantern_post_b');bind(worldObjects.find(o=>o.type==='forge'),'bg46_supply_handcart_a');
  const cottages=sorted(o=>o.type==='cottage');bind(cottages[0]||closest(-720,260),'bg46_fence_b');bind(cottages[1]||closest(-820,-220),'bg46_signpost_b');bind(cottages[2]||cottages[0]||closest(-650,330),'bg46_garden_patch_b');bind(cottages[3]||cottages[1]||closest(-880,80),'bg46_washline_a');
  const meadow=sorted(o=>['tree','bush'].includes(o.type)&&o.x>-210&&o.x<660&&o.y>-430);['bg46_meadow_shrub_a','bg46_meadow_shrub_b','bg46_fieldstone_cluster_a','bg46_stump_log_a','bg46_wildflower_patch_a','bg46_roadside_marker_a'].forEach((id,i)=>bind(meadow[i]||closest(-80+i*120,(i%2?260:-260),o=>['tree','bush'].includes(o.type)),id));
  const grove=sorted(o=>o.x>=-80&&o.x<=900&&o.y<=-430&&['tree','bush','ruin','groveCache'].includes(o.type));['bg46_mushroom_cluster_b','bg46_mushroom_cluster_c','bg46_mossy_stump_b','bg46_grove_ruin_fragment_a','bg46_grove_ruin_fragment_b','bg46_root_arch_a'].forEach((id,i)=>bind(grove[i]||closest(420+i*45,-650-i*25),id));
  const fen=sorted(o=>['fenTree','fenRuin','fenCache'].includes(o.type));['bg46_fen_reeds_a','bg46_fen_reeds_b','bg46_fen_wet_root_a','bg46_fen_plank_marker_a','bg46_fen_lily_patch_a','bg46_fen_bog_post_a'].forEach((id,i)=>bind(fen[i]||closest(1180+i*120,-1450-i*70),id));
  const copper=sorted(o=>o.x>=660&&o.x<1430&&['rock','deadTree','quarryRock'].includes(o.type));['bg46_mine_brace_a','bg46_mine_brace_b','bg46_quarry_toolpile_a','bg46_quarry_rubble_a','bg46_quarry_rubble_b','bg46_ore_spoil_a','bg46_rail_fragment_a'].forEach((id,i)=>bind(copper[i]||closest(760+i*90,(i%2?320:-320),o=>['rock','deadTree','quarryRock'].includes(o.type)),id));
  const stone=sorted(o=>['stonepineTree','quarryRock','stonepineCamp'].includes(o.type));['bg46_timber_rack_a','bg46_resin_station_a','bg46_pine_stump_a','bg46_logpile_b','bg46_frontier_lean_to_a','bg46_gravel_berm_a'].forEach((id,i)=>bind(stone[i]||closest(2450+i*140,-1450-i*60),id));
  const den=sorted(o=>o.x>=1430&&['denRock','ember'].includes(o.type));['bg46_scorched_rock_a','bg46_scorched_rock_b','bg46_ember_vent_a','bg46_char_pile_a','bg46_den_spike_marker_a','bg46_heated_outcrop_a'].forEach((id,i)=>bind(den[i]||closest(1550+i*95,(i%2?310:-310),o=>['denRock','ember'].includes(o.type)),id));
  bind(worldObjects.find(o=>o.type==='fenGate')||worldObjects.find(o=>o.type==='shortcut'),'bg46_wooden_footbridge_a');bind(worldObjects.find(o=>o.type==='stonepineCamp')||worldObjects.find(o=>o.type==='forge'),'bg46_campfire_cauldron_a');
  const prior=drawObject;drawObject=function build46EnvironmentObject(o){const result=prior(o);if(enabled()){const ids=placements.get(o);if(ids)for(const id of ids)composite(id,o);}return result;};
  window.__BRIAR_GLEN_RUNTIME?.registerHook?.('beforeDraw','build46-environment-reset',()=>{state.frameDraws=0;},2110);
  debug.getEnvironment46State=()=>({version:state.version,requested:state.requested,enabled:enabled(),ready:state.ready,failed:state.failed,assetCount:state.assetCount,placementCount:state.placementCount,frameDraws:state.frameDraws,totalDraws:state.totalDraws,registered:Object.keys(defs),assets:{...state.assets},baseline:{...state.baseline},current:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length}});
})();