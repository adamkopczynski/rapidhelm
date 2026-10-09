import { Viewport } from './rendering/Viewport';
import { useSession } from './store';
import { Button } from './ui/button';
import { TuningPanel } from './ui/TuningPanel';
import { initialVenue as venue } from './game/venue';
export function App() {
  const { status, diagnostics: d, restart, debug, setDebug, overview, setOverview,race,guidance } = useSession();
  const zone = d.progress < venue.flow.startZ ? 'START POOL' : d.progress < venue.flow.startZ+venue.flow.rampLength ? 'CATCHING THE FLOW' : d.courseFlow < -0.2 ? 'UPSTREAM CURRENT' : d.progress >= venue.bounds.maxZ-(venue.geometry?.pools?.length??8) ? 'FINISH POOL' : 'DOWNSTREAM RAPIDS';
  return <main className={overview ? 'venue-overview' : undefined}>
    <Viewport />
    <section className="race-hud" aria-label="Race timing">
      <p className="eyebrow">RAPIDHELM · K1</p>
      <strong className="race-clock">{race.elapsed.toFixed(2)} <small>s</small></strong>
      <span>Penalties +{race.penalty} s · {race.passed}/{venue.gates.length} gates</span>
      <p role="status">{race.message}</p>
      <Button onClick={restart}>Restart run</Button>
      <Button onClick={()=>setOverview(!overview)}>{overview ? 'Chase camera' : 'Venue overview'}</Button>
    </section>
    {race.phase!=='finished' && race.nextId!==null && <aside className="gate-guidance" aria-label="Next gate">
      <span className="direction-arrow" style={{transform:`rotate(${guidance.bearing*180/Math.PI}deg)`}}>↑</span>
      <div>GATE {race.nextId} · {venue.gates.find(g=>g.id===race.nextId)?.direction.toUpperCase()}<small>{guidance.distance.toFixed(0)} m away · W paddle · A / D steer</small></div>
    </aside>}
    {race.phase==='finished' && <section className="race-results" aria-label="Run results"><h1>Run finished</h1><strong>{race.total.toFixed(2)} s</strong><p>Course {race.elapsed.toFixed(2)} s + penalties {race.penalty} s</p><p>{race.passed} passed · {race.missed} missed</p><Button onClick={restart}>Race again</Button></section>}
    <section className="hud" aria-label="River controls">
      <details><summary>Handling & diagnostics</summary>
      <p className="eyebrow">PARIS VENUE STUDY</p>
      <h1>Vaires-sur-Marne</h1>
      <p className="subtitle">{venue.metadata!.competitionLength} m · {venue.metadata!.nominalWidth} m channel · {venue.metadata!.drop} m drop · {venue.metadata!.discharge} m³/s</p>
      <div role="status">{status}</div>
      <p className="speed" data-testid="forward-speed">{d.forwardSpeed.toFixed(2)} <small>m/s forward</small></p>
      <dl className="telemetry river-telemetry">
        <div><dt>Course progress</dt><dd>{d.progress.toFixed(1)} / {venue.bounds.maxZ} m</dd></div>
        <div><dt>Local flow X / Z</dt><dd>{d.flowX.toFixed(2)} / {d.flowZ.toFixed(2)} m/s</dd></div>
        <div><dt>Water elevation</dt><dd>{d.surfaceHeight.toFixed(2)} m · finish 0 m</dd></div>
        <div><dt>Standing crest</dt><dd>{d.waveStrength.toFixed(2)} m</dd></div>
        <div><dt>Hull contacts</dt><dd>{d.contacts}</dd></div>
      </dl>
      <Button onClick={()=>setOverview(!overview)}>{overview ? 'Chase camera' : 'Venue overview'}</Button>
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
      <p className="note">Approximate venue geometry and authored flow. Practice judging uses a planar contact proxy; athlete/paddle contacts are approximate.</p>
      </details>
    </section>
    {(overview||debug)&&<aside className="river-guide"><strong>{zone}</strong><span>{d.progress < venue.flow.startZ+venue.flow.rampLength ? 'Hold W to paddle into the downstream flow. A / D steer; S brakes.' : 'Use momentum to pass the rocks. Eddy water can carry you upstream.'}</span><span>{venue.gates.length} practice gates · {venue.gates.filter(g=>g.direction==='upstream').length} upstream targets · Asymmetric course · high start → low finish</span></aside>}
  </main>;
}
