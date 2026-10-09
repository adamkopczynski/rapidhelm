import { z } from 'zod';
export const venueSchema = z.object({ version: z.literal(1), id: z.string().min(1), name: z.string().min(1), channelWidth: z.number().positive(), channelLength: z.number().positive() });
export type Venue = z.infer<typeof venueSchema>;
export const boatFields = {
  mass: { label: 'Mass', unit: 'kg', min: 40, max: 160, step: 1 },
  yawInertia: { label: 'Yaw inertia', unit: 'kg m²', min: 10, max: 180, step: 1 },
  forwardThrust: { label: 'Forward thrust', unit: 'N', min: 0, max: 800, step: 10 },
  reverseThrust: { label: 'Reverse thrust', unit: 'N', min: 0, max: 600, step: 10 },
  steeringTorque: { label: 'Steering torque', unit: 'N m', min: 0, max: 400, step: 5 },
  forwardDrag: { label: 'Forward drag', unit: 'N/(m/s)', min: 0, max: 500, step: 5 },
  lateralDrag: { label: 'Lateral drag', unit: 'N/(m/s)', min: 0, max: 2000, step: 10 },
  angularDamping: { label: 'Angular damping', unit: 'N m/(rad/s)', min: 0, max: 300, step: 5 },
} as const;
const bounded = (key: keyof typeof boatFields) => z.number().finite().min(boatFields[key].min).max(boatFields[key].max);
export const boatConfigSchema = z.object({ mass: bounded('mass'), yawInertia: bounded('yawInertia'), forwardThrust: bounded('forwardThrust'), reverseThrust: bounded('reverseThrust'), steeringTorque: bounded('steeringTorque'), forwardDrag: bounded('forwardDrag'), lateralDrag: bounded('lateralDrag'), angularDamping: bounded('angularDamping') }).strict();
export type BoatConfig = z.infer<typeof boatConfigSchema>;
export const boatPresetSchema = z.object({ version: z.literal(1), id: z.string().min(1), name: z.string().min(1), config: boatConfigSchema });

const finite = () => z.number().finite();
const obstacleSchema = z.object({ id: z.string().min(1), x: finite(), z: finite(), radius: finite().min(0.4).max(3), width:finite().min(0.6).max(6).optional(),length:finite().min(0.4).max(3).optional(),yaw:finite().optional() });
const flowRegionSchema = z.object({ id: z.string().min(1), x: finite(), z: finite(), radiusX: finite().min(1).max(10), radiusZ: finite().min(2).max(30), velocityX: finite().min(-5).max(5), velocityZ: finite().min(-5).max(5), swirl: finite().min(-3).max(3) });
export const riverVenueSchema = z.object({
  version: z.literal(2), id: z.string().min(1), name: z.string().min(1),
  geometry: z.object({ bendRadius: z.union([z.literal(0),finite().min(24).max(80)]), centerline:z.array(z.object({x:finite().min(-1000).max(1000),z:finite().min(-1000).max(1000)})).min(4).max(12).optional(), pools:z.object({startWidth:finite().min(16).max(44),finishWidth:finite().min(16).max(44),length:finite().min(20).max(40)}).optional(), pockets: z.array(z.object({z:finite(),length:finite().min(4).max(14),expansion:finite().min(0).max(3),side:z.union([z.literal(-1),z.literal(1)])})).max(16) }).optional(),
  metadata: z.object({ competitionLength:finite().positive(), nominalWidth:finite().positive(), drop:finite().positive(), discharge:finite().positive(), trainingLength:finite().positive(), trainingDischarge:finite().positive(), regattaLength:finite().positive(), spectators:z.number().int().positive() }).optional(),
  gates: z.array(z.object({id:z.number().int().min(1),x:finite(),z:finite(),width:finite().min(1.2).max(3.5),direction:z.enum(['upstream','downstream'])})).max(25).default([]),
  bounds: z.object({ minX: finite(), maxX: finite(), minZ: finite(), maxZ: finite() }),
  start: z.object({ x: finite(), z: finite(), yaw: finite() }),
  flow: z.object({ speed: finite().min(0).max(8), startZ: finite(), rampLength: finite().min(2).max(100) }),
  water: z.object({ waveStartZ: finite(), amplitude: finite().min(0).max(0.6), wavelength: finite().min(4).max(20), frequency: finite().min(0.1).max(4), slope: finite().min(0).max(0.025), depth: finite().min(0.8).max(5) }),
  hydraulics:z.object({drops:z.array(z.object({z:finite(),height:finite().min(0.1).max(0.9),length:finite().min(2).max(8)})).min(1).max(16)}).optional(),
  obstacles: z.array(obstacleSchema).max(16), regions: z.array(flowRegionSchema).max(16),
}).superRefine((v, context) => {
  const fail = (message: string) => context.addIssue({ code: 'custom', message });
  const b = v.bounds, f = v.flow, w = v.water;
  if (b.maxX - b.minX < 8 || b.maxX - b.minX > 100 || b.maxZ - b.minZ < 40 || b.maxZ - b.minZ > 1000) fail('Invalid channel dimensions');
  if (f.startZ < b.minZ + 5 || f.startZ + f.rampLength > b.maxZ || w.waveStartZ < f.startZ + f.rampLength || w.waveStartZ > b.maxZ - 5) fail('Flow and waves must follow the calm pool inside the venue');
  const ex = 0.42 + 1.48 * Math.abs(Math.sin(v.start.yaw)), ez = 0.42 + 1.48 * Math.abs(Math.cos(v.start.yaw));
  if (v.start.x - ex < b.minX || v.start.x + ex > b.maxX || v.start.z - ez < b.minZ || v.start.z + ez >= f.startZ) fail('Start must fit the full hull in the calm pool');
  if (v.geometry) {
    const g=v.geometry;
    if (b.minZ!==0 || b.minX!==-b.maxX || (!g.centerline && (g.bendRadius===0 || b.maxX>g.bendRadius*0.3 || b.maxZ<Math.PI*g.bendRadius+40))) fail('Invalid curved channel');
    for (const p of g.pockets) if (p.z-p.length<f.startZ+f.rampLength || p.z+p.length>b.maxZ-3) fail('Pocket outside flowing channel');
  }
  if(v.hydraulics) {
    let previous=0;
    for(const d of v.hydraulics.drops) {if(d.z<f.startZ+f.rampLength || d.z<previous || d.z+d.length>b.maxZ-(v.geometry?.pools?.length??0)) fail('Invalid drop profile'); previous=d.z+d.length+8;}
    if(v.metadata && Math.abs(v.hydraulics.drops.reduce((sum,d)=>sum+d.height,0)-v.metadata.drop)>1e-6) fail('Drop profile must match venue elevation change');
  }
  if (new Set(v.gates.map(g=>g.id)).size!==v.gates.length) fail('Gate IDs must be unique');
  for (const g of v.gates) if (g.x-g.width/2<b.minX || g.x+g.width/2>b.maxX || g.z<f.startZ+f.rampLength || g.z>b.maxZ-3) fail('Gate outside course');
  const ids = [...v.obstacles, ...v.regions].map((item) => item.id);
  if (new Set(ids).size !== ids.length) fail('Feature IDs must be unique');
  v.obstacles.forEach((o, index) => {
    if (o.x - o.radius < b.minX + 0.5 || o.x + o.radius > b.maxX - 0.5 || o.z - o.radius < f.startZ + f.rampLength || o.z + o.radius > b.maxZ - 3) fail('Obstacle outside the downstream channel');
    if(o.width && (!o.length || o.radius+1e-9<Math.hypot(o.width/2,o.length/2))) fail('Block footprint must fit its bounding radius');
    if(!o.width && (o.length!==undefined || o.yaw!==undefined)) fail('Incomplete block footprint');
    for (const other of v.obstacles.slice(0, index)) if (Math.hypot(o.x - other.x, o.z - other.z) < o.radius + other.radius + 3.8) fail('Obstacles need hull clearance');
  });
  for (const r of v.regions) if (r.x - r.radiusX < b.minX || r.x + r.radiusX > b.maxX || r.z - r.radiusZ < f.startZ + f.rampLength || r.z + r.radiusZ > b.maxZ) fail('Flow region outside the downstream channel');
});
export type RiverVenue = z.infer<typeof riverVenueSchema>;
