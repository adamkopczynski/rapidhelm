use crate::boat::{BoatConfig, BoatState};
use crate::physics::{DT, Simulation};
// Synchronous non-reentrant calls, one instance per browser runtime.
static mut SIM: Simulation = Simulation {
    state: BoatState {
        x: 0.0,
        z: 0.0,
        yaw: 0.0,
        velocity_x: 0.0,
        velocity_z: 0.0,
        yaw_rate: 0.0,
    },
    previous: BoatState {
        x: 0.0,
        z: 0.0,
        yaw: 0.0,
        velocity_x: 0.0,
        velocity_z: 0.0,
        yaw_rate: 0.0,
    },
    config: BoatConfig::DEFAULT,
};
#[unsafe(no_mangle)]
pub extern "C" fn abi_version() -> u32 {
    2
}
#[unsafe(no_mangle)]
pub extern "C" fn timestep() -> f64 {
    DT
}
#[unsafe(no_mangle)]
pub extern "C" fn reset() {
    unsafe {
        let mut sim = SIM;
        sim.reset();
        SIM = sim;
    }
}
#[unsafe(no_mangle)]
pub extern "C" fn configure(
    mass: f64,
    yaw_inertia: f64,
    forward_thrust: f64,
    reverse_thrust: f64,
    steering_torque: f64,
    forward_drag: f64,
    lateral_drag: f64,
    angular_damping: f64,
) -> u32 {
    let config = BoatConfig {
        mass,
        yaw_inertia,
        forward_thrust,
        reverse_thrust,
        steering_torque,
        forward_drag,
        lateral_drag,
        angular_damping,
    };
    unsafe {
        let mut sim = SIM;
        let success = sim.configure(config);
        SIM = sim;
        u32::from(success)
    }
}
#[unsafe(no_mangle)]
pub extern "C" fn advance(steps: u32, throttle: f64, steering: f64) {
    unsafe {
        let mut sim = SIM;
        sim.advance(steps, throttle, steering);
        SIM = sim;
    }
}
/// 0..5 current X/Z/yaw/VX/VZ/yaw-rate, 6..11 previous state in the same order.
#[unsafe(no_mangle)]
pub extern "C" fn state(index: u32) -> f64 {
    unsafe {
        let s = if index < 6 { SIM.state } else { SIM.previous };
        match index % 6 {
            0 => s.x,
            1 => s.z,
            2 => s.yaw,
            3 => s.velocity_x,
            4 => s.velocity_z,
            5 => s.yaw_rate,
            _ => unreachable!(),
        }
    }
}
