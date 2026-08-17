# Build 24.1 authored sprite proof assets

These files are experimental Briar Glen look-development assets for the opt-in `?spriteProof=1` browser proof.

Current browser-proof sources:
- `cottage-authored.webp`
- `tall-tree-authored.webp`
- `pine-tree-authored.webp`

Provenance: generated specifically for Briar Glen in the project ChatGPT session on 2026-08-16 from the project look-development images, then re-encoded locally as alpha-enabled WebP for browser compatibility testing. They are not third-party asset-pack files.

The earlier palette-PNG proof files are temporarily retained only as rollback/debug evidence and are no longer loaded by the proof runtime. They will be removed after the WebP path is verified visually and technically.

Status: **experimental / not visually approved / not production baseline**.

The normal game path does not load these files. `src/v24/38-sprite-proof.js` requests them only when `spriteProof=1` is present in the URL. This keeps Build 23 rendering behavior as the default and makes the experiment immediately reversible.
