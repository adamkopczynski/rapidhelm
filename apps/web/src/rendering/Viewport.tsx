import { useEffect, useRef } from 'react';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCapsule } from '@babylonjs/core/Meshes/Builders/capsuleBuilder';
import { CreateLines } from '@babylonjs/core/Meshes/Builders/linesBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { createSimulation } from '@rapidhelm/wasm-bridge';
import { createRuntime } from '../game/runtime';
import { createKeyboardInput } from '../input/keyboard';
import { createChaseCamera } from './camera';
import { emptyDiagnostics, useSession } from '../store';
export function Viewport() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    void createSimulation().then((sim) => {
      if (disposed || !canvas.current) return;
      const runtime = createRuntime(sim, useSession.getState().config);
      const engine = new Engine(canvas.current, true);
      const scene = new Scene(engine); scene.clearColor = new Color4(0.06, 0.1, 0.14, 1);
      const camera = new FreeCamera('chase', new Vector3(0, 7, -10), scene); camera.minZ = 0.1;
      const chase = createChaseCamera(camera); chase.update(runtime.read(), 0, true);
      new HemisphericLight('sky', new Vector3(0.2, 1, 0.4), scene);
      const water = CreateGround('still-water', { width: 4000, height: 4000 }, scene);
      const waterMat = new StandardMaterial('water', scene); waterMat.diffuseColor = new Color3(0.05, 0.38, 0.43); water.material = waterMat;
      for (const x of [-11, 11]) { const bank = CreateBox('reference-bank', { width: 1, height: 0.6, depth: 160 }, scene); bank.position.set(x, -0.1, 60); }
      const markerMat = new StandardMaterial('markers', scene); markerMat.diffuseColor = new Color3(0.65, 0.73, 0.7);
      for (let z = -20; z <= 160; z += 10) { const marker = CreateBox('distance-marker', { width: 0.6, height: 0.05, depth: 0.6 }, scene); marker.position.set(0, 0.04, z); marker.material = markerMat; }
      const boat = new TransformNode('boat-state', scene);
      const hull = CreateCapsule('kayak', { radius: 0.42, height: 3.8 }, scene); hull.parent = boat; hull.rotation.x = Math.PI / 2;
      const boatMat = new StandardMaterial('kayak', scene); boatMat.diffuseColor = new Color3(0.72, 0.95, 0.2); hull.material = boatMat;
      const nose = CreateBox('bow-marker', { width: 0.3, height: 0.18, depth: 0.45 }, scene); nose.parent = boat; nose.position.set(0, 0.25, 1.3); nose.material = markerMat;
      const velocityPoints = [new Vector3(), new Vector3()];
      const headingPoints = [new Vector3(), new Vector3()];
      const velocityLine = CreateLines('world-velocity', { points: velocityPoints, updatable: true }, scene); velocityLine.color = new Color3(0.2, 0.9, 1);
      const headingLine = CreateLines('forward-heading', { points: headingPoints, updatable: true }, scene); headingLine.color = new Color3(1, 0.72, 0.25);
      const input = createKeyboardInput(() => useSession.getState().restart(), () => { runtime.suspend(); resumeCamera = true; });
      let resumeCamera = false, hudTime = 0, frames = 0, simulationTotal = 0, renderTotal = 0, frameTotal = 0;
      const resetCamera = () => { chase.update(runtime.read(), 0, true); hudTime = 0; frames = 0; simulationTotal = 0; renderTotal = 0; frameTotal = 0; useSession.setState({ diagnostics: emptyDiagnostics }); };
      const unsubscribe = useSession.subscribe((s, old) => {
        if (s.configRevision !== old.configRevision) {
          try { runtime.configure(s.config); input.clear(); resetCamera(); useSession.setState({ status: 'Simulation ready' }); }
          catch (error) { useSession.setState({ config: old.config, status: `Configuration failed: ${String(error)}` }); }
        } else if (s.resetId !== old.resetId) { runtime.reset(); input.clear(); resetCamera(); }
      });
      const resize = () => engine.resize(); window.addEventListener('resize', resize);
      useSession.setState({ status: 'Simulation ready' });
      engine.runRenderLoop(() => {
        if (document.hidden) return;
        const delta = Math.min(engine.getDeltaTime() / 1000, 0.25);
        const frame = runtime.update(delta, input.read());
        const s = frame.state;
        boat.position.set(s.x, 0.4, s.z); boat.rotation.y = s.yaw;
        // Recenter the visual plane for long trials; simulation coordinates remain unchanged.
        water.position.x = s.x; water.position.z = s.z;
        chase.update(s, delta, resumeCamera); resumeCamera = false;
        const debug = useSession.getState().debug;
        velocityLine.setEnabled(debug); headingLine.setEnabled(debug);
        if (debug) {
          velocityPoints[0].set(s.x, 0.9, s.z); velocityPoints[1].set(s.x + s.velocityX, 0.9, s.z + s.velocityZ);
          headingPoints[0].set(s.x, 1.05, s.z); headingPoints[1].set(s.x + Math.sin(s.yaw) * 2, 1.05, s.z + Math.cos(s.yaw) * 2);
          CreateLines('world-velocity', { points: velocityPoints, instance: velocityLine }, scene);
          CreateLines('forward-heading', { points: headingPoints, instance: headingLine }, scene);
        }
        const renderStart = performance.now(); scene.render(); renderTotal += performance.now() - renderStart;
        simulationTotal += frame.simulationMs; frameTotal += engine.getDeltaTime(); frames++; hudTime += delta;
        if (hudTime >= 0.1) {
          const a = frame.authoritative; const sin = Math.sin(a.yaw), cos = Math.cos(a.yaw);
          useSession.setState({ diagnostics: { forwardSpeed: a.velocityX * sin + a.velocityZ * cos, lateralSpeed: a.velocityX * cos - a.velocityZ * sin, yawRate: a.yawRate, heading: ((a.yaw * 180 / Math.PI) % 360 + 360) % 360, x: a.x, z: a.z, steps: frame.stepsTotal, simulationMs: simulationTotal / frames, renderMs: renderTotal / frames, frameMs: frameTotal / frames } });
          hudTime = 0; frames = 0; simulationTotal = 0; renderTotal = 0; frameTotal = 0;
        }
      });
      cleanup = () => { unsubscribe(); input.dispose(); window.removeEventListener('resize', resize); scene.dispose(); engine.dispose(); };
    }).catch((error: unknown) => { if (!disposed) useSession.setState({ status: `Startup failed: ${String(error)}` }); });
    return () => { disposed = true; cleanup(); };
  }, []);
  return <canvas ref={canvas} tabIndex={0} aria-label="Canoe simulation viewport" />;
}
