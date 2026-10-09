import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
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
const NX = 17, NZ = 121;
export function createVenueScene(scene: Scene, sim: Simulation, venue: RiverVenue) {
  const b = venue.bounds, width = b.maxX - b.minX, length = b.maxZ - b.minZ;
  const dx = width / (NX - 1), dz = length / (NZ - 1);
  const material = (name: string, color: Color3) => { const m = new StandardMaterial(name, scene); m.diffuseColor = color; m.specularColor = new Color3(0.05, 0.05, 0.05); return m; };
  const concrete = material('channel concrete', new Color3(0.48, 0.51, 0.48));
  const walkway = material('warm stone walkway', new Color3(0.68, 0.65, 0.54));
  const grass = material('grass', new Color3(0.28, 0.4, 0.2));
  const rockMat = material('wet rock', new Color3(0.31, 0.35, 0.31));
  const startMat = material('start line', new Color3(0.78, 0.95, 0.48));
  const surroundings = CreateBox('surroundings', { width: width + 80, height: 0.5, depth: length + 80 }, scene); surroundings.position.set((b.minX + b.maxX) / 2, -3, (b.minZ + b.maxZ) / 2); surroundings.material = grass;
  // All authored geometry follows Rust's surface height; no second slope implementation.
  for (let z = b.minZ; z < b.maxZ; z += 6) {
    const span = Math.min(6, b.maxZ - z), center = z + span / 2;
    const height = sim.sampleWater(0, center, 0).height;
    for (const side of [-1, 1]) {
      const edge = side < 0 ? b.minX : b.maxX;
      const wall = CreateBox('colliding-bank', { width: 1, height: 2.8, depth: span + 0.02 }, scene); wall.position.set(edge + side * 0.5, height - 0.4, center); wall.material = concrete;
      const path = CreateBox('walkway', { width: 4, height: 0.15, depth: span }, scene); path.position.set(edge + side * 3, height + 0.88, center); path.material = walkway;
    }
  }
  for (const z of [b.minZ, b.maxZ]) {
    const wall = CreateBox('end boundary', { width: width + 2, height: 2.8, depth: 1 }, scene); wall.position.set((b.minX + b.maxX) / 2, sim.sampleWater(0, z, 0).height - 0.4, z + (z === b.minZ ? -0.5 : 0.5)); wall.material = concrete;
  }
  const startLine = CreateBox('start pool stripe', { width: width - 0.5, height: 0.025, depth: 0.2 }, scene); startLine.position.set(0, 0.015, venue.start.z - 2.2); startLine.material = startMat;
  function label(text: string, x: number, z: number, color: string) {
    const texture = new DynamicTexture(text, { width: 512, height: 128 }, scene, false);
    texture.drawText(text, null, 85, 'bold 44px sans-serif', color, '#162c32', true);
    const sign = CreatePlane(text, { width: 4, height: 1 }, scene); sign.position.set(x, sim.sampleWater(x, z, 0).height + 2.2, z); sign.billboardMode = Mesh.BILLBOARDMODE_Y;
    const mat = new StandardMaterial(`${text} material`, scene); mat.diffuseTexture = texture; mat.emissiveColor = Color3.White(); mat.disableLighting = true; sign.material = mat;
  }
  label('START POOL', b.minX + 1, venue.start.z + 1, '#c8f078');
  label('CATCH THE FLOW', b.maxX + 2, venue.flow.startZ + venue.flow.rampLength, '#b7edf3');
  for (const r of venue.regions) label('UPSTREAM EDDY', r.x < 0 ? b.minX - 2 : b.maxX + 2, r.z, '#c5c4ff');
  label('CHANNEL END', b.minX - 2, b.maxZ - 5, '#b7edf3');
  for (const o of venue.obstacles) {
    const rock = CreateSphere(o.id, { diameter: o.radius * 2, segments: 12 }, scene); rock.scaling.y = 0.9; rock.position.set(o.x, sim.sampleWater(o.x, o.z, 0).height - 0.15, o.z); rock.material = rockMat;
  }
  const count = NX * NZ, positions = new Float32Array(count * 3), normals = new Float32Array(count * 3), colors = new Float32Array(count * 4), indices: number[] = [];
  for (let row = 0; row < NZ; row++) for (let col = 0; col < NX; col++) {
    const i = row * NX + col; positions[i * 3] = b.minX + col * dx; positions[i * 3 + 2] = b.minZ + row * dz; normals[i * 3 + 1] = 1; colors[i * 4 + 3] = 1;
    if (row < NZ - 1 && col < NX - 1) indices.push(i, i + NX, i + 1, i + 1, i + NX, i + NX + 1);
  }
  const water = new Mesh('Rust-sampled river surface', scene); const data = new VertexData(); data.positions = positions; data.normals = normals; data.colors = colors; data.indices = indices; data.applyToMesh(water, true);
  const waterMat = material('moving river water', Color3.White()); waterMat.specularColor = new Color3(0.3, 0.48, 0.52); waterMat.specularPower = 90; waterMat.backFaceCulling = false; water.material = waterMat;
  let grid = sim.waterGrid(NX, NZ, b.minX, b.minZ, dx, dz, 0);
  function gridValue(x: number, z: number, field: number) {
    const gx = Math.max(0, Math.min(NX - 1.00001, (x - b.minX) / dx)), gz = Math.max(0, Math.min(NZ - 1.00001, (z - b.minZ) / dz));
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
  foam.setBoundingInfo(new BoundingInfo(new Vector3(b.minX, -10, b.minZ), new Vector3(b.maxX, 3, b.maxZ)));
  const arrows: { x: number; z: number; points: Vector3[]; mesh: ReturnType<typeof CreateLines> }[] = [];
  for (let z = venue.flow.startZ + 8; z < b.maxZ - 3; z += 14) for (const x of [-7, 0, 7]) {
    if (x <= b.minX + 1 || x >= b.maxX - 1) continue;
    const points = Array.from({ length: 5 }, () => new Vector3());
    const mesh = CreateLines('sampled flow arrow', { points, updatable: true }, scene); mesh.color = new Color3(0.65, 0.93, 0.95); arrows.push({ x, z, points, mesh });
  }
  let lastTime = -1;
  return {
    update(time: number, delta: number, debug: boolean) {
      // Mesh upload at 30 Hz; boat sampling/physics continue at their normal cadence.
      if (time - lastTime >= 1 / 30 || time < lastTime || lastTime < 0) {
        grid = sim.waterGrid(NX, NZ, b.minX, b.minZ, dx, dz, time); lastTime = time;
        for (let i = 0; i < count; i++) {
          positions[i * 3 + 1] = grid[i * 5]; const gx = grid[i * 5 + 3], gz = grid[i * 5 + 4], inv = 1 / Math.hypot(gx, 1, gz);
          normals[i * 3] = -gx * inv; normals[i * 3 + 1] = inv; normals[i * 3 + 2] = -gz * inv;
          const whiteness = Math.min(0.5, Math.max(0, gz) * 1.4 + Math.abs(gx) * 0.35);
          colors[i * 4] = 0.035 + whiteness; colors[i * 4 + 1] = 0.34 + whiteness * 0.7; colors[i * 4 + 2] = 0.4 + whiteness * 0.6;
        }
        water.updateVerticesData(VertexBuffer.PositionKind, positions); water.updateVerticesData(VertexBuffer.NormalKind, normals); water.updateVerticesData(VertexBuffer.ColorKind, colors);
      }
      for (let i = 0; i < foamCount; i++) {
        const f = flakes[i]; const vx = gridValue(f.x, f.z, 1), vz = gridValue(f.x, f.z, 2);
        f.x += vx * delta; f.z += vz * delta;
        if (f.x < b.minX + 0.4 || f.x > b.maxX - 0.4 || f.z > b.maxZ - 0.5 || f.z < venue.flow.startZ) { f.x = b.minX + 0.8 + ((i * 0.61803398875) % 1) * (width - 1.6); f.z = venue.flow.startZ + 2; }
        const hidden = venue.obstacles.some((o) => Math.hypot(f.x - o.x, f.z - o.z) < o.radius);
        scale.set(hidden ? 0 : 0.1, 1, 0.25 + Math.hypot(vx, vz) * 0.14);
        Quaternion.FromEulerAnglesToRef(0, Math.atan2(vx, vz), 0, rotation);
        position.set(f.x, gridValue(f.x, f.z, 0) + 0.04, f.z); Matrix.ComposeToRef(scale, rotation, position, matrix); matrix.copyToArray(matrices, i * 16);
      }
      foam.thinInstanceBufferUpdated('matrix');
      for (const a of arrows) {
        a.mesh.setEnabled(debug); if (!debug) continue;
        const vx = gridValue(a.x, a.z, 1), vz = gridValue(a.x, a.z, 2), magnitude = Math.hypot(vx, vz);
        const sx = vx / Math.max(magnitude, 0.01), sz = vz / Math.max(magnitude, 0.01), len = Math.min(2.2, magnitude * 0.8);
        const y = gridValue(a.x, a.z, 0) + 0.15, tx = a.x + sx * len, tz = a.z + sz * len;
        a.points[0].set(a.x, y, a.z); a.points[1].set(tx, y, tz); a.points[2].set(tx - sx * 0.4 + sz * 0.2, y, tz - sz * 0.4 - sx * 0.2); a.points[3].copyFrom(a.points[1]); a.points[4].set(tx - sx * 0.4 - sz * 0.2, y, tz - sz * 0.4 + sx * 0.2);
        CreateLines('sampled flow arrow', { points: a.points, instance: a.mesh }, scene);
      }
    },
  };
}
