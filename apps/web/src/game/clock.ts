export function consumeTime(accumulator: number, delta: number, timestep: number) {
  const total = accumulator + (Number.isFinite(delta) ? Math.max(0, Math.min(delta, 0.25)) : 0);
  const steps = Math.min(30, Math.floor((total + 1e-10) / timestep));
  return { steps, remainder: Math.max(0, total - steps * timestep) };
}
