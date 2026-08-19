# Briar Glen Render Performance Rules

This file is the canonical guardrail for presentation-layer performance after Build 45.

## Non-negotiable hot-path rules

1. Render loops must never call heavyweight debug/state snapshot getters that clone maps, arrays, or nested objects.
   - Use `__BRIAR_GLENDebug.isGeneratedArtEnabled()` for the generated-art enable check.
   - `getGeneratedArtState()` is diagnostic/test-only.
2. Per-entity diagnostics must use stable entity identity, not changing world coordinates as map keys.
   - Moving NPCs/enemies must update an existing diagnostic entry rather than allocate a new entry every frame.
3. Image smoothing quality is configured once per frame, not once per sprite.
4. Presentation-only art layers must cull before drawing and must not add gameplay entities, collisions, interactions, save fields, or progression state.
5. Asset/landmark/dressing modules may maintain small counters for proof, but may not deep-clone or rebuild diagnostic structures during rendering.
6. New art passes must run `tests/render-performance-smoke.mjs` before merge.

## Acceptance gate

The render-performance proof must verify on phone landscape and portrait that:

- heavyweight generated-art snapshots do not leak into the render hot path;
- generated draw-site diagnostics stay bounded by the live entity population;
- draw-site count does not grow continuously during stationary play while NPCs move;
- headless frame cadence remains above the catastrophic-regression floor;
- no runtime errors occur.

This gate complements, rather than replaces, the full Browser smoke, Phone UI/tutorial, Generated art, World Layout V2, Asset variants, and Landmark state proofs.
