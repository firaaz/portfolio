import { describe, expect, it } from "vitest";
import { CELL_BUDGET, computeLayout } from "../canvas/bento-layout";
import type { UXItem } from "../store/ux-store";

function makeItem(id: string, salience: number): UXItem {
  return {
    id,
    salience,
    group: "work",
    molecule: "project",
    data: {},
  };
}

describe("computeLayout — quantization thresholds", () => {
  it("salience 0.85 → tier 5 (hero, 4×3)", () => {
    const [entry] = computeLayout([makeItem("a", 0.85)]);
    expect(entry).toMatchObject({
      tier: 5,
      colSpan: 4,
      rowSpan: 3,
      hidden: false,
    });
  });

  it("salience 0.849 → tier 4 (2×3 portrait)", () => {
    const [entry] = computeLayout([makeItem("a", 0.849)]);
    expect(entry).toMatchObject({
      tier: 4,
      colSpan: 2,
      rowSpan: 3,
      hidden: false,
    });
  });

  it("salience 0.70 → tier 4", () => {
    const [entry] = computeLayout([makeItem("a", 0.7)]);
    expect(entry?.tier).toBe(4);
  });

  it("salience 0.55 → tier 3 (2×2)", () => {
    const [entry] = computeLayout([makeItem("a", 0.55)]);
    expect(entry).toMatchObject({ tier: 3, colSpan: 2, rowSpan: 2 });
  });

  it("salience 0.35 → tier 2 (2×1)", () => {
    const [entry] = computeLayout([makeItem("a", 0.35)]);
    expect(entry).toMatchObject({ tier: 2, colSpan: 2, rowSpan: 1 });
  });

  it("salience 0.15 → tier 1 (1×1)", () => {
    const [entry] = computeLayout([makeItem("a", 0.15)]);
    expect(entry).toMatchObject({ tier: 1, colSpan: 1, rowSpan: 1 });
  });

  it("salience below 0.15 → tier 0 hidden", () => {
    const [entry] = computeLayout([makeItem("a", 0.14)]);
    expect(entry).toMatchObject({ tier: 0, hidden: true });
  });
});

describe("computeLayout — hero uniqueness", () => {
  it("two items with salience ≥ 0.85 → one tier 5, one tier 4", () => {
    const layout = computeLayout([makeItem("a", 0.9), makeItem("b", 0.88)]);
    expect(layout.map((e) => e.tier)).toEqual([5, 4]);
  });

  it("three items all ≥ 0.85 → 5, 4, 4", () => {
    const layout = computeLayout([
      makeItem("a", 0.95),
      makeItem("b", 0.9),
      makeItem("c", 0.86),
    ]);
    expect(layout.map((e) => e.tier)).toEqual([5, 4, 4]);
  });
});

describe("computeLayout — budget enforcement", () => {
  it(`sum of visible cells never exceeds CELL_BUDGET (${CELL_BUDGET})`, () => {
    const layout = computeLayout(
      Array.from({ length: 20 }, (_, i) => makeItem(`a${i}`, 0.9)),
    );
    const usedCells = layout
      .filter((e) => !e.hidden)
      .reduce((sum, e) => sum + e.colSpan * e.rowSpan, 0);
    expect(usedCells).toBeLessThanOrEqual(CELL_BUDGET);
  });

  it("items that don't fit become hidden", () => {
    const layout = computeLayout(
      Array.from({ length: 40 }, (_, i) => makeItem(`a${i}`, 0.9)),
    );
    expect(layout.some((e) => e.hidden)).toBe(true);
  });

  it("hidden items form a suffix (never interleaved)", () => {
    const layout = computeLayout(
      Array.from({ length: 40 }, (_, i) => makeItem(`a${i}`, 0.9)),
    );
    const firstHiddenIdx = layout.findIndex((e) => e.hidden);
    if (firstHiddenIdx === -1) return;
    for (let i = firstHiddenIdx; i < layout.length; i += 1) {
      expect(layout[i]?.hidden).toBe(true);
    }
  });
});

describe("computeLayout — ordering", () => {
  it("output order matches input sorted by salience descending", () => {
    const layout = computeLayout([
      makeItem("low", 0.2),
      makeItem("high", 0.9),
      makeItem("mid", 0.5),
    ]);
    expect(layout.map((e) => e.id)).toEqual(["high", "mid", "low"]);
  });

  it("preserves input order on salience ties (stable sort)", () => {
    const layout = computeLayout([
      makeItem("first", 0.5),
      makeItem("second", 0.5),
    ]);
    expect(layout.map((e) => e.id)).toEqual(["first", "second"]);
  });
});

describe("computeLayout — defaults", () => {
  it("empty input → empty output", () => {
    expect(computeLayout([])).toEqual([]);
  });
});
