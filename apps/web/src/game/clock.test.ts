import { expect, test } from 'vitest';
import { consumeTime } from './clock';
test('one second produces 120 steps at different render rates', () => {
  for (const fps of [30, 60, 144]) {
    let remainder = 0, steps = 0;
    for (let i = 0; i < fps; i++) { const tick = consumeTime(remainder, 1 / fps); remainder = tick.remainder; steps += tick.steps; }
    expect(steps).toBe(120);
  }
});
test('long frames are bounded', () => { expect(consumeTime(0, 10).steps).toBe(30); });
