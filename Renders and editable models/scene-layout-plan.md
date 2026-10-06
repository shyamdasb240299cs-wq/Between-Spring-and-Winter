# Between Spring and Winter — scene and motion plan

Names: Shyamu and Aami. The introduction is a poetic birthday dedication grounded in four years of distance and the days they hope to share.

## Landscape

One tall, continuous Japanese valley background, with the same jade forest, warm sunrise, pale blossoms and mountain mist as the approved theme. Camera movement travels from the open mountain sky into woodland clearings and down to a shrine courtyard. No decorative frame surrounds the viewport.

| Layer | Placement | Treatment |
|---|---|---|
| Distant sky, mountains, waterfall | One continuous background plane | Slow camera descent, localized continuous waterfall flow |
| Torii, stone steps, moss, rocks and ferns | Woodland courtyard; a coherent middle-ground cluster | Same light direction, contact shadow and camera perspective |
| Half Japanese house, shoji and lantern | Right-hand village edge near the final introduction | Natural architectural silhouette and local stone/plant cluster; parallax from physical depth |
| Crane | Open sky at the first story reveal | True 3D wings; one flight across the scene when its scroll cue is crossed |
| Rabbit | Stone-and-moss clearing during the author reveal | True 3D ears and feet; a single short hop sequence, then remains out of view |

Animal animation is evaluated every render frame with smoothly interpolated joints. No two-frame sprite swap and no endless flight path. Scroll cue flags persist while navigating back and forth during the current visit.

## Physical book

The book stays in one 3D scene throughout opening, reading and closing. The front and rear cover remain distinct, thin boards.

| Sheet front | Sheet reverse | Spread after turning |
|---|---|---|
| Handwritten title and dedication | Blank | Blank left, Part One cover right |
| Part One / Spring divider | Blank | Blank left, manga page 1 right |
| Manga page 1 | Manga page 2 | Page 2 left, page 3 right |
| Manga page 3 | Manga page 4 | Page 4 left, page 5 right |
| Remaining odd pages | Corresponding even pages | Correct facing pages, through page 22 |

Opening spread: empty inside front cover on the left; title and dedication on the right. Final spread: page 22 on the left and empty inside back cover on the right. The rear cover closes and the finished volume rotates, preserving the approved ending idea.

Page turns follow scroll position, use a curved sheet mesh, preserve front/reverse UV orientation, and settle flat for reading. Artwork is rendered without lighting or exposure changing its colors. Magnification and fullscreen remain available in the same scene. Validate forward/reverse turns, first/last spreads, desktop/mobile fit, one-shot animal cues, edges and overlaps before publishing.

Realistic binding refinement: photographic cloth/paper texture maps, beveled boards, aligned cover/page hinges, approximately 0.06 mm sheet thickness at manga-book scale, closed case spine fitted to the complete stack, and a 64-strip spring/damping model for each active sheet. Strip lengths remain constant while the free edge bends and settles; scroll sets the intended turn. This is a real-time elastic approximation, not a full paper-contact finite-element simulation.

Final house refinement: a full Blender structure replaces the card, with curved tile meshes, cedar structure, shoji lattice, lantern, stones and foliage. A transparent ground plane receives cast shadows in the clearing. Endpapers and printed leaves curve into a common gutter depth. Narrative sections fade out before the next section appears.
