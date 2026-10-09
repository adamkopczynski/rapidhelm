# Engineering guidance

Read README.md and docs/architecture/foundation.md before changing runtime boundaries.

- Keep authoritative boat dynamics in Rust. React handles UI; Babylon.js consumes simulation snapshots.
- Use meters, seconds, radians, +Y up and +Z downstream. Run simulation at a fixed 120 Hz and interpolate rendering.
- Keep parameters and content separate from simulation algorithms. Validate authored data with Zod.
- Implement small milestones from docs/kickoff.md; do not expand into season systems or production assets before core handling is validated.
- Run pnpm check for meaningful changes. Skip E2E/Playwright tests until the user asks to resume them; use the open development browser for interactive checks. Use cargo fmt and cargo clippy for Rust edits.
- Commit and push each completed milestone. Continue across sprint boundaries without stopping for approval when the work is within the active goal.
- Document limitations and distinguish automated verification from manual gameplay/performance testing.
- Generated WASM and build outputs are ignored; do not commit them. Rust edits require a rebuild and browser reload.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
