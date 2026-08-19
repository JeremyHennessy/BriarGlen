# Briar Glen — Asset Variation Rules

Status: **canonical extension of the art and world-layout rules**  
Applies to: generated sprites, environment props, resource nodes, NPCs, enemies, building variants, stateful landmarks and future atlas expansions.

## Purpose

Asset variation exists to remove visible cloning while preserving Briar Glen's approved visual family. Variation is not permission to change art direction.

The base rule is:

> **same family, different individual** — not a different game, biome pack or rendering style.

## 1. What may vary freely

Common repeated assets may use controlled deterministic variants:

- cottages and minor residential buildings;
- deciduous/pine trees and bushes;
- ordinary rocks, stumps and deadwood;
- Briarleaf, Mooncap, Copper and Iron nodes;
- generic villagers;
- ordinary enemies within one species;
- barrels, crates, sacks, hay, logs, benches and other dressing props.

Permitted changes:

- roughly ±4–8% visual scale;
- horizontal facing where the asset supports it;
- restrained value/saturation/hue shifts;
- small prop-cluster differences;
- mild wear/biome treatment;
- alternate adjacent props around the same master asset.

## 2. What must remain stable

Do **not** casually variant-shift:

- named bosses;
- major progression gates;
- unique buildings such as the tavern, forge and core service structures;
- the Old Rootway silhouette;
- major map landmarks;
- UI identity icons;
- anything whose appearance communicates a specific gameplay state.

A unique landmark should become easier to recognize over time, not randomly change appearance between runs.

## 3. Determinism

Runtime-selected variants must be deterministic from stable identity inputs such as:

- entity type;
- name;
- authored/home coordinates;
- explicit variant id.

Never use per-frame random variation for a persistent object.

A cottage, tree or ore node should look like the same individual every time the player returns to it.

## 4. Palette limits

Runtime filter variants are a **supporting technique**, not a substitute for new source art.

Use filter variation only when:

- silhouette and material identity remain intact;
- the change is subtle enough to remain in the same family;
- no gameplay color language is compromised;
- health bars, labels, telegraphs and UI are not unintentionally filtered.

Avoid:

- extreme hue rotation;
- neon recolors;
- high-contrast filters;
- large brightness shifts;
- using one source silhouette to impersonate every important creature.

When a repeated enemy or landmark becomes visually important, create a proper source sprite rather than stacking more filters on the placeholder family.

## 5. Variant budgets

Recommended minimum visual variety before a family is considered mature:

- cottage/residence: **3** readable variants;
- deciduous trees: **3–4**;
- pine/conifer: **3**;
- common rock cluster: **3–4**;
- common resource node: **2–3**;
- generic villager: **3+** clothing/body variants;
- ordinary enemy species: **2–3** minor variants plus one clear species silhouette;
- prop cluster around a service: **3+** compositions.

Not every variant needs separate atlas art. Scale, facing and composition can contribute, but the final family should not rely only on recolor.

## 6. Regional treatment

Variation should reinforce biome identity without breaking master materials.

### Briar Glen / Meadow
- warm neutral wood and stone;
- healthy greens;
- residential flower/hay/trough variation;
- brighter, cleaner prop treatment.

### Mooncap Grove
- slightly cooler/deeper foliage;
- stumps/logs/ruin dressing;
- violet resource accents remain dominant.

### Copper Hollow
- more muted vegetation;
- mineral/desaturated rock treatment;
- work crates/barrels/wagon language around selected quarry pockets.

### Emberback Den
- minimal prop variety inside the boss bowl;
- darker rock and warm ember accents;
- do not clutter telegraph space.

### Mosswater Fen
- cooler/desaturated wood and stone;
- damp green/teal value treatment;
- path/causeway props remain low and readable.

### Stonepine Reach
- darker, drier timber;
- conifer/deadwood/log language;
- quarry/camp supplies clustered at activity nodes.

## 7. Prop clustering

Props answer a spatial question. They should indicate:

- storage;
- work;
- travel;
- residence;
- rest;
- resource extraction;
- a recovered/abandoned site.

Do not scatter props uniformly across open ground.

Rules:

- cluster props against an activity anchor or border;
- preserve the primary travel lane;
- keep Village Green and boss interiors comparatively clear;
- avoid identical prop arrangements on repeated cottages;
- use one dominant prop plus one or two supporting pieces rather than five equal objects.

## 8. Stateful assets

Caches and gates must visibly communicate state.

Current standard:

- unopened cache: readable generated chest;
- claimed cache: same location/family, visibly dimmed/depleted;
- closed gate: generated physical barrier supplements the gameplay gate;
- opened gate: barrier recedes and route/path treatment becomes more legible;
- active Rootway: path/edge dressing supports the existing canonical Rootway effect.

State visuals must never change progression logic themselves.

## 9. Collision rule

Presentation-only generated props do **not** create blockers, worldObjects, resources, enemies or interactables unless the change explicitly includes gameplay geometry.

If art suggests a solid obstacle but gameplay allows walking through it, either:

1. move/shrink the prop so it reads as edge dressing; or
2. explicitly add and test collision as a separate gameplay change.

Never silently create invisible collision to match a decorative sprite.

## 10. Mobile readability

At supported phone scale:

- silhouette difference matters more than surface detail;
- variants must remain recognizable at a glance;
- prop clusters must not merge into one noisy blob;
- important resources retain strong value/color separation;
- ordinary variants must never visually compete with bosses or progression gates.

## 11. Verification gate

Every asset-variation pass must prove:

- generated art remains enabled by default;
- `?generatedArt=0`, `?canvasArt=1`, historical `artScope`, and the specific variant rollback remain functional;
- entity counts do not change unless explicitly intended;
- canonical runtime wrappers remain intact;
- village, resource pocket, cache/gate, combat zone and Stonepine screenshots are reviewed at phone scale;
- existing full browser regression suite stays green;
- deployed GitHub Pages receives a direct browser proof after merge.

## 12. Current implementation note

Build 43 introduces deterministic scale/value/material variation and richer prop compositions using the already-approved atlas. This is intentionally a low-risk repetition-reduction pass.

Future source-art priority should be given to families where filter/composition variation cannot solve silhouette repetition—especially additional creature species, named NPC body variants, gate architecture and high-frequency tree/rock masters.
