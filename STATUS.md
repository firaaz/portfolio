# Status

## Current State
FEAT-001 complete. FEAT-002 Agent Content Intelligence Tasks 0-7 complete on `develop` — domain models, session/signals, three strategies (Select/Adapt/Compose), PydanticAI adapter, five-verb AG-UI events with staggered dispatch, and the full frontend rendering pipeline (store extensions, five-verb parsers, signal collector, molecule emphasis/generated props). Backend 168 tests passing, frontend 92 passing, typecheck clean, 0 lint errors. The editorial surface (Iron-Gall Ink, 12-column grid, 8 zones, breathing) is live.

**What is NOT yet wired:** `stream_route.py` still calls the legacy `assemble_ux_state()` path and emits `ux_salience_event` only — it does not yet invoke `SelectStrategy` via `PydanticAIProvider`, and does not emit five-verb events. So the frontend renders default catalog salience; the intelligence pipeline exists but is dark on the wire.

## Accomplished This Session
- **Task 0 — Spike (`a5a484a`):** validated PydanticAI 1.86.0 structured outputs (GO). Caught three API changes (`OpenAIChatModel` rename, provider restructure, `output_type` kwarg) before production code.
- **Task 1 — Domain models (`85ffbbf`):** `IntelligenceResult` / `ItemResult` / `BridgeAnnotation`, `BehavioralSignal` / `SignalBatch` / `VisitorProfile` with tier escalation (≥3 signals → T2, confidence ≥0.7 → T3), `EvaluationStrategy` Protocol, `validate_result()`.
- **Task 2 — Session + signals (`3540523`):** `SessionPort` Protocol, `InMemorySession` adapter (LRU + TTL, thread-safe), `POST /api/agent/signal` route with module-level singleton.
- **Task 3 — SelectStrategy (`adab973`):** referrer-based scoring + emphasis directives. `LLMPort.evaluate()` added. `PydanticAIProvider` adapter wired (temperature/max_tokens via `ModelSettings`, OpenAI-compatible provider).
- **Task 4 — AdaptStrategy (`f380372`):** behavioral re-scoring with confidence-gated generation.
- **Task 5 — ComposeStrategy (`b26b1cf`):** command bar synthesis.
- **Task 6 — Five-verb events (`d32d5c0`):** `ux_focus` / `ux_recede` / `ux_bridge` / `ux_surface` / `ux_signal` formatters in `ux_events.py`, `staggered_dispatch` AsyncGenerator with 400-800ms random gaps.
- **Task 7 — Frontend rendering (`9705120`):** UX store extended with `emphasis` / `generated` / `bridges` + `applyFocus` / `applyRecede` / `applySurface` / `addBridge` actions; five-verb parsers + type guards; `useSignalCollector` hook (4000ms batched POST); `ProjectCard` / `ExperienceCard` / `MoleculeResolver` / `Canvas` forward emphasis + generated props.

## Key Decisions
- No new ADRs. Implementation follows ADR-0003 (five-verb protocol) and ADR-0005 (stack).
- **Strategies live in `domain/`, not `adapters/`** — they are pure orchestration logic over `LLMPort`; only the provider is an adapter.
- **`_get_session_store()` singleton pattern** in `signal_route.py` mirrors `_get_cache()` in `stream_route.py` — lazy-init via module-level var keeps state across requests without a global at import time.
- **Default prop semantics in molecules:** `!emphasis || emphasis.includes("title")` — undefined emphasis renders everything, preserving backward compat with default salience rendering.

## Blockers
None blocking. Low-priority pre-existing: iOS Safari dark mode rendering; E2E visual baselines not yet generated.

## Next Step
**Wire `SelectStrategy` into `stream_route.py` so the agent pipeline actually runs on first connect.** Branch: `feat/002-stream-integration` off `develop`.

Concrete changes to `backend/src/app/adapters/api/stream_route.py`:
1. Replace `_get_llm_port()` to return `PydanticAIProvider` (from `app.adapters.llm.pydantic_ai_provider`) when `LLM_API_KEY` is set.
2. In `_generate_stream`: after the initial `ux_snapshot_event`, instantiate `SelectStrategy(llm)`, call `await strategy.evaluate(catalog, context)` → `IntelligenceResult`.
3. Transform the result into five-verb events using the formatters already in `ux_events.py`: one `ux_focus_event` per item with `importance ≥ 0.6` and non-empty `emphasis`; one `ux_recede_event` per item with `importance ≤ 0.3`; `ux_bridge_event` for each `BridgeAnnotation`.
4. Emit via `staggered_dispatch(events)` (from `dispatch.py`) so events arrive with 400-800ms gaps — the frontend handlers are already wired in `use-agent-stream.ts`.
5. Keep cache semantics: key by `context.referrer_type`, cache the `IntelligenceResult`, skip re-eval on cache hit.
6. Test-first: add `tests/api/test_stream_intelligence.py` asserting event ordering (`STATE_SNAPSHOT` → focuses → recedes → bridges) with a fake `LLMPort` stub returning a scripted `IntelligenceResult`.

Also pending in the same slice or follow-up: migrate `command_route.py` to `ComposeStrategy`, and wire `useSignalCollector` into `Canvas.tsx` with a session ID + dwell/click/skip observers so the Tier 2 path can actually fire.

## Story Map
No story map
