# Engineering guidance

Read README.md and docs/architecture/foundation.md before changing runtime boundaries.

- Keep authoritative boat dynamics in Rust. React handles UI; Babylon.js consumes simulation snapshots.
- Use meters, seconds, radians, +Y up and +Z downstream. Run simulation at a fixed 120 Hz and interpolate rendering.
- Keep parameters and content separate from simulation algorithms. Validate authored data with Zod.
- Implement small milestones from docs/kickoff.md; do not expand into season systems or production assets before core handling is validated.
- Run pnpm check for meaningful changes and pnpm test:e2e for browser/runtime changes. Use cargo fmt and cargo clippy for Rust edits.
- Document limitations and distinguish automated verification from manual gameplay/performance testing.
- Generated WASM and build outputs are ignored; do not commit them. Rust edits require a rebuild and browser reload.
