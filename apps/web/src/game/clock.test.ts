import { expect, test } from 'vitest';
import { consumeTime } from './clock';
test('one second produces 120 steps at different render rates', () => {
  for (const fps of [30, 60, 144]) {
    let remainder = 0, steps = 0;
    for (let i = 0; i < fps; i++) { const tick = consumeTime(remainder, 1 / fps, 1 / 120); remainder = tick.remainder; steps += tick.steps; }
    expect(steps).toBe(120);
  }
});
test('long and invalid frames are bounded', () => {
  expect(consumeTime(0, 10, 1 / 120).steps).toBe(30);
  expect(consumeTime(0, NaN, 1 / 120).steps).toBe(0);
  expect(consumeTime(0, -1, 1 / 120).steps).toBe(0);
});
