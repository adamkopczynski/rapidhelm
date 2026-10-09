export interface Controls { throttle: number; steering: number }
export function mapKeys(keys: ReadonlySet<string>): Controls {
  return { throttle: Number(keys.has('KeyW')) - Number(keys.has('KeyS')), steering: Number(keys.has('KeyD')) - Number(keys.has('KeyA')) };
}
export function isEditing(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
}
export function createKeyboardInput(onRestart: () => void, onSuspend: () => void) {
  const keys = new Set<string>();
  const clear = () => { keys.clear(); onSuspend(); };
  const down = (event: KeyboardEvent) => {
    if (isEditing(event.target)) return;
    if (['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(event.code)) { event.preventDefault(); keys.add(event.code); }
    if (event.code === 'KeyR') { event.preventDefault(); if (!event.repeat) onRestart(); }
  };
  const up = (event: KeyboardEvent) => { if (keys.delete(event.code) && !isEditing(event.target)) event.preventDefault(); };
  const visibility = () => { if (document.hidden) clear(); };
  const focus = (event: FocusEvent) => { if (isEditing(event.target)) clear(); };
  window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', visibility); document.addEventListener('focusin', focus);
  return {
    read: () => mapKeys(keys), clear,
    dispose: () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('focusin', focus); keys.clear(); },
  };
}
