# Backend — Portfolio API

Python 3.13, FastAPI, Pydantic 2.11, uvicorn. Managed with uv.
Hexagonal architecture: `src/app/{domain,ports,adapters}/`. Domain has zero framework imports.

## Commands
- `uv run pytest` — unit + behavior tests
- `uv run pytest evals/` — LLM evaluation suite (slow, hits API)
- `uv run ruff check src tests` — lint
- `uv run ruff format --check src tests` — format check

## Conventions
- Type hints on all function signatures.
- Config in pyproject.toml (pytest, ruff, coverage).
- Tests: pytest + pytest-asyncio. EDD evals in `evals/` with `eval` marker.
- Ports define protocols. Adapters implement. Path tells you the layer.
