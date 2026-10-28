# Spring transport and river final draft

Verified locally on 27 October 2026. This records the completed implementation and the remaining performance limit; it does not certify a production deployment.

## Implemented behavior

- KSRTC rear body encloses a small rear window. Two two-person rows fit behind the narrowed rear door, with a clear stair opening and aisle.
- The north-rail letter and working compass occupy the second three-person row from the rear. Both must be collected before returning to the rainy river.
- All four coach entrances use their normal steps. Eight wheel treads meet the rails; all ten doors preserve moving collision guards. Upholstery masks include the red marks' borders.
- Opaque vehicle surfaces draw before the surrounding scenery. Covered fragments can fail the depth test before expensive foliage/roadside shading; transparent materials keep their separate pass. Textures, geometry, resolution and shadow cadence remain intact.
- The river spans 400 metres. Both ends curve east beyond the grove and camera range. Water, carved bed, gravel banks and walking boundaries use the same route.
- Water preserves flowing normals, shallow transmission and camera-dependent reflections. Rain rings perturb its reflected surface and share world positions and timing with short splash droplets. Solid supports intercept rainfall.

## Verification

Passed `node node_modules/typescript/bin/tsc --noEmit --incremental false` and `node scripts/build-vercel.mjs`.

The production build completed successfully. It reports large client chunks and optional dependency tracing warnings; they did not fail the build.

All 20 existing scripts passed:

```text
test-spring-bus.mjs
test-spring-train.mjs
test-spring-journey.mjs
test-spring-river.mjs
test-spring-rain.mjs
test-spring-rain-audio.mjs
test-spring-rendering.mjs
test-season-warmup.mjs
test-season-layout.mjs
test-spring-trail.mjs
test-spring-lake.mjs
test-spring-roadside.mjs
test-season-navigation.mjs
test-spring-classroom.mjs
test-spring-forest.mjs
test-spring-adavi-physics.mjs
test-spring-adavi-state.mjs
test-spring-adavi-scene.mjs
test-spring-lake-scene.mjs
test-preview-controls.mjs
```

Run each from `Website` with `node scripts/<name>`.

Browser review used the in-app browser and disposable authoring saves. Confirmed keyboard boarding and release, mobile landscape joystick movement and looking, the rear body/window, the accessible letter prompt, letter reading, compass pickup, wake-up gating and return with retained inventory. Reviewed clean upholstery and both rainy river bends. The final loaded scenes recorded no console errors. During development reload recovery, one asset fetch was interrupted and logged an error; clean navigation recovered. The Windows graphics compiler also emitted shader warnings without failing rendering.

## Performance limit

The GPU was Intel Iris Xe through ANGLE/D3D11. Scene scale stayed at 1.

| Development preview | Viewport | Observed FPS |
| --- | --- | --- |
| Moving bus, sampled front and aisle views | 844 × 390 | 42–56 |
| Coach entrance and interior, after opaque ordering change | 1366 × 768 | 42–46 |
| Stationary rainy river, northern view | 1366 × 768 | about 34 |

The same coach checks before the opaque ordering change measured approximately 30–37 FPS. The final entrance/interior samples reported roughly 16–17 ms for the scene GPU pass, compared with approximately 28 ms at the original entrance sample.

These are individual development-preview samples, not a controlled benchmark distribution, cold-loading measurement, actual-phone test or universal performance guarantee. View/world changes can still stall. Sustained 60 FPS at full laptop resolution is not achieved on this GPU.

## Local review

Start the development server with the project-root `Start website.cmd` or `npm run dev` from `Website`.

- Bus: <http://127.0.0.1:5173/world-preview?season=spring&spring-check=bus>
- Train and completed-journey weather: <http://127.0.0.1:5173/world-preview?season=spring&spring-check=rail>
- River puzzle: <http://127.0.0.1:5173/world-preview?season=spring&spring-check=river>

The preview route is excluded from production. Use its Spring viewpoint selector for the rear bus seats, coach entrances, upholstery, exterior and river approaches. These fixtures do not write the player's save.

Saved images live in the project-root `output/seasons/final-draft-2026-10-27/` directory:

- `bus-mobile.jpg`: mobile landscape aisle, rear body and small window.
- `coach-upholstery.jpg`: clean blue seat with surrounding texture retained.
- `river-north-rain.jpg`: rainy northern bend and reflected canopy.
- `river-south-rain.jpg`: bridge and the southern reach curving out of view.
