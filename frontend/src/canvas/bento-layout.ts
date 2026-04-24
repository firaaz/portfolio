import type { UXItem } from "../store/ux-store";

export type Tier = 0 | 1 | 2 | 3 | 4 | 5;

export interface LayoutEntry {
  id: string;
  tier: Tier;
  colSpan: number;
  rowSpan: number;
  hidden: boolean;
}

export const CELL_BUDGET = 36;

interface TierSpec {
  threshold: number;
  tier: Tier;
  cols: number;
  rows: number;
}

const TIER_SPECS: TierSpec[] = [
  { threshold: 0.85, tier: 5, cols: 4, rows: 3 },
  { threshold: 0.7, tier: 4, cols: 3, rows: 2 },
  { threshold: 0.55, tier: 3, cols: 2, rows: 2 },
  { threshold: 0.35, tier: 2, cols: 2, rows: 1 },
  { threshold: 0.15, tier: 1, cols: 1, rows: 1 },
];

const DEMOTED_HERO = { tier: 4 as Tier, cols: 3, rows: 2 };

function quantize(salience: number): { tier: Tier; cols: number; rows: number } {
  for (const spec of TIER_SPECS) {
    if (salience >= spec.threshold) {
      return { tier: spec.tier, cols: spec.cols, rows: spec.rows };
    }
  }
  return { tier: 0, cols: 0, rows: 0 };
}

function sortBySalience(items: UXItem[]): UXItem[] {
  // Explicit index tiebreaker makes stability a defined contract, not an engine
  // assumption. Task 4 property tests assert descending-salience order where ties
  // preserve input order — this sort is load-bearing for those invariants.
  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const delta = b.item.salience - a.item.salience;
      return delta !== 0 ? delta : a.index - b.index;
    })
    .map((x) => x.item);
}

export function computeLayout(items: UXItem[]): LayoutEntry[] {
  const sorted = sortBySalience(items);

  const entries: LayoutEntry[] = [];
  let used = 0;
  let heroClaimed = false;
  let overflow = false;

  for (const item of sorted) {
    const q = quantize(item.salience);

    let tier = q.tier;
    let cols = q.cols;
    let rows = q.rows;

    if (tier === 5 && heroClaimed) {
      tier = DEMOTED_HERO.tier;
      cols = DEMOTED_HERO.cols;
      rows = DEMOTED_HERO.rows;
    }

    const cells = cols * rows;

    if (overflow || tier === 0 || used + cells > CELL_BUDGET) {
      entries.push({
        id: item.id,
        tier: 0,
        colSpan: 0,
        rowSpan: 0,
        hidden: true,
      });
      if (tier !== 0) overflow = true;
      continue;
    }

    if (tier === 5) heroClaimed = true;
    used += cells;
    entries.push({
      id: item.id,
      tier,
      colSpan: cols,
      rowSpan: rows,
      hidden: false,
    });
  }

  return entries;
}
