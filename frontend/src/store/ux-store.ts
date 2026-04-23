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
  emphasis?: string[];
  generated?: Record<string, string>;
}

export interface SalienceUpdate {
  id: string;
  salience: number;
}

export interface BridgeEntry {
  source_id: string;
  target_id: string;
  text: string;
}

interface UXState {
  ux: UXGlobals;
  items: UXItem[];
  bridges: BridgeEntry[];
  setSnapshot: (snapshot: { ux: UXGlobals; items: UXItem[] }) => void;
  applySalience: (updates: SalienceUpdate[]) => void;
  setTempo: (tempo: number) => void;
  setAgency: (agency: number) => void;
  applyFocus: (itemId: string, importance: number, emphasis: string[]) => void;
  applyRecede: (itemId: string, importance: number) => void;
  applySurface: (itemId: string, generated: Record<string, string>) => void;
  addBridge: (sourceId: string, targetId: string, text: string) => void;
}

export const useUXStore = create<UXState>((set) => ({
  ux: { tempo: 0.5, agency: 0.5 },
  items: [],
  bridges: [],
  setSnapshot: (snapshot) => set({ ux: snapshot.ux, items: snapshot.items }),
  applySalience: (updates) =>
    set((state) => {
      const updateMap = new Map(updates.map((u) => [u.id, u.salience]));
      return {
        items: state.items.map((item) => {
          const newSalience = updateMap.get(item.id);
          return newSalience !== undefined
            ? { ...item, salience: newSalience }
            : item;
        }),
      };
    }),
  setTempo: (tempo) => set((state) => ({ ux: { ...state.ux, tempo } })),
  setAgency: (agency) => set((state) => ({ ux: { ...state.ux, agency } })),
  applyFocus: (itemId, importance, emphasis) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, salience: importance, emphasis } : item,
      ),
    })),
  applyRecede: (itemId, importance) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, salience: importance } : item,
      ),
    })),
  applySurface: (itemId, generated) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, generated } : item,
      ),
    })),
  addBridge: (sourceId, targetId, text) =>
    set((state) => ({
      bridges: [
        ...state.bridges,
        { source_id: sourceId, target_id: targetId, text },
      ],
    })),
}));

export function peakSalienceGroup(state: UXState): string | undefined {
  if (state.items.length === 0) return undefined;
  const peak = state.items.reduce((best, item) =>
    item.salience > best.salience ? item : best,
  );
  return peak.group;
}
