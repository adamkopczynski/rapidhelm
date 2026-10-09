//! Planar foundation simulation. Units: meters, seconds, radians; +Z downstream.
const DT: f64 = 1.0 / 120.0;
#[derive(Clone, Copy, Default)]
pub struct Simulation {
    pub x: f64,
    pub z: f64,
    pub yaw: f64,
    pub speed: f64,
}
impl Simulation {
    pub fn advance(&mut self, steps: u32, throttle: f64, steering: f64) {
        let throttle = if throttle.is_finite() {
            throttle.clamp(-1.0, 1.0)
        } else {
            0.0
        };
        let steering = if steering.is_finite() {
            steering.clamp(-1.0, 1.0)
        } else {
            0.0
        };
        for _ in 0..steps.min(30) {
            self.speed += (throttle * 4.0 - self.speed * 0.8) * DT;
            self.yaw += steering * 1.5 * DT;
            self.x += self.yaw.sin() * self.speed * DT;
            self.z += self.yaw.cos() * self.speed * DT;
        }
    }
}
// Single browser-owned instance; exported calls are synchronous and non-reentrant.
static mut SIM: Simulation = Simulation {
    x: 0.0,
    z: 0.0,
    yaw: 0.0,
    speed: 0.0,
};
#[unsafe(no_mangle)]
pub extern "C" fn reset() {
    unsafe {
        SIM = Simulation::default();
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
#[unsafe(no_mangle)]
pub extern "C" fn state(index: u32) -> f64 {
    unsafe {
        match index {
            0 => SIM.x,
            1 => SIM.z,
            2 => SIM.yaw,
            3 => SIM.speed,
            _ => 0.0,
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn accelerates_and_brakes() {
        let mut sim = Simulation::default();
        for _ in 0..40 {
            sim.advance(3, 1.0, 0.0);
        }
        assert!(sim.z > 1.0 && sim.speed > 0.0);
        let speed = sim.speed;
        for _ in 0..40 {
            sim.advance(3, 0.0, 0.0);
        }
        assert!(sim.speed < speed);
    }
    #[test]
    fn batching_preserves_results() {
        let mut a = Simulation::default();
        let mut b = a;
        for _ in 0..120 {
            a.advance(1, 0.8, 0.2);
        }
        for _ in 0..4 {
            b.advance(30, 0.8, 0.2);
        }
        assert_eq!(a.x, b.x);
        assert_eq!(a.z, b.z);
        assert_eq!(a.yaw, b.yaw);
    }
    #[test]
    fn invalid_input_stays_finite() {
        let mut sim = Simulation::default();
        sim.advance(30, f64::NAN, f64::INFINITY);
        assert!(sim.z.is_finite());
        assert_eq!(sim.speed, 0.0);
    }
}
