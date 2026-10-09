import { z } from 'zod';
export const venueSchema = z.object({ version: z.literal(1), id: z.string().min(1), name: z.string().min(1), channelWidth: z.number().positive(), channelLength: z.number().positive() });
export type Venue = z.infer<typeof venueSchema>;
export const boatFields = {
  mass: { label: 'Mass', unit: 'kg', min: 40, max: 160, step: 1 },
  yawInertia: { label: 'Yaw inertia', unit: 'kg m²', min: 10, max: 180, step: 1 },
  forwardThrust: { label: 'Forward thrust', unit: 'N', min: 0, max: 800, step: 10 },
  reverseThrust: { label: 'Reverse thrust', unit: 'N', min: 0, max: 600, step: 10 },
  steeringTorque: { label: 'Steering torque', unit: 'N m', min: 0, max: 400, step: 5 },
  forwardDrag: { label: 'Forward drag', unit: 'N/(m/s)', min: 0, max: 500, step: 5 },
  lateralDrag: { label: 'Lateral drag', unit: 'N/(m/s)', min: 0, max: 2000, step: 10 },
  angularDamping: { label: 'Angular damping', unit: 'N m/(rad/s)', min: 0, max: 300, step: 5 },
} as const;
const bounded = (key: keyof typeof boatFields) => z.number().finite().min(boatFields[key].min).max(boatFields[key].max);
export const boatConfigSchema = z.object({ mass: bounded('mass'), yawInertia: bounded('yawInertia'), forwardThrust: bounded('forwardThrust'), reverseThrust: bounded('reverseThrust'), steeringTorque: bounded('steeringTorque'), forwardDrag: bounded('forwardDrag'), lateralDrag: bounded('lateralDrag'), angularDamping: bounded('angularDamping') }).strict();
export type BoatConfig = z.infer<typeof boatConfigSchema>;
export const boatPresetSchema = z.object({ version: z.literal(1), id: z.string().min(1), name: z.string().min(1), config: boatConfigSchema });
