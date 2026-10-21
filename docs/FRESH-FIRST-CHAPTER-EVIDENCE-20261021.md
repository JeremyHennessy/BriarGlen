# Briar Glen — Fresh First-Chapter Custodian Evidence (2026-10-21)

**Status: chapter NOT independently completed. Diagnostic-only; do not merge as a gameplay fix.**

## Protected starting points

- Verified current `main` before and after these experiments: `a5ed8b1f075696c52d9194ed52f31c559db2968c`.
- Existing first-chapter handoff: `9e7b403f381038254f2d87810e03185694328a98`.
- Preserve visual baseline, `briar-glen-reboot-v1` save semantics, resource prices, crafting requirements, combat, NPC economy, and autonomous world behaviors.
- Main normal smoke workflow passed on 2026-10-20: [run 39474211453](https://github.com/JeremyHennessy/BriarGlen/actions/runs/39474211453).
- This branch adds only a browser diagnostic, its isolated CI workflow and this evidence note. None of the runtime files were changed.

## What the browser actually proved

1. Historical [PR #254](https://github.com/JeremyHennessy/BriarGlen/pull/254) failed the full first-chapter audit on October 8 after carrying 2 Ashwood and 1 Wolf Hide. It never crafted the first bow.
2. Original unchanged audit against the new `main` failed again on October 21: 2 Ashwood, 3 Wolf Hides. [Run 39621599145](https://github.com/JeremyHennessy/BriarGlen/actions/runs/39621599145). Normal PR smoke passed.
3. Read-only forensic instrumentation (never used to guide the player) found **14 available Ashwood nodes in Greenwood on entry**; **13 were still available** when the scripted player had wandered far outside Greenwood and failed. [Run 39623030447](https://github.com/JeremyHennessy/BriarGlen/actions/runs/39623030447). This is not evidence of insufficient resource spawns or NPC consumption.
4. Repeated `DISTANT_THREAT` warnings showed the original audit loop called combat continuously against out-of-range wolves instead of resuming movement (233 repeats in [run 39623872115](https://github.com/JeremyHennessy/BriarGlen/actions/runs/39623872115)). A separate read-only route trace showed unchanged player position and route-move count over many iterations ([run 39624553894](https://github.com/JeremyHennessy/BriarGlen/actions/runs/39624553894)).
5. The diagnostic now advances the sweep index on actual moves and skips combat when `#combat-action` says `No target in reach`. This eliminated the repetitive distant-threat stall, but the fresh-player journey **still fails**, later in close wolf combat at low health and energy. [Run 39624794071](https://github.com/JeremyHennessy/BriarGlen/actions/runs/39624794071).
6. An experiment reducing routine Brace use failed (player fell to 8 HP) and was **fully reverted**, with a byte-identical verification of the pre-experiment test.
7. A **visual-only** resource-targeting test expanded the existing movement-help disclosure, used canvas pixel appearance to select an Ashwood icon, confirmed normal `Walking to Ashwood` feedback, and observed the *rendered Pack* increase Ashwood **0 → 1** without inventory grants or debug movement. However that same run then failed the health safety floor fighting wolves: [run 39625813628](https://github.com/JeremyHennessy/BriarGlen/actions/runs/39625813628). Smoke on that head passed: [run 39625813609](https://github.com/JeremyHennessy/BriarGlen/actions/runs/39625813609).

All developer-state introspection above was forensic/logging only, and was removed after its experiment. The current resource tap is through normal UI and displayed canvas pixels, not developer coordinates or debug cheats. Experiments were performed only in an isolated branch. [PR #257](https://github.com/JeremyHennessy/BriarGlen/pull/257) was closed **unmerged**, superseded by the current draft [PR #258](https://github.com/JeremyHennessy/BriarGlen/pull/258).

## What is still unknown

- Whether a first-time human who actively avoids wolf packs and gathers materials carefully can consistently survive the earliest route.
- Whether early wolf clustering creates genuine unavoidably dangerous spawn configurations.
- Whether the existing bow, Waycache, Trail Pack and wider-field lead chain can complete consecutively with no debug grants or teleportation. Existing isolated smoke tests do not establish the whole chapter.

**Do not lower wolf damage, add starter items, alter recipes or increase resource spawns** on the strength of the current automated-path failures.

## Next isolated acceptance sequence

1. Capture a fresh world visually before travel and choose a short, danger-aware route to **3 Ashwood**. Use only normal movement/tap/gather. Log changes in HP/energy, plus wolves visible along the path. Ensure the test can disengage/retreat instead of fighting stacked enemies until defeated. Do not consult debug entity positions for action decisions.
2. With Ashwood gathered, isolate a single wolf by normal movement and test ordinary Attack/Brace behavior until **1 real Wolf Hide** is collected. Measure survival. If even controlled play repeatedly fails, investigate game-side first-chapter safety narrowly.
3. Craft/equip Briar Bow + six Trail Arrows through Make/Pack; then gather enough real materials for return deposits and the earned Trail Pack, keeping costs unchanged.
4. Prove Overlook → Waycache capture → Brown Bread and six Trail Arrows stored → Trail Ledger completion → Trail Pack made → reload. Verify one-time rewards and unchanged save contract.
5. Prove Quarry/Moonwell/Mirecaller discovery and at least one complete second-act activity. Run at least three independent fresh sessions, regression smoke (desktop/touch), and exact hosted asset checks before promoting any runtime change.

**Acceptance gate remains red.** Do not claim “first chapter complete” until there is a full green audit, not just normal smoke CI. 
