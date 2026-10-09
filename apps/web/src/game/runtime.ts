import type { BoatState, Simulation, Snapshots, SimulationConfig, VenueConfig } from '@rapidhelm/wasm-bridge';
import type { Controls } from '../input/keyboard';
import { consumeTime } from './clock';
export function interpolate({ previous: a, current: b }: Snapshots, alpha: number): BoatState {
  const mix = (x: number, y: number) => x + (y - x) * alpha;
  return { x: mix(a.x, b.x), z: mix(a.z, b.z), yaw: mix(a.yaw, b.yaw), velocityX: mix(a.velocityX, b.velocityX), velocityZ: mix(a.velocityZ, b.velocityZ), yawRate: mix(a.yawRate, b.yawRate) };
}
export function createRuntime(sim: Simulation, config: SimulationConfig, venue?: VenueConfig) {
  sim.configure(config);
  if (venue) sim.configureVenue(venue);
  let snapshots = sim.read(), accumulator = 0, stepsTotal = 0;
  const replace = (next: Snapshots) => { snapshots = next; accumulator = 0; stepsTotal = 0; };
  return {
    reset: () => replace(sim.reset()),
    configure: (c: SimulationConfig) => replace(sim.configure(c)),
    suspend: () => { accumulator = 0; snapshots = { current: snapshots.current, previous: snapshots.current }; },
    read: () => snapshots.current,
    update: (delta: number, input: Controls) => {
      const tick = consumeTime(accumulator, delta, sim.timestep); accumulator = tick.remainder;
      const start = performance.now();
      if (tick.steps > 0) snapshots = sim.advance(tick.steps, input.throttle, input.steering);
      const simulationMs = performance.now() - start;
      stepsTotal += tick.steps;
      const time = Math.max(0, sim.time() - sim.timestep + accumulator);
      return { time, contacts: sim.contacts(), state: interpolate(snapshots, accumulator / sim.timestep), authoritative: snapshots.current, steps: tick.steps, stepsTotal, simulationMs };
    },
  };
}
