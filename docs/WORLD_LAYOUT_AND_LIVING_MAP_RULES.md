# Briar Glen — World Layout & Living Map Rules

Status: **canonical design reference for World Layout V2 and later**  
Applies to: mobile browser runtime, isometric world layout, village, exploration zones, encounter spacing, gates, borders, resources, ambient life, generated assets.

## 1. Design intent

Briar Glen should feel like a small believable medieval region rather than a sequence of rectangular combat rooms or a long content strip.

The world must communicate three things without relying on UI arrows:

1. **where the player is** — every region has a distinct silhouette, material palette and landmark;
2. **where the player can go** — routes are legible through terrain, negative space, lighting and border shape;
3. **what kind of activity belongs there** — settlement, gathering, danger, discovery and boss spaces each have different density and pacing.

The world is intentionally compact. Compact does **not** mean crowded. The player needs alternating compression and release: village activity → open road → threat pocket → quiet resource pocket → landmark/gate → new biome.

---

## 2. Research basis

These rules were synthesized from primary developer talks and then adapted to Briar Glen's 2D/isometric/mobile constraints:

- GDC 2017 — Lisa Brown, **Applying 3D Level Design Skills to the 2D World of Hyper Light Drifter**: 2D spaces still benefit from flow, landmarks, sightline control, readable affordances and purposeful negative space.
- GDC 2015/2016 — Campo Santo / Klei, **Designing for Exploration and Choice in Firewatch** and **Building Firewatch in Unity**: world structure, goals, gating and encounter placement should be developed together rather than added independently.
- GDC 2018 — **Invisible Intuition: Blockmesh and Lighting Tips to Guide Players and Set the Mood**: geometry, art, FX and lighting can guide navigation before explicit waypoints are required.
- GDC 2016 — Seth Rosen, **Adding Life to your Level**: systemic actors and recurring behaviors make a space feel inhabited more effectively than static decoration alone.
- GDC 2010 — Harvey Smith / Matthias Worch, **What Happened Here? Environmental Storytelling**: props, composition and systemic reactions should imply history and use, not merely decorate empty ground.
- GDC 2017 — Eidos-Montreal, **Rewarding Exploration in Deus Ex: Mankind Divided**: dense optional detail should tie navigation and narrative together so the environment feels interconnected.
- GDC 2021 — House House, **Google Maps, Not Greyboxes**: believable locations benefit from real-world spatial logic and from letting functional constraints shape the layout.
- GDC 2016 — Metanet, **Empowering the Player: Level Design in N++**: a primarily directed experience can still allow players to choose how they read and traverse a space.
- GDC 2015 — Forrest Dowling, **Using Level Design Tools Expressively**: gates, delays and triggers are pacing tools, not merely locks.
- GDC 2025 — Marie Mejerwall, **Growing an AI Director into a Full Adventure Director**: procedural encounter timing works best when authored spaces retain control over where pressure may enter and when the experience needs relief.

These talks are inputs, not authority over the project. Briar Glen's approved player fantasy, mobile readability and existing gameplay contracts take precedence.

---

## 3. World topology rule

### Required macro structure

Use **hub + loops + branches**, not one continuous corridor.

Briar Glen is the hub. From it, the player reads at least two meaningful directions even if progression initially makes one route more useful.

Current regional topology:

```text
                      STONEPINE REACH
                           ↑
                    Stonepine Pass
                           ↑
                     MOSSWATER FEN
                           ↑
                    Warden Crossing
                           ↑
        MOONCAP GROVE ← MEADOW ROAD → COPPER HOLLOW → EMBERBACK DEN
               ↖            ↑                ↘             │
                 \        BRIAR GLEN          \            │
                  \________ HUB _______________\___________│
                              ↖       OLD ROOTWAY SHORTCUT ↙
```

The drawing is topological, not literal screen orientation.

### Route hierarchy

Every navigable region has three route classes:

- **Primary route:** unmistakable critical-path lane; broad, low obstruction, landmark-to-landmark.
- **Secondary route:** optional resource/exploration loop that reconnects to the primary route.
- **Micro route:** short local detour around a building, rock mass, ruin, resource pocket or environmental story.

A region with only a primary route is incomplete unless it is intentionally a short transition space.

---

## 4. Mobile spatial metrics

The player collision radius is approximately 23 world units, so a full player body is about 46 world units wide. Use that as the base metric.

### Traversal clearances

- Primary travel lane clear width: **180–240 world units** (~4–5 player widths).
- Secondary lane clear width: **120–170**.
- Deliberate choke/gate clear width: **90–125**, never narrower without a gameplay reason.
- Combat arena usable diameter:
  - normal melee pocket: **300–420**;
  - elite/boss: **420–600**.
- Minimum unobstructed space around an interactable service: **95–120 radius**.
- Minimum spacing between competing interactables in town: **130 world units** unless they belong to one intentionally grouped station.

These numbers are defaults. Readability on the smallest supported phone viewport wins over exact adherence.

### Landmark cadence

On normal movement speed, the player should encounter a new spatial read approximately every **4–8 seconds**:

- a landmark comes into view;
- the route bends;
- terrain material changes;
- a resource pocket opens;
- an enemy silhouette appears;
- a gate/ruin/bridge becomes readable;
- the route enters a clearing.

Do not fill every interval with combat.

---

## 5. Village design rules

Briar Glen is not a row of vendors. It is a settlement with districts around a shared green.

### Districts

**Hearth Quarter**
- Tavern, Warden House, warm lamps, benches, wagon/supply dressing.
- Highest social/ambient motion.
- Softer path edges and strongest warm-night-light language.

**Village Green**
- Well + Contract Board as orientation anchors.
- Broadest negative space in town.
- Must remain visually readable immediately after spawn/recovery.
- No decorative prop may turn the green into an obstacle course.

**Workyard / Market Edge**
- Forge, alchemy, Rowan market.
- More crates, sacks, barrels, log piles and work materials.
- Props cluster against structures, never across approach lanes.

**Cottage / Garden Edge**
- Residential buildings, fences, hay/trough/garden language.
- Quieter than the market side.
- Boundary vegetation should make town feel enclosed without becoming a solid wall.

### Village circulation

- One readable loop connects tavern → green → market/workyard → cottages → green.
- A clear eastbound departure line leads to Meadow Road.
- The Grove route should be readable as a branch, not as an accidental off-screen escape.
- Building doors/interactions should face or visually address a path or clearing.

### Spawn/recovery

Player spawn/recovery must place the player in a calm orientation space, not directly against a building, fence or modal interaction.

Target recovery read:

1. Village Green visible.
2. Contract Board / well legible.
3. Meadow departure route visible.
4. No immediate enemy pressure.

---

## 6. Terrain and biome language

### Briar Glen

- Rounded clearings and soft grass value changes.
- Timber/stone architecture provides most vertical contrast.
- Border: layered trees, fences, gardens and cottage edges.

### Meadow Road

- Broad S-curves, grass shoulders and periodic open meadow pockets.
- Do not line both sides with identical trees.
- Resources live in small off-route pockets, not directly on the centerline.
- Threats should be visible before aggro whenever possible.

### Mooncap Grove

- Looping woodland path around a ruin/cache landmark.
- Tree masses create alternating narrow entries and round clearings.
- Mooncaps sit in readable violet-value pockets separated from general green noise.
- Grovekeeper arena must read as a destination clearing before combat starts.

### Copper Hollow

- Quarry benches and rock walls define movement; rock placement should look geological, not random.
- Copper/iron nodes belong in cut faces and side pockets.
- Main lane remains wide enough for ranged combat.
- Use dead trees, rails/track marks and ore color as direction reinforcement.

### Emberback Den

- Compression on approach, then a large boss bowl.
- Perimeter rock/ember masses form an arena edge without an invisible circular wall.
- Strongest warm/cool contrast and least decorative clutter.
- Rootway exit must become an obvious post-boss release route.

### Mosswater Fen

- Navigable land reads as connected islands/causeways within wet negative space.
- Pools and tree masses should create visual containment rather than random obstacles.
- The Warden Crossing is a threshold: show meaningful fen scenery beyond it before it opens.
- Mossglass is placed on route edges and side islands, not hidden behind visual noise.

### Stonepine Reach

- Zig-zag ridge/pass rhythm rather than a flat rectangle.
- Camp is a breathing node before deeper quarry pressure.
- Resin pockets branch from the route and reconnect.
- Quarry Sentinel space is a broad terminal basin with clear telegraph room.

---

## 7. Border design

Borders use three layers:

1. **Hard gameplay boundary** — world limit, blocker, gate or impassable terrain.
2. **Readable physical mass** — trees, rock face, water, fence, cliff, ruin mass.
3. **Soft visual fringe** — bushes, grass, small rocks, shadow, fog, fallen logs, reeds.

Never rely on an invisible collider as the only border cue.

### Border rhythm

Do not create perfectly continuous walls. Use:

- 2–4 dense masses;
- a small visual recess;
- another mass;
- occasional landmark silhouette;
- controlled openings only where traversal is intended.

A border opening should look more inviting than the decorative recesses around it.

---

## 8. Gates and progression thresholds

A gate must do four jobs:

1. explain that traversal is blocked;
2. communicate what kind of place lies beyond;
3. provide enough space to approach, read and interact;
4. become a memorable transition after opening.

### Gate staging

- Gate should become readable roughly **one phone screen before interaction distance**.
- Keep a **160–220 world-unit staging clearing** on the near side when combat is not the purpose.
- Provide a visual teaser on the far side: different trees, fog, water, quarry rock, warm den light, etc.
- Do not place a routine enemy directly on a progression gate unless the gate itself is the encounter.

The Old Warden Crossing, Stonepine Pass and Old Rootway are transition landmarks, not generic doors.

---

## 9. Resource spacing and respawn

Resources should form **pockets**, not evenly spaced breadcrumbs.

### Pocket pattern

Typical regional pocket:

- 2–3 useful nodes within **110–220 world units**;
- **180–350** units before the next equivalent pocket;
- at least one distinct terrain or prop cue around the pocket;
- not all nodes visible from the same standing point.

### Respawn targets

Default field target ranges after collection:

- Briarleaf: **28–38 s**
- Mooncap: **34–46 s**
- Copper: **36–50 s**
- Deepvein Iron: **42–58 s**
- Mossglass: **44–60 s**
- Ironpine Resin: **46–62 s**

These are world-feel targets, not economy guarantees. Economy/balance can override them deliberately.

Do not respawn a resource directly under the player if the player is still occupying the pocket.

---

## 10. Enemy spacing and spawn timing

Avoid the arcade effect where enemies refill immediately behind the player.

### Threat pockets

- Normal enemies are grouped into authored pockets with a clear home territory.
- Typical center-to-center separation: **260–440 world units**.
- First threat after a safe hub/major gate: allow roughly **180–300 units** of orientation space.
- Boss/elite arenas receive a clean pre-fight staging band.

### Respawn targets

- Briar Wolf / early road threat: **24–34 s**
- Hollow Boar: **28–40 s**
- Mireling: **34–46 s**
- Bog Stalker: **40–54 s**
- Ridgehorn: **44–58 s**
- Quarry Wisp: **42–56 s**

Persistent bosses remain persistent according to their existing progression logic.

### Proximity suppression

If a normal enemy's respawn is due while the player is within approximately **320 world units of its home**, delay the respawn by another short interval. A spawn should feel like the world repopulated, not like an actor materialized behind the camera.

---

## 11. Making the map feel alive

Use multiple time scales. Do not make every animation loop at the same frequency.

### Continuous layer

Always subtle:

- foliage sway / tiny light motion;
- water/fog drift;
- forge/fire glow;
- NPC walking when appropriate.

### Intermittent layer: roughly 4–9 seconds

Examples:

- bird/sparrow crossing;
- butterfly or leaf drift;
- fen firefly;
- quarry dust;
- den ember mote;
- short NPC idle/turn.

### Slow systemic layer: roughly 20–60 seconds

Examples:

- resource repopulation;
- enemy pocket recovery;
- NPC route cycle;
- a region-specific ambient burst.

The goal is **asynchronous life**. Players should not be able to see the level's clockwork reset in unison.

### NPC behavior

Town NPCs should pause naturally at waypoint changes.

Default idle: **1.2–3.5 s**, varied per NPC/waypoint.

Do not stop all NPCs together. Do not let all NPCs walk forever with no reason to pause.

---

## 12. Asset placement rules

Generated sprites do not justify extra density.

### Large assets

Buildings and tall trees are landmarks. Keep enough negative space around them that silhouettes remain distinct at mobile scale.

### Medium props

Crates, sacks, barrels, hay, logs, benches, wagons and troughs should normally hug a building edge or activity node.

They should answer a question such as:

- What is made here?
- What is stored here?
- Who uses this space?
- Where does traffic stop?

If a prop has no spatial/story purpose, remove it.

### Repetition

Never create obvious identical rows of the same sprite unless the object logically forms a row (fence, crop row, quarry cut, etc.).

Vary scale modestly, use clustering, and preserve family consistency.

---

## 13. Density budget

Visual density follows gameplay importance.

- Hub center: medium density, high landmark clarity.
- Workyard/market: medium-high prop density at edges, low center-lane density.
- Main road: low-medium.
- Exploration pockets: medium.
- Resource pocket: medium near the resource, low on approach.
- Combat arena: low obstruction, stronger perimeter density.
- Boss arena: lowest interior prop density.

**Empty ground is an intentional design material.**

---

## 14. Verification gates for map changes

Every meaningful map/layout change must prove:

### Gameplay integrity

- worldObjects/resources/enemies counts change only when explicitly intended;
- save key and progression state remain compatible unless a migration is documented;
- all required interactables remain reachable;
- all gates remain completable;
- Rootway remains bidirectional after unlock;
- no blocker creates a hidden trap or seals a required lane.

### Spatial readability

Capture at minimum:

1. Briar Glen / Village Green
2. Meadow Road + Grove fork
3. Mooncap Grove destination clearing
4. Copper Hollow resource/combat pocket
5. Emberback Den arena
6. Mosswater Crossing/Fen
7. Stonepine camp/pass
8. Quarry Sentinel basin

### Mobile proof

Verify both landscape and portrait supported phone viewports. A path that looks obvious on desktop may become visually ambiguous when only a small region is visible.

### Historical recovery

Approved historical art scopes and explicit rollback query parameters must continue to recover their intended older visual state unless the user explicitly retires them.

---

## 15. Change-control rule

Do not redesign the map while fixing an unrelated gameplay bug.

World Layout V2 is an explicitly authorized map redesign. Once the user approves a resulting layout, that layout becomes a new approved baseline and later fixes must preserve its:

- region topology;
- service placement;
- path hierarchy;
- gate staging;
- border rhythm;
- encounter clearances;
- landmark relationships.

Future changes should modify the smallest spatial unit required.
