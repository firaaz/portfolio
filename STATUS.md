# Status

## Current State (2026-04-25, post-Slice-B)
Slice B (causal cursor signals) **shipped and merged into `develop`** via `--no-ff` ceremony. Per-bento-card hover/dwell/click events now flow from `Canvas.tsx` → `useCardSignals` → `useSignalCollector` → `POST /api/agent/signal` → `VisitorProfile.accumulate()`. The upstream half of Layer 2 in the three-layer adaptation architecture is live; the downstream half (re-evaluating via `AdaptStrategy` on tier escalation) remains the next entry point.

Merge commit `15b2686` on top of feature branch commits `881e85e` (rename) → `860d923` (gut interests) → `0e38b4a` (feature) → `83a7f36` (e2e). Feature branch `feat/004-signal-loop` deleted with `git branch -d` after lowercase-safety confirmation. **No active feature branch.** Working tree clean.

`develop` is now **102 commits ahead of `origin/develop`** (was 96; +5 from this session — 4 slice commits + 1 merge commit). Still unpushed, still held for explicit user instruction.

**Test counts on `develop`:** backend pytest **182** (was 181, +1 `test_interests_remain_empty_after_signals`), frontend vitest **117** (was 106, +11 across 3 new test files), **e2e 6/6** (was 5/5, +1 `signal-loop.spec.ts`). Suites: pytest 0.71s, vitest 1.80s, e2e 7.4s.

## Accomplished This Session

1. **Plan-mode workflow executed end-to-end** — 3 parallel Explore agents mapped the slice surface (frontend hook state, Canvas/Bento integration, backend signal contract); 2 parallel Plan agents proposed competing scoping approaches (minimal-change vs contract-clarity); user picked the contract-clarity variant via `AskUserQuestion`. Plan persisted to `/Users/firaazfarook/.claude/plans/serialized-launching-galaxy.md`.

2. **Decisive surfaced finding before coding:** `session.py:60` `_infer_interests` mapped legacy zone names (`"featured"`, `"other-work"`, `"skills"`, `"experience"`, `"contact"`) to interest tags — none of which match post-bento card ids. **Every visitor was silently producing `interests: []`**. Slice B touched this code regardless, so the user picked "rename + gut interests" over "ship feature only" with full visibility into the file-count tradeoff (~10 vs ~8 files).

3. **Commit 1 — `881e85e`** `refactor(signal): rename BehavioralSignal.zone to card_id`. Mechanical rename across `session.py` field, `adapt.py` SYSTEM_PROMPT + log line, 3 backend test files, and `frontend/src/hooks/use-signal-collector.ts` `Signal` type (also exported for downstream consumers). `ruff format` applied to the 3 touched test files as a side-effect dropped repo E501 count from 24 → 12.

4. **Commit 2 — `860d923`** `refactor(session): retire stale zone_interest_map in _infer_interests`. Replaced the dict + lookup with `self.interests = []` plus a TODO pointing forward to the AdaptStrategy invocation slice. Kept the method signature so the future slice can swap behavior without touching `accumulate()`. Updated `test_includes_interests` → `test_renders_empty_interests_gracefully` (asserts the prompt now renders `"Interests: none yet"`); added `test_interests_remain_empty_after_signals`.

5. **Commit 3 — `0e38b4a`** `feat(canvas): per-card cursor signals reach /api/agent/signal`. Three new files (one mid-sized, two small):
   - `frontend/src/hooks/use-session-id.ts` (16L) — `crypto.randomUUID()` lazily persisted in `sessionStorage` under key `portfolio.sid` (GDPR tab-scoped).
   - `frontend/src/hooks/use-card-signals.ts` (83L) — per-card `Map`-keyed state with hover dedup, 1.2s dwell timer, **250ms linger** on `mouseleave` (user picked tighter than the deleted hook's 300ms for snappier feedback), `useEffect` cleanup clears all timers.
   - 3 new vitest files: `use-session-id.test.ts` (3 tests), `use-card-signals.test.tsx` (7 tests with `vi.useFakeTimers`), one new BDD integration in `Canvas.test.tsx` covering full mock-fetch + fake-timers + hover + flush.
   - Wiring: `Canvas.tsx` instantiates the three hooks; `Bento.tsx` accepts optional `cardHandlers` prop and spreads on the per-card `motion.article`. Existing `Bento.test.tsx` unaffected (prop is optional).

6. **Commit 4 — `83a7f36`** `test(e2e): assert cursor signals reach /api/agent/signal end-to-end`. Single Playwright spec (49L) hovers the first bento card on a real browser, intercepts the POST via `page.waitForRequest`, asserts session_id is a UUID, dwell signal carries `card_id` and `duration_ms >= 1200`, hover signal also present. Runs against the live backend (no fixture mocking on this one).

7. **Merge ceremony — `15b2686`** `git merge --no-ff feat/004-signal-loop`, matching the recent pattern (`49938e2`, `c6bc033`, `47216b6`, `254859e`). Branch deleted with `-d` after merge confirmed. **Verification re-ran twice:** pytest 182/182, vitest 117/117, e2e 6/6 with no flakes; grep guard confirmed zero stale `\.zone\b` or `"zone"` references except `data-zone="canvas"` semantic markup.

## Key Decisions

- **Rename `zone` → `card_id` on the wire, not just internally.** The contract field name was already misleading; consumer #2 (AdaptStrategy invocation) is named in the next slice, not hypothetical. Locking in the name now while call-sites count is ~6 files is dramatically cheaper than later. The decisive evidence was the silently-broken `_infer_interests` — touching session.py was mandatory regardless.
- **Gut `_infer_interests` instead of rebuilding it.** The map is dead post-bento, no consumer in the active flow reads `interests`, and rebuilding for card-id keys is an `AdaptStrategy` concern. Kept the method (didn't remove the call site in `accumulate()`) so the future slice swaps behavior without touching orchestration.
- **250ms dwell linger** (user direction, tighter than the deleted hook's 300ms). Absorbs cursor crossing card gutters as a single dwell; re-entry past linger is treated as a fresh hover.
- **`useSessionId` as a dedicated hook over `sessionStorage`**, not Zustand store, not React context. One consumer today (Canvas); lift to store only if a second consumer arrives. Avoids speculative widening.
- **Per-card observation in NEW `use-card-signals.ts`**, not extending `use-signal-collector.ts`. Different concerns — event detection vs transport. Both files stay under 100L, both have isolated test surfaces.
- **No new ADRs.** The behaviors are tactical implementation choices, not architectural decisions. ADR-0003 (five-verb protocol) and `docs/architecture.md` (three-layer model) already cover the conceptual frame.

## Blockers

- **`develop` is 102 commits ahead of `origin/develop`** — unpushed. Grew by 5 this session. Not a code blocker; divergence is intentional pending explicit publish instruction. Decision still pending.
- **Pre-existing backend ruff E501 errors** — net count this session went from 24 → 12 as a side-effect of `ruff format` on the touched test files. The remaining 12 are in untouched files (`tests/test_validation.py`, `src/app/domain/strategies/*.py`). Still debt, not a blocker.
- **Pre-existing frontend Biome lint error** in `src/__tests__/SkillTag.test.tsx:16` (non-null assertion) — surfaced this session but not caused by Slice B; predates the session and is out of scope. The 3 CSS warnings (`!important` in `index.css`) also pre-existing.
- **`AdaptStrategy` is implemented but not invoked.** The signal route accumulates tier/confidence per session, but no backend route triggers re-evaluation when tier escalates. This is the **load-bearing missing piece** that blocks the agent from actually adapting to behavior. By design this slice ships the upstream half only; downstream is the next slice.

## Next Step

**Wire `AdaptStrategy` invocation on tier escalation.** This is the downstream half of Layer 2 — the missing causal link that makes behavioral signals actually change what the visitor sees. Without it, signals accumulate into a `VisitorProfile` that nothing reads.

**Design surface the next session needs to resolve:**
- **Trigger mechanism**: does the existing `signal_route.py` itself dispatch `AdaptStrategy` when `profile.tier` jumps (e.g., 1 → 2 on the third signal), or does the frontend explicitly request a re-evaluation via a new route (e.g., `POST /api/agent/adapt`)? The former is more reactive; the latter is more controllable from the client. Both have merit.
- **Channel**: how does the new salience reach the frontend? A second SSE stream is wasteful (GET stream is already open), so likely either (a) reuse the existing `/api/agent/stream` connection by emitting cascade events when adaptation occurs server-side, or (b) return the `IntelligenceResult` synchronously from the same `signal` POST that triggered escalation. Option (a) preserves the streaming model; option (b) is a clean request/response.
- **Concrete entry points**:
  - `backend/src/app/adapters/api/signal_route.py:48-51` — currently the route just calls `profile.accumulate()` and returns a summary. The adapt invocation hooks in here (or in a new endpoint).
  - `backend/src/app/domain/strategies/adapt.py` — already implemented with confidence-gated generation. `build_prompt()` consumes `profile.dwell_map`, `profile.confidence`, `profile.tier`. No code change needed there; just needs a caller.
  - `backend/src/app/domain/evaluation.py::evaluate_intelligence()` — existing orchestrator from FEAT-002 that runs a strategy through the LLM provider. Likely the right place to wire `AdaptStrategy` calls.
  - Frontend: `useSignalCollector` returns the response shape `{session_id, tier, confidence, signal_count}`. If we go option (a), frontend ignores response and listens on the existing SSE for new salience. If option (b), the response shape extends with optional `intelligence: IntelligenceResult` field that the frontend funnels into `useUXStore`.
- **Test plan ahead of code**: the slice will need a backend test asserting "given a profile that crosses tier-2 threshold, when accumulate runs, then AdaptStrategy.evaluate is called once" plus an e2e that hovers two cards, dwells past threshold, and asserts at least one card's salience changes from its initial value.

**If user redirects:** push `develop` to `origin` and resolve the 102-commit divergence — it's growing every session and at some point a fresh pair of eyes (or a fresh CI run, or a new contributor) will need it. The other backlogged candidates haven't moved in priority.

### Backlogged (not for next session unless user redirects)
- **Push `develop` to `origin`** — 102 commits unpushed. Decide publish-vs-local-only. **Growing every session, recommend resolving soon.**
- **Bento cohesion beyond tiling** — editorial rhythm, content-to-shape matching, narrative flow. Distinct problem from tiling; needs brainstorm → Shape Up pitch → spec, not a feature slice on top of FEAT-003.
- **Pre-existing SkillTag.test.tsx non-null assertion + CSS `!important` Biome warnings** — clean-up sweep, would be a 5-minute slice if done in isolation.
- **Tooling-hooks slice (cairn cherry-pick)** — still backlogged behind feature work.
- **Extract e2e fixture infrastructure** — inline mock today (`bento-cascade.spec.ts` scenario 5); `signal-loop.spec.ts` runs live so didn't need it. Only extract when a second test wants similar seeding.

---

## Previous State (2026-04-25, post-scenario-5-fix, pre-Slice-B)
E2e scenario 5 fixed via Playwright `page.route()` SSE fixture and merged into `develop` (commits `4085968` test, `49938e2` merge). FEAT-002 + FEAT-003 + scenario-5 fix all live. `develop` 96 commits ahead of origin. Backend 181, vitest 106, e2e 5/5 in 5.4s. Slice B pinned as next entry point.

## Previous State (2026-04-24, pre-scenario-5 fix)
FEAT-002 and FEAT-003 merged into `develop` via `--no-ff` ceremony (`47216b6`, `c6bc033`, `254859e`). 93 commits ahead of origin. E2e 4/5 passing — scenario 5 ("hero > tier-1 area") timing out because the LinkedIn persona's LLM cascade didn't produce tier-1 items in the 0.15–0.35 band. Two options pinned: (1) seeded fixture, (2) rewrite assertion. Subsequent session picked option 1.

## Previous State (pre-merge, FEAT-002 + FEAT-003 on feature branches)
FEAT-003 breathing bento shipped on the `feat/003-breathing-bento` branch stacked on `feat/002-stream-integration`. 13 implementation tasks covered ADR drafting, pure `computeLayout` function, property-based tests, staggered-dispatch retune, pre-LLM signal builder, `Bento.tsx` motion component, CSS cutover from 7-zone to bento grid, Canvas integration, and e2e scenario set. Full history retained in git; session commits prefixed `feat(canvas)`, `feat(frontend)`, `feat(api)`, `chore(frontend)`, `docs(status)`, `docs`.

Prior FEAT-002 shipped `stream_route.py` running `SelectStrategy` via `PydanticAIProvider.evaluate()`, `command_route.py` running `ComposeStrategy`, `app/domain/evaluation.py::evaluate_intelligence()` orchestrator, `ux_events.py::intelligence_to_events()` transformer, `MemoryCache[T]` genericization. Both routes dispatch through `staggered_dispatch` (now 150–350ms post-FEAT-003).

## Story Map
No story map
