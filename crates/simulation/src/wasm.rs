use crate::{
    boat::BoatConfig,
    physics::{DT, Simulation},
    river::{Drop, FlowRegion, MAX_FEATURES, Obstacle, Pocket, Venue, WaterSample},
};
use std::cell::RefCell;
const MAX_GRID: usize = 4096;
thread_local! {
    static SIM: RefCell<Simulation> = RefCell::new(Simulation::default());
    static STAGED: RefCell<Option<Venue>> = const { RefCell::new(None) };
    static SAMPLE: RefCell<[f64; 8]> = const { RefCell::new([0.0; 8]) };
    static FRAME: RefCell<[f64; 3]> = const { RefCell::new([0.0;3]) };
    static GRID: RefCell<[f32; MAX_GRID * 7]> = const { RefCell::new([0.0; MAX_GRID * 7]) };
}
#[unsafe(no_mangle)]
pub extern "C" fn abi_version() -> u32 {
    5
}
#[unsafe(no_mangle)]
pub extern "C" fn timestep() -> f64 {
    DT
}
#[unsafe(no_mangle)]
pub extern "C" fn simulation_time() -> f64 {
    SIM.with_borrow(|s| s.time)
}
#[unsafe(no_mangle)]
pub extern "C" fn contact_count() -> u32 {
    SIM.with_borrow(|s| s.contacts)
}
#[unsafe(no_mangle)]
pub extern "C" fn reset() {
    SIM.with_borrow_mut(|s| s.reset());
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
    SIM.with_borrow_mut(|s| {
        u32::from(s.configure(BoatConfig {
            mass,
            yaw_inertia,
            forward_thrust,
            reverse_thrust,
            steering_torque,
            forward_drag,
            lateral_drag,
            angular_damping,
        }))
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn advance(steps: u32, throttle: f64, steering: f64) {
    SIM.with_borrow_mut(|s| s.advance(steps, throttle, steering));
}
#[unsafe(no_mangle)]
pub extern "C" fn state(index: u32) -> f64 {
    if index >= 12 {
        return f64::NAN;
    }
    SIM.with_borrow(|sim| {
        let s = if index < 6 { sim.state } else { sim.previous };
        match index % 6 {
            0 => s.x,
            1 => s.z,
            2 => s.yaw,
            3 => s.velocity_x,
            4 => s.velocity_z,
            5 => s.yaw_rate,
            _ => unreachable!(),
        }
    })
}
/// Staged updates are atomic: a failed venue never replaces the active one.
#[unsafe(no_mangle)]
pub extern "C" fn venue_begin(
    min_x: f64,
    max_x: f64,
    min_z: f64,
    max_z: f64,
    start_x: f64,
    start_z: f64,
    start_yaw: f64,
    current_speed: f64,
    flow_start: f64,
    flow_ramp: f64,
    wave_start: f64,
    wave_amplitude: f64,
    wave_length: f64,
    wave_frequency: f64,
    slope: f64,
    depth: f64,
) -> u32 {
    let v = Venue {
        min_x,
        max_x,
        min_z,
        max_z,
        start_x,
        start_z,
        start_yaw,
        current_speed,
        flow_start,
        flow_ramp,
        wave_start,
        wave_amplitude,
        wave_length,
        wave_frequency,
        slope,
        depth,
        ..Venue::default()
    };
    STAGED.with_borrow_mut(|staged| {
        *staged = if v.valid() { Some(v) } else { None };
        u32::from(staged.is_some())
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn venue_obstacle(x: f64, z: f64, radius: f64) -> u32 {
    STAGED.with_borrow_mut(|staged| {
        if let Some(v) = staged
            && v.obstacle_count < MAX_FEATURES
        {
            v.obstacles[v.obstacle_count] = Obstacle {
                x,
                z,
                radius,
                ..Obstacle::default()
            };
            v.obstacle_count += 1;
            if v.valid() {
                return 1;
            }
        }
        *staged = None;
        0
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn venue_region(
    x: f64,
    z: f64,
    radius_x: f64,
    radius_z: f64,
    velocity_x: f64,
    velocity_z: f64,
    swirl: f64,
) -> u32 {
    STAGED.with_borrow_mut(|staged| {
        if let Some(v) = staged
            && v.region_count < MAX_FEATURES
        {
            v.regions[v.region_count] = FlowRegion {
                x,
                z,
                radius_x,
                radius_z,
                velocity_x,
                velocity_z,
                swirl,
            };
            v.region_count += 1;
            if v.valid() {
                return 1;
            }
        }
        *staged = None;
        0
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn venue_commit() -> u32 {
    STAGED.with_borrow_mut(|staged| {
        staged.take().map_or(0, |v| {
            SIM.with_borrow_mut(|s| u32::from(s.configure_venue(v)))
        })
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn water_sample(x: f64, z: f64, time: f64) -> u32 {
    if ![x, z, time].iter().all(|v| v.is_finite()) {
        return 0;
    }
    let w = SIM.with_borrow(|s| {
        s.venue
            .as_ref()
            .map_or(WaterSample::default(), |v| v.sample(x, z, time))
    });
    SAMPLE.with_borrow_mut(|sample| {
        *sample = [
            w.velocity_x,
            w.velocity_z,
            w.height,
            w.gradient_x,
            w.gradient_z,
            w.wave_strength,
            w.turbulence,
            w.depth,
        ];
        sample.as_mut_ptr() as usize as u32
    })
}
/// Shared grid buffer: row-major Z, each vertex stores height/VX/VZ/gradient-X/gradient-Z as f32.
#[unsafe(no_mangle)]
pub extern "C" fn water_grid(
    nx: u32,
    nz: u32,
    origin_x: f64,
    origin_z: f64,
    dx: f64,
    dz: f64,
    time: f64,
) -> u32 {
    let Some(count) = nx.checked_mul(nz) else {
        return 0;
    };
    if count == 0
        || count as usize > MAX_GRID
        || ![origin_x, origin_z, dx, dz, time]
            .iter()
            .all(|v| v.is_finite())
    {
        return 0;
    }
    SIM.with_borrow(|sim| {
        GRID.with_borrow_mut(|grid| {
            for row in 0..nz {
                for col in 0..nx {
                    let w = sim.venue.as_ref().map_or(WaterSample::default(), |v| {
                        v.sample(
                            origin_x + f64::from(col) * dx,
                            origin_z + f64::from(row) * dz,
                            time,
                        )
                    });
                    let i = ((row * nx + col) * 5) as usize;
                    grid[i] = w.height as f32;
                    grid[i + 1] = w.velocity_x as f32;
                    grid[i + 2] = w.velocity_z as f32;
                    grid[i + 3] = w.gradient_x as f32;
                    grid[i + 4] = w.gradient_z as f32;
                }
            }
            grid.as_mut_ptr() as usize as u32
        })
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn venue_geometry(radius: f64) -> u32 {
    STAGED.with_borrow_mut(|staged| {
        if let Some(v) = staged {
            v.bend_radius = radius;
            if v.valid() {
                return 1;
            }
        }
        *staged = None;
        0
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn venue_pocket(z: f64, length: f64, expansion: f64, side: f64) -> u32 {
    STAGED.with_borrow_mut(|staged| {
        if let Some(v) = staged
            && v.pocket_count < MAX_FEATURES
        {
            v.pockets[v.pocket_count] = Pocket {
                z,
                length,
                expansion,
                side,
            };
            v.pocket_count += 1;
            if v.valid() {
                return 1;
            }
        }
        *staged = None;
        0
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn channel_frame(x: f64, z: f64, project: u32) -> u32 {
    if ![x, z].iter().all(|v| v.is_finite()) {
        return 0;
    }
    SIM.with_borrow(|sim| {
        FRAME.with_borrow_mut(|frame| {
            let Some(v) = sim.venue.as_ref() else {
                return 0;
            };
            let (a, b, c) = if project == 0 {
                v.frame(x, z)
            } else {
                let (a, b) = v.project(x, z);
                (a, b, v.frame(a, b).2)
            };
            *frame = [a, b, c];
            frame.as_mut_ptr() as usize as u32
        })
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn course_grid(
    nx: u32,
    nz: u32,
    origin_x: f64,
    origin_z: f64,
    dx: f64,
    dz: f64,
    time: f64,
) -> u32 {
    let Some(count) = nx.checked_mul(nz) else {
        return 0;
    };
    if count == 0
        || count as usize > MAX_GRID
        || ![origin_x, origin_z, dx, dz, time]
            .iter()
            .all(|v| v.is_finite())
    {
        return 0;
    }
    SIM.with_borrow(|sim| {
        GRID.with_borrow_mut(|grid| {
            let Some(v) = sim.venue.as_ref() else {
                return 0;
            };
            for row in 0..nz {
                for col in 0..nx {
                    let progress = origin_z + f64::from(row) * dz;
                    // Grid X is normalized across the pocket-expanded channel.
                    let t = (origin_x + f64::from(col) * dx - v.min_x) / (v.max_x - v.min_x);
                    let offset = v.edge(-1.0, progress) * (1.0 - t) + v.edge(1.0, progress) * t;
                    let (x, z, _) = v.frame(offset, progress);
                    let w = v.sample(x, z, time);
                    let i = ((row * nx + col) * 7) as usize;
                    grid[i] = w.height as f32;
                    grid[i + 1] = w.velocity_x as f32;
                    grid[i + 2] = w.velocity_z as f32;
                    grid[i + 3] = w.gradient_x as f32;
                    grid[i + 4] = w.gradient_z as f32;
                    grid[i + 5] = w.turbulence as f32;
                    grid[i + 6] = w.wave_strength as f32;
                }
            }
            grid.as_mut_ptr() as usize as u32
        })
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn channel_edge(side: f64, progress: f64) -> f64 {
    SIM.with_borrow(|s| {
        s.venue
            .as_ref()
            .map_or(f64::NAN, |v| v.edge(side, progress))
    })
}

/// Static concrete follows the base grade, never a particular wave phase.
#[unsafe(no_mangle)]
pub extern "C" fn channel_base_height(progress: f64) -> f64 {
    SIM.with_borrow(|s| {
        s.venue
            .as_ref()
            .map_or(f64::NAN, |v| v.base_height(progress))
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn venue_point(x: f64, z: f64) -> u32 {
    STAGED.with_borrow_mut(|s| {
        if let Some(v) = s
            && v.route.count < crate::channel::MAX_POINTS
            && x.is_finite()
            && z.is_finite()
            && x.abs() < 1000.0
            && z.abs() < 1000.0
        {
            v.route.points[v.route.count] = crate::channel::Point { x, z };
            v.route.count += 1;
            return 1;
        }
        *s = None;
        0
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn venue_pools(start: f64, finish: f64, length: f64) -> u32 {
    STAGED.with_borrow_mut(|s| {
        if let Some(v) = s {
            v.start_pool_width = start;
            v.finish_pool_width = finish;
            v.pool_length = length;
            if v.valid() {
                return 1;
            }
        }
        *s = None;
        0
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn venue_drop(z: f64, height: f64, length: f64) -> u32 {
    STAGED.with_borrow_mut(|s| {
        if let Some(v) = s
            && v.drop_count < MAX_FEATURES
        {
            v.drops[v.drop_count] = Drop { z, height, length };
            v.drop_count += 1;
            if v.valid() {
                return 1;
            }
        }
        *s = None;
        0
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn venue_block(x: f64, z: f64, width: f64, length: f64, yaw: f64) -> u32 {
    STAGED.with_borrow_mut(|s| {
        if let Some(v) = s
            && v.obstacle_count < MAX_FEATURES
        {
            v.obstacles[v.obstacle_count] = Obstacle {
                x,
                z,
                width,
                length,
                yaw,
                radius: (width * 0.5).hypot(length * 0.5),
            };
            v.obstacle_count += 1;
            if v.valid() {
                return 1;
            }
        }
        *s = None;
        0
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn channel_metric(x: f64, z: f64) -> f64 {
    SIM.with_borrow(|s| s.venue.as_ref().map_or(f64::NAN, |v| v.metric(x, z)))
}
#[unsafe(no_mangle)]
pub extern "C" fn water_ceiling(x: f64, z: f64) -> f64 {
    SIM.with_borrow(|s| {
        s.venue
            .as_ref()
            .map_or(f64::NAN, |v| v.surface_ceiling(x, z))
    })
}
