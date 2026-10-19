# Seasonal realism and crystal passages

19 October 2026. Local source implementation.

## Entering a season

The original white crystal still reveals the cherry-blossom sanctuary. Each seasonal monument now carries a smaller crystal in a dark, octagonal metal socket below its cover, at 0.93 m above the water. Spring is pink, summer yellow, autumn red and winter pale blue. The main manga cover remains a photograph.

Approach within 2.65 m and face a crystal. Press E/Enter, select **Take the … crystal**, or tap the crystal itself. Touching the surrounding canvas does not select it. The crystal releases from its mount, moves within reach, floats, and steadily illuminates the stone, blossoms and reflections with its colour. A matching screen glow envelops the view before the loading curtain opens into the season. The passage lasts 3.6 seconds, or 1.25 seconds with reduced motion. Reduced motion removes orbiting particles and floating oscillation.

Movement and duplicate pickups are blocked during extraction and loading. Returning preserves the visitor's sanctuary position and restores the mounted crystal. Failed/cancelled loading restores the crystal, lighting and input. The nine-monument pool retains the repeating five-cover order across floating-origin shifts. Preview controls remain development-only and intentionally bypass the ritual for scene inspection.

Assets: the seasonal gems reuse the faceted core of the already supplied **Magic Crystal B&W** model by Toni García Vilche / zul_gv (CC BY 4.0), with new coloured materials. Existing attribution remains in `/void/credits.html`. Recesses, metal retaining fingers, halo and fixed particle pool are authored geometry/effects. No new external asset downloads are required.

## Landscape changes

- Summer: stronger shoaling crests, irregular breaking foam, shore wash and bounded airborne spray. The sea remains tied to the same island height field. The visitor can reach shoulder-deep water while keeping the eyes at least about 0.29 m above mean water level; walking back to dry sand is supported.
- Beach furniture: a full 2.24 m slatted teak chaise with padded canvas, piping, head cushion, hardware and legs grounded on the sand. A 3.8 m ribbed parasol provides headroom and casts a real shadow over the seating. The furniture is seven batched material draws and 7,700 triangles. Navigation and ball contacts use the same full chaise footprint. Shells form irregular tide-line clusters and follow the sand slope.
- Autumn: eight small fish swim below the water, represented by refracted silhouettes. One fish occasionally makes a short 3D leap, with takeoff and landing ripples. Reduced motion keeps them stationary. The lake's reflected canopy, bank geometry and wading boundary remain intact.
- Forest backdrops: spring 326 trees, autumn 298 and winter 331, with additional distant rings in every direction. Near-tree counts remain bounded and distant trees retain the cheaper geometry.
- Ground cover: denser spring blades/petals and autumn leaves. Shared shader contacts bend nearby grass and briefly lift/shift petals or leaves as the visitor walks or taps. Four recent contacts are reused; there is no per-leaf physics allocation. Autumn leaf geometry is reduced to offset the larger scatter count. Adaptive scene quality also bounds meadow density.
- Sunlight: depth-tested sun disc and halo in each season, aligned with its directional light. Trees and umbrellas occlude the glare. Existing static sun shadows remain in use.

## Validation

TypeScript and these automated checks pass:

```text
node scripts/test-season-crystals.mjs
node scripts/test-season-realism.mjs
node scripts/test-season-water.mjs
node scripts/test-season-layout.mjs
node scripts/test-season-navigation.mjs
node scripts/test-coastal-plants.mjs
node scripts/test-void-awakening.mjs
node scripts/test-void-navigation.mjs
node scripts/test-season-assets.mjs
```

Movement and ritual timing are checked at 30/60/120 Hz, including real GLB mounting/tap targeting, rare single-fish jumps, reduced motion, chair collisions, wading depth and returning to shore. The asset audit validates 93 prepared component LODs.

The final `npm run build:vercel` production build passes. Its log is saved in `../output/seasons/realism-crystals-build.log`. The generated production handler returns 200 for `/` and 404 for the development-only `/world-preview`. This is a build verification, not a deployment.

An earlier local beach inspection in this work session showed the new furniture, waves and shadows without reported console/shader errors, with a short settled sample of 60 FPS and 6.24 ms GPU time on Intel Iris Xe at 1021 × 572. That sample predates the pillar-crystal changes and does not verify their visual result or performance.

Browser control was subsequently disabled in Work settings. The final crystal animation and final seasonal shader variants therefore still require browser visual review. Physical phone frame rate/thermal behaviour and universal lag-free performance are not certified. The saved Sites project ID returned `project not found`; the implementation has not been published.

During preview shutdown, retained browser logs exposed a duplicate wind/contact variable in the spring grass vertex shader. The contact variable was renamed and a shader-composition regression check was added. The corrected variant has not been rechecked on the GPU because browser control remains disabled.
