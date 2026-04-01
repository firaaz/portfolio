import { create } from "zustand";

export interface ManifestItem {
  id: string;
  importance: number;
  molecule: string;
  data: Record<string, unknown>;
}

interface ManifestState {
  items: ManifestItem[];
  setManifest: (items: ManifestItem[]) => void;
  getHero: () => ManifestItem | undefined;
}

export const useManifestStore = create<ManifestState>((set, get) => ({
  items: [],
  setManifest: (items) => set({ items }),
  getHero: () => {
    const { items } = get();
    const heroItems = items.filter((item) => item.importance >= 0.9);
    if (heroItems.length === 0) return undefined;
    return heroItems.reduce((best, item) =>
      item.importance > best.importance ? item : best,
    );
  },
}));
