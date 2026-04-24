# FEAT-003 — Breathing Bento

**Shape Up pitch · 2026-04-24**

## Problem

The agent intelligence pipeline shipped in FEAT-002 is live on the wire. Five-verb events fire, importance scores flow, the store updates. But the visible artifact reads as "a scripted CSS reveal," not as an agent thinking and acting. Two observed gaps:

1. **Cards don't grow.** When the agent raises an item's `salience`, the only visual effect is an opacity shift. The zones resize — and only on cursor dwell, not on agent intent. The user, watching a LinkedIn cascade: *"each block does not feel like it's becoming larger, just the row — this isn't how we brainstormed this."*
2. **The cascade feels slow and dead.** Dispatch gaps are 400–800ms; the grid transition is 600ms on every event; there's no "I'm thinking" anticipation cue before recede/focus fires. The interval between `?utm_source=linkedin` and the first visible change reads as dead air, not intent.

The editorial research (`docs/research/editorial-layout-design.md`) named the target a year ago: *"A CSS Grid with 4-6 columns where the agent controls `grid-column: span N` and `grid-row: span N` based on importance."* The thesis memory (`project_single_viewport_canvas.md`) confirms: breathing cards, not breathing rows. The implementation drifted from there during the walking-skeleton phase; FEAT-002 built on top of the drift rather than correcting it.

## Appetite

**One session, one slice.** Scope is bundled because the fix cuts through the rendering layer end-to-end — the bento shell, the motion primitive, the `ux:signal` verb, and the dispatch pacing are interdependent and don't decompose cleanly into sequential cuts without leaving intermediate states that are worse than today. Expected size: ~15 files substantively touched (7 created, 8 modified, 4 deleted), ~350–450 LoC net. Consciously over the 200-LoC budget; worth it for a coherent cut, as with the FEAT-002 stream integration slice.

Follow-up slice (explicitly out of scope, not this session): density-aware molecules that reveal more content at higher tiers.

## Solution

Replace the seven fixed-position zones with a **6-column × 6-row bento grid** where every content item is a first-class card whose `grid-column: span` and `grid-row: span` are derived from its `salience` via quantization. When the agent raises importance, the card visibly grows; other cards recompose around it. Front-load the cascade with an immediate neutral paint and a `ux:signal` anticipation cue, so the agent's latency reads as presence rather than dead air.

### The resize primitive

A pure function `computeLayout(items: UXItem[]): LayoutEntry[]` maps each item to a tier by salience threshold. Tiers carry span dimensions:

| Tier | Salience ≥ | colSpan | rowSpan | Cells | Role |
|------|-----------|---------|---------|-------|------|
| 5 | 0.85 | 4 | 3 | 12 | Hero (unique; second-eligible demotes to 4) |
| 4 | 0.70 | 3 | 2 | 6 | Major |
| 3 | 0.55 | 2 | 2 | 4 | Feature |
| 2 | 0.35 | 2 | 1 | 2 | Supporting |
| 1 | 0.15 | 1 | 1 | 1 | Recessed |
| 0 | <0.15 | — | — | 0 | Hidden (`aria-hidden`) |

Items sort by salience descending, tiers assign greedy-first, cells accumulate until the 36-cell budget is exhausted. Overflow tail becomes tier 0 — present in DOM for accessibility, not rendered.

Quantization lives in the frontend, not the LLM prompt. The agent keeps emitting `importance` in `[0, 1]`; the frontend decides what "big" means. Lets the visual language be tuned without re-prompting the model.

### The motion primitive

Each card wraps in `<motion.div layout>`. When span values change, Framer Motion performs FLIP: measure position/size before, measure after, interpolate the delta via `transform`. Spring physics, not easing — `{ type: "spring", stiffness: 200, damping: 22 }`. Perceived settle ≈ 300ms; motion begins within ~40ms. Under `prefers-reduced-motion: reduce`, `layout={false}` disables animation; span changes apply instantly.

This requires a new ADR-0008 that supersedes ADR-0007 to permit `transform` under layout-change conditions on `.bento-card` elements. ADR-0004's content-motion rules (opacity-only for in-card transitions) remain unchanged.

### Perceived responsiveness — front-loaded feedback

The cascade's timeline changes shape:

```
0ms    → request sent; neutral bento paints (all items at salience 0.5 / tier 2)
~30ms  → STATE_SNAPSHOT arrives from catalog (pre-LLM), no layout change
~60ms  → ux:signal event ("LinkedIn visitor — elevating leadership + contact")
~400ms → first ux:focus; hero card springs to tier 5
~550ms → second ux:focus
~700ms → third ux:focus
~850ms → cascade complete
```

Three changes drive this:

1. **Neutral first paint.** `Canvas.tsx`'s current "Loading..." is replaced by rendering items with default `salience=0.5` the moment the catalog arrives. Something is on screen in <50ms.
2. **STATE_SNAPSHOT before LLM.** `stream_route.py` emits the snapshot from the catalog before awaiting the LLM. The `ux:signal` verb then fires during the LLM round-trip, making latency legible rather than invisible.
3. **Stagger compressed.** `staggered_dispatch` defaults move from `400–800ms` to `150–350ms`. Combined with spring motion, transitions overlap naturally; the cascade feels continuous rather than beat-by-beat.

### Zones dissolve; molecules survive

`mapItemsToZones`, `ZoneLabel`, and `.zone-*` CSS classes all go away. Molecule types (`ProjectCard`, `ExperienceCard`, `ContactCard`, etc.) keep their distinctive visual language — a project card still looks like a project — but they no longer live in named spatial regions. A small in-card category label compensates for the lost semantic scaffolding.

Mobile (<640px): bento collapses to `grid-template-columns: 1fr`. Spans ignored, order = salience desc. This is the stability anchor — on narrow viewports or reduced-motion, the portfolio reads as a cleanly ordered list, no spatial gymnastics.

### Testing shape

The three-layer methodology (TDD + BDD + EDD from `project_testing_methodology.md`) stratifies naturally across this slice:

- **Unit / TDD — example + property-based.** `computeLayout` is pure and has crisp invariants: budget never exceeded, at most one hero, tier order matches salience order, hidden items are a suffix, deterministic output. Property-based tests via `fast-check` (new dev dep) generate thousands of random item arrays per invariant. Example-based tests nail the quantization thresholds and tie-breaking.
- **Behavior / BDD.** Component-level (vitest + testing-library) and E2E (Playwright) tests use Given/When/Then narrative style. "Given a LinkedIn cascade, When `ux:focus` arrives for contact, Then the contact card's rendered area exceeds the other-work card." One Playwright scenario per visitor archetype (LinkedIn-heavy, GitHub-heavy, neutral) plus one reduced-motion scenario.
- **Evaluation / EDD.** Unchanged. The LLM's importance-scoring behavior was exercised in FEAT-002 and needs no new evals for this rendering-layer slice.

## Rabbit Holes

- **ADR-0007 supersedence.** ADR-0007's exhaustive allowlist forbids `transform`. `motion.div layout` uses transforms. New ADR-0008 must be drafted carefully: the distinction is "transform as ornamental motion" (forbidden) vs. "transform as FLIP bridge during layout change" (permitted). The scope fence is tight — spring parameters mandated for calm settle, no decorative animations, reduced-motion path preserved.
- **Existing Playwright e2e specs pinned to the old shell.** `breathing.spec.ts`, `layout.spec.ts`, `capture-surface.spec.ts`, `visual.spec.ts` all use `[data-zone]` selectors, `.breathing-extra` class, cursor-dwell timing, and `.surface-grid` duration assertions. These do not survive the rename — they need rewriting, not updating. Budget ~0.5 day for the rewrite; new scenarios become the BDD layer from §Testing Shape.
- **Budget-overflow strategy.** At 36 cells with typical catalogs (12–20 items), most content fits. Edge case: a catalog where the lowest-salience tail would be truncated. First cut: tail goes `aria-hidden`, silently dropped from paint. If truncation shows up in real traffic, a later slice exposes them via a "...more" reveal. Not this slice.
- **Hero uniqueness vs. tie score.** Two items with identical salience `>= 0.85` — which becomes hero? Stable sort preserves input order; input order comes from catalog load order. Deterministic but arguably arbitrary. Acceptable for now; LLM prompting already biases hero eligibility implicitly (the hero item typically has the highest score by design).
- **Single-viewport enforcement under re-layout.** `100dvh - padding` is the budget; `grid-template-rows: repeat(6, 1fr)` ensures rows never overflow. Container queries on cards ensure content never overflows its cell (existing practice). No vertical scroll introduced.
- **`ux:signal` confidence + reasoning generation.** The synthesized signal needs short, grounded reasoning text. Simplest path: synthesize from the `referrer_type` (`"LinkedIn visitor — elevating contact and leadership"`). Confidence derived per-persona (known referrer → 0.6–0.8; unknown → 0.3–0.5). Moving reasoning into `IntelligenceResult` as an optional field is possible but out of appetite this slice. *Built as:* dedicated `signal_builder.py` module invoked by the routes before `intelligence_to_events`, keeping the transformer pure on `IntelligenceResult`.
- **Motion library spelling.** The dep is `motion@^12.38.0` (renamed from `framer-motion`). Imports are `import { motion, useReducedMotion } from "motion/react"`. Noted to avoid time lost hunting the old import path.

## No-Gos

- **Density-aware molecules.** Cards do not change their internal content at different tiers in this slice. Tier 5 hero and tier 1 recessed render the same content inside the card; only the outer dimensions change. Slice 2.
- **View Transitions API.** Chromium-only, not yet cross-browser stable. We use `motion.div layout` as the universal path.
- **Zone restoration on mobile.** Mobile is a plain ordered list, not a collapsed bento. Size hierarchy is preserved through ordering + in-card emphasis, not spatial layout.
- **Tier tuning beyond the table above.** The six thresholds are fixed for this slice. Observational tuning is post-ship, not in-slice.
- **New animation primitives beyond `layout`.** No scroll-linked reveals, no entrance animations per card, no stagger orchestration via Framer. The bento enters all-at-once at default tier, then FLIP-transitions on agent events. Nothing more.
- **Signal collection wiring (`useSignalCollector` → Canvas).** Tier 2 adaptation path (`AdaptStrategy`) stays dark this slice. Separate slice after bento lands.

## File map (for orientation; not a task list)

**Created**
- `frontend/src/canvas/bento-layout.ts` — pure `computeLayout` function
- `frontend/src/canvas/Bento.tsx` — grid shell, motion-wrapped cards
- `frontend/src/canvas/__tests__/bento-layout.test.ts` — example-based
- `frontend/src/canvas/__tests__/bento-layout.property.test.ts` — fast-check invariants
- `frontend/src/canvas/__tests__/Bento.test.tsx` — component / BDD
- `frontend/e2e/bento-cascade.spec.ts` — Playwright BDD scenarios
- `backend/src/app/adapters/api/signal_builder.py` — synthesize `ux:signal` (confidence + reasoning) from `VisitorContext`
- `backend/tests/test_signal_builder.py` — unit tests for the synthesizer
- `docs/adrs/0008-motion-flip-under-layout-change.md` — supersedes 0007
- `docs/adrs/0009-dispatch-timing-revision.md` — narrows ADR-0003 gaps to 150–350ms

**Modified**
- `frontend/src/canvas/Canvas.tsx` — outer shell + chrome, delegates to `<Bento>`
- `frontend/src/index.css` — remove `.zone-*`, `.surface-grid`, `.breathing-extra` CSS rule; add `.bento-grid`, `.bento-card` (`breathing-extra` slot markup kept in molecules as reserved hook for Slice 2 density-aware content)
- `frontend/package.json` — add `fast-check` dev dep
- `backend/src/app/adapters/api/stream_route.py` — emit STATE_SNAPSHOT; call `build_signal_event(context)` before LLM await, then transform result
- `backend/src/app/adapters/api/command_route.py` — call `build_signal_event(context)` first in cascade, then transform
- `backend/src/app/adapters/api/ux_events.py` — add `ux_signal_event()` formatter helper; `intelligence_to_events` unchanged (routes prepend signal, transformer stays pure on `IntelligenceResult`)
- `backend/src/app/adapters/api/dispatch.py` — default gaps 150–350ms
- `docs/adrs/0007-breathing-motion-language.md` — update `superseded by` field

**Deleted**
- `frontend/src/canvas/zone-map.ts`
- `frontend/src/canvas/ZoneLabel.tsx`
- `frontend/e2e/breathing.spec.ts` (rewritten as `bento-cascade.spec.ts`)
- `frontend/e2e/layout.spec.ts` pinned to old shell (rewritten or folded into cascade spec)

## Success criteria (how we know it worked)

- Loading `?utm_source=linkedin` produces a visibly different layout geometry than a neutral load within 1 second of page open.
- A cascade contains a `ux:signal` event before any `ux:focus` / `ux:recede` event.
- Manual subjective test: the cascade reads as "the agent thought, then acted," not as "CSS faded in a sequence."
- All `fast-check` property invariants pass.
- Backend pytest (173 existing + new) green. Frontend vitest (92 existing + new) green. Playwright e2e (rewritten) green with baselines captured.
- `pnpm typecheck`, Ruff, and Biome all clean.
- `prefers-reduced-motion` disables card FLIP animations; span changes still apply instantly.
