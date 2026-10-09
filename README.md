# Rapidhelm — Canoe Slalom

Browser-first canoe slalom game. The training venue provides a bounded river with moving water, upstream eddies, waves and solid obstacles in a Babylon.js scene, driven by the real Rust/WASM simulation.

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
Use W/S to paddle/brake/reverse, A/D to apply steering torque, and R or Return to start pool to restart. The calm pool starts at 5 m; flow builds from 14–32 m, waves begin at 34 m, and upstream eddies are centered at 67 m on the right and 105 m on the left. Open Handling laboratory to edit thrust, drag, mass and turning parameters. Apply tuning resets the boat; restart keeps the selected parameters; Restore defaults applies the baseline preset. Editing fields and losing focus clear gameplay input.
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
- [Architecture](docs/architecture/foundation.md), [boat model](docs/physics/boat-sandbox.md), [river dynamics](docs/physics/river-venue.md), [river validation](docs/development/river-venue-validation.md), [Sprint 1 validation](docs/development/sprint-1-validation.md), and [original project brief](docs/kickoff.md).

## Current scope

The Rust simulation owns planar momentum, water-relative drag, steering torque, angular response to flow shear, deterministic wave-gradient forces and full-hull wall/rock contacts. The versioned venue provides a calm, flat start pool, a downstream flow ramp, five rocks and two upstream eddies. Water height, normals, foam motion and debug flow arrows use the same Rust field as the dynamics. The boat visually follows wave height and slope; buoyancy is not yet a full 3D rigid-body model.

Live tuning, a smoothed chase camera, flow/wave/contact telemetry and sampled CPU diagnostics are available. The complete hull is kept within the 180 m venue, including the upstream and downstream end walls. Gates, race rules, gamepad input and finished water/character art remain future work. WebGL2 is the initial renderer.

Completed milestones are committed and pushed automatically. Work continues across sprint boundaries within the active goal. E2E/Playwright tests and the Playwright-based profiler remain paused until requested; native Rust and actual-WASM unit tests, type checks, builds and interactive browser inspection continue.
