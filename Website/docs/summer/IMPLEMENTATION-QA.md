# Summer implementation QA

Work date: 22 October 2026. Companion to [the Summer design](../../SUMMER-ISLAND-PLAN.md). This file records implementation checks; the concept reference sheets are not gameplay evidence.

## Repeatable automated checks

Run from the `Website` directory:

```text
node scripts/test-summer-puzzles.mjs
node scripts/test-summer-state.mjs
node scripts/test-summer-movement.mjs
node scripts/test-summer-world.mjs
node scripts/test-summer-ui.mjs
```

`test-summer-puzzles.mjs` checks the chart registration and north orientation, all 64 observation answers, all 27 current routes, all 625 four-socket cable choices, and all 384 cassette order/rotation combinations. The accepted cassette is also checked against its actual engraved endpoints, including the START and RETURN rails. This keeps the canonical diagram data and validators in agreement; a runtime screenshot is still needed to check the diagrams are presented legibly.

`test-summer-state.mjs` exercises the full eight-act journey and rejects early rewards, invalid solutions and duplicated plate ownership. It covers preparation refreshes, a moving-boat refresh, all underwater checkpoints, supported/partially cranked mechanism reloads, permanent plate ownership across a mechanism reset, case ownership on recovery, both beach latches, letter/book access, corrupt/future saves, storage read/write failures, legacy reader access, trail-only reset, preferences and all hint levels. It also checks that swimmers cannot operate the engine or remove fitted fins, an underway boat cannot disembark, restarting in the return channel preserves its controls, and a second trip requires wearing removed equipment again after refresh. State checks establish progression rules without making a first-play pacing or physical interaction claim.

`test-summer-movement.mjs` checks every authored anchor/post with the complete collision proxy, samples the channel and sand corridor, compares movement at 30/60/120 Hz, and tests thin-wall collision at 10/30/60/120 Hz. It also checks shore, seabed and rotated boat-hull collision; independent camera look; explicit ascent/descent; overlay input reset; invalid numeric input; checkpoint depth; safe controller switching; and island/boat/post recovery. The 10 Hz case deliberately tests a delayed frame, not a performance claim.

`test-summer-world.mjs` constructs the actual Three.js scene with a neutral canvas context. It checks that physical interaction proxies survive material batching, every shore and underwater station has a full-capsule clear approach from which the actual picker selects it, the new beach note follows the authored chair landmark, and the released case remains selectable beside its overlapping cassette. It also checks gear/fuel/boat transformations, dimensional body visibility, fish movement and owned-geometry disposal. It does not render WebGL pixels.

`test-summer-ui.mjs` server-renders the actual Summer UI across shore, deck, helm and swimmer states. It verifies the explicit return docking action, no step-ashore action while underway, stopped-engine ladder controls, the underwater ladder-only console, final dock/disembark controls and equipment rewear actions. Browser interaction and viewport layout remain separate runtime checks.

## Issues found during this pass

- The original REST recovery pose put the lower part of the swimmer capsule below the seabed. A safe authored eye position must include the capsule height and bed clearance.
- The observation-to-fork corridor originally touched a reef collider near `(140, -28)`. Scenery and collision proxies must respect the same clear corridor.
- Selecting boat controls originally started the engine and released the mooring. Mode selection now preserves boat state; successful departure/return actions explicitly release it.
- A collected winch plate originally disappeared on reload after resetting its mechanism. Permanent item ownership must survive a local mechanism reset.
- Direct eastward departure from the berth intersects the jetty with the bow. The valid departure runs parallel to the jetty before turning toward the channel.
- The return console had no button calling the existing dock action, so physically piloting home could not finish the journey. The helm now offers explicit dive mooring and island docking actions; position and speed guards decide whether each succeeds.
- The underwater boat console exposed engine, fin-removal and water-entry controls. Its swimmer view now offers the stern ladder; state guards also require the player to be aboard for equipment and engine actions.
- Removing equipment left the stored wetsuit milestone complete, so a second departure could hide the player body while passing preparation. The checklist now requires wearing the suit again and both rack/checklist provide that action; the removed state survives an early-return refresh.
- The former note test embedded the old beach coordinates. The regression now derives the note approach from the authored chairs landmark after moving the chairs to the western beach.

All five Summer suites pass after these fixes. The forest/pond layout also passes the season layout suite with 245 Summer trees and spawn-connected approaches to arrival, chairs, lookout, shelter and jetty. TypeScript checking passes. Earlier affected regression checks covered season navigation, assets, water, water contacts, pickup, books, Spring trail and Spring classroom; the integration pass should repeat them after the final terrain and asset changes. The regression expectations include Summer's larger island, separate jetty walking surface, current shoreline and explicitly absent Summer chapter pages. The legacy physical Summer key/chest arrangement is no longer expected to be in the active world. Final build and runtime walkthrough evidence should be recorded by the integration pass.

## Runtime evidence still required

Record the exact build/revision and browser, fresh-save route, wrong-answer feedback, gear/body attachments, boat departure and return, water crossing, each mechanism, case retrieval and the beach ending. Include desktop and compact landscape UI, interrupted input/orientation/backgrounding, reduced motion, missing Part Two content, repeated entry/exit and asset failure recovery.

Observe fish motion and avoidance in real time and measure render cost in representative views. A static screenshot cannot establish animation, collision, controls, cleanup, a first-time completion duration, or physical-phone performance. First-time pacing and actual Android/iOS performance remain unverified until directly measured.


## Ecosystem release pass — 23 October 2026

The reef now spans 24 habitat patches with 12 anatomically distinct fish species. Same-species schools use local alignment, cohesion and separation; residents use shared visible anemone homes; grazers pause near the substrate; pairs and cleaner wrasse use smaller ranges. Turning is rate-limited, tail cadence follows speed, and obstacle prediction begins before contact. Rooted ribbon-leaf tufts, branching macroalgae, anemones, coral foundations and broken coral deposits provide layered seabed cover. Coral and vegetation batches cull by viewing direction and distance. Shore-only and underwater-only installations are hidden across the water boundary; integrated GPUs use the compact population.

`test-summer-ecosystem.mjs` passed 60 simulated seconds for all 12 species, checking finite poses, seabed/surface clearance, solid reef/wreck avoidance, resident anemone range (maximum observed 0.90 m), distribution and reduced-motion travel. Summer world, puzzles, state, movement, UI, air, forest, imported models and realism checks passed. The affected season layout, navigation, assets, water, pickup, books, Spring trail and classroom regressions also passed.

Browser evidence: the desktop reef and updated slate objective guide rendered at 1280 × 720 with no captured WebGL errors. Before the integrated-GPU compact preset, the underwater view reported 188 draw calls, approximately 1.81 million triangles and approximately 22 FPS on Intel Iris Xe. These are local development observations, not a production or phone performance guarantee. Browser use was subsequently disabled in Work settings, preventing the remaining mechanism walkthrough and compact viewport check. The automated action/state suites cover all puzzle solutions, return docking, gear removal, both case latches and the letter ending. A first-time full physical playthrough, compact viewport and Android/iOS performance remain unverified.

The slate now derives the next discovery from saved milestones, including preparation, all reef mechanisms, case recovery, return journey, equipment removal and beach ending. The supplied Summer chapter pages remain unavailable; its book action explicitly says “coming later” and preserves the completed letter ending.
