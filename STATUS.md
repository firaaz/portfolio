# Status

## Current State
FEAT-001 Slices 0A–5 complete on `feat/001-llm-agent` (not yet merged to `develop`). The LLM agent is live: Groq Llama 3.3 70B scores 13 catalog items by importance based on visitor context (referrer type). SSE stream emits StateSnapshot (default manifest, instant) followed by StateDelta (LLM-refined importance scores, ~200ms via Groq). Frontend merges deltas by ID, triggering smooth opacity transitions. Agent falls back to default manifest on any error — never breaks the experience. All tests pass: 48 backend + 37 frontend vitest + 6 Playwright e2e + 9 EDD evals.

## Accomplished This Session
- Scaffolded `backend/evals/` directory with conftest, catalog fixtures, and pytest marker wiring.
- Fixed `make test-evals` addopts conflict (added `-o "addopts="` override).
- Wrote 4 EDD eval test files (schema, relevancy, consistency, content grounding) — 9 evals total.
- Created `VisitorContext` model with referrer URL parsing (linkedin/github/direct/malformed).
- Created `LLMPort` protocol and `agent.assemble_manifest()` with try/except fallback to defaults.
- Implemented LLM adapter using `openai` SDK with configurable `LLM_BASE_URL` for any OpenAI-compatible provider.
- Added rate-limit retry with exponential backoff (3 attempts, 2s/4s/8s) for 429 errors.
- Updated `stream_route.py` to emit StateSnapshot then StateDelta after LLM refinement.
- Added `applyDelta` store action and `isStateDelta` type guard to frontend.
- Compared LLM providers (cost/performance) and chose Groq free tier ($0/month, ~200ms latency).
- Created `backend/.env` and `.env.example` with dotenv loading in `main.py`.
- Added `backend/tests/conftest.py` with autouse fixture to prevent unit tests from hitting real APIs.
- All 85 unit tests pass in 0.23s. All 9 EDD evals pass with Groq.

## Key Decisions
- No new ADRs. Architecture follows ADR-0003 (agent protocol) and ADR-0005 (FastAPI + AG-UI SSE).
- Chose Groq free tier over OpenAI/Anthropic: $0/month, ~200ms latency, 30 RPM / 14.4K RPD — more than sufficient for a personal portfolio.
- StateDelta carries `updates: [{id, importance}]` — only importance scores, not full items. Frontend merges by ID.
- Temperature 0.1 for scoring consistency. Consistency tolerance ±0.20 (background-zone items fluctuate harmlessly).
- `_get_llm_port()` factory in stream route enables test mocking without full DI. Autouse conftest fixture prevents all unit tests from hitting real APIs.

## Blockers
None.

## Next Step
**Merge `feat/001-llm-agent` to `develop`**, then start **Slice 6 — Command Bar** or **Slice 7 — Referrer Middleware + Caching** (parallelizable) from `specs/001-home-experience/plan.md`. Slice 6 adds ⌘K command bar (POST `/api/agent/command` → SSE → manifest update). Slice 7 adds referrer parsing middleware + in-memory LRU cache to skip LLM for repeat visitors. Both branch from `develop` independently.
