import { createRiverMaterial } from './riverMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
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
const NX = 13, NZ = 301;
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
  if(venue.geometry?.centerline) {
    const positions:number[]=[30,2.5,50],indices:number[]=[],normals:number[]=[];
    for(let i=0;i<=100;i++) {
      const z=length*i/100, f=frame(sim.channelEdge(-1,z)-5,z);
      positions.push(f.x,sim.baseHeight(z)+0.8,f.z);
      if(i>0) indices.push(0,i,i+1);
    }
    indices.push(0,101,1);VertexData.ComputeNormals(positions,indices,normals);
    const island=new Mesh('graded central island',scene),data=new VertexData();
    data.positions=positions;data.indices=indices;data.normals=normals;data.applyToMesh(island);
    island.material=grass;grass.backFaceCulling=false;
  }
  for (const z of [b.minZ, b.maxZ]) {
    const wall = CreateBox('end boundary', { width: sim.channelEdge(1,z)-sim.channelEdge(-1,z)+2, height: 2.8, depth: 1 }, scene); place(wall,0,z+(z===b.minZ ? -0.5 : 0.5),height(0,z)-0.4); wall.material = concrete;
  }
  const startLine = CreateBox('start pool stripe', { width: width - 0.5, height: 0.025, depth: 0.2 }, scene); place(startLine,0,venue.start.z-2.2,sim.baseHeight(venue.start.z)+0.015); startLine.material = startMat;
  function label(text: string, x: number, z: number, color: string) {
    const texture = new DynamicTexture(text, { width: 512, height: 128 }, scene, false);
    texture.drawText(text, null, 85, 'bold 44px sans-serif', color, '#162c32', true);
    const sign = CreatePlane(text, { width: 4, height: 1 }, scene); place(sign,x,z,height(x,z)+2.2); sign.billboardMode = Mesh.BILLBOARDMODE_Y;
    const mat = new StandardMaterial(`${text} material`, scene); mat.diffuseTexture = texture; mat.emissiveColor = Color3.White(); mat.disableLighting = true; sign.material = mat;
  }
  label('START POOL', b.minX + 1, venue.start.z + 1, '#c8f078');
  label('CATCH THE FLOW', b.maxX + 2, venue.flow.startZ + venue.flow.rampLength, '#b7edf3');
  for (const r of venue.regions.filter(r=>r.velocityZ<0)) label('UPSTREAM EDDY', r.x < 0 ? b.minX - 2 : b.maxX + 2, r.z, '#c5c4ff');
  label('FINISH POOL', b.minX - 2, b.maxZ - 5, '#b7edf3');
  const baffleMat=material('blue modular baffle',new Color3(0.035,0.43,0.79));
  const baffleTop=material('baffle blue cap',new Color3(0.09,0.57,0.87));
  for (const o of venue.obstacles) {
    const y=height(o.x,o.z);
    // Joined moulded modules fill one shared physical footprint: seams cannot trap the hull.
    const modules=o.width ? Math.ceil(o.width/1.5) : 1, moduleWidth=(o.width??o.radius*2)/modules;
    for(let module=0;module<modules;module++) {
      const root=new TransformNode(`${o.id} assembly`,scene),f=frame(o.x,o.z);
      root.position.set(f.x,y+(o.submerged ? -.95 : .1),f.z);root.rotation.y=f.yaw+(o.yaw??0);
      const block=CreateBox(`${o.id} module ${module}`,{width:moduleWidth,depth:o.length??o.radius*2,height:1.2},scene);
      block.parent=root;block.position.x=-(o.width??moduleWidth)/2+moduleWidth*(module+.5);block.material=baffleMat;
      const cap=CreateBox('moulded blue cap',{width:moduleWidth-.025,depth:(o.length??1)-.025,height:.08},scene);
      cap.parent=block;cap.position.y=.64;cap.material=baffleTop;
      for(let rib=0;rib<3;rib++) {
        const mould=CreateBox('module reinforcement',{width:.055,height:.94,depth:.065},scene);
        mould.parent=block;mould.position.set(-moduleWidth/2+.2+rib*(moduleWidth-.4)/2,0,-(o.length??1)/2);mould.material=baffleTop;
      }
    }
    const rail=CreateBox('submerged mounting rail',{width:0.12,depth:4,height:0.06},scene);
    place(rail,o.x,o.z,y-0.45);rail.material=rockMat;
  }
  const white=material('white gate bands',Color3.White());
  const red=material('upstream gate',new Color3(0.88,0.16,0.12));
  const green=material('downstream gate',new Color3(0.04,0.55,0.28));
  function placeHolder(node:TransformNode,x:number,y:number,z:number,yaw:number){node.position.set(x,y,z);node.rotation.y=yaw;}
  const gateDiameter=0.045, poleLength=1.8, clearance=0.23;
  const hanging: {node:TransformNode;phase:number}[]=[];
  for (const gate of venue.gates) {
    const supports:{x:number;bottom:number}[]=[];
    for (const side of [-1,1]) {
      // Authored width measures the gap between inside edges, not pole centres.
      const x=gate.x+side*(gate.width+gateDiameter)/2;
      const f=frame(x,gate.z),bottom=sim.waterCeiling(f.x,f.z)+clearance;
      supports.push({x,bottom});
      const hanger=new TransformNode(`pole hanger ${gate.id}`,scene);
      placeHolder(hanger,f.x,bottom+poleLength,f.z,f.yaw);
      hanging.push({node:hanger,phase:gate.id*1.7+side});
      for (let band=0;band<9;band++) {
        const pole=CreateCylinder('gate '+gate.id,{diameter:gateDiameter,height:0.2,tessellation:8},scene);
        place(pole,x,gate.z,bottom+0.1+band*0.2);
        pole.parent=hanger;pole.position.set(0,-poleLength+0.1+band*0.2,0);pole.rotation.y=0;
        pole.material=band%2===0 ? white:(gate.direction==='upstream' ? red:green);
      }
      const tip=CreateCylinder('black gate tip',{diameter:gateDiameter+0.001,height:0.022,tessellation:8},scene);
      place(tip,x,gate.z,bottom+0.011);tip.material=rockMat;tip.parent=hanger;tip.position.set(0,-poleLength+0.011,0);
    }
    const cableHeight=Math.max(...supports.map(p=>p.bottom))+poleLength+0.4;
    const left=sim.channelEdge(-1,gate.z)-3,right=sim.channelEdge(1,gate.z)+3;
    const cable=CreateBox('gate suspension',{width:right-left,height:0.015,depth:0.015},scene);
    place(cable,(left+right)/2,gate.z,cableHeight);cable.material=rockMat;
    for(const p of supports) {
      const length=cableHeight-p.bottom-poleLength;
      const cord=CreateCylinder('individual gate cord',{diameter:0.008,height:length,tessellation:4},scene);
      place(cord,p.x,gate.z,p.bottom+poleLength+length/2);cord.material=rockMat;
    }
    const texture=new DynamicTexture('gate number '+gate.id,{width:128,height:128},scene,false);
    texture.drawText(String(gate.id),null,90,'bold 76px sans-serif','#162c32','#f0f3e9',true);
    const number=CreatePlane('gate number '+gate.id,{width:0.3,height:0.3},scene);
    place(number,gate.x,gate.z,cableHeight-0.2);number.billboardMode=Mesh.BILLBOARDMODE_Y;hanging.push({node:number,phase:gate.id*.8});
    const mat=material('number',Color3.White());mat.diffuseTexture=texture;number.material=mat;
  }
  if (venue.geometry) {
    const lake=CreateBox('regatta lake context',{width:85,depth:240,height:0.05},scene);
    lake.position.set(-68,0,35);lake.material=material('flatwater',new Color3(0.12,0.36,0.44));
    const building=CreateBox('venue facilities proxy',{width:24,depth:14,height:4},scene);
    building.position.set(32,2,-30);building.material=concrete;
    for (let tier=0;tier<5;tier++) {
      const stand=CreateBox('spectator terrace',{width:3,depth:70,height:0.5},scene);
      stand.position.set(-35-tier*3,1+tier*0.6,50);stand.material=walkway;
    }
    label('VAIRES-SUR-MARNE',-16,10,'#e5f4ee');
    for(const [text,z] of [['HIGH START · +4.5 m',8],['LOW FINISH · 0 m',293]] as const) label(text,0,z,'#e5f4ee');
  }
  const count = NX * NZ, positions = new Float32Array(count * 3), normals = new Float32Array(count * 3), colors = new Float32Array(count * 4), indices: number[] = [];
  for (let row = 0; row < NZ; row++) for (let col = 0; col < NX; col++) {
    const i = row * NX + col; const progress=b.minZ+row*dz, t=col/(NX-1), offset=sim.channelEdge(-1,progress)*(1-t)+sim.channelEdge(1,progress)*t;
    const f=frame(offset,progress);positions[i*3]=f.x;positions[i*3+2]=f.z; normals[i * 3 + 1] = 1; colors[i * 4 + 3] = 1;
    if (row < NZ - 1 && col < NX - 1) indices.push(i, i + NX, i + 1, i + 1, i + NX, i + NX + 1);
  }
  const water = new Mesh('Rust-sampled river surface', scene); const data = new VertexData(); data.positions = positions; data.normals = normals; data.colors = colors; data.indices = indices; data.applyToMesh(water, true);
  const riverMaterial=createRiverMaterial(scene);water.material=riverMaterial.material;
  let grid = sim.courseGrid(NX, NZ, b.minX, b.minZ, dx, dz, 0);
  function gridValue(x: number, z: number, field: number) {
    const left=sim.channelEdge(-1,z), right=sim.channelEdge(1,z);
    const gx = Math.max(0, Math.min(NX - 1.00001, (x - left)/(right-left)*(NX-1))), gz = Math.max(0, Math.min(NZ - 1.00001, (z - b.minZ) / dz));
    const col = Math.floor(gx), row = Math.floor(gz), tx = gx - col, tz = gz - row;
    const i = (row * NX + col) * 7 + field;
    const a = grid[i] * (1 - tx) + grid[i + 7] * tx, c = grid[i + NX * 7] * (1 - tx) + grid[i + (NX + 1) * 7] * tx;
    return a * (1 - tz) + c * tz;
  }
  const foam = CreateDisc('flow foam', { radius: 0.5, tessellation: 8 }, scene); foam.bakeTransformIntoVertices(Matrix.RotationX(Math.PI / 2));
  const foamMat = material('foam', new Color3(0.8, 0.93, 0.9)); foamMat.emissiveColor = new Color3(0.25, 0.3, 0.3); foamMat.alpha = 0.7; foam.material = foamMat;
  const foamCount = 1600, matrices = new Float32Array(foamCount * 16);
  const flakes = Array.from({ length: foamCount }, (_, i) => ({ x: b.minX + 0.8 + ((i * 0.61803398875) % 1) * (width - 1.6), z: venue.flow.startZ + ((i * 0.381966) % 1) * (b.maxZ - venue.flow.startZ - 1) }));
  const scale = new Vector3(), rotation = new Quaternion(), position = new Vector3(), matrix = new Matrix();
  foam.thinInstanceSetBuffer('matrix', matrices, 16, false);
  foam.setBoundingInfo(new BoundingInfo(new Vector3(-20,-10,-5),new Vector3(110,10,180)));
  const arrows: { x: number; z: number; points: Vector3[]; mesh: ReturnType<typeof CreateLines> }[] = [];
  for (let z = venue.flow.startZ + 8; z < b.maxZ - 3; z += 14) for (const x of [-5, 0, 5]) {
    if (x <= b.minX + 1 || x >= b.maxX - 1) continue;
    const points = Array.from({ length: 5 }, () => new Vector3());
    const mesh = CreateLines('sampled flow arrow', { points, updatable: true }, scene); mesh.color = new Color3(0.65, 0.93, 0.95); arrows.push({ x, z, points, mesh });
  }
  const drops=venue.hydraulics?.drops??[];
  const spray=CreateSphere('breaking crest spray',{diameter:1,segments:4},scene);
  spray.material=foamMat;
  const sprayCount=drops.length*36,sprayMatrices=new Float32Array(sprayCount*16);
  if(sprayCount) spray.thinInstanceSetBuffer('matrix',sprayMatrices,16,false);
  spray.setBoundingInfo(new BoundingInfo(new Vector3(-20,-10,-5),new Vector3(110,12,180)));
  let lastTime = -1;
  return {
    update(time: number, delta: number, debug: boolean) {
      riverMaterial.update(time);
      for(const h of hanging) {h.node.rotation.x=.012*Math.sin(time*.9+h.phase);h.node.rotation.z=.008*Math.sin(time*1.3+h.phase);}

      // Mesh upload at 30 Hz; boat sampling/physics continue at their normal cadence.
      if (time - lastTime >= 1 / 30 || time < lastTime || lastTime < 0) {
        grid = sim.courseGrid(NX, NZ, b.minX, b.minZ, dx, dz, time); lastTime = time;
        for (let i = 0; i < count; i++) {
          positions[i * 3 + 1] = grid[i * 7]; const gx = grid[i * 7 + 3], gz = grid[i * 7 + 4], inv = 1 / Math.hypot(gx, 1, gz);
          normals[i * 3] = -gx * inv; normals[i * 3 + 1] = inv; normals[i * 3 + 2] = -gz * inv;
          const turbulence=grid[i*7+5], crest=grid[i*7+6];
          colors[i*4]=turbulence;colors[i*4+1]=grid[i*7+1];
          colors[i*4+2]=grid[i*7+2];colors[i*4+3]=crest;
        }
        water.updateVerticesData(VertexBuffer.PositionKind, positions); water.updateVerticesData(VertexBuffer.NormalKind, normals); water.updateVerticesData(VertexBuffer.ColorKind, colors);
      }
      for (let i = 0; i < foamCount; i++) {
        const f = flakes[i]; const vx = gridValue(f.x, f.z, 1), vz = gridValue(f.x, f.z, 2);
        const mapped=frame(f.x,f.z), sin=Math.sin(mapped.yaw), cos=Math.cos(mapped.yaw);
        f.x += (vx*cos-vz*sin)*delta;
        const metric=sim.channelMetric(f.x,f.z);
        f.z += (vx*sin+vz*cos)*delta/metric;
        if (f.x < sim.channelEdge(-1,f.z)+0.4 || f.x > sim.channelEdge(1,f.z)-0.4 || f.z > b.maxZ - 0.5 || f.z < venue.flow.startZ) { f.x = b.minX + 0.8 + ((i * 0.61803398875) % 1) * (width - 1.6); f.z = venue.flow.startZ + 2; }
        const hidden = venue.obstacles.some((o) => {if(o.submerged)return false;if(!o.width) return Math.hypot(f.x-o.x,f.z-o.z)<o.radius;
          const angle=o.yaw??0,dx=f.x-o.x,dz=f.z-o.z;
          return Math.abs(dx*Math.cos(angle)-dz*Math.sin(angle))<o.width/2+0.15 && Math.abs(dx*Math.sin(angle)+dz*Math.cos(angle))<(o.length??0)/2+0.15;
        });
        const turbulent=gridValue(f.x,f.z,5), size=turbulent>.2 ? 0.04+turbulent*0.20 : 0;
        scale.set(hidden ? 0 : size, 1, size*(1.2+Math.hypot(vx,vz)*0.45));
        Quaternion.FromEulerAnglesToRef(0, Math.atan2(vx, vz), 0, rotation);
        const world=frame(f.x,f.z);position.set(world.x, gridValue(f.x, f.z, 0) + 0.04, world.z); Matrix.ComposeToRef(scale, rotation, position, matrix); matrix.copyToArray(matrices, i * 16);
      }
      foam.thinInstanceBufferUpdated('matrix');
      for(let i=0;i<sprayCount;i++) {
        const d=drops[Math.floor(i/36)],age=(time*1.2+i*.61803398875)%1;
        const x=(((i*.381966)%1)-.5)*12,z=d.z+d.length+1+age*2.5;
        const f=frame(x,z),h=gridValue(x,z,0)+4*age*(1-age)*d.height*.8;
        const size=.018+.025*((i*.73)%1);
        position.set(f.x,h+.03,f.z);scale.set(size,size*1.4,size);
        Matrix.ComposeToRef(scale,Quaternion.Identity(),position,matrix);matrix.copyToArray(sprayMatrices,i*16);
      }
      if(sprayCount) spray.thinInstanceBufferUpdated('matrix');
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
