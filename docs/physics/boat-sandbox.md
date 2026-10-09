# Boat sandbox model

The model is an experimental game-handling baseline, not calibrated athlete biomechanics. State is planar X/Z position, world VX/VZ, continuous yaw and yaw rate. The coordinate convention is +Y up, +Z forward at yaw zero, positive yaw toward +X; units are meters, seconds and radians.

The versioned authored baseline is `content/boats/k1-sandbox.json`. Rust has a fallback config for native use; the real-WASM test verifies that the authored baseline produces the same first step. Both Zod and Rust enforce the supported parameter bounds. Runtime tuning is applied atomically and resets state. Restart preserves tuning; Restore defaults reapplies the authored baseline.

## Force and integration model

At each 120 Hz step, project water-relative world velocity onto heading-aligned forward and right axes. The relative velocity input is explicit, but the sandbox always supplies zero water velocity. Longitudinal and lateral drag oppose their respective velocity components; steering applies torque about Y. Steering does not rotate existing world velocity directly.

For one component with linear damping coefficient `c`, inertia/mass `m`, and constant applied force `F` over timestep `dt`, update:

```text
decay = exp(-c * dt / m)
v_next = v * decay + (F / c) * (1 - decay)
```

For zero damping, use `v_next = v + F * dt / m`. Apply the same form to angular velocity with yaw inertia and torque. Reconstruct world velocity from the body axes and integrate position/yaw from the updated velocities. This treats the body's orientation as fixed during the velocity substep; it is not a full exact integration of coupled turning motion. Exponential damping keeps the exposed ranges stable without arbitrary velocity clamps. Zero-drag settings intentionally permit indefinite acceleration.

Forward/reverse controls are continuous thrust with separate strengths, and A/D produce continuous torque even at rest. S first brakes forward travel, then drives reverse. Opposing keys cancel. Animated paddle impulses and sweep-stroke force application are deferred.

## Baseline and tuning

| Parameter | Baseline | Supported range | Unit |
| --- | ---: | ---: | --- |
| Mass | 90 | 40–160 | kg |
| Yaw inertia | 65 | 10–180 | kg m² |
| Forward thrust | 240 | 0–800 | N |
| Reverse thrust | 180 | 0–600 | N |
| Steering torque | 100 | 0–400 | N m |
| Forward drag | 45 | 0–500 | N/(m/s) |
| Lateral drag | 220 | 0–2000 | N/(m/s) |
| Angular damping | 85 | 0–300 | N m/(rad/s) |

Reduce lateral drag to inspect drift. Increase angular damping to reduce rotation after releasing steering. Thrust/drag ratios determine straight-line equilibrium speeds when drag is nonzero; all values need playtesting before gameplay acceptance.

Velocity is drawn in cyan at one world meter per meter/second. Heading is amber with fixed two-meter length. The camera follows the interpolated heading with exponential smoothing and snaps on restart. UI diagnostics sample roughly every 100 ms and report CPU simulation plus WASM boundary time, render submission time and frame interval. Render submission is not GPU completion. React never drives authoritative physics.
