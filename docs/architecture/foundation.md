# Foundation decisions

## Stack and ownership

pnpm and Turborepo coordinate the workspace. Vite hosts the React application; Babylon.js renders the scene; Zustand stores low-frequency UI/session state. Tailwind and Radix-based button primitives establish the shadcn/ui component pattern. Zod validates content at load boundaries. No server or Next.js is needed for the initial client.

Rust owns planar position, world velocity, yaw and yaw rate. The renderer never writes simulation state. The river milestone adds current sampling, upstream eddies, wave-gradient forces and finite-hull contacts to Sprint 1 thrust/drag dynamics; this remains a simplified handling model. Input and fixed-step orchestration live outside scene construction, while React receives sampled diagnostics.

## Coordinate convention

Meters, seconds, radians. +Y is up, +Z is the initial forward/downstream direction, +X is right. Curved courses use lateral offset and downstream arc length for authored content, then Rust maps features and rotates currents into world space. Boat snapshots remain world coordinates. Yaw zero points toward +Z; positive yaw turns toward +X. Babylon uses its default left-handed scene convention. Rust stores planar X/Z and yaw; height and pitch are visual-only.

## WASM interface

The dependency-free crate exports ABI version 6, `timestep()`, `reset()`, `configure(...)`, `advance(steps, throttle, steering)` and `state(index)`. Named state indices 0–5 represent X, Z, yaw, VX, VZ and yaw rate; indices 6–11 contain the penultimate state. The bridge checks ABI/export compatibility and step count bounds; Rust sanitizes controls and rejects invalid configuration atomically. Applying boat configuration resets state, while ordinary reset retains configuration. A staged venue update replaces bounds, spawn, current/wave parameters and obstacles atomically. Both operations preserve the selected venue and reset simulation time/contact counters.

The instance is owned by one main-thread runtime with synchronous non-reentrant calls. The TypeScript accumulator uses Rust's exported 1/120 second timestep, clamps long frames to 250 ms and batches up to 30 steps. Rust records the previous state during the batch, so rendering can interpolate without an extra advance call. Continuous yaw avoids heading wrap discontinuities. Hidden tabs stop stepping; blur and editor focus clear held controls and interpolation debt. Catch-up remains bounded. Reproducibility assumes the same per-tick input sequence; wall-clock keyboard sampling across frame rates is not guaranteed identical.

Current and previous snapshots require twelve scalar WASM reads per batch. Profiling includes those reads. Water sampling uses a separate shared-memory buffer: one batched grid call produces height, velocity and gradients for the render mesh, avoiding per-vertex crossings. The boat uses scalar sampling for its surface pose.

Turborepo declares Rust source, manifests, lockfile and build scripts as WASM task inputs. Generated WASM is ignored by Git and rebuilt before dev/build/typecheck/test tasks. Rust source edits require a rebuild and browser reload.

## Verification boundaries

Native Rust tests cover propulsion, anisotropic/angular damping, momentum, configuration atomicity, reset, batching, replay, and sustained stability. Vitest tests exercise the actual compiled WASM and replay fixed-tick inputs at synthetic 30/60/144 Hz schedules, alongside clock, interpolation, camera smoothing, configuration and input mapping. Playwright checks forward/reverse/turning, tuning, reset, editor focus, blur, repeat keys and debug rendering.

E2E/Playwright runs and its profiler are paused by current session instruction. Interactive verification uses Computer Use; Rust/WASM unit tests remain enabled.

Software WebGL verifies rendering and gives a repeatable baseline; it does not establish target-GPU performance or gameplay quality. See the sprint validation note for outstanding manual checks.

The Paris milestone adds Rust-owned course mapping/projection, pocket-expanded bank edges and a course-grid export. See [Paris venue geometry and limitations](../physics/paris-venue.md). The rectangular world-grid export remains available for regression fixtures.

The whitewater refinement replaces the default venue’s analytic U with an arc-length spline, rounded pool profiles and nine discrete grade drops. Rectangular baffles affect contacts, flow splitting and localized standing wakes. Course-grid ABI 5 adds turbulence/crest fields for foam; its stride is seven while the world-grid stride remains five. Gate suspension consumes a Rust surface-height upper envelope.

ABI 6 adds a submerged flag to `venue_block`. Submerged shapers affect the water field but are excluded from planar hull contacts. Solid bank baffles render as joined modules inside one shared rectangular collision footprint. Fine foam/normal shading, spray and suspension sway are presentation effects; Rust still owns all large surface heights and gradients.


The timed practice run lives in TypeScript and consumes authoritative world poses
at every 120 Hz step through an optional runtime observer. In this mode, stepping
uses single-tick calls so gate crossings cannot be lost between render frames;
the unobserved sandbox retains batching. Rust still owns forces and contacts.
Race rules are separately authored and Zod-validated. UI publishes race snapshots
at the HUD cadence; character/paddle animation consumes controls without writing
simulation state. See the gameplay-reference note for judging limitations.
