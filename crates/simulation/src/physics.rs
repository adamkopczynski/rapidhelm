use crate::boat::{BoatConfig, BoatState};
pub const DT: f64 = 1.0 / 120.0;

// Exact velocity update for constant force and linear drag during this step.
// This avoids explicit damping instability at the tuning range extremes.
fn damped_velocity(velocity: f64, force: f64, drag: f64, inertia: f64) -> f64 {
    if drag == 0.0 {
        return velocity + force / inertia * DT;
    }
    let decay = (-drag / inertia * DT).exp();
    velocity * decay + force / drag * (1.0 - decay)
}
fn input(value: f64) -> f64 {
    if value.is_finite() {
        value.clamp(-1.0, 1.0)
    } else {
        0.0
    }
}

/// Still-water stepping; `water_velocity` is an explicit future flow-sampling boundary.
pub fn step(
    state: &mut BoatState,
    config: BoatConfig,
    throttle: f64,
    steering: f64,
    water_velocity: [f64; 2],
) {
    let throttle = input(throttle);
    let steering = input(steering);
    let (sin, cos) = state.yaw.sin_cos();
    let relative_x = state.velocity_x - water_velocity[0];
    let relative_z = state.velocity_z - water_velocity[1];
    let forward = relative_x * sin + relative_z * cos;
    let lateral = relative_x * cos - relative_z * sin;
    let thrust = throttle
        * if throttle >= 0.0 {
            config.forward_thrust
        } else {
            config.reverse_thrust
        };
    let forward = damped_velocity(forward, thrust, config.forward_drag, config.mass);
    let lateral = damped_velocity(lateral, 0.0, config.lateral_drag, config.mass);
    state.velocity_x = forward * sin + lateral * cos + water_velocity[0];
    state.velocity_z = forward * cos - lateral * sin + water_velocity[1];
    state.yaw_rate = damped_velocity(
        state.yaw_rate,
        steering * config.steering_torque,
        config.angular_damping,
        config.yaw_inertia,
    );
    // Integrate position from updated velocities (semi-implicit position integration).
    state.x += state.velocity_x * DT;
    state.z += state.velocity_z * DT;
    state.yaw += state.yaw_rate * DT;
}

#[derive(Clone, Copy, Debug, Default)]
pub struct Simulation {
    pub state: BoatState,
    pub previous: BoatState,
    pub config: BoatConfig,
}
impl Simulation {
    pub fn configure(&mut self, config: BoatConfig) -> bool {
        if !config.valid() {
            return false;
        }
        self.config = config;
        self.reset();
        true
    }
    pub fn reset(&mut self) {
        self.state = BoatState::default();
        self.previous = self.state;
    }
    pub fn advance(&mut self, steps: u32, throttle: f64, steering: f64) {
        for _ in 0..steps.min(30) {
            self.previous = self.state;
            step(&mut self.state, self.config, throttle, steering, [0.0, 0.0]);
        }
    }
}
