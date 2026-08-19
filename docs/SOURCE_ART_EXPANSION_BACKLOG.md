# Briar Glen — Source Art Expansion Backlog

Status: **canonical source-art priority list after Build 43**  
Purpose: identify where runtime composition/scale variation is no longer enough and a genuinely new silhouette should be created.

This backlog does not authorize style changes. Every new sprite must follow the approved Briar Glen asset prompt/rules, remain mobile-readable, use transparent RGBA, and preserve the existing generated-art rollback paths.

## Priority A — creature silhouettes

These are the highest-value source-art replacements because the current runtime intentionally reuses earlier silhouettes as placeholders:

1. **Common Hollow Boar**
   - Current placeholder: scaled/dimmed `emberback_boss`.
   - Needed: smaller ordinary boar silhouette, less heroic, lower shoulder mass, no boss-specific visual emphasis.

2. **Bog Stalker**
   - Current placeholder: altered `wolf_enemy`.
   - Needed: long, low fen predator with a clearly different body profile from Briar Wolves.

3. **Drowned Warden**
   - Current placeholder: altered `grovekeeper`.
   - Needed: unique drowned/armoured Warden silhouette, heavier vertical read, clear boss identity.

4. **Ridgehorn**
   - Current placeholder: altered `emberback_boss`.
   - Needed: mountain/ridge beast with horn-led silhouette and narrower running profile.

5. **Quarry Wisp**
   - Current placeholder: altered `slime_enemy`.
   - Needed: hovering mineral/spirit silhouette; it should read as airborne/ranged before telegraph text appears.

6. **Quarry Sentinel**
   - Current placeholder: altered `grovekeeper`.
   - Needed: broad stone/warden construct with unmistakable terminal-boss silhouette and open telegraph space around the feet.

### Creature production rule

Named bosses and mechanically distinct enemy species must not remain recoloured/scaled substitutes once source art is available. Keep attack telegraphs, status bars, hit flashes and runtime facing logic separate from the sprite.

## Priority B — residential/building silhouettes

Current cottage master is strong but the residential family still needs genuinely distinct source silhouettes beyond runtime annex composition.

Create:

- `cottage_compact_02` — narrower, steeper roof, same material family;
- `cottage_long_03` — longer single-storey residence / attached workroom;
- optional `shed_work_02` — alternate utility shed for workyard/camp compositions.

Do not create landmark-scale houses. These remain ordinary residences and must not visually compete with the tavern, forge or Warden House.

## Priority C — environment masters

Create proper silhouette diversity for the highest-frequency environment families:

### Deciduous trees
- two additional broadleaf masters;
- one slightly older/gnarled master;
- preserve grouped foliage masses and mobile readability.

### Conifers
- two additional pine/conifer masters;
- vary trunk exposure, crown width and tier spacing rather than hue alone.

### Rocks
- broad low common field rock cluster;
- sharper quarry/cut-face cluster;
- mossy Grove/Fen rock cluster.

Do not use runtime filters as the primary distinction between these masters.

## Priority D — named NPC / villager silhouettes

The named service NPCs already have role art, but generic town population should gain at least two more body/clothing masters:

- villager labourer / field worker;
- villager traveller / resident;
- optional elder/keeper silhouette.

Keep proportions compatible with the existing Warden/NPC family and preserve readable facing at phone scale.

## Priority E — landmark architecture

Create source sprites only after Build 44 composition/state proof confirms the spatial footprint:

- Old Warden Crossing gate architecture;
- Stonepine Pass gate architecture;
- Old Rootway arch / living-root threshold;
- Grove Warden cache/reliquary family;
- Fen reliquary variant;
- Stonepine survey cache variant.

Each landmark needs a stable identity and, where relevant, an opened/claimed state. State change should alter the readable silhouette without moving the gameplay interaction anchor.

## Production order

Generate and integrate in this order:

1. common boar;
2. Bog Stalker;
3. Ridgehorn;
4. Quarry Wisp;
5. Drowned Warden;
6. Quarry Sentinel;
7. cottage variants;
8. tree/rock masters;
9. generic villagers;
10. dedicated gate/cache/Rootway architecture.

Reason: current creature substitutions create the most obvious semantic mismatch during play, while environment repetition is already partially reduced by Build 43 composition and scale variants.

## Integration contract

For every new source-art batch:

- branch from latest verified `main`;
- no gameplay entity count changes unless explicitly part of the build;
- preserve save key `briar-glen-vslice-v1` and schema;
- preserve canonical runtime wrappers;
- preserve `artScope`, `canvasArt=1`, `generatedArt=0` and relevant pass rollback switches;
- validate true alpha, safe bounds and runtime anchor before atlas integration;
- compare at actual phone gameplay scale;
- run full browser regression, generated-art proof, World Layout proof, phone UI/tutorial proof and the pass-specific visual proof;
- merge only from a green head;
- directly verify GitHub Pages after merge.
