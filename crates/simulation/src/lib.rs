//! Rust-owned 120 Hz planar boat simulation: meters, seconds, radians, +Z forward.
pub mod boat;
pub mod physics;
#[cfg(test)]
mod tests;
mod wasm;
