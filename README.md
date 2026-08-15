# Briar Glen

A mobile-first browser RPG vertical slice built to run from static hosting such as GitHub Pages.

## Current playable loop

Briar Glen → Meadow Road → gather Briarleaf → Copper Hollow → mine Copper → craft a Reinforced Sword → Emberback Den → defeat Emberback → unlock the shortcut home → turn in the contract.

## Controls

### Desktop
- **WASD / Arrow keys** — move
- **Space / J** — attack
- **Shift / K** — dodge
- **E** — interact / gather / mine / use shortcut
- **C** — craft at the blacksmith

### Phone / tablet
- Left virtual stick — move
- **ATTACK** — attack
- **DODGE** — dodge
- **USE** — interact / gather / mine / craft / use shortcut

Landscape is the primary phone layout, but portrait is supported.

## Run locally

No build step or external packages are required.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Architecture

The slice intentionally uses plain HTML, CSS, and Canvas JavaScript with no external runtime dependencies. Game coordinates are independent of screen resolution, while input and HUD layout adapt to touch/desktop environments.
