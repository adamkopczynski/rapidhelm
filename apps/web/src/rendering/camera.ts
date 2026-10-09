import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import type { BoatState } from '@rapidhelm/wasm-bridge';
export function smoothingWeight(delta: number, rate = 5) { return 1 - Math.exp(-rate * Math.max(0, Math.min(delta, 0.25))); }
export function createChaseCamera(camera: FreeCamera) {
  const target = new Vector3();
  const desired = new Vector3();
  const desiredTarget = new Vector3();
  return {
    update: (state: BoatState, delta: number, snap = false, waterHeight = 0) => {
      const sin = Math.sin(state.yaw), cos = Math.cos(state.yaw);
      desired.set(state.x - sin * 10, waterHeight + 7, state.z - cos * 10);
      desiredTarget.set(state.x + sin * 2.5, waterHeight + 0.35, state.z + cos * 2.5);
      const alpha = snap ? 1 : smoothingWeight(delta);
      Vector3.LerpToRef(camera.position, desired, alpha, camera.position);
      Vector3.LerpToRef(target, desiredTarget, alpha, target);
      camera.setTarget(target);
    },
  };
}
