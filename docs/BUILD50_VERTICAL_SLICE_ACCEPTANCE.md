# Build 50 — Vertical Slice Acceptance QA

Status: **technical acceptance candidate; explicit user visual approval still required before freeze**.

## Purpose

Build 50 is the acceptance/QA step originally locked as the final stage after source-art completion and scene-cohesion work. Builds 48–49 were consumed by Living Cast and the world-scale correction, so the acceptance stage is numbered Build 50.

This build is not feature expansion and intentionally changes no gameplay/runtime implementation.

## Production baseline entering QA

- Repository: `JeremyHennessy/BriarGlen`
- Production branch: `main`
- Build 49 production SHA: `b9fabcef93c6cee65f4ea96f029b874b84f7a7d7`
- Save key: `briar-glen-vslice-v1`
- Save schema: `1`
- Canonical runtime manifest: `briar-glen-runtime-v20.1`
- Runtime architecture: `canonical-manifest-hooks-v1`

## Locked presentation stack

- Build 47 physical source terrain / source-art integration.
- Build 48 Living Cast v3 with ten unique enemy identities.
- Build 49 approved-reference world-scale reset and hub/meadow cohesion.
- `docs/WORLD_SCALE_CONTRACT.md` is an acceptance gate, not a suggestion.

World-scale acceptance family at zoom 1 uses the Warden as a 68 px basis:

- cottage / mature deciduous tree: roughly 2.16× avatar height;
- pine: roughly 2.22×;
- tavern: roughly 2.43×;
- forge: roughly 2.10×;
- alchemy: roughly 2.25×;
- market: roughly 1.84×;
- ordinary enemies remain around or below avatar height;
- named threats may exceed avatar height;
- open traversal/combat space is protected by deterministic density reduction, not miniature scenery.

## Build 50 acceptance coverage

The dedicated Build 50 acceptance proof must cover:

1. clean browser boot with the canonical runtime and save identity;
2. final Build 47/48/49 presentation stack active together;
3. numeric world/avatar ratio contract;
4. presentation layers do not mutate object/resource/enemy counts;
5. physical 21-tile terrain remains active;
6. lane-safety and scenery-density contracts remain intact;
7. landscape, portrait and desktop;
8. Briar Glen, Meadow Road, Mooncap Grove, Mosswater Fen, Copper Hollow, Emberback Den and Stonepine Reach;
9. returning-save compatibility;
10. browser overflow/runtime-error checks;
11. full historical/current Browser Smoke matrix;
12. Ground V2 and canonical render-performance proof;
13. retained visual rollback paths through Build 47/48/49 proof suites;
14. post-merge verification against GitHub Pages.

## No-change contract

Build 50 must not intentionally change:

- gameplay entities or counts;
- collision/hitbox anchors;
- combat values or AI;
- progression or rewards;
- crafting/economy/contracts;
- save key/schema;
- World Layout V2;
- approved phone UI;
- terrain architecture;
- world/avatar scale contract;
- final source-art/cast identities.

Any failure discovered during QA must be fixed as the smallest isolated defect correction and must rerun the entire acceptance gate.

## Release-info observation

`src/runtime/release-info.js` still reports version `41` / `Returning Player Tutorial Control`. Build 46 closeout explicitly recorded that this field may be a gameplay/schema compatibility marker rather than a presentation-build counter. Build 50 therefore leaves it unchanged rather than introducing an unproven runtime metadata change during freeze QA.

## Freeze rule

Passing Build 50 CI and live GitHub Pages verification establishes a **technically accepted freeze candidate**, not user visual approval.

The vertical slice may be called **Briar Glen Vertical Slice v1 — Frozen** only after:

1. the exact Build 50 production SHA passes the full local/CI and live Pages acceptance matrix;
2. final live screenshots are manually reviewed at gameplay scale;
3. the user explicitly approves the visual result;
4. the approved exact SHA is recorded as the frozen baseline.

Until step 3 occurs, status remains: **technical acceptance candidate — visual signoff pending**.
