# Asset credits

## Summer imported wetsuit and scuba equipment

- **Skinned wetsuit body:** adapted from [CesiumMan](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CesiumMan), Copyright 2017 Cesium, [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). The artist-authored human body mesh is adapted as a headless graphite/blue neoprene wetsuit, with original skin weights retained. Changes: removed the oversized head and logo-bearing texture; added smooth neoprene vertex colors, metre-scale normalization and runtime shoulder/hip deformation. This is an adaptation of a human base mesh, not a scan of scuba clothing. No Cesium logo is displayed.
- **BCD, cylinder and regulators:** [Scuba equipment](https://poly.pizza/m/7igrHLjaQlW) by Steren Giannini, [Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/). Actual imported jacket, tank, primary/safety regulators, hoses and gauges, with smooth normals, navy/metal color adjustments and a fitted body mount. Source metadata confirms the exact licence version.

Both sources are delivered as local GLBs under `public/seasons/kit/summer/imported/`; no third-party model service is contacted during gameplay. The corresponding notices and detailed provenance manifest ship alongside them. Raw downloads, source metadata, editable Blender adaptations and preview images are retained in `Assets and working files/seasons/summer-imported/`. The mask, fins, torch, compass, slate, boat and other interaction props remain original project geometry. Existing coconut palms, broadleaf trees, scanned rocks, grass and coastal shrubs retain their seasonal catalog credits.

## Detailed seasonal rocks

The woodland boulders use [Boulder 01](https://polyhaven.com/a/boulder_01) by Rico Cilliers. Summer headlands use [Coast Rocks 05](https://polyhaven.com/a/coast_rocks_05) by Rob Tuytel. Loose stones and the small brass-key rest use [Rock 07](https://polyhaven.com/a/rock_07) by Jenelle van Heerden. All three are CC0 scans from Poly Haven, replacing the earlier seasonal rock selections. Original proportions, UVs and PBR maps are retained, with compact geometry LODs and embedded WebP textures. Source downloads are preserved in the local working-files folder; preparation is reproducible with `scripts/prepare-detailed-rocks.mjs`.

Cherry and maple distance meshes preserve the lower bark rings and scanned root geometry. Run `scripts/repair-season-trunks.mjs` after regenerating tree models to retain anchored stems in every LOD.

## Published soundscape

Music: [First Love / 初恋](https://amachamusic.chagasi.com/music_hatsukoi.html) by [Amacha / Music Atelier Amacha](https://amachamusic.chagasi.com/), used under the composer's [terms](https://amachamusic.chagasi.com/terms.html). The website version is normalized quietly, filtered and faded. The same score continues into reading with a warmer tone and lower gain.

Opening birds, forest birds, gentle breeze, waterfall and residual campfire sounds: [Mixkit](https://mixkit.co/free-sound-effects/), under the [Sound Effects Free License](https://mixkit.co/license/modal/sfxFree/). Japanese glass wind-chime contact: [Sound Effect Lab](https://soundeffect-lab.info/sound/sub-category/summer.html), under its [terms](https://soundeffect-lab.info/agreement/). The recorded contact is cut and filtered, and follows the animated chime's motion. These processed assets are incorporated into this website's scroll-guided soundtrack; raw recordings and rejected drafts are not published.

## Garden details

The campfire, extra blossom branch, six-frame butterfly atlas, and painted Fūrin bell with sixteen paper poses were generated and edited with the built-in OpenAI imagegen tool for this site. Transparent WebP assets preserve the painted setting's lighting. Original PNGs, full prompts, registration metadata, and preparation scripts are retained in `Assets and working files/garden-polish`. See `GARDEN-POLISH.md` for placement, animation, and validation details.

## Current continuous terrain design

The subsequent sakura-shower revision separates the marked left valley tree and shrine gate into transparent foreground images with built-in OpenAI imagegen. The gate gained subtle wood grain, joints and warm roof highlights in a targeted follow-up edit. The new background was generated without additional enhancement or upscaling, as requested. Sources, exact prompts, gate registration, native background, encoding script and audit images are in `Assets and working files/shrine-petals`. Wind strokes and a bounded 50-petal system are code-generated and converge inside the gate; text and controls remain above the scenic layers.

The opening background was subsequently edited with built-in OpenAI imagegen to remove its upper-left overhead cherry bough and refine landscape detail. The bough was separately extracted as a transparent foreground image. The owner's installed Upscayl `digital-art-4x` model produced a 3548 × 7096 lossless master (4× the 887 × 1774 source). Responsive WebP variants serve the site. Exact prompts, original sources, the master, registration metadata and encoding scripts are preserved in `Assets and working files/opening-refinement`. Opening airflow, falling petals and five-bird flights use code; the existing bird atlas is retained.

The current background is one uninterrupted Japanese mountain-to-forest painting, generated and edited with the built-in OpenAI imagegen tool from the owner's concept reference. Sunset mountains, mist, lake, upstream water, cherry forest, mossy stone steps and the shrine are baked into that single image. One broad transparent foreground painting combines the cedar house, lantern, stones, riverbank and lower waterfall. The earlier smooth-scroll video supplies motion inspiration only; no video frames are published.

A generated transparent water texture supplies downward highlights over twenty-one source-traced water curtains. The current panda uses sixteen clean generated eating/encounter frames in a4×4 atlas plus eight uniformly registered running frames in a4×2 atlas, all with256px cells and a220px feet baseline. The current rabbit uses twelve warm-lit feeding/head-lift frames in a4×3 atlas; the six-frame crane atlas remains in use. All characters and terrain match the warm forest lighting.

Original PNGs, exact prompts, registration metadata and technical encoding scripts for the new assets are preserved in Assets and working files/waterfall-redesign. Rabbit and crane originals remain in Assets and working files/layered-redesign. Runtime assets live in public/scene/layers. The book continues to use the owner's cover and manga artwork and the existing 3D case.

Cormorant and Manrope use compressed WOFF without changing their glyphs. Original font files and licenses remain preserved. The source manuscript and existing website copy are unchanged.
## Earlier asset history

The following notes describe the earlier implementations and retained editable assets. The modeled house, rabbit and cranes below are preserved as working files; the current scenery uses the image layers described above.

The owner supplied the front and back covers, Part One / Spring divider, and 22 story pages from Between Spring and Winter. Only Part One is included in this publication. Original manga files are preserved.

Three new scene illustrations were made for this site with OpenAI imagegen: the tall continuous Japanese valley; a transparent torii with stone steps, moss, boulders, ferns and blossoms; and a transparent half cedar house with tiled eaves, shoji panels, a paper lantern, mossy stone base and rock/fern clusters. The approved earlier landscape supplied the style reference. No frames from the video reference are used in the website. Original PNG assets and the art briefs are included with the editable scene package.

The crane and rabbit were modeled and animated in Blender for this project. Joint motion is baked at 60 samples per second and interpolated by Three.js. A scroll cue runs each animal once per visit; no sprite frame swapping is used. Editable .blend files accompany the exported glTF models.

The rounded hardcover book was modeled in Blender with the supplied cover artwork. Thirteen curved, double-sided paper meshes, separate front/rear hinges, and the handwritten dedication are added in Three.js. Reading and the ending use that same scene. The runtime hides the old static page block. All printed pages retain their source colors; subtle shading is confined to the gutter and moving fold.

Cormorant, Manrope and Caveat are distributed by Google Fonts under the SIL Open Font License. Caveat glyph outlines supply the handwritten title and dedication. The licenses are retained under public/fonts.
Sources: https://fonts.google.com/specimen/Cormorant+Garamond, https://fonts.google.com/specimen/Manrope, https://github.com/googlefonts/caveat, https://github.com/google/fonts/tree/main/ofl/caveat

Three.js is MIT licensed. The installed page-flip package is retained for source compatibility; the current reading experience uses Three.js paper geometry.

Two additional imagegen material assets provide realistic indigo cotton book cloth and fine ivory paper stock. The source PNGs and exact prompts are retained in the editable scene package. The interactive page deformation uses 64 inextensible strips with torsion springs, neighboring-strip coupling, and damping; separate paper edge meshes follow each moving surface.

The final house is actual Blender geometry, replacing the initial cutout: curved overlapping roof tiles, cedar structure, shoji lattice, a modeled lantern, stone steps, moss and ferns. Generated photographic cedar and clay texture maps are packed into its editable Blender file and glTF export. A transparent ground receiver adds real cast shadows over the background clearing. The open book has curved endpapers and leaf roots meeting at a common binding depth, subtle gutter shading and cast shadows from turning pages. Intro text sections fade in sequence without overlapping each other.


## Final character polish

Built-in OpenAI imagegen produced a twelve-frame warm-lit feeding/head-lift rabbit atlas and an eight-frame side-view panda gallop atlas, preserving the established characters and forest lighting. A later sixteen-frame panda encounter atlas replaces the coarse original eating/standing poses. Frames are technically cropped, uniformly scaled and registered with genuine alpha. Original PNGs, exact prompts, lossless working atlases and registration scripts are preserved in Assets and working files/final-polish and motion-refinement. Runtime rabbit-polished.webp, panda-encounter.webp and panda-run-refined.webp use compressed WebP. The refined run sheet resamples the existing gallop frames to match the new encounter body scale. No manuscript, cover or page artwork is altered.

Shrine-entry background enhancement: the existing rebuilt garden image was upscaled exactly 4x using the locally installed Upscayl digital-art-4x model. The lossless master and encoding metadata are in Assets and working files/shrine-entry. The entrance effects are original CSS/Canvas2D code.

## Shrine Void 3D Scene Assets

- **Cherry trees:** [Cherry Blossom Trees](https://sketchfab.com/3d-models/cherry-blossom-trees-f69be55d2e4f4f73b568ebb185bd8496) by [Jagobo](https://sketchfab.com/Jagobo), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The owner's downloaded GLB supplies the actual three tree meshes, original bark colour/normal/roughness maps and alpha blossom texture. Changes: normalized scale, original near geometry plus decimated mid/far geometry, shared WebP textures, warmer lighting/emission and shader wind. The model is integrated, not merely referenced.
- **Lanterns:** [Lantern](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Lantern), Microsoft / sbtron, CC0, distributed by Khronos glTF Sample Assets. Original lantern mesh, PBR textures and window emission; street pole/chain removed, scale normalized and mesh simplified for instancing.
- **Island rocks:** [Rock Moss Set 01](https://polyhaven.com/a/rock_moss_set_01), Poly Haven, [CC0](https://polyhaven.com/license). Individual scanned rocks simplified offline and arranged around monument and tree foundations.
- **Monument material:** [Mossy Stone Wall](https://polyhaven.com/a/mossy_stone_wall), Poly Haven, CC0. Colour and normal maps on original rounded, chipped stone-course monument geometry.
- **Water and petals:** Original GPU water/reflection, instanced falling and floating petal systems and Gaussian glow. Water reflections render a bounded lower-detail proxy scene. Monument photographs use the owner's existing artwork.

Visible attribution is available from the sanctuary's Asset credits link (`public/void/credits.html`). Offline preparation scripts and original working sources are retained in `Assets and working files/void-polish`; shared compressed runtime assets are under `public/void/models/jagobo` and `public/void/textures/jagobo`.

Crystal: [Magic Crystal B&W](https://sketchfab.com/3d-models/magic-crystal-bw-871e40e7271d4db28fe466bf32598d8a) by Toni García Vilche / zul_gv, CC BY 4.0, from the owner's downloaded GLB. Complete original model and black-and-white materials retained, including the inner moon and surrounding sparkles; only scale, placement and temporary interaction brightness adapted. The background was refreshed using the installed Upscayl digital-art-4x model; exact 4x master retained in Assets and working files/void-polish, compressed responsive WebPs served.

Sanctuary water ambience: [Water, Gentle Movement.wav](https://freesound.org/people/Daen23/sounds/431627/) by Daen23, [CC0](https://creativecommons.org/publicdomain/zero/1.0/), using the publicly provided HQ preview. Gentle hand movement in water; adapted with filtering, quiet normalization and three-second crossfading. Footsteps use [Splashing Footsteps Shallow Water](https://freesound.org/people/ChristopherJngs/sounds/861369/) by ChristopherJngs, CC0, using the publicly provided HQ preview; three isolated steps with prompt attacks, filtering and quiet normalization. Airy entry uses the existing approved breeze recording; crystal and lantern cues adapt the existing approved Sound Effect Lab glass Fūrin recording, with filtering, pitch layers and echoes. The revised cinematic cue mix was approved by the owner before integration. Source recordings and previews are retained in the local working-files audio folder.


Summer realism pass: [Modular Wooden Pier](https://polyhaven.com/a/modular_wooden_pier), [Coast Land Rocks 04](https://polyhaven.com/a/coast_land_rocks_04), [Weathered Planks](https://polyhaven.com/a/weathered_planks), and [Coral Gravel](https://polyhaven.com/a/coral_gravel), Poly Haven, [CC0](https://polyhaven.com/license). Pier decking is extracted from the scanned modular kit and fitted to the existing walkable ramp. Coastal limestone is simplified for reef formations and instanced colony foundations. Timber and gravel retain colour, OpenGL normal and roughness maps, compressed to 1K WebP. Sources and processing metadata are retained in `public/seasons/kit/summer/realism/sources.json`; preparation is reproducible with `scripts/prepare-summer-polish.mjs`. Boat fittings, coral forms, fish, turtle and ray geometry remain project-authored; they are not represented as wildlife scans.
