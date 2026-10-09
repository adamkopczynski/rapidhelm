//! Authored velocity field and deterministic waves, shared by dynamics and rendering.
use crate::collision::{HALF_SEGMENT, HULL_RADIUS};
pub const MAX_FEATURES: usize = 16;
#[derive(Clone, Copy, Debug, Default)]
pub struct Obstacle {
    pub x: f64,
    pub z: f64,
    pub radius: f64,
}
#[derive(Clone, Copy, Debug, Default)]
pub struct FlowRegion {
    pub x: f64,
    pub z: f64,
    pub radius_x: f64,
    pub radius_z: f64,
    pub velocity_x: f64,
    pub velocity_z: f64,
    pub swirl: f64,
}
#[derive(Clone, Copy, Debug)]
pub struct Venue {
    pub min_x: f64,
    pub max_x: f64,
    pub min_z: f64,
    pub max_z: f64,
    pub start_x: f64,
    pub start_z: f64,
    pub start_yaw: f64,
    pub current_speed: f64,
    pub flow_start: f64,
    pub flow_ramp: f64,
    pub wave_start: f64,
    pub wave_amplitude: f64,
    pub wave_length: f64,
    pub wave_frequency: f64,
    pub slope: f64,
    pub depth: f64,
    pub obstacles: [Obstacle; MAX_FEATURES],
    pub obstacle_count: usize,
    pub regions: [FlowRegion; MAX_FEATURES],
    pub region_count: usize,
}
impl Default for Venue {
    fn default() -> Self {
        Self {
            min_x: -10.0,
            max_x: 10.0,
            min_z: 0.0,
            max_z: 180.0,
            start_x: 0.0,
            start_z: 5.0,
            start_yaw: 0.0,
            current_speed: 3.2,
            flow_start: 14.0,
            flow_ramp: 18.0,
            wave_start: 34.0,
            wave_amplitude: 0.28,
            wave_length: 7.5,
            wave_frequency: 1.6,
            slope: 0.008,
            depth: 1.6,
            obstacles: [Obstacle::default(); MAX_FEATURES],
            obstacle_count: 0,
            regions: [FlowRegion::default(); MAX_FEATURES],
            region_count: 0,
        }
    }
}
impl Venue {
    pub fn valid(&self) -> bool {
        let values = [
            self.min_x,
            self.max_x,
            self.min_z,
            self.max_z,
            self.start_x,
            self.start_z,
            self.start_yaw,
            self.current_speed,
            self.flow_start,
            self.flow_ramp,
            self.wave_start,
            self.wave_amplitude,
            self.wave_length,
            self.wave_frequency,
            self.slope,
            self.depth,
        ];
        if !values.iter().all(|v| v.is_finite())
            || self.obstacle_count > MAX_FEATURES
            || self.region_count > MAX_FEATURES
        {
            return false;
        }
        if self.max_x - self.min_x < 8.0
            || self.max_x - self.min_x > 100.0
            || self.max_z - self.min_z < 40.0
            || self.max_z - self.min_z > 1000.0
        {
            return false;
        }
        if !(0.0..=8.0).contains(&self.current_speed)
            || !(2.0..=100.0).contains(&self.flow_ramp)
            || self.flow_start < self.min_z + 5.0
            || self.flow_start + self.flow_ramp > self.max_z
            || self.wave_start < self.flow_start + self.flow_ramp
            || self.wave_start > self.max_z - 5.0
        {
            return false;
        }
        if !(0.0..=0.6).contains(&self.wave_amplitude)
            || !(4.0..=20.0).contains(&self.wave_length)
            || !(0.1..=4.0).contains(&self.wave_frequency)
            || !(0.0..=0.025).contains(&self.slope)
            || !(0.8..=5.0).contains(&self.depth)
        {
            return false;
        }
        let extent_x = HULL_RADIUS + HALF_SEGMENT * self.start_yaw.sin().abs();
        let extent_z = HULL_RADIUS + HALF_SEGMENT * self.start_yaw.cos().abs();
        if self.start_x - extent_x < self.min_x
            || self.start_x + extent_x > self.max_x
            || self.start_z - extent_z < self.min_z
            || self.start_z + extent_z >= self.flow_start
        {
            return false;
        }
        for (i, o) in self.obstacles[..self.obstacle_count].iter().enumerate() {
            if ![o.x, o.z, o.radius].iter().all(|v| v.is_finite())
                || !(0.4..=3.0).contains(&o.radius)
                || o.x - o.radius < self.min_x + 0.5
                || o.x + o.radius > self.max_x - 0.5
                || o.z - o.radius < self.flow_start + self.flow_ramp
                || o.z + o.radius > self.max_z - 3.0
            {
                return false;
            }
            // Keep sufficient space between features for the capsule contact solver.
            for other in &self.obstacles[..i] {
                if (o.x - other.x).hypot(o.z - other.z)
                    < o.radius + other.radius + 2.0 * (HALF_SEGMENT + HULL_RADIUS)
                {
                    return false;
                }
            }
        }
        for r in &self.regions[..self.region_count] {
            if ![
                r.x,
                r.z,
                r.radius_x,
                r.radius_z,
                r.velocity_x,
                r.velocity_z,
                r.swirl,
            ]
            .iter()
            .all(|v| v.is_finite())
                || !(1.0..=10.0).contains(&r.radius_x)
                || !(2.0..=30.0).contains(&r.radius_z)
                || r.velocity_x.abs() > 5.0
                || r.velocity_z.abs() > 5.0
                || r.swirl.abs() > 3.0
                || r.x - r.radius_x < self.min_x
                || r.x + r.radius_x > self.max_x
                || r.z - r.radius_z < self.flow_start + self.flow_ramp
                || r.z + r.radius_z > self.max_z
            {
                return false;
            }
        }
        true
    }
}
#[derive(Clone, Copy, Debug, Default)]
pub struct WaterSample {
    pub velocity_x: f64,
    pub velocity_z: f64,
    pub height: f64,
    pub gradient_x: f64,
    pub gradient_z: f64,
    pub wave_strength: f64,
    pub turbulence: f64,
    pub depth: f64,
}
pub fn smooth(value: f64) -> f64 {
    let t = value.clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}
fn smooth_derivative(value: f64) -> f64 {
    if (0.0..1.0).contains(&value) {
        6.0 * value * (1.0 - value)
    } else {
        0.0
    }
}
impl Venue {
    pub fn sample(&self, x: f64, z: f64, time: f64) -> WaterSample {
        let ramp = smooth((z - self.flow_start) / self.flow_ramp);
        let center_x = (self.min_x + self.max_x) * 0.5;
        let bank_distance =
            ((x - center_x).abs() / ((self.max_x - self.min_x) * 0.5)).clamp(0.0, 1.0);
        let bank_factor = 1.0 - 0.65 * bank_distance.powi(4);
        let mut vx = 0.0;
        let mut vz = self.current_speed * ramp * bank_factor;
        let mut turbulence: f64 = 0.0;
        // Local potential-flow deflection around circular obstacles plus a damped wake.
        for o in &self.obstacles[..self.obstacle_count] {
            let dx = x - o.x;
            let dz = z - o.z;
            let d2 = (dx * dx + dz * dz).max(o.radius * o.radius);
            let influence = o.radius * o.radius / d2;
            let speed = self.current_speed * ramp;
            vx += -2.0 * speed * influence * dx * dz / d2;
            vz += speed * influence * (dx * dx - dz * dz) / d2;
            let wake = if dz > o.radius {
                (-(dx / (o.radius * 1.6)).powi(2) - ((dz - o.radius) / 8.0).powi(2)).exp()
            } else {
                0.0
            };
            vz -= speed * 0.45 * wake;
            turbulence = turbulence.max(wake);
        }
        for r in &self.regions[..self.region_count] {
            let dx = (x - r.x) / r.radius_x;
            let dz = (z - r.z) / r.radius_z;
            let blend = 1.0 - smooth((dx.hypot(dz) - 0.45) / 0.55);
            vx += (r.velocity_x - dz * r.swirl - vx) * blend;
            vz += (r.velocity_z + dx * r.swirl - vz) * blend;
            turbulence = turbulence.max(blend * (1.0 - blend) * 4.0);
        }
        // Smooth, deterministic travelling waves: gradients exert planar forces.
        let envelope_t = (z - self.wave_start) / 8.0;
        let envelope = smooth(envelope_t);
        let envelope_derivative = smooth_derivative(envelope_t) / 8.0;
        let k = std::f64::consts::TAU / self.wave_length;
        let phase = k * z - self.wave_frequency * time + 0.5 * (0.65 * x).sin();
        let cross_phase = 0.8 * x + 0.55 * k * z - 0.7 * self.wave_frequency * time;
        let signal = phase.sin() + 0.3 * cross_phase.sin();
        let height = self.base_height(z) + self.wave_amplitude * envelope * signal;
        let gradient_x = self.wave_amplitude
            * envelope
            * (phase.cos() * 0.325 * (0.65 * x).cos() + 0.24 * cross_phase.cos());
        let gradient_z = self.base_gradient(z)
            + self.wave_amplitude
                * (envelope_derivative * signal
                    + envelope * k * (phase.cos() + 0.165 * cross_phase.cos()));
        WaterSample {
            velocity_x: vx,
            velocity_z: vz,
            height,
            gradient_x,
            gradient_z,
            wave_strength: self.wave_amplitude * envelope,
            turbulence: turbulence.max(envelope * 0.3),
            depth: self.depth,
        }
    }
    pub fn base_height(&self, z: f64) -> f64 {
        // Flat starting pool; a smooth slope entrance avoids a surface discontinuity.
        let d = (z - self.flow_start).max(0.0);
        let length = self.flow_ramp;
        let integral = if d < length {
            let t = d / length;
            length * (t.powi(3) - 0.5 * t.powi(4))
        } else {
            d - length * 0.5
        };
        -self.slope * integral
    }
    fn base_gradient(&self, z: f64) -> f64 {
        -self.slope * smooth((z - self.flow_start) / self.flow_ramp)
    }
}
