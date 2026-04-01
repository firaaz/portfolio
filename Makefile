.PHONY: dev test test-evals test-all test-e2e lint typecheck check

dev:
	@trap 'kill 0' EXIT; \
		(cd backend && PYTHONPATH=src uv run uvicorn app.main:app --reload --port 8000) & \
		(cd frontend && pnpm dev) & \
		wait

test:
	cd backend && uv run pytest
	cd frontend && pnpm test -- --run

test-evals:
	cd backend && uv run pytest evals/ -m eval

test-e2e:
	cd frontend && pnpm test:e2e

test-all: test test-evals test-e2e

lint:
	cd backend && uv run ruff check src tests
	cd backend && uv run ruff format --check src tests
	cd frontend && pnpm lint

typecheck:
	cd frontend && pnpm typecheck

check: lint typecheck test
