export interface BoatState { x: number; z: number; yaw: number; velocityX: number; velocityZ: number; yawRate: number }
export interface Snapshots { current: BoatState; previous: BoatState }
export interface SimulationConfig { mass: number; yawInertia: number; forwardThrust: number; reverseThrust: number; steeringTorque: number; forwardDrag: number; lateralDrag: number; angularDamping: number }
export const STATE_INDEX = { x: 0, z: 1, yaw: 2, velocityX: 3, velocityZ: 4, yawRate: 5 } as const;
export const ABI_VERSION = 5;
export interface VenueConfig {
  geometry?: { centerline?:readonly {x:number;z:number}[]; pools?:{startWidth:number;finishWidth:number;length:number}; bendRadius: number; pockets: readonly { z:number; length:number; expansion:number; side:number }[] };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  start: { x: number; z: number; yaw: number };
  flow: { speed: number; startZ: number; rampLength: number };
  water: { waveStartZ: number; amplitude: number; wavelength: number; frequency: number; slope: number; depth: number };
  hydraulics?:{ drops:readonly {z:number;height:number;length:number}[] };
  obstacles: readonly { x: number; z: number; radius: number; width?:number;length?:number;yaw?:number }[];
  regions: readonly { x: number; z: number; radiusX: number; radiusZ: number; velocityX: number; velocityZ: number; swirl: number }[];
}
export interface WaterSample { velocityX: number; velocityZ: number; height: number; gradientX: number; gradientZ: number; waveStrength: number; turbulence: number; depth: number }
interface SimulationExports { venue_point(x:number,z:number):number;venue_pools(...v:number[]):number;venue_drop(...v:number[]):number;venue_block(...v:number[]):number;channel_metric(x:number,z:number):number;water_ceiling(x:number,z:number):number; channel_base_height(z:number):number; venue_geometry(radius:number):number; venue_pocket(...v:number[]):number; channel_frame(x:number,z:number,project:number):number; channel_edge(side:number,z:number):number; course_grid(...v:number[]):number; memory: WebAssembly.Memory; simulation_time(): number; contact_count(): number; venue_begin(...values: number[]): number; venue_obstacle(...values: number[]): number; venue_region(...values: number[]): number; venue_commit(): number; water_sample(x: number, z: number, time: number): number; water_grid(...values: number[]): number; abi_version(): number; timestep(): number; reset(): void; configure(...values: number[]): number; advance(steps: number, throttle: number, steering: number): void; state(index: number): number }
export function bindSimulation(exports: WebAssembly.Exports) {
  if (typeof exports.abi_version !== 'function') throw new Error('Missing WASM ABI export');
  const api = exports as unknown as SimulationExports;
  if (api.abi_version() !== ABI_VERSION) throw new Error('Incompatible simulation ABI; rebuild WASM and reload.');
  for (const name of ['timestep', 'reset', 'configure', 'advance', 'state', 'simulation_time', 'contact_count', 'venue_begin', 'venue_obstacle', 'venue_region', 'venue_commit', 'water_sample', 'water_grid', 'venue_geometry', 'venue_pocket', 'channel_frame', 'channel_edge', 'course_grid', 'channel_base_height','venue_point','venue_pools','venue_drop','venue_block','channel_metric','water_ceiling']) {
    if (typeof exports[name] !== 'function') throw new Error(`Missing WASM export: ${name}`);
  }
  if (!(api.memory instanceof WebAssembly.Memory)) throw new Error('Missing WASM memory');
  const timestep = api.timestep();
  if (!Number.isFinite(timestep) || timestep <= 0 || timestep > 0.1) throw new Error('Invalid simulation timestep');
  const readState = (offset = 0): BoatState => ({ x: api.state(STATE_INDEX.x + offset), z: api.state(STATE_INDEX.z + offset), yaw: api.state(STATE_INDEX.yaw + offset), velocityX: api.state(STATE_INDEX.velocityX + offset), velocityZ: api.state(STATE_INDEX.velocityZ + offset), yawRate: api.state(STATE_INDEX.yawRate + offset) });
  const read = (): Snapshots => ({ current: readState(), previous: readState(6) });
  return {
    timestep, read, time: () => api.simulation_time(), contacts: () => api.contact_count(),
    configureVenue: (v: VenueConfig) => {
      const b = v.bounds, s = v.start, f = v.flow, w = v.water;
      const check = (result: number) => { if (result !== 1) throw new Error('Rust rejected venue configuration'); };
      check(api.venue_begin(b.minX, b.maxX, b.minZ, b.maxZ, s.x, s.z, s.yaw, f.speed, f.startZ, f.rampLength, w.waveStartZ, w.amplitude, w.wavelength, w.frequency, w.slope, w.depth));
      if (v.geometry) {check(api.venue_geometry(v.geometry.bendRadius)); for (const p of v.geometry.pockets) check(api.venue_pocket(p.z,p.length,p.expansion,p.side));}
      if(v.geometry?.centerline) for(const p of v.geometry.centerline) check(api.venue_point(p.x,p.z));
      if(v.geometry?.pools) {const p=v.geometry.pools;check(api.venue_pools(p.startWidth,p.finishWidth,p.length));}
      if(v.hydraulics) for(const d of v.hydraulics.drops) check(api.venue_drop(d.z,d.height,d.length));
      for (const o of v.obstacles) check(o.width ? api.venue_block(o.x,o.z,o.width,o.length??0,o.yaw??0) : api.venue_obstacle(o.x, o.z, o.radius));
      for (const r of v.regions) check(api.venue_region(r.x, r.z, r.radiusX, r.radiusZ, r.velocityX, r.velocityZ, r.swirl));
      check(api.venue_commit()); return read();
    },
    sampleWater: (x: number, z: number, time = api.simulation_time()): WaterSample => {
      const ptr = api.water_sample(x, z, time); if (!ptr) throw new Error('Invalid water sample');
      const data = new Float64Array(api.memory.buffer, ptr, 8);
      return { velocityX: data[0], velocityZ: data[1], height: data[2], gradientX: data[3], gradientZ: data[4], waveStrength: data[5], turbulence: data[6], depth: data[7] };
    },
    // Borrowed view: overwritten by the next grid call. No per-vertex WASM crossings.
    waterGrid: (nx: number, nz: number, x: number, z: number, dx: number, dz: number, time = api.simulation_time()) => {
      if (!Number.isInteger(nx) || !Number.isInteger(nz) || nx <= 0 || nz <= 0 || nx * nz > 4096) throw new Error('Water grid must contain 1..4096 points');
      const ptr = api.water_grid(nx, nz, x, z, dx, dz, time); if (!ptr) throw new Error('Invalid water grid');
      return new Float32Array(api.memory.buffer, ptr, nx * nz * 5);
    },
    channelFrame: (x:number,z:number,project=false) => {
      const ptr=api.channel_frame(x,z,project ? 1 : 0); if (!ptr) throw new Error('Invalid channel coordinates');
      const d=new Float64Array(api.memory.buffer,ptr,3); return {x:d[0],z:d[1],yaw:d[2]};
    },
    channelMetric:(x:number,z:number)=>api.channel_metric(x,z),
    waterCeiling:(x:number,z:number)=>api.water_ceiling(x,z),
    baseHeight:(z:number)=>api.channel_base_height(z),
    channelEdge: (side:number,z:number) => api.channel_edge(side,z),
    courseGrid: (nx:number,nz:number,x:number,z:number,dx:number,dz:number,time=api.simulation_time()) => {
      if (!Number.isInteger(nx)||!Number.isInteger(nz)||nx<=0||nz<=0||nx*nz>4096) throw new Error('Invalid course grid');
      const ptr=api.course_grid(nx,nz,x,z,dx,dz,time);if (!ptr) throw new Error('Invalid course grid');
      return new Float32Array(api.memory.buffer,ptr,nx*nz*7);
    },
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
