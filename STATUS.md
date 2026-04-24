# Status

## Current State (2026-04-25)
E2E scenario 5 **fixed and merged into `develop`**. The failing "hero > tier-1 area" test now passes deterministically via a Playwright `page.route()` SSE fixture scoped to scenario 5 only — the other 4 scenarios still exercise the live backend end-to-end. Merge ceremony: `git merge --no-ff fix/e2e-scenario-5-fixture` (merge commit `49938e2`) on top of `4085968` (the test commit). Feature branch deleted after `git branch -d` confirmed full merge.

FEAT-002 + FEAT-003 + scenario-5 fix all live on `develop`. No active feature branch. `develop` is now **96 commits ahead of `origin/develop`** — still unpushed, still held for explicit user instruction.

**Test counts on `develop`:** backend 181, frontend vitest 106, **e2e 5/5 passing** (was 4/5 before session). Full e2e suite runs in ~5.4s.

**Working tree clean.** Next session starts from `develop`.

## Accomplished This Session

1. **Chose option 1 (seeded fixture)** over option 2 (rewrite assertion). Rationale: determinism outweighs losing live-LLM coverage for this one scenario, since the other 4 scenarios still probe the live wire.
2. **Baseline confirmed** — ran scenario 5 against the live backend; reproduced the exact timeout at `bento-cascade.spec.ts:63` on `[data-tier="1"]`. Failure mode matches STATUS prediction from the prior session.
3. **Playwright SSE fixture shipped** (commit `4085968`) — intercepts `**/api/agent/stream` inside scenario 5 only, fulfills with one `STATE_SNAPSHOT` event containing 4 items (hero 0.95, project 0.65, education 0.20, skill 0.05). Single event is sufficient because `setSnapshot` replaces store state atomically; cascade events are additive mutations on top.
4. **Fixture items extracted to a module-level const** to keep the test function under CLAUDE.md's 50-line guideline. Added a breadcrumb comment pointing to `backend/src/app/adapters/api/ux_events.py` as the wire-format source of truth.
5. **Verification pass** — scenario 5 passes in 749ms (was 30s timeout); full e2e suite 5/5 in 5.4s; vitest 106/106 unchanged; pytest 181/181 unchanged; `tsc` clean; Biome clean for the touched file.
6. **Merge ceremony** — `git merge --no-ff fix/e2e-scenario-5-fixture` → merge commit `49938e2`, matching the `--no-ff` pattern from `254859e` / `47216b6` / `c6bc033`. Branch deleted with `-d` after lowercase-safety confirmation.

## Key Decisions
- **Network-level mock over backend test flag.** `stream_route.py:66` constructs `SelectStrategy()` inline with no DI seam; a backend-side fixture would require production-code surgery just to install a test hook. `page.route()` is test-local, zero leakage risk.
- **Snapshot-only fixture (no cascade events).** `setSnapshot` replaces store state atomically, so baking final salience into the snapshot avoids emitting `ux:focus`/`ux:recede` frames. Simpler, same observable outcome, fewer moving parts.
- **`--no-ff` merge for a test-only 64-line fix.** Consistency with the recent merge-ceremony pattern beats the marginal ugliness of a merge commit for a tiny diff.
- **No new ADRs.** Fixture is a test-local pattern, not an architectural decision.

## Blockers
- **`develop` is 96 commits ahead of `origin/develop`** — unpushed. Grew by 2 this session. Not a code blocker; divergence is intentional pending explicit publish instruction.
- **Pre-existing backend ruff E501 errors** in `tests/test_session_models.py`, `tests/test_signal_route.py`, `tests/test_validation.py`, `src/app/domain/strategies/*.py` — unchanged from last session, still debt.
- **Scenario 5's fixture is catalog-shape-coupled** — if YAML catalog molecule names (`hero`, `project`, `education`, `skill`) change, fixture items may fail to render. Acknowledged in the plan; other scenarios would fail first against a live backend serving a mismatched shape, so drift is detected even if scenario 5 silently keeps passing against stale data.

## Next Step
**Ship Slice B — wire `useSignalCollector` into `Canvas.tsx` to make cursor signals causal.** FEAT-003 originally scoped this slice; it was deferred when the zone→bento cutover changed dwell semantics from zones to bento cards. Now that the bento is live and e2e is fully green, slice B unblocks the `AdaptStrategy` tier-2 path — behavioral adaptation layered on top of referrer-based selection. Without it, the agent is pure intent (referrer → LLM) without behavioral feedback, contradicting the three-layer architecture in `docs/architecture.md`.

**Concrete entry points for next session:**
- Check `frontend/src/hooks/` — determine whether `use-signal-collector.ts` exists or needs creating. The orphaned `useDwell` hook was deleted last session (commit `95dfeab`); slice B's version must collect dwell **per bento card**, not per zone.
- `frontend/src/canvas/Canvas.tsx` — wire the collector hook here; emit signals on bento-card hover/dwell/click per ADR-0003's five-verb protocol.
- Dwell threshold: per `tasks/lessons.md` line 23, tune to 1.2–1.5s (not 2s). The tune target is per-card, not per-zone.
- Backend handshake already exists — `signal_builder.py` accepts pre-LLM signal payloads. Check expected shape before wiring the frontend emitter.

**If user redirects:** open a fresh Shape Up pitch for **bento cohesion beyond tiling** — packing is correct now, but editorial rhythm, content-to-shape matching, and narrative flow between cells are a distinct problem. Brainstorm → pitch → spec. Do NOT bolt onto FEAT-003.

### Backlogged (not for next session unless user redirects)
- **Push `develop` to `origin`** — 96-commit divergence, growing. Decide publish-vs-local-only at some point.
- **Next feature pitch — bento cohesion beyond tiling.** Editorial rhythm, content-to-shape matching, narrative flow. Distinct from tiling; brainstorm-first.
- **Tooling-hooks slice (cairn cherry-pick)** — still backlogged behind feature work.
- **Extract e2e fixture infrastructure** — inline mock today; only extract when a second test needs similar seeding. Three similar lines is better than a premature abstraction.

---

## Previous State (2026-04-24, pre-scenario-5 fix)
FEAT-002 and FEAT-003 merged into `develop` via `--no-ff` ceremony (`47216b6`, `c6bc033`, `254859e`). 93 commits ahead of origin. E2e 4/5 passing — scenario 5 ("hero > tier-1 area") timing out because the LinkedIn persona's LLM cascade didn't produce tier-1 items in the 0.15–0.35 band. Two options pinned: (1) seeded fixture, (2) rewrite assertion. This session picked option 1.

## Previous State (pre-merge, FEAT-002 + FEAT-003 on feature branches)
FEAT-003 breathing bento shipped on the `feat/003-breathing-bento` branch stacked on `feat/002-stream-integration`. 13 implementation tasks covered ADR drafting, pure `computeLayout` function, property-based tests, staggered-dispatch retune, pre-LLM signal builder, `Bento.tsx` motion component, CSS cutover from 7-zone to bento grid, Canvas integration, and e2e scenario set. Full history retained in git; session commits prefixed `feat(canvas)`, `feat(frontend)`, `feat(api)`, `chore(frontend)`, `docs(status)`, `docs`.

Prior FEAT-002 shipped `stream_route.py` running `SelectStrategy` via `PydanticAIProvider.evaluate()`, `command_route.py` running `ComposeStrategy`, `app/domain/evaluation.py::evaluate_intelligence()` orchestrator, `ux_events.py::intelligence_to_events()` transformer, `MemoryCache[T]` genericization. Both routes dispatch through `staggered_dispatch` (now 150–350ms post-FEAT-003).

## Story Map
No story map
