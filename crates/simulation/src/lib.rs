//! Rust-owned 120 Hz planar boat simulation: meters, seconds, radians, +Z forward.
pub mod boat;
pub mod collision;
pub mod physics;
pub mod river;
#[cfg(test)]
mod river_tests;
#[cfg(test)]
mod tests;
mod wasm;
