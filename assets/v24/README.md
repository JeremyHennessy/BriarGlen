# Build 24.1 authored sprite proof assets

These three PNGs are experimental Briar Glen look-development assets for the opt-in `?spriteProof=1` browser proof.

- `cottage-authored.png`
- `tall-tree-authored.png`
- `pine-tree-authored.png`

Provenance: generated specifically for Briar Glen in the project ChatGPT session on 2026-08-16, then downscaled and palette-quantized for browser proof use. They are not third-party asset-pack files.

Status: **experimental / not visually approved / not production baseline**.

The normal game path does not load these files. `src/v24/38-sprite-proof.js` requests them only when `spriteProof=1` is present in the URL. This keeps Build 23 rendering behavior as the default and makes the experiment immediately reversible.
