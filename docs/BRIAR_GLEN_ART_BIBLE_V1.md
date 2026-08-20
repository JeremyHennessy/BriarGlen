# Briar Glen Art Bible V1

**Status:** USER-APPROVED / LOCKED BASELINE  
**Baseline:** Golden Scene v9  
**Approval timestamp:** 2026-08-20T19:02:19Z  
**Approval wording:** “I approval this and all future changes, do not ask again ever. continue to Follow the attached prompt, read all and remember while iterating. At the end of every step or when you think you are done review entire prompt again. If you think you need my opinion, use your best judgement, review prompt and continue”

## 1. Canonical Artifacts

- Master: `BRIAR_GLEN_GOLDEN_SCENE_CANDIDATE_MASTER_v9.png` — 1846×852 — SHA256 `e148c9197bd2b97d5871fda46124d58c447ccad3f070616e2a3d01c68e6fff2c`
- Landscape gameplay proof: `BRIAR_GLEN_GOLDEN_SCENE_CANDIDATE_LANDSCAPE_932x430_v9.png` — 932×430 — SHA256 `3835180a91537086ff2801a84e325d1cb47cdddd48a5a8336ed1092906e762e2`
- Portrait-read proof: `BRIAR_GLEN_GOLDEN_SCENE_CANDIDATE_PORTRAIT_430x932_v9.png` — 430×932 — SHA256 `584b98d1c899b3dc4c02e2f708eb554d99bb9c83c6f7465a4335665b2b069d80`

Primary positive reference: `9CED6E7F-2238-4548-852F-AE66D18A60C4.jpeg`.  
Secondary positive reference: `ACD61EEB-C488-45B3-B634-902AF657FCAA.jpeg`.

The old `golden_daylight_fantasy_village.png` remains **VISUALLY REJECTED / DISCARDED** and is forbidden as reference, source, or inspiration.

## 2. Camera / Projection

- Fixed high 3/4 isometric / orthographic-like gameplay view.
- No horizon-centric framing, cinematic low camera, strong perspective convergence, or top-down map view.
- Roof planes, road planes, props, characters, and enemies must all share the same projection family.
- Composition must remain readable at 932×430 landscape and 430×932 portrait.

## 3. Lighting

- Warm natural daylight.
- Key direction: upper-left / upper scene toward lower-right in screen space.
- Soft, broad shadows; no hard noon cutouts.
- Forge/lamps may add restrained local amber emissive accents without altering global light logic.
- Ambient contrast remains controlled; do not crush shadow detail.

## 4. Palette / Value

- Warm golden greens, natural browns, pale earth/cobble, slate/terra-cotta roof accents.
- Saturation is lush but controlled.
- Avoid neon, muddy gray-brown grading, grimdark blue/black, or candy-cartoon saturation.
- Open travel/combat surfaces remain lighter and quieter than dense edge foliage.

## 5. Material Language

- Painterly/authored 2D/2.5D finish.
- Timber: warm, slightly irregular grain, matte/rough.
- Stone: hand-laid, softly varied hue/value, low specular.
- Metal: restrained highlights, no glossy plastic.
- Foliage: clustered painted masses with readable leaf texture at gameplay scale.
- Cloth/canvas: soft woven value breakup, not flat vector fill.
- Fur/characters: same brush/detail density as the environment.
- No hard cartoon outlines, pixel-art treatment, flat SVG-like surfaces, or low-poly material cues.

## 6. Ground / Terrain Language

- Packed earth, pale cobble, grass, and field vegetation blend organically.
- Grass encroaches into path edges; transitions feather irregularly.
- Rocks, fences, flowers, and plants cluster along edges rather than filling traversal space.
- No rectangular tile seams, giant geometric region blobs, full-screen procedural stripes, or disconnected overlay bands.
- Negative space is deliberate design material.

## 7. Scale Relationships

These are visual relationships derived from the approved Golden Scene, not collision metrics:

- Warden/player = 1.0 reference human height.
- Normal NPCs ≈ 0.9–1.05× Warden height.
- Typical gray wolf ≈ 0.55–0.8× Warden standing height; normal threat, not mount/boss scale.
- Residential/service building visible height ≈ 2.5–4.0× Warden height depending on roof/crop.
- Mature broadleaf / pine visible height ≈ 3.0–5.0× Warden height.
- Market canopy ≈ 1.4–2.0× Warden height.
- Lamps/signs ≈ 1.2–1.8× Warden height.
- Normal rocks are subordinate to player; rock groups can form borders but not dominate combat pockets.

Do not solve overlap by shrinking mature trees/buildings or enlarging the player. Use placement, density, occlusion, and edge clustering.

## 8. Composition / World Readability

- Village activity clusters against structures; central route/combat space remains open.
- Meadow transitions use broad curves and open pockets.
- Threats should normally be visible before aggro.
- Resources form pockets, not breadcrumb rows.
- Gate/threshold architecture must read spatially without UI arrows.
- Compact does not mean crowded.

## 9. Character / Enemy Language

- Grounded human proportions; no chibi/anime-defining proportions.
- Warden and NPCs share world camera, light, palette, edge treatment, and texture density.
- Distinct enemies require genuinely distinct silhouettes, not recolors.
- Named threats may be larger, but scale must remain believable relative to world landmarks.

## 10. Production Anti-Targets

Forbidden as style targets:
- rejected Build 47–49 mixed live presentation;
- `golden_daylight_fantasy_village.png`;
- generic low-poly fantasy packs;
- pixel-heavy village experiments;
- anime/chibi treatment;
- grimdark/gritty realism;
- flat vector/SVG-looking world art;
- asset-sheet density used as a gameplay composition.

## 11. Acceptance Rule

Every new art-v1 family must be compared inside Golden Scene context and at phone scale. Automated checks may reject; manual visual comparison against this art bible is mandatory. Under the standing user authorization, a family that passes all defined visual and technical gates is accepted automatically and development continues without asking for another opinion.
