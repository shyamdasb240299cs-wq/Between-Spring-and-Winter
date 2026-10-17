# Scroll book presentation

The book arrives closed and opens to the intro letter. A small further scroll
(0.16 journey units) triggers a timed cinematic: all 13 leaves flip in 0.82 seconds,
then the rear cover closes and the book retreats left in 0.40 seconds. Wheel,
touch, keyboard and scrollbar input cannot park a page or reverse a running
sequence. At completion the scroll aligns to the closed-book endpoint.

Further scrolling controls the centered half-turn from left to right beside the
ending copy. Scrolling back past the closed-book endpoint triggers an uninterrupted
reverse: the rear cover opens, all pages return automatically, and the letter
holds open again. Reading, zoom, page navigation, resume and page progress controls
are removed. Chapter reading is reserved for a future experience inside the 3D world.

On portrait phones the closed cover sits above the ending copy. The 3D book is
enabled in both orientations; the former rotation prompt is no longer mounted.

## Performance

- All 25 distinct print textures preload, decode, and upload before the rapid
  page sequence. They remain resident for forward and backward scrolling.
- `public/manga/flip` contains 640px WebP prints, totaling about 3.5 MB. Regenerate
  them with `node scripts/prepare-flip-textures.mjs` after changing page artwork.
- The original full-size pages are retained as source assets for the future reader.
- At most three leaves are visible. Their curl follows the scroll directly.
  Resting pages do not run a spring simulation, and resting poses do not redraw.
- Narrow screens omit the dynamic shadow pass. The cinematic has no reading-progress
  storage writes or React page-state updates.
- `?motion-audit` exposes local diagnostic datasets. Render cadence includes
  pauses in input and should not be treated as a sustained-animation benchmark.

## Verification

`node scripts/test-book-sequence.mjs` checks uninterrupted forward/reverse playback,
input independence, endpoint holds, preload gating and reduced motion.
`node scripts/test-book-binding.mjs` checks the watertight cloth shell and both ends
embedded inside their boards at 62 hinge poses.
`node scripts/test-book-projection.mjs` checks print assets, camera projection,
and both outro positions at 11 desktop,
phone, and tablet dimensions. `node scripts/test-printed-pages.mjs` checks decode
and GPU-upload gating, bounded concurrency, resident preload, backtracking,
failure handling, and disposal. TypeScript and the Vercel production build are checked before publication.

Browser checks covered desktop and portrait layouts, closed arrival, the first
letter, sequential forward/reverse flips, the left closed pose, and the final
front cover with the ending copy. All 25 print textures loaded without failures.
The binding is a solid curved cloth shell connected to both cover boards throughout
opening and closing, with capped ends and a filled paper block in both closed poses.

Performance still depends on device GPU, browser, and initial network conditions;
these checks do not guarantee zero dropped frames on every physical device.
