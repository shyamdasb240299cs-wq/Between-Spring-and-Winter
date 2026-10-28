# Spring release — 28 October 2026

The playable route is food stall → Adavi stone challenge and bag → bridge pill → sunny bus keepsakes → north sleeper-coach puzzle → seven dumplings → clearing rain → five paper pieces → shovel and excavation → diamond key → candle and spectacles → Spring book, bench cinematic and reader. Closing the reader restores control and Return to void. The full instructions are in `../../SPRING-GAMEPLAY.md`.

## Finalization changes

- The suitcase is inspected directly in 3D. Accessible wheel controls and the clasp follow the real lock on desktop and phone landscape layouts; incorrect combinations retain the lock, and stepping back restores the walking projection and equipment.
- Static bridge timbers share material/shadow batches. Opaque bridge, bank props and water write depth before terrain shading. Water depth uses the exact carved-basin formula, verified over the complete 400-metre river and both banks.
- The loading curtain prepares outdoor pickups, the forest and the bus with each world's actual lights and environment. Reloading within the bus also prepares its return world. Preparation restores visibility, camera and atmosphere on failure.
- The candle illuminates private chest/book materials through shared uniforms. Lighting or stowing it no longer adds a global light and changes the forest's shader configuration.
- Canceled candle focusing offers a physical retry at the sunlight patch and starts a fresh four-second hold.
- Inventory drops use the actual walkable surface, allowing low dry ground at the food stall and the bridge deck while rejecting water. Nearby dropped objects receive separate clear placements.
- Inventory slots are 44 × 44 pixels on phone landscape viewports at least 700 pixels wide. Modal, equipment, reload and ending guards remain in place.
- Holding the candle or mushroom uses the shared inventory controls. The old backpack toolbar no longer covers world actions, and a note in the other hand cannot hide a valid interaction such as collecting the Spring book.
- The old Spring cabinet test is replaced by the current complete route, including navigation clearance, reset after key/chest/book milestones, replay, reload and reader reopening.

## Verification

The local evidence directory is `output/seasons/spring-release-2026-10-28/` at the project root. It contains per-script logs, the check manifest, TypeScript diagnostics, production-build output and browser screenshots. Development chapter fixtures use memory-only saves and preserve player progress.

Automated state and scene checks do not establish GPU frame rate or actual-phone behavior. Browser performance samples and release status are recorded after final checks. No claim of universal zero lag is made.

The final phone landscape browser review (844 × 390) verified a recoverable dry-ground drop beside the stall, stowing the north rail letter, both meal props, opening the steamer, all seven portions, the clearing-weather milestone and returning the steamer. The candlelit chest was then collected using its on-screen interaction button. The bench sequence opened the 22-page reader; page advancement, closing the reader, restored walking and Return to void all worked. No browser console errors were recorded in this review. These disposable fixtures do not change the player's saved progress. This was a mouse/pointer review at a phone viewport, not a physical-device touch test.

All 29 gameplay/scene regression scripts passed, followed by the new Spring UI regression for candle/book controls and a second held note. TypeScript and the final Vercel production build passed before the production push. Earlier measurements on this Intel Iris Xe laptop remain applicable: sustained 60 FPS at full laptop resolution is not established.
