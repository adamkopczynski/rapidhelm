import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { ABI_VERSION, bindSimulation, createSimulationFromBytes, type BoatState } from '../../../../packages/wasm-bridge/src/abi';
import { boatFields } from '@rapidhelm/content-schema';
import { consumeTime } from './clock';
import { createRuntime } from './runtime';
import { baseline } from './config';
const bytes = () => readFile(new URL('../../../../packages/wasm-bridge/dist/simulation.wasm', import.meta.url));
const zero: BoatState = { x: 0, z: 0, yaw: 0, velocityX: 0, velocityZ: 0, yawRate: 0 };
test('real WASM snapshot order, configuration atomicity, reset and previous state', async () => {
  const sim = await createSimulationFromBytes(await bytes());
  expect(sim.read()).toEqual({ current: zero, previous: zero });
  const configured = await createSimulationFromBytes(await bytes()); configured.configure(baseline.config);
  const result = sim.advance(1, 1, 1);
  expect(configured.advance(1, 1, 1)).toEqual(result); // authored baseline matches native fallback
  expect(result.previous).toEqual(zero);
  expect(result.current.velocityZ).toBeGreaterThan(0);
  expect(result.current.velocityX).toBe(0);
  expect(result.current.z).toBeCloseTo(result.current.velocityZ * sim.timestep, 12);
  expect(result.current.yawRate).toBeGreaterThan(0);
  expect(() => sim.configure({ ...baseline.config, mass: NaN })).toThrow('Rust rejected');
  expect(sim.read()).toEqual(result);
  for (const [key, field] of Object.entries(boatFields)) {
    for (const value of [field.min, field.max]) expect(() => sim.configure({ ...baseline.config, [key]: value })).not.toThrow();
    for (const value of [field.min - 1, field.max + 1, Infinity]) expect(() => sim.configure({ ...baseline.config, [key]: value })).toThrow();
  }
  sim.configure({ ...baseline.config, forwardThrust: 0 }); sim.advance(30, 1, 0); expect(sim.read().current).toEqual(zero);
  sim.reset(); sim.advance(30, 1, 0); expect(sim.read().current).toEqual(zero);
  for (const steps of [-1, 31, 0.5, NaN]) expect(() => sim.advance(steps, 0, 0)).toThrow('Step count');
});
test('bridge refuses incompatible ABI', () => {
  const exports = { abi_version: () => ABI_VERSION + 1, timestep: () => 1 / 120, reset() {}, configure: () => 1, advance() {}, state: () => 0 };
  expect(() => bindSimulation(exports as unknown as WebAssembly.Exports)).toThrow('Incompatible');
});
test('real WASM scripted per-tick replay agrees at 30/60/144 Hz', async () => {
  let reference: BoatState | undefined;
  for (const fps of [30, 60, 144]) {
    const sim = await createSimulationFromBytes(await bytes()); sim.configure(baseline.config);
    let remainder = 0, ticks = 0;
    for (let frame = 0; frame < fps * 10; frame++) {
      const clock = consumeTime(remainder, 1 / fps, sim.timestep); remainder = clock.remainder;
      for (let i = 0; i < clock.steps; i++, ticks++) sim.advance(1, ticks < 600 ? 0.8 : -0.2, Math.floor(ticks / 120) % 2 ? 0.4 : -0.4);
    }
    expect(ticks).toBe(1200);
    const state = sim.read().current;
    if (reference) for (const key of Object.keys(state) as (keyof BoatState)[]) expect(Math.abs(state[key] - reference[key])).toBeLessThan(1e-6);
    else reference = state;
  }
});
test('runtime uses batched penultimate state and reset clears interpolation', async () => {
  const sim = await createSimulationFromBytes(await bytes());
  const runtime = createRuntime(sim, baseline.config);
  const frame = runtime.update(3.5 * sim.timestep, { throttle: 1, steering: 0 });
  expect(frame.steps).toBe(3); expect(frame.state.z).toBeCloseTo((sim.read().previous.z + sim.read().current.z) / 2, 12);
  runtime.reset(); expect(runtime.update(0, { throttle: 0, steering: 0 }).state).toEqual(zero);
  runtime.update(0.02, { throttle: 1, steering: 1 }); runtime.suspend();
  expect(runtime.update(0, { throttle: 0, steering: 0 }).state).toEqual(runtime.read());
});
