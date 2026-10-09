export interface BoatState { x: number; z: number; yaw: number; velocityX: number; velocityZ: number; yawRate: number }
export interface Snapshots { current: BoatState; previous: BoatState }
export interface SimulationConfig { mass: number; yawInertia: number; forwardThrust: number; reverseThrust: number; steeringTorque: number; forwardDrag: number; lateralDrag: number; angularDamping: number }
export const STATE_INDEX = { x: 0, z: 1, yaw: 2, velocityX: 3, velocityZ: 4, yawRate: 5 } as const;
export const ABI_VERSION = 2;
interface SimulationExports { abi_version(): number; timestep(): number; reset(): void; configure(...values: number[]): number; advance(steps: number, throttle: number, steering: number): void; state(index: number): number }
export function bindSimulation(exports: WebAssembly.Exports) {
  for (const name of ['abi_version', 'timestep', 'reset', 'configure', 'advance', 'state']) {
    if (typeof exports[name] !== 'function') throw new Error(`Missing WASM export: ${name}`);
  }
  const api = exports as unknown as SimulationExports;
  if (api.abi_version() !== ABI_VERSION) throw new Error('Incompatible simulation ABI; rebuild WASM and reload.');
  const timestep = api.timestep();
  if (!Number.isFinite(timestep) || timestep <= 0 || timestep > 0.1) throw new Error('Invalid simulation timestep');
  const readState = (offset = 0): BoatState => ({ x: api.state(STATE_INDEX.x + offset), z: api.state(STATE_INDEX.z + offset), yaw: api.state(STATE_INDEX.yaw + offset), velocityX: api.state(STATE_INDEX.velocityX + offset), velocityZ: api.state(STATE_INDEX.velocityZ + offset), yawRate: api.state(STATE_INDEX.yawRate + offset) });
  const read = (): Snapshots => ({ current: readState(), previous: readState(6) });
  return {
    timestep, read,
    reset: () => { api.reset(); return read(); },
    configure: (c: SimulationConfig) => {
      if (api.configure(c.mass, c.yawInertia, c.forwardThrust, c.reverseThrust, c.steeringTorque, c.forwardDrag, c.lateralDrag, c.angularDamping) !== 1) throw new Error('Rust rejected boat configuration');
      return read();
    },
    advance: (steps: number, throttle: number, steering: number) => {
      if (!Number.isInteger(steps) || steps < 0 || steps > 30) throw new Error('Step count must be an integer from 0 to 30');
      api.advance(steps, throttle, steering); return read();
    },
  };
}
export type Simulation = ReturnType<typeof bindSimulation>;
export async function createSimulationFromBytes(bytes: BufferSource) {
  const { instance } = await WebAssembly.instantiate(bytes);
  return bindSimulation(instance.exports);
}
