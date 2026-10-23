# Spring refinement — 21 October 2026

Implemented locally, with final gameplay review and publication in progress.

- Freestanding rose timber door at the former school corner, rotated to face the picnic approach. Front-side interaction opens it; crossing from that side enters a separate 10 × 13 m classroom. The closed leaf and surrounding facade block passage. The return point supports the player's whole footprint and faces out toward the picnic blanket.
- Eight long shared desks and benches, central aisle, rectangular teacher table, blackboard, blank projection screen and ceiling projector. Front memory desk carries the existing puzzle objects; cabinet stands separately.
- Eight timber casement windows with separate transparent panes, textured plaster and terrazzo with material relief, room-local sunlight and shadows, classroom signs and a framed return door. Blackboard guidance identifies the blue cloth on the real front desk.
- Interior and grove visibility switch so the interior is not rendered outdoors. Room has independent walking surface and furniture/wall collisions.
- Centre + pointer. Two short taps within 340 ms interact at the centre; drag gestures do not trigger an action. Holding an object makes double tap put it down. Enter/F and on-screen buttons remain.
- Shared vector strokes define sun, leaf and ripple across the incomplete drawings, assembled light-frame clue and cabinet wheels. Each sheet contributes part of the same pictures; asymmetrical corner marks and staged hints explain alignment and the left-to-right setting.
- Trail progress survives refresh at collected objects, paper placement/clipping, rubbing and each excavation stage. Completed Spring readers retain book access; an explicit fresh trail takes precedence over the older relic save. Invalid or unavailable browser storage does not prevent playing.
- Out-of-order exploration does not add hidden note, map or bench prerequisites. The correct cabinet setting works when discovered early; early excavation still requires its key before the box opens. Satchel book recovery explains when a carried object needs to be set down.
- Connected water channel below the bridge, clipped shoreline mesh and gentler water bump material.
- Spatial meadow and puzzle batching, precomputed tree transforms/colours, front-to-back tree instances, and broad-phase pickup ray tests. Removed automatic resolution/density degradation; full existing walking area retained.

Verification recorded during this review:

- TypeScript (`npx tsc --noEmit`), `test-spring-trail`, `test-spring-classroom`, `test-season-layout`, `test-season-navigation` and all-season `test-season-pickup` passed. These cover progression/reload recovery, reachable destinations, bridge/water continuity, door direction and collisions, safe classroom return, room surfaces/visibility, the central aisle, movement and object handling.
- Browser review opened the door from its intended picnic side and physically walked the classroom's central aisle. The complete fresh-save trail, final puzzle appearance, touch controls and final performance review are still in progress.
- A production build was recorded as passing in the earlier local refinement; the final release build and deployed result still need to be recorded after this review.
- Before the portal redesign, browser measured ~35 FPS at 1280 × 720 on Intel Iris Xe with quality 1 and 555 trees. Not a controlled benchmark and not a final-room measurement.
- Browser review has resumed after the earlier interruption. No completed end-to-end playthrough or production publication is claimed here; the final verified result will be appended after those steps finish.
