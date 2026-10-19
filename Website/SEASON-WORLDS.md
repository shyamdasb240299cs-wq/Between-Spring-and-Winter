# Four season worlds

> Historical conversion notes for the retired monolithic scene pipeline. See [SEASON-TERRAIN-REBUILD.md](SEASON-TERRAIN-REBUILD.md) for the active authored terrain implementation and current asset sources.

The blossom sanctuary is the hub. Its monuments repeat five covers in this order: main cover, Part One / Spring, Part Two / Summer, Part Three / Autumn, Part Four / Winter. A visitor approaches the front of a seasonal cover and deliberately selects **Enter season** (or presses E). The screen fades, the requested environment loads and its shaders compile behind the curtain, then it fades back in. Returning restores the hub's existing position. Winter retains the selected green landscape with falling snow.

## Runtime architecture

- Reuse the existing Three.js renderer and input surface. Only the active world renders; hub animation/reflections stop during a season visit. Dispose the seasonal geometries, materials, textures and image bitmaps on return.
- Fetch each season on demand. Never request the four original `.blend` scenes from the browser. Keep source downloads and conversion intermediates in the ignored `Assets and working files/seasons/sources` directory.
- Convert original meshes to glTF, preserve authored albedo and leaf opacity, bound texture resolution, reduce distant and small geometry, compress meshes with Meshopt, and batch repeated props spatially for GPU instancing and frustum culling.
- Ship separate desktop and compact glTF files. Coarse-pointer devices, small landscape viewports and devices reporting 4 GB RAM or less request the compact file only. Compact trees retain fewer branch rings and leaf cards, with cluster coverage compensation and 512 px texture bounds. Both variants use the same validated walking map.
- Use a separate baked navigation grid with null cells for obstacles and edges. Ground heights interpolate beneath a 28 cm body radius. Movement uses small time steps, checks slopes and steps, slides along walls and resets held input on blur, transitions and cancellation.
- Desktop supports arrows / WASD, drag to look and wheel movement. Touch supports the existing joystick and a separate finger dragging the canvas. The site's landscape orientation requirement remains in effect.
- Winter snowfall uses a bounded GPU point cloud, with fewer points on touch devices and static flakes for reduced motion. Pause controls ambient animation.
- Adapt season render resolution within a bounded range when measured GPU time exceeds the budget. No seasonal realtime reflections, volumetric ray marching or per-tree shadow maps.
- Preserve recoverability: cancellable loading, timeout, retry by re-entering, input blocking during fades, graphics-context failure UI and a return control.

## Asset audit

| Season | Blendkit source ID | Source bytes | Source polygon count from Blender |
| --- | --- | ---: | ---: |
| Spring | a14302f7-af57-42d2-a489-594cbcc51a6c | 356,627,742 | 4,657,220 |
| Summer | 842ce837-9d3f-4b68-9049-45cd0ee92777 | 372,401,159 | 1,388,860 |
| Autumn | 0eacf36c-28e3-4ee9-8489-797c6df77d83 | 322,224,591 (1K source variant) | 6,566,703 |
| Winter | aeab2470-9a94-45b1-a810-c1e213190dcf | 275,139,623 | 4,859,005 |

All four resolved as free, royalty-free scenes. The summer and winter catalog polygon counts were inaccurate; actual source geometry was inspected in Blender 5.2.1. Sources target Blender/Cycles, with scatter graphs and materials that require conversion. Browser visuals must be checked against the downloaded content; an asset's promotional render is not evidence of usable navigation or exported geometry.

Portable materials preserve source color images and leaf masks. Cycles material layers, volumetric enclosures and transparent particle-emitter shells do not transfer directly; they are replaced with simple PBR materials, depth fog and lightweight seasonal effects. Embedded summer/winter scatter is reduced; missing external Geo-Scatter graphs in spring/autumn remain offline. These are optimized adaptations of the selected sources, with visible differences from their promotional renders.

## Device and navigation scope

The renderer requires WebGL 2, WebAssembly and WebP support with hardware acceleration enabled. A modern browser on a 4 GB or better phone is a testing target, not a certified minimum specification. Low-memory and data-saver devices select the compact export. The first visit still downloads and prepares one landscape; loading can be cancelled. The existing story remains available if graphics initialization fails.

Navigation follows exterior terrain, avoids solid props and stops at water, steep drops and map boundaries. This phase provides grounded walking and looking; it does not add jumping, swimming or navigation between stacked indoor floors. A multilayer navigation mesh would be needed to open upstairs interiors later.

## Performance acceptance targets

These are targets, not claims of universal device performance. Aim for 60 FPS on a modern laptop/desktop and sustained 30 FPS or better on representative midrange mobile hardware. Start with 1K textures, approximately 150 draw calls or fewer and 500,000 visible triangles or fewer per seasonal view. Keep each compressed world ideally below 15 MB, with an explicit review if it exceeds 25 MB. Avoid simultaneous season downloads and decoding. The first visit necessarily has a network/loading delay; a fade does not remove that delay.

Browser size emulation verifies layout and controls, not a phone GPU or thermal behavior. Physical Android Chrome and iOS Safari checks remain necessary before claiming mobile performance. Validate walking at spawn and around terrain edges, walls, stairs, water and return portals; test repeated entry/exit for memory growth; test cancellation, failed assets, blur, rotation and reduced motion. Use `.void-render` telemetry (`data-fps`, `data-gpu-ms`, `data-draw-calls`, `data-triangles`, `data-render-size`) for measured results.

## Local conversion and verification

1. `node scripts/fetch-season-sources.mjs` downloads only the selected free scenes. No account key is stored.
2. `scripts/unpack-season-sources.py` streams the compressed Blender files into working copies; it requires Python `zstandard`.
3. Run `scripts/audit-season-source.py` through Blender. For spring and autumn, run `scripts/prepare-season-working-copy.py <season>` with Python and Blender Asset Tracer to remove authoring-only object properties and scatter references from the raw working copy. Downloaded originals remain intact. Run `scripts/export-season-world.py` through Blender with `--background --factory-startup --disable-autoexec --python-exit-code 1`; it takes the season ID and an image-processing Python executable with Pillow available. Blender supplies NumPy for geometry conversion. Run `node scripts/bake-season-navigation.mjs <season>` against the desktop export, then `node scripts/pack-season-runtime.mjs <season>` to compress/deduplicate textures and materials and record the asset budgets. Repeat the Blender export with `--mobile` after its season/Python arguments, then `node scripts/pack-season-runtime.mjs <season> --mobile`. After packing both variants, run `node scripts/quantize-season-runtime.mjs <season>` for attribute quantization, mesh reordering and removal of unreferenced authoring data. Run `node scripts/bake-season-navigation.mjs <season>` again against the final compressed desktop model; the baker decodes normalized attributes and follows quantization transforms.
4. Run TypeScript checks and `node scripts/test-season-navigation.mjs`, `node scripts/test-void-navigation.mjs`, `node scripts/test-void-awakening.mjs`, and `node scripts/test-season-assets.mjs`.
5. `/world-preview` is a development-only QA surface. Production returns 404. Use it to inspect all four worlds and transitions without replaying the opening film.

## Verified local result — 17 October 2026

All eight final GLBs loaded in the browser with no console errors. The five-cover sequence, proximity prompt, E entry, fade, loading cancellation, keyboard movement, phone-layout joystick, ambient pause, Escape/back return and saved hub position were checked. Geometry/texture counters returned to the hub baseline (35–36 geometries, 23 textures) after leaving seasonal worlds. This checks GPU resource release; it is not a long-duration browser heap audit.

| World | Desktop file (MiB) | Compact file (MiB) | Desktop entrance GPU time / draw calls | Compact entrance GPU time / draw calls |
| --- | ---: | ---: | --- | --- |
| Spring | 12.94 | 10.73 | 11.55 ms / 124 | 6.63 ms / 124 |
| Summer | 6.63 | 5.47 | 7.01 ms / 76 | 4.26 ms / 76 |
| Autumn | 5.53 | 5.77 | 6.28 ms / 39 | 3.63 ms / 36 |
| Winter | 2.92 | 1.33 | 14.63 ms / 40 | 4.42 ms / 39 |

Measurements use the local in-app Chromium browser on Intel Iris Xe: 1280 × 720 desktop, 844 × 390 compact layout. The final sampled views were 56–60 FPS; results vary with camera position and machine load. Compact Autumn has fewer triangles but a slightly larger compressed file because its material/geometry sharing differs. Spring and Winter exceed the original 500k visible-triangle target; Spring retains about 836k in its compact entrance, Winter about 574k (about 2.04m on desktop). Keep those explicit exceptions in physical-device review.

TypeScript, season navigation, original sanctuary navigation, awakening and final asset/connectivity tests pass. `npm run build:vercel` passes from the temporary short workspace alias on this Windows machine; the long workspace path hit a dependency-copy path limit. The built production handler returns 200 for `/` and 404 for `/world-preview`. Conversion and compression tools are development dependencies, not visitor downloads.

The implementation is available locally. Physical Android/iOS GPU, thermal behavior, low-memory recovery, long-duration traversal, reduced-motion OS settings and network-failure injection have not been certified. Universal “no lag” is not a supportable guarantee. Validate those on the intended devices before treating this as a mobile performance release.
