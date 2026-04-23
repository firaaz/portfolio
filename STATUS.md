# Status

## Current State
FEAT-001 complete. FEAT-002 Agent Content Intelligence Tasks 0-7 complete on `develop` — domain models, session/signals, three strategies (Select/Adapt/Compose), PydanticAI adapter, five-verb AG-UI events with staggered dispatch, and the full frontend rendering pipeline (store extensions, five-verb parsers, signal collector, molecule emphasis/generated props). Backend 168 tests passing, frontend 92 passing, typecheck clean, 0 lint errors. The editorial surface (Iron-Gall Ink, 12-column grid, 8 zones, breathing) is live.

**What is NOT yet wired:** `stream_route.py` still calls the legacy `assemble_ux_state()` path and emits `ux_salience_event` only — it does not yet invoke `SelectStrategy` via `PydanticAIProvider`, and does not emit five-verb events. So the frontend renders default catalog salience; the intelligence pipeline exists but is dark on the wire.

## Accomplished This Session
No code changes. Session was a methodology evaluation detour:
- Read `~/Developer/github.com/firaaz/cairn` end-to-end (README, CLAUDE.md, spec-v1.md, operational-reference.md, vision, roadmap, thin slash commands, two hook scripts).
- Produced adoption-evaluation analysis: partial cherry-pick recommended (three hooks + handoff-as-pointer + tiered catchup + architecture validator + role labels); full four-phase-per-slice session split skipped as overhead for solo non-safety-critical work.
- Wrote review to cairn's own `docs/reviews/` directory at `~/Developer/github.com/firaaz/cairn/docs/reviews/2026-04-23-from-portfolio-evaluation.md` (uncommitted in cairn). Follows the existing `YYYY-MM-DD-<source>.md` convention from the 2026-04-11 RAG-session review. Contains five findings with file:line citations for cairn maintainers and three open questions.

## Key Decisions
- No new ADRs this session.
- **Partial cairn adoption, copy-based not symlink-based.** Rationale: cairn is pre-v1 and mid-migration (identifier scheme, phase rethink, parallelism); symlink consumption couples our tooling to a moving upstream. Portfolio will copy specific files (`reversibility-guard.sh`, `scope-guard.sh`, `reality-check.sh`, `validate_architecture.py`) into `.claude/hooks/` and `scripts/` as a separate tooling slice — not adopt the full four-phase discipline.
- Tooling slice deferred behind FEAT-002 stream integration; FEAT-002 momentum takes priority.

## Blockers
None blocking.

Pending across-repo:
- Review file uncommitted in cairn (`docs/reviews/2026-04-23-from-portfolio-evaluation.md`). Decide at next cairn session whether to commit or discard. Not in portfolio's control.

Low-priority pre-existing: iOS Safari dark mode rendering; E2E visual baselines not yet generated.

## Next Step
**Wire `SelectStrategy` into `stream_route.py` so the agent pipeline actually runs on first connect.** Unchanged from last session — this session did not move FEAT-002 forward. Branch: `feat/002-stream-integration` off `develop`.

Concrete changes to `backend/src/app/adapters/api/stream_route.py`:
1. Replace `_get_llm_port()` to return `PydanticAIProvider` (from `app.adapters.llm.pydantic_ai_provider`) when `LLM_API_KEY` is set.
2. In `_generate_stream`: after the initial `ux_snapshot_event`, instantiate `SelectStrategy(llm)`, call `await strategy.evaluate(catalog, context)` → `IntelligenceResult`.
3. Transform the result into five-verb events using the formatters already in `ux_events.py`: one `ux_focus_event` per item with `importance ≥ 0.6` and non-empty `emphasis`; one `ux_recede_event` per item with `importance ≤ 0.3`; `ux_bridge_event` for each `BridgeAnnotation`.
4. Emit via `staggered_dispatch(events)` (from `dispatch.py`) so events arrive with 400-800ms gaps — the frontend handlers are already wired in `use-agent-stream.ts`.
5. Keep cache semantics: key by `context.referrer_type`, cache the `IntelligenceResult`, skip re-eval on cache hit.
6. Test-first: add `tests/api/test_stream_intelligence.py` asserting event ordering (`STATE_SNAPSHOT` → focuses → recedes → bridges) with a fake `LLMPort` stub returning a scripted `IntelligenceResult`.

Also pending in the same slice or follow-up: migrate `command_route.py` to `ComposeStrategy`, and wire `useSignalCollector` into `Canvas.tsx` with a session ID + dwell/click/skip observers so the Tier 2 path can actually fire.

Tooling-hooks slice (cairn cherry-pick) is on the backlog behind stream integration — do not start before FEAT-002 is wired.

## Story Map
No story map
