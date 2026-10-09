import { create } from 'zustand';
import type { BoatConfig } from '@rapidhelm/content-schema';
import { baseline } from './game/config';
export interface Diagnostics {
  surfaceHeight:number; progress:number; courseFlow:number;
  forwardSpeed: number; lateralSpeed: number; yawRate: number; heading: number; x: number; z: number;
  flowX: number; flowZ: number; waveStrength: number; contacts: number;
  steps: number; simulationMs: number; renderMs: number; frameMs: number;
}
export const emptyDiagnostics: Diagnostics = { surfaceHeight:4.5,progress:5,courseFlow:0,forwardSpeed: 0, lateralSpeed: 0, yawRate: 0, heading: 0, x: 0, z: 5, flowX: 0, flowZ: 0, waveStrength: 0, contacts: 0, steps: 0, simulationMs: 0, renderMs: 0, frameMs: 0 };
interface Session {
  status: string; diagnostics: Diagnostics; config: BoatConfig; configRevision: number; resetId: number; debug: boolean; overview:boolean;
  setOverview(value:boolean):void;
  restart(): void; applyConfig(config: BoatConfig): void; setDebug(debug: boolean): void;
}
export const useSession = create<Session>((set) => ({
  status: 'Loading simulation', diagnostics: emptyDiagnostics, config: baseline.config, configRevision: 0, resetId: 0, debug: false,overview:false,
  setOverview:(overview)=>set({overview}),
  restart: () => set((s) => ({ resetId: s.resetId + 1, diagnostics: emptyDiagnostics })),
  applyConfig: (config) => set((s) => ({ config, configRevision: s.configRevision + 1, diagnostics: emptyDiagnostics })),
  setDebug: (debug) => set({ debug }),
}));
