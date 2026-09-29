# Briar Glen

Briar Glen is a small 2D systems-first RPG about becoming useful to a place that keeps living when you are not the center of it.

## Current foundation

This is a complete gameplay reboot. The active game is intentionally small and readable:

- autonomous NPCs choose goals from hunger, energy, work, shortages, mood and time of day;
- NPCs gather, consume, produce, exchange goods with each other, create real requests and remember both player and NPC help;
- prices respond to need, stock and trust, while shortages propagate through the town instead of waiting for the player;
- gathered materials carry quality and crafted items inherit material quality;
- tools and weapons have quality and durability that materially change gathering and combat;
- skills improve through use and each active skill solves a real problem;
- dynamic weather changes gathering value;
- wolves create field risk and useful hide rather than disposable combat loot;
- the world persists locally, including NPC memory and trust.

## Design rule

Graphics stay deliberately simple until the simulation earns more presentation work. New features should deepen consequence, agency, memory, item value, skill value or world autonomy before they add visual complexity.

## Controls

- Move: WASD / arrows
- Attack: Space
- Interact / gather: E
- Survey: 1
- Mend: 2
- Brace: 3
- Read Need: 4
- Drink Field Tonic: Q

Touch controls are included for movement, attack and use.

## Run

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/`.

## Test

```bash
npm install --no-save playwright@1.55.0
npx playwright install chromium
node tests/smoke.mjs http://127.0.0.1:4173/
```
