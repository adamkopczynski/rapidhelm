import { createRoot } from 'react-dom/client';
import { Viewport } from './rendering/Viewport';
import { useSession } from './store';
import { Button } from './ui/button';
import { TuningPanel } from './ui/TuningPanel';
import './style.css';
function App() {
  const { status, diagnostics: d, restart, debug, setDebug } = useSession();
  return <main><Viewport /><section className="hud" aria-label="Sandbox controls"><p className="eyebrow">RAPIDHELM / SPRINT 1</p><h1>Boat physics sandbox</h1><p className="subtitle">Still water · momentum · handling laboratory</p><div role="status">{status}</div><p className="speed" data-testid="forward-speed">{d.forwardSpeed.toFixed(2)} <small>m/s forward</small></p>
    <dl className="telemetry"><div><dt>Lateral speed</dt><dd data-testid="lateral-speed">{d.lateralSpeed.toFixed(2)} m/s</dd></div><div><dt>Yaw rate</dt><dd data-testid="yaw-rate">{d.yawRate.toFixed(3)} rad/s</dd></div><div><dt>Heading</dt><dd>{d.heading.toFixed(1)}°</dd></div><div><dt>Position X / Z</dt><dd data-testid="position">{d.x.toFixed(2)} / {d.z.toFixed(2)} m</dd></div></dl>
    <Button onClick={restart}>Restart simulation</Button><p className="controls">W / S paddle & reverse · A / D turn · R restart</p>
    <label className="debug-toggle"><input type="checkbox" checked={debug} onChange={(event) => setDebug(event.target.checked)} /> Show debug vectors</label>
    {debug && <><p className="legend"><span className="cyan">━ Velocity: 1 m = 1 m/s</span><span className="amber">━ Forward direction: 2 m</span></p><dl className="telemetry performance"><div><dt>Physics steps (120 Hz)</dt><dd data-testid="steps">{d.steps}</dd></div><div><dt>Simulation + WASM</dt><dd>{d.simulationMs.toFixed(3)} ms/frame</dd></div><div><dt>Render submission</dt><dd>{d.renderMs.toFixed(2)} ms/frame</dd></div><div><dt>Frame interval</dt><dd>{d.frameMs.toFixed(2)} ms</dd></div></dl><p className="note">CPU samples over ~100 ms. Render time excludes GPU completion.</p></>}
    <TuningPanel /><p className="note">Reference banks have no collisions. Currents and gates arrive in later sprints.</p>
  </section></main>;
}
createRoot(document.getElementById('root')!).render(<App />);
