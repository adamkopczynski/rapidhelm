# Rapidhelm — Canoe Slalom

Browser-first canoe slalom game. Sprint 0 provides a controllable placeholder kayak in a Babylon.js scene, driven by the real Rust/WASM simulation.

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
Use W/S to paddle/reverse, A/D to turn, and R or the button to restart.
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
- [Architecture](docs/architecture/foundation.md) and [original project brief](docs/kickoff.md).

## Current scope

This is a foundation sandbox: still water, placeholder boat, basic propulsion and turning, chase camera, restart, fixed-step updates and render interpolation. It does not yet model hydrodynamics, currents, collisions, gates, race rules, gamepad input or realistic water. WebGL2 is the initial renderer; WebGPU negotiation is deferred. Gameplay quality and the 60 FPS target require interactive testing on target hardware.

Next milestone: Sprint 1 boat dynamics and configurable tuning before river currents and whitewater visuals.
