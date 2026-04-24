import fc from "fast-check";
import { describe, it } from "vitest";
import type { UXItem } from "../store/ux-store";
import { CELL_BUDGET, computeLayout } from "../canvas/bento-layout";

const itemArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 }),
  salience: fc.double({ min: 0, max: 1, noNaN: true }),
  group: fc.constantFrom("work", "identity", "meta"),
  molecule: fc.constantFrom("project", "experience", "skill", "contact"),
  data: fc.constant({}),
}) as fc.Arbitrary<UXItem>;

const itemsArb = fc.array(itemArb, { minLength: 0, maxLength: 50 });

describe("computeLayout — invariants", () => {
  it("visible cell sum never exceeds CELL_BUDGET", () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const layout = computeLayout(items);
        const used = layout
          .filter((e) => !e.hidden)
          .reduce((sum, e) => sum + e.colSpan * e.rowSpan, 0);
        return used <= CELL_BUDGET;
      }),
    );
  });

  it("at most one tier 5 entry exists", () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const layout = computeLayout(items);
        const heroCount = layout.filter((e) => e.tier === 5).length;
        return heroCount <= 1;
      }),
    );
  });

  it("output length matches input length", () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const layout = computeLayout(items);
        return layout.length === items.length;
      }),
    );
  });

  it("visible entries appear in descending salience order", () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const layout = computeLayout(items);
        const salienceById = new Map(items.map((i) => [i.id, i.salience]));
        const visible = layout.filter((e) => !e.hidden);
        for (let i = 1; i < visible.length; i += 1) {
          const prev = salienceById.get(visible[i - 1]!.id) ?? 0;
          const curr = salienceById.get(visible[i]!.id) ?? 0;
          if (prev < curr) return false;
        }
        return true;
      }),
    );
  });

  it("hidden entries form a suffix (never interleaved with visible)", () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const layout = computeLayout(items);
        const firstHidden = layout.findIndex((e) => e.hidden);
        if (firstHidden === -1) return true;
        return layout.slice(firstHidden).every((e) => e.hidden);
      }),
    );
  });

  it("deterministic: same input produces same output", () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const a = computeLayout(items);
        const b = computeLayout(items);
        return JSON.stringify(a) === JSON.stringify(b);
      }),
    );
  });

  it("hidden entries have zero spans", () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const layout = computeLayout(items);
        return layout
          .filter((e) => e.hidden)
          .every((e) => e.colSpan === 0 && e.rowSpan === 0 && e.tier === 0);
      }),
    );
  });
});
