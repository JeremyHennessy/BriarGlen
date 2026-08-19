# Build 45 root cause

The slowdown was traced to generated-art presentation layers calling the heavyweight `getGeneratedArtState()` snapshot getter from per-frame draw paths. That getter clones the accumulated diagnostic map. At the same time, the diagnostic map used changing rounded world coordinates in its key, so moving NPCs continuously created new entries. The combination caused render cost and memory pressure to grow during play.

Build 45 replaces render-time snapshot queries with `isGeneratedArtEnabled()`, bounds draw-site diagnostics by stable entity identity, and configures image smoothing once per frame.
