import wasmUrl from '../dist/simulation.wasm?url';
import { createSimulationFromBytes } from './abi';
export * from './abi';
export async function createSimulation() {
  const response = await fetch(wasmUrl);
  if (!response.ok) throw new Error(`WASM download failed: ${response.status}`);
  return createSimulationFromBytes(await response.arrayBuffer());
}
