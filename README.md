# Briar Glen

Briar Glen is a mobile-first browser RPG vertical slice built with plain HTML, CSS and Canvas JavaScript and deployed through GitHub Pages.

## Current game

The slice now includes:

- Briar Glen settlement, Meadow Road, Copper Hollow, Emberback Den, Mooncap Grove, the Rootway and Mosswater Fen / Old Warden Crossing
- three weapon paths: Sword, Briar Bow and Glen Staff
- mobile aim assist and desktop mouse aiming
- weapon skills: Cleave, Pierce and Root
- dodge, enemy windups, boss encounters and persistent health/equipment progression
- Briarleaf, Mooncap, Copper, Deepvein Iron, Mossglass and field loot
- alchemy, Healing Tonics and Warden Oil
- Reinforced Pickaxe plus Tempered Sword, Briarstring Bow and Moonroot Staff masterwork upgrades
- Rowan's trader, permanent equipment and Beast Hide sales
- Grovekeeper and Drowned Warden progression encounters with named rewards
- discovery-based world map and Warden Journal
- Contract Board 2.0 with repeatable hunt, delivery and Fen survey work
- persistent local saves

The authored progression runs from Briar Glen through Emberback, Mooncap Grove and Mosswater Fen, then opens into repeatable Warden contracts and continued exploration/crafting.

## Controls

### Desktop

- **WASD / Arrow keys** — move
- **Mouse** — precision aim for ranged weapons
- **Space / J** — attack
- **F** — weapon skill
- **1 / 2 / 3** — Sword / Bow / Staff
- **Shift / K** — dodge
- **E** — interact / gather / mine / use world objects
- **C** — crafting / forge interaction
- **I** — Satchel
- **Q** — Healing Tonic
- **M** — world map
- **L** — Warden Journal

### Phone / tablet

- left virtual stick — move
- **ATTACK** — attack with directional aim assist
- **SKILL** — current weapon skill
- **SWORD / BOW / STAFF** — cycle weapon
- **DODGE** — dodge
- **USE** — interact / gather / mine / open nearby services
- **TONIC** — use Healing Tonic
- **MAP** — open the Warden field book/map

Landscape is the primary phone layout, while portrait remains supported and is part of the automated browser test matrix.

## Run locally

No application build step is required.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Architecture

The game uses resolution-independent world coordinates and a responsive Canvas/HUD layer. Runtime functionality has been added in versioned, additive layers so previously verified releases remain recoverable while the prototype evolves.

The production release is protected by GitHub Actions browser regression tests. Every gameplay suite runs in Chromium at phone landscape, phone portrait and desktop sizes. On pushes to `main`, the same suites are repeated against the deployed GitHub Pages URL.

Build 12.1 adds a fast static integrity/syntax gate ahead of Chromium so missing, empty or truncated runtime assets fail before the slower browser stage.

## Save compatibility

The current browser save key remains `briar-glen-vslice-v1`. Newer progression fields use safe defaults so existing saves can continue forward.
