use crate::{
    boat::{BoatConfig, BoatState},
    collision::{self, HALF_SEGMENT, HULL_RADIUS},
    physics::Simulation,
    river::{FlowRegion, Obstacle, Venue},
};
fn training() -> Venue {
    let mut v = Venue::default();
    v.obstacles[0] = Obstacle {
        x: -4.0,
        z: 43.0,
        radius: 1.4,
        ..Obstacle::default()
    };
    v.obstacles[1] = Obstacle {
        x: 3.5,
        z: 55.0,
        radius: 1.2,
        ..Obstacle::default()
    };
    v.obstacle_count = 2;
    v.regions[0] = FlowRegion {
        x: 7.0,
        z: 67.0,
        radius_x: 2.8,
        radius_z: 11.0,
        velocity_x: 0.0,
        velocity_z: -2.0,
        swirl: 0.8,
    };
    v.region_count = 1;
    assert!(v.valid());
    v
}
fn run(sim: &mut Simulation, n: usize, throttle: f64, steer: f64) {
    for _ in 0..n {
        sim.advance(1, throttle, steer);
    }
}
fn assert_clear(s: BoatState, v: Venue) {
    let ex = HULL_RADIUS + HALF_SEGMENT * s.yaw.sin().abs();
    let ez = HULL_RADIUS + HALF_SEGMENT * s.yaw.cos().abs();
    assert!(
        s.x - ex >= v.min_x - 1e-6 && s.x + ex <= v.max_x + 1e-6,
        "hull X outside: {s:?}"
    );
    assert!(
        s.z - ez >= v.min_z - 1e-6 && s.z + ez <= v.max_z + 1e-6,
        "hull Z outside: {s:?}"
    );
    for o in &v.obstacles[..v.obstacle_count] {
        assert!(
            collision::clearance(s, o.x, o.z).0 >= o.radius + HULL_RADIUS - 1e-6,
            "hull penetrated obstacle: {s:?}"
        );
    }
}
#[test]
fn start_pool_is_flat_and_stationary_then_flow_ramps() {
    let v = training();
    let mut s = Simulation::default();
    assert!(s.configure_venue(v));
    run(&mut s, 1200, 0.0, 0.0);
    assert_eq!(s.state.z, 5.0);
    let start = v.sample(0.0, 5.0, 5.0);
    assert_eq!(start.height, 0.0);
    assert_eq!(start.wave_strength, 0.0);
    assert_eq!(start.velocity_z, 0.0);
    for z in 10..40 {
        let w = v.sample(0.0, f64::from(z), 0.0);
        assert!(w.velocity_z.is_finite());
    }
    assert!(v.sample(0.0, 24.0, 0.0).velocity_z > v.sample(0.0, 16.0, 0.0).velocity_z);
    run(&mut s, 1800, 1.0, 0.0);
    assert!(s.state.z > 32.0);
    assert_clear(s.state, v);
}
#[test]
fn current_drifts_boat_and_banks_are_slower() {
    let v = Venue {
        wave_amplitude: 0.0,
        slope: 0.0,
        ..Venue::default()
    };
    let mut s = Simulation::default();
    s.configure_venue(v);
    s.state.z = 40.0;
    run(&mut s, 240, 0.0, 0.0);
    assert!(s.state.velocity_z > 1.0 && s.state.z > 40.0);
    assert!(v.sample(9.0, 40.0, 0.0).velocity_z < v.sample(0.0, 40.0, 0.0).velocity_z);
}
#[test]
fn upstream_eddy_reverses_drift_and_transitions_are_continuous() {
    let mut v = training();
    v.wave_amplitude = 0.0;
    v.slope = 0.0;
    assert!(v.sample(7.0, 67.0, 0.0).velocity_z < -1.0);
    let mut s = Simulation::default();
    s.configure_venue(v);
    s.state.x = 7.0;
    s.state.z = 67.0;
    run(&mut s, 240, 0.0, 0.0);
    assert!(s.state.z < 67.0 && s.state.velocity_z < -0.5);
    for i in 0..1000 {
        let x = 3.0 + f64::from(i) * 0.006;
        let a = v.sample(x, 67.0, 0.0);
        let b = v.sample(x + 1e-5, 67.0, 0.0);
        assert!((a.velocity_z - b.velocity_z).abs() < 1e-3);
    }
}
#[test]
fn wave_gradients_match_surface_and_change_boat_motion() {
    let mut v = Venue {
        slope: 0.0,
        ..Venue::default()
    };
    let a = v.sample(1.3, 49.0, 2.0);
    let eps = 1e-5;
    assert!(
        (a.gradient_x
            - (v.sample(1.3 + eps, 49.0, 2.0).height - v.sample(1.3 - eps, 49.0, 2.0).height)
                / (2.0 * eps))
            .abs()
            < 1e-6
    );
    assert!(
        (a.gradient_z
            - (v.sample(1.3, 49.0 + eps, 2.0).height - v.sample(1.3, 49.0 - eps, 2.0).height)
                / (2.0 * eps))
            .abs()
            < 1e-6
    );
    let mut waves = Simulation::default();
    waves.configure_venue(v);
    waves.state.z = 49.0;
    v.wave_amplitude = 0.0;
    let mut flat = Simulation::default();
    flat.configure_venue(v);
    flat.state.z = 49.0;
    run(&mut waves, 360, 0.0, 0.0);
    run(&mut flat, 360, 0.0, 0.0);
    assert!((waves.state.x - flat.state.x).abs() + (waves.state.z - flat.state.z).abs() > 0.05);
}
#[test]
fn rocks_deflect_flow_and_stop_a_fast_hull_without_tunnelling() {
    let v = training();
    let left = v.sample(-5.5, 41.0, 0.0);
    let right = v.sample(-2.5, 41.0, 0.0);
    assert!(left.velocity_x < 0.0 && right.velocity_x > 0.0);
    let mut s = Simulation::default();
    s.configure_venue(v);
    s.state.x = -4.0;
    s.state.z = 35.0;
    s.state.velocity_z = 1000.0;
    s.advance(1, 0.0, 0.0);
    assert_clear(s.state, v);
    assert!(s.state.z < 43.0);
    assert!(s.contacts > 0);
}
#[test]
fn full_capsule_stays_inside_all_four_walls_at_every_heading() {
    let v = training();
    for angle in 0..36 {
        for (x, z, vx, vz) in [
            (-9.0, 20.0, -50.0, 0.0),
            (9.0, 20.0, 50.0, 0.0),
            (0.0, 1.0, 0.0, -50.0),
            (0.0, 179.0, 0.0, 50.0),
        ] {
            let mut s = Simulation::default();
            s.configure_venue(v);
            s.state = BoatState {
                x,
                z,
                yaw: f64::from(angle) * std::f64::consts::TAU / 36.0,
                velocity_x: vx,
                velocity_z: vz,
                yaw_rate: 2.0,
            };
            run(&mut s, 120, 1.0, 1.0);
            assert_clear(s.state, v);
        }
    }
}
#[test]
fn long_river_replay_remains_finite_and_clear_with_extreme_tuning() {
    let v = training();
    for extreme in [false, true] {
        let mut a = Simulation::default();
        a.configure_venue(v);
        if extreme {
            a.configure(BoatConfig {
                mass: 40.0,
                yaw_inertia: 10.0,
                forward_thrust: 800.0,
                reverse_thrust: 600.0,
                steering_torque: 400.0,
                forward_drag: 0.0,
                lateral_drag: 0.0,
                angular_damping: 0.0,
            });
        }
        let mut b = a;
        for tick in 0..24000 {
            let throttle = if tick % 1000 < 750 { 1.0 } else { -1.0 };
            let steer = ((tick / 240) % 3) as f64 - 1.0;
            a.advance(1, throttle, steer);
            b.advance(1, throttle, steer);
            assert_eq!(a.state, b.state);
            assert_clear(a.state, v);
            assert!(
                [
                    a.state.x,
                    a.state.z,
                    a.state.yaw,
                    a.state.velocity_x,
                    a.state.velocity_z,
                    a.state.yaw_rate
                ]
                .iter()
                .all(|v| v.is_finite())
            );
        }
    }
}
#[test]
fn invalid_venue_is_atomic_and_reset_returns_to_start() {
    let v = training();
    let mut s = Simulation::default();
    s.configure_venue(v);
    run(&mut s, 200, 1.0, 0.0);
    let before = s.state;
    let mut invalid = v;
    invalid.start_z = 90.0;
    assert!(!s.configure_venue(invalid));
    assert_eq!(s.state, before);
    invalid = v;
    invalid.wave_amplitude = f64::NAN;
    assert!(!s.configure_venue(invalid));
    s.reset();
    assert_eq!(s.state.z, v.start_z);
    assert_eq!(s.time, 0.0);
    assert_eq!(s.contacts, 0);
    assert_eq!(s.previous, s.state);
}

fn paris_geometry() -> Venue {
    Venue {
        min_x: -7.0,
        max_x: 7.0,
        max_z: 300.0,
        bend_radius: 30.0,
        slope: 4.5 / 277.0,
        ..Venue::default()
    }
}
#[test]
fn curved_map_roundtrips_and_rotates_flow() {
    let v = paris_geometry();
    assert!(v.valid());
    for progress in [0.0, 55.0, 103.0, 125.0, 150.0, 180.0, 210.0, 299.0] {
        for offset in [-7.0, 0.0, 7.0] {
            let (x, z, yaw) = v.frame(offset, progress);
            let (a, b) = v.project(x, z);
            assert!((a - offset).abs() < 1e-9 && (b - progress).abs() < 1e-9);
            let w = v.sample(x, z, 3.0);
            // Far from authored eddies, flow follows the tangent even on return leg.
            assert!((w.velocity_x * yaw.cos() - w.velocity_z * yaw.sin()).abs() < 1e-9);
        }
    }
    assert!((v.base_height(300.0) + 4.5).abs() < 1e-10);
    let (x, z, _) = v.frame(2.0, 150.0);
    let w = v.sample(x, z, 3.0);
    let eps = 1e-5;
    assert!(
        ((v.sample(x + eps, z, 3.0).height - v.sample(x - eps, z, 3.0).height) / (2.0 * eps)
            - w.gradient_x)
            .abs()
            < 1e-6
    );
    assert!(
        ((v.sample(x, z + eps, 3.0).height - v.sample(x, z - eps, 3.0).height) / (2.0 * eps)
            - w.gradient_z)
            .abs()
            < 1e-6
    );
}
#[test]
fn curved_capsule_contacts_hold_at_every_heading() {
    let v = paris_geometry();
    for progress in [5.0, 100.0, 120.0, 150.0, 180.0, 205.0, 295.0] {
        for heading in 0..32 {
            let (x, z, _) = v.frame(6.9, progress);
            let mut state = BoatState {
                x,
                z,
                yaw: f64::from(heading) * std::f64::consts::TAU / 32.0,
                ..BoatState::default()
            };
            crate::collision::resolve(&mut state, BoatConfig::default(), &v);
            for i in 0..=100 {
                let d = HALF_SEGMENT * (f64::from(i) / 50.0 - 1.0);
                let (a, b) =
                    v.project(state.x + d * state.yaw.sin(), state.z + d * state.yaw.cos());
                assert!(
                    a.abs() + HULL_RADIUS <= 7.0 + 1e-6,
                    "{progress} {heading} {a} {b}"
                );
            }
        }
    }
}

#[test]
fn rectangular_baffles_resolve_faces_corners_and_fast_approaches() {
    let mut v = Venue::default();
    v.obstacles[0] = Obstacle {
        x: 0.0,
        z: 40.0,
        width: 4.0,
        length: 1.2,
        yaw: 0.2,
        radius: 2.0_f64.hypot(0.6),
    };
    v.obstacle_count = 1;
    let assert_block_clear = |s: BoatState| {
        for i in 0..=100 {
            let d = HALF_SEGMENT * (f64::from(i) / 50.0 - 1.0);
            let dx = s.x + d * s.yaw.sin();
            let dz = s.z + d * s.yaw.cos() - 40.0;
            let x = dx * 0.2_f64.cos() - dz * 0.2_f64.sin();
            let z = dx * 0.2_f64.sin() + dz * 0.2_f64.cos();
            assert!((x.abs() - 2.0).max(0.0).hypot((z.abs() - 0.6).max(0.0)) >= HULL_RADIUS - 1e-6);
        }
    };
    for heading in 0..32 {
        let mut s = BoatState {
            x: 2.2,
            z: 40.0,
            yaw: f64::from(heading) * std::f64::consts::TAU / 32.0,
            ..BoatState::default()
        };
        collision::resolve(&mut s, BoatConfig::default(), &v);
        assert_block_clear(s);
    }
    let mut sim = Simulation::default();
    assert!(sim.configure_venue(v));
    sim.state = BoatState {
        x: 0.0,
        z: 32.0,
        velocity_z: 1000.0,
        ..BoatState::default()
    };
    sim.advance(3, 0.0, 0.0);
    assert!(sim.contacts > 0);
    assert_block_clear(sim.state);
}
#[test]
fn spline_route_roundtrips_offsets_and_rejects_a_folded_course() {
    use crate::channel::{Point, Route};
    let mut route = Route::default();
    for (x, z) in [
        (62.0, 0.0),
        (66.0, 35.0),
        (75.0, 62.0),
        (69.0, 88.0),
        (42.0, 102.0),
        (12.0, 96.0),
        (-8.0, 78.0),
        (-13.0, 44.0),
        (-9.0, 14.0),
        (6.0, -4.0),
    ] {
        route.points[route.count] = Point { x, z };
        route.count += 1;
    }
    assert!(route.prepare(300.0));
    assert!(route.valid_width(11.0));
    for s in [0.0, 5.0, 40.0, 98.0, 150.0, 210.0, 290.0, 300.0] {
        for offset in [-8.0, 0.0, 8.0] {
            let (x, z, _) = route.frame(offset, s);
            let (a, b) = route.project(x, z);
            assert!(
                (offset - a).abs() < 1e-6 && (s - b).abs() < 1e-6,
                "{offset} {s} {a} {b}"
            );
        }
    }
    route.points[5] = route.points[1];
    assert!(route.prepare(300.0));
    assert!(!route.valid_width(11.0));
}
