import { createRoot } from 'react-dom/client';
import { Viewport } from './rendering/Viewport';
import { useSession } from './store';
import { Button } from './ui/button';
import { TuningPanel } from './ui/TuningPanel';
import './style.css';
function App() {
  const { status, diagnostics: d, restart, debug, setDebug } = useSession();
  const zone = d.z < 14 ? 'START POOL' : d.z < 32 ? 'CATCHING THE FLOW' : d.flowZ < -0.2 ? 'UPSTREAM CURRENT' : d.z > 172 ? 'CHANNEL END' : 'DOWNSTREAM RAPIDS';
  return <main>
    <Viewport />
    <section className="hud" aria-label="River controls">
      <p className="eyebrow">RAPIDHELM / RIVER TRAINING</p>
      <h1>Catch the current</h1>
      <p className="subtitle">Calm start pool → rapids → upstream eddies</p>
      <div role="status">{status}</div>
      <p className="speed" data-testid="forward-speed">{d.forwardSpeed.toFixed(2)} <small>m/s forward</small></p>
      <dl className="telemetry river-telemetry">
        <div><dt>Local flow X / Z</dt><dd>{d.flowX.toFixed(2)} / {d.flowZ.toFixed(2)} m/s</dd></div>
        <div><dt>Wave amplitude</dt><dd>{d.waveStrength.toFixed(2)} m</dd></div>
        <div><dt>Hull contacts</dt><dd>{d.contacts}</dd></div>
      </dl>
      <Button onClick={restart}>Return to start pool</Button>
      <p className="controls">W / S paddle & reverse · A / D turn · R restart</p>
      <label className="debug-toggle"><input type="checkbox" checked={debug} onChange={(event) => setDebug(event.target.checked)} /> Show debug vectors</label>
      {debug && <p className="legend"><span className="cyan">━ Velocity: 1 m = 1 m/s</span><span className="amber">━ Forward direction: 2 m</span><span>↟ Pale arrows show the sampled river flow</span></p>}
      <details className="tuning"><summary>Boat telemetry</summary>
        <dl className="telemetry">
          <div><dt>Lateral speed</dt><dd data-testid="lateral-speed">{d.lateralSpeed.toFixed(2)} m/s</dd></div>
          <div><dt>Yaw rate</dt><dd data-testid="yaw-rate">{d.yawRate.toFixed(3)} rad/s</dd></div>
          <div><dt>Heading</dt><dd>{d.heading.toFixed(1)}°</dd></div>
          <div><dt>Position X / Z</dt><dd data-testid="position">{d.x.toFixed(2)} / {d.z.toFixed(2)} m</dd></div>
        </dl>
        <dl className="telemetry performance">
          <div><dt>Physics steps (120 Hz)</dt><dd data-testid="steps">{d.steps}</dd></div>
          <div><dt>Simulation + WASM</dt><dd>{d.simulationMs.toFixed(3)} ms/frame</dd></div>
          <div><dt>Render submission</dt><dd>{d.renderMs.toFixed(2)} ms/frame</dd></div>
          <div><dt>Frame interval</dt><dd>{d.frameMs.toFixed(2)} ms</dd></div>
        </dl>
        <p className="note">CPU samples over ~100 ms. Render time excludes GPU completion.</p>
      </details>
      <TuningPanel />
      <p className="note">Banks and rocks are solid. Paddle out of the flat pool to catch the flow.</p>
    </section>
    <aside className="river-guide"><strong>{zone}</strong><span>{d.z < 32 ? 'Hold W to paddle into the downstream flow. A / D steer; S brakes.' : 'Use momentum to pass the rocks. Eddy water can carry you upstream.'}</span><span>Right eddy: 67 m · Left eddy: 105 m · Channel: 180 m</span></aside>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
