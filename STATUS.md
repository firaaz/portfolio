# Status

## Current State (2026-04-24)
FEAT-002 and FEAT-003 **merged into `develop`**. Merge ceremony used `--no-ff` to preserve feature-branch topology: `47216b6` (feat/002-stream-integration) then `c6bc033` (feat/003-breathing-bento). Both feature branches deleted locally after `git branch -d` confirmed fully-merged. `develop` is now 93 commits ahead of `origin/develop` — **unpushed**, held for explicit user instruction.

FEAT-003 breathing bento is live end-to-end: salience-driven 6×6 grid, `motion.article layout` FLIP with spring physics (stiffness 200, damping 22) per ADR-0008, pre-LLM `ux:signal` emission on both `/api/agent/stream` and `/api/agent/command`, staggered dispatch narrowed to 150–350ms per ADR-0009. Manual browser verification confirmed the grid fills cleanly after tier retune.

**Test counts on `develop`:** backend 181, frontend 106, e2e 4/5 passing (scenario 5 timeout — see Next Step).

**Working tree clean.** No active feature branch. Next session starts from `develop`.

## Accomplished This Session

1. **Final code reviewer dispatched** — verdict 🟡 Conditional with three Important items.
2. **Spec drift reconciliation** (commit `0a114d2`) — `specs/003-breathing-bento/spec.md` and `plan.md` File maps updated to reflect the shipped seam: `signal_builder.py` owns signal synthesis, routes prepend it before `intelligence_to_events`, transformer stays pure on `IntelligenceResult`.
3. **`useDwell` hook deletion** (commit `95dfeab`) — orphaned by zone→bento cutover; deleted 49 LoC + 77 LoC of tests (6 tests). Slice B's `useSignalCollector` will collect dwell per bento card, a different shape.
4. **`breathing-extra` reservation documented** (commit `0a114d2`) — added one-line comment in `ProjectCard.tsx` and `ExperienceCard.tsx` making the Slice 2 density-aware slot explicit.
5. **Manual browser verification pass 1 — found holes.** Tier-5 hero claimed cols 1-4, leaving a 2-col residual strip. Tier-4 at 3×2 landscape couldn't fit; `grid-auto-flow: dense` can repack but cannot fabricate fragments.
6. **Tier retune** (commit `6519142`) — changed tier-4 to 2×3 portrait (same 6-cell area, 2-wide). All non-dot tiers now share width=2 → clean tiling against 4-wide hero on 6-col grid. User confirmed bento fills completely.
7. **Merge ceremony** — `git merge --no-ff feat/002-stream-integration` into develop (`47216b6`), then `feat/003-breathing-bento` (`c6bc033`). Clean linear integration; no conflicts.
8. **Branch cleanup** — `git branch -d feat/002-stream-integration feat/003-breathing-bento`. Lowercase `-d` confirmed both fully merged before deletion.
9. **STATUS update** (commit `93b5272`) — pinned E2E scenario 5 as next session's entry point with two tradeoff-ordered options.

## Key Decisions
- **Tier retune over richer packer** — user picked the lightweight table fix (option 1 of 3) over building a residual-aware packer or explicit cell placement. Rationale: correct tiling unlocks shipping; editorial cohesion is a separate future feature worth its own pitch.
- **Merge instead of extending branches** — FEAT-002 and FEAT-003 shipped as originally scoped; no reason to stack further slices on either.
- **`develop` stays local** — 93-commit divergence from `origin/develop` is intentional; pushing requires explicit instruction, not auto-mode inference.
- **No new ADRs this session.** ADR-0008, ADR-0009, and ADR-0007's `partially-superseded-by` update all landed in prior sessions.

## Blockers
- **`develop` is 93 commits ahead of `origin/develop`** — unpushed. Not a code blocker, but the drift will keep growing. Decide at some point whether to publish or stay local-only.
- **E2E scenario 5 (hero > tier-1 area)** — test expectation gap; `[data-tier="1"]` not guaranteed in a realistic LLM-weighted manifest. **Picked up next session.**
- Pre-existing backend ruff E501 errors in `tests/test_session_models.py`, `tests/test_signal_route.py`, `tests/test_validation.py`, `src/app/domain/strategies/*.py` — none in touched files; left as debt.

## Next Step
**Fix e2e scenario 5 (`frontend/e2e/bento-cascade.spec.ts`, scenario "hero card occupies visibly more area than tier-1 card").** Test pins `[data-tier="1"]` as the comparison card, but the LLM cascade for the LinkedIn persona assigned every visible item salience above the tier-1 threshold (≥0.15 but ≤0.35 unreached). Selector never matched → Playwright timed out. Other 4 scenarios pass live against the real LLM.

**Two options, pick at session start:**

1. **Seeded fixture** — mock the backend strategy to return a manifest guaranteed to contain a tier-1 card.
   - Pro: tests the tiling math deterministically; no LLM flakiness.
   - Con: stops exercising the live LLM path for this scenario — tier-quantization is tested but the full cascade is not.

2. **Rewrite assertion** — compare hero area against the *smallest visible non-hero card*, whichever tier it happens to be.
   - Pro: stays end-to-end, keeps the test probing real LLM output.
   - Con: weaker invariant — only confirms hero > something, not hero > tier-1 specifically.

Lean toward option 2 on first pass (cheaper to write, preserves e2e coverage). Fall back to option 1 if the new assertion can't catch plausible regressions (e.g., if it would pass even when hero is only marginally larger than a tier-3 card).

### Backlogged (not for next session unless user redirects)
- **Deferred slice B** — wire `useSignalCollector` into `Canvas.tsx`. Makes cursor signals causal and unlocks `AdaptStrategy` tier-2 path. Dwell needs to be per bento card, not per zone.
- **Next feature pitch — bento cohesion beyond tiling.** Packing is correct now; editorial cohesion (visual rhythm, content-to-shape matching, narrative flow between cells) is a distinct problem. Brainstorm → pitch → spec, not bolted onto FEAT-003.
- **Push `develop` to `origin`** — 93-commit divergence will keep growing.
- **Tooling-hooks slice (cairn cherry-pick)** — still backlogged behind feature work.

---

## Previous State (pre-merge, FEAT-002 + FEAT-003 on feature branches)
FEAT-003 breathing bento shipped on the `feat/003-breathing-bento` branch stacked on `feat/002-stream-integration`. 13 implementation tasks covered ADR drafting, pure `computeLayout` function, property-based tests, staggered-dispatch retune, pre-LLM signal builder, `Bento.tsx` motion component, CSS cutover from 7-zone to bento grid, Canvas integration, and e2e scenario set. Full history retained in git; session commits prefixed `feat(canvas)`, `feat(frontend)`, `feat(api)`, `chore(frontend)`, `docs(status)`, `docs`.

Prior FEAT-002 shipped `stream_route.py` running `SelectStrategy` via `PydanticAIProvider.evaluate()`, `command_route.py` running `ComposeStrategy`, `app/domain/evaluation.py::evaluate_intelligence()` orchestrator, `ux_events.py::intelligence_to_events()` transformer, `MemoryCache[T]` genericization. Both routes dispatch through `staggered_dispatch` (now 150–350ms post-FEAT-003).

## Story Map
No story map
