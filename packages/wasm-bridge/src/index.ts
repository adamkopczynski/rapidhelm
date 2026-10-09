import wasmUrl from '../dist/simulation.wasm?url';
export interface BoatState { x: number; z: number; yaw: number; speed: number }
interface SimulationExports { reset(): void; advance(steps: number, throttle: number, steering: number): void; state(index: number): number }
export async function createSimulation() {
  const response = await fetch(wasmUrl);
  if (!response.ok) throw new Error(`WASM download failed: ${response.status}`);
  const { instance } = await WebAssembly.instantiate(await response.arrayBuffer());
  const api = instance.exports as unknown as SimulationExports;
  const read = (): BoatState => ({ x: api.state(0), z: api.state(1), yaw: api.state(2), speed: api.state(3) });
  return { read, reset: () => { api.reset(); return read(); }, advance: (steps: number, throttle: number, steering: number) => { api.advance(steps, throttle, steering); return read(); } };
}
