# Build 45 — Render Performance Recovery

Scope is performance-only. No new visual assets, gameplay entities, balance, progression, save-schema, tutorial/UI behavior, or world-layout changes.

Primary fixes:
- remove heavyweight generated-art diagnostic snapshots from render hot paths;
- bound generated draw-site diagnostics by stable entity identity so moving NPCs cannot grow the map indefinitely;
- configure image smoothing once per frame instead of once per sprite;
- preserve all existing generated art, variants, dressing, landmarks, rollback modes and compatibility diagnostics;
- add a dedicated render-performance regression and canonical performance rules.

Merge requires the existing full browser/art/layout/UI/landmark gates plus the new render-performance proof.
