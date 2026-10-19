# Expanded seasonal exploration — 19 October 2026

The forest walking radius is now 22 metres, up from 8.7 metres. Summer's island is widened by a factor of 1.65 along both horizontal axes. The CPU terrain, terrain mesh, underwater floor, water shaders, surf spray, navigation and object placement all share the expanded shape. The water-depth limits are preserved.

| Season | Trees | Additional seats | Other new fixed scenery |
| --- | ---: | ---: | --- |
| Spring | 517 | 4 benches | 8 boulders and a fallen log |
| Summer | 28 palms | 6 beach chairs | 3 parasols, 10 coastal boulders and 2 driftwood logs |
| Autumn | 495 | 4 benches | 8 boulders and a fallen log |
| Winter | 519 | 4 benches | 8 boulders and a fallen log |

All additional scenery uses existing attributed glTF assets in the seasonal catalog. No new downloads or external licences are required. New seats have level seating surfaces and foot endpoints fitted to the local terrain. Boulders and fallen timber are partially embedded for contact. Shared landmark data supplies both model placement and walking collisions. Tree placement excludes the landmark footprints and keeps the original book arrangements and central approaches clear.

The larger forests reuse instanced tree batches and their existing near/mid/far meshes. Detailed tree selection follows camera distance, distant tree rings extend to roughly 104 metres, and the shadow field covers the larger foreground. Meadow/clover/flower/petal placement reaches the new spring trails. Loose coastal details stay bounded near the original beach while batched short grass extends around the additional palms.

Validation covers finite navigation, 360-degree tree coverage, bounded tree budgets, actual spawn-connected walking area with body clearance, approaches to every new seating area, tree/scenery clearance, real-model footprint enclosure, four seat-foot contacts on the sloped terrain, all-season pickup/drop, fabric contact, book/key routes, water/reflections and refresh-rate-independent navigation. The navigation, layout, pickup, book, coastal-plant, realism and water checks pass. TypeScript and the production build are checked for release.

Browser use was disabled in Work settings during this expansion. New GPU appearance and physical-phone frame rate therefore remain unverified; geometry/model tests do not certify either.
