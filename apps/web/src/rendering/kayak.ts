import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
export function createKayak(scene:Scene) {
  const rings=[[-1.9,.015],[-1.5,.22],[-.8,.38],[0,.42],[.8,.32],[1.5,.14],[1.9,.012]],p:number[]=[],indices:number[]=[],normals:number[]=[];
  for(const [z,width] of rings) for(let side=0;side<12;side++) {const a=side*Math.PI/6;p.push(Math.cos(a)*width,Math.sin(a)*.17,z);}
  for(let ring=0;ring<rings.length-1;ring++) for(let side=0;side<12;side++) {const a=ring*12+side,b=ring*12+(side+1)%12;indices.push(a,b,a+12,b,b+12,a+12);}
  for(let side=1;side<11;side++) {indices.push(0,side+1,side);const last=(rings.length-1)*12;indices.push(last,last+side,last+side+1);}
  VertexData.ComputeNormals(p,indices,normals);const data=new VertexData();data.positions=p;data.indices=indices;data.normals=normals;
  const mesh=new Mesh('pointed K1 hull',scene);data.applyToMesh(mesh);return mesh;
}
