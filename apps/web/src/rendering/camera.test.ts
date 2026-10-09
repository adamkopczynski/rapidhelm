import { expect, test } from 'vitest';
import { smoothingWeight } from './camera';
test('camera smoothing agrees across render rates', () => {
  for (const fps of [30, 60, 144]) {
    let value = 0; for (let i = 0; i < fps; i++) value += (1 - value) * smoothingWeight(1 / fps);
    expect(value).toBeCloseTo(1 - Math.exp(-5), 12);
  }
});
