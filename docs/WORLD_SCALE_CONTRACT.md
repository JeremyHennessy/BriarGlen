# Briar Glen — World Scale Contract

Build 49 establishes an explicit gameplay-scale contract after reviewing the stable art direction, approvals, Option B pipeline notes, and the approved Briar Glen / Meadow Road visual references.

## Why this exists

Technical asset integration had drifted toward solving overlap by shrinking world assets. Build 48 then enlarged the cast for readability. The combined result made the avatar comparable in height to trees, cottages, stalls and service buildings, which contradicts the approved references and makes the world read like a toy set.

The correction is **not** to make everything smaller. The approved references keep the player readable while the environment carries materially larger silhouettes and uses lower decorative density around clear traversal/combat space.

## Visual principles locked by this contract

- Player remains readable on a phone viewport.
- NPCs remain approximately human-scale relative to the player.
- Typical wolves/boars are lower than the player silhouette.
- Named/boss threats may rise above player height.
- Cottages, forge, tavern, alchemy and mature trees must be clearly larger than the avatar.
- Market/service stalls remain substantial but below major-building scale.
- Lamps/signs/rocks/ground props remain subordinate.
- Large scenery uses **lower density**, not miniature scale, to preserve open lanes.
- Collision anchors may never be visually culled.
- Gameplay entity arrays, hitboxes, movement and save data are not changed by visual density culling.

## Nominal screen-space scale at camera zoom 1

Avatar basis: **68 px nominal height = 1.0×**.

| Element | Nominal height | Avatar ratio | Contract |
|---|---:|---:|---|
| Warden | 68 px | 1.00× | basis |
| NPC | 66 px | 0.97× | 0.90–1.05× |
| Briar Wolf | 46 px | 0.68× | 0.58–0.78× |
| Hollow Boar | 51 px | 0.75× | 0.66–0.86× |
| Emberback | 88 px | 1.29× | 1.20–1.45× |
| Cottage | 147 px | 2.16× | 2.10–2.55× |
| Deciduous tree | 147 px | 2.16× | 2.10–2.55× |
| Pine | 151 px | 2.22× | 2.10–2.60× |
| Tavern | 165 px | 2.43× | 2.30–2.70× |
| Forge | 143 px | 2.10× | 2.00–2.35× |
| Alchemy station | 153 px | 2.25× | 2.10–2.45× |
| Rowan market | 125 px | 1.84× | 1.75–2.05× |
| Lamp | 83 px | 1.22× | 1.10–1.35× |
| Rock cluster | 58 px | 0.85× | 0.72–0.98× |

These are gameplay rendering targets, not source-image dimensions.

## Density contract

The approved village/meadow references use larger environmental masses with open readable lanes. Therefore repeated decorative scenery is deterministically thinned in the source-art renderer while preserving collision anchors:

- generic repeated trees: approximately 48% retained;
- Fen / Stonepine repeated trees: approximately 60% retained;
- bushes: approximately 44% retained;
- generic rocks: approximately 68% retained;
- Den rocks: approximately 74% retained.

Purpose-built service structures, cottages, landmarks, signs, fences, lamps, gardens, collision anchors and gameplay-relevant visuals are not removed by this rule.

## Regression gate

`tests/build49-hub-meadow-cohesion-smoke.mjs` reads the live runtime scale contracts and fails when the world/avatar ratios drift outside the ranges above. It also checks the scenery-density ceiling, traversal-lane clearance, entity-count preservation and rollback chain.

Any later art build that intentionally changes these ratios must be visually reviewed at actual gameplay size and update this contract explicitly. Technical CI success alone is not approval.
