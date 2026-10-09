import { createRoot } from 'react-dom/client';
import { Viewport } from './rendering/Viewport';
import { useSession } from './store';
import { Button } from './ui/button';
import './style.css';
function App() {
  const { status, speed, restart } = useSession();
  return <main><Viewport /><section className="hud"><p className="eyebrow">PADDLEWORLD / SPRINT 0</p><h1>Canoe Slalom</h1><p>Rust simulation · Babylon.js rendering</p><div role="status">{status}</div><p className="speed">{speed.toFixed(2)} <small>m/s</small></p><Button onClick={restart}>Restart simulation</Button><p className="controls">W / S paddle & reverse · A / D turn · R restart</p><p className="note">Foundation sandbox · still water · placeholder geometry</p></section></main>;
}
createRoot(document.getElementById('root')!).render(<App />);
