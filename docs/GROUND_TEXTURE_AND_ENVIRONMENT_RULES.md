# Briar Glen — Ground Texture & Environment Rules

Status: **canonical environment-art extension for Build 46 and later**.

Applies to ground textures, terrain transitions, decals, environment variants, region dressing, borders, landmarks and future atlas/runtime expansions.

## Core rule

Ground and environment art must improve **navigation, biome identity and lived-in character** before it adds decoration. Readability at supported phone scale wins over raw detail.

## Ground hierarchy

Every region uses three layers:

1. **Base material family** — broad low-noise regional floor with deterministic A/B/C variation.
2. **Functional surface** — route, workyard, ruin floor, wetstone, rubble, gravel or arena stone where traversal/activity needs stronger visual language.
3. **Sparse decal** — a low-density regional accent such as pebbles, flowers, moss/leaves, reeds, quarry chips, pine needles or ash.

Do not make the base texture carry all detail.

## Transition rules

- Material changes must use irregular edge/corner treatment rather than hard rectangular borders.
- Primary-route edges must remain more legible than decorative material changes.
- A transition asset is cosmetic only; it creates no collision or progression rule.
- Water/mud, rubble/dirt and ruin/forest transitions must communicate walkability without UI arrows.

## Determinism

Persistent terrain variation is seeded from stable world cell identity: `region + cellX + cellY + terrainVersion`.

Never vary persistent terrain from frame time or per-frame random values.

## Runtime architecture

Build 46 uses cached world-space terrain chunks. Requirements:

- logical cell size: 96 world units unless a later measured revision changes it;
- 8×8 cells per terrain chunk;
- material/decal decisions resolved only when a chunk is composed;
- chunks are drawn as cached images during frames;
- cache is bounded with LRU eviction;
- no texture generation, Canvas filters, `createPattern`, `toDataURL`, deep debug snapshots, or unbounded diagnostics in the hot render loop;
- all ground art is presentation-only unless collision is explicitly approved as a separate gameplay change.

## Density defaults

- Village Green: 5–8% decorative ground coverage.
- Village edges: 12–18%.
- Meadow: 8–14%.
- Grove: 14–20%.
- Fen: 10–16%.
- Copper: 12–18%.
- Stonepine: 12–18%.
- Den approach: 8–12%.
- Boss arena interior: 3–6%.

These are starting targets. Phone readability can require less.

## Region material language

### Briar Glen
Warm packed earth/workyard scuff over the existing green settlement structure. Village Green remains comparatively clean. Service work areas carry more wear than residential edges.

### Meadow Road
Healthy warm green with pale compressed travel surfaces. Wildflowers live in sparse side pockets, not the path centre.

### Mooncap Grove
Cool moss/soil and ruin-worn stone. Root/moss/leaf accents cluster near borders and ruins while clearings stay readable.

### Mosswater Fen
Damp olive-brown mud, wetstone and restrained reed/muck accents. Walkable islands/causeways must remain visually distinct from water.

### Copper Hollow
Muted quarry dust, mineral dirt, rubble and small stone chips. Main ranged-combat lane remains visually open.

### Stonepine Reach
Pine-needle floor, ochre dirt and gravel. Camp/work nodes can be more disturbed than ridge travel lanes.

### Emberback Den
Scorched dirt, ash and cracked stone. Lowest decorative density, especially inside boss telegraph space.

## Environment variation rules

- Common families may vary; unique landmarks must stabilize over time.
- Use real silhouette/composition variation before aggressive recolouring.
- Props answer a functional question: storage, work, travel, residence, rest, extraction, threshold or abandonment.
- Cluster dressing against anchors/borders; do not scatter it uniformly.
- Cosmetic art never silently creates blockers/interactables.
- Open/claimed/depleted states must communicate state while preserving gameplay logic in the canonical systems.

## Required planning review for every environment pass

Before implementation, record:

1. readability/path hierarchy;
2. biome identity;
3. transition language;
4. landmark/state communication;
5. phone-scale density;
6. performance implications.

## Required gates

Every environment/ground pass must keep green:

- static sanity;
- Browser smoke;
- Phone UI and tutorial proof;
- Generated art proof;
- World Layout V2 proof;
- Asset variants proof;
- Landmark state proof;
- Render performance proof;
- pass-specific Ground/Environment proof;
- direct GitHub Pages verification after merge.

Performance acceptance is based on the Build 45 render-performance baseline. Richness must be moved into initialization/precomposition rather than more per-frame work.
