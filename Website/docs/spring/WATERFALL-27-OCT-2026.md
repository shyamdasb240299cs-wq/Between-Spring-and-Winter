# Adavi waterfall revision — 27 October 2026

The three short rock-shelf falls retain closed water volumes and a continuous bed. Their motion now follows the curved channel's downhill tangent, including the nearly vertical faces. Two overlapping, locally offset flow phases keep normal-map deformation bounded; the former `time * localSpeed` mapping stretched more severely the longer the scene ran. Small normal-directed surface waves break up the silhouette. Falling water has stronger irregular aeration and less mirror-like horizontal reflection, while the confluence keeps the main river's normal sampling, absorption and reflection response.

Foam pools follow the real downstream bed height. Their rings are distorted and broken rather than synchronized circles. Droplets rebound ballistically and reset at their next water contact; mist drifts, expands, has a broken soft edge and fades in the distance. All animation uses shaders and the existing shared time uniform. No per-frame particle loop, geometry upload, new texture download or extra reflection capture was added.

## Game rendering reference

[Alex Vlachos / Valve, *Water Flow in Left 4 Dead 2 and Portal 2*, SIGGRAPH 2010](https://cdn.akamai.steamstatic.com/apps/valve/2010/siggraph2010_vlachos_waterflow.pdf), especially slides 8, 23 and 31–39, describes directional normal-map distortion with two offset phases and noise to conceal resets and pulsing under tight game performance budgets. This implementation adapts that principle to the existing curved cascade mesh using analytic flow directions. It does not copy game assets or implement a full fluid solver.

## Verification

- `node scripts/test-spring-cascades.mjs`: closed nondegenerate volumes; steep drops; real perpendicular thickness; submerged beds; finite normalized downstream flow bases; equal river/confluence height; droplet landing times; spray and mist trajectories inside their culling bounds; continuous normals at the duplicated UV seam; nondegenerate downstream foam; shared clock; unchanged geometry-buffer versions over 600 updates. Both mobile and desktop profiles pass.
- `node scripts/test-spring-rendering.mjs`: actual asset LOD/culling, reflection reuse and movement invalidation. One local run measured 20,000 navigation queries at 4.04 ms. This is CPU timing, not a frame-rate measurement.
- `node scripts/test-spring-forest.mjs`: waterfall direction, continuous river and bank navigation, plus existing prop/portal checks.

All three waterfall bodies, all foam pools and all spray take three batched draws total. Desktop: 12,156 triangles and 228 point particles. Mobile: 5,220 triangles and 102 point particles. These counts exclude the wider river, tributary and forest. No universal zero-lag claim can be inferred from these structural tests; GPU behavior depends on the complete scene and device.

For visual review, open `/world-preview?season=spring&spring-check=adavi` and choose **Adavi · waterfall side** then **Adavi · river confluence** in the existing authoring menu. Side pose: x=209.8, z=-9.5, yaw=.36, pitch=-.36. Confluence pose: x=207.8, z=3, yaw=.20, pitch=-.15. The authoring fixture uses disposable progress. Screenshot verification belongs to the integrating agent's full-game browser pass; no new screenshots are claimed by the numeric tests above.
