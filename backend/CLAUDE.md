# Backend — Portfolio API

Python 3.13, FastAPI, Pydantic 2.11, uvicorn. Managed with uv.
Hexagonal architecture: `src/app/{domain,ports,adapters}/`. Domain has zero framework imports.

## Commands
- `uv run pytest` — unit + behavior tests
- `uv run pytest evals/` — LLM evaluation suite (slow, hits API)
- `uv run ruff check src tests` — lint
- `uv run ruff format --check src tests` — format check

## Architecture
- Hexagonal: `domain/` (models + logic), `ports/` (protocols), `adapters/` (implementations).
- Domain has zero framework imports. Pydantic is the sole exception — it IS the domain modeling tool.
- Ports define `Protocol` classes. Adapters implement them. Path tells you the layer.
- Router-per-file in `adapters/api/`, aggregated via `__init__.py` barrel.
- Content as data: portfolio content lives in YAML, loaded by adapter — never hardcoded in Python.

## Naming
- `snake_case` modules, functions, variables. `PascalCase` classes. `UPPER_CASE` module constants.
- Private helpers prefixed with `_` (e.g., `_generate_stream`, `_state_snapshot_event`).
- Test classes: `class TestManifestItem:` grouping related cases. Methods: `test_<behavior>`.
- BDD naming: `test_<given>_<when>_<then>` in plain English (no pytest-bdd, no `.feature` files).

## Types & Models
- Type hints on ALL function signatures, including return types (`-> None`, `-> dict[str, str]`).
- PEP 585 modern generics: `dict`, `list`, `tuple`, `set` — never `typing.Dict`/`List`/`Tuple`/`Set`.
- `collections.abc` for abstract types: `AsyncGenerator`, `Sequence`, `Mapping`.
- Pydantic `BaseModel` for domain models. `Field()` for constraints (`ge`, `le`, `min_length`).
- `typing.Any` only at serialization boundaries (e.g., `dict[str, Any]`). Avoid elsewhere.

## Imports
- Absolute imports from `app.*` always. No relative imports.
- Ruff isort handles ordering: stdlib → third-party → first-party (`app.*`).

## Style
- Module-level docstring on every `.py` file (one line).
- One-liner docstring on every public function and class.
- Ruff enforced: line-length 88, rules `E/F/I/UP/B/SIM/RUF`. All config in `pyproject.toml`.
- No bare `except:`. Catch specific exceptions or use `except Exception:`.
- Prefer early return over nested conditionals.

## Testing
- pytest + pytest-asyncio (`asyncio_mode = "auto"` — no `@pytest.mark.asyncio` needed).
- Test methods return `-> None`. Test classes have no `__init__`.
- `TestClient(app)` for endpoint tests (synchronous API, no async test client needed).
- EDD evals in `evals/` with `@pytest.mark.eval`. Excluded from `make test` by default.
- `pytest.raises(ValidationError)` for Pydantic constraint tests.
- See ADR-0006 for testing framework rationale.

## FastAPI Patterns
- `APIRouter(prefix="/api/<resource>")` per feature. Composed in adapter `__init__.py`.
- `StreamingResponse` with `text/event-stream` + `Cache-Control: no-cache` for SSE.
- `AsyncGenerator[str]` return type for SSE generator functions.
