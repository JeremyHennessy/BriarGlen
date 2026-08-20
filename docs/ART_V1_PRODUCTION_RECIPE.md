# Briar Glen Art-v1 Production Recipe

**Recipe ID:** `briar-glen-art-v1-painted-family-v1`  
**Status:** LOCKED after Golden Scene v9 approval  
**Purpose:** Reproduce the approved painterly Golden Scene across complete production families without one-off style drift.

## Pipeline

1. **Reference lock** — Golden Scene v9 + the two canonical positive references are loaded for every look-development/family pass.
2. **Family-level source creation** — create complete representative families or complete regional source plates, never isolated one-off look-development assets.
3. **Single visual recipe** — fixed camera/projection, lighting, palette, materials, edge treatment, and detail density from `BRIAR_GLEN_ART_BIBLE_V1.md`.
4. **Source master** — work at 2× or greater intended gameplay resolution in sRGB.
5. **Extraction / cleanup** — object families use transparent RGBA masters with clean visible bounds; terrain uses overlapping painterly patches/masks with feathered organic edges.
6. **Deterministic post-process** — alpha cleanup, safe margin, anchor normalization, Lanczos downsample, and lossless/loss-minimized export. No per-asset recolor/style filters used to fake species/family differences.
7. **Runtime export** — PNG source masters; WebP/PNG runtime depending on alpha/detail needs. GitHub transport may use Git blob base64, but runtime files remain real image files.
8. **Manifest registration** — every role records family ID, Golden Scene version, recipe version, source/runtime file, dimensions, anchor, region, SHA256, and status.
9. **No fallback** — art-v1 preview fails closed if a required art-v1 role is absent. It never silently substitutes v24/v30/v41/v47/v48/v49 art.
10. **Comparison gates** — family overview, Golden Scene-context comparison, 932×430 landscape proof, 430×932 portrait proof, optional desktop proof, and legacy comparison.

## Locked Rendering Contract

- Projection: fixed high 3/4 orthographic-like isometric family; no perspective horizon.
- Key light: warm daylight from upper-left screen direction; broad soft shadows down-right.
- Color: sRGB; no global grading that changes the accepted palette.
- Detail: painterly medium-high detail that survives phone downsample without becoming noisy.
- Alpha: true alpha for objects; no baked rectangular background.
- Contact shadow: soft, low-opacity, consistent screen-space direction; object shadow may be baked if it does not create a visible halo, otherwise drawn by art-v1 owner.
- Object anchor: bottom-center at physical ground contact; character anchor at midpoint between feet; structures at center of footprint/front ground plane.
- Safe margin: target 8–12% transparent margin around isolated sprites unless footprint requires more.
- Export: source PNG; runtime WebP or PNG; never SVG/vector-flat replacements for painterly assets.
- Naming: `art-v1/<family>/<role>-<variant>-v1.<ext>`; manifests use stable role IDs independent of filenames.

## Terrain-Specific Contract

Terrain is the first production family. It must cover Briar Glen, Meadow, Mooncap Grove, Mosswater Fen, Copper Hollow, Stonepine Reach, and Emberback Den using the same painterly material family. Each region gets:
- base material;
- route/work surface where functionally needed;
- sparse accent/decal vocabulary;
- organic blend/mask behavior.

Terrain must not become rectangular tiles in final composition. Source patches may be rectangular storage images, but their runtime mask/edge treatment must produce irregular organic transitions.
