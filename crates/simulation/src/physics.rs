use crate::boat::{BoatConfig, BoatState};
use crate::{collision, river::Venue};
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
    step_forces(
        state,
        config,
        throttle,
        steering,
        water_velocity,
        [0.0, 0.0],
        0.0,
        0.0,
    );
}
#[allow(clippy::too_many_arguments)]
fn step_forces(
    state: &mut BoatState,
    config: BoatConfig,
    throttle: f64,
    steering: f64,
    water_velocity: [f64; 2],
    acceleration: [f64; 2],
    water_yaw_rate: f64,
    water_yaw_drag: f64,
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
    state.velocity_x = forward * sin + lateral * cos + water_velocity[0] + acceleration[0] * DT;
    state.velocity_z = forward * cos - lateral * sin + water_velocity[1] + acceleration[1] * DT;
    state.yaw_rate = damped_velocity(
        state.yaw_rate,
        steering * config.steering_torque + water_yaw_rate * water_yaw_drag,
        config.angular_damping + water_yaw_drag,
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
    pub venue: Option<Venue>,
    pub time: f64,
    pub contacts: u32,
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
        self.state = if let Some(v) = self.venue {
            BoatState {
                x: v.start_x,
                z: v.start_z,
                yaw: v.start_yaw,
                ..BoatState::default()
            }
        } else {
            BoatState::default()
        };
        self.previous = self.state;
        self.time = 0.0;
        self.contacts = 0;
    }
    pub fn configure_venue(&mut self, venue: Venue) -> bool {
        if !venue.valid() {
            return false;
        }
        self.venue = Some(venue);
        self.reset();
        true
    }
    pub fn advance(&mut self, steps: u32, throttle: f64, steering: f64) {
        for _ in 0..steps.min(30) {
            self.previous = self.state;
            if let Some(v) = self.venue {
                let water = v.sample(self.state.x, self.state.z, self.time);
                let (sin, cos) = self.state.yaw.sin_cos();
                let bow = v.sample(
                    self.state.x + sin * collision::HALF_SEGMENT,
                    self.state.z + cos * collision::HALF_SEGMENT,
                    self.time,
                );
                let stern = v.sample(
                    self.state.x - sin * collision::HALF_SEGMENT,
                    self.state.z - cos * collision::HALF_SEGMENT,
                    self.time,
                );
                let water_yaw_rate = ((bow.velocity_x - stern.velocity_x) * cos
                    - (bow.velocity_z - stern.velocity_z) * sin)
                    / (2.0 * collision::HALF_SEGMENT);
                let yaw_drag = self.config.lateral_drag * collision::HALF_SEGMENT.powi(2) * 0.15;
                step_forces(
                    &mut self.state,
                    self.config,
                    throttle,
                    steering,
                    [water.velocity_x, water.velocity_z],
                    [-9.81 * water.gradient_x, -9.81 * water.gradient_z],
                    water_yaw_rate,
                    yaw_drag,
                );
                // Integrate the updated velocities in small pose increments to avoid tunnelling.
                self.state.x = self.previous.x;
                self.state.z = self.previous.z;
                self.state.yaw = self.previous.yaw;
                let travel = (self.state.velocity_x.hypot(self.state.velocity_z)
                    + self.state.yaw_rate.abs() * collision::HALF_SEGMENT)
                    * DT;
                let segments = (travel / 0.12).ceil().clamp(1.0, 4096.0) as u32;
                let sub_dt = DT / f64::from(segments);
                let mut contact = false;
                for _ in 0..segments {
                    self.state.x += self.state.velocity_x * sub_dt;
                    self.state.z += self.state.velocity_z * sub_dt;
                    self.state.yaw += self.state.yaw_rate * sub_dt;
                    contact |= collision::resolve(&mut self.state, self.config, &v);
                }
                if contact {
                    self.contacts = self.contacts.saturating_add(1);
                }
            } else {
                step(&mut self.state, self.config, throttle, steering, [0.0, 0.0]);
            }
            self.time += DT;
        }
    }
}
