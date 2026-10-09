export const STEP = 1 / 120;
export function consumeTime(accumulator: number, delta: number) {
  const total = accumulator + Math.max(0, Math.min(delta, 0.25));
  const steps = Math.min(30, Math.floor((total + 1e-10) / STEP));
  return { steps, remainder: Math.max(0, total - steps * STEP) };
}
