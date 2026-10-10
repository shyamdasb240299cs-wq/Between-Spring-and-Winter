# Shrine void: implementation and asset plan

Prepared 10 October 2026. This is the next-stage plan, not a shipped 3D environment. The current entrance ends on black. The supplied concept is the visual target: dark water, luminous pink canopies, warm lanterns and weathered photographic monuments disappearing into darkness.

## Recommended approach

Reuse the installed Three.js 0.186.1 and WebGLRenderer inside a lazy React component. The current garden is layered WebP artwork, not a 3D scene. Its new entry timeline simulates depth and hands over at `completeShrine` in `app/journey-page.tsx`. The future world must have its own real geometry, camera, lighting and water; stretching the current painting cannot produce it.

First build one excellent composition: two trees, one photo monument, four lanterns, water and fog. Approve its appearance and measure it on the actual Intel Iris laptop before extending it. The reference's dense foliage and reflections make transparent overdraw and reflection rendering the main performance risks. A low polygon count alone will not solve those costs.

## Asset shortlist and acquisition status

These are verified source listings, not downloaded or production-validated archives. Preserve the author, source URL, license and modification record at intake. No third-party model has been added to the deployed site in this release.

| Element | Recommended source | License / observed detail | Work needed |
|---|---|---|---|
| Cherry trees | [Cherry Blossom Trees — Jagobo](https://sketchfab.com/3d-models/cherry-blossom-trees-f69be55d2e4f4f73b568ebb185bd8496) | CC BY 4.0; three variants, 156.8k triangles combined; approximately 36k for each small tree and 77k for the large one. Bark color/normal/roughness and foliage color textures are listed. | Best base set. Inspect download formats and alpha materials, retain attribution, create near/mid/far LODs and improve canopy lighting. Do not repeat the full-resolution set down the entire avenue. |
| Optional hero tree | [Realistic Sakura — Viasky](https://sketchfab.com/3d-models/cherry-blossom-sakura-tree-realistic-model-6c70f11081e4438b878f4c007a48ab65) | Listing says CC BY 4.0, 284.2k triangles. | Heavy alternative, not the default repeating tree. Its sparser branching needs visual assessment; use only if a reduced hero version improves the composition. Follow the listed attribution license. |
| Mossy island stones | [Rock Moss Set 01 — Poly Haven](https://polyhaven.com/a/rock_moss_set_01) | CC0; six rocks, 63k triangles combined; glTF/Blend/FBX options listed. | Reduce individual rocks to roughly 1–3k triangles, share materials, assemble low islands with convincing contact at the waterline. |
| Monument stone material | [Mossy Stone Wall — Poly Haven](https://polyhaven.com/a/mossy_stone_wall) | CC0; color, normal, roughness/AO and displacement maps available. | Use 1–2k maps on a custom chipped stone frame. Bake detail; no runtime high-resolution displacement. |
| Distant stone lantern fallback | [Stone Lantern — CerFriBar](https://blendswap.com/blend/10020) | CC0; 660 polygons, 1024px color/normal textures; older Blender source. | Useful distant prop after conversion, but its stone design is not the wooden lantern in the concept. |
| Close lanterns | Custom wooden frame, paper light box and curved roof | Original mesh; no external model required. | Model a detailed near version and a simple distant version. Use emissive paper with warm light, not many shadow-casting lights. |
| Photo pillars | Custom monument assembled with the stone material and island rocks above | Original mesh + CC0 source material | Match the tall, irregular, ancient stone surround. Bevel/chip edges, recess the photograph and add restrained moss. A generic flat box will not match the reference. |
| Petals | Original slightly curved 6–12 triangle mesh and small painted atlas | Original | Instance 120–180 petals on the Iris tier; vary size, rotation and drift. Reuse an owned blossom texture only if its source resolution/alpha is adequate. |
| Water / fog | Procedural surface and shader; soft fog cards | Original code | No purchased ocean model or heavy fluid simulation. Two subtle normal scales, Fresnel reflections and low pink haze. |
| Photographs | User-selected originals | User-provided | Create ordered metadata, preserve aspect ratio and colors, generate responsive images. Never invent personal photographs. |

The Jagobo listing and viewer were inspected for geometry, textures, appearance and license. Archive contents, units, UV quality, source texture dimensions and actual compressed sizes remain intake checks. Poly Haven assets are [CC0](https://polyhaven.com/license). CC BY assets need author/source/license credit and an indication of modifications; use the [CC BY 4.0 license](https://creativecommons.org/licenses/by/4.0/).

An ArtStation lantern pack titled “FREE CC0” currently showed a USD $1 purchase option, so it is deliberately excluded from the verified-free recommendations. No paid asset is required by this plan.

## Scene and visual construction

- Work in metres. Water sits at y=0; camera height starts at 1.6m. Tree rows sit around x=±5.5m, spaced 8–10m apart. Photo islands repeat approximately every 18m along the central axis.
- Keep the tree rows symmetrical, but place the camera rail about 1.6m to one side of the central monuments. This lets the camera approach, look toward and pass photographs without travelling through solid stone. Avoid repeated side-to-side camera swerves.
- Use three tree variants with modest rotation/scale differences. Near trees retain convincing bark and branching. Mid trees use simplified foliage; distant trees use impostors or very low-detail silhouettes, hidden gradually by black fog.
- Preserve dark bark and shaded canopy volume. Pink blossoms should catch soft light with a small emissive contribution, not become uniformly neon. A cheap backlighting term can give thin petals depth. Bake ambient occlusion into bark/island materials.
- Build stone islands slightly above water with irregular outlines. Darken and smooth the material near the wet base. Photo recesses and edge bevels supply real depth. Photograph planes use sRGB textures and `toneMapped=false` so faces retain their source colors.
- Use a black background, no visible sky or conventional horizon. Faint low pink haze and progressively dimmer lanterns establish distance. Keep the distant vanishing point restrained so it does not resemble a bright outdoor sunrise.

## Reflective black water

Start from Three.js [Water](https://threejs.org/docs/pages/Water.html) / [Reflector](https://threejs.org/docs/pages/Reflector.html), adapted for the existing WebGL renderer. Use a large camera-following plane, nearly black base color, low-amplitude slow normal motion and Fresnel reflection. The reference needs a calm mirror with small ripples, not an ocean.

Use one planar reflection target at 512–768px on the Iris tier. Render simplified tree/lantern/monument proxies into it; exclude particles, fog cards and unnecessary small details. Update at a measured 15–30Hz when movement is slow, with a faster cadence only if the frame budget permits. Check reflection judder during scrolling before reducing update frequency. Distant reflections can fade into the same black fog. Avoid screen-space reflections, refraction/transmission stacks and multiple reflection planes.

Fallback: lower reflection resolution and proxy detail first, then reduce bloom/foliage density. If WebGL2 is unavailable, present a still atmospheric background with an accessible photograph gallery. Do not display a broken black canvas.

## Lighting and post-processing

Use low ambient fill and one key light, with baked or vertex shading for depth. Nearby lanterns may use at most 2–4 unshadowed local lights; distant lanterns are emissive geometry. Start with no real-time shadows on low quality, or one tightly bounded small shadow map if measurements allow it.

Use one optional half-resolution bloom pass for blossoms and lanterns. Threshold the emission so photographs do not wash out. Keep tone mapping and output color conversion explicit through [OutputPass](https://threejs.org/docs/pages/OutputPass.html) and follow [Three.js color management](https://threejs.org/manual/pages/color-management.html). No depth-of-field blur, GTAO or volumetric ray marching is needed for the first version.

## Scroll, photographs and the illusion of infinity

Convert wheel/touch/keyboard input into a target travel distance, then follow it with frame-rate-independent damping. Use a distance-based speed curve: normal speed between monuments, about 20–30% speed within 3m of a photo, returning smoothly afterward. Bound large input deltas so a single wheel burst cannot skip several photographs. Reverse scrolling must use the same positions and IDs.

The active photograph gets an accessible DOM caption and button projected near its monument. Clicking/tapping opens a readable lightbox; Escape closes it and restores the same travel distance. Support keyboard next/previous photo controls. Do not force automatic forward travel or mandatory pauses. Reduced motion uses discrete photo changes with short fades instead of continuous camera movement.

Pool 8–12 environment segments. Recycle only segments outside the visible and reflection frusta, using deterministic variation. Rebase the world origin after roughly 512m to avoid precision drift. Use [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) for shared tree LODs, lanterns, rocks and petals. Keep material and object counts bounded.

The environment can feel infinite while the photo collection remains finite. Default to showing every supplied photograph once and then offering replay; do not silently repeat or invent memories. The final photo count/order and replay preference can be set in the content manifest before building the gallery.

## Proposed code boundaries

```text
app/shrine-void/void-scene.tsx       React lifecycle, loading/fallback, renderer ownership
app/shrine-void/create-world.ts     scene, pooled segments, lighting
app/shrine-void/water.ts            reflection proxies and ripple material
app/shrine-void/travel.ts           scroll rail, damping, photo approach speed
app/shrine-void/foliage.ts           tree LOD groups and wind
app/shrine-void/particles.ts        bounded petals/fog
app/shrine-void/quality.ts          frame-time sampling and tier controls
app/shrine-void/photo-overlay.tsx   accessible photo controls/lightbox
app/shrine-void/assets.ts           loading, bounded caches, disposal
public/void/manifest.json           assets, transforms, licenses and photo order
```

At `completeShrine`, mount the future world only when its critical assets are ready. Keep the existing black handoff while loading. Prefetch after the gate becomes visible and the browser is idle, not during initial page load. Unmount/dispose the existing 3D book before creating the void renderer; the book already has geometry/material/texture/renderer cleanup to reuse. Maintain only one active WebGL renderer. Cancel requests and release GPU resources on unmount or context loss. Preserve the visitor's music preference; any new audio needs the user's review before integration.

## Asset preparation and budgets

Intake in Blender: verify licence files, meters, origin at trunk/base, UVs, normals and alpha mode. Retain editable sources outside public assets. Create LODs intentionally; avoid random decimation that destroys canopy silhouettes. Reduce overlapping alpha cards and use alpha testing where visually acceptable. Bake shared 1–2k color/normal/ORM maps. Export glTF/GLB with Meshopt and KTX2/Basis textures, validating before delivery. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) and [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html) support this pipeline; detect supported GPU texture formats.

These are initial targets, not measured guarantees:

| Iris baseline target | Budget |
|---|---|
| Internal render size | About 1280×720; adaptive scale 0.75–1, DPR capped at 1 |
| Main visible geometry | 250–350k triangles; reflection proxies ≤100k |
| Draw calls | Aim ≤100 across main and reflection passes |
| Tree LODs | Near 20–30k; mid 5–8k; far 1–2k or impostor |
| Texture GPU memory | Aim 128–192MB total, measured after decoding/compression |
| Petals / fog | 120–180 instanced petals; ≤8 fog cards |
| Reflection target | 512–768px, one target |
| Initial future-scene payload | Aim 6–8MB compressed excluding user photos; stream later assets |
| Photo cache | Current, next two and recently visited; bounded 4–6 decoded textures |
| Performance | Aim 40–60fps on target Iris, graceful 30fps floor; verify on the real device |

Use moving-average frame time with hysteresis to lower resolution/reflection quality before dropping tree detail. Do not repeatedly oscillate tiers. Optional stronger-desktop quality can raise DPR to 1.5 and reflection size to 1024. Actual GPU model, power mode and thermal behaviour affect the result; “zero lag” cannot be promised from the concept image.

## Delivery stages and acceptance

1. **Asset intake:** download selected free sources, verify licences and archive contents, make attribution records, inspect actual polygon/material/texture costs. Reject unsuitable assets before integration.
2. **Visual slice:** one photograph island, two hero trees, lanterns and water. Match composition, canopy softness, stone depth, black atmosphere and warm reflections. Review stills plus camera motion on the Iris laptop.
3. **Gallery movement:** implement rail travel, approach slowdown, reverse travel, accessible overlay and lightbox. Verify no camera/pillar collisions or photo distortion.
4. **Infinite environment:** pool segments and LODs, add restrained petals/fog and distant reflections. Confirm recycling is invisible and memory stays stable during ten minutes of travel.
5. **Integration and polish:** connect the entrance callback, dispose the book, preserve music choice, add loading/failure/retry and reduced-motion paths. No new sound is accepted without review.
6. **Release checks:** desktop/portrait/short landscape, mouse/touch/pen/keyboard, fast and reverse scrolling, slow network, tab visibility, WebGL context loss, repeated entry/exit, image colors, bounded GPU memory and sustained frame time. Publish only the measured tier defaults.

The next implementation should begin with stage 1 and the visual slice, not the entire infinite scene. This protects the cinematic quality while establishing what the laptop can render smoothly.
