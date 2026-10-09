import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateCapsule } from '@babylonjs/core/Meshes/Builders/capsuleBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { Controls } from '../input/keyboard';

// Procedural stand-in with stroke-driven joints, rather than production character art.
export function createPaddler(scene: Scene, boat: TransformNode) {
  const root=new TransformNode('paddler',scene);root.parent=boat;
  const mat=(name:string,color:Color3)=>{const m=new StandardMaterial(name,scene);m.diffuseColor=color;m.specularColor=new Color3(.12,.12,.12);return m;};
  const jersey=mat('ivory jersey',new Color3(.86,.9,.88)),vest=mat('navy buoyancy aid',new Color3(.06,.13,.20));
  const skin=mat('paddler skin',new Color3(.62,.40,.28)),carbon=mat('carbon paddle',new Color3(.035,.055,.06));
  const body=CreateCapsule('torso',{height:.68,radius:.23,tessellation:12},scene);body.parent=root;body.position.set(0,.59,-.12);body.scaling.z=.65;body.material=jersey;
  const aid=CreateSphere('buoyancy aid',{diameter:.55,segments:12},scene);aid.parent=body;aid.scaling.set(1,.8,.78);aid.material=vest;
  const head=CreateSphere('head',{diameter:.25,segments:12},scene);head.parent=root;head.position.set(0,1.04,-.09);head.material=skin;
  const helmet=CreateSphere('helmet',{diameter:.3,segments:16},scene);helmet.parent=head;helmet.position.y=.07;helmet.scaling.y=.8;helmet.material=jersey;
  const paddle=new TransformNode('double blade stroke',scene);paddle.parent=root;paddle.position.set(0,.72,.17);
  const shaft=CreateCylinder('paddle shaft',{height:2.25,diameter:.028,tessellation:8},scene);shaft.parent=paddle;shaft.rotation.z=Math.PI/2;shaft.material=carbon;
  for(const side of [-1,1]) {const blade=CreateSphere('paddle blade',{diameter:1,segments:12},scene);blade.parent=paddle;blade.position.x=side*1.25;blade.scaling.set(.40,.045,.17);blade.material=carbon;}
  const limbs=Array.from({length:4},(_,i)=>{const m=CreateCylinder(i%2 ? 'forearm':'upper arm',{height:1,diameter:.12,tessellation:8},scene);m.parent=root;m.material=skin;return m;});
  let phase=0,activity=0;
  const up=new Vector3(0,1,0);
  function limb(index:number,a:Vector3,b:Vector3) {
    const m=limbs[index],d=b.subtract(a);m.position.copyFrom(a.add(b).scale(.5));m.scaling.y=d.length();
    m.rotationQuaternion=Quaternion.FromUnitVectorsToRef(up,d.normalize(),new Quaternion());
  }
  return {update(delta:number,input:Controls) {
    const effort=Math.max(Math.abs(input.throttle),Math.abs(input.steering)*.65);
    activity+=(effort-activity)*(1-Math.exp(-8*delta));phase+=delta*8.5*activity;
    paddle.rotation.set(.12*Math.cos(phase)*activity,input.steering*.3,Math.sin(phase)*.64*activity);
    paddle.position.z=.17+Math.cos(phase)*.28*activity*(input.throttle<0 ? -1:1);
    root.rotation.y=.07*Math.sin(phase)*activity;body.rotation.z=-Math.sin(phase)*.09*activity;
    paddle.computeWorldMatrix(true);root.computeWorldMatrix(true);
    const inv=root.getWorldMatrix().clone().invert();
    for(const [index,side] of [-1,1].entries()) {
      const hand=Vector3.TransformCoordinates(Vector3.TransformCoordinates(new Vector3(side*.52,0,0),paddle.getWorldMatrix()),inv);
      const shoulder=new Vector3(side*.23,.83,-.1),elbow=shoulder.add(hand).scale(.5);elbow.x+=side*.12;elbow.z-=.10;
      limb(index*2,shoulder,elbow);limb(index*2+1,elbow,hand);
    }
  }};
}
