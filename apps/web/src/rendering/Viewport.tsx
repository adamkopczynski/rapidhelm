import { useEffect, useRef } from 'react';
// Eagerly register the standard shaders: Vite's dev optimizer otherwise may
// leave the async shader registry empty and fetch the HTML fallback as GLSL.
import '@babylonjs/core/Shaders/default.vertex';
import '@babylonjs/core/Shaders/default.fragment';
import '@babylonjs/core/Shaders/color.vertex';
import '@babylonjs/core/Shaders/color.fragment';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { createKayak } from './kayak';
import { CreateLines } from '@babylonjs/core/Meshes/Builders/linesBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { createSimulation } from '@rapidhelm/wasm-bridge';
import { createRuntime } from '../game/runtime';
import { createKeyboardInput } from '../input/keyboard';
import { createPaddler } from './paddler';
import { createChaseCamera } from './camera';
import { createVenueScene } from './venueScene';
import { initialVenue } from '../game/venue';
import { emptyDiagnostics, useSession } from '../store';
export function Viewport() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    void createSimulation().then((sim) => {
      if (disposed || !canvas.current) return;
      const runtime = createRuntime(sim, useSession.getState().config, initialVenue);
      const engine = new Engine(canvas.current, true);
      const scene = new Scene(engine); scene.clearColor = new Color4(0.62, 0.78, 0.84, 1);
      const camera = new FreeCamera('chase', new Vector3(0, 7, -10), scene); camera.minZ = 0.1;
      const chase = createChaseCamera(camera); chase.update(runtime.read(), 0, true, sim.sampleWater(runtime.read().x,runtime.read().z,0).height);
      const sky=new HemisphericLight('sky', new Vector3(0.2, 1, 0.4), scene);sky.intensity=.55;
      const sun=new DirectionalLight('sun',new Vector3(.35,-.85,-.4),scene);sun.intensity=.75;
      const venueScene = createVenueScene(scene, sim, initialVenue);
      const footprint=Array.from({length:61},(_,i)=>i*initialVenue.bounds.maxZ/60).flatMap(z=>[-1,1].map(side=>sim.channelFrame(sim.channelEdge(side,z)+side*5,z)));
      const minX=Math.min(...footprint.map(p=>p.x)),maxX=Math.max(...footprint.map(p=>p.x)),minZ=Math.min(...footprint.map(p=>p.z)),maxZ=Math.max(...footprint.map(p=>p.z));
      const overviewX=(minX+maxX)/2,overviewZ=(minZ+maxZ)/2;
      const markerMat = new StandardMaterial('markers', scene); markerMat.diffuseColor = new Color3(0.2, 0.25, 0.27);
      const boat = new TransformNode('boat-state', scene);
      const hull = createKayak(scene); hull.parent = boat;
      const boatMat = new StandardMaterial('kayak', scene); boatMat.diffuseColor = new Color3(0.80, 0.88, 0.87); hull.material = boatMat;
      const cockpit = CreateSphere('cockpit', { diameter: 0.65, segments: 12 }, scene); cockpit.parent = boat; cockpit.scaling.set(1, 0.4, 1.5); cockpit.position.set(0, 0.23, -0.1); cockpit.material = markerMat;
      const nose = CreateBox('bow-marker', { width: 0.3, height: 0.18, depth: 0.45 }, scene); nose.parent = boat; nose.position.set(0, 0.25, 1.3); nose.material = markerMat;
      const velocityPoints = [new Vector3(), new Vector3()];
      const headingPoints = [new Vector3(), new Vector3()];
      const velocityLine = CreateLines('world-velocity', { points: velocityPoints, updatable: true }, scene); velocityLine.color = new Color3(0.2, 0.9, 1);
      const headingLine = CreateLines('forward-heading', { points: headingPoints, updatable: true }, scene); headingLine.color = new Color3(1, 0.72, 0.25);
      const paddler=createPaddler(scene,boat);
      const input = createKeyboardInput(() => useSession.getState().restart(), () => { runtime.suspend(); resumeCamera = true; });
      let resumeCamera = false, hudTime = 0, frames = 0, simulationTotal = 0, renderTotal = 0, frameTotal = 0;
      const resetCamera = () => { chase.update(runtime.read(), 0, true, sim.sampleWater(runtime.read().x, runtime.read().z, 0).height); hudTime = 0; frames = 0; simulationTotal = 0; renderTotal = 0; frameTotal = 0; useSession.setState({ diagnostics: emptyDiagnostics }); };
      const unsubscribe = useSession.subscribe((s, old) => {
        if (s.configRevision !== old.configRevision) {
          try { runtime.configure(s.config); input.clear(); resetCamera(); useSession.setState({ status: 'Simulation ready' }); }
          catch (error) { useSession.setState({ config: old.config, status: `Configuration failed: ${String(error)}` }); }
        } else if (s.resetId !== old.resetId) { runtime.reset(); input.clear(); resetCamera(); }
      });
      const resize = () => engine.resize(); window.addEventListener('resize', resize);
      useSession.setState({ status: 'Loading renderer' });
      scene.executeWhenReady(() => { if (!disposed) useSession.setState({ status: 'Simulation ready' }); });
      engine.runRenderLoop(() => {
        if (document.hidden) return;
        const delta = Math.min(engine.getDeltaTime() / 1000, 0.25);
        const controls=input.read();
        const frame = runtime.update(delta, controls);paddler.update(delta,controls);
        const s = frame.state;
        const water = sim.sampleWater(s.x, s.z, frame.time);
        boat.position.set(s.x, water.height + 0.22, s.z);
        boat.rotation.set(-Math.atan(water.gradientX * Math.sin(s.yaw) + water.gradientZ * Math.cos(s.yaw)), s.yaw, Math.atan(water.gradientX * Math.cos(s.yaw) - water.gradientZ * Math.sin(s.yaw)));
        if (useSession.getState().overview) {
          const span=Math.max(maxZ-minZ,(maxX-minX)/engine.getAspectRatio(camera));
          const height=(span+20)/(2*Math.tan(camera.fov/2))+initialVenue.metadata!.drop;
          camera.position.set(overviewX,height,overviewZ);camera.setTarget(new Vector3(overviewX,2.25,overviewZ));
          resumeCamera=true;
        } else {chase.update(s,delta,resumeCamera,water.height);resumeCamera=false;}
        const debug = useSession.getState().debug;
        venueScene.update(frame.time, delta, debug,useSession.getState().overview);
        velocityLine.setEnabled(debug); headingLine.setEnabled(debug);
        if (debug) {
          velocityPoints[0].set(s.x, water.height + 0.9, s.z); velocityPoints[1].set(s.x + s.velocityX, water.height + 0.9, s.z + s.velocityZ);
          headingPoints[0].set(s.x, water.height + 1.05, s.z); headingPoints[1].set(s.x + Math.sin(s.yaw) * 2, water.height + 1.05, s.z + Math.cos(s.yaw) * 2);
          CreateLines('world-velocity', { points: velocityPoints, instance: velocityLine }, scene);
          CreateLines('forward-heading', { points: headingPoints, instance: headingLine }, scene);
        }
        const renderStart = performance.now(); scene.render(); renderTotal += performance.now() - renderStart;
        simulationTotal += frame.simulationMs; frameTotal += engine.getDeltaTime(); frames++; hudTime += delta;
        if (hudTime >= 0.1) {
          const a = frame.authoritative; const course=sim.channelFrame(a.x,a.z,true); const sin = Math.sin(a.yaw), cos = Math.cos(a.yaw);
          useSession.setState({ diagnostics: { surfaceHeight:water.height,progress:course.z, courseFlow:water.velocityX*Math.sin(course.yaw)+water.velocityZ*Math.cos(course.yaw), forwardSpeed: a.velocityX * sin + a.velocityZ * cos, lateralSpeed: a.velocityX * cos - a.velocityZ * sin, yawRate: a.yawRate, heading: ((a.yaw * 180 / Math.PI) % 360 + 360) % 360, x: a.x, z: a.z, flowX: water.velocityX, flowZ: water.velocityZ, waveStrength: water.waveStrength, contacts: frame.contacts, steps: frame.stepsTotal, simulationMs: simulationTotal / frames, renderMs: renderTotal / frames, frameMs: frameTotal / frames } });
          hudTime = 0; frames = 0; simulationTotal = 0; renderTotal = 0; frameTotal = 0;
        }
      });
      cleanup = () => { unsubscribe(); input.dispose(); window.removeEventListener('resize', resize); scene.dispose(); engine.dispose(); };
    }).catch((error: unknown) => { if (!disposed) useSession.setState({ status: `Startup failed: ${String(error)}` }); });
    return () => { disposed = true; cleanup(); };
  }, []);
  return <canvas ref={canvas} tabIndex={0} aria-label="Canoe simulation viewport" />;
}
