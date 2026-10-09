# Vaires-sur-Marne initial venue

The default venue is a playable study based on the supplied aerial photographs and architectural site plan. The original 180 m straight training channel remains a regression fixture. This is not a surveyed reconstruction or the official Paris 2024 gate configuration.

## Targets and estimates

| Parameter | Model |
| --- | --- |
| Competition centreline | 300 m |
| Nominal channel width | 14 m, with six wider bank pockets |
| Base surface drop | 4.5 m, flat spawn pool and smooth slope entrance |
| Discharge reference | 14 m³/s |
| Practice gates | 20 numbered targets, 6 upstream |
| Training / regatta references | 150 m at 10 m³/s / 2,200 m; metadata only |
| Slalom spectator reference | 12,000; terraces are visual proxies |

A 30 m centreline bend radius connects two straight legs, each `(300 − π × 30) / 2` metres. This U-shaped footprint follows the reference's broad arrangement, but radius, pocket locations, obstacle locations, depths, buildings and gates are authored estimates. Gates are visual practice targets; there is no judging or race timer yet. No source photographs are bundled in the app.

The baseline section uses an assumed effective depth of 0.8 m: `Q / (width × depth) = 14 / (14 × 0.8) = 1.25 m/s`. Bank attenuation, obstacle deflection, six faster jets and six reverse eddies are authored handling fields. They do **not** conserve the reference discharge or solve hydraulic pressure, turbulence or obstacle-driven surface changes. The 14 m³/s value is never interpreted as 14 m/s. Waves remain deterministic analytic waves rather than CFD.

## Shared geometry and ABI 4

Venue feature X/Z values are lateral offset and downstream centreline arc length. Boat snapshots remain world X/Z and world yaw. Rust maps and projects course coordinates, rotates water velocities into world coordinates, and applies the bend metric to surface gradients. +Z remains the initial downstream direction; the return leg naturally flows toward world −Z. React reports progress by projection rather than world Z.

`venue_geometry` and `venue_pocket` extend the atomic staged venue configuration. `channel_frame` supplies mapping/projection, `channel_edge` supplies pocket-expanded banks, and `course_grid` batches surface samples across normalized channel width. `water_grid` retains its world-grid meaning. The renderer consumes these exports instead of reproducing the path algorithm. Borrowed shared-memory results are overwritten by later calls to the same buffer.

Contacts project a densely sampled capsule spine against curved banks, with a 0.025 m conservative allowance and the existing movement substeps. This is an approximation, not an exact continuous capsule/curved-wall solver. Circular modular baffle footprints use the existing capsule/circle solver; the visible cylindrical shell matches that footprint. Mounting rails are submerged visual details, not independently colliding obstacles. Rectangle-shaped modular arrangements and interactive rail adjustment remain future refinements.

## Reference provenance

- User-supplied Archello aerial photograph and site plan establish the U-shaped channel, alternating pockets and modular obstacles: [project page](https://archello.com/project/vaires-sur-marne-olympic-nautical-stadium). Automated access returned 403; the attached images supplied the visual evidence.
- [Auer Weber project description](https://www.auer-weber.de/projekte/details/olympisches-wassersportstadion-bei-paris.html) describes the plateau and amphitheatre arrangement.
- [Venue project presentation](https://www.descartes-devinnov.com/wp-content/uploads/2022/03/Projet-stade-nautique-final.pdf) reports the 300/150 m channels, 2,200 m regatta course and event-specific 12,000/24,000 capacities. Width, drop and discharge are user-provided targets; they have not been independently established from a hydraulic drawing.

## Verification

Native tests exercise mapping roundtrips through both junctions, rotated flow, world-space finite-difference surface gradients, exact base drop and bank clearance at multiple headings. Actual-WASM tests load Paris content, inspect six reverse eddies, compare course-grid/scalar samples at their mapped positions, reject invalid geometry atomically and run a 150-second deterministic controller replay through the bend and return leg while checking capsule/baffle clearance. This controller is a test input source, not a gameplay assist.

`pnpm check`, Cargo formatting and Clippy remain required. E2E/Playwright is paused. Interactive checks and their limitations are recorded in the development validation note. Passing deterministic tests does not establish realistic paddling feel, exact Paris hydraulics or target-GPU performance.
