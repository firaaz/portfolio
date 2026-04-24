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
