# Foundation decisions

## Stack and ownership

pnpm and Turborepo coordinate the workspace. Vite hosts the React application; Babylon.js renders the scene; Zustand stores low-frequency UI/session state. Tailwind and Radix-based button primitives establish the shadcn/ui component pattern. Zod validates content at load boundaries. No server or Next.js is needed for the initial client.

Rust owns planar position, world velocity, yaw and yaw rate. The renderer never writes simulation state. Sprint 1 adds thrust, anisotropic drag, steering torque and angular damping; this remains a simplified handling model. Input and fixed-step orchestration live outside scene construction, while React receives sampled diagnostics.

## Coordinate convention

Meters, seconds, radians. +Y is up, +Z is forward/downstream, +X is right. Yaw zero points toward +Z; positive yaw turns toward +X. Babylon uses its default left-handed scene convention. Rust stores planar X/Z and yaw; height and pitch are visual-only.

## WASM interface

The dependency-free crate exports ABI version 2, `timestep()`, `reset()`, `configure(...)`, `advance(steps, throttle, steering)` and `state(index)`. Named state indices 0–5 represent X, Z, yaw, VX, VZ and yaw rate; indices 6–11 contain the penultimate state. The bridge checks ABI/export compatibility and step count bounds; Rust sanitizes controls and rejects invalid configuration atomically. Applying configuration resets state, while ordinary reset retains configuration.

The instance is owned by one main-thread runtime with synchronous non-reentrant calls. The TypeScript accumulator uses Rust's exported 1/120 second timestep, clamps long frames to 250 ms and batches up to 30 steps. Rust records the previous state during the batch, so rendering can interpolate without an extra advance call. Continuous yaw avoids heading wrap discontinuities. Hidden tabs stop stepping; blur and editor focus clear held controls and interpolation debt. Catch-up remains bounded. Reproducibility assumes the same per-tick input sequence; wall-clock keyboard sampling across frame rates is not guaranteed identical.

Current and previous snapshots require twelve scalar WASM reads per batch. Profiling includes those reads. A packed buffer is deferred until evidence justifies the added interface complexity.

Turborepo declares Rust source, manifests, lockfile and build scripts as WASM task inputs. Generated WASM is ignored by Git and rebuilt before dev/build/typecheck/test tasks. Rust source edits require a rebuild and browser reload.

## Verification boundaries

Native Rust tests cover propulsion, anisotropic/angular damping, momentum, configuration atomicity, reset, batching, replay, and sustained stability. Vitest tests exercise the actual compiled WASM and replay fixed-tick inputs at synthetic 30/60/144 Hz schedules, alongside clock, interpolation, camera smoothing, configuration and input mapping. Playwright checks forward/reverse/turning, tuning, reset, editor focus, blur, repeat keys and debug rendering.

Software WebGL verifies rendering and gives a repeatable baseline; it does not establish target-GPU performance or gameplay quality. See the sprint validation note for outstanding manual checks.
