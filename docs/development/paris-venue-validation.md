# Paris venue validation — 9 October 2026

This note describes the whitewater refinement after the initial Paris milestone. The original equal-legged U, travelling waves and circular baffles have been replaced in the default venue; the straight training fixture remains intact.

## Automated verification

- `pnpm check`: TypeScript checks, 17 Vitest tests, 22 native Rust tests and production build. Cargo formatting and `cargo clippy -- -D warnings` pass through the repository launcher.
- Actual compiled-WASM tests validate the revised content and its 300 m spline, check six upstream eddies, compare seven-field course-grid samples with world-space scalar samples, and reject invalid staged geometry/drop parameters atomically.
- A 150-second scripted centreline controller reaches the return leg beyond 240 m. Every tick checks the sampled capsule against expanded banks and end caps, plus oriented rectangular block clearance using 33 spine probes. It is a test input source, not an in-game steering assist.
- Native tests check spline offset/progress roundtrips and folded-route rejection. Rectangular contacts cover faces/corners at 32 hull headings and a 1,000 m/s stress approach without tunnelling. Existing straight-bank, circular-obstacle and baseline boat regressions pass.
- Whitewater tests check high/low flat pools, nine-drop total elevation change, fixed crest locations across time, quiet water between features, world-space finite-difference surface gradients and gate-pole clearance across multiple animation phases. Pole clearance uses the same Rust upper envelope consumed by rendering.

## Interactive verification

The rebuilt development app was inspected in the Codex in-app browser using native keyboard/UI actions. This is not a test in the user's Chrome window. E2E/Playwright tests and its profiler remain paused.

- Startup reached Simulation ready with the new WASM ABI.
- Overview inspection confirmed an asymmetric horseshoe, rounded wider head/receiving pools, blue rectangular baffles, alternating side pockets and localized whitewater. The camera fits the full channel footprint. Surrounding facilities remain simple proxies; an overlapping building proxy was moved clear of the receiving pool.
- Chase view: holding W for twelve seconds reached 61.6 m, past the first localized drop. The boat contacted a blue block and subsequently drifted clear. The contact counter counts simulation ticks with contact, not distinct impacts.
- Visible gate poles use narrow red/green and white rings, hanging cords and pole tips above the water. The first crest/drops have local foam; quiet stretches and pools lack the previous periodic ocean-wave pattern.
- No browser console errors were captured during that gameplay checkpoint.
- Water-elevation telemetry exposes the current height relative to the 0 m finish pool. Reset returns to the +4.5 m starting pool while clearing contacts and current/crest diagnostics.

These are input/rendering smoke checks. A human should still assess paddling feel, upstream gate approach, entering/leaving every eddy, block recovery and bend handling at several tunings. No full human-driven race or target-GPU performance benchmark is claimed. Existing bundle-size and dependency-comment build warnings remain non-blocking.

## Limits and provenance

The spline is an estimate from Paris aerial photographs and the architectural site plan, not a survey or the official race gate/block layout. The first new panoramic photo appears to depict a different venue and was used for baffle/whitewater appearance rather than the Paris outline. Nominal width is intentionally increased to 16 m for handling iteration. Training and regatta dimensions are metadata; only the competition channel is playable.

The hydraulics remain parameterized local fields, not a mass-conserving hydraulic solver. See [model assumptions, gate dimensions and sources](../physics/paris-venue.md). Generated WASM and build outputs are ignored and are not committed.

## Whitewater presentation milestone

Rust standing crest gain increased from 0.32 to 0.72 of each drop; obstacle wakes
increased to 0.18 m. Surface gradients and conservative gate envelopes still come
from Rust. The renderer adds procedural advected foam, fine normal detail, sky
Fresnel and sun highlights, plus subtle hanging pole sway. Chase position is
6.8 m behind and 2.8 m above the sampled water, with forward/velocity look-ahead.
Fine shading is visual, not additional boat dynamics or a fluid solver.

Automated: pnpm check passed (22 Rust, 17 Vitest), cargo fmt/clippy passed.
Manual: reloaded in-app development browser; 10 seconds W reached 54.1 m,
verified the low chase framing and compiled water shader, no console errors.
Chrome and sustained GPU performance were not tested. Bank assemblies and
submerged shapers remain the next milestone.
