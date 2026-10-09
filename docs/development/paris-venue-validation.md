# Paris venue validation — 9 October 2026

## Automated verification

- `pnpm check`: TypeScript, 16 Vitest tests (including actual compiled-WASM Paris checks), 20 native Rust tests and production build.
- `cargo fmt` and `cargo clippy -- -D warnings` through the repository Cargo launcher.
- The 150-second scripted centreline controller reaches the return leg beyond 240 m. Every tick checks the sampled capsule spine against both bank edges and the end caps, plus exact capsule/circle baffle clearance. Old straight-course regressions continue passing.
- Mapping and flow tests cover the bend, both straight legs, six reverse eddies, atomic invalid geometry rejection, pocket-aware batched water and the 4.5 m base drop. Native surface gradients are checked by world-space finite differences.

## Interactive browser checks

The live development app was inspected in the Codex in-app browser with native keyboard/UI actions. Chrome native access was unavailable in the preceding session, so these results should not be described as a test in the user's Chrome window.

- Loaded the rebuilt WASM successfully; the HUD reports Simulation ready.
- Inspected the U-shaped channel from Venue overview, including alternating expanded pockets, modular baffles and surrounding facility/terrace/lake proxies.
- Held W for ten seconds from the calm pool; reached 53.9 m, with 0.30 m wave amplitude and sampled downstream flow. Inspected numbered red/green hanging gates and baffles in chase view.
- No captured browser console errors at that checkpoint. Later HUD hot updates exposed an existing duplicate React root warning: the app component was separated from the root entry point to give Vite a proper component refresh boundary. The final fresh load reached Simulation ready without a new console error; earlier warnings remained in the browser log history.
- Concrete construction was changed after visual inspection from wave-phase-aligned boxes to continuous strips on the Rust base grade. Follow-up inspection confirmed continuous lit banks, compact overview/chase switching, debug vectors, another paddle into rapids and reset to 5.0 m with zero flow/waves/contacts.

These are rendering/input smoke checks, not acceptance of realistic handling. A human should test entering/leaving all eddies, upstream gate approach, the bend under different momentum, obstacle recovery and several boat tunings. No target-GPU benchmark or complete human-driven course run is claimed. Existing production chunk-size/dependency-comment warnings remain non-blocking.

## Deliberate limits

The geometry follows the supplied references approximately. The site is not georeferenced; neither obstacle/gate arrangement nor the hydraulic field reproduces the official competition configuration. Training and regatta lengths/discharges are metadata references; only the competition channel is playable. See [model assumptions and source provenance](../physics/paris-venue.md).

E2E/Playwright tests and its profiler remain paused by user instruction. Generated WASM and build outputs are ignored and are not committed.
