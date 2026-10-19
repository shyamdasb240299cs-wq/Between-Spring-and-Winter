# Authored seasonal landscapes

The runtime now assembles terrain, selected individual models and seasonal effects. It no longer loads the previous monolithic Blendkit world exports. The blossom sanctuary remains the hub.

## Current implementation

### Reference scene revision — 18 October 2026

This revision supersedes the compact revision below. The reference images guide spring's dense green lawn and cherry canopy, and autumn's golden lakeside park.

- Spring has 197 placed trees, short 3D meadow blades, original Poly Haven grass geometry/UVs, clover, daisies, clustered ground petals and 2,600 airborne petals (950 on mobile). The blanket holds genuine model assets: a wicker hamper with its lid, a fruit basket, scanned apples, carved plates and a thermos. Placeholder food and basket handles were removed.
- Autumn has 186 trees, yellow/red leaf litter, a branching path leading to an irregular lake and a bench facing the path. The lake and its dry bank share the exact CPU/GPU height field. Navigation stops before the water. Real canopy reflections update through one small bounded pass; the surface adds gentle ripples, shallow-bank shading and cast tree shadows. Fuller distant maple meshes replace the fragmented far silhouettes.
- Summer has a photographed sunset, lower warm sun, larger multi-directional swells, breaking shore wash, wet sand and detailed dry sand. An imported umbrella, scanned chair, thermos and shells form one beach arrangement. The round imported beach ball responds to taps or body contact, rolls with friction and a small bounce, collides with props, and remains on sand. Moving ball shadows refresh at a bounded rate.
- Winter has evening light, a denser 202-tree fir forest, snow on boughs, the scanned fire ring/logs, a real bench with frost, stacked scanned timber, a flask and an original textured lantern. Walking and tapping leave 24 bounded fading snow impressions; the lantern can be dimmed or lit by touch.

Props are prepared offline by `prepare-season-prop-upgrade.mjs`, `prepare-beach-ball.mjs` and `prepare-camp-lantern.mjs`. Download source, author, license, byte count and triangle count are recorded in `public/seasons/kit/catalog.json`; visitor credits include the CC BY assets. Terrain, grass detail, cloth, snow shading and water/flame effects remain authored runtime surfaces.

Interactions use the same canvas on mouse and touch: short taps select objects; dragging looks around. E activates a centered object within reach. Walk with WASD/arrows or the joystick, and use Escape to return. Fixed navigation covers tree trunks, the hamper, bench, fire, stacked wood, lantern, chair and umbrella pole. Ball movement has its own bounded contact checks.

Rendering uses one active season, instancing, static sun shadows, shader warming before reveal and GPU timing. Integrated graphics start at 90% resolution; sustained cost above 16.2 ms reduces resolution and secondary cover within limits. The minimum scale is 70%, with sharpening applied to the output. Mobile omits the secondary water reflection and uses smaller instance counts. This is an adaptive 60 FPS target, not a claim of zero lag on every device; physical phone performance has not been validated.

Final verification and screenshots are recorded in `../output/seasons/REFERENCE-VISUAL-QA.md`. TypeScript and all 84 asset checks pass, together with compact layout and movement checks at 30/60/120 Hz, including the lake boundary.

### Earlier compact scene revision — 18 October 2026

The latest layout replaces the long routes with an 8.7 m woodland walking radius and a small irregular island surrounded by sea. Navigation samples the same terrain used by the water shader. Woodland terrain extends around the full clearing, with rising outer banks and tree rings in every direction. Tree LODs are assigned by scenic role and stay fixed while walking; ground-cover tiles no longer change density according to walking distance.

Spring now has no road, additional curved 3D grass blades, a stronger petal shower and a permanent scatter of pink petals. Autumn retains its road and leaf banks. Picnic objects are spaced apart, and the bench faces into the clearing. Winter uses daylight, reduced fog, smaller understory firs and a three-block stone bench beside the campfire. Granite Tile 03 UVs are cropped inside a tile to avoid grout lines on the bench. Summer has eight palms, low tropical plants and shoreline rocks around its island.

Validation: TypeScript, all 57 component asset checks, compact-layout checks and movement tests pass. Browser control was disabled in Work settings during this revision, so the final visual result, GPU shader compilation and frame rate still need browser verification. No universal zero-lag claim is made. The notes below describe the initial rebuild; this compact revision supersedes their long-path and distance-switching details.

- One continuous height field drives terrain vertices, walking heights, shore wash and prop placement. A meandering central path remains clear; the banks have gentle elevation changes.
- Spring uses the sanctuary's cherry model and shared blossom/bark textures. Whole-card LODs retain blossom shapes. UVs are explicitly preserved during offline pruning because the textures are attached at runtime. A dense, tiled meadow uses cropped photographed grass tufts, GPU instancing and vertex wind; a woven picnic blanket and basket sit beside the path.
- Autumn uses the selected Jagobo maples and an ananduhrt park bench, turned toward the path and grounded at its feet. Continuous tiled leaf litter is supplemented by thousands of curved, veined leaves, with much sparser coverage in the walking lane. Falling leaves use a fixed GPU particle pool.
- Winter uses Poly Haven firs, bounded snow clumps on boughs, sculpted snow banks and GPU snowfall. Dennis's campfire scan supplies stones, coals and logs. A local 20-step mobile / 32-step desktop flame volume replaces crossed flame planes. Its density advects upward through three noise scales; warm light and drifting embers accompany it.
- Summer uses the selected evolveduk coconut palms, sloping sand and an ocean on both sides. GPU waves, shoreline wash, foam, sky reflections, shallow seabed shading and bounded contact ripples share the terrain's height function. Desktop adds one reduced-resolution reflection; the mobile tier omits that pass.
- The sanctuary's mossy rock scans are reused for ground accents. Their shared textures remain alive when a seasonal world is disposed.

## Rendering and limits

Trees use spatial visibility checks and three geometry LODs. Meadow/leaf tiles use instanced draws, distance limits and adaptive density. The renderer warms shaders and a static sun shadow map before revealing a world. New-world preparation suspends the old scene's rendering to avoid consuming the shadow-update flag. Only one seasonal scene renders at a time.

Adaptive resolution and cover density respond to measured GPU cost. Real-time global fluid simulation and per-particle rigid-body physics are unnecessary for the desired visual effects. Wave motion and flame density are GPU approximations with bounded cost.

60 FPS is a target, not a universal guarantee. Browser preview measurements on the development laptop are not physical phone validation. First visits still download and decode the selected assets. The existing `.void-render` telemetry reports the active scene, triangles, draws, GPU timing and render size.

## Asset preparation and checks

Provenance, exact source URLs and LOD sizes are recorded in `public/seasons/kit/catalog.json`; visitor attribution is in `public/void/credits.html`.

Preparation scripts: `prepare-season-kit.mjs`, `prepare-season-kit-models.mjs`, `prepare-season-kit-extract.py`, `prepare-season-cherry.mjs` and `prepare-season-campfire.mjs`. Originals are offline; the browser requests prepared component GLBs and WebP maps only.

Checks: `node scripts/test-season-assets.mjs`, `node scripts/test-season-layout.mjs`, `node scripts/test-season-navigation.mjs`, and `node node_modules/typescript/bin/tsc --noEmit --incremental false`. The asset check includes cherry UV retention and foliage alpha preservation, guarding the two issues that caused bare blossoms and black grass cards.
