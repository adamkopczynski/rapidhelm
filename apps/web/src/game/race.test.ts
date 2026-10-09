import { expect,test } from 'vitest';
import { createRace,type RaceGate } from './race';
const boat=(x:number,z:number,yaw=0)=>({x,z,yaw,velocityX:0,velocityZ:0,yawRate:0});
const gate=(id:number,z:number,direction:RaceGate['direction']='downstream'):RaceGate=>({id,x:0,z,yaw:0,width:3,direction});
test('direction, ordering, penalties, finish and restart',()=>{
 const race=createRace([gate(1,10),gate(2,20,'upstream'),gate(3,30)],40);
 race.step(boat(0,9),boat(0,11),1,1,11);
 expect(race.snapshot()).toMatchObject({phase:'racing',elapsed:.5,nextId:2,passed:1,penalty:0});
 race.step(boat(3,19),boat(3,24),2,1,21);expect(race.snapshot().nextId).toBe(2);
 race.step(boat(3,24),boat(0,24),2.5,.5,21);
 race.step(boat(0,24),boat(0,19),3,1,19);expect(race.snapshot().nextId).toBe(3);
 race.step(boat(1.3,29),boat(1.3,31),4,1,31);expect(race.snapshot().penalty).toBe(2);
 race.step(boat(1.3,31),boat(1.3,32),5,1,32);expect(race.snapshot().penalty).toBe(2);
 race.step(boat(0,39),boat(0,41),6,1,41);expect(race.snapshot()).toMatchObject({phase:'finished',passed:3,penalty:2,total:7.5});
 race.step(boat(0,39),boat(0,41),10,1,41);expect(race.snapshot().total).toBe(7.5);
 race.reset();expect(race.snapshot()).toMatchObject({phase:'ready',penalty:0,passed:0,elapsed:0});
});
test('miss replaces touch penalty and later gates close skipped gates',()=>{
 const race=createRace([gate(1,10),gate(2,20)],30);
 race.step(boat(1.7,9),boat(1.7,11),1,1,11);expect(race.snapshot().penalty).toBe(2);
 race.step(boat(0,19),boat(0,21),2,1,21);expect(race.snapshot()).toMatchObject({penalty:50,missed:1,passed:1});
 race.step(boat(0,29),boat(0,31),3,1,31);expect(race.snapshot().total).toBe(52.5);
});
test('rotated gate uses swept crossings, including fast pole contacts',()=>{
 const g={...gate(1,0),x:10,yaw:Math.PI/2};const race=createRace([g],100);
 race.step(boat(5,0,Math.PI/2),boat(15,0,Math.PI/2),1,1,15);expect(race.snapshot().passed).toBe(1);
 const touched=createRace([g],100);
 touched.step(boat(5,1.3,Math.PI/2),boat(15,1.3,Math.PI/2),1,1,15);expect(touched.snapshot().penalty).toBe(2);
});
test('finish closes remaining gates and backwards start does not start clock',()=>{
 const race=createRace([gate(1,10),gate(2,20)],30);
 race.step(boat(0,11),boat(0,9),1,1,9);expect(race.snapshot().phase).toBe('ready');
 race.step(boat(0,9),boat(0,11),2,1,11);
 race.step(boat(3,29),boat(3,31),3,1,31);expect(race.snapshot()).toMatchObject({phase:'finished',missed:1,penalty:50});
});

test('race judging receives every real WASM tick identically at 30/60/144 Hz',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {createSimulationFromBytes}=await import('../../../../packages/wasm-bridge/src/abi');
 const {createRuntime}=await import('./runtime');const {baseline}=await import('./config');
 const {initialVenue}=await import('./venue');let reference:ReturnType<ReturnType<typeof createRace>['snapshot']>|undefined;
 const bytes=await readFile(new URL('../../../../packages/wasm-bridge/dist/simulation.wasm',import.meta.url));
 for(const fps of [30,60,144]) {
   const sim=await createSimulationFromBytes(bytes);let race:ReturnType<typeof createRace>,ticks=0;
   const runtime=createRuntime(sim,baseline.config,initialVenue,(a,b,time,dt)=>{ticks++;race.step(a,b,time,dt,sim.channelFrame(b.x,b.z,true).z);});
   race=createRace(initialVenue.gates.map(g=>({...g,progress:g.z,...sim.channelFrame(g.x,g.z)})),294);
   for(let frame=0;frame<fps*10;frame++)runtime.update(1/fps,{throttle:1,steering:0});
   expect(ticks).toBe(1200);const result=race.snapshot();expect(result.phase).toBe('racing');
   if(reference)expect(result).toEqual(reference);else reference=result;
   runtime.reset();race.reset();expect(race.snapshot().elapsed).toBe(0);
 }
});

test('wrong direction incurs a miss and authored recovery window advances guidance',()=>{
 const race=createRace([gate(1,10),{...gate(2,20,'upstream'),progress:20}],50);
 race.step(boat(0,9),boat(0,11),1,1,11);
 race.step(boat(0,19),boat(0,21),2,1,21);expect(race.snapshot()).toMatchObject({missed:1,penalty:50});
 const recovery=createRace([{...gate(1,10),progress:10},gate(2,30)],50);
 recovery.step(boat(3,9),boat(3,11),1,1,11);
 recovery.step(boat(3,23),boat(3,25),2,1,25);expect(recovery.snapshot().nextId).toBe(2);
});
