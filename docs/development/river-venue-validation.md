# Bounded river venue validation — 2026-10-09

The active river-physics goal is implemented as two milestones: the Rust/venue/ABI core and the playable scene integration. Session preferences are recorded in AGENTS.md: continue across sprints, skip E2E/Playwright, and commit/push completed milestones.

## Requirement audit

| Requirement | Implementation and evidence |
| --- | --- |
| Keep the boat inside the venue | Oriented capsule contacts against all four walls. Native tests check every heading; actual-WASM tests check every full-hull footprint and rock clearance over 12,000 scripted ticks in the authored venue. Live browser drift reached the end at X=-4.14, Z=179.58, heading 270°, leaving the 0.42 m lateral radius inside the 180 m boundary. |
| Downstream current affects handling | Rust samples the venue field for water-relative drag and bow/stern rotational response. Native drift tests and compiled runtime integration pass. Live W input left the calm pool and reached approximately 3.15 m/s local downstream flow; the boat continued drifting after input was released. |
| Basic physical obstacles | Five authored circular rocks, flow deflection/wakes and finite-hull collision impulses; visible geometry uses the same positions/radii. Native tests stop a 1000 m/s hull approach; the live downstream run registered two rock contacts before reaching the end. |
| Waves affect boat behavior | Analytical surface gradients exert planar forces; native tests verify derivatives and differing trajectories with/without waves. The rendered boat follows the same sampled height/gradient, and the river mesh receives a batched Rust grid. Live wave telemetry reached 0.28 m. |
| Upstream current affects behavior | Two authored elliptical eddies, at right X=7/Z=67 and left X=-7/Z=105, with negative downstream velocity. Native tests demonstrate upstream drift; actual-WASM queries verify negative flow in the authored right eddy. Flow arrows/foam use the shared field, including upstream directions. |
| Flat initial course and starting point | Zero-flow, zero-wave flat pool; full-hull-safe spawn X=0/Z=5/yaw=0. Native and real-WASM tests confirm stationary idle behavior. Live startup and restart display zero flow/waves and return to that position. Flow builds from Z=14 to Z=32; waves start at Z=34. |
| Player can catch the flow | W/S propulsion and A/D torque remain connected to the fixed-step runtime. Live browser W input traversed the starting pool and joined the downstream current. The start stripe, signs, instructions and zone indicator show the progression. |
| Completed milestones committed/pushed | The simulation milestone is `ac5be2d`; scene/validation integration follows as its own milestone commit. |

## Verification results

- `pnpm check`: strict TypeScript checks, **14 TypeScript/actual-WASM unit tests**, **18 Rust tests**, and the production build pass.
- `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings`: pass.
- Interactive Computer Use inspection: scene startup, paddle-to-current transition, continued drift, waves, rock contacts, downstream containment and restart verified; no rendering errors were logged in the final verification tab.
- E2E/Playwright tests and the Playwright profiler were **not run**, per session instruction.

Chrome Computer Use was unavailable because macOS permissions were not granted. Interactive checks used the app browser instead; the user's Chrome development window remains available for their own playtesting. The app browser displayed approximately 16.5–16.8 ms frame intervals during the observed run. This is an incidental sample, not a controlled target-hardware benchmark.

## Rendering and scope notes

The live check exposed Babylon.js async shader registration falling back to Vite's HTML route. Standard/color GLSL shaders are now registered eagerly. Startup reports readiness after the scene's material preparation completes. The scene uses a 2057-point Rust water grid uploaded at up to 30 Hz, while fixed-step physics remains 120 Hz and boat pose/rendering continues every frame. Foam is instanced and flow arrows/debug meshes are reused.

The model is planar and uses authored flow rather than full CFD. Wave slopes drive planar forces and visual heave/pitch/roll; 3D buoyancy/capsizing are outside this goal. Geometry and materials are prototype art. Contact work is adaptively subdivided with a pathological-input cap documented in the physics note. Gates, race rules, gamepad support and production assets remain future work. Handling tuning remains open to user playtesting, without blocking subsequent authorized work.
