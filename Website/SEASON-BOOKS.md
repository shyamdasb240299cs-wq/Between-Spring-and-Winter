# Seasonal book discovery and reading

19 October 2026. Local implementation plan and verification record.

## Visitor flow

1. Enter any of the four seasons using its crystal. A wooden chest sits near the existing picnic, beach seating, lakeside bench or winter camp. Its metal padlock is visible at the front.
2. Find the brass key on a small nearby stone. Its subtle glint makes it discoverable. Approach and press **E**, select **Pick up the brass key**, or tap the key itself. The key appears in the carried-items HUD and beside the visitor.
3. Approach the chest from its front and use **E**, the action button or the box/lock itself. Without the key, the chest stays locked. With the key, it moves into the keyhole, turns, releases the shackle and opens the hinged lid.
4. Take the exposed book with **E**, the action button or a tap. It moves out of the chest and remains visible in the visitor's carrying position while walking. The empty chest remains open.
5. Press **R** or choose **Read the book** anywhere in that season. The original main cover moves into view, opens on its actual hinge to show the season cover, and zooms toward it. The page reader then opens on page one, or the last saved page after a previous visit.
6. Read sequentially with the page buttons, **Left arrow for next / Right arrow for previous**, the page selector, or a rightward swipe to advance. Zoom supports close inspection. Scroll mode offers continuous vertical reading.
7. Close the reader or press Escape. The 3D cover closes and the book returns to the carrying position. The visitor remains at the same position. Opening animations can also be cancelled with Escape.

Keyboard actions and HUD buttons share the same state checks. Tapping empty scenery does not collect a key or unlock a box. Movement and repeated actions are blocked during the short key/book sequences and while reading. The existing world renderer stops drawing behind the page reader.

## Content

| Season | Season cover | Reader pages |
| --- | --- | --- |
| Spring | `/manga/part-1.webp` | Existing pages 1–22 |
| Summer | `/manga/part-2.webp` | 25 numbered blank pages |
| Autumn | `/manga/part-3.webp` | 25 numbered blank pages |
| Winter | `/manga/part-4.webp` | 25 numbered blank pages |

Blank pages use the existing blank paper artwork; no unfinished season reuses Spring's story. To publish finished artwork later, add that season's chapter/page list to `app/manga-data.ts`. `app/shrine-void/season-book-data.ts` maps chapter IDs 1–4 to the seasons and supplies the 25 blank pages for a chapter without artwork. Reader progress is clamped to the available page count.

## Assets and placement

The book reuses `public/manga/book-v3.glb`, including the original main cover, back cover, boards, paper block, spine and front hinge. Small original decorative parts are omitted from the in-world version; retained static parts are grouped, and the season cover is placed over the paper block. The story's original scrolling book presentation is unchanged.

The chest, metal bands, rivets, padlock/shackle and key are authored meshes. The chest is scaled to 68% of its original size (about 68 cm wide); its smaller collision radius matches that footprint. The wood uses the site's existing cedar image with bump relief; the lining and book binding use the cloth texture; page edges use the paper-stock image. Brass has environment reflections, controlled roughness and fine surface wear. The key rests on the existing Poly Haven moss-rock scan, using its original UVs and material maps. Its contact height is placed on the rock's uppermost point.

These assets require no new external download or asset licence. The cedar, cloth and paper textures are existing local assets; the scanned rock's CC0 attribution is already recorded. The chest feet conform to the local ground. Box collision is added before navigation is baked, and the ball's obstacle checks inherit it. Each arrangement adds 20 meshes and 4,089 source triangles (instanced rivets repeat a small shared mesh).

`season-relic-placement.ts` keeps chest/key positions relative to the existing foreground arrangement, on dry, reachable ground. The chest now sits beside the picnic corner, on flatter sand beside the parasol, beside the autumn bench end, or beside the winter bench. Its orientation follows the local ground normal and its feet make ground contact. The key stays outside the chest's collision radius. Approaching the box from its front avoids reaching through its back.

## Carry and crystal placement refinements

The key lifts smoothly from its rock into a lower carrying position. The closed book is now about 32 cm tall and is carried low at the visitor's right side. Both use body yaw and a gently damped body position, independently of camera pitch. Walking introduces small distance-driven sway; stopping settles the items. Reduced motion removes sway and lag. The existing book presentation, cover opening, reader and closing sequences remain in place.

Season crystals are 48 cm tall and sit substantially deeper inside their pillars. The masonry has a real central aperture, a dark backing, an inset metal sleeve and a narrow retaining rim. Shoulder stones and the lowered central base course surround the mount without crossing the gem. Main-cover monuments keep their original solid masonry. Extraction timing, flight destination, glow and crossing effects are preserved; cancellation/re-entry restores the new docked position.

Reader arrow shortcuts also work after focusing a toolbar button; text inputs and the page selector retain their own keyboard controls.

## State and storage

The state sequence is **key found → unlocking → open → taking → carried → presenting → reading → closing → carried**. Completed milestones are stored independently for each season under `between-seasons-relic-<season>-v1`. Reader positions use `between-seasons-reader-<season>-v1`.

Only completed unlock and pickup milestones are saved. Reloading during an interrupted animation restores a stable state; a key or book is not lost. Invalid storage is ignored, and blocked storage leaves the current visit playable. Keys cannot unlock other seasons' boxes. Progress and inventory survive leaving and re-entering a season on the same browser.

## Verification

`node scripts/test-season-books.mjs` passes all four seasons at 30/60/120 Hz with normal and reduced-motion durations. It checks ordered interactions, repeated-input guards, persistence, corrupt/blocked storage, season isolation, partial opening cancellation, page counts/order, and existing chapter-cover files. It decodes the real book and scanned-rock GLBs to test front-of-box/key reachability from spawn, compact dimensions, trunk clearance, collision, texture bindings, smooth key pickup, independence from camera pitch, walking lag, standing still, pickup/carry/open/close poses, finite geometry and mesh budgets. Test bitmap stubs support geometry decoding only; they do not validate rendering.

`node scripts/test-season-crystals.mjs` decodes the real crystal and ray-tests the actual pillar opening and shoulder stones. It verifies the embedded depth and clearances, solid main-cover variant, tap target, original flight/glow timing, recycling and re-seating.

TypeScript, seasonal navigation/layout, water, vegetation/realism, crystals, asset checks, and the existing book-sequence/binding/projection/printed-page regressions pass.

The final `npm run build:vercel` build passes. The latest refinement build log is `../output/seasons/season-books-final-build.log`. Smoke requests to the generated production handler return 200 for `/` and 404 for the development-only `/world-preview` route.

Browser review reached the rendered Spring landscape without console warnings/errors before local browser control became disabled in Work settings on 19 October. The placement refinements above still need a final visual/browser pass, including GPU shaders, animation appearance, reader layout, touch gestures and focus behaviour. That pass must not be described as completed from the geometry tests alone. The saved Sites project is accessible again, but these refinements have not been published.

## Universal object controls and final review — 19 October 2026

The left control panel consistently provides Pick up, Interact and Drop. Enter interacts, F picks up a nearby object or puts down the held object, and R reads a carried book. E remains an interaction alias. The sanctuary uses the same panel for crystal/cover actions. Inputs are guarded during opening and placement.

All four seasons register their loose props: Spring has 12, Summer 45, Autumn 5 and Winter 5, in addition to each season's key and book. Picnic contents travel with their tray/plate until individually picked up. The beach ball retains rolling and collision; the lantern carries its light. Large scenery and furniture remain fixed. Loose-prop layouts reset on a new visit; completed book/key progress continues to persist per season.

Placement samples the actual blanket/towel mesh as well as terrain across each object's full footprint. It rejects occupied, steep, deep-water and out-of-bounds locations, retains the item if no valid space exists, and settles it smoothly. Real object bounds prevent placement inside other props, furniture or the chest. Loose props use live walking colliders, so lifting an item clears its former footprint. Initial coastal pebble overlaps are resolved from their actual model bounds.

The book uses warm cloth boards, ivory endpaper extending close to the board edges and a centred open spread. The reader uses ivory paper, fine layered page edges and page dimensions derived from the actual artwork, replacing the heavy dark surround.

Verification: test-season-pickup passes for all 67 real props, clear placement, raised/wavy fabric, blocked-drop retention, carry pitch independence, 30/60/120 Hz and reduced motion. test-season-books includes dropping and recovering keys/books in all seasons. Navigation/layout, realism, water and crystal regressions pass. TypeScript passes. Browser review verified Spring apple pickup/drop onto the blanket, desktop/page-key reader navigation, phone reader fitting, Summer ball pickup/drop, Autumn pickup and Winter firewood/lantern pickup/drop. Browser console checks returned no warnings or errors during those checks. Mobile landscape and portrait HUD regions were inspected; the portrait feedback-to-sound gap was increased after its measured overlap was found. Production build and deployment are recorded in the current release log.
