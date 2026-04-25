# Status

## Current State (2026-04-25, post-Slice-C1, branch unmerged)
Slice C1 (persistent SSE infrastructure for adaptive cascade) **shipped on `feat/005-event-bus`**, **not yet merged into `develop`**. Backend now detects when a signal batch causes the visitor's `tier` to jump or `confidence` to cross a 0.1 band, and on any crossing schedules a FastAPI `BackgroundTask` that runs `AdaptStrategy` via `evaluate_intelligence` and publishes the resulting AG-UI events into a new per-session `SessionEventBus`. The producer half of the adapt loop is alive; the consumer half (long-lived stream + frontend session_id wiring) is Slice C2.

**The browser sees no change yet.** This was scoped: persistent-SSE architecture splits the feature into producer (this slice) + consumer (C2). With nothing subscribed to the bus, events publish into queues that drop oldest at maxsize 64. Backend tests prove the producer fires correctly; the visible loop closes in C2.

Single commit `d72f406` on top of the develop tip `3964fd0`. Branch alive, working tree clean.

**Test counts on `feat/005-event-bus`:** backend pytest **194** (was 182 on develop, +12 from this slice — 6 event_bus + 6 signal_route adaptation), frontend vitest **117** (unchanged — slice is backend-only), e2e **6/6** (unchanged). pytest 0.82s.

**Test counts on `develop`:** unchanged from prior session (182, 117, 6/6). C1 not merged.

`develop` is still **102 commits ahead of `origin/develop`** (no growth this session — C1 lives on its branch). `feat/005-event-bus` is 1 commit ahead of `develop`.

## Accomplished This Session

1. **Plan-mode workflow executed end-to-end** — 3 parallel Explore agents mapped the slice surface (signal route + AdaptStrategy + evaluation orchestrator; SSE event lifecycle backend↔frontend; frontend signal flow + bento state). 1 `AskUserQuestion` locked architecture: persistent SSE channel + tier-OR-confidence-band trigger. Plan persisted to `/Users/firaazfarook/.claude/plans/go-ahead-let-whimsical-parrot.md`.

2. **Critical exploration finding surfaced before coding:** the existing `stream_route._generate_stream` is a one-shot async generator (returns after initial cascade) — the SSE connection is **not stateful**, so server-pushed adaptation events from a different request aren't possible without new pub/sub infrastructure. This finding eliminated "Option A (push through existing SSE as-is)" from the design space and forced the persistent-SSE architecture into a 2-slice decomposition.

3. **Slice scoping decision** — single-slice persistent SSE is 7-9 files (busts ≤5 budget); 2-slice decomposition is C1 (4 backend files, this session) + C2 (4-5 frontend wiring + e2e files). Picked the decomposition. Acknowledged in the plan that C1 is "backend-only with no visible end-to-end result" — a deliberate trade-off honoring the user's persistent-SSE preference.

4. **Commit `d72f406`** `feat(signal): orchestrate adaptation on tier or confidence-band crossing`. **6 files, +390 / -8 lines**:
   - `backend/src/app/adapters/sse/event_bus.py` (NEW, 55L) — `SessionEventBus`: per-session async pub/sub, broadcast fan-out via `dict[str, list[asyncio.Queue]]`, drop-oldest backpressure (default `queue_maxsize=64`), refcount cleanup in async-generator `finally`.
   - `backend/src/app/adapters/sse/__init__.py` (NEW, 1L) — package init.
   - `backend/src/app/adapters/api/signal_route.py` (MODIFY, +95L) — `_get_event_bus()` and `_get_llm_port()` singletons mirroring `_get_session_store()`; `_confidence_band(c) -> int(c*10)`; pure `_should_adapt(old_tier, old_band, profile) -> bool`; `_run_adaptation(profile, bus, llm)` async helper that loads catalog, calls `evaluate_intelligence(AdaptStrategy(), ADAPT_SYSTEM_PROMPT, llm, profile, catalog)`, transforms via `intelligence_to_events`, publishes to bus (broad-except wrap so background failures stay silent). `ingest_signals(batch, background_tasks: BackgroundTasks)` captures `old_tier`/`old_band` before the accumulate loop, then if `_should_adapt(...)` and LLM port available, schedules `_run_adaptation` with `profile.model_copy(deep=True)` (so concurrent batches don't race the snapshot).
   - `backend/tests/test_event_bus.py` (NEW, 6 tests) — in-order delivery, session isolation, no-replay-for-late-subscribers, clean cancellation (asserts internal `_queues` cleanup), drop-oldest overflow with `queue_maxsize=4`, broadcast to concurrent subscribers.
   - `backend/tests/test_signal_route.py` (MODIFY, +6 tests) — `test_no_adaptation_when_signals_empty`, `test_no_adaptation_when_llm_port_unavailable`, `test_adaptation_fires_on_first_signal_band_crossing`, `test_adaptation_fires_on_tier_jump_to_2`, `test_adaptation_fires_on_tier_jump_to_3`, `test_run_adaptation_publishes_events_to_bus` (direct test of helper, stubs LLM with `_fake_evaluate`, attaches subscriber, runs helper, asserts events arrive prefixed `data: `).
   - `backend/tests/conftest.py` (MODIFY, +1L) — extended autouse `_no_llm_in_unit_tests` fixture to also patch `app.adapters.api.signal_route._get_llm_port` to `None`. Tests that opt into LLM-available override with explicit nested `patch(...)` blocks.

5. **Verification re-ran**: pytest 194/194 (was 182, +12 as planned), ruff check + format clean on all 4 slice files. Pyright residual warnings are venv resolution (IDE not using uv venv) and the inherited `LLMPort`/`PydanticAIProvider` protocol mismatch that already exists at `stream_route.py:67` — not gated.

## Key Decisions

- **Persistent SSE channel + per-session pub/sub bus**, not sync POST-response extension. User-locked via `AskUserQuestion`. The user's secondary choice — tier OR 0.1-confidence-band crossing trigger — would produce 8-10 LLM calls per typical session (`_CONFIDENCE_PER_SIGNAL = 0.12`); blocking the signal POST on each would cause ~10 perceptible signal-batch stutters per session. Persistent SSE is non-blocking.
- **2-slice decomposition over single-slice with file-budget bust.** Single-slice persistent SSE is 7-9 files. C1 is 4 source files (the conftest.py edit + `__init__.py` raise it to 6 in commit count). C2 will be 4-5 files for stream subscription + frontend session_id + e2e. Honored ≤5-files-per-slice convention.
- **Broadcast fan-out for the bus, not single-queue.** Implementation: `dict[str, list[asyncio.Queue]]`. Each subscriber gets its own queue; `publish()` puts into every queue under the session_id. Reasoning: multiple browser tabs sharing a session_id (rare but realistic) should both receive adaptations rather than racing for one queue.
- **No replay for late subscribers.** The bus is real-time, not a log. AG-UI's `STATE_SNAPSHOT` is the authoritative initial-state mechanism; adaptation events are deltas applied on top, so missing pre-subscription events is recoverable as long as the snapshot ships first.
- **Drop-oldest on queue overflow**, not block or drop-newest. Adaptation events are time-sensitive — the freshest snapshot of intent is more valuable than historical sequence. Matches AG-UI's "current state is canonical" model. Validated by `test_overflow_drops_oldest`.
- **`profile.model_copy(deep=True)` into the BackgroundTask.** Without it, a follow-up signal batch could mutate the same `profile` object before the LLM call resolves, leaving the prompt referencing inconsistent state. Pydantic 2's deep-copy is framework-supported and idiomatic.
- **Single-slice commit, no merge to develop yet.** Branch `feat/005-event-bus` alive at `d72f406`. Past pattern is `--no-ff` merge ceremony at end of session — chose not to this time because C2 may stack on top, and merging C1 alone produces no visible result.
- **No new ADRs.** All decisions are tactical implementation choices, not architectural ones. ADR-0003 (five-verb protocol) and `docs/architecture.md` (three-layer model) already frame the cognitive loop.

## Blockers

- **Slice C1 not visibly demonstrable until C2 ships.** This is the load-bearing limitation. Backend tests prove the producer fires correctly, but no consumer subscribes — the bus drops oldest events at maxsize 64. Manual verification requires temporary log statements in `_run_adaptation`. Not a code blocker, but the user explicitly noted the lack of UI change after C1.
- **`feat/005-event-bus` not merged into `develop`.** Branch alive at `d72f406`, working tree clean. Decision: stack C2 on this branch (FEAT-002/003 pattern) OR merge C1 first then start C2 from `develop`. Either is fine; stacking is what the past two complex features did.
- **`develop` is 102 commits ahead of `origin/develop`** — unchanged this session. Not growing because slice lives on its branch. Decision still pending.
- **Pre-existing backend ruff E501 errors** — 12 still in untouched files (`tests/test_validation.py`, `src/app/domain/strategies/*.py`). Not touched this session.
- **Pre-existing frontend Biome lint error** in `src/__tests__/SkillTag.test.tsx:16` (non-null assertion). Not touched this session.

## Next Step

**Slice C2 — wire the consumer side: long-lived `stream_route._generate_stream` + frontend `session_id` threading + end-to-end Playwright proof.** This closes the visible loop and delivers what the user expected to see at the end of C1.

**Concrete file plan (~5 files, fits the budget):**

1. `backend/src/app/adapters/api/stream_route.py` (MODIFY) — accept `session_id: str | None = None` query param via `Query`; pass through to `_generate_stream`. After the existing initial-cascade `staggered_dispatch` loop completes (line 80), if `session_id` is provided, subscribe to the bus and `async for ev in bus.subscribe(session_id): yield ev`. The stream stays open until the client disconnects (FastAPI's StreamingResponse handles disconnect cancellation, which propagates to the async generator's `finally` and triggers `event_bus.subscribe`'s cleanup).
   - Reuse `_get_event_bus()` from `signal_route.py` — but to avoid cross-route imports, lift it into a shared module (one of: `adapters/sse/event_bus.py` add a module-level singleton getter, OR new `adapters/sse/__init__.py` exposes a `get_event_bus()` function). Prefer the latter for clean import surface.
2. `frontend/src/hooks/use-agent-stream.ts` (MODIFY) — accept `sessionId: string` argument, build URL as `${url}?session_id=${encodeURIComponent(sessionId)}`. EventSource stays open as long as server doesn't close (already true in current implementation — `source.close()` is only on unmount).
3. **Locate caller of `useAgentStream`** — likely `frontend/src/App.tsx` or `frontend/src/main.tsx`. Thread `useSessionId()` from `frontend/src/hooks/use-session-id.ts` through. Same hook already used by `Canvas.tsx`. Single consumer adds a second; still no need to lift to Zustand.
4. `frontend/e2e/adapt-loop.spec.ts` (NEW) — Playwright spec: navigate to `/`, hover the first bento card to ≥1.2s dwell, repeat to push tier ≥ 2, listen for new SSE events on `/api/agent/stream` via `page.waitForEvent('response')` or `page.on('response')`, assert at least one cascade event arrives after the initial snapshot. Likely needs an LLM fixture via `page.route()` to intercept POST to LLM provider — same pattern as `bento-cascade.spec.ts` scenario 5.
5. `backend/tests/test_stream_route.py` (MODIFY or NEW extension) — new test: long-lived stream with `session_id` query param subscribes to bus; manually publish to bus from within test; assert the next yielded event matches.

**Test plan to write FIRST (TDD):**
- Backend: `test_stream_route_subscribes_to_bus_for_session_id` — open stream with `?session_id=X`, publish to bus for `X`, assert event reaches the response stream within timeout. Use `httpx.AsyncClient` against the FastAPI app with streaming.
- Frontend: extend `use-agent-stream.test.ts` (or create) to assert URL includes the session_id. Use the existing happy-dom EventSource stub.
- E2e: `adapt-loop.spec.ts` covers the full visible loop.

**Open design forks for C2 (resolve at code time, not in plan):**
- **Cost debounce**: 8-10 LLM calls per session is high. Consider min-interval (e.g., 2s) gate in `signal_route._run_adaptation` to coalesce rapid escalations. May need to land before the loop is visible to the user, or it's first impression will be expensive.
- **Where the singleton `_get_event_bus` lives**: cleanest is `adapters/sse/event_bus.py` exposes a module-level `get_event_bus()` helper that both `signal_route` and `stream_route` import. Currently it's private to `signal_route.py`. Refactor lift in C2 is ~5 lines.
- **Stream graceful close on browser unmount**: the FastAPI `StreamingResponse` handles client disconnect by cancelling the generator. Verify via test that `event_bus.subscribe`'s `finally` cleans up the queue.

**If user redirects:** merge `feat/005-event-bus` into `develop` first via `--no-ff` ceremony (matches recent pattern), then start C2 from clean develop. The backlogged divergence (`develop` 102 commits ahead of origin) hasn't moved.

### Backlogged (not for next session unless user redirects)
- **Merge `feat/005-event-bus` into `develop`** — pending C2 stacking decision. If C2 stacks, defer; if C2 starts fresh from develop, merge first.
- **Push `develop` to `origin`** — 102 commits unpushed. Decision still pending.
- **Cost debouncing for AdaptStrategy invocation** — surfaced in C1 plan as "8-10 LLM calls per session is high". Worth a debounce slice before the cascade goes visible, OR worth bundling into C2.
- **Bento cohesion beyond tiling** — editorial rhythm, content-to-shape matching, narrative flow. Distinct problem; needs brainstorm → Shape Up pitch.
- **Pre-existing SkillTag.test.tsx non-null assertion + CSS `!important` Biome warnings** — clean-up sweep, ~5-min slice if done in isolation.
- **Tooling-hooks slice (cairn cherry-pick)** — still backlogged behind feature work.
- **Extract e2e fixture infrastructure** — would help `adapt-loop.spec.ts` if it needs LLM mocking similar to `bento-cascade.spec.ts` scenario 5. Extract on second use, not first.

---

## Previous State (2026-04-25, post-Slice-B, merged into develop)
Slice B (causal cursor signals) shipped and merged into `develop` via `--no-ff` ceremony. Per-bento-card hover/dwell/click events flow `Canvas.tsx` → `useCardSignals` → `useSignalCollector` → `POST /api/agent/signal` → `VisitorProfile.accumulate()`. Merge commit `15b2686` on top of `881e85e` (rename) → `860d923` (gut interests) → `0e38b4a` (feature) → `83a7f36` (e2e). `develop` 102 commits ahead of origin, backend pytest 182, frontend vitest 117, e2e 6/6.

## Previous State (2026-04-25, post-scenario-5-fix, pre-Slice-B)
E2e scenario 5 fixed via Playwright `page.route()` SSE fixture and merged into `develop` (commits `4085968` test, `49938e2` merge). FEAT-002 + FEAT-003 + scenario-5 fix all live. `develop` 96 commits ahead of origin. Backend 181, vitest 106, e2e 5/5 in 5.4s. Slice B pinned as next entry point.

## Previous State (2026-04-24, pre-scenario-5 fix)
FEAT-002 and FEAT-003 merged into `develop` via `--no-ff` ceremony (`47216b6`, `c6bc033`, `254859e`). 93 commits ahead of origin. E2e 4/5 passing — scenario 5 ("hero > tier-1 area") timing out because the LinkedIn persona's LLM cascade didn't produce tier-1 items in the 0.15–0.35 band. Two options pinned: (1) seeded fixture, (2) rewrite assertion. Subsequent session picked option 1.

## Previous State (pre-merge, FEAT-002 + FEAT-003 on feature branches)
FEAT-003 breathing bento shipped on the `feat/003-breathing-bento` branch stacked on `feat/002-stream-integration`. 13 implementation tasks covered ADR drafting, pure `computeLayout` function, property-based tests, staggered-dispatch retune, pre-LLM signal builder, `Bento.tsx` motion component, CSS cutover from 7-zone to bento grid, Canvas integration, and e2e scenario set. Full history retained in git; session commits prefixed `feat(canvas)`, `feat(frontend)`, `feat(api)`, `chore(frontend)`, `docs(status)`, `docs`.

Prior FEAT-002 shipped `stream_route.py` running `SelectStrategy` via `PydanticAIProvider.evaluate()`, `command_route.py` running `ComposeStrategy`, `app/domain/evaluation.py::evaluate_intelligence()` orchestrator, `ux_events.py::intelligence_to_events()` transformer, `MemoryCache[T]` genericization. Both routes dispatch through `staggered_dispatch` (now 150–350ms post-FEAT-003).

## Story Map
No story map
