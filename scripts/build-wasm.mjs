import { cargo } from './cargo.mjs';
import { copyFileSync, mkdirSync } from 'node:fs';
cargo(['build', '-p', 'simulation', '--target', 'wasm32-unknown-unknown', '--release']);
mkdirSync('packages/wasm-bridge/dist', { recursive: true });
copyFileSync('target/wasm32-unknown-unknown/release/simulation.wasm', 'packages/wasm-bridge/dist/simulation.wasm');
