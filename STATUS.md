# Status

## Current State
FEAT-001 Slices 0A + 0B complete on `develop`. Monorepo scaffold is up and all gates green (`make check` passes). Backend: FastAPI + Python 3.13 + uv, health endpoint at `/health`. Frontend: Vite + React 19 + Tailwind 4, blank page renders. Test infra: pytest + pytest-asyncio + DeepEval (backend), vitest + happy-dom + testing-library (frontend), Biome (lint/format), ruff (Python lint). Six ADRs define the architecture including testing framework choices (ADR-0006).

## Accomplished This Session
- Created `develop` branch and `feat/001-scaffold` feature branch
- Slice 0A: Deleted all Next.js template code (88 files, 14K lines), rewrote `.gitignore` for monorepo
- Slice 0B: Scaffolded monorepo with test-first (RED → GREEN → harness)
  - Backend: `backend/pyproject.toml`, FastAPI app with `/health`, pytest config with eval marker exclusion
  - Frontend: `frontend/package.json`, Vite + React 19 + Tailwind 4, vitest + happy-dom + testing-library
  - Makefile: dev, test, test-evals, lint, typecheck, check targets
  - Fixed: `[dependency-groups]` not `[project.optional-dependencies]` for uv, `PYTHONPATH=src` for uvicorn with src/ layout, Biome v2.4 config schema, tsconfig `forceConsistentCasingInFileNames`
- ADR-0006: Testing framework decisions (pytest + DeepEval for EDD, vitest + Biome, three-layer test-first)
- Added `deepeval>=2.0` to backend dev dependencies (v3.9.5 installed)
- Fast-forward merged `feat/001-scaffold` → `develop`, deleted feature branch

## Key Decisions
- ADR-0006: [Testing Frameworks](docs/adrs/0006-testing-framework-decisions.md) — pytest + DeepEval (EDD), vitest + happy-dom, Biome v2, plain BDD naming
- Biome over ESLint + Prettier (user chose ESLint initially, then switched to Biome)
- DeepEval for EDD layer: `AnswerRelevancyMetric` (LLM-as-judge) + `JsonCorrectnessMetric` (schema) + plain pytest for grounding/consistency
- Fast-forward merge strategy for clean feature branches (preserves RED → GREEN history)

## Blockers
None.

## Next Step
Start Slice 0C (Backend SSE endpoint) and Slice 0D (Frontend canvas) — these are parallelizable via worktrees per `specs/001-home-experience/plan.md`. Create `feat/001-backend-sse` from `develop`. Slice 0C: write failing test for `GET /api/agent/stream` returning AG-UI events via SSE, then implement. Slice 0D: write failing test for Zustand manifest store + Canvas component, then implement. See plan.md Slices 0C and 0D for full details.
