# Spring: the complete keepsake journey

Updated 28 October 2026. The chapter continues from the food stall and Adavi through the bus dream, night train, dumplings, clearing rain, deferred paper hunt, buried treasure, candle task and Spring book ending.

## Play the chapter

Open [the local Spring preview](http://127.0.0.1:5173/world-preview?season=spring) after starting the development server.

1. Explore Syamu’s food stall. Pick up the rambutan basket and eat its eight fruits to reveal the brass key and folded door note. Taking the key adds it to inventory; select slot 9 to equip it before unlocking the door.
2. Wander away from the stall to find the planted timber doorway. Open it and walk through the multicoloured illusion to reach Adavi. The same brief portal passage plays when returning to Spring.
3. Read Syamu’s four arrival pages at your own pace. He remembers your visits, challenges you to skip a stone across the river, and explains why a thin, flat stone and shallow release matter. The stone slab beside the river reads “Adavi Eco Tourism”.
4. Search the shore for the scattered 3D stones. There are flat slate pieces, oval pebbles, and rounded cobbles. Pick one up, inspect its shape, and select **Give it a throw**. You can put it down and choose another.
5. Stay in first person at the throwing shore. The stone floats in front of you with an invisible hand. Slide the vertical **Power** bar on the left and drag the right **Angle & direction** joystick: left/right changes direction, up makes the release shallower, and down makes it steeper. The curved trajectory guide updates to show the actual predicted path. Select **Throw stone** to wind up and release. The viewpoint stays on the shore and turns to follow the spinning stone, splashes, and ripples. Four numbered indicators track the first four skips. Reach the far landing with at least four contacts to complete the challenge.
6. If the stone sinks, misses, or crosses with too few skips, read the result feedback and choose **Find another stone**. A balanced flat stone, an angle around 10°, and approximately three-quarter power are a useful starting point. Uneven thin shale and little slate need more precise tuning. Each new stone pickup gets fresh breeze/release conditions, so even a good angle can drift away from the landing. Check the displayed cross-breeze and aim into it; the guide already includes that attempt’s drift. The conditions stay fixed while adjusting or cancelling the aim, and the actual flight uses exactly the displayed prediction.
7. After a successful throw, advance Syamu’s two celebration pages. Choose **Take the bag** to reveal the 3D bag on the shore, then approach it and **Collect bag**. The inventory lists a mushroom toy, a candle, and a note.
8. Read the note: “Go back to the overworld and enjoy the view near the bridge.” Fold it, return through the door, and walk to the bridge. Read the note pinned to the bridge handrail.

9. On the first bridge visit, read the pill letter and collect its capsule. Sit on the riverside bench and take it to enter the sunny bus dream. The five paper pieces remain hidden at this stage.
10. Get up and search the third three-person bench from the rear. Read the north-rail letter and collect the brass compass and crystal spectacles before choosing **Wake up**. Return to rainy Spring, stand up, and follow the compass north along the track to the stationary sleeper coach.
11. Open the coach door and read its entrance note. Wash your hands at the basin, then open the washroom door; the mirror gradually reveals **S2 72**. Hold the mushroom toy in either hand to reveal all 72 berth numbers and the coach plates. Side lower is 23; side upper is 24. Find the real hinged suitcase on berth 23. Examine its built-in lock: the view moves to the physical wheels and brass clasp, with controls aligned to them. Turn the five lock wheels to **S 1 1 9 6**, try the clasp, collect the diamond key and read the letter. **Step back / Esc** restores the walking view and retained equipment.
12. Return to the other side of the food stall. Read the little note beneath the counter, take the closed steamer and chopsticks, lift the lid, and eat all seven dumplings. Steam rises from the container, and each dumpling travels to the mouth. Rain fades over fourteen seconds as the clouds clear and Spring brightens. Return the steamer and chopsticks to the stall to free both hands.
13. Revisit the bridge to read the new paper-hunt letter. Search both riverbanks for five torn, wrinkled pieces, partly under stones and fallen twigs. All five use one inventory slot and form “You are my aiteall.” Collect the two-handed shovel beside the bridge and follow the brighter patch of sunlight near the bench.
14. Dig for six seconds to uncover the chest. Set the shovel down, equip the diamond key and open the lid. Its interior remains dark. Advance Syamu’s final request, then hold the candle and spectacles, one in each hand, and approach the sunlit patch. The hands settle into place; the spectacles focus sunlight onto the wick and light the candle after four seconds. After **Lower your hands**, look at the sunlight patch and select **Focus sunlight through the spectacles** to retry in place.
15. Hold the lit candle beside the open chest to reveal and take **Part One · Spring**. All gameplay controls disappear. You walk to the nearest bench, sit, watch the wind carry cherry blossoms, look down at the book and gently open it. The manga reader opens automatically. **Close book** returns control and exposes **Return to void**; the book can be read again.

Put down or drop earlier notes when storage fills; dropped small items stay in the world and can be recovered. A shovel never occupies storage. Notes and lock panels suspend world movement. Reload closes transient panels, preserves puzzle milestones and resumes a collected book in reading mode. Development fixtures use memory-only saves and leave player progress untouched.

The Adavi dialogue advances only when selected. Movement is suspended during these pages, aiming, the stone’s flight, and the open bag note. The original two-line Spring introduction still dismisses automatically or with its close button. Stall letters remain physical paper held in the 3D view; the new bag note opens as a readable card.

## Controls

- **WASD / arrows**: move. **Drag**: look. On touch devices, use the movement joystick and drag the view.
- **E / Enter / on-screen action**: interact with the object under the crosshair, eat held food, collect a shore stone or bag, or use the equipped key.
- **F**: pick up or put back. **Q**: return food near the stall, or stow it when away.
- **1–0 / storage buttons**: equip from two separate five-slot inventory banks, with the physical hand slots between them. **H** switches the active hand. **Q / Stow** stores only small one-hand items. Food containers, baskets and the backpack occupy both hands and stay physical: return servings to the stall or set the backpack on the ground. Empty hands can accept small pickups when storage is full. All five paper pieces occupy one slot.
- **X**: take the key after the rambutan pile clears. **N**: hold the folded door note.
- **Give it a throw**: enter first-person aiming. Drag the left vertical power bar and the right aiming joystick, then select **Throw stone** or **Back**. The power bar supports keyboard arrows; focus the joystick and use arrows for direction and release angle, or Home to reset the joystick to 10° and straight across. Pointer capture keeps drags active outside the control, and releasing preserves the chosen aim.
- **Read note / Fold the note**: inspect or close the note from the collected bag, including after returning to Spring.

Food portions, inventory, completed arrival dialogue, successful challenge, bag, note, and bridge progress use the existing `between-spring-fresh-trail-v4` save. This update preserves that progress. A reload clears transient throws and open notes. An unfinished bus dream resumes in the bus; after using wakeup, reloading returns to rainy Spring and preserves the keepsakes. The original earlier-release rambutan save key is still ignored. Returning to Adavi resumes the saved chapter milestones without replaying completed dialogue.

## Scene and assets

The stall retains its cloth awning, timber joinery, Malabar food servings, individual grape portions, shaped mangoes, and tapered rambutan hairs. Food-to-mouth animations have no visible hands. Held objects resolve against the cart, counter, sign, and awning posts; putting a serving back requires returning near the table.

The Adavi-inspired scene has a main river roughly 11 metres wide, muddy and rocky banks, a downstream side tributary, small cascades, and layered forest planting. The waterfall treatment adds layered falling water, visible depth, moving surface detail, bright foam, spray, mist, and disturbed water where the fall meets the pool. River and cascade water share the planar reflection capture, with shallow-bed shading, subtle caustics, surface detail, and canopy shadow reception. The freestanding doorway carries a multicoloured illusion layer after opening; the short full-screen passage veil names the destination in either direction. Reduced-motion mode uses a fade for that veil.

The stone catalog uses actual prepared river-pebble, river-rock, and rock models with distinct proportions, rotations, and stable scattered shore positions. Skipping uses deterministic ballistic segments, water contact and hydrodynamic lift, horizontal energy loss, sinking, and dry-bank collisions. The visible throw follows the same trajectory used to decide success. The suspended stone winds back before releasing from the guide’s exact waist-height origin; there is no visible hand or arm. Rounded stones sink more readily; broad, thin faces preserve lift across repeated contacts. World proximity checks gate stone pickup and bag collection. The first-person composition adapts to screen width and aim direction, keeps the return door behind the observer, and follows flight by turning the view while its position stays fixed.

The original character atlas is `public/seasons/kit/spring-character/shyamu-poses.webp`. The Adavi atlas is `shyamu-adavi-poses.webp` in the same directory, with welcome, playful challenge, teaching, and celebration expressions and gestures. The four cells are selected to match the dialogue. Prompts and provenance are recorded in that directory’s `assets.json` and `adavi-assets.json`; source/reference assets remain in the working files. Bag rewards reuse the prepared mushroom toy and candle models.

Rendering retains spatially culled forest cells and far tree variants, a separate reflection scene, static landscape shadows, and a navigation height grid with nearby-obstacle indexing. Hidden Spring scenery stops updating inside Adavi. Reflection captures refresh when the camera moves or the viewport changes; a stationary view reuses the capture while water continues animating. Generated build directories are excluded from development watching.

Adavi foliage remaps the original red leaf textures to green while preserving their light/dark detail, normals and alpha cutouts. Bark is darker brown and retains its texture detail. Close trees use the higher-detail imported models inside 14 metres (10 on mobile), middle detail extends to 34 metres, and distant trees use the existing far models. The nearest desktop canopies gain a second smaller layer of the actual leaf meshes, with one trunk per tree; varied crown proportions and slight lean give the tree silhouettes more natural variation.

Adavi is an interpretation using attributed free assets, rather than a location scan. Food and interaction props use authored geometry and materials. Reference photography from travel sites is not redistributed. Place references: [Kerala Tourism’s Adavi article](https://www.keralatourism.org/kerala-article/2024/adavi-experience-the-thrill-of-coracle-boating/1458) and [Pathanamthitta’s Adavi page](https://pathanamthitta.nic.in/en/tourist-place/konni-and-adavi/).

## Local QA

From `Website`, run:

```powershell
node scripts/test-spring-trail.mjs
node scripts/test-spring-lake.mjs
node scripts/test-spring-lake-scene.mjs
node scripts/test-spring-bus.mjs
node scripts/test-spring-river.mjs
node scripts/test-spring-forest.mjs
node scripts/test-spring-rendering.mjs
node scripts/test-spring-adavi-physics.mjs
node scripts/test-spring-adavi-state.mjs
node scripts/test-spring-adavi-scene.mjs
npx tsc --noEmit
npm run build:vercel
```

The inventory test covers portions, cooldown, manual key equip, hotbar saves, and legacy/corrupt storage handling. Forest checks cover real basket bounds, held-object collision and framing, papers, the portal, safe return, and west-bank navigation. Rendering checks report geometry and CPU navigation costs, reflection reuse, and cascade uniforms; these are not GPU frame-rate measurements. Physics checks cover stone suitability, stable paths, impact order, four-skip success, and failure outcomes. State checks cover gated dialogue, selection, aim controls, ordered throw actions, retries, rewards, note/bridge progress, and reload safety.

In the browser, walk the complete chapter once with mouse and once at a mobile landscape size. Check the doorway’s distance from the stall, both portal transitions, stone selection and distinct shapes, trajectory guidance, all water contacts, failed throws, a successful throw, expression changes, bag materialisation and physical collection, readable note, return trip, and bridge endpoint. Reload during aiming or flight and after collecting the bag to confirm recovery. Inspect the waterfall up close and from the bank for depth, foam/splash contact, transparent edges, reflection continuity, and smooth animation. Confirm that the aiming panel leaves the river visible, touch controls remain usable, and reduced-motion mode fades the portal passage without swirling.

The scene test loads the actual stone, candle and mushroom GLBs and verifies physical shape ratios, reach/raycast selection, the animated trajectory and every splash, guarded completion, bag materialisation and collection, return milestones, and resource cleanup. It also checks invisible-hand holding, first-person flight tracking, and camera framing.

The 25 October final browser pass checked waterfall surfaces and contact foam up close and across the river, arrival/celebration poses, a failed rounded-stone throw, successful four-skip flight with the new controls, physical bag pickup, the note, both portal directions, and the bridge endpoint. A 78%/10° flat-stone throw also made four skips but missed the landing in an 11.6° cross-breeze, confirming that the good angle alone does not guarantee completion. Desktop (1440×900), mobile landscape (844×390), and portrait (390×844) layouts were inspected. Keyboard and mouse/pointer drags were exercised; the in-app browser does not support synthetic touch injection, so a physical finger test was not performed. Evidence is in `output/seasons/adavi-final-qa/`. Automated scene checks are not a GPU performance benchmark.

## Bus references and local authoring

The four user-supplied bus photographs are retained under `Assets and working files/seasons/spring-bus/references/` and guide the bench backs, yellow rails, smaller shutters, sheet-metal roof corners and rear entrance. They are not redistributed as runtime textures. The bus cabin and buildings are authored geometry; existing attributed GLB palms, trees, grass and rocks supply real 3D roadside detail. Sunny photographic sky/HDR lighting and scanned asphalt, diamond plate, plaster and clay tiles are free CC0 Poly Haven assets. Full provenance is in `public/seasons/kit/spring-bus/assets.json`.

Development-only disposable previews: `/world-preview?season=spring&spring-check=river` and `?season=spring&spring-check=bus`. These use memory-only saves and never read or write the player’s Spring save. The authoring viewpoint menu visits the rear/front aisle, handrail, bench and each paper hiding place. Production excludes these controls and ignores chapter fixtures.

Bus reference revision: two full two-person bench rows sit behind the relocated narrow rear doorway, before the full rear bench. The exposed rear glass is 1.40 × .52 metres, surrounded by opaque body panels. Door jambs, seals, inset panels and stair cutouts align with the openings. Moving scenery requests a shadow refresh every frame; distant moving strips do not cast into the local sun map. Ground texture scrolling matches the journey. The compositor uses two-sample MSAA for thin rails and foliage.

26 October polish: the bus uses an infinite photographic sky background, eliminating the old sphere/far-plane circular boundary. Spring no longer adds a second synthetic sun over its panorama. Both wake-ups use 3.2-second asymmetric eyelids, hesitant blinks, gradual focus recovery, and small settling gaze movements; reduced-motion disables gaze movement. Bus exit restores the background orientation before rainy Spring.

## North railway continuation — 26 October 2026

The second three-person bench from the back, on the right side (row 8, z=3.18), contains a physical north-rail letter and a working brass compass. The five-person full rear bench does not count as a three-person seat. The player starts at the front, must get up and find the keepsakes at the back, then read and collect both before waking at the rainy river. The red compass needle points along world -Z independently of the camera, including while looking down and turning. Walk north on the west bank, find the broad-gauge track beginning at (12, -38), then follow it to the single sleeper coach centred at (12, -76). Normal steel entrance steps and upright grab handles serve all four side doors. There is no boarding ramp or bridge. Every imported entrance, vestibule and washroom door can be opened and closed. Doors check for the visitor before closing. Furniture and walls use colliders baked from the actual model triangles; the aisle and boarding route remain walkable. The train has blue ICF paint, aged metalwork, wheelsets, buffers, broad-gauge rails, sleepers, interior lamps, entrance lights and red end markers.

Weather changes continuously with position: rainy cloudy daylight at the lake, fading rainfall north of z=-31, dry conditions by z=-60 and night by z=-67. Returning south restores the same cloudy rain without restarting or consuming a quest flag. Layered streaks, soft near drops, varied wind and terminal speed, water rings, small ground rebounds and slowly drying wet materials share the rain envelope. Original procedural stereo rain audio respects the central sound switch, pause, tab visibility and real user activation. It fades with the rain.

The user-supplied train asset is optimized from 63.6 MB to 6.0 MB; its separate interior and moving-door hierarchy are preserved. Original author, source and embedded license are retained in public/seasons/kit/spring-train/assets.json. The blue livery follows the [RDSO/CAMTECH ICF coach painting reference, page 16](https://rdso.indianrailways.gov.in/works/uploads/File/Draft%20Handbook%20on%20Procedure%20for%20Painting%20of%20ICF%20coaches.pdf). The bus paint and fittings additionally follow the [user-selected Behance model](https://www.behance.net/gallery/220731499/Realistic-KSRTC-Bus-Low-Poly-3D-Model). Its images are visual references and are not distributed as textures.

Legacy saves recover bulky stored items into physical world placements and recover the letter/compass for dreams already completed before this update. New playthroughs collect the keepsakes from the actual bus seat. The fully stitched paper reads “You are my aiteall.” on one continuous text layer. Two-hand items cannot be silently stowed or replaced. The key and papers are positioned on their actual hand side to keep a second held compass clear.

Additional local checks: node scripts/test-spring-journey.mjs; node scripts/test-spring-train.mjs; node scripts/test-spring-rain.mjs; node scripts/test-spring-rain-audio.mjs. Development-only /world-preview?season=spring&spring-check=rail uses a disposable memory save beside the train entrance steps; it never writes the player save.

26 October continuation: all four coach entrances use normal steel treads with upright grab handles, with physical boarding and descent. The three red marks in the original seat atlas, including their compressed borders, are replaced in the upholstery shader with nearby clean fabric from that same atlas. Static coach batching uses 35 mesh draws in the imported-asset check. Cabin lighting keeps physical inverse-square falloff while affecting only railway materials. The procedural sky draws after opaque geometry, and off-screen river geometry is frustum culled to avoid hidden full-world reflection captures. Independent model downloads run concurrently with duplicate URL bytes shared; texture resolution, scene resolution and the original coach geometry remain unchanged. Authoring viewpoints include the entrance steps, aisle, cleaned upholstery and exterior.

## Kerala roadside continuation — 27 October 2026

The bus now passes 32 distinct houses and shops across forty 15-metre parcels. Tiled-roof houses have real window openings, bars, timber shutters, gutters and shaded verandas. Concrete homes have upper floors, balcony railings, parapets and roof tanks. Thirteen open-front shops include tea/snack counters, bakery, groceries, hardware and tailoring businesses. Their counters, shelves, jars and produce sit inside the buildings. Nineteen private entrances use gates and boundary walls; other parcels contain planted gardens and bus shelters. Open drains and slab crossings align with the road shoulders and parcel approaches.

Actual PBR GLBs supply chain-link fence panels, shop shutters, crates, barrels, plants and plastic chairs. Scanned masonry and laterite complement the existing plaster, clay-tile, asphalt and ground maps. The asset manifest records authors, CC0 licenses, preparation and source links. Everything moves with its parcel at the same travel speed; the sky remains an infinite background. Adjacent parcels share material batches, and fixed local transforms are cached while their parent strips, cabin sway, fans and handles keep moving. Empty construction containers are removed after batching. Paused scenery reuses its shadow map.

Shader warm-up now isolates visible scene objects so hidden bus/forest materials are not compiled against the wrong active lights. The exact scene hierarchy is restored on both success and failure; the forest warm-up explicitly makes its root visible. This removes unnecessary variants while keeping the same textures, geometry and output resolution.

Checks: `node scripts/test-season-warmup.mjs`, `node scripts/test-spring-roadside.mjs`, `node scripts/test-spring-bus.mjs`, `node scripts/test-spring-train.mjs`, and `node scripts/test-spring-journey.mjs`. The full roadside check loads all six actual prepared GLBs, validates grounding, geometry budgets, shared travel, material isolation and cleanup. Authoring views include “Bus · left roadside” and “Bus · right roadside”. Frame-rate claims require browser measurements; geometry counts alone do not establish smoothness.

## Transport and river final draft — 27 October 2026

The bus rear has a small 1.40 × .52 metre window inside an opaque body. The narrower rear doorway is ahead of two complete two-person rows; its stair opening is clear. The train's eight wheel treads meet the rails, all four normal entrance stairways support boarding and descent, and the ten doors retain their working collision guards. The blue upholstery includes the padded removal of all three red marks and their borders.

The river now follows a continuous 400-metre channel. Both reaches bend east beyond the playable grove and camera range, with the same curve driving terrain, water, banks and navigation. Water uses depth-dependent transmission, flowing normals, Fresnel reflections and shallow caustics. Rain contacts share world positions and timing between reflected-surface rings and brief airborne droplets; the bridge intercepts its own rain. Reflection captures respond to movement, resizing and weather, and are skipped for offscreen reaches.

Final verification passed TypeScript, the Vercel production build and 20 existing regression scripts. Browser review covered keyboard coach boarding and stopping, mobile landscape joystick walking and looking, the bus letter and compass pickups, the gated wake-up, the retained inventory, the rainy return, clean train seats and both river bends. These checks used disposable authoring saves.

Opaque bus and train surfaces now render before the surrounding scenery, letting the depth buffer reject hidden foliage and roadside shading. Transparent surfaces retain their separate pass. On this PC's Intel Iris Xe, the moving bus measured approximately 42–56 FPS at an 844 × 390 mobile landscape viewport; the coach improved from approximately 30–37 to 42–46 FPS at 1366 × 768. A stationary rainy-river view measured about 34 FPS at 1366 × 768. Scene scale remained 1. These are development-preview samples, not actual phone measurements or a zero-lag guarantee. Sustained 60 FPS at full laptop resolution remains an outstanding performance limitation.

The final QA record and screenshots are in `docs/spring/FINAL-DRAFT-QA.md` and the project-level `output/seasons/final-draft-2026-10-27/` folder.
