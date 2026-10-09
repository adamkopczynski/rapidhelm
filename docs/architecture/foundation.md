# Foundation decisions

## Stack and ownership

pnpm and Turborepo coordinate the workspace. Vite hosts the React application; Babylon.js renders the scene; Zustand stores low-frequency UI/session state. Tailwind and Radix-based button primitives establish the shadcn/ui component pattern. Zod validates content at load boundaries. No server or Next.js is needed for the initial client.

Rust owns position, yaw and speed. The renderer never writes simulation state. The simple foundation dynamics are scaffolding for Sprint 1, not a completed hydrodynamic model.

## Coordinate convention

Meters, seconds, radians. +Y is up, +Z is forward/downstream, +X is right. Yaw zero points toward +Z; positive yaw turns toward +X. Babylon uses its default left-handed scene convention. Rust stores planar X/Z and yaw; height and pitch are visual-only.

## WASM interface

The dependency-free crate exports `reset()`, `advance(steps, throttle, steering)` and `state(index)`. State indices 0–3 represent X, Z, yaw and speed. Inputs are sanitized and clamped. The instance is owned by one main-thread runtime and calls are synchronous; it is not reentrant. Each runtime receives a separate WebAssembly instance. This keeps the initial build free of wasm-bindgen version/tool coupling. A packed state buffer can replace the four scalar reads once profiling justifies it.

The TypeScript accumulator runs at 120 Hz, clamps long frames to 250 ms and batches up to 30 steps. A final separate step preserves the penultimate state for interpolation. Rendering interpolates between that state and the current state. Hidden tabs stop stepping; focus loss clears controls. Long stalls intentionally discard wall time rather than catching up indefinitely. Simulation reproducibility assumes the same fixed-step input sequence; wall-clock keyboard timing across render rates is not guaranteed identical.

Turborepo declares Rust source, manifests, lockfile and build scripts as WASM task inputs. Generated WASM is ignored by Git and rebuilt before dev/build/typecheck/test tasks. Rust source edits require a rebuild and browser reload.

## Verification boundaries

Native Rust tests verify propulsion, drag, batching equivalence and invalid inputs. Vitest verifies the timestep accumulator across render rates and the stall cap. Playwright verifies loading the compiled WASM, stepping through controls and resetting, with page errors collected. Software WebGL in browser tests confirms startup, not target GPU performance or visual quality.

Manual milestone checklist: start the app, paddle/reverse/turn, release keys, restart by key and button, change tab and return, resize the window, inspect camera comfort and control feel. Record frame times on target hardware before accepting performance.
