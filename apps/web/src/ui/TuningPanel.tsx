import { useState } from 'react';
import { boatConfigSchema, boatFields, type BoatConfig } from '@rapidhelm/content-schema';
import { useSession } from '../store';
import { baseline } from '../game/config';
import { Button } from './button';
export function TuningPanel() {
  const config = useSession((s) => s.config);
  const [draft, setDraft] = useState<Record<keyof BoatConfig, string>>(() => Object.fromEntries(Object.entries(config).map(([k, v]) => [k, String(v)])) as Record<keyof BoatConfig, string>);
  const [errors, setErrors] = useState<Partial<Record<keyof BoatConfig, string>>>({});
  const [message, setMessage] = useState('Baseline loaded. Changes apply on reset.');
  const apply = () => {
    const values = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v.trim() === '' ? NaN : Number(v)]));
    const result = boatConfigSchema.safeParse(values);
    if (!result.success) {
      const next: Partial<Record<keyof BoatConfig, string>> = {};
      for (const issue of result.error.issues) { const key = issue.path[0] as keyof BoatConfig; const f = boatFields[key]; next[key] = `Enter a number from ${f.min} to ${f.max}.`; }
      setErrors(next); setMessage('Configuration not applied. Correct the marked fields.'); return;
    }
    setErrors({}); useSession.getState().applyConfig(result.data); setMessage('Configuration applied. Boat reset.');
  };
  const restore = () => {
    setDraft(Object.fromEntries(Object.entries(baseline.config).map(([k, v]) => [k, String(v)])) as Record<keyof BoatConfig, string>);
    setErrors({}); useSession.getState().applyConfig({ ...baseline.config }); setMessage('Baseline restored. Boat reset.');
  };
  return <details className="tuning"><summary>Handling laboratory</summary><p className="note">Experimental K1 preset · continuous thrust. Applying tuning resets motion.</p><form onSubmit={(event) => { event.preventDefault(); apply(); }} noValidate>
    <div className="fields">{(Object.keys(boatFields) as (keyof BoatConfig)[]).map((key) => { const f = boatFields[key]; return <label key={key} htmlFor={key}>{f.label}<span>{f.unit}</span><input id={key} type="number" min={f.min} max={f.max} step="any" value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined} />{errors[key] && <em id={`${key}-error`}>{errors[key]}</em>}</label>; })}</div>
    <div className="actions"><Button type="submit">Apply tuning</Button><Button type="button" onClick={restore}>Restore defaults</Button></div><p className="note" aria-live="polite" data-testid="tuning-message">{message}</p>
  </form></details>;
}
