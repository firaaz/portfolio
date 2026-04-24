# Status

## Current State (2026-04-24)
FEAT-003 **breathing bento shipped on wire**, final review cleared, manual browser verification passed. Branch `feat/003-breathing-bento` stacked on unmerged `feat/002-stream-integration` — ~25 commits ahead covering the full bento cutover, post-review cleanup, and a manual-verification tier retune.

**Manual verification outcome (commit `6519142`):** first pass revealed visible holes in the grid after a tier-5 hero claimed cols 1-4 — the 2-col residual strip couldn't host tier-4 (3×2 landscape) and `grid-auto-flow: dense` cannot fabricate fragments to fill gaps. Retuned `TIER_SPECS` so tier-4 is 2×3 portrait (same 6-cell area, 2-wide so it fits the strip). All non-dot tiers now share width=2 → clean tiling against a 4-wide hero on a 6-col grid. User confirmed the bento now fills completely. Further cohesion work (editorial rhythm, content-shape fit) deferred to a separate future feature.

**Post-review (🟡 Conditional → cleared):** final review flagged three Important items that were fixed before handoff:
- **Spec drift** (commit `0a114d2`) — spec.md + plan.md File maps updated to reflect the shipped seam (`signal_builder.py` owns signal synthesis; routes prepend before the transformer; `intelligence_to_events` stays pure on `IntelligenceResult`).
- **`useDwell` orphan** (commit `95dfeab`) — hook was shaped for the deleted zone abstraction; deleted 49 LoC + 6 tests. Deferred slice B will collect dwell per bento card, a different shape.
- **`breathing-extra` reserved slot** (commit `0a114d2`) — markup retained in `ProjectCard`/`ExperienceCard` as reserved hook for Slice 2 density-aware molecules; added one-line comment in each file making the reservation explicit. Tests already encode the structural contract.

Remaining Nice-to-have items deferred to Slice B session: e2e scenario 5 rewrite (hero > smallest-visible, not hero > tier-1), `data-zone="canvas"` convention doc note in `frontend/CLAUDE.md`, and a dispatch integration test pinning the 150–350ms range by elapsed time rather than by parameter inspection.

- Agent intelligence now drives a salience-based 6×6 bento grid (not 7 named zones). Cards resize by tier (5 = 4×3 cells, 1 = 1×1) via `motion.article layout` FLIP with spring physics (stiffness 200, damping 22) per ADR-0008.
- Pre-LLM `ux:signal` emitted on both `/api/agent/stream` and `/api/agent/command` after `STATE_SNAPSHOT` so the agent's "thinking" is audible before the re-weight.
- Staggered dispatch tightened to 150–350ms gaps (ADR-0009 supersedes ADR-0003's specific timing values).
- **Test counts:** backend 181 passing, frontend 106 passing (was 112; dropped 6 `useDwell` tests in cleanup commit `95dfeab`), e2e 4/5 passing (1 timeout — see E2E note below).
- **ADRs added:** ADR-0008 (transform allowed as FLIP bridge, scope-fenced to `.bento-card`), ADR-0009 (dispatch timing revision). ADR-0007 status field updated to "partially superseded by ADR-0008."
- **New/changed files:** `canvas/Bento.tsx`, `canvas/bento-layout.ts`, `adapters/api/signal_builder.py`, `index.css` (zone CSS replaced by bento CSS), `bento-layout.test.ts`, `bento-layout.property.test.ts`, `bento-cascade.spec.ts`. Five deleted e2e specs (`smoke`, `visual`, `breathing`, `layout`, `capture-surface`) — all zone-pinned, fail by same root cause.
- **Deferred:** manual browser verification (subjective "agent thought, then acted" feel); branch merges to `develop` pending that verification.

## Accomplished This Session (FEAT-003, 13 tasks)

1. **Task 1** — Drafted ADR-0008 (transform as FLIP bridge); updated ADR-0007 `partially-superseded-by` field.
2. **Task 2** — Added `fast-check` dev dependency for property-based testing.
3. **Task 3** — Pure `computeLayout()` function + TDD example tests (`bento-layout.test.ts`, 15 tests).
4. **Task 4** — Property-based invariant tests for `computeLayout` (`bento-layout.property.test.ts`, 9 properties).
5. **Task 5** — Tightened staggered dispatch to 150–350ms; drafted ADR-0009 to capture timing revision.
6. **Task 6** — Added `signal_builder.py` (pre-LLM `ux:signal` builder) + `test_signal_builder.py` (5 tests).
7. **Task 7** — Wired `ux:signal` emission into `stream_route.py` after `STATE_SNAPSHOT`; updated `test_stream_intelligence.py`.
8. **Task 8** — Wired `ux:signal` emission into `command_route.py`; updated `test_command_intelligence.py`.
9. **Task 9** — Built `Bento.tsx` component with `motion.article layout` FLIP, `data-tier` attributes, spring physics config.
10. **Task 10** — CSS cutover: replaced zone CSS (`data-zone` selectors, 7 named zones) with bento CSS (`.bento-grid`, `.bento-card`, tier-based sizing). Reduced-motion guard added.
11. **Task 11** — Canvas integration: swapped `ZoneLabel`-based layout in `Canvas.tsx` for `<Bento>`. Deleted `ZoneLabel.tsx`, `zone-map.ts`, and their tests. Deleted five zone-pinned e2e specs.
12. **Task 12** — Wrote `bento-cascade.spec.ts` with 5 BDD scenarios: grid visible in 1s, LinkedIn → tier-5, GitHub → tier-4+, reduced-motion → no transform, hero area > tier-1.
13. **Task 13** — Full verification sweep: 181 backend tests pass, 112 frontend tests pass, typecheck clean, biome lint clean on all FEAT-003 touched files (1 pre-existing warning in `SkillTag.test.tsx` left in place as out-of-scope debt), backend ruff errors are pre-existing (not in FEAT-003 touched files). E2E 4/5 pass — see E2E note.

## E2E Note (Task 13)
4/5 scenarios passed: grid visible in 1s, LinkedIn → tier-5, GitHub → tier-4+, reduced-motion → no transform.
1/5 timed out: "hero card occupies visibly more area than tier-1 card" — `[data-tier="1"]` never appeared because the LLM cascade assigned all visible items salience above the tier-1 threshold (≥0.15 but ≤0.35 range unreached). LLM_API_KEY inferred available (tier-5 and tier-4 scenarios passed live). This is a test expectation gap: the scenario assumes a tier-1 card exists in the output, but a realistic LLM-weighted manifest may not produce one. Defer test fix to next session.

## Key Decisions
- **ADR-0008:** `transform` transitions permitted as FLIP bridge, scope-fenced to `.bento-card` only — prevents bleed into hero/agent UI.
- **ADR-0009:** Dispatch gaps narrowed to 150–350ms (was 400–800ms in ADR-0003). Rationale: user UX feedback from FEAT-002 manual E2E ("feels like CSS, not AI") confirmed pacing was too slow.
- **Scope expansion during Task 12:** deleted `smoke.spec.ts`, `visual.spec.ts`, `capture-surface.spec.ts` alongside `breathing.spec.ts` and `layout.spec.ts` — all five were zone-pinned and failed by the same root cause. Collapsed into single `bento-cascade.spec.ts`.
- **Lint fixes at Task 13:** `bento-layout.ts` function signature reformatted; `bento-layout.test.ts` import order + `toMatchObject` formatting; `bento-layout.property.test.ts` import order + non-null assertions changed to optional chaining. A parallel attempt to replace `!important` on mobile `.bento-card` with a higher-specificity selector (`.bento-grid > .bento-card`) was **reverted in commit `3d99651`** — inline styles from `motion.article`'s `style` prop have specificity 1000, so no class selector combination can override without `!important`. The `!important` pattern is load-bearing and was documented as intentional in Task 10's quality review.

## Blockers
- **E2E test 5 (hero > tier-1 area):** test expectation gap — tier-1 card not guaranteed in LLM output. Needs either a test fixture or the assertion should check hero > any non-hero card.
- **Branch merges pending:** `feat/002-stream-integration` → `develop`, then `feat/003-breathing-bento` → `develop`. Defer to after manual browser verification.
- ~~**`useDwell` hook becomes orphan**~~ — resolved in commit `95dfeab` post-review; hook + tests deleted (49 + 77 LoC). Slice B's `useSignalCollector` will wire dwell per bento card, not per zone.
- Pre-existing backend ruff E501 errors in `tests/test_session_models.py`, `tests/test_signal_route.py`, `tests/test_validation.py`, `src/app/domain/strategies/*.py` — none in FEAT-003 touched files; left as debt.

## Next Step
1. ~~**Manual browser verification**~~ — ✅ done, holes fixed via tier retune (`6519142`).
2. **Merge ceremony (user-gated):** `feat/002-stream-integration` → `develop`, then `feat/003-breathing-bento` → `develop`. Held for explicit go-ahead.
3. **Fix e2e test 5:** either use a seeded mock manifest that guarantees a tier-1 card, or rewrite assertion to compare hero area against the smallest visible card.
4. **Deferred slice B** (`useSignalCollector` wiring in `Canvas.tsx`) still backlogged — makes cursor signals causal and unlocks `AdaptStrategy` tier-2 path.
5. **Next feature pitch — bento cohesion beyond tiling.** Packing is now correct; editorial cohesion (visual rhythm, content-to-shape matching, narrative flow between cells) is a separate problem. Worth its own brainstorm + spec rather than bolted onto FEAT-003.

---

## Previous State (FEAT-002, pre-FEAT-003)
FEAT-002 **stream + command integration shipped on wire**. Branch `feat/002-stream-integration` (5 commits ahead of `develop`, not yet merged) makes the agent intelligence pipeline live end-to-end:

- `stream_route.py` runs `SelectStrategy` via `PydanticAIProvider.evaluate()`, transforms the `IntelligenceResult` into five-verb events (`ux:recede → ux:focus → ux:bridge → ux:surface`), dispatches through `staggered_dispatch` (400–800ms gaps). Caches the result per `referrer_type`; cache hits still replay through staggered dispatch.
- `command_route.py` runs `ComposeStrategy` on every POST (no cache); emits generated-copy `ux:surface` events alongside focus/recede/bridge.
- New orchestrator `app/domain/evaluation.py::evaluate_intelligence()` runs any strategy through `LLMPort`, validates via `validate_result`, returns `None` on failure.
- New transformer `ux_events.py::intelligence_to_events()` with thresholds `_FOCUS_MIN=0.6`, `_RECEDE_MAX=0.3`.
- `MemoryCache` genericized to PEP 695 `MemoryCache[T]`.

**Test counts:** backend 173 (up from 168 pre-slice), frontend 92 (unchanged), ruff clean on all touched files. Manual E2E verified working in browser with real `LLM_API_KEY` — events arrive, zones re-weight, cascade visible.

**User-visible behavior gap (known):** the cascade functions but reads as "scripted CSS reveal," not "agent thinking." Two structural reasons: (1) `ux:signal` verb is never emitted — the agent's "I am thinking" narration is silent; (2) `useSignalCollector` hook exists but is not attached to `Canvas.tsx`, so cursor/dwell/scroll signals are dropped and `AdaptStrategy` can never fire. Both are spec'd in `specs/002-agent-intelligence/spec.md` but incompletely implemented.

## Story Map
No story map
