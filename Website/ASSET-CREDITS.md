# Asset credits

## Current continuous terrain design

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
