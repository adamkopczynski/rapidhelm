//! Authored spline route with an arc-length table; world dynamics stay in Rust.
pub const MAX_POINTS: usize = 12;
const SAMPLES: usize = 193;
#[derive(Clone, Copy, Debug, Default)]
pub struct Point {
    pub x: f64,
    pub z: f64,
}
#[derive(Clone, Copy, Debug, Default)]
struct Station {
    t: f64,
    s: f64,
    x: f64,
    z: f64,
}
#[derive(Clone, Copy, Debug)]
pub struct Route {
    pub points: [Point; MAX_POINTS],
    pub count: usize,
    table: [Station; SAMPLES],
    scale: f64,
    pub ready: bool,
}
impl Default for Route {
    fn default() -> Self {
        Self {
            points: [Point::default(); MAX_POINTS],
            count: 0,
            table: [Station::default(); SAMPLES],
            scale: 1.0,
            ready: false,
        }
    }
}
impl Route {
    fn curve(&self, t: f64) -> (Point, Point) {
        let segment = (t.floor() as usize).min(self.count - 2);
        let u = (t - segment as f64).clamp(0.0, 1.0);
        let p1 = self.points[segment];
        let p2 = self.points[segment + 1];
        let p0 = if segment == 0 {
            Point {
                x: 2.0 * p1.x - p2.x,
                z: 2.0 * p1.z - p2.z,
            }
        } else {
            self.points[segment - 1]
        };
        let p3 = if segment + 2 == self.count {
            Point {
                x: 2.0 * p2.x - p1.x,
                z: 2.0 * p2.z - p1.z,
            }
        } else {
            self.points[segment + 2]
        };
        let axis = |a: f64, b: f64, c: f64, d: f64| {
            let k0 = 2.0 * b;
            let k1 = -a + c;
            let k2 = 2.0 * a - 5.0 * b + 4.0 * c - d;
            let k3 = -a + 3.0 * b - 3.0 * c + d;
            (
                (k0 + k1 * u + k2 * u * u + k3 * u * u * u) * 0.5,
                (k1 + 2.0 * k2 * u + 3.0 * k3 * u * u) * 0.5,
            )
        };
        let (x, dx) = axis(p0.x, p1.x, p2.x, p3.x);
        let (z, dz) = axis(p0.z, p1.z, p2.z, p3.z);
        (
            Point {
                x: x * self.scale,
                z: z * self.scale,
            },
            Point {
                x: dx * self.scale,
                z: dz * self.scale,
            },
        )
    }
    pub fn prepare(&mut self, length: f64) -> bool {
        if self.count == 0 {
            return true;
        }
        if self.count < 4
            || self.count > MAX_POINTS
            || !self.points[..self.count].iter().all(|p| {
                p.x.is_finite() && p.z.is_finite() && p.x.abs() < 1000.0 && p.z.abs() < 1000.0
            })
        {
            return false;
        }
        self.scale = 1.0;
        let mut distance = 0.0;
        let mut previous = self.curve(0.0).0;
        for i in 0..SAMPLES {
            let t = i as f64 * (self.count - 1) as f64 / (SAMPLES - 1) as f64;
            let p = self.curve(t).0;
            let d = (p.x - previous.x).hypot(p.z - previous.z);
            if i > 0 && d < 0.01 {
                return false;
            }
            distance += d;
            self.table[i] = Station {
                t,
                s: distance,
                x: p.x,
                z: p.z,
            };
            previous = p;
        }
        if distance < 40.0 {
            return false;
        }
        self.scale = length / distance;
        for p in &mut self.table {
            p.s *= self.scale;
            p.x *= self.scale;
            p.z *= self.scale;
        }
        self.ready = true;
        true
    }
    pub fn frame(&self, offset: f64, s: f64) -> (f64, f64, f64) {
        let limit = self.table[SAMPLES - 1].s;
        let progress = s.clamp(0.0, limit);
        let i = self
            .table
            .partition_point(|p| p.s < progress)
            .clamp(1, SAMPLES - 1);
        let a = self.table[i - 1];
        let b = self.table[i];
        let t = a.t + (b.t - a.t) * (progress - a.s) / (b.s - a.s);
        let (p, d) = self.curve(t);
        let yaw = d.x.atan2(d.z);
        let extra = s - progress;
        (
            p.x + offset * yaw.cos() + extra * yaw.sin(),
            p.z - offset * yaw.sin() + extra * yaw.cos(),
            yaw,
        )
    }
    pub fn project(&self, x: f64, z: f64) -> (f64, f64) {
        let mut best = f64::INFINITY;
        let mut s = 0.0;
        for pair in self.table.windows(2) {
            let a = pair[0];
            let b = pair[1];
            let dx = b.x - a.x;
            let dz = b.z - a.z;
            let t = (((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)).clamp(0.0, 1.0);
            let distance = (x - a.x - t * dx).powi(2) + (z - a.z - t * dz).powi(2);
            if distance < best {
                best = distance;
                s = a.s + t * (b.s - a.s);
            }
        }
        // Refine the closest point on the actual spline rather than its table chords.
        for _ in 0..6 {
            let (cx, cz, yaw) = self.frame(0.0, s);
            let eps = 0.02;
            let (ax, az, ay) = self.frame(0.0, s - eps);
            let (bx, bz, by) = self.frame(0.0, s + eps);
            let speed = (bx - ax).hypot(bz - az) / (2.0 * eps);
            let curvature = (by - ay).sin().atan2((by - ay).cos()) / (2.0 * eps);
            let offset = (x - cx) * yaw.cos() - (z - cz) * yaw.sin();
            let tangent = (x - cx) * yaw.sin() + (z - cz) * yaw.cos();
            let step = (tangent / (speed - offset * curvature).max(0.2)).clamp(-2.0, 2.0);
            s += step;
            if step.abs() < 1e-8 {
                break;
            }
        }
        let (cx, cz, yaw) = self.frame(0.0, s);
        ((x - cx) * yaw.cos() - (z - cz) * yaw.sin(), s)
    }
    pub fn metric(&self, offset: f64, s: f64) -> f64 {
        let (ax, az, ay) = self.frame(0.0, s - 0.02);
        let (bx, bz, by) = self.frame(0.0, s + 0.02);
        ((bx - ax).hypot(bz - az) / 0.04 - offset * (by - ay).sin().atan2((by - ay).cos()) / 0.04)
            .max(0.2)
    }
    pub fn valid_width(&self, width: f64) -> bool {
        if !self.ready {
            return false;
        }
        for i in 1..SAMPLES - 1 {
            let s = self.table[i].s;
            if self.metric(width, s) < 0.45 || self.metric(-width, s) < 0.45 {
                return false;
            }
            for j in 0..i {
                if s - self.table[j].s > width * 4.0
                    && (self.table[i].x - self.table[j].x).hypot(self.table[i].z - self.table[j].z)
                        < width * 2.0 + 1.0
                {
                    return false;
                }
            }
        }
        true
    }
}
pub fn pool_half_width(
    s: f64,
    length: f64,
    start_width: f64,
    end_width: f64,
    pool_length: f64,
    nominal: f64,
) -> f64 {
    if pool_length <= 0.0 {
        return nominal;
    }
    let ellipse = |distance: f64, width: f64| {
        let half = pool_length * 0.5;
        let shape = width * 0.5 * (1.0 - ((distance - half) / half).powi(2)).max(0.0).sqrt();
        shape.max(if distance < half { 0.6 } else { nominal })
    };
    if s < pool_length && start_width > 0.0 {
        ellipse(s.max(0.0), start_width)
    } else if s > length - pool_length && end_width > 0.0 {
        ellipse((length - s).max(0.0), end_width)
    } else {
        nominal
    }
}
