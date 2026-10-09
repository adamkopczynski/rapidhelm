use crate::{
    boat::{BoatConfig, BoatState},
    physics::{Simulation, step},
};
fn run(sim: &mut Simulation, steps: usize, throttle: f64, steering: f64) {
    for _ in 0..steps {
        sim.advance(1, throttle, steering);
    }
}
fn energy(s: BoatState, c: BoatConfig) -> f64 {
    0.5 * c.mass * (s.velocity_x.powi(2) + s.velocity_z.powi(2))
        + 0.5 * c.yaw_inertia * s.yaw_rate.powi(2)
}
#[test]
fn rest_remains_at_rest() {
    let mut s = Simulation::default();
    run(&mut s, 1200, 0.0, 0.0);
    assert_eq!(s.state, BoatState::default());
}
#[test]
fn thrust_and_braking() {
    let mut s = Simulation::default();
    run(&mut s, 120, 1.0, 0.0);
    assert!(s.state.velocity_z > 1.0 && s.state.z > 0.5);
    let speed = s.state.velocity_z;
    run(&mut s, 120, -1.0, 0.0);
    assert!(s.state.velocity_z < speed);
    run(&mut s, 1200, -1.0, 0.0);
    assert!(s.state.velocity_z < -1.0);
}
#[test]
fn anisotropic_drag_dissipates_energy() {
    let mut s = Simulation::default();
    s.state.velocity_x = 4.0;
    s.state.velocity_z = 4.0;
    s.state.yaw_rate = 1.0;
    for _ in 0..1200 {
        let before = energy(s.state, s.config);
        s.advance(1, 0.0, 0.0);
        assert!(energy(s.state, s.config) <= before + 1e-10);
    }
    let mut a = BoatState {
        velocity_x: 4.0,
        velocity_z: 4.0,
        ..BoatState::default()
    };
    step(&mut a, BoatConfig::default(), 0.0, 0.0, [0.0; 2]);
    assert!(a.velocity_x < a.velocity_z);
}
#[test]
fn steering_accelerates_and_decays() {
    let mut s = Simulation::default();
    run(&mut s, 120, 0.0, 1.0);
    assert!(s.state.yaw_rate > 0.0 && s.state.yaw > 0.0);
    let rate = s.state.yaw_rate;
    run(&mut s, 120, 0.0, 0.0);
    assert!(s.state.yaw_rate < rate);
    s.reset();
    run(&mut s, 120, 0.0, -1.0);
    assert!(s.state.yaw_rate < 0.0);
}
#[test]
fn turning_does_not_rotate_world_momentum() {
    let mut s = Simulation::default();
    s.config.forward_drag = 0.0;
    s.config.lateral_drag = 0.0;
    s.state.velocity_z = 3.0;
    run(&mut s, 120, 0.0, 1.0);
    assert!(s.state.yaw > 0.1);
    assert!(s.state.velocity_x.abs() < 1e-10);
    assert!((s.state.velocity_z - 3.0).abs() < 1e-10);
}
#[test]
fn water_relative_drag_boundary() {
    let mut s = BoatState {
        velocity_x: 1.0,
        velocity_z: 2.0,
        ..BoatState::default()
    };
    step(&mut s, BoatConfig::default(), 0.0, 0.0, [1.0, 2.0]);
    assert_eq!(s.velocity_x, 1.0);
    assert_eq!(s.velocity_z, 2.0);
}
#[test]
fn config_atomicity_and_reset() {
    let mut s = Simulation::default();
    run(&mut s, 120, 1.0, 1.0);
    let original = s;
    for invalid in [f64::NAN, f64::INFINITY, 0.0, -10.0, 1000.0] {
        let c = BoatConfig {
            mass: invalid,
            ..s.config
        };
        assert!(!s.configure(c));
        assert_eq!(s.state, original.state);
        assert_eq!(s.config, original.config);
    }
    let c = BoatConfig {
        mass: 100.0,
        ..s.config
    };
    assert!(s.configure(c));
    assert_eq!(s.state, BoatState::default());
    assert_eq!(s.previous, s.state);
    run(&mut s, 60, 1.0, 1.0);
    s.reset();
    assert_eq!(s.config, c);
    assert_eq!(s.state, BoatState::default());
    assert_eq!(s.previous, s.state);
}
#[test]
fn input_sanitizing_and_batch_equivalence() {
    let mut a = Simulation::default();
    a.advance(30, f64::NAN, f64::INFINITY);
    assert_eq!(a.state, BoatState::default());
    let mut b = a;
    for _ in 0..120 {
        a.advance(1, 0.8, 0.2);
    }
    for _ in 0..4 {
        b.advance(30, 0.8, 0.2);
    }
    assert_eq!(a.state, b.state);
    let mut c = Simulation::default();
    let mut d = c;
    c.advance(30, 9.0, -9.0);
    d.advance(30, 1.0, -1.0);
    assert_eq!(c.state, d.state);
}
#[test]
fn deterministic_scripted_replay() {
    let mut a = Simulation::default();
    let mut b = a;
    for tick in 0..2400 {
        let throttle = if tick % 300 < 200 { 0.8 } else { -0.2 };
        let steering = ((tick / 120) % 3) as f64 - 1.0;
        a.advance(1, throttle, steering);
        b.advance(1, throttle, steering);
    }
    assert_eq!(a.state, b.state);
}
#[test]
fn ten_minute_extreme_stability() {
    // All endpoints for mass/inertia and drag/damping, maximum driving forces.
    for mass in [40.0, 160.0] {
        for inertia in [10.0, 180.0] {
            for damping in [false, true] {
                let c = BoatConfig {
                    mass,
                    yaw_inertia: inertia,
                    forward_thrust: 800.0,
                    reverse_thrust: 600.0,
                    steering_torque: 400.0,
                    forward_drag: if damping { 500.0 } else { 0.0 },
                    lateral_drag: if damping { 2000.0 } else { 0.0 },
                    angular_damping: if damping { 300.0 } else { 0.0 },
                };
                let mut s = Simulation::default();
                assert!(s.configure(c));
                for tick in 0..72000 {
                    s.advance(
                        1,
                        if tick % 600 < 300 { 1.0 } else { -1.0 },
                        if tick % 1000 < 500 { 1.0 } else { -1.0 },
                    );
                    for v in [
                        s.state.x,
                        s.state.z,
                        s.state.yaw,
                        s.state.velocity_x,
                        s.state.velocity_z,
                        s.state.yaw_rate,
                    ] {
                        assert!(v.is_finite());
                    }
                }
            }
        }
    }
}
