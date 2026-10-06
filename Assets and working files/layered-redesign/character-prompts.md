# Layered scene character assets

Generated with the built-in image_gen tool. Source cutouts retain their generated real alpha. The technical sprite encoder separates the existing animal sprites by their alpha, crops empty margins, puts them into registered equal canvas cells, then encodes static WebP. It does not repaint the animals.

## Rabbit — final source generation prompt

Create a TRANSPARENT PNG STICKER ATLAS with EIGHT isolated cream rabbit stickers. Real alpha transparency only; completely empty surroundings. FOUR COLUMNS and TWO ROWS, four rabbits on top and four below. Every sticker fits completely within its own equal cell with at least 20 percent empty transparent margin on all sides, and at least one rabbit-body-width of empty space between neighboring rabbit bodies. Do not fill the canvas with the animals. No background, no haze, no shadows, no floor, no glowing cloud, no checkerboard, no text, no grid lines.
These are animation frames of ONE same rabbit, fixed camera, same scale, grounded front paws aligned to same baseline within every cell, identical body and ears. Top row frames 1–4 are head bent down while the rabbit eats a tiny green leaf, subtly different jaw/chewing and nose motion. Bottom row frame 5 head lifts halfway, frame 6 lifts higher toward viewer, frame 7 sits fully upright looking at viewer, frame 8 upright calmly looking directly at viewer. Body and paws planted, head progressively lifts.
Warm cream-white natural fluffy fur, pink inner ears, long ears, dark eyes, fine whiskers, realistic illustrated anatomy, gentle soft painterly detail, delicate sunrise warm fur highlights. Clean natural fur alpha edges without any colored outline. Crisp complete rabbit cutouts.

## Crane — final source generation prompt

Create a TRANSPARENT PNG STICKER ATLAS with SIX isolated Japanese red-crowned crane flight animation stickers. Actual alpha transparency only outside birds. THREE COLUMNS and TWO ROWS, three cranes on top and three below. Every sticker fits completely within its own equal square cell with at least 12 percent empty transparent margin on all sides. No overlap, plenty of transparent space between birds. No background, sky, clouds, floor, haze, shadows, checkerboard, text, grid lines.
These are six flight wing-flap frames of the SAME crane, fixed side three-quarter view flying toward RIGHT. Same scale and body/head registration in every cell, stretched neck forward and long legs trailing behind. White body, black flight feathers, subtle red crown, thin tapered long beak, long slender neck, anatomically correct graceful wings and feathers.
Pose order left-to-right top row then left-to-right bottom row:
1 wings high vertical upstroke.
2 wings diagonal up halfway.
3 wings horizontal.
4 wings angled downward.
5 wings fully down with softly curved feather tips.
6 wings recovering toward horizontal / diagonally raised.
Match the same crane identity and overall body pose across all six frames. Fine natural detailed feather texture, cinematic warm sunrise golden edge lighting and soft painterly realism suitable for a serene Japanese landscape. Clear crisp natural alpha cutout edges, whole wings, beak, and legs fully contained inside each square cell. No plastic toy look and no artificial colored outline.

## Notes

- Rabbit: eight ordered frames: four feeding poses, two lifting poses, two attentive poses.
- Crane: six ordered wing poses.
- QA JPEGs composite the exported sheets onto moss green to inspect alpha edges accurately. Some image viewers display hidden RGB matte colors in raw RGBA sources, even where alpha is zero.
- Source PNGs, prompt document, encoder, metadata, and QA composites are preserved beside this file.

