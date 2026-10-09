import { expect, test } from 'vitest';
import { smoothingWeight } from './camera';
test('camera smoothing agrees across render rates', () => {
  for (const fps of [30, 60, 144]) {
    let value = 0; for (let i = 0; i < fps; i++) value += (1 - value) * smoothingWeight(1 / fps);
    expect(value).toBeCloseTo(1 - Math.exp(-5), 12);
  }
});

test('race camera stays behind the hull across heading wrap and anticipates velocity', async () => {
  const {Vector3}=await import('@babylonjs/core/Maths/math.vector');
  const {createChaseCamera}=await import('./camera');
  let target=Vector3.Zero();
  const camera={position:Vector3.Zero(),setTarget:(v:InstanceType<typeof Vector3>)=>{target=v.clone();}};
  const chase=createChaseCamera(camera as unknown as import('@babylonjs/core/Cameras/freeCamera').FreeCamera);
  const state={x:12,z:40,yaw:Math.PI-.001,velocityX:0,velocityZ:-3,yawRate:0};
  chase.update(state,0,true,2);
  const before=camera.position.clone();
  expect(camera.position.y).toBeCloseTo(4.8);
  expect(camera.position.z).toBeGreaterThan(state.z);
  expect(target.z).toBeLessThan(state.z-7);
  chase.update({...state,yaw:-Math.PI+.001},1/60,false,2);
  expect(Vector3.Distance(before,camera.position)).toBeLessThan(.01);
});
