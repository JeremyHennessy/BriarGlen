# Build 46 — Exact Asset Manifest

Status: production manifest for Build 46A/46B/46C.

## Build 46A — Ground System Foundation (49 named assets)

### Base material families (21)
- `bg46_village_earth_a`
- `bg46_village_earth_b`
- `bg46_village_earth_c`
- `bg46_meadow_grass_a`
- `bg46_meadow_grass_b`
- `bg46_meadow_grass_c`
- `bg46_grove_floor_a`
- `bg46_grove_floor_b`
- `bg46_grove_floor_c`
- `bg46_fen_mud_a`
- `bg46_fen_mud_b`
- `bg46_fen_mud_c`
- `bg46_copper_dust_a`
- `bg46_copper_dust_b`
- `bg46_copper_dust_c`
- `bg46_stonepine_floor_a`
- `bg46_stonepine_floor_b`
- `bg46_stonepine_floor_c`
- `bg46_den_ground_a`
- `bg46_den_ground_b`
- `bg46_den_ground_c`

### Functional surfaces (7)
- `bg46_village_workyard`
- `bg46_meadow_path`
- `bg46_grove_ruin_floor`
- `bg46_fen_wetstone`
- `bg46_copper_rubble`
- `bg46_stonepine_gravel`
- `bg46_den_cracked_stone`

### Transition assets (14)
- `bg46_trans_village_yard_work_edge`
- `bg46_trans_village_yard_work_corner`
- `bg46_trans_meadow_grass_path_edge`
- `bg46_trans_meadow_grass_path_corner`
- `bg46_trans_grove_floor_ruin_edge`
- `bg46_trans_grove_floor_ruin_corner`
- `bg46_trans_fen_mud_water_edge`
- `bg46_trans_fen_mud_water_corner`
- `bg46_trans_copper_dirt_rubble_edge`
- `bg46_trans_copper_dirt_rubble_corner`
- `bg46_trans_stonepine_dirt_gravel_edge`
- `bg46_trans_stonepine_dirt_gravel_corner`
- `bg46_trans_den_ash_rock_edge`
- `bg46_trans_den_ash_rock_corner`

### Sparse decals (7)
- `bg46_decal_village_pebbles`
- `bg46_decal_meadow_wildflower`
- `bg46_decal_grove_moss_leaves`
- `bg46_decal_fen_reeds_muck`
- `bg46_decal_copper_chips`
- `bg46_decal_stonepine_needles`
- `bg46_decal_den_ash`

Implementation note: the 49 runtime masters are generated deterministically at initialization and precomposed into cached terrain chunks; persistent terrain is not regenerated during frames. The production names are stable even if a future offline painted atlas replaces the procedural source implementation.

## Build 46B — Environment Variation (47 named environment assets)

### Briar Glen (8)
- `bg46_market_stall_b`
- `bg46_village_well_b`
- `bg46_lantern_post_b`
- `bg46_supply_handcart_a`
- `bg46_fence_b`
- `bg46_signpost_b`
- `bg46_garden_patch_b`
- `bg46_washline_a`

### Meadow Road (6)
- `bg46_meadow_shrub_a`
- `bg46_meadow_shrub_b`
- `bg46_fieldstone_cluster_a`
- `bg46_stump_log_a`
- `bg46_wildflower_patch_a`
- `bg46_roadside_marker_a`

### Mooncap Grove (6)
- `bg46_mushroom_cluster_b`
- `bg46_mushroom_cluster_c`
- `bg46_mossy_stump_b`
- `bg46_grove_ruin_fragment_a`
- `bg46_grove_ruin_fragment_b`
- `bg46_root_arch_a`

### Mosswater Fen (6)
- `bg46_fen_reeds_a`
- `bg46_fen_reeds_b`
- `bg46_fen_wet_root_a`
- `bg46_fen_plank_marker_a`
- `bg46_fen_lily_patch_a`
- `bg46_fen_bog_post_a`

### Copper Hollow (7)
- `bg46_mine_brace_a`
- `bg46_mine_brace_b`
- `bg46_quarry_toolpile_a`
- `bg46_quarry_rubble_a`
- `bg46_quarry_rubble_b`
- `bg46_ore_spoil_a`
- `bg46_rail_fragment_a`

### Stonepine Reach (6)
- `bg46_timber_rack_a`
- `bg46_resin_station_a`
- `bg46_pine_stump_a`
- `bg46_logpile_b`
- `bg46_frontier_lean_to_a`
- `bg46_gravel_berm_a`

### Emberback Den (6)
- `bg46_scorched_rock_a`
- `bg46_scorched_rock_b`
- `bg46_ember_vent_a`
- `bg46_char_pile_a`
- `bg46_den_spike_marker_a`
- `bg46_heated_outcrop_a`

### Shared traversal (2)
- `bg46_wooden_footbridge_a`
- `bg46_campfire_cauldron_a`

46B may implement a named asset as a production composite of already-approved atlas sprites when the result has a distinct readable silhouette and does not require new collision. A composite name remains stable and can later be replaced by dedicated source art without changing placement contracts.

## Build 46C — Conditional state art (10 slots)

These are created/activated only if the 46B proof shows the current composed state is not clear enough. Do not add them merely to increase asset count.

- `bg46_grove_cache_claimed`
- `bg46_fen_cache_claimed`
- `bg46_stonepine_cache_claimed`
- `bg46_fen_gate_open`
- `bg46_stonepine_gate_open`
- `bg46_copper_depleted`
- `bg46_iron_depleted`
- `bg46_mossglass_depleted`
- `bg46_resin_depleted`
- `bg46_rootway_active_marker`

## Rollbacks
- 46A: `?groundV2=0`
- 46B: `?env46=0`
- 46C: `?terrainPolish=0`

All existing `?generatedArt=0`, `?canvasArt=1`, historical `artScope`, `?assetVariants=0`, `?landmarkPolish=0`, and `?layoutV1=1` recovery paths remain valid unless a later explicitly approved build changes that policy.
