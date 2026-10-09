//! Finite-hull contacts: an oriented capsule, not a point inside a visual mesh.
use crate::{
    boat::{BoatConfig, BoatState},
    river::Venue,
};
pub const HULL_RADIUS: f64 = 0.42;
pub const HALF_SEGMENT: f64 = 1.48;
const RESTITUTION: f64 = 0.12;
fn impulse(state: &mut BoatState, config: BoatConfig, nx: f64, nz: f64, rx: f64, rz: f64) {
    let lever = rz * nx - rx * nz;
    let normal_velocity = state.velocity_x * nx + state.velocity_z * nz + state.yaw_rate * lever;
    if normal_velocity >= 0.0 {
        return;
    }
    let j = -(1.0 + RESTITUTION) * normal_velocity
        / (1.0 / config.mass + lever * lever / config.yaw_inertia);
    state.velocity_x += nx * j / config.mass;
    state.velocity_z += nz * j / config.mass;
    state.yaw_rate += lever * j / config.yaw_inertia;
}
fn wall(state: &mut BoatState, config: BoatConfig, nx: f64, nz: f64) {
    let (sin, cos) = state.yaw.sin_cos();
    let endpoint = if sin * nx + cos * nz > 0.0 {
        -HALF_SEGMENT
    } else {
        HALF_SEGMENT
    };
    impulse(
        state,
        config,
        nx,
        nz,
        endpoint * sin - nx * HULL_RADIUS,
        endpoint * cos - nz * HULL_RADIUS,
    );
}
pub fn clearance(state: BoatState, x: f64, z: f64) -> (f64, f64, f64) {
    let (sin, cos) = state.yaw.sin_cos();
    let projection = ((x - state.x) * sin + (z - state.z) * cos).clamp(-HALF_SEGMENT, HALF_SEGMENT);
    let dx = state.x + projection * sin - x;
    let dz = state.z + projection * cos - z;
    (dx.hypot(dz), dx, dz)
}
pub fn resolve(state: &mut BoatState, config: BoatConfig, venue: &Venue) -> bool {
    let mut contacted = false;
    for _ in 0..8 {
        let mut corrected = false;
        let extent_x = HULL_RADIUS + HALF_SEGMENT * state.yaw.sin().abs();
        let extent_z = HULL_RADIUS + HALF_SEGMENT * state.yaw.cos().abs();
        if state.x < venue.min_x + extent_x {
            state.x = venue.min_x + extent_x;
            wall(state, config, 1.0, 0.0);
            corrected = true;
        }
        if state.x > venue.max_x - extent_x {
            state.x = venue.max_x - extent_x;
            wall(state, config, -1.0, 0.0);
            corrected = true;
        }
        if state.z < venue.min_z + extent_z {
            state.z = venue.min_z + extent_z;
            wall(state, config, 0.0, 1.0);
            corrected = true;
        }
        if state.z > venue.max_z - extent_z {
            state.z = venue.max_z - extent_z;
            wall(state, config, 0.0, -1.0);
            corrected = true;
        }
        for o in &venue.obstacles[..venue.obstacle_count] {
            let (distance, dx, dz) = clearance(*state, o.x, o.z);
            let min_distance = o.radius + HULL_RADIUS;
            if distance >= min_distance {
                continue;
            }
            let (nx, nz) = if distance > 1e-9 {
                (dx / distance, dz / distance)
            } else {
                (state.yaw.cos(), -state.yaw.sin())
            };
            let contact_x = o.x + dx - nx * HULL_RADIUS;
            let contact_z = o.z + dz - nz * HULL_RADIUS;
            impulse(
                state,
                config,
                nx,
                nz,
                contact_x - state.x,
                contact_z - state.z,
            );
            let penetration = min_distance - distance + 1e-7;
            state.x += nx * penetration;
            state.z += nz * penetration;
            corrected = true;
        }
        contacted |= corrected;
        if !corrected {
            break;
        }
    }
    contacted
}
