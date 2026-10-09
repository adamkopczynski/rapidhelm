import { create } from 'zustand';
export const useSession = create<{ status: string; speed: number; resetId: number; restart(): void }>((set) => ({ status: 'Loading simulation', speed: 0, resetId: 0, restart: () => set((s) => ({ resetId: s.resetId + 1 })) }));
