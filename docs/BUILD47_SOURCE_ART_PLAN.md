# Build 47 — Dedicated Source-Art Completion

Status: **active build plan**.

Base: Build 46 closeout `f58bbe27ea0d678c65e3bc2e3a26438987e95609`.
Branch: `agent/build47-source-art`.

Build 47 is presentation/source-art work only. It does not authorize gameplay, progression, economy, world-layout, collision, UI, save-schema or unrelated renderer changes.

## Goal

Replace the most visible semantic placeholder silhouettes and highest-value procedural/composite presentation sources with dedicated Briar Glen source art while preserving every proven gameplay contract and rollback path.

A source-art asset is not complete merely because a file exists or a test passes. It must be visually coherent with the approved Briar Glen family, readable at actual mobile gameplay scale, technically valid, integrated without regressions, and retained only if it is materially better than the placeholder it replaces.

## Art lock

All Build 47 source art must preserve the established Briar Glen direction:

- warm handcrafted storybook medieval fantasy;
- classic isometric MMORPG warmth, with Ragnarok-style readability as a tonal reference rather than anime styling;
- grounded materials and restrained colour;
- soft painterly treatment without glossy 3D or generic low-poly appearance;
- clear silhouette first, surface detail second;
- mobile readability at approximately 70–180 px depending on the asset class;
- 3/4 isometric/orthographic camera family consistent with the current approved atlas;
- soft warm upper-left light;
- transparent RGBA for isolated sprites;
- natural bottom-centre gameplay anchor;
- no labels, presentation boards, decorative frames or unrelated scenery.

## Hard preservation contract

Build 47 must preserve:

- save key `briar-glen-vslice-v1` and schema;
- canonical runtime manifest/hooks architecture;
- gameplay entity counts and interaction anchors unless explicitly authorized;
- enemy mechanics, hitboxes, telegraphs, HP, movement and spawn logic;
- World Layout V2;
- current phone HUD/tutorial behavior;
- Build 45 render-performance constraints;
- `?generatedArt=0`;
- `?canvasArt=1`;
- historical `artScope` recovery;
- `?assetVariants=0`;
- `?landmarkPolish=0`;
- `?layoutV1=1`;
- `?groundV2=0`;
- `?env46=0`;
- `?terrainPolish=0`.

Build 47 adds its own isolated rollback switch: `?sourceArt47=0`.

## Batch A — unique enemy silhouettes

These are first because the current generated runtime deliberately substitutes older silhouettes for mechanically distinct species.

| Order | Stable Build 47 source ID | Replaces current placeholder | Required silhouette read |
|---|---|---|---|
| 1 | `hollow_boar` | scaled/dimmed `emberback_boss` | ordinary stocky boar; lower shoulder mass; no boss emphasis |
| 2 | `bog_stalker` | altered `wolf_enemy` | long low fen predator, visibly distinct from wolf |
| 3 | `ridgehorn` | altered `emberback_boss` | horn-led mountain beast; narrower forward-running profile |
| 4 | `quarry_wisp` | altered `slime_enemy` | unmistakably hovering mineral/spirit ranged threat |
| 5 | `drowned_warden` | altered `grovekeeper` | heavy drowned/armoured vertical boss silhouette |
| 6 | `quarry_sentinel` | altered `grovekeeper` | broad stone/warden terminal-boss silhouette with telegraph clearance |

### Enemy integration rule

Do not change enemy objects or mechanics. Replace only the sprite selection used by the generated-art presentation layer. Existing telegraphs, status bars, hit flashes and facing logic remain separate from the sprite.

## Batch B — residential silhouettes

- `cottage_compact_02`: narrower residence, steeper roof, same material family.
- `cottage_long_03`: longer single-storey residence / attached workroom.
- `shed_work_02`: optional alternate utility/work shed if visual proof shows a meaningful gain.

Ordinary residences must remain subordinate to the tavern, forge and Warden House.

## Batch C — high-frequency environment masters

### Deciduous

- `tree_deciduous_02`
- `tree_deciduous_03`
- `tree_deciduous_gnarled_04`

### Conifer

- `tree_pine_02`
- `tree_pine_03`

### Rocks

- `rock_field_low_02`
- `rock_quarry_cut_03`
- `rock_mossy_04`

Variation must come from silhouette/structure, not merely hue/filter changes.

## Batch D — generic population

- `villager_labourer_02`
- `villager_traveller_03`
- optional `villager_elder_04`

Keep proportions compatible with current Warden/service-NPC art and readable facing at phone scale.

## Batch E — dedicated landmarks

Only replace composed landmark placeholders where gameplay-scale comparison shows the dedicated source is materially clearer:

- Old Warden Crossing gate architecture;
- Stonepine Pass gate architecture;
- Old Rootway living-root threshold;
- Grove Warden cache/reliquary;
- Fen reliquary variant;
- Stonepine survey cache variant;
- open/claimed states where needed without moving interaction anchors.

## Batch F — Build 46 source replacement

After the semantic silhouette batches, evaluate Build 46 procedural/composite terrain and environment slots using gameplay-scale comparison. Replace only where dedicated painted source art materially improves the scene.

Priority:

1. regional base ground materials;
2. functional paths/work surfaces;
3. transition edges/corners;
4. sparse decals;
5. highest-frequency environment composites;
6. lower-frequency state/landmark composites.

Stable Build 46 asset IDs and placement contracts remain unchanged even when their source implementation is replaced.

## Production workflow — one asset at a time

For every dedicated asset:

1. Generate exactly one isolated candidate using the locked art direction.
2. Inspect silhouette, camera, material family, alpha, safe margin and mobile-size readability.
3. If it fails one or more criteria, perform a targeted revision only; do not broadly restyle it.
4. Preserve the approved candidate as the immutable source for that asset ID.
5. Add it to the Build 47 source pack/atlas without modifying gameplay data.
6. Bind only the intended placeholder type to the new source ID.
7. Compare enabled vs `?sourceArt47=0` at actual phone gameplay scale.
8. Run the focused source-art proof and render-performance proof.
9. Run the complete repository browser gate before merge.
10. Merge only from the exact green head.

Do not create a giant all-assets presentation sheet as the production source. A review montage may be produced from already-isolated approved assets, but the production sources remain individually auditable.

## Technical packaging contract

Preferred final package after isolated assets are approved:

- one compact transparent Build 47 atlas for new sprite sources;
- stable sprite frame metadata separate from gameplay data;
- late additive presentation runtime after the existing generated-art runtime;
- `?sourceArt47=0` restores the exact Build 46 visual baseline without disabling earlier generated art;
- no per-frame decoding/generation;
- no unbounded diagnostics;
- no deep state snapshots in draw paths;
- no Canvas filters as the primary distinction between newly dedicated silhouettes.

Provisional implementation paths:

- `src/v44/63-source-art47-data.js`
- `src/v44/64-source-art47-runtime.js`
- `tests/source-art47-smoke.mjs`
- `.github/workflows/source-art47-smoke.yml`

The exact file names may change only if repository evidence shows a safer integration point; the runtime contract above is fixed.

## Build 47 acceptance

Build 47 may be called complete only when:

- all six Priority-A enemy species use unique dedicated silhouettes;
- required cottage/environment/population masters are integrated or explicitly rejected by gameplay-scale evidence as unnecessary;
- every retained source is technically valid and visually superior to its placeholder;
- the complete Build 46 rollback stack still works;
- Build 45 render performance remains within the proven guardrails;
- phone landscape/portrait and desktop source-art proofs pass;
- complete Browser Smoke passes;
- hosted GitHub Pages proof passes from the exact merged source-art head;
- the resulting game is ready for Build 48 scene-cohesion work without further semantic placeholder art debt in the vertical-slice critical path.
