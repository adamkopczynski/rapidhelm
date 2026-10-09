# Rapidhelm — Canoe Slalom

Browser-first canoe slalom game. Sprint 1 provides a tunable boat physics sandbox in a Babylon.js scene, driven by the real Rust/WASM simulation.

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
Use W/S to paddle/brake/reverse, A/D to apply steering torque, and R or the button to restart. Open Handling laboratory to edit thrust, drag, mass and turning parameters. Apply tuning resets the boat; restart keeps the selected parameters; Restore defaults applies the baseline preset. Editing fields and losing focus clear gameplay input.
After changing Rust, run `pnpm build` and reload the browser; Rust changes are not hot-reloaded.

## Verification

```sh
pnpm check                # TypeScript checks, Vitest, cargo test, production build
pnpm exec playwright install chromium  # once per machine
pnpm test:e2e             # browser startup, actual WASM movement, restart
```

`pnpm build` produces `apps/web/dist`, including the WASM asset. Preview with `pnpm --filter @rapidhelm/web exec vite preview`.

## Workspace

- `apps/web`: React, Vite, Babylon.js, Tailwind, Zustand and accessible Radix-based UI primitives using the shadcn/ui component pattern.
- `crates/simulation`: dependency-free Rust simulation with native tests and WASM exports.
- `packages/wasm-bridge`: typed loading and batched stepping boundary.
- `packages/content-schema`: Zod validation for versioned content; initial venue schema.
- `tests/e2e`: Playwright smoke test.
- [Architecture](docs/architecture/foundation.md), [physics model](docs/physics/boat-sandbox.md), [Sprint 1 validation](docs/development/sprint-1-validation.md), and [original project brief](docs/kickoff.md).

## Current scope

The sandbox models planar momentum, continuous thrust, body-relative linear drag, steering torque and angular damping. It includes a smoothed chase camera, live tuning, velocity/heading vectors and sampled CPU diagnostics. Water is still and geometry is placeholder; banks do not collide. Currents, gates, race rules, gamepad input and realistic water are pending. WebGL2 is the initial renderer. Gameplay quality and the 60 FPS target require interactive testing on target hardware.

[Sprint 1 plan](docs/development/sprint-1.md) is implemented, with manual handling acceptance pending. After that acceptance, Sprint 2 introduces river currents and eddies.

For a repeatable software-WebGL sample, start `pnpm dev` and run `node scripts/profile-sandbox.mjs`. Results go to `test-results/sprint-1-performance.json`; this is not a target-GPU benchmark.
