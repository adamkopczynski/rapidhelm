import { expect, test } from 'vitest';
import { interpolate } from './runtime';
import type { BoatState } from '@rapidhelm/wasm-bridge';
const a: BoatState = { x: 0, z: 2, yaw: Math.PI - 0.01, velocityX: 1, velocityZ: 2, yawRate: 0.2 };
const b: BoatState = { x: 2, z: 4, yaw: Math.PI + 0.01, velocityX: 2, velocityZ: 3, yawRate: 0.4 };
test('interpolation endpoints and continuous yaw across pi', () => {
  expect(interpolate({ previous: a, current: b }, 0)).toEqual(a);
  expect(interpolate({ previous: a, current: b }, 1)).toEqual(b);
  expect(interpolate({ previous: a, current: b }, 0.5).yaw).toBeCloseTo(Math.PI, 10);
});
