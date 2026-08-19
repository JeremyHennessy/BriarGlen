# Build 46 Closeout

Status: **technically verified production baseline; visual approval remains a separate user checkpoint**.

## Exact production baseline

- Repository: `JeremyHennessy/BriarGlen`
- Production branch: `main`
- Exact Build 46C merge SHA: `b8b37d01dd8ce3ef89a0333b5cb9a6ab1f016aee`
- Build 46A merge: `8287866d89ee7160ad9437afe58187004018e728`
- Build 46B merge: `90c8d7f6f668a1f343eb997e1a1ff7254887000c`
- Build 46C merge: `b8b37d01dd8ce3ef89a0333b5cb9a6ab1f016aee`
- Save key remains `briar-glen-vslice-v1`.
- Canonical runtime remains `canonical-manifest-hooks-v1`.

This SHA is the immutable technical baseline for Build 47. Build 47 must branch from this baseline or from a later closeout-only merge whose tree differs only by documentation/metadata housekeeping.

## Build 46 delivered scope

### 46A — Ground V2

- 49 stable named terrain assets/contracts.
- 21 regional base-material variants.
- 7 functional surfaces.
- 14 transition assets.
- 7 sparse decals.
- Cached continuous world-space ground presentation.
- `?groundV2=0` rollback.

### 46B — Environment variation

- 47 stable named regional environment slots.
- Regional variation across Briar Glen, Meadow Road, Mooncap Grove, Mosswater Fen, Copper Hollow, Stonepine Reach and Emberback Den.
- Shared traversal props.
- Presentation-only composition with no new gameplay entity/collision/save contracts.
- `?env46=0` rollback.

### 46C — Terrain/state polish

- 10 conditional state-art slots.
- Object/ground contact integration.
- Claimed/open/depleted/active state presentation.
- `?terrainPolish=0` rollback.

Existing recovery paths remain protected unless explicitly superseded later: `?generatedArt=0`, `?canvasArt=1`, historical `artScope`, `?assetVariants=0`, `?landmarkPolish=0`, and `?layoutV1=1`.

## Verification evidence

Final live verification used disposable PR #74 from exact production SHA `b8b37d01dd8ce3ef89a0333b5cb9a6ab1f016aee` with verification head `50a983f41f16be086bc4b1a2b03e43ed25bdb624`.

The live GitHub Pages proof completed successfully for:

- Browser smoke test.
- Ground V2 visual proof.
- Ground V2 performance proof.
- Environment variation visual proof.
- Environment variation performance proof.
- Terrain/state polish visual proof.
- Terrain/state polish performance proof.
- Build 45 render-performance proof.
- Phone UI collision proof.
- Returning-player tutorial/Skip tips proof.

PR #74 was correctly closed without merge because it contained verification-only workflow material.

## Approval status

Passing the technical and visual-automation gates is **not equivalent to user visual approval**.

Build 46C is therefore locked as the current **technically verified** baseline. It must not be described as the final approved Briar Glen art baseline until the user explicitly approves the gameplay-scale visual result.

The previously approved authored Warden/cottage/environment direction and historical art rollback points remain valid reference checkpoints.

## Release metadata observation

`src/runtime/release-info.js` currently reports version `41` / `Returning Player Tutorial Control` even though presentation work has progressed through Build 46C.

This closeout deliberately does **not** change that runtime file without first establishing whether its `version` field is a gameplay/schema compatibility marker or is intended to track every presentation build. A future metadata correction must be isolated and evidence-driven; it must not be bundled with source-art work.

## Locked next-build sequence

1. **Build 47 — dedicated source-art completion**
2. **Build 48 — scene cohesion and visual signoff**
3. **Build 49 — full vertical-slice QA and freeze**

Do not insert new regions, weapons, economy systems, progression systems, world-layout redesigns or unrelated refactors into this sequence unless explicitly authorized.

## Build 47 branch contract

Build 47 is a source-art replacement/completion build, not a gameplay redesign.

Required priorities, in order:

1. Common Hollow Boar unique silhouette.
2. Bog Stalker unique silhouette.
3. Ridgehorn unique silhouette.
4. Quarry Wisp unique silhouette.
5. Drowned Warden unique silhouette.
6. Quarry Sentinel unique silhouette.
7. Residential silhouettes: `cottage_compact_02`, `cottage_long_03`, optional `shed_work_02`.
8. Additional deciduous, conifer and rock masters.
9. Additional generic villager silhouettes.
10. Dedicated gate/cache/Rootway architecture where composed placeholders remain visibly insufficient.
11. Replace procedural/composite Build 46 terrain/environment masters with dedicated painted source art where gameplay-scale comparison demonstrates a material improvement.

Every asset batch must preserve gameplay entity counts/anchors unless explicitly authorized, preserve save compatibility, preserve rollback switches, validate true alpha and bounds where applicable, compare at actual phone gameplay size, pass render-performance coverage, pass the full browser regression matrix, and merge only from a green exact head.

## Build 48 contract

Build 48 may improve only scene cohesion on top of approved Build 47 assets: terrain-object contact, dressing density, transitions, vegetation grouping, path edges, environmental storytelling and regional value/lighting balance. World Layout V2 and gameplay anchors remain locked.

Sign off region by region: Briar Glen → Meadow Road → Mooncap Grove → Mosswater Fen → Copper Hollow → Stonepine Reach → Emberback Den.

## Build 49 contract

Build 49 is acceptance/QA, not feature expansion.

Required acceptance coverage:

- Clean new-player progression through the complete authored vertical slice.
- Returning-save compatibility.
- Phone landscape, phone portrait and desktop.
- Combat, gathering, crafting, specialization, economy, contracts, map/journal and progression gates.
- Performance/load regression.
- All retained rollback paths.
- Final UI/visual regression review.
- Explicit user visual approval before declaring the vertical slice frozen.

After Build 49 passes and receives explicit approval, record the exact frozen SHA as the Briar Glen Vertical Slice v1 baseline.
