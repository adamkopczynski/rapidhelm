import { useEffect, useRef } from 'react';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCapsule } from '@babylonjs/core/Meshes/Builders/capsuleBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { createSimulation } from '@rapidhelm/wasm-bridge';
import { venueSchema } from '@rapidhelm/content-schema';
import { consumeTime, STEP } from '../game/clock';
import { useSession } from '../store';
const venue = venueSchema.parse({ version: 1, id: 'sandbox', name: 'Physics sandbox', channelWidth: 20, channelLength: 240 });
export function Viewport() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    void createSimulation().then((sim) => {
      if (disposed || !canvas.current) return;
      const engine = new Engine(canvas.current, true);
      const scene = new Scene(engine); scene.clearColor = new Color4(0.06, 0.1, 0.14, 1);
      const camera = new FreeCamera('chase', new Vector3(0, 7, -12), scene); camera.minZ = 0.1;
      new HemisphericLight('sky', new Vector3(0.2, 1, 0.4), scene);
      const water = CreateGround('water', { width: venue.channelWidth, height: venue.channelLength }, scene);
      water.position.z = 100;
      const waterMat = new StandardMaterial('water', scene); waterMat.diffuseColor = new Color3(0.05, 0.38, 0.43); water.material = waterMat;
      for (const x of [-11, 11]) { const bank = CreateBox('bank', { width: 2, height: 1, depth: venue.channelLength }, scene); bank.position.set(x, 0, 100); }
      const boat = CreateCapsule('boat', { radius: 0.45, height: 3.8 }, scene); boat.rotation.x = Math.PI / 2;
      const boatMat = new StandardMaterial('kayak', scene); boatMat.diffuseColor = new Color3(0.72, 0.95, 0.2); boat.material = boatMat;
      const keys = new Set<string>();
      const down = (e: KeyboardEvent) => { if (e.target instanceof HTMLButtonElement) return; keys.add(e.code); if (e.code === 'KeyR') useSession.getState().restart(); };
      const up = (e: KeyboardEvent) => keys.delete(e.code);
      const blur = () => { keys.clear(); accumulator = 0; };
      const resize = () => engine.resize();
      window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur); window.addEventListener('resize', resize);
      let current = sim.reset(), previous = current, accumulator = 0, hudTime = 0;
      const unsubscribe = useSession.subscribe((s, old) => { if (s.resetId !== old.resetId) { current = sim.reset(); previous = current; accumulator = 0; useSession.setState({ speed: 0 }); } });
      useSession.setState({ status: 'Simulation ready' });
      engine.runRenderLoop(() => {
        if (document.hidden) { accumulator = 0; return; }
        const delta = engine.getDeltaTime() / 1000;
        const tick = consumeTime(accumulator, delta); accumulator = tick.remainder;
        const throttle = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
        const steering = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
        if (tick.steps > 0) {
          if (tick.steps > 1) sim.advance(tick.steps - 1, throttle, steering);
          previous = sim.read(); current = sim.advance(1, throttle, steering);
        }
        const alpha = accumulator / STEP;
        boat.position.set(previous.x + (current.x - previous.x) * alpha, 0.35, previous.z + (current.z - previous.z) * alpha);
        boat.rotation.y = previous.yaw + (current.yaw - previous.yaw) * alpha;
        camera.position.set(boat.position.x, 7, boat.position.z - 12); camera.setTarget(boat.position.add(new Vector3(0, 0, 4)));
        hudTime += delta; if (hudTime > 0.1) { useSession.setState({ speed: current.speed }); hudTime = 0; }
        scene.render();
      });
      cleanup = () => { unsubscribe(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); window.removeEventListener('resize', resize); scene.dispose(); engine.dispose(); };
    }).catch((error: unknown) => { if (!disposed) useSession.setState({ status: `Startup failed: ${String(error)}` }); });
    return () => { disposed = true; cleanup(); };
  }, []);
  return <canvas ref={canvas} aria-label="Canoe simulation viewport" />;
}
