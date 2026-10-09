# Rapidhelm — Canoe Slalom

Browser-first canoe slalom game. The initial Vaires-sur-Marne venue study provides a curved, bounded river with moving water, upstream eddies, waves and solid obstacles in a Babylon.js scene, driven by the real Rust/WASM simulation.

## Requirements

- Node.js 22.12+ (Node 24 LTS recommended), pnpm 11.15.1.
- Rust stable and the WASM target: `rustup target add wasm32-unknown-unknown`.
- Desktop browser with WebGL2.

The build scripts also locate Cargo under `~/.cargo/bin` when it is absent from PATH.

## Start

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:5173. Turborepo compiles WASM before starting Vite.
Use W/S to paddle/brake/reverse, A/D to apply steering torque, and R or Return to start pool to restart. The calm pool starts at 5 m; flow builds from 14–32 m, the first localized drop begins at 34 m, and six upstream eddies sit in widened bank pockets along the 300 m asymmetric horseshoe. Toggle Venue overview to inspect the layout and return to Chase camera to paddle. Twenty numbered gates are practice targets. Their 1.8 m poles hang 20 cm above the local surge envelope. Open Handling laboratory to edit thrust, drag, mass and turning parameters. Apply tuning resets the boat; restart keeps the selected parameters; Restore defaults applies the baseline preset. Editing fields and losing focus clear gameplay input.
After changing Rust, run `pnpm build` and reload the browser; Rust changes are not hot-reloaded.

## Verification

```sh
pnpm check                # TypeScript checks, Vitest, cargo test, production build
# E2E/Playwright is paused by session instruction.
# Browser verification uses the open development app.
```

`pnpm build` produces `apps/web/dist`, including the WASM asset. Preview with `pnpm --filter @rapidhelm/web exec vite preview`.

## Workspace

- `apps/web`: React, Vite, Babylon.js, Tailwind, Zustand and accessible Radix-based UI primitives using the shadcn/ui component pattern.
- `crates/simulation`: dependency-free Rust simulation with native tests and WASM exports.
- `packages/wasm-bridge`: typed loading and batched stepping boundary.
- `packages/content-schema`: Zod validation for versioned content; initial venue schema.
- `tests/e2e`: Playwright smoke test.
- [Architecture](docs/architecture/foundation.md), [boat model](docs/physics/boat-sandbox.md), [river dynamics](docs/physics/river-venue.md), [river validation](docs/development/river-venue-validation.md), [Paris venue model](docs/physics/paris-venue.md), [Paris validation](docs/development/paris-venue-validation.md), [Sprint 1 validation](docs/development/sprint-1-validation.md), and [original project brief](docs/kickoff.md).

## Current scope

The Rust simulation owns planar momentum, water-relative drag, steering torque, angular response to flow shear, deterministic wave-gradient forces and full-hull wall/rock contacts. The versioned venue provides a calm, flat start pool, a downstream flow ramp, eleven rectangular blue modular baffles, six reverse eddies, nine drop jets and six wider bank pockets. Water height, normals, foam motion and debug flow arrows use the same Rust field as the dynamics. The boat visually follows wave height and slope; buoyancy is not yet a full 3D rigid-body model.

Live tuning, a smoothed chase camera, flow/wave/contact telemetry and sampled CPU diagnostics are available. Rust maps the 300 m centreline, currents and contacts into world space, including the bend and return leg. Rounded start/finish pools sit at +4.5 m and 0 m, connected by nine localized drops. Standing crests and foam cluster around drops and baffles; Paris no longer uses ocean-like travelling waves. The assumed baseline section uses 14 m³/s / (16 m × 0.8 m) = 1.09375 m/s; authored jets and eddies are not a hydraulically calibrated solution. The original 180 m straight training channel is retained as a regression fixture. Gates are visual targets; judging, race rules, gamepad input and finished water/character art remain future work. WebGL2 is the initial renderer.

Completed milestones are committed and pushed automatically. Work continues across sprint boundaries within the active goal. E2E/Playwright tests and the Playwright-based profiler remain paused until requested; native Rust and actual-WASM unit tests, type checks, builds and interactive browser inspection continue.
