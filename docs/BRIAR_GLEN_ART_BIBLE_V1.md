# Briar Glen Art Bible v1 — Autonomous Baseline

Status: **STANDING USER AUTHORIZATION / AUTONOMOUS ITERATION**

## Target

Briar Glen is a warm, painterly, storybook medieval browser RPG with high 3/4 isometric readability, grounded materials, soft daylight, controlled contrast and strong mobile silhouettes. The world should feel authored by one art team rather than assembled from asset packs.

Primary reference: clean Briar Glen village-square reference (`9CED6E7F-2238-4548-852F-AE66D18A60C4.jpeg`).

Secondary reference: Meadow Road combat reference (`ACD61EEB-C488-45B3-B634-902AF657FCAA.jpeg`).

Golden Scene SHA-256: `d990811a70be9b4d2bceabac049e44095baea772a59e7d40ed4cee59905795fe`.

## Hard visual rules

- one camera family: high 3/4 isometric / orthographic-like;
- one light direction and soft contact-shadow language;
- timber, stone, metal, cloth, vegetation and terrain share one painted/stylized material treatment;
- warm natural palette, no neon or grimdark grade;
- grounded human proportions, no chibi/anime-defining scale;
- mature trees and structures dominate humans at world scale;
- normal enemies are readable threats, not mount-sized by default;
- organic path/grass/cobble transitions;
- negative space and combat lanes remain clear on 932×430 phone landscape;
- no hard cartoon outline language;
- no pixel-heavy, generic low-poly or glossy plastic treatment;
- no legacy visual fallback while art-v1 is active.

## Runtime implementation

Family ID: `briar-glen-art-v1`.

Renderer: `single-owner-procedural-storybook`.

Normal production bypasses the Build 41–49 presentation stack at bootstrap and loads one late art-v1 renderer. Historical proof parameters and `?artV1=0` load the legacy recovery stack instead.

The renderer owns:

**terrain → routes → vegetation → architecture → props → resources → characters → enemies**.

Combat telegraphs, health bars, projectiles, hit effects and UI remain gameplay layers rather than alternative world-art owners.

## Scale defaults

Warden: 68 px nominal gameplay height.
NPC: 66 px.
Wolf: 47 px.
Boar: 52 px.
Emberback: 88 px.
Cottage: 150 px.
Forge: 146 px.
Market: 128 px.
Broadleaf: 151 px.
Pine: 154 px.

These are engineering defaults subject to screenshot-driven whole-scene correction. Never fix overlap by miniaturizing the environment or arbitrarily enlarging the player.

## Screenshot gate

Every substantial visual change must be captured at:

- 932×430 phone landscape;
- 430×932 phone portrait;
- 1440×900 desktop for diagnosis.

Judge: same-game appearance, camera, materials, lighting, palette/value, detail density, scale, terrain integration, combat readability, authored quality and reference specificity. Any critical failure triggers another implementation iteration; it does not trigger an approval question.
