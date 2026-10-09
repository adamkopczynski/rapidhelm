import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { createSimulationFromBytes } from '../../../../packages/wasm-bridge/src/abi';
import { riverVenueSchema } from '@rapidhelm/content-schema';
import { initialVenue as venue } from './venue';
const load=async()=>createSimulationFromBytes(await readFile(new URL('../../../../packages/wasm-bridge/dist/simulation.wasm',import.meta.url)));
test('Paris content, course grid and rotated upstream currents agree with Rust',async()=>{
  const sim=await load();sim.configureVenue(venue);
  expect(sim.baseHeight(300)-sim.baseHeight(0)).toBeCloseTo(-4.5,10);
  expect(venue.gates).toHaveLength(20);expect(venue.gates.filter(g=>g.direction==='upstream')).toHaveLength(6);
  expect(venue.flow.speed*venue.water.depth*venue.metadata!.nominalWidth).toBeCloseTo(venue.metadata!.discharge);
  for(const progress of [40,100,125,150,200,250,299]) {
    const f=sim.channelFrame(0,progress), p=sim.channelFrame(f.x,f.z,true);
    expect(p.z).toBeCloseTo(progress,8);
    const grid=sim.courseGrid(1,1,0,progress,0,0,3);
    const centre=sim.channelFrame((sim.channelEdge(-1,progress)+sim.channelEdge(1,progress))/2,progress);
    const w=sim.sampleWater(centre.x,centre.z,3);
    expect(grid[0]).toBeCloseTo(w.height,5);expect(grid[1]).toBeCloseTo(w.velocityX,5);expect(grid[2]).toBeCloseTo(w.velocityZ,5);
  }
  for(const r of venue.regions.filter(r=>r.id.startsWith('eddy'))) {
    const f=sim.channelFrame(r.x,r.z),w=sim.sampleWater(f.x,f.z,3);
    expect(w.velocityX*Math.sin(f.yaw)+w.velocityZ*Math.cos(f.yaw)).toBeLessThan(-0.4);
    expect(Math.abs(sim.channelEdge(Math.sign(r.x),r.z))).toBe(10.5);
  }
  expect(riverVenueSchema.safeParse({...venue,geometry:{bendRadius:24,pockets:[]},bounds:{...venue.bounds,maxX:20}}).success).toBe(false);
  const before=sim.read();expect(()=>sim.configureVenue({...venue,geometry:{bendRadius:NaN,pockets:[]}})).toThrow('venue');expect(sim.read()).toEqual(before);
});
test('Paris compiled simulation stays clear of curved banks and baffles during a long replay',async()=>{
  const sim=await load();sim.configureVenue(venue);let maxProgress=5;
  for(let tick=0;tick<18000;tick++) {
    const current=sim.read().current,course=sim.channelFrame(current.x,current.z,true);
    // Deterministic controller follows centreline tangent, without bypassing dynamics.
    const error=Math.atan2(Math.sin(course.yaw-current.yaw),Math.cos(course.yaw-current.yaw));
    const s=sim.advance(1,1,Math.max(-1,Math.min(1,error*2-course.x*.12-current.yawRate*.6))).current;
    for(let i=0;i<=16;i++) {
      const d=1.48*(i/8-1),p=sim.channelFrame(s.x+d*Math.sin(s.yaw),s.z+d*Math.cos(s.yaw),true);
      expect(p.x-0.42).toBeGreaterThanOrEqual(sim.channelEdge(-1,p.z)-1e-5);
      expect(p.x+0.42).toBeLessThanOrEqual(sim.channelEdge(1,p.z)+1e-5);
      expect(p.z-0.42).toBeGreaterThanOrEqual(-1e-5);expect(p.z+0.42).toBeLessThanOrEqual(300+1e-5);
    }
    for(const o of venue.obstacles) {
      const f=sim.channelFrame(o.x,o.z),yaw=f.yaw+(o.yaw??0);
      for(let probe=0;probe<=32;probe++) {
        const d=1.48*(probe/16-1),dx=s.x+d*Math.sin(s.yaw)-f.x,dz=s.z+d*Math.cos(s.yaw)-f.z;
        const x=dx*Math.cos(yaw)-dz*Math.sin(yaw),z=dx*Math.sin(yaw)+dz*Math.cos(yaw);
        const outsideX=Math.max(0,Math.abs(x)-(o.width??0)/2),outsideZ=Math.max(0,Math.abs(z)-(o.length??0)/2);
        expect(Math.hypot(outsideX,outsideZ)).toBeGreaterThanOrEqual(0.42-1e-5);
      }
    }
    maxProgress=Math.max(maxProgress,course.z);
  }
  expect(maxProgress).toBeGreaterThan(240);
  sim.reset();expect(sim.channelFrame(sim.read().current.x,sim.read().current.z,true).z).toBeCloseTo(5,6);expect(sim.contacts()).toBe(0);
},60000);

test('Paris pools, fixed hydraulic crests, gradients and hanging gate envelope',async()=>{
  const sim=await load();sim.configureVenue(venue);
  for(const progress of [5,12,295,299]) {
    const f=sim.channelFrame(0,progress),a=sim.sampleWater(f.x,f.z,0),b=sim.sampleWater(f.x,f.z,5);
    expect(a.height).toBeCloseTo(progress<20 ? 4.5 : 0,10);expect(b.height).toBe(a.height);expect(a.waveStrength).toBe(0);
  }
  expect(sim.channelEdge(1,14)).toBeGreaterThan(16);expect(sim.channelEdge(1,286)).toBeGreaterThan(19);
  for(const progress of [35,40,66,70,150,195,258,286]) {
    const f=sim.channelFrame(1,progress),w=sim.sampleWater(f.x,f.z,2),eps=1e-4;
    expect(w.gradientX).toBeCloseTo((sim.sampleWater(f.x+eps,f.z,2).height-sim.sampleWater(f.x-eps,f.z,2).height)/(2*eps),3);
    expect(w.gradientZ).toBeCloseTo((sim.sampleWater(f.x,f.z+eps,2).height-sim.sampleWater(f.x,f.z-eps,2).height)/(2*eps),3);
  }
  const crest=sim.channelFrame(0,40),quiet=sim.channelFrame(0,55);
  expect(sim.sampleWater(crest.x,crest.z,0).waveStrength).toBeGreaterThan(.14);
  expect(sim.sampleWater(crest.x,crest.z,5).waveStrength).toBeGreaterThan(.14);
  expect(sim.sampleWater(quiet.x,quiet.z,0).waveStrength).toBeLessThan(.01);
  for(const g of venue.gates) for(const side of [-1,1]) {
    const f=sim.channelFrame(g.x+side*(g.width+.045)/2,g.z),ceiling=sim.waterCeiling(f.x,f.z);
    for(let i=0;i<20;i++) expect(ceiling+0.2-sim.sampleWater(f.x,f.z,i*.17).height).toBeGreaterThanOrEqual(.2-1e-8);
  }
  const before=sim.read();expect(()=>sim.configureVenue({...venue,hydraulics:{drops:[{z:34,height:-1,length:4}]}})).toThrow('venue');expect(sim.read()).toEqual(before);
  expect(riverVenueSchema.safeParse({...venue,gates:[{...venue.gates[0],width:4}]}).success).toBe(false);
});
