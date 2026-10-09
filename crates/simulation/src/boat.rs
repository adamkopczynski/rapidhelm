//! Authoritative planar state and SI-unit handling parameters.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct BoatState {
    pub x: f64,
    pub z: f64,
    pub yaw: f64,
    pub velocity_x: f64,
    pub velocity_z: f64,
    pub yaw_rate: f64,
}
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct BoatConfig {
    pub mass: f64,            // kg, athlete and boat
    pub yaw_inertia: f64,     // kg m²
    pub forward_thrust: f64,  // N
    pub reverse_thrust: f64,  // N
    pub steering_torque: f64, // N m
    pub forward_drag: f64,    // N per (m/s)
    pub lateral_drag: f64,    // N per (m/s)
    pub angular_damping: f64, // N m per (rad/s)
}
impl BoatConfig {
    pub const DEFAULT: Self = Self {
        mass: 90.0,
        yaw_inertia: 65.0,
        forward_thrust: 240.0,
        reverse_thrust: 180.0,
        steering_torque: 100.0,
        forward_drag: 45.0,
        lateral_drag: 220.0,
        angular_damping: 85.0,
    };
    pub fn valid(self) -> bool {
        [
            (self.mass, 40.0, 160.0),
            (self.yaw_inertia, 10.0, 180.0),
            (self.forward_thrust, 0.0, 800.0),
            (self.reverse_thrust, 0.0, 600.0),
            (self.steering_torque, 0.0, 400.0),
            (self.forward_drag, 0.0, 500.0),
            (self.lateral_drag, 0.0, 2000.0),
            (self.angular_damping, 0.0, 300.0),
        ]
        .iter()
        .all(|(value, min, max)| value.is_finite() && value >= min && value <= max)
    }
}
impl Default for BoatConfig {
    fn default() -> Self {
        Self::DEFAULT
    }
}
