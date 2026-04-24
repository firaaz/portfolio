# FEAT-003 — Breathing Bento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fixed seven-zone canvas with a salience-driven 6×6 bento grid using Framer Motion FLIP for card resize, front-loaded with `ux:signal` emission and tightened dispatch so the agent cascade reads as "thinking then acting" rather than scripted CSS.

**Architecture:** A pure `computeLayout(items)` function quantizes salience to (colSpan, rowSpan) tiers; `<Bento>` wraps each card in `<motion.div layout>` for spring-physics FLIP transitions. Backend emits `STATE_SNAPSHOT → ux:signal → ux:recede* → ux:focus* → ux:bridge* → ux:surface*` with 150–350ms staggered gaps. `ux:signal` is synthesized from `referrer_type` pre-LLM so latency is legible. Mobile collapses to single column; `prefers-reduced-motion` short-circuits animation.

**Tech Stack:** Frontend — React 19, Vite, TypeScript, motion@12 (`motion/react`), Zustand, vitest + fast-check (new), Playwright. Backend — FastAPI, Pydantic 2, pytest. Per existing ADR stack.

**Branch:** Create `feat/003-breathing-bento` off `develop` after merging `feat/002-stream-integration`. If FEAT-002 is not yet merged at start, confirm with user before branching.

---

## File Structure

**Created:**
- `docs/adrs/0008-motion-flip-under-layout-change.md` — supersedes ADR-0007's transform ban for layout-bridging FLIP only
- `frontend/src/canvas/bento-layout.ts` — pure `computeLayout` + types + constants
- `frontend/src/canvas/Bento.tsx` — grid shell, motion-wrapped cards
- `frontend/src/__tests__/bento-layout.test.ts` — example-based unit tests
- `frontend/src/__tests__/bento-layout.property.test.ts` — fast-check invariants
- `frontend/src/__tests__/Bento.test.tsx` — component / BDD tests
- `frontend/e2e/bento-cascade.spec.ts` — Playwright BDD scenarios
- `backend/src/app/adapters/api/signal_builder.py` — synthesize `ux:signal` from `VisitorContext`
- `backend/tests/test_signal_builder.py` — unit tests for the synthesizer

**Modified:**
- `docs/adrs/0007-breathing-motion-language.md` — `superseded by` field only
- `frontend/src/canvas/Canvas.tsx` — delegate content area to `<Bento>`, replace "Loading…" with neutral render
- `frontend/src/index.css` — remove `.zone-*`, `.surface-grid`, `.breathing-extra`; add `.bento-grid`, `.bento-card`, mobile collapse
- `frontend/src/__tests__/Canvas.test.tsx` — rewrite for new rendering
- `frontend/package.json` — add `fast-check` dev dep
- `backend/src/app/adapters/api/stream_route.py` — emit `ux:signal` between snapshot and LLM await
- `backend/src/app/adapters/api/command_route.py` — emit `ux:signal` first in cascade
- `backend/src/app/adapters/api/dispatch.py` — default gaps 150/350ms
- `backend/tests/test_dispatch.py` — assert new defaults
- `backend/tests/test_stream_intelligence.py` — assert `ux:signal` first after snapshot
- `backend/tests/test_command_intelligence.py` — assert `ux:signal` first

**Deleted:**
- `frontend/src/canvas/zone-map.ts`
- `frontend/src/canvas/ZoneLabel.tsx`
- `frontend/src/__tests__/zone-map.test.ts`
- `frontend/src/__tests__/ZoneLabel.test.tsx`
- `frontend/e2e/breathing.spec.ts` (content absorbed into `bento-cascade.spec.ts`)
- `frontend/e2e/layout.spec.ts` (content absorbed into `bento-cascade.spec.ts` or deleted if redundant)

---

## Task 1: Draft ADR-0008 and supersede ADR-0007

**Rationale:** Documents the motion-language evolution before any code touches `transform`. Per user's immutable-ADR rule, ADR-0007 must not be edited except for its `superseded by` field.

**Files:**
- Create: `docs/adrs/0008-motion-flip-under-layout-change.md`
- Modify: `docs/adrs/0007-breathing-motion-language.md`

- [ ] **Step 1: Create ADR-0008**

Write the following to `docs/adrs/0008-motion-flip-under-layout-change.md`:

```markdown
# FLIP Transforms Under Layout Change

## Status
accepted

## Date
2026-04-24

## Participants
Firaaz Farook, Claude (AI pair)

## Context and Problem Statement
ADR-0007 established a three-property allowlist for animated layout transitions (`grid-template-rows`, `grid-template-columns`, `gap`) and explicitly forbade `transform` animations on any element. This was the right call for preventing ornamental motion — bouncy modals, sliding nav bars, cheap app-like animation.

FEAT-003 (breathing bento) introduces salience-driven per-card spans in a 6×6 bento grid. When salience changes, cards physically resize and reflow. ADR-0007's allowlist is insufficient: animating `grid-template-columns` on the container works for uniform row/column changes but cannot smoothly animate individual card span changes when `grid-auto-flow: dense` repacks the grid. Without `transform`-based FLIP, cards either jump cut (no animation) or suffer layout thrashing on every reflow.

The question: can we permit `transform` for the specific case of bridging a layout change (FLIP: measure-before, measure-after, interpolate via transform) without re-opening the door to ornamental motion that ADR-0004/0007 were designed to prevent?

## Decision Drivers
- Breathing bento requires cards to visibly resize as salience changes — this is core to the agent-legibility thesis
- Framer Motion's `layout` prop is the industry-standard FLIP implementation; no custom ground-up build
- ADR-0004's "calm, editorial" principle and ADR-0007's "tight allowlist" spirit must survive
- Spring physics, not eased timing, to avoid the "app-like" settle
- `prefers-reduced-motion` must fully disable animation (non-negotiable)
- Constraint must be scope-fenced so it cannot justify arbitrary future `transform` animations

## Decision Outcome

### Transform is permitted only as a FLIP bridge during layout change

Transform animations are allowed on `.bento-card` elements (and descendants of `.bento-grid`) only when:

1. The animation is driven by `<motion.div layout>` from the `motion` library
2. The motion is a measurable response to a grid reflow (span change, item insertion/removal)
3. The transition uses spring physics with `{ type: "spring", stiffness: 200, damping: 22 }` or settings within ±20% of those values (perceived settle ≤ 400ms)
4. No transform animations are added for entrance, exit, hover, focus, or other non-layout causes

Decorative transform animations — scale on hover, translate on click, skew, rotate, idle breathing — remain forbidden by ADR-0004 and are not unlocked by this ADR.

### Relationship to ADR-0007

ADR-0007's allowlist (`grid-template-rows`, `grid-template-columns`, `gap`) remains in force for grid *containers* at the canvas level. This ADR extends the vocabulary to cover *items* within the bento grid under the scope fence above.

The hierarchy:
- **Page container (`<main>`):** ADR-0007 — grid-template + gap transitions only
- **Bento grid (`.bento-grid`):** ADR-0007 — grid-template + gap transitions only
- **Bento cards (`.bento-card`):** ADR-0008 — transform via FLIP under layout change, spring settle

### Reduced motion

When `prefers-reduced-motion: reduce` is active:
- `<motion.div layout={false}>` — animation disabled; span changes apply instantly
- No transform is written to the style attribute at any point in the reduced-motion path
- This is enforced via `useReducedMotion()` from `motion/react`, not CSS

## Consequences
- Good: breathing bento becomes implementable without ground-up FLIP; motion library's layout algorithm handles measurement and interpolation; spring physics preserve calm settle; reduced-motion path is clean and complete
- Bad: "no transforms" as a blanket rule is no longer true — future developers must read this ADR to understand the scope fence; Framer Motion's `layout` prop has runtime cost (every layout change triggers measurement) which is acceptable at 6×6 = 36 cells but would be concerning at much larger grids

## Supersedes
ADR-0007 (partially — container-level rules stand; item-level transform ban lifted for bento context)
```

- [ ] **Step 2: Update ADR-0007's status**

Edit `docs/adrs/0007-breathing-motion-language.md`, change the `## Status` block from:

```markdown
## Status
accepted
```

to:

```markdown
## Status
partially superseded by [ADR-0008](0008-motion-flip-under-layout-change.md) — item-level transform ban lifted for bento FLIP; container-level rules stand
```

Do not change any other content in ADR-0007.

- [ ] **Step 3: Commit**

```bash
git add docs/adrs/0007-breathing-motion-language.md docs/adrs/0008-motion-flip-under-layout-change.md
git commit -m "docs(adr): add ADR-0008 FLIP transforms under layout change

Supersedes ADR-0007's item-level transform ban for the specific case of
bridging a grid reflow via Framer Motion's layout prop. Scope-fenced to
.bento-card under .bento-grid, spring physics mandated for calm settle,
prefers-reduced-motion short-circuits animation entirely. Container-level
allowlist from ADR-0007 remains in force."
```

---

## Task 2: Add fast-check dev dependency

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install fast-check**

```bash
cd frontend && pnpm add -D fast-check
```

Expected: exits 0; `package.json` devDependencies gains `"fast-check": "^3.x.x"`; `pnpm-lock.yaml` updated.

- [ ] **Step 2: Verify import**

Run:
```bash
cd frontend && pnpm vitest run --reporter=verbose --no-coverage 2>&1 | head -20
```
Expected: existing test suite passes (92 tests as of FEAT-002). No regression from the new dep.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "chore(frontend): add fast-check dev dep for property-based tests"
```

---

## Task 3: Pure layout function — types + example tests (TDD)

**Rationale:** Build the quantizer bottom-up. Pure function, no React, no store — testable in isolation.

**Files:**
- Create: `frontend/src/canvas/bento-layout.ts`
- Create: `frontend/src/__tests__/bento-layout.test.ts`

- [ ] **Step 1: Write failing example tests**

Create `frontend/src/__tests__/bento-layout.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import type { UXItem } from "../store/ux-store";
import { CELL_BUDGET, computeLayout } from "../canvas/bento-layout";

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
    expect(entry).toMatchObject({ tier: 5, colSpan: 4, rowSpan: 3, hidden: false });
  });

  it("salience 0.849 → tier 4 (3×2)", () => {
    const [entry] = computeLayout([makeItem("a", 0.849)]);
    expect(entry).toMatchObject({ tier: 4, colSpan: 3, rowSpan: 2, hidden: false });
  });

  it("salience 0.70 → tier 4", () => {
    const [entry] = computeLayout([makeItem("a", 0.70)]);
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
    const layout = computeLayout([
      makeItem("a", 0.90),
      makeItem("b", 0.88),
    ]);
    expect(layout.map((e) => e.tier)).toEqual([5, 4]);
  });

  it("three items all ≥ 0.85 → 5, 4, 4", () => {
    const layout = computeLayout([
      makeItem("a", 0.95),
      makeItem("b", 0.90),
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && pnpm vitest run bento-layout.test.ts
```
Expected: FAIL — `Cannot find module '../canvas/bento-layout'`.

- [ ] **Step 3: Implement `bento-layout.ts`**

Create `frontend/src/canvas/bento-layout.ts`:

```typescript
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

export function computeLayout(items: UXItem[]): LayoutEntry[] {
  const sorted = [...items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const delta = b.item.salience - a.item.salience;
      return delta !== 0 ? delta : a.index - b.index;
    })
    .map((x) => x.item);

  const entries: LayoutEntry[] = [];
  let used = 0;
  let heroClaimed = false;
  let overflow = false;

  for (const item of sorted) {
    const q = quantize(item.salience);

    let tier: Tier = q.tier;
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
      overflow = true;
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && pnpm vitest run bento-layout.test.ts
```
Expected: all example tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/canvas/bento-layout.ts frontend/src/__tests__/bento-layout.test.ts
git commit -m "feat(canvas): add pure computeLayout quantizer with example tests

Maps salience (0.0-1.0) to tier (0-5) with (colSpan, rowSpan) spans:
5 (4x3 hero, unique) -> 4 (3x2 major) -> 3 (2x2 feature) -> 2 (2x1
supporting) -> 1 (1x1 recessed) -> 0 (hidden suffix, aria-hidden).
Greedy allocator respects 36-cell budget; second tier-5 demotes to
tier-4 to preserve hero uniqueness; hidden items form a suffix."
```

---

## Task 4: Property-based tests for computeLayout

**Files:**
- Create: `frontend/src/__tests__/bento-layout.property.test.ts`

- [ ] **Step 1: Write property tests**

Create `frontend/src/__tests__/bento-layout.property.test.ts`:

```typescript
import fc from "fast-check";
import { describe, expect, it } from "vitest";
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
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd frontend && pnpm vitest run bento-layout.property.test.ts
```
Expected: all 7 property tests pass (each runs ~100 generated cases).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/__tests__/bento-layout.property.test.ts
git commit -m "test(canvas): add fast-check property invariants for computeLayout

Seven invariants: cell budget never exceeded, hero uniqueness, output
length matches input, visible entries in descending salience order,
hidden suffix property, determinism, hidden entries have zero spans.
100 generated inputs per property (fast-check default)."
```

---

## Task 5: Tighten staggered dispatch defaults

**Files:**
- Modify: `backend/src/app/adapters/api/dispatch.py`
- Modify: `backend/tests/test_dispatch.py`

- [ ] **Step 1: Read the existing test to learn its assertion style**

```bash
cat backend/tests/test_dispatch.py
```
Read the file. The existing tests reference `min_gap_ms` / `max_gap_ms` defaults. Note what they assert before rewriting.

- [ ] **Step 2: Update dispatch defaults**

Edit `backend/src/app/adapters/api/dispatch.py`:

Change the function signature:

```python
async def staggered_dispatch(
    events: list[str],
    min_gap_ms: int = 150,
    max_gap_ms: int = 350,
) -> AsyncGenerator[str, None]:
```

The docstring stays. The implementation (`random.randint(min_gap_ms, max_gap_ms) / 1000.0`) is unchanged.

- [ ] **Step 3: Update dispatch tests**

Edit `backend/tests/test_dispatch.py`. For any test that asserts the default gap range lies within `[400, 800]`, change the assertion to `[150, 350]`. If tests explicitly pass `min_gap_ms=400`, leave them — the test caller sets the range and that is the test subject.

Concretely, any assertion of the form:
```python
assert 0.4 <= elapsed <= 1.0  # old 400-800ms range with tolerance
```
becomes:
```python
assert 0.15 <= elapsed <= 0.5  # new 150-350ms range with tolerance
```

The tolerance accommodates asyncio scheduling jitter.

- [ ] **Step 4: Run dispatch tests**

```bash
cd backend && uv run pytest tests/test_dispatch.py -v
```
Expected: all dispatch tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/app/adapters/api/dispatch.py backend/tests/test_dispatch.py
git commit -m "feat(api): tighten staggered dispatch gaps to 150-350ms

Drops defaults from 400-800ms to 150-350ms per FEAT-003 spec. Combined
with spring-settled FLIP on the frontend, overlapping transitions make
the cascade feel continuous instead of beat-by-beat. ADR-0003's
staggered dispatch primitive is unchanged; only default timing shifts."
```

---

## Task 6: Backend — synthesize ux:signal from VisitorContext (pre-LLM)

**Rationale:** The signal must fire between STATE_SNAPSHOT and the LLM await so visitors see "agent is thinking" during the round-trip. Signal content is derived from `referrer_type` — no LLM call needed for the narration.

**Files:**
- Create: `backend/src/app/adapters/api/signal_builder.py`
- Create: `backend/tests/test_signal_builder.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_signal_builder.py`:

```python
"""Unit tests for signal_builder — pre-LLM ux:signal synthesis."""

from app.adapters.api.signal_builder import build_signal_event
from app.domain.context import VisitorContext


class TestBuildSignalEvent:
    """Tests for build_signal_event synthesizer."""

    def test_linkedin_referrer_produces_leadership_reasoning(self) -> None:
        ctx = VisitorContext(referrer_type="linkedin", utm_source=None)
        event = build_signal_event(ctx)
        assert "linkedin" in event.lower() or "leadership" in event.lower()
        assert '"eventType": "ux:signal"' in event

    def test_github_referrer_produces_technical_reasoning(self) -> None:
        ctx = VisitorContext(referrer_type="github", utm_source=None)
        event = build_signal_event(ctx)
        assert "github" in event.lower() or "technical" in event.lower()

    def test_unknown_referrer_uses_lower_confidence(self) -> None:
        ctx = VisitorContext(referrer_type="unknown", utm_source=None)
        event = build_signal_event(ctx)
        # Payload contains confidence; parse minimally
        import json
        payload_line = event.strip().removeprefix("data: ")
        parsed = json.loads(payload_line)
        confidence = parsed["custom"]["confidence"]
        assert 0.2 <= confidence <= 0.6

    def test_known_referrer_uses_higher_confidence(self) -> None:
        ctx = VisitorContext(referrer_type="linkedin", utm_source=None)
        event = build_signal_event(ctx)
        import json
        payload_line = event.strip().removeprefix("data: ")
        parsed = json.loads(payload_line)
        confidence = parsed["custom"]["confidence"]
        assert 0.6 <= confidence <= 0.85

    def test_event_format_is_sse_compliant(self) -> None:
        ctx = VisitorContext(referrer_type="linkedin", utm_source=None)
        event = build_signal_event(ctx)
        assert event.startswith("data: ")
        assert event.endswith("\n\n")
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && uv run pytest tests/test_signal_builder.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'app.adapters.api.signal_builder'`.

- [ ] **Step 3: Implement signal_builder**

Create `backend/src/app/adapters/api/signal_builder.py`:

```python
"""Pre-LLM ux:signal synthesizer — narrates agent intent from referrer context."""

from app.adapters.api.ux_events import ux_signal_event
from app.domain.context import VisitorContext

_REASONINGS: dict[str, tuple[str, float]] = {
    "linkedin": (
        "LinkedIn visitor — elevating leadership and business impact.",
        0.75,
    ),
    "github": (
        "GitHub visitor — elevating technical depth and projects.",
        0.72,
    ),
    "direct": (
        "Direct visitor — holding the neutral composition.",
        0.55,
    ),
    "unknown": (
        "Observing — will recompose once intent becomes clearer.",
        0.35,
    ),
}


def build_signal_event(context: VisitorContext) -> str:
    """Return an SSE ux:signal event synthesized from the referrer context."""
    reasoning, confidence = _REASONINGS.get(
        context.referrer_type, _REASONINGS["unknown"]
    )
    return ux_signal_event(confidence=confidence, reasoning=reasoning)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_signal_builder.py -v
```
Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/app/adapters/api/signal_builder.py backend/tests/test_signal_builder.py
git commit -m "feat(api): add signal_builder for pre-LLM ux:signal synthesis

Synthesizes 'agent is thinking' narration from VisitorContext without
needing an LLM round-trip. Four mappings (linkedin/github/direct/
unknown) each yield a reasoning string plus confidence in [0.35, 0.75].
Called from stream/command routes between STATE_SNAPSHOT and the LLM
await, so latency is legible rather than invisible dead air."
```

---

## Task 7: Wire ux:signal into stream_route

**Files:**
- Modify: `backend/src/app/adapters/api/stream_route.py`
- Modify: `backend/tests/test_stream_intelligence.py`

- [ ] **Step 1: Inspect current test assertions**

```bash
cd backend && uv run pytest tests/test_stream_intelligence.py -v --collect-only
```
Note existing test names and assertion patterns so you can align signal assertions consistently.

- [ ] **Step 2: Update stream_route to emit ux:signal**

Edit `backend/src/app/adapters/api/stream_route.py`, modify `_generate_stream`:

```python
async def _generate_stream(context: VisitorContext) -> AsyncGenerator[str]:
    """Yield AG-UI events: snapshot, signal, then five-verb events."""
    catalog = load_catalog()
    default_state = content_to_ux_state(catalog)
    yield ux_snapshot_event(default_state)
    yield build_signal_event(context)

    llm = _get_llm_port()
    if llm is None:
        return

    cache = _get_cache()
    cached = cache.get(context.referrer_type)
    if cached is None:
        profile = VisitorProfile(session_id="anonymous", context=context)
        strategy = SelectStrategy()
        cached = await evaluate_intelligence(
            strategy,
            SELECT_SYSTEM_PROMPT,
            llm,
            profile,
            catalog,
        )
        if cached is None:
            return
        cache.set(context.referrer_type, cached, _cache_ttl())

    events = intelligence_to_events(cached)
    async for ev in staggered_dispatch(events):
        yield ev
```

Add the new import near the top:

```python
from app.adapters.api.signal_builder import build_signal_event
```

- [ ] **Step 3: Add signal assertion to stream tests**

Edit `backend/tests/test_stream_intelligence.py`. Add a new test:

```python
def test_signal_fires_second_after_snapshot(self) -> None:
    """Verify ux:signal is the second SSE event, immediately after snapshot."""
    with TestClient(app) as client:
        response = client.get(
            "/api/agent/stream",
            headers={"Referer": "https://linkedin.com/example"},
        )
        body = response.text
        lines = [line for line in body.split("\n\n") if line.strip()]
        assert len(lines) >= 2
        assert "STATE_SNAPSHOT" in lines[0]
        assert "ux:signal" in lines[1]
```

If existing tests assert "the first event after snapshot is `ux:recede` or `ux:focus`," update them: the first event after snapshot is now `ux:signal`, and the recede/focus cascade starts at position 3.

- [ ] **Step 4: Run tests**

```bash
cd backend && uv run pytest tests/test_stream_intelligence.py -v
```
Expected: all tests pass including the new signal-position test.

- [ ] **Step 5: Commit**

```bash
git add backend/src/app/adapters/api/stream_route.py backend/tests/test_stream_intelligence.py
git commit -m "feat(api): emit ux:signal between snapshot and LLM await in stream_route

Signal fires as the second SSE event, right after STATE_SNAPSHOT and
before the LLM round-trip. Makes agent latency legible — visitor sees
the narration ('LinkedIn visitor, elevating leadership') while the
Select strategy is still evaluating, rather than dead air until events
arrive 500ms+ later."
```

---

## Task 8: Wire ux:signal into command_route

**Files:**
- Modify: `backend/src/app/adapters/api/command_route.py`
- Modify: `backend/tests/test_command_intelligence.py`

- [ ] **Step 1: Read current command_route**

```bash
cat backend/src/app/adapters/api/command_route.py
```
Note where `intelligence_to_events` is called and what yields prior events.

- [ ] **Step 2: Inject build_signal_event into command_route**

Edit `backend/src/app/adapters/api/command_route.py`:

Add the import:
```python
from app.adapters.api.signal_builder import build_signal_event
```

In the request handler's streaming generator, yield `build_signal_event(context)` immediately before the `intelligence_to_events(...)` loop (and after any snapshot yield if one exists). If `command_route` does not emit a snapshot, yield signal as the first event of the stream. The signal should always precede the five-verb cascade.

If the route uses the `context` name for the `VisitorContext` parameter, use that name. If it uses a different name (e.g., `visitor_ctx`), adapt accordingly.

- [ ] **Step 3: Add signal assertion to command tests**

Edit `backend/tests/test_command_intelligence.py`. Add:

```python
def test_signal_fires_first_in_command_cascade(self) -> None:
    """Verify ux:signal is the first SSE event in a command response."""
    with TestClient(app) as client:
        response = client.post(
            "/api/agent/command",
            json={"text": "show me projects"},
            headers={"Referer": "https://github.com/example"},
        )
        body = response.text
        lines = [line for line in body.split("\n\n") if line.strip()]
        assert len(lines) >= 1
        assert "ux:signal" in lines[0]
```

- [ ] **Step 4: Run tests**

```bash
cd backend && uv run pytest tests/test_command_intelligence.py tests/test_command_route.py -v
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/app/adapters/api/command_route.py backend/tests/test_command_intelligence.py
git commit -m "feat(api): emit ux:signal first in command_route cascade

Commands are ephemeral per-request (no cached snapshot to emit first),
so ux:signal is the lead event. Matches stream_route's pattern: agent
narration precedes layout events so the user sees intent before action."
```

---

## Task 9: Bento component — BDD tests first

**Files:**
- Create: `frontend/src/canvas/Bento.tsx`
- Create: `frontend/src/__tests__/Bento.test.tsx`

- [ ] **Step 1: Write failing BDD tests**

Create `frontend/src/__tests__/Bento.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Bento } from "../canvas/Bento";
import type { UXItem } from "../store/ux-store";
import { useUXStore } from "../store/ux-store";

function makeItem(
  id: string,
  salience: number,
  molecule: string = "project",
): UXItem {
  return {
    id,
    salience,
    group: "work",
    molecule,
    data: { title: id, description: `content for ${id}` },
  };
}

describe("Bento — rendering", () => {
  afterEach(() => {
    useUXStore.setState({ items: [], bridges: [] });
  });

  it("given no items, renders nothing in the grid", () => {
    render(<Bento items={[]} />);
    const grid = screen.getByRole("region", { name: /content/i });
    expect(grid.children.length).toBe(0);
  });

  it("given items, renders one card per non-hidden entry", () => {
    const items = [
      makeItem("a", 0.9),
      makeItem("b", 0.5),
      makeItem("c", 0.2),
    ];
    render(<Bento items={items} />);
    expect(screen.getByTestId("bento-card-a")).toBeInTheDocument();
    expect(screen.getByTestId("bento-card-b")).toBeInTheDocument();
    expect(screen.getByTestId("bento-card-c")).toBeInTheDocument();
  });

  it("given a tier-5 item, applies span 4/span 3 styles", () => {
    render(<Bento items={[makeItem("hero", 0.9)]} />);
    const card = screen.getByTestId("bento-card-hero");
    const style = card.getAttribute("style") ?? "";
    expect(style).toMatch(/grid-column:\s*span\s*4/);
    expect(style).toMatch(/grid-row:\s*span\s*3/);
  });

  it("given a hidden item (salience < 0.15), sets aria-hidden", () => {
    render(<Bento items={[makeItem("tiny", 0.05)]} />);
    const card = screen.getByTestId("bento-card-tiny");
    expect(card).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Bento — BDD: agent cascade", () => {
  afterEach(() => {
    useUXStore.setState({ items: [], bridges: [] });
  });

  it("given a LinkedIn cascade, when ux:focus raises contact salience to 0.7, then contact renders at tier 4 (larger than default)", () => {
    const items = [
      makeItem("contact-email", 0.7, "contact"),
      makeItem("project-x", 0.3, "project"),
    ];
    render(<Bento items={items} />);
    const contactCard = screen.getByTestId("bento-card-contact-email");
    const projectCard = screen.getByTestId("bento-card-project-x");
    const contactCells =
      Number(contactCard.style.gridColumn.match(/\d+/)?.[0] ?? 0) *
      Number(contactCard.style.gridRow.match(/\d+/)?.[0] ?? 0);
    const projectCells =
      Number(projectCard.style.gridColumn.match(/\d+/)?.[0] ?? 0) *
      Number(projectCard.style.gridRow.match(/\d+/)?.[0] ?? 0);
    expect(contactCells).toBeGreaterThan(projectCells);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
cd frontend && pnpm vitest run Bento.test.tsx
```
Expected: FAIL — `Cannot find module '../canvas/Bento'`.

- [ ] **Step 3: Implement Bento.tsx**

Create `frontend/src/canvas/Bento.tsx`:

```typescript
import { motion, useReducedMotion } from "motion/react";
import { MoleculeResolver } from "../molecules/MoleculeResolver";
import type { UXItem } from "../store/ux-store";
import { computeLayout } from "./bento-layout";

const SPRING = { type: "spring" as const, stiffness: 200, damping: 22 };

export function Bento({ items }: { items: UXItem[] }) {
  const layout = computeLayout(items);
  const itemsById = new Map(items.map((i) => [i.id, i]));
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="bento-grid"
      role="region"
      aria-label="Content"
    >
      {layout.map((entry) => {
        const item = itemsById.get(entry.id);
        if (!item) return null;
        const style = entry.hidden
          ? { display: "none" as const }
          : {
              gridColumn: `span ${entry.colSpan}`,
              gridRow: `span ${entry.rowSpan}`,
            };
        return (
          <motion.article
            key={entry.id}
            layout={reducedMotion ? false : true}
            transition={SPRING}
            data-testid={`bento-card-${entry.id}`}
            data-tier={entry.tier}
            className="bento-card"
            style={style}
            aria-hidden={entry.hidden ? true : undefined}
          >
            <MoleculeResolver
              molecule={item.molecule}
              data={item.data}
              emphasis={item.emphasis}
              generated={item.generated}
            />
          </motion.article>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && pnpm vitest run Bento.test.tsx
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/canvas/Bento.tsx frontend/src/__tests__/Bento.test.tsx
git commit -m "feat(canvas): add Bento component with motion.div layout FLIP

Pure rendering component: consumes UXItem[] + computeLayout, wraps each
visible card in motion.article with layout prop and spring physics
(stiffness 200, damping 22 per ADR-0008). Hidden tail becomes
display:none + aria-hidden. useReducedMotion() short-circuits layout
animation for WCAG compliance."
```

---

## Task 10: CSS migration — swap zone classes for bento classes

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Inspect current zone CSS**

Read `frontend/src/index.css` lines 156–290 to understand what classes exist.

- [ ] **Step 2: Remove zone classes, add bento classes**

Edit `frontend/src/index.css`.

**Delete** these blocks entirely:
- `.surface-grid { ... }` (the `display: grid; grid-template-columns: repeat(12, 1fr); ...` block)
- All `.zone`, `.zone-identity`, `.zone-featured`, `.zone-experience`, `.zone-other-work`, `.zone-skills`, `.zone-contact`, `.zone-education`, `.zone-command` rules
- `.breathing-extra { ... }` and `[data-breathing="true"] .breathing-extra { ... }`
- `.zone-dimmed { ... }` and `.zone-dimmed:hover { ... }`
- The `@media (prefers-reduced-motion: reduce)` block that references `.surface-grid` / `.surface-inset` etc. — replace per below

**Keep** these blocks:
- `.surface-inset`, `.surface-featured`, `.surface-recessed`, `.surface-base` — cards may still use these class modifiers for tonal variation

**Add** the following bento CSS (place it where `.surface-grid` used to be):

```css
/* Bento grid shell (FEAT-003 / ADR-0008) */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(6, 1fr);
  grid-auto-flow: dense;
  gap: 4px;
  height: 100dvh;
  max-width: 64rem;
  margin: 0 auto;
  padding: 32px;
  box-sizing: border-box;
}

.bento-card {
  background: rgba(28, 36, 48, 0.05);
  border: 1px solid rgba(28, 36, 48, 0.08);
  padding: 16px;
  overflow: hidden;
  transition: background 0.3s ease-out;
}
.bento-card:hover {
  background: rgba(28, 36, 48, 0.07);
}

/* Mobile collapse */
@media (max-width: 640px) {
  .bento-grid {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    grid-auto-flow: row;
    height: auto;
    min-height: 100dvh;
    padding: 16px;
  }
  .bento-card {
    grid-column: 1 !important;
    grid-row: auto !important;
  }
}

/* Reduced motion — Framer Motion handles FLIP disable via useReducedMotion;
   CSS mirror is defensive for any transitions added later. */
@media (prefers-reduced-motion: reduce) {
  .bento-card {
    transition: none;
  }
}

@media (max-height: 800px) {
  .bento-grid {
    padding: 16px;
  }
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
cd frontend && pnpm typecheck && pnpm lint
```
Expected: exits 0 (CSS files aren't lint-checked here, but catches any stale selectors referenced from TS).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/index.css
git commit -m "style(css): replace zone grid with bento grid shell

Removes seven named zone positions, .surface-grid row-template, and
.breathing-extra content reveal CSS. Adds .bento-grid (6x6,
auto-flow:dense) and .bento-card base styling. Mobile breakpoint
collapses to single column per FEAT-003 stability anchor. Surface
modifier classes (.surface-inset, .surface-featured, etc.) preserved
for tonal variation at the card level."
```

---

## Task 11: Canvas integration + delete zone code + neutral first paint

**Files:**
- Modify: `frontend/src/canvas/Canvas.tsx`
- Modify: `frontend/src/__tests__/Canvas.test.tsx`
- Delete: `frontend/src/canvas/zone-map.ts`
- Delete: `frontend/src/canvas/ZoneLabel.tsx`
- Delete: `frontend/src/__tests__/zone-map.test.ts`
- Delete: `frontend/src/__tests__/ZoneLabel.test.tsx`

- [ ] **Step 1: Rewrite Canvas.tsx**

Replace the entire contents of `frontend/src/canvas/Canvas.tsx` with:

```typescript
import { PresenceDot } from "../chrome/PresenceDot";
import type { UXItem } from "../store/ux-store";
import { useUXStore } from "../store/ux-store";
import { Bento } from "./Bento";

const NEUTRAL_SALIENCE = 0.5;

function neutralize(items: UXItem[]): UXItem[] {
  if (items.length === 0) return [];
  const hasAnyNonZero = items.some((i) => i.salience > 0);
  if (hasAnyNonZero) return items;
  return items.map((i) => ({ ...i, salience: NEUTRAL_SALIENCE }));
}

export function Canvas({
  onPresenceDotClick,
}: {
  onPresenceDotClick: () => void;
}) {
  const items = useUXStore((s) => s.items);
  const rendered = neutralize(items);

  return (
    <main className="canvas-shell">
      <Bento items={rendered} />
      <div className="canvas-chrome">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block text-[10px] text-ink-20">⌘K</span>
            <span className="block text-[9px] text-ink-20">
              Ask me anything
            </span>
          </div>
          <PresenceDot onClick={onPresenceDotClick} />
        </div>
      </div>
    </main>
  );
}
```

Note: the previous "Loading…" placeholder is replaced. If `items.length === 0` (store not hydrated), `Bento` renders an empty grid — which is still visible bento scaffolding, not a text string. This is the "optimistic first paint" behavior from the spec: something visible in <50ms.

- [ ] **Step 2: Add canvas-shell / canvas-chrome CSS**

Append to `frontend/src/index.css`:

```css
.canvas-shell {
  position: relative;
  width: 100%;
}

.canvas-chrome {
  position: fixed;
  bottom: 16px;
  right: 24px;
  z-index: 10;
  pointer-events: auto;
}
```

- [ ] **Step 3: Rewrite Canvas.test.tsx**

Replace `frontend/src/__tests__/Canvas.test.tsx` contents with:

```typescript
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Canvas } from "../canvas/Canvas";
import { useUXStore } from "../store/ux-store";

describe("Canvas", () => {
  afterEach(() => {
    useUXStore.setState({ items: [], bridges: [] });
  });

  it("renders the bento content region", () => {
    render(<Canvas onPresenceDotClick={vi.fn()} />);
    expect(
      screen.getByRole("region", { name: /content/i }),
    ).toBeInTheDocument();
  });

  it("renders presence dot chrome", () => {
    render(<Canvas onPresenceDotClick={vi.fn()} />);
    expect(screen.getByText("⌘K")).toBeInTheDocument();
    expect(screen.getByText(/ask me anything/i)).toBeInTheDocument();
  });

  it("given items with zero salience, renders them at neutral salience", () => {
    useUXStore.setState({
      items: [
        {
          id: "hero",
          salience: 0,
          group: "identity",
          molecule: "hero",
          data: { name: "Test" },
        },
      ],
      bridges: [],
    });
    render(<Canvas onPresenceDotClick={vi.fn()} />);
    const card = screen.getByTestId("bento-card-hero");
    // Neutral salience 0.5 -> tier 3 -> colSpan 2
    const style = card.getAttribute("style") ?? "";
    expect(style).toMatch(/grid-column:\s*span\s*2/);
  });
});
```

- [ ] **Step 4: Delete obsolete files**

```bash
rm frontend/src/canvas/zone-map.ts
rm frontend/src/canvas/ZoneLabel.tsx
rm frontend/src/__tests__/zone-map.test.ts
rm frontend/src/__tests__/ZoneLabel.test.tsx
```

- [ ] **Step 5: Run full frontend test + typecheck suite**

```bash
cd frontend && pnpm typecheck && pnpm vitest run
```
Expected: typecheck passes; all tests pass (92 pre-existing + new tests - removed tests). If any test fails due to stale imports of `ZoneLabel` or `zone-map`, grep for them: `pnpm exec rg "ZoneLabel|zone-map" src/` and fix each import by either removing the reference or switching to Bento.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/canvas/Canvas.tsx frontend/src/__tests__/Canvas.test.tsx frontend/src/index.css
git rm frontend/src/canvas/zone-map.ts frontend/src/canvas/ZoneLabel.tsx frontend/src/__tests__/zone-map.test.ts frontend/src/__tests__/ZoneLabel.test.tsx
git commit -m "refactor(canvas): cutover Canvas to Bento + delete zone machinery

Canvas now delegates its content area to <Bento>, wrapping it in a
chrome layer for the presence dot and command hint. 'Loading...' is
gone; if items arrive with zero salience, a neutralize() helper lifts
them to 0.5 so the bento scaffolding paints immediately while real
salience flows in from the agent. zone-map.ts, ZoneLabel, and their
tests are removed — molecules carry their own identity now."
```

---

## Task 12: Playwright e2e — bento cascade BDD scenarios

**Files:**
- Create: `frontend/e2e/bento-cascade.spec.ts`
- Delete: `frontend/e2e/breathing.spec.ts`
- Delete: `frontend/e2e/layout.spec.ts` (if its scenarios are now obsolete)

- [ ] **Step 1: Inspect layout.spec.ts to decide fate**

```bash
cat frontend/e2e/layout.spec.ts
```
If scenarios reference `[data-zone]` or `.surface-grid` throughout, delete the file. If any scenario is grid-agnostic (e.g., checks PresenceDot visibility), preserve those into `bento-cascade.spec.ts` or a separate `chrome.spec.ts`.

- [ ] **Step 2: Write bento-cascade.spec.ts**

Create `frontend/e2e/bento-cascade.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

test.describe("Breathing bento cascade", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("given any visitor, bento grid is visible within 1s of page load", async ({
    page,
  }) => {
    await expect(page.locator(".bento-grid")).toBeVisible({ timeout: 1000 });
  });

  test("given a LinkedIn visitor, when the cascade completes, a tier-5 card is present", async ({
    page,
  }) => {
    await page.goto("/?utm_source=linkedin");
    await expect(page.locator(".bento-grid")).toBeVisible();
    await expect(page.locator('[data-tier="5"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test("given a GitHub visitor, when the cascade completes, the bento includes at least one tier-4 or tier-5 card", async ({
    page,
  }) => {
    await page.goto("/?utm_source=github");
    await expect(page.locator(".bento-grid")).toBeVisible();
    const highTier = page.locator(
      '[data-tier="5"], [data-tier="4"]',
    );
    await expect(highTier.first()).toBeVisible({ timeout: 5000 });
  });

  test("given prefers-reduced-motion, cards have no transform transitions", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?utm_source=linkedin");
    await expect(page.locator(".bento-grid")).toBeVisible();
    await page.waitForTimeout(2000);

    const cards = page.locator(".bento-card");
    const firstCard = cards.first();
    const transform = await firstCard.evaluate(
      (el) => getComputedStyle(el).transform,
    );
    // Reduced motion: no active transform (FLIP disabled) - should be "none" or identity.
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
  });

  test("given the cascade plays, hero card occupies visibly more area than a tier-1 card", async ({
    page,
  }) => {
    await page.goto("/?utm_source=linkedin");
    await expect(page.locator('[data-tier="5"]')).toBeVisible({
      timeout: 5000,
    });

    const hero = page.locator('[data-tier="5"]').first();
    const supporting = page.locator('[data-tier="1"]').first();
    const heroBox = await hero.boundingBox();
    const supportingBox = await supporting.boundingBox();

    if (!heroBox || !supportingBox) {
      test.skip(true, "Expected both tier-5 and tier-1 cards on screen");
      return;
    }

    const heroArea = heroBox.width * heroBox.height;
    const supportingArea = supportingBox.width * supportingBox.height;
    expect(heroArea).toBeGreaterThan(supportingArea * 3);
  });
});
```

- [ ] **Step 3: Delete obsolete specs**

```bash
rm frontend/e2e/breathing.spec.ts
# Only remove layout.spec.ts if Step 1 determined it's fully obsolete:
# rm frontend/e2e/layout.spec.ts
```

- [ ] **Step 4: Run Playwright**

Backend must be running for these tests to hit real SSE. In a separate terminal (or via `make dev`):

```bash
cd backend && uv run uvicorn app.main:app --port 8000
```

Then:

```bash
cd frontend && pnpm test:e2e bento-cascade.spec.ts
```
Expected: all 5 scenarios pass. If baseline screenshots are needed, run `pnpm test:e2e:update bento-cascade.spec.ts` once, inspect the generated PNGs, commit.

- [ ] **Step 5: Commit**

```bash
git add frontend/e2e/bento-cascade.spec.ts
git rm frontend/e2e/breathing.spec.ts
# git rm frontend/e2e/layout.spec.ts  # if deleted in Step 3
git commit -m "test(e2e): rewrite breathing e2e as bento-cascade scenarios

Five BDD scenarios replacing cursor-dwell-era tests: grid visible
within 1s, LinkedIn produces tier-5 hero, GitHub produces tier-4+ card,
reduced-motion disables FLIP transforms, hero card is materially
larger than a tier-1 supporting card (>= 3x area). Older breathing and
layout specs that pinned to [data-zone]/.surface-grid are deleted."
```

---

## Task 13: Full verification sweep

- [ ] **Step 1: Run backend suite**

```bash
cd backend && uv run pytest
```
Expected: all tests pass, count >= 173 + new (signal_builder tests).

- [ ] **Step 2: Run frontend unit + component suite**

```bash
cd frontend && pnpm vitest run
```
Expected: all tests pass, count >= previous count - deleted tests + new tests.

- [ ] **Step 3: Run typecheck and lint**

```bash
cd frontend && pnpm typecheck && pnpm lint
cd ../backend && uv run ruff check src tests && uv run ruff format --check src tests
```
Expected: all clean.

- [ ] **Step 4: Run e2e**

```bash
cd frontend && pnpm test:e2e
```
Expected: bento-cascade scenarios pass. Other surviving e2e specs (smoke, capture-surface, visual) also pass. If visual.spec.ts baselines are pinned to the old layout, regenerate them: `pnpm test:e2e:update visual.spec.ts`, manually inspect diffs, commit.

- [ ] **Step 5: Manual browser verification**

In one terminal:
```bash
make dev
```

Open `http://localhost:5173/?utm_source=linkedin` in a browser. Subjectively verify:

1. Something visible (bento scaffolding) within 100ms
2. `ux:signal` narration appears in dev tools Network tab as the second SSE event
3. Hero card visibly grows (springs into tier-5 size) during the cascade
4. Cascade completes in <1.5s end-to-end
5. Reload — cascade still fires (cache-hit path works)
6. `http://localhost:5173/` (no utm) — renders neutral layout, no cascade (no known referrer)

Fix anything that regresses before committing any remaining work.

- [ ] **Step 6: Update STATUS.md**

Append a session entry summarizing FEAT-003 delivery. Include: merged branches, test counts (new totals), any deferred items (density-aware molecules, useSignalCollector wiring). This feeds `/catchup` at next session start.

- [ ] **Step 7: Final commit**

```bash
# Only if Step 6 or Step 4 required file changes beyond the previous commits
git add STATUS.md frontend/e2e/*.png
git commit -m "session: ship FEAT-003 breathing bento + signal + tightened pacing"
```

---

## Success Criteria (verification checklist)

- [ ] Loading `?utm_source=linkedin` produces a visibly different layout geometry than a neutral load within 1 second of page open
- [ ] A cascade contains a `ux:signal` event before any `ux:focus` / `ux:recede` / `ux:bridge` / `ux:surface` event
- [ ] Manual subjective test: cascade reads as "agent thought, then acted," not as "CSS faded in a sequence"
- [ ] All `fast-check` property invariants pass (7 properties, 100 generated inputs each by default)
- [ ] Backend pytest suite green with new signal_builder tests
- [ ] Frontend vitest green with new bento-layout, bento-layout.property, Bento, Canvas tests and old zone-map / ZoneLabel tests removed
- [ ] Playwright e2e `bento-cascade.spec.ts` green; baselines captured
- [ ] `pnpm typecheck`, Biome, Ruff all clean
- [ ] `prefers-reduced-motion` disables `motion.div layout` animation; span changes apply instantly without transform
- [ ] ADR-0008 committed; ADR-0007 status field updated
