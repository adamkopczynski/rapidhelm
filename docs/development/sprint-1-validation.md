# Sprint 1 validation — 2026-10-09

Implementation and automated verification are complete. Manual handling acceptance and native-GPU performance validation remain open.

## Delivered

- Rust world-space linear momentum, yaw inertia, thrust, directional drag, steering torque and angular damping.
- Stable damping over validated ranges, fixed 120 Hz stepping and penultimate-state interpolation through ABI v2.
- Versioned baseline content, Zod validation, atomic Rust validation and a live tuning panel.
- Keyboard cancellation, editor/focus handling, repeat-safe restart and smoothed heading-relative chase camera.
- Velocity/heading debug lines, signed speed/yaw telemetry and sampled CPU timing.

## Automated checks

`pnpm check` passes: strict TypeScript checking, 10 Vitest tests including real compiled-WASM integration and scripted 30/60/144 Hz replay, 10 Rust tests, and the production Vite build. Frame-rate replay agrees within the requested 1e-6 tolerance for all state components. Native stability tests simulate ten minutes across eight extreme mass/inertia/damping configurations. Drag-only kinetic energy is checked for non-growth.

`pnpm test:e2e` passes five Chromium scenarios: forward/reverse/turn/restart; tuning validation/application/restoration; editor focus and blur; debug visibility and page-error checks; repeated restart events and editor suppression. The 1280×720 sandbox screenshot was visually inspected. Rust formatting and Clippy with warnings denied also pass.

Existing build warnings remain for Zod's comment annotations and the main Babylon.js bundle size. No new runtime dependency was added; Node type definitions were added as a development dependency for the actual-WASM tests.

## Performance sample

Recorded with `node scripts/profile-sandbox.mjs`, against the Vite development server on macOS arm64 / Apple M5. Chromium 156.0.8078.4, 1920×1080, SwiftShader software WebGL, baseline config, debug enabled, W+D held. The profiler discards 30 warm-up frames and samples 240 subsequent frames.

| Measurement | Mean | Median | p95 |
| --- | ---: | ---: | ---: |
| requestAnimationFrame interval | 40.415 ms | 33.400 ms | 50.000 ms |
| Simulation + WASM (sampled HUD) | 0.015 ms | 0.000 ms | 0.033 ms |
| Render submission (sampled HUD) | 0.218 ms | 0.170 ms | 0.370 ms |

Timing values for simulation/rendering are sampled HUD averages, rounded before collection; they are not independent per-step measurements. Software rendering did not reach 60 FPS in this sample. This establishes a reproducible automation baseline, not the target GPU result. Render submission excludes GPU completion. Debug update overhead, main-thread stalls and GPU cost are not isolated by these counters.

## Required manual acceptance

Start `pnpm dev` and evaluate:

- Straight acceleration and coast-down; braking through zero into reverse.
- Steering at rest/speed, drift after turning, and rotation decay when steering is released.
- Camera comfort on tight turns and reverse travel.
- Apply tuning, restart with tuning retained, and restore the baseline.
- Actual browser tab/focus loss and return; resize; keyboard focus in tuning fields.
- A representative run at 1920×1080 with hardware acceleration: record browser, hardware and frame times with debug enabled/disabled.

The placeholder capsule, featureless water, continuous-thrust controls and non-colliding banks are intentional sprint constraints. Accept or tune the handling before opening Sprint 2 river-current work.
