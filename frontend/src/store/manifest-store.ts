import { create } from "zustand";

export interface ManifestItem {
  id: string;
  importance: number;
  molecule: string;
  data: Record<string, unknown>;
}

export interface ImportanceUpdate {
  id: string;
  importance: number;
}

interface ManifestState {
  items: ManifestItem[];
  setManifest: (items: ManifestItem[]) => void;
  applyDelta: (updates: ImportanceUpdate[]) => void;
}

export const useManifestStore = create<ManifestState>((set) => ({
  items: [],
  setManifest: (items) => set({ items }),
  applyDelta: (updates) =>
    set((state) => {
      const updateMap = new Map(updates.map((u) => [u.id, u.importance]));
      return {
        items: state.items.map((item) => {
          const newImportance = updateMap.get(item.id);
          return newImportance !== undefined
            ? { ...item, importance: newImportance }
            : item;
        }),
      };
    }),
}));

export function getHero(state: ManifestState): ManifestItem | undefined {
  const heroItems = state.items.filter((item) => item.importance >= 0.9);
  if (heroItems.length === 0) return undefined;
  return heroItems.reduce((best, item) =>
    item.importance > best.importance ? item : best,
  );
}
