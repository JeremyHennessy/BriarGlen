# Build 46 — Ground & Environment Generation Prompt Pack

Use these prompts when replacing procedural/composite runtime masters with dedicated source art. Generation output is never self-approving; every image must pass mobile-scale, alpha/seam, family and runtime checks.

## Master ground prompt

**BRIAR GLEN PRODUCTION GROUND ASSET**

Create exactly one production-ready ground texture for the Briar Glen mobile browser RPG.

STYLE LOCK: warm handcrafted storybook medieval fantasy; grounded materials; painterly but controlled; readable at small mobile gameplay scale; classic isometric MMORPG warmth without anime styling. Preserve Briar Glen's soft natural materials, restrained colour, handmade irregularity and authored appearance.

OUTPUT CONTRACT: exactly one ground material texture. No presentation board, labels, text, objects, buildings, characters, props, UI or border frame.

The texture fills the complete canvas and is perfectly seamless on all four sides. 512×512 source target.

This is a ground-facing material source, not a scenic illustration: no horizon, perspective, cast shadows or directional sunlight. Use soft diffuse lighting so runtime lighting owns the scene.

MOBILE READABILITY: broad material masses and restrained medium-scale variation. No tiny noise. When reduced to 64–128 px the material must still read cleanly.

TILING CONTROL: no obvious central feature, repeated ring, isolated hero stone, dominant flower cluster, edge seam or corner emphasis.

DETAIL DENSITY: approximately 60–70% of standalone fantasy concept-art surface detail.

AVOID: photorealism, pixel art, generic low-poly, glossy 3D, cartoon outlines, anime, oversaturation, huge stones, high-contrast cracks, dramatic shadows, obvious procedural noise or checkerboard repetition.

Generate ONE seamless material only.

## Region inserts

### Village
Material: **Briar Glen packed village earth**. Warm ochre-brown compacted soil, subtle pale dust, occasional embedded tiny rounded pebbles and extremely sparse short grass. Visibly walked-on but maintained; cozy village, not muddy farmyard.

A = cleanest; B = more worn; C = slightly grassier/pebbled.

### Meadow
Material: **healthy Meadow Road grass**. Muted warm green field grass with broad painterly value variation and tiny restrained dry-green interruptions. Bright and welcoming, never neon. No dominant flowers in base material.

### Grove
Material: **Mooncap Grove forest floor**. Deep mossy green-brown soil, soft decomposed leaves, broad moss patches and restrained root-coloured marks. Cooler than Briar Glen without magical glow in the base.

### Fen
Material: **Mosswater Fen walkable mud**. Damp dark olive-brown silt, subtle moss staining and occasional dull wet patches. Clearly walkable ground, not open water. Avoid mirror-like highlights.

### Copper
Material: **Copper Hollow quarry floor**. Muted warm-grey/brown mineral dust, compacted dirt, tiny angular stone chips and restrained rusty/copper mineral staining. Worksite character without noise.

### Stonepine
Material: **Stonepine Reach forest/highland floor**. Dry pine needles, muted ochre dirt and grey-brown grit. Cooler/drier than village ground, with needles grouped into broad painterly texture.

### Den
Material: **Emberback Den scorched ground**. Charcoal-brown earth, soft ash staining and extremely restrained warm ember/mineral flecks. Dangerous and scorched without becoming black/red noise.

## Functional surface prompt

Use the master ground prompt.

Create `[ASSET_ID]`, a seamless `[MATERIAL]` functional ground texture for `[REGION]`.

It must visibly belong to that region while being more compacted/readable than the surrounding base floor. The surface exists to communicate traversal or activity. Preserve broad clean shapes and low visual noise.

No props, fixed-direction tracks, footprints, labels, borders or embedded hero objects.

Examples: village workyard = scuffed packed dirt; Meadow path = pale compacted dirt/grass; Grove ruin = mossy old flagstone; Copper rubble = compact small quarry fragments; Stonepine gravel = restrained ochre-grey scree; Den cracked stone = broad dark warm stone plates.

## Transition edge prompt

**BRIAR GLEN TERRAIN TRANSITION — ONE ASSET**

Create one transparent RGBA terrain transition overlay between **[MATERIAL A]** and **[MATERIAL B]**.

Canvas: 512×256. Transition runs horizontally through the centre. One side contains irregular fragments/soft encroachment of MATERIAL B and naturally dissolves to full transparency toward the opposite side. Runtime layers it over MATERIAL A.

Edge shape is organic and asymmetrical with 3–6 broad irregularities. No straight line, repeated scallops or tiny fingers.

Everything outside the transition material is true transparent alpha. No cast shadow, outline, text or props. Designed to be flipped/rotated/reused without directional artifacts. Same Briar Glen painterly material scale as the base textures.

## Transition corner prompt

Use the transition edge prompt except:

Canvas: 512×512. MATERIAL B occupies one irregular corner and naturally feathers/dissolves toward the centre. It must support rotation/mirroring for reusable inner/outer terrain corners.

## Sparse decal prompt

Create exactly one transparent RGBA **ground decal** for Briar Glen.

Asset: `[ASSET_ID]`
Subject: `[DECAL DESCRIPTION]`
Canvas: 512×512 transparent.

Occupy only ~20–35% of the canvas with irregular empty space. Blend into existing ground rather than looking like a sticker. No base ground colour, rectangular footprint, large shadow or text. Use broad grouped detail that remains readable at small gameplay scale.

## Environment asset master prompt

Create exactly one isolated production environment asset for Briar Glen.

Warm handcrafted storybook medieval style, grounded materials, clear silhouette, restrained detail, 3/4 isometric/orthographic view, roughly 30–35° downward pitch, soft warm daylight from upper-left, weak perspective, transparent RGBA background, bottom-centre natural anchor and 7–10% transparent safe margin on every edge.

The asset must remain readable at approximately 96–180 px runtime size. Remove detail that becomes noise. No presentation sheet, labels, scenery, platform, giant contact shadow, UI, alternate variants or unrelated props.

Same family, different individual: do not change the established Briar Glen art direction.

## Targeted revision prompt

**TARGETED REVISION ONLY.** Preserve the exact material family, painterly treatment, scale of detail, camera and colour identity. Change only `[FAILURE]`.

Common corrections: remove tiling landmark; reduce micro-detail 20%; soften contrast; remove directional lighting; eliminate seam; enlarge detail groups; reduce saturation; improve alpha edge; make transition less regular; simplify silhouette.

Return exactly one corrected production asset.
