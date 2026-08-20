# Briar Glen — Build 51 Art-v1 Execution Baseline

Status: **AUTONOMOUS PRODUCTION CANDIDATE — STANDING USER AUTHORIZATION**

The user explicitly authorized autonomous art direction and game-mechanics decisions and instructed continuous iteration without intermediate approval pauses. This record therefore treats screenshot/technical quality gates as the controlling acceptance mechanism until the user explicitly stops development.

## Starting production baseline

- Repository: `JeremyHennessy/BriarGlen`
- Verified base at start of Build 51: `b9fabcef93c6cee65f4ea96f029b874b84f7a7d7`
- Save key: `briar-glen-vslice-v1`
- Save schema: `1`
- Runtime architecture: canonical Build 20.1 parser manifest + hooks

## Visual source authority

Primary reference: clean Briar Glen village-square reference (`9CED6E7F-2238-4548-852F-AE66D18A60C4.jpeg`).

Secondary reference: Meadow Road combat reference (`ACD61EEB-C488-45B3-B634-902AF657FCAA.jpeg`).

Golden Scene SHA-256: `d990811a70be9b4d2bceabac049e44095baea772a59e7d40ed4cee59905795fe`.

The prior generic `golden_daylight_fantasy_village.png` remains discarded. Build 49 screenshots remain negative comparison evidence rather than a visual target.

## Pipeline decision

The prior raster-atlas staging path was abandoned because binary publication became an execution bottleneck in this environment and would have left the live game unchanged again.

Build 51 instead uses a **single-owner procedural storybook Canvas renderer**:

- one code path owns terrain, routes, vegetation, architecture, props, characters, resources and enemies;
- a common palette, material language, shadow model and scale system is used across all roles;
- normal production skips the Build 41–49 presentation stack at bootstrap;
- historical proof / recovery URLs continue to load the verified legacy presentation stack;
- `?artV1=0` is the explicit visual rollback;
- missing current world/resource/enemy types fail the art-v1 state instead of falling back to old art.

This is a production engineering choice, not permission to accept a weak screenshot. The renderer must be repeatedly judged from actual phone/desktop captures and revised when the screen evidence is poor.

## Locked contracts

Build 51 must not intentionally change:

- save key/schema;
- gameplay entity counts;
- collisions/interactables;
- World Layout V2 topology and anchors;
- combat/economy/progression/balance values;
- approved UI behavior;
- historical rollback/proof ability.

## Continuous development

Once the unified visual stack is live and coherent, development continues into specialist progression, material quality, local economy, NPC reputation/world response, contracts/quests, enemy ecology, encounter composition, exploration rewards, persistence/replayability and purposeful new regions. Every production iteration continues through branch → test → screenshots → fix/retry → exact green head → merge → Pages verification → live inspection.
