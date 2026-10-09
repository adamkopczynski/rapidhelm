import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { createSimulationFromBytes, type BoatState } from '../../../../packages/wasm-bridge/src/abi';
import { riverVenueSchema } from '@rapidhelm/content-schema';
import { trainingVenue as venue } from './venue';
const load = async () => createSimulationFromBytes(await readFile(new URL('../../../../packages/wasm-bridge/dist/simulation.wasm', import.meta.url)));
function assertInside(s: BoatState) {
  const sin = Math.sin(s.yaw), cos = Math.cos(s.yaw), b = venue.bounds;
  const ex = 0.42 + 1.48 * Math.abs(sin), ez = 0.42 + 1.48 * Math.abs(cos);
  expect(s.x - ex).toBeGreaterThanOrEqual(b.minX - 1e-6); expect(s.x + ex).toBeLessThanOrEqual(b.maxX + 1e-6);
  expect(s.z - ez).toBeGreaterThanOrEqual(b.minZ - 1e-6); expect(s.z + ez).toBeLessThanOrEqual(b.maxZ + 1e-6);
  for (const o of venue.obstacles) {
    const projection = Math.max(-1.48, Math.min(1.48, (o.x - s.x) * sin + (o.z - s.z) * cos));
    expect(Math.hypot(s.x + projection * sin - o.x, s.z + projection * cos - o.z)).toBeGreaterThanOrEqual(o.radius + 0.42 - 1e-6);
  }
}
test('authored venue validates and Rust independently rejects invalid staged features', async () => {
  expect(riverVenueSchema.safeParse(venue).success).toBe(true);
  expect(riverVenueSchema.safeParse({ ...venue, start: { ...venue.start, z: 50 } }).success).toBe(false);
  const sim = await load(); sim.configureVenue(venue); sim.advance(30, 1, 0); const before = sim.read();
  expect(() => sim.configureVenue({ ...venue, water: { ...venue.water, amplitude: NaN } })).toThrow('venue'); expect(sim.read()).toEqual(before);
  expect(() => sim.configureVenue({ ...venue, obstacles: [{ x: 90, z: 50, radius: 1 }] })).toThrow('venue'); expect(sim.read()).toEqual(before);
  sim.reset(); expect(sim.read().current.z).toBe(venue.start.z); expect(sim.time()).toBe(0);
});
test('Rust water samples and batched grid agree for calm, downstream and upstream water', async () => {
  const sim = await load(); sim.configureVenue(venue);
  const start = sim.sampleWater(0, venue.start.z, 5); expect(start.velocityZ).toBe(0); expect(start.height).toBe(0); expect(start.waveStrength).toBe(0);
  expect(sim.sampleWater(0, 37, 5).velocityZ).toBeGreaterThan(2);
  expect(sim.sampleWater(7, 67, 5).velocityZ).toBeLessThan(-1);
  const grid = sim.waterGrid(17, 91, -10, 0, 1.25, 2, 5);
  const index = (20 * 17 + 8) * 5; const sample = sim.sampleWater(0, 40, 5);
  expect(grid[index]).toBeCloseTo(sample.height, 5); expect(grid[index + 1]).toBeCloseTo(sample.velocityX, 5); expect(grid[index + 2]).toBeCloseTo(sample.velocityZ, 5); expect(grid[index + 3]).toBeCloseTo(sample.gradientX, 5); expect(grid[index + 4]).toBeCloseTo(sample.gradientZ, 5);
  expect(() => sim.waterGrid(1000, 1000, 0, 0, 1, 1)).toThrow('grid');
});
test('compiled venue keeps the entire kayak clear through a long control sequence', async () => {
  const sim = await load(); sim.configureVenue(venue);
  for (let i = 0; i < 120; i++) sim.advance(1, 0, 0); expect(sim.read().current.z).toBe(5);
  let maxZ = 5;
  for (let tick = 0; tick < 12000; tick++) {
    const s = sim.advance(1, 1, tick < 1800 ? 0 : (Math.floor(tick / 360) % 3 - 1) * 0.7).current;
    assertInside(s); maxZ = Math.max(maxZ, s.z);
  }
  expect(maxZ).toBeGreaterThan(40); expect(sim.contacts()).toBeGreaterThan(0);
}, 15000);
