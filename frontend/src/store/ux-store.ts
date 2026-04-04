import { create } from "zustand";

export interface UXGlobals {
  tempo: number;
  agency: number;
}

export interface UXItem {
  id: string;
  salience: number;
  group: string;
  molecule: string;
  data: Record<string, unknown>;
}

export interface SalienceUpdate {
  id: string;
  salience: number;
}

interface UXState {
  ux: UXGlobals;
  items: UXItem[];
  setSnapshot: (snapshot: { ux: UXGlobals; items: UXItem[] }) => void;
  applySalience: (updates: SalienceUpdate[]) => void;
  setTempo: (tempo: number) => void;
  setAgency: (agency: number) => void;
}

export const useUXStore = create<UXState>((set) => ({
  ux: { tempo: 0.5, agency: 0.5 },
  items: [],
  setSnapshot: (snapshot) => set({ ux: snapshot.ux, items: snapshot.items }),
  applySalience: (updates) =>
    set((state) => {
      const updateMap = new Map(updates.map((u) => [u.id, u.salience]));
      return {
        items: state.items.map((item) => {
          const newSalience = updateMap.get(item.id);
          return newSalience !== undefined ? { ...item, salience: newSalience } : item;
        }),
      };
    }),
  setTempo: (tempo) => set((state) => ({ ux: { ...state.ux, tempo } })),
  setAgency: (agency) => set((state) => ({ ux: { ...state.ux, agency } })),
}));

export function peakSalienceGroup(state: UXState): string | undefined {
  if (state.items.length === 0) return undefined;
  const peak = state.items.reduce((best, item) =>
    item.salience > best.salience ? item : best,
  );
  return peak.group;
}
