# Shrine entry transition

The existing scenery is a React/Vinext page composed of transparent WebP planes and DOM sprites, with a shared scroll camera. The book is an independently lazy-loaded Three.js component; the shrine is not 3D. No GSAP dependency is installed or added. This transition uses one requestAnimationFrame timeline and a small Canvas2D effects pass, without constructing a new environment.

The registered gate crop remains unchanged. The aperture is at source coordinate (568, 1200) on the 887 × 1774 painting. Scenery reports its screen projection to the entry controller when the camera or viewport changes. The invisible, accessible hold button covers the visible torii footprint, beneath existing copy and navigation. The scene transform origin and effects use the aperture, rather than the viewport center. Once committed, that projected opening rapidly moves toward the viewport center while the image planes enlarge; this simulates depth and cannot reveal geometry or new views behind the source painting.

## Timing

- Continuous hold: 700 ms. A warm/pink aperture glow, subtle image distortion, atmospheric shade and energy arcs build immediately. Existing petals advance up to eight times faster along their established paths into the gate.
- Early release: 240 ms smooth return to the original scene. Each new hold starts its own 700 ms timer. No scene change or navigation occurs.
- Commitment / rush: 0–680 ms. Five independently transformed planes simulate different distances: the house and branches sweep past faster than the gate and distant painting. The gate aperture moves toward the viewport center. Copy and controls fade; tapered gold/pink streaks reinforce travel. The page does not receive a uniform zoom.
- Portal: 680–1120 ms. A luminous opening grows from the registered aperture, followed by one brief pale flash as the foreground passes the viewer. The committed scene permits overflow so moving plane edges do not reveal a rectangular viewport crop.
- Tunnel: 1120–2550 ms. A dark projected tunnel has curved energy trails and 26 luminous petal particles.
- Settle: 2550–3000 ms. All effects fade to an entirely black placeholder. The completion callback fires once. No void world, water environment or extra navigation is implemented.

Reduced motion retains the intentional 700 ms hold, then uses a 700 ms glow/fade to black with no rush, streaks, tunnel or image distortion. The controller uses pointer events for primary mouse, touch and pen, pointer capture, early-release/cancel/lost-capture guards and keyboard Space/Enter holds. Scrolling and selection are blocked only during an active hold/return or committed transition. Cleanup restores styles, capture, inert controls and listeners. Hidden tabs cancel an uncommitted hold and suspend the committed timeline. Existing scenery updates sleep during the tunnel and black endpoint. Audio gently fades on commitment and its engine is disposed at completion; no new sound was created.

## Integration

`Website/app/shrine-entry.tsx` takes `onCommit` and `onComplete`. The clean future integration point is `completeShrine` in `journey-page.tsx`, which currently sets `data-domain-ready=true`. The final screen intentionally remains black until a later implementation mounts the future scene. Reloading restores the existing website. Completed transitions cannot be retriggered.

## Asset polish

The installed laptop Upscayl CLI used `digital-art-4x`, Vulkan and 128px tiles on `../shrine-petals/background-separated-source.png`. The exact 4× lossless master is `background-separated-4x.png` (3548 × 7096). `prepare-assets.cjs` validates dimensions and encodes 960/1920/2880px responsive WebPs; the full master is not served to visitors. `asset-metadata.json` records the delivered dimensions and byte sizes. No background object, typography, shrine structure, layout or navigation was redesigned. The existing gate has restrained color/contrast matching and a small opening shine.

The shared blossom pool increases to 72, with bounded source budgets of 34 opening, 18 valley and 20 roof petals. Gusts emit fuller showers and retain the same gate convergence and occlusion. Wind uses soft shaded gradient sweeps with fading edges, tied to the original branch/Fūrin physics, instead of bright hard outlines. Its SVG filters remain disabled.

## Validation

`check-entry.mjs` tests hold threshold, early cancellation, primary mouse/touch/pen capture contracts, lost capture, repeated holds, post-commit release and duplicate guards, timeline phases and reduced motion at 24/60/120Hz. The existing petal, bird, wind, sound and five-size mobile-reading regressions are also run. Browser proofs are actual captures of charging, rush, tunnel and black completion; mouse holds are exercised on desktop and a 390 × 844 portrait viewport. Touch/pen lifecycle and reduced motion are tested programmatically; this browser control does not expose physical touch or a reduced-motion emulation setting. No claim of physical-device touch testing is made.

The local Windows production build uses the existing ignored copy-serialization preload for the dependency tracer; Linux/Vercel uses the unchanged normal build command.
