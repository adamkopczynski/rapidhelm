import { expect, test } from 'vitest';
import { mapKeys } from './keyboard';
test('opposite inputs cancel and independent axes combine', () => {
  expect(mapKeys(new Set(['KeyW', 'KeyS', 'KeyA', 'KeyD']))).toEqual({ throttle: 0, steering: 0 });
  expect(mapKeys(new Set(['KeyW', 'KeyD']))).toEqual({ throttle: 1, steering: 1 });
  expect(mapKeys(new Set(['KeyS', 'KeyA']))).toEqual({ throttle: -1, steering: -1 });
});
