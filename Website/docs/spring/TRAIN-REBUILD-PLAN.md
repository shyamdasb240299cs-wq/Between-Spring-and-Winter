# Train rebuild from the original furnished coach

Status: implemented and regression checked on 1 November 2026. The runtime preserves the original furnished sections, inserts five complete matching sections, and shares the extended layout with navigation, lighting and quest placement. See RELEASE-01-NOV-2026.md for final verification and publication.

## User requirements

- Preserve the supplied model's interior, windows, fittings and seat proportions.
- Retain the four original passenger sections and insert five complete matching sections: nine sections, 72 berths.
- A repeated section includes the shell, roof, floor, windows, seating, supports and fittings, with a partition on only its far boundary. Do not add isolated cushions or stretch seats.
- Begin numbering at the opposite end from the annotated screenshots, next to the relocated washing interaction.
- Keep each eight-berth group consistent: the two main stacks are 1/2/3 and 4/5/6 from lower to upper; the side berths are 7 lower and 8 upper. Add eight for each subsequent section. Thus the third section has side berths 23 lower and 24 upper. Place the suitcase on 23.
- Put coach plates above the interior doorway at the annotated location. Put berth plates on the actual partition/berth supports, with upper numbers at upper berths.
- Replace the projecting entrance stairs with three closely spaced ladder-like treads; retain a reachable doorway threshold and working grab handles.
- Move washing and the adjacent-door trigger to the opposite wash space. Reveal the complete clue as handwriting cleared through condensation on the actual mirror surface.
- Repair the suitcase wheel/code/clasp/lid interaction and verify it on screen.

## Problems identified before the rebuild

`spring-north-train.ts` defines nine bays at 1.51 m spacing, removes the original seat groups, compresses a copied seat template, and adds standalone side-lower cushions. The original coach shell is not extended. Five projecting stair treads are generated per entrance. Rail, apron, collision grid, interior bounds, lighting, bogies and end fittings use fixed lengths.

`spring-train-quest.ts` positions plates and the suitcase from those compressed bay centres. The basin and mirror use fixed southern-end coordinates. The clue is a rectangular texture with prewritten S2/72 text faded as a whole, rather than strokes revealed through condensation. Quest proximity also assumes the original coach length.

## Implementation sequence

1. Inspect the untouched GLB hierarchy and triangle bounds. Identify the four genuine bay boundaries and a complete representative repeat section. Record exact cut planes and model-space transforms before editing geometry.
2. Build a reproducible asset preparation step. Preserve both end modules and the four existing sections. Insert five full sections at a clean boundary. Clip continuous shell/floor/roof geometry at the same planes with interpolated attributes and correct normals/UVs. Include each join partition exactly once. Preserve original materials and door hierarchies.
3. Remove runtime seat compression and synthetic side cushions. Derive a shared coach layout from the rebuilt geometry: nine bay centres, end positions, entrances, wash spaces and berth anchors. Use it for the collision grid, walking support, track/apron coverage, wheels, buffers and lights.
4. Generate 72 unique plates from physical berth anchors, with numbering increasing from the opposite washroom end. Place coach plates above the interior doors. Position the suitcase on side lower 23 using its actual cushion height. Update authoring viewpoints.
5. Place the wash target and clue on the correct original basin/mirror. Washing followed by opening its adjacent door starts condensation; progressive hand-drawn stroke masks clear the writing through the mist. Keep all characters inside the glass and visible from the approach. Preserve completed clue state on reload and offer a reduced-motion reveal.
6. Audit the lock from the displayed clue through the underlying combination, each wheel's selected face, the clasp action, and the imported lid hinge axis. Reject incorrect entries visibly; the correct code opens the case and exposes both rewards. Preserve keyboard and on-screen controls.
7. Run geometry and gameplay checks, then browser-review every join, the full aisle, all entrances, numbering at both ends, berths 23/24, the opposite wash space, clue animation, and wrong/correct lock entries. Build and publish only after these pass.

## Release acceptance

Nine complete bays with original proportions; no doubled partitions or floating added seats; 72 unique physical berth numbers; lower/upper side pairs correctly ordered; reachable suitcase at 23; correct wash-space interaction; legible animated mirror clue; functional three-tread entry and exit; continuous collision and walking support across the elongated coach; no regression to Spring progression, saves, or the ending.
