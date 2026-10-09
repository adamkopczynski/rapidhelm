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
        if venue.bend_radius == 0.0
            && !venue.route.ready
            && venue.pocket_count == 0
            && venue.pool_length == 0.0
        {
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
        } else {
            // Sample the capsule spine at <= 0.185 m. Curvature allowance bounds
            // the intervening arc; substepping prevents crossing a bank unnoticed.
            let (sin, cos) = state.yaw.sin_cos();
            for i in 0..=16 {
                let d = HALF_SEGMENT * (f64::from(i) / 8.0 - 1.0);
                let px = state.x + d * sin;
                let pz = state.z + d * cos;
                let (offset, progress) = venue.project(px, pz);
                let (_, _, yaw) = venue.frame(offset, progress);
                let (ts, tc) = yaw.sin_cos();
                for side in [-1.0, 1.0] {
                    let edge = venue.edge(side, progress);
                    let penetration = side * (offset - edge) + HULL_RADIUS + 0.025;
                    if penetration > 0.0 {
                        let derivative = (venue.edge(side, progress + 0.01)
                            - venue.edge(side, progress - 0.01))
                            / 0.02;
                        let derivative = derivative / venue.metric(offset, progress);
                        let norm = (1.0 + derivative * derivative).sqrt();
                        let nx = side * (-tc + derivative * ts) / norm;
                        let nz = side * (ts + derivative * tc) / norm;
                        state.x += nx * penetration / norm;
                        state.z += nz * penetration / norm;
                        impulse(
                            state,
                            config,
                            nx,
                            nz,
                            d * sin - nx * HULL_RADIUS,
                            d * cos - nz * HULL_RADIUS,
                        );
                        corrected = true;
                    }
                }
                for (limit, dir) in [(venue.min_z, 1.0), (venue.max_z, -1.0)] {
                    let penetration = dir * (limit - progress) + HULL_RADIUS;
                    if penetration > 0.0 {
                        state.x += dir * ts * penetration;
                        state.z += dir * tc * penetration;
                        impulse(state, config, dir * ts, dir * tc, d * sin, d * cos);
                        corrected = true;
                    }
                }
            }
        }
        for o in &venue.obstacles[..venue.obstacle_count] {
            if o.submerged {
                continue;
            }
            let (ox, oz, oyaw) = venue.frame(o.x, o.z);
            if o.width > 0.0 {
                let (sin, cos) = state.yaw.sin_cos();
                let (bs, bc) = (oyaw + o.yaw).sin_cos();
                for i in 0..=24 {
                    let d = HALF_SEGMENT * (f64::from(i) / 12.0 - 1.0);
                    let px = state.x + d * sin - ox;
                    let pz = state.z + d * cos - oz;
                    let lx = px * bc - pz * bs;
                    let lz = px * bs + pz * bc;
                    let qx = lx.clamp(-o.width * 0.5, o.width * 0.5);
                    let qz = lz.clamp(-o.length * 0.5, o.length * 0.5);
                    let dx = lx - qx;
                    let dz = lz - qz;
                    let distance = dx.hypot(dz);
                    let (nx, nz, penetration) = if distance > 1e-9 {
                        (dx / distance, dz / distance, HULL_RADIUS + 0.015 - distance)
                    } else {
                        let ex = o.width * 0.5 - lx.abs();
                        let ez = o.length * 0.5 - lz.abs();
                        if ex < ez {
                            (
                                if lx >= 0.0 { 1.0 } else { -1.0 },
                                0.0,
                                HULL_RADIUS + ex + 0.015,
                            )
                        } else {
                            (
                                0.0,
                                if lz >= 0.0 { 1.0 } else { -1.0 },
                                HULL_RADIUS + ez + 0.015,
                            )
                        }
                    };
                    if penetration > 0.0 {
                        let wx = nx * bc + nz * bs;
                        let wz = -nx * bs + nz * bc;
                        state.x += wx * penetration;
                        state.z += wz * penetration;
                        impulse(
                            state,
                            config,
                            wx,
                            wz,
                            d * sin - wx * HULL_RADIUS,
                            d * cos - wz * HULL_RADIUS,
                        );
                        corrected = true;
                    }
                }
                continue;
            }
            let (distance, dx, dz) = clearance(*state, ox, oz);
            let min_distance = o.radius + HULL_RADIUS;
            if distance >= min_distance {
                continue;
            }
            let (nx, nz) = if distance > 1e-9 {
                (dx / distance, dz / distance)
            } else {
                (state.yaw.cos(), -state.yaw.sin())
            };
            let contact_x = ox + dx - nx * HULL_RADIUS;
            let contact_z = oz + dz - nz * HULL_RADIUS;
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
