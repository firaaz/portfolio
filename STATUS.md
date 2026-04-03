# Status

## Current State
FEAT-001 Slices 0A–5 complete on `develop`. The full LLM agent pipeline is live: FastAPI streams SSE → Together AI Llama 3.3 70B scores 13 catalog items by visitor context → StateDelta updates frontend importance scores → AnimatedMolecule opacity transitions. Agent falls back to default manifest on any error. All tests pass: 48 backend + 37 frontend vitest + 6 Playwright e2e + 9 EDD evals (Together AI). Provider-agnostic via `LLM_BASE_URL` env var (OpenAI-compatible API).

## Accomplished This Session
- Implemented Slice 5 (LLM Agent) end-to-end: EDD evals → domain models → LLM adapter → stream route → frontend delta handling.
- Created `VisitorContext` model with referrer URL parsing (linkedin/github/direct).
- Created `LLMPort` protocol and `agent.assemble_manifest()` with fallback to defaults on error.
- Wrote 9 EDD evals: schema validation, relevancy, consistency (±0.20), content grounding.
- Implemented LLM adapter with `openai` SDK, configurable `LLM_BASE_URL` for any OpenAI-compatible provider.
- Added rate-limit retry with exponential backoff (3 attempts, 2s/4s/8s).
- Updated stream route: StateSnapshot (instant) → StateDelta (LLM-refined, ~2-3s).
- Added `applyDelta` store action and `isStateDelta` type guard to frontend.
- Compared LLM providers: started with Groq free tier (hit 100K TPD limit during eval iteration), switched to Together AI ($25 free credits, no daily caps).
- Added `load_dotenv()` to `main.py` and `evals/conftest.py` for env var loading.
- Added `backend/tests/conftest.py` with autouse fixture to mock LLM in unit tests (0.23s, no real API calls).
- Merged `feat/001-llm-agent` to `develop` (11 commits, 25 files, 878 insertions).

## Key Decisions
- No new ADRs. Architecture follows ADR-0003 (agent protocol) and ADR-0005 (FastAPI + AG-UI SSE).
- Together AI over Groq/OpenAI: prepaid credits, no daily token caps, $25 free, OpenAI-compatible. Groq's 100K TPD limit blocks eval iteration.
- Temperature 0.1 for scoring consistency. Consistency eval tolerance ±0.20.
- `_get_llm_port()` factory in stream route for test mocking. Autouse conftest prevents unit tests from hitting real APIs.

## Blockers
None.

## Next Step
**Slices 6 + 7 in parallel via worktrees** from `specs/001-home-experience/plan.md`.

### Worktree setup
```bash
# Slice 6 — Command Bar (frontend + new backend route)
git worktree add ../portfolio-slice6 -b feat/001-command-bar develop

# Slice 7 — Referrer Middleware + Caching (backend only)
git worktree add ../portfolio-slice7 -b feat/001-referrer-cache develop
```

### Slice 6 — Command Bar (in `../portfolio-slice6`)
⌘K opens command dialog → POST `/api/agent/command` → SSE response → manifest update.
- Files: `command_route.py` (new), `CommandBar.tsx` (new), `use-command-bar.ts` (new), `Canvas.tsx` (update), `manifest-store.ts` (update)
- EDD eval: `test_command_relevancy.py`
- No overlap with Slice 7 except `manifest-store.ts` (Slice 7 doesn't touch frontend)

### Slice 7 — Referrer Middleware + Caching (in `../portfolio-slice7`)
Parse referrer/UTM in middleware → in-memory LRU cache → skip LLM for repeat visitors.
- Files: `referrer_middleware.py` (new), `cache.py` port (new), `memory_cache.py` (new), `agent.py` (update), `stream_route.py` (update)
- No frontend changes. No overlap with Slice 6's frontend work.

### Merge order
Merge Slice 7 first (backend-only, fewer conflicts), then rebase Slice 6 on top. The only shared file is `stream_route.py` — Slice 7 adds middleware context passing, Slice 6 adds a new route. Clean separation.

After both merge → **Slice 8 (Transparency Panel)** completes FEAT-001.
