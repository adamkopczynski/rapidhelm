import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder';
import { CreateLines } from '@babylonjs/core/Meshes/Builders/linesBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import type { Scene } from '@babylonjs/core/scene';
import type { Simulation } from '@rapidhelm/wasm-bridge';
import type { RiverVenue } from '@rapidhelm/content-schema';
const NX = 17, NZ = 221;
export function createVenueScene(scene: Scene, sim: Simulation, venue: RiverVenue) {
  const b = venue.bounds, width = b.maxX - b.minX, length = b.maxZ - b.minZ;
  const frame=(x:number,z:number)=>sim.channelFrame(x,z);
  const place=(mesh:Mesh,x:number,z:number,y:number) => {const f=frame(x,z);mesh.position.set(f.x,y,f.z);mesh.rotation.y=f.yaw;};
  const height=(_x:number,z:number)=>sim.baseHeight(z);
  const dx = width / (NX - 1), dz = length / (NZ - 1);
  const material = (name: string, color: Color3) => { const m = new StandardMaterial(name, scene); m.diffuseColor = color; m.specularColor = new Color3(0.05, 0.05, 0.05); return m; };
  const concrete = material('channel concrete', new Color3(0.48, 0.51, 0.48));
  const walkway = material('warm stone walkway', new Color3(0.68, 0.65, 0.54));
  const grass = material('grass', new Color3(0.28, 0.4, 0.2));
  const rockMat = material('wet rock', new Color3(0.31, 0.35, 0.31));
  const startMat = material('start line', new Color3(0.78, 0.95, 0.48));
  const surroundings = CreateBox('surroundings', { width: 240, height: 0.5, depth: 260 }, scene); surroundings.position.set(30, -7, 65); surroundings.material = grass;
  // All authored geometry follows Rust's surface height; no second slope implementation.
  function bankStrip(side:number, path:boolean) {
    const p:number[]=[], indices:number[]=[], n:number[]=[];
    const rows=201;
    for(let row=0;row<rows;row++) {
      const z=b.minZ+length*row/(rows-1),edge=sim.channelEdge(side,z),y=height(0,z);
      const corners=path ? [[edge+side*1,y+0.88],[edge+side*5,y+0.88]] : [[edge,y-1.8],[edge,y+1],[edge+side,y+1],[edge+side,y-1.8]];
      for(const [x,h] of corners) {const f=frame(x,z);p.push(f.x,h,f.z);}
      if(row>0) for(let face=0;face<corners.length-(path ? 1:0);face++) {
        const next=(face+1)%corners.length, a=(row-1)*corners.length+face,c=(row-1)*corners.length+next;
        const d=row*corners.length+face,e=row*corners.length+next;indices.push(a,d,c,c,d,e);
      }
    }
    if(side>0) for(let i=0;i<indices.length;i+=3) [indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    VertexData.ComputeNormals(p,indices,n);
    const mesh=new Mesh(path ? 'continuous walkway':'colliding concrete bank',scene);
    const data=new VertexData();data.positions=p;data.indices=indices;data.normals=n;data.applyToMesh(mesh);
    mesh.material=path ? walkway:concrete;mesh.material.backFaceCulling=false;
  }
  for(const side of [-1,1]) {bankStrip(side,false);bankStrip(side,true);}
  for (const z of [b.minZ, b.maxZ]) {
    const wall = CreateBox('end boundary', { width: width + 2, height: 2.8, depth: 1 }, scene); place(wall,0,z+(z===b.minZ ? -0.5 : 0.5),height(0,z)-0.4); wall.material = concrete;
  }
  const startLine = CreateBox('start pool stripe', { width: width - 0.5, height: 0.025, depth: 0.2 }, scene); place(startLine,0,venue.start.z-2.2,0.015); startLine.material = startMat;
  function label(text: string, x: number, z: number, color: string) {
    const texture = new DynamicTexture(text, { width: 512, height: 128 }, scene, false);
    texture.drawText(text, null, 85, 'bold 44px sans-serif', color, '#162c32', true);
    const sign = CreatePlane(text, { width: 4, height: 1 }, scene); place(sign,x,z,height(x,z)+2.2); sign.billboardMode = Mesh.BILLBOARDMODE_Y;
    const mat = new StandardMaterial(`${text} material`, scene); mat.diffuseTexture = texture; mat.emissiveColor = Color3.White(); mat.disableLighting = true; sign.material = mat;
  }
  label('START POOL', b.minX + 1, venue.start.z + 1, '#c8f078');
  label('CATCH THE FLOW', b.maxX + 2, venue.flow.startZ + venue.flow.rampLength, '#b7edf3');
  for (const r of venue.regions) label('UPSTREAM EDDY', r.x < 0 ? b.minX - 2 : b.maxX + 2, r.z, '#c5c4ff');
  label('CHANNEL END', b.minX - 2, b.maxZ - 5, '#b7edf3');
  const baffleMat=material('modular baffle shell',new Color3(0.68,0.73,0.72));
  for (const o of venue.obstacles) {
    const y=height(o.x,o.z);
    const block=CreateCylinder(o.id,{diameter:o.radius*2,height:1.7,tessellation:12},scene);
    place(block,o.x,o.z,y+0.15);block.material=baffleMat;
    const cap=CreateBox('baffle insert',{width:o.radius*1.3,depth:o.radius*1.3,height:0.12},scene);
    place(cap,o.x,o.z,y+1.06);cap.material=rockMat;
    const rail=CreateBox('submerged mounting rail',{width:0.12,depth:4,height:0.06},scene);
    place(rail,o.x,o.z,y-0.45);rail.material=rockMat;
  }
  const white=material('white gate bands',Color3.White());
  const red=material('upstream gate',new Color3(0.88,0.16,0.12));
  const green=material('downstream gate',new Color3(0.04,0.55,0.28));
  for (const gate of venue.gates) {
    const y=height(gate.x,gate.z);
    for (const side of [-1,1]) for (let band=0;band<6;band++) {
      const pole=CreateCylinder('gate '+gate.id,{diameter:0.09,height:0.48,tessellation:8},scene);
      place(pole,gate.x+side*gate.width/2,gate.z,y+0.25+band*0.48);
      pole.material=band%2===0 ? (gate.direction==='upstream' ? red : green):white;
    }
    const cable=CreateBox('gate suspension',{width:width+8,height:0.025,depth:0.025},scene);
    place(cable,0,gate.z,y+3.4);cable.material=rockMat;
    const texture=new DynamicTexture('gate number '+gate.id,{width:128,height:128},scene,false);
    texture.drawText(String(gate.id),null,90,'bold 76px sans-serif','#162c32','#f0f3e9',true);
    const number=CreatePlane('gate number '+gate.id,{width:0.65,height:0.65},scene);
    place(number,gate.x,gate.z,y+3.25);number.billboardMode=Mesh.BILLBOARDMODE_Y;
    const mat=material('number',Color3.White());mat.diffuseTexture=texture;number.material=mat;
  }
  if (venue.geometry) {
    const lake=CreateBox('regatta lake context',{width:85,depth:240,height:0.05},scene);
    lake.position.set(-68,-5.2,65);lake.material=material('flatwater',new Color3(0.12,0.36,0.44));
    const building=CreateBox('venue facilities proxy',{width:16,depth:75,height:4},scene);
    building.position.set(-25,-1,52);building.material=concrete;
    for (let tier=0;tier<5;tier++) {
      const stand=CreateBox('spectator terrace',{width:3,depth:70,height:0.5},scene);
      stand.position.set(76+tier*3,-2+tier*0.6,55);stand.material=walkway;
    }
    label('VAIRES-SUR-MARNE',-16,10,'#e5f4ee');
  }
  const count = NX * NZ, positions = new Float32Array(count * 3), normals = new Float32Array(count * 3), colors = new Float32Array(count * 4), indices: number[] = [];
  for (let row = 0; row < NZ; row++) for (let col = 0; col < NX; col++) {
    const i = row * NX + col; const progress=b.minZ+row*dz, t=col/(NX-1), offset=sim.channelEdge(-1,progress)*(1-t)+sim.channelEdge(1,progress)*t;
    const f=frame(offset,progress);positions[i*3]=f.x;positions[i*3+2]=f.z; normals[i * 3 + 1] = 1; colors[i * 4 + 3] = 1;
    if (row < NZ - 1 && col < NX - 1) indices.push(i, i + NX, i + 1, i + 1, i + NX, i + NX + 1);
  }
  const water = new Mesh('Rust-sampled river surface', scene); const data = new VertexData(); data.positions = positions; data.normals = normals; data.colors = colors; data.indices = indices; data.applyToMesh(water, true);
  const waterMat = material('moving river water', Color3.White()); waterMat.specularColor = new Color3(0.3, 0.48, 0.52); waterMat.specularPower = 90; waterMat.backFaceCulling = false; water.material = waterMat;
  let grid = sim.courseGrid(NX, NZ, b.minX, b.minZ, dx, dz, 0);
  function gridValue(x: number, z: number, field: number) {
    const left=sim.channelEdge(-1,z), right=sim.channelEdge(1,z);
    const gx = Math.max(0, Math.min(NX - 1.00001, (x - left)/(right-left)*(NX-1))), gz = Math.max(0, Math.min(NZ - 1.00001, (z - b.minZ) / dz));
    const col = Math.floor(gx), row = Math.floor(gz), tx = gx - col, tz = gz - row;
    const i = (row * NX + col) * 5 + field;
    const a = grid[i] * (1 - tx) + grid[i + 5] * tx, c = grid[i + NX * 5] * (1 - tx) + grid[i + (NX + 1) * 5] * tx;
    return a * (1 - tz) + c * tz;
  }
  const foam = CreateDisc('flow foam', { radius: 0.5, tessellation: 8 }, scene); foam.bakeTransformIntoVertices(Matrix.RotationX(Math.PI / 2));
  const foamMat = material('foam', new Color3(0.8, 0.93, 0.9)); foamMat.emissiveColor = new Color3(0.25, 0.3, 0.3); foamMat.alpha = 0.7; foam.material = foamMat;
  const foamCount = 230, matrices = new Float32Array(foamCount * 16);
  const flakes = Array.from({ length: foamCount }, (_, i) => ({ x: b.minX + 0.8 + ((i * 0.61803398875) % 1) * (width - 1.6), z: venue.flow.startZ + ((i * 0.381966) % 1) * (b.maxZ - venue.flow.startZ - 1) }));
  const scale = new Vector3(), rotation = new Quaternion(), position = new Vector3(), matrix = new Matrix();
  foam.thinInstanceSetBuffer('matrix', matrices, 16, false);
  foam.setBoundingInfo(new BoundingInfo(new Vector3(-20,-10,-5),new Vector3(100,5,180)));
  const arrows: { x: number; z: number; points: Vector3[]; mesh: ReturnType<typeof CreateLines> }[] = [];
  for (let z = venue.flow.startZ + 8; z < b.maxZ - 3; z += 14) for (const x of [-5, 0, 5]) {
    if (x <= b.minX + 1 || x >= b.maxX - 1) continue;
    const points = Array.from({ length: 5 }, () => new Vector3());
    const mesh = CreateLines('sampled flow arrow', { points, updatable: true }, scene); mesh.color = new Color3(0.65, 0.93, 0.95); arrows.push({ x, z, points, mesh });
  }
  let lastTime = -1;
  return {
    update(time: number, delta: number, debug: boolean) {
      // Mesh upload at 30 Hz; boat sampling/physics continue at their normal cadence.
      if (time - lastTime >= 1 / 30 || time < lastTime || lastTime < 0) {
        grid = sim.courseGrid(NX, NZ, b.minX, b.minZ, dx, dz, time); lastTime = time;
        for (let i = 0; i < count; i++) {
          positions[i * 3 + 1] = grid[i * 5]; const gx = grid[i * 5 + 3], gz = grid[i * 5 + 4], inv = 1 / Math.hypot(gx, 1, gz);
          normals[i * 3] = -gx * inv; normals[i * 3 + 1] = inv; normals[i * 3 + 2] = -gz * inv;
          const whiteness = Math.min(0.5, Math.abs(gz) * 1.4 + Math.abs(gx) * 0.35);
          colors[i * 4] = 0.13 + whiteness; colors[i * 4 + 1] = 0.32 + whiteness * 0.7; colors[i * 4 + 2] = 0.3 + whiteness * 0.6;
        }
        water.updateVerticesData(VertexBuffer.PositionKind, positions); water.updateVerticesData(VertexBuffer.NormalKind, normals); water.updateVerticesData(VertexBuffer.ColorKind, colors);
      }
      for (let i = 0; i < foamCount; i++) {
        const f = flakes[i]; const vx = gridValue(f.x, f.z, 1), vz = gridValue(f.x, f.z, 2);
        const mapped=frame(f.x,f.z), sin=Math.sin(mapped.yaw), cos=Math.cos(mapped.yaw);
        f.x += (vx*cos-vz*sin)*delta;
        const metric=venue.geometry && mapped.yaw>0 && mapped.yaw<Math.PI ? 1-f.x/venue.geometry.bendRadius : 1;
        f.z += (vx*sin+vz*cos)*delta/metric;
        if (f.x < sim.channelEdge(-1,f.z)+0.4 || f.x > sim.channelEdge(1,f.z)-0.4 || f.z > b.maxZ - 0.5 || f.z < venue.flow.startZ) { f.x = b.minX + 0.8 + ((i * 0.61803398875) % 1) * (width - 1.6); f.z = venue.flow.startZ + 2; }
        const hidden = venue.obstacles.some((o) => Math.hypot(f.x - o.x, f.z - o.z) < o.radius);
        scale.set(hidden ? 0 : 0.1, 1, 0.25 + Math.hypot(vx, vz) * 0.14);
        Quaternion.FromEulerAnglesToRef(0, Math.atan2(vx, vz), 0, rotation);
        const world=frame(f.x,f.z);position.set(world.x, gridValue(f.x, f.z, 0) + 0.04, world.z); Matrix.ComposeToRef(scale, rotation, position, matrix); matrix.copyToArray(matrices, i * 16);
      }
      foam.thinInstanceBufferUpdated('matrix');
      for (const a of arrows) {
        a.mesh.setEnabled(debug); if (!debug) continue;
        const vx = gridValue(a.x, a.z, 1), vz = gridValue(a.x, a.z, 2), magnitude = Math.hypot(vx, vz);
        const sx = vx / Math.max(magnitude, 0.01), sz = vz / Math.max(magnitude, 0.01), len = Math.min(2.2, magnitude * 0.8);
        const world=frame(a.x,a.z);
        const y = gridValue(a.x, a.z, 0) + 0.15, tx = world.x + sx * len, tz = world.z + sz * len;
        a.points[0].set(world.x, y, world.z); a.points[1].set(tx, y, tz); a.points[2].set(tx - sx * 0.4 + sz * 0.2, y, tz - sz * 0.4 - sx * 0.2); a.points[3].copyFrom(a.points[1]); a.points[4].set(tx - sx * 0.4 - sz * 0.2, y, tz - sz * 0.4 + sx * 0.2);
        CreateLines('sampled flow arrow', { points: a.points, instance: a.mesh }, scene);
      }
    },
  };
}
