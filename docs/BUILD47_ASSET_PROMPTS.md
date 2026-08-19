# Build 47 — Production Source-Art Prompts

These prompts are production contracts. Output is never self-approving. Generate one isolated asset at a time, inspect it at actual gameplay scale, and use targeted revision rather than broad restyling.

## Master isolated sprite prompt

**BRIAR GLEN — ONE PRODUCTION GAME SPRITE ONLY**

Create exactly **ONE isolated production-ready game sprite** for the mobile browser RPG **Briar Glen**.

### Asset

`[ASSET_ID]` — `[SUBJECT]`

### Non-negotiable output contract

- Exactly one subject/asset.
- No asset sheet.
- No alternate variants.
- No turnaround.
- No multiple poses.
- No labels or text.
- No UI.
- No presentation frame.
- No scenic background.
- No ground platform or base tile.
- No unrelated props.
- True transparent RGBA background.
- Keep approximately 7–10% transparent safe margin on every edge.
- Natural bottom-centre gameplay anchor.
- Entire silhouette must fit inside the canvas with no clipping.

### Locked Briar Glen art family

Warm handcrafted storybook medieval fantasy. Grounded, tactile materials. Soft painterly rendering with controlled detail. Clear classic isometric MMORPG readability and warmth, with Ragnarok-style small-scale silhouette clarity as a tonal reference **without anime character styling**.

The result must feel authored, cozy/grounded and game-ready—not like generic concept art, glossy 3D, plastic low-poly, photorealism, vector clip-art or a children’s-cartoon sticker.

### Camera lock

- 3/4 isometric / near-orthographic gameplay view.
- Approximately 30–35° downward pitch.
- Weak perspective; avoid wide-angle distortion.
- Match the established Briar Glen sprite camera family.
- Do not use dramatic cinematic foreshortening.

### Lighting/material lock

- Soft warm daylight from upper-left.
- Gentle ambient fill.
- Restrained contact shading only within the subject.
- No large external cast-shadow blob.
- Matte natural materials.
- Restrained saturation.
- No rim-light spectacle or high-contrast cinematic lighting.

### Mobile-readability lock

The sprite must remain immediately recognizable when displayed at approximately `[RUNTIME_SIZE]` px in a phone gameplay viewport.

Prioritize:
1. silhouette;
2. major body/structural masses;
3. role/species identity;
4. limited medium-scale detail;
5. only then small accents.

Remove detail that becomes visual noise when reduced. Avoid thin fragile appendages unless essential to identity.

### Family consistency

This is a new individual/species silhouette inside the already-approved Briar Glen world, **not a new art direction**. Preserve the same painterly softness, material treatment, value range, camera and scale logic as the existing approved cottage/tree/NPC/enemy family.

### Forbidden failure modes

Do not produce:

- anime styling;
- chibi exaggeration;
- hyper-detailed concept art;
- photoreal animal rendering;
- generic mobile-game plastic 3D;
- black cartoon outlines;
- neon saturation;
- dramatic background glow;
- environmental vignette;
- fake transparency/checkerboard;
- multiple subjects;
- duplicated limbs;
- cropped silhouette;
- text/signature/watermark.

Generate **ONE isolated `[SUBJECT]` sprite only**.

---

## A1 — Common Hollow Boar

Use the master isolated sprite prompt with:

- `ASSET_ID`: `hollow_boar`
- `SUBJECT`: ordinary Common Hollow Boar
- `RUNTIME_SIZE`: 80–105

### Species/silhouette specification

A grounded ordinary wild boar found around Copper Hollow and the Briar Glen roads. Stocky but **clearly smaller and less heroic than Emberback**.

Required silhouette:

- low compact body;
- lower shoulder mass than Emberback;
- short sturdy legs;
- readable boar snout;
- modest upward tusks, visible but not oversized;
- slightly bristled spine/neck mass;
- ordinary animal posture, alert and dangerous but not boss-like;
- body oriented roughly three-quarter side view so facing reversal remains readable.

Material/color family:

- muted earthy umber/brown hide;
- subtle warm-grey/brown bristles;
- darker snout/hooves;
- restrained pale tusks;
- no ember glow, fire, magical markings, armour or boss ornament.

Critical distinction from the current placeholder:

This must not read as a shrunk Emberback. It should look like a common wild boar species member with a simpler, lower, less top-heavy silhouette.

---

## A2 — Bog Stalker

Use the master isolated sprite prompt with:

- `ASSET_ID`: `bog_stalker`
- `SUBJECT`: Mosswater Fen Bog Stalker
- `RUNTIME_SIZE`: 85–110

Required silhouette: long and low fen predator; elongated torso; low shoulders; longer tail/body line than a wolf; crouched stalking gait; clearly different body profile from Briar Wolves. Muted dark olive-brown/grey hide with damp mossy accents. No magical glow. No wolf recolour.

---

## A3 — Ridgehorn

Use the master isolated sprite prompt with:

- `ASSET_ID`: `ridgehorn`
- `SUBJECT`: Stonepine Ridgehorn
- `RUNTIME_SIZE`: 85–115

Required silhouette: narrower mountain/ridge beast; forward horn-led head profile; leaner than a boar; compact strong legs; readable running/charging body line; restrained grey-brown/highland hide. Horns identify the species immediately but must not become giant fantasy antlers. No Emberback recolour.

---

## A4 — Quarry Wisp

Use the master isolated sprite prompt with:

- `ASSET_ID`: `quarry_wisp`
- `SUBJECT`: hovering Copper/Stonepine Quarry Wisp
- `RUNTIME_SIZE`: 70–95

Required silhouette: unmistakably airborne mineral/spirit threat with no walking base; compact floating core or stone-shard body; 3–5 broad hovering fragments or trailing mineral shapes; strong open negative space beneath it so ranged/airborne identity reads before telegraph text. Muted mineral grey/copper tones with very restrained internal cool-warm spirit light. Not a slime with a hue shift.

---

## A5 — Drowned Warden

Use the master isolated sprite prompt with:

- `ASSET_ID`: `drowned_warden`
- `SUBJECT`: Mosswater Fen Drowned Warden boss
- `RUNTIME_SIZE`: 110–145

Required silhouette: heavy vertical armoured Warden identity; broad wet shoulders; old practical Warden armour/clothing distorted by long submersion; strong upright boss read; readable weapon/arm mass if present but preserve open space around lower body for attack telegraphs. Dark desaturated green-grey/brown, aged metal/leather, restrained algae/reed details. No zombie gore. No Grovekeeper recolour.

---

## A6 — Quarry Sentinel

Use the master isolated sprite prompt with:

- `ASSET_ID`: `quarry_sentinel`
- `SUBJECT`: Quarry Sentinel terminal boss
- `RUNTIME_SIZE`: 120–155

Required silhouette: broad stone/warden construct; unmistakably non-human mass distribution; heavy squared shoulders/torso; quarry-cut stone plates with limited old Warden architectural motifs; sturdy separated legs/feet with uncluttered ground space for attack telegraphs; large enough to read as terminal threat without filling the whole canvas. Muted quarry stone, iron-brown and restrained copper mineral accents. No Grovekeeper recolour.

---

## Targeted revision prompt

**BRIAR GLEN TARGETED REVISION ONLY — ONE ASSET**

Revise the supplied `[ASSET_ID]` production sprite. Preserve everything that already matches the approved Briar Glen family: camera, pose, overall proportions, material treatment, palette family, painterly softness, lighting direction, transparency, anchor and scale.

Change only this failure:

`[FAILURE]`

Do not redesign unrelated parts. Do not add a scene, extra variant, alternate pose, text or props. Return exactly one corrected isolated transparent production sprite.

Common revision instructions:

- lower the shoulder mass;
- simplify the silhouette by ~15%;
- reduce micro-detail ~20%;
- enlarge the key species-identifying feature slightly;
- remove boss-like emphasis;
- increase lower-body/telegraph negative space;
- remove external cast shadow;
- soften contrast;
- reduce saturation;
- correct the isometric camera;
- restore transparent safe margin;
- make facing direction more legible at 90 px.
