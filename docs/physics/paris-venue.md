# Vaires-sur-Marne initial venue

The default venue is a playable study based on the supplied aerial photographs and architectural site plan. The original 180 m straight training channel remains a regression fixture. This is not a surveyed reconstruction or the official Paris 2024 gate configuration.

## Targets and estimates

| Parameter | Model |
| --- | --- |
| Competition centreline | 300 m |
| Nominal channel width | 16 m (widened handling study), six wider bank pockets, rounded 34/40 m start/finish pools |
| Base surface drop | Start +4.5 m → finish 0 m, nine localized 0.35–0.9 m drops |
| Discharge reference | 14 m³/s |
| Practice gates | 20 numbered targets, 6 upstream |
| Training / regatta references | 150 m at 10 m³/s / 2,200 m; metadata only |
| Slalom spectator reference | 12,000; terraces are visual proxies |

The symmetric U has been replaced by a ten-control-point Catmull–Rom horseshoe, estimated from the Paris aerial photographs and architectural plan. Rust builds a 193-station arc-length table and scales the route to 300 m. The legs curve differently, the outer bend is broad, and the receiving pool approaches the facilities at an angle. This improves the broad footprint; it is still not a survey trace. The 16 m nominal width is a user-requested handling adjustment from the initial 14 m reference.

Both pools have rounded width profiles. The starting pool is flat at +4.5 m; nine smooth localized drops lower the surface to a flat receiving pool at 0 m. The entire modeled surface stays within those elevation limits. Concrete follows the static base profile, not a wave phase.

The baseline section uses an assumed effective depth of 0.8 m: `Q / (width × depth) = 14 / (16 × 0.8) = 1.09375 m/s`. Drop jets use a localized gravity-based speed increment. Blue oriented boxes split the flow using an empirical bounding-radius deflection field and generate localized downstream standing wakes. Six authored reverse eddies provide upstream approaches in bank pockets. Surface crests are stationary around drops and blocks, with at most 6% in-place pulsation; foam is advected. Away from features, the water is quiet. The previous periodic travelling-wave field is disabled for Paris but retained in the straight regression fixture.

This is a parameterized whitewater handling model, not a shallow-water/CFD solver. It does not conserve discharge, compute hydraulic jumps from pressure, evolve free-surface depth or resolve air entrainment. Drop and block placement, wave height, pocket currents and bathymetry remain estimates. Mounting rails are visual; changing authored block geometry affects contacts and its flow/wake field, but there is no interactive rail editor yet.

Gate poles are 1.8 m long, 4.5 cm diameter, with 20 cm stripes, a white bottom stripe and 2.2 cm black base band. Each pole is suspended above Rust's upper local surface envelope with a 23 cm nominal gap, including a 3 cm reserve for subtle pendulum sway. Number cards sway slightly too. The authored 3 m practice-gate width measures inside edges; pole centres are separated by width + diameter. Number panels are 30 cm. Gates now use the timed practice judge described in the gameplay-reference note; full athlete/paddle contact judging remains pending. These dimensions do not imply complete current-ICF course compliance: the [2025 ICF rules, §8.3](https://www.canoeicf.com/sites/default/files/2025_canoe_slalom_competition_rules_final.pdf) specify a 1.4 m gate width, whereas this study retains the user's broader practice-width range.

## Shared geometry and ABI 6

Venue feature X/Z values are lateral offset and downstream centreline arc length. Boat snapshots remain world X/Z and world yaw. Rust maps and projects course coordinates, rotates water velocities into world coordinates, and applies the bend metric to surface gradients. +Z remains the initial downstream direction; the return leg naturally flows toward world −Z. React reports progress by projection rather than world Z.

`venue_point`, `venue_pools`, `venue_drop` and `venue_block` extend atomic staged configuration. `channel_frame` maps/projects the spline, `channel_edge` supplies pool/pocket-expanded banks, `channel_metric` supplies the curve metric and `channel_base_height` supplies the static grade. `water_ceiling` supplies the upper surface envelope for hanging gates. `course_grid` returns seven fields per point: height, world VX/VZ, world gradients X/Z, turbulence and standing-crest strength. The older `water_grid` remains a five-field world grid. Borrowed results are overwritten by subsequent calls to the same buffer.

The renderer consumes these exports instead of reproducing course or hydraulic algorithms. Rust rejects folded/tightly curved routes at commit and keeps the previous simulation intact after an invalid update. The route table is prepared only once per accepted venue. Runtime water queries borrow venue data rather than copying the spline table for each sample.

Contacts project a densely sampled capsule spine against banks with a 0.025 m conservative allowance. Oriented rectangular blocks use sampled spine/disc-to-box contacts with 0.015 m allowance and the existing pose substeps. This is conservative discrete collision resolution rather than a continuous exact capsule solver. Circle contacts remain for the straight training fixture.

## Reference provenance

- User-supplied Archello aerial photograph and site plan establish the U-shaped channel, alternating pockets and modular obstacles: [project page](https://archello.com/project/vaires-sur-marne-olympic-nautical-stadium). Automated access returned 403; the attached images supplied the visual evidence.
- [Auer Weber project description](https://www.auer-weber.de/projekte/details/olympisches-wassersportstadion-bei-paris.html) describes the plateau and amphitheatre arrangement.
- [Venue project presentation](https://www.descartes-devinnov.com/wp-content/uploads/2022/03/Projet-stade-nautique-final.pdf) reports the 300/150 m channels, 2,200 m regatta course and event-specific 12,000/24,000 capacities. Width, drop and discharge are user-provided targets; they have not been independently established from a hydraulic drawing.

## Verification

Native tests exercise spline mapping roundtrips and folded-route rejection, rectangular faces/corners at multiple headings and a fast impact, alongside existing circle/wall regressions. Actual-WASM tests load Paris content, inspect six reverse eddies, compare course-grid/scalar samples at their mapped positions, reject invalid geometry atomically and run a 150-second deterministic controller replay through the bend and return leg while checking capsule/baffle clearance. Additional WASM checks establish flat elevated/low pools, localized stationary crest envelopes, world-space surface gradients, invalid drop rejection and pole clearance across multiple wave phases. This controller is a test input source, not a gameplay assist.

`pnpm check`, Cargo formatting and Clippy remain required. E2E/Playwright is paused. Interactive checks and their limitations are recorded in the development validation note. Passing deterministic tests does not establish realistic paddling feel, exact Paris hydraulics or target-GPU performance.


## Modular baffles and water presentation

Eleven 5.8 m × 1.2 m baffles extend 0.1 m into the nominal bank and leave a
central passage. Each assembly is rendered as four joined moulded plastic boxes;
one shared OBB represents their filled rectangular footprint, avoiding artificial
collision seams. Solid footprints have zero sampled current. Placement avoids the
expanded eddy pockets; their reverse current remains usable.

Three smaller submerged shapers at 54, 146 and 254 m alter current and generate
standing wakes, while allowing the planar hull to pass above. Their visual caps
sit below the base surface; the opaque water does not expose their full geometry.
This categorical clearance assumption is not a depth-dependent hull/bed solver.

Drop heights total 4.5 m with the first 0.9 m drop over 2.5 m. Standing crest gain
is 0.72 times drop height (roughly 0.65 m at the first crest), with localized jets.
Procedural foam uses two crossfaded advection phases to avoid indefinite stretching
in spatially varying flow. Fine normal variation, Fresnel sky color, sun glints,
foam flakes and ballistic spray improve whitewater presentation. Spray and fine
shading do not exert forces; the hydraulic field is empirical, not CFD. Reflections
use a procedural sky approximation, not scene reflections or production water art.

The race camera sits 6.8 m behind and 2.8 m above the boat's sampled surface,
looking forward 7 m plus velocity anticipation. Exponential smoothing preserves
heading continuity across ±π. This reproduces the closer scale and forward view
of the supplied game references while retaining the venue overview.
