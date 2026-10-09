# Sprint 1 — Boat Physics Sandbox

Status: implementation and automated verification complete; manual handling acceptance pending. See [validation](sprint-1-validation.md). Goal: a tunable still-water kayak sandbox with momentum, responsive controls, and enough debugging information to judge handling before introducing currents.

## Starting point

Sprint 0 already provides Rust/WASM movement, a 120 Hz accumulator, rendering interpolation, keyboard controls, restart, a basic camera, and smoke tests. The boat has only scalar speed; steering changes yaw directly and instantly redirects translation. Input, scene setup, stepping, and camera updates currently live in `Viewport.tsx`.

## Scope

Deliver planar boat dynamics, continuous forward/reverse thrust, steering torque, longitudinal/lateral drag, angular damping, runtime tuning, keyboard input isolation, chase camera improvements, and debug velocity vectors. Retain placeholder art and still water.

Currents and eddies belong to Sprint 2. Collisions, gates, race timing, gamepad support, paddle animation/stroke timing, boost, realistic water, and production assets remain outside this sprint. The visible banks are reference geometry, not collision boundaries; the sandbox must label this clearly.

## Implementation sequence

### 1. Rust state and dynamics

Split the crate into boat state/configuration, physics stepping, and a thin WASM export module. Replace scalar speed with `x`, `z`, `yaw`, `velocity_x`, `velocity_z`, and `yaw_rate`.

Define validated `BoatConfig` with mass, yaw inertia, forward/reverse thrust, steering torque, forward/lateral linear drag, and angular damping. Keep named units beside every parameter. Store a versioned baseline preset in content rather than scattering constants through algorithms.

Each fixed step projects velocity onto the boat's forward/right axes, computes opposing drag and commanded thrust/torque, updates linear/angular velocity, then integrates position/yaw. Use a stable velocity update and semi-implicit position integration, and validate stability over the allowed tuning ranges. The implementation uses the exact constant-force linear-damping velocity update to avoid explicit damping instability at tuning extremes. Maintain continuous yaw for interpolation; normalize only display headings. Turning must preserve existing world-space momentum rather than rotate velocity instantly.

Use zero water velocity during this sprint. Keep relative velocity as the drag calculation's explicit input so Sprint 2 can supply flow samples without changing the boat model. Do not add a flow-region framework yet.

Acceptance: forward/reverse input produces correctly signed propulsion; drag dissipates motion at zero input; steering creates angular acceleration and damping; turning allows lateral drift; all supported configurations remain finite during sustained input. Proposed initial tuning values are experimental and must be recorded after playtesting.

### 2. WASM contract and fixed-step runtime

Extend the typed snapshot and exports for both velocity components and yaw rate. Expose the authoritative fixed timestep from Rust; remove independently maintained step constants. Add an ABI version check and named state indices. Keep the existing batched stepping design until measurements justify a buffer interface.

Add an explicit validated configuration operation with success/failure reporting. Rust rejects non-finite/out-of-range values even when TypeScript validation is bypassed. Apply complete configuration atomically between stepping batches. Applying a preset resets state; normal restart preserves the selected configuration. Reject invalid step counts at the bridge boundary.

Extract stepping/input orchestration from scene construction into a small disposable game runtime. Preserve bounded catch-up and interpolate consecutive snapshots, including yaw. Keep simulation snapshots out of React's per-frame state updates.

Acceptance: reset clears every dynamic field; invalid configuration leaves the previous configuration intact; batches of identical fixed-step inputs give identical native results; startup reports ABI/configuration errors visibly.

### 3. Keyboard controls and chase camera

Extract keyboard handling into `apps/web/src/input`. Preserve W/S, A/D and R; opposite inputs cancel. Ignore gameplay keys while editing inputs, selects, textareas or contenteditable controls. Clear held input on blur and visibility loss; ignore repeated restart key events; prevent browser defaults only for handled gameplay controls.

Implement a camera controller separate from physics. Follow the interpolated boat with a heading-relative offset, look-ahead, and frame-rate-aware exponential smoothing. Snap the camera on reset and recover cleanly after focus changes.

Acceptance: tuning fields do not move the boat; lost focus cannot leave thrust held; turning and reversing remain readable; restart does not leave the camera chasing its former position. Camera comfort requires manual acceptance.

### 4. Tuning and diagnostics

Add an accessible development panel with bounded fields for BoatConfig, Apply, Restore defaults, Restart, and a debug toggle. Validate before applying and show useful field errors. No persistence is required in this sprint.

Render world velocity and forward direction as distinct labeled vectors. Display signed forward/lateral speed, yaw rate, physics step count, and sampled simulation/render timing. Reuse debug meshes and throttle React HUD updates; avoid creating a new mesh every frame. Enlarge or recenter the reference plane as needed to keep extended trials readable without modifying authoritative position.

Acceptance: users can change handling without editing Rust, tell heading apart from motion, and restore a known baseline. Diagnostics must state vector scale and units.

### 5. Verification and handoff

Rust tests: rest, forward/reverse thrust, longitudinal/lateral damping, angular acceleration/decay, momentum preservation during turning, invalid configuration/input, deterministic replay, and a ten-minute fixed-step stability run at supported parameter extremes. Check kinetic energy does not grow under drag-only conditions within numerical tolerance.

TypeScript/WASM tests: configuration validation, bridge ABI/snapshot mapping, input cancellation/focus behavior, timestep consumption, and reset. Replay a scripted per-tick input sequence through the real WASM bridge with synthetic 30/60/144 Hz render schedules; compare final position, velocity, yaw and yaw rate within 1e-6. This tests physics scheduling independently of wall-clock keyboard events. Test interpolation endpoints and heading continuity separately.

Playwright: load WASM, forward/reverse/turn, restart, apply tuning, reject invalid tuning, and ignore gameplay keys in fields. Retain page-error checks and use observed state rather than arbitrary timing sleeps.

Run `pnpm check`, `pnpm test:e2e`, `cargo fmt --check`, and `cargo clippy --all-targets -- -D warnings`. Record results and any limitations in a sprint validation note.

Manual checklist: straight acceleration, coast-down, braking into reverse, turns at rest/speed, lateral drift recovery, release steering, camera comfort, tuning comparisons, restart, focus loss/return. Record browser, hardware, resolution and frame/simulation timing for a representative run; do not infer the 60 FPS goal from software-rendered CI.

## Completion gate

Automated checks pass, the sandbox is reproducible and tunable, and the developer accepts that acceleration, braking, drift and turning feel responsive and understandable. If handling still feels wrong, iterate the tuning/model before proceeding to river currents. A stable build alone does not close Sprint 1.

Suggested reviewable increments: (1) Rust model and native tests, (2) WASM/runtime integration, (3) input and camera, (4) tuning/debug tools, (5) browser coverage and playtest handoff. Keep the application runnable between increments.
