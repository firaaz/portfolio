# Testing Framework Decisions

## Status
accepted

## Date
2026-04-01

## Participants
Firaaz Farook, Claude (AI pair)

## Context and Problem Statement
Slice 0B (monorepo scaffold) required choosing testing frameworks for both backend and frontend before writing the first failing test. The project uses three test layers — TDD (domain logic), BDD (agent behavior), and EDD (Evaluation-Driven Development for LLM outputs) — each with different requirements. LLM outputs are non-deterministic, so traditional `assert x == y` testing is insufficient for the EDD layer; we need statistical and semantic evaluation metrics.

## Decision Drivers
- **Solo developer** — ceremony and config overhead must be minimal. Tools that require separate file formats (Gherkin `.feature` files) or heavy setup are not justified without a team audience.
- **Test-first methodology** — every slice follows RED → GREEN → REFACTOR. The test harness must support fast iteration (~1s feedback loop for unit tests).
- **LLM evaluation needs** — the agent produces structured JSON manifests with importance scores. Evaluating relevancy, consistency, and grounding requires purpose-built LLM metrics, not string matching.
- **Vite-native frontend** — the frontend test runner must share Vite's config and transform pipeline to avoid duplicated configuration.
- **Separation of fast and slow tests** — LLM evals hit real APIs (slow, ~10-30s). They must be excludable from the fast test loop but runnable in CI.
- **Modern tooling preference** — favor Rust/native-speed tools where stable and feature-complete.

## Considered Options

### Backend

1. **pytest + pytest-asyncio + DeepEval + ruff, plain Given/When/Then naming** — pytest as runner, DeepEval for LLM evaluation metrics (relevancy via LLM-as-judge, schema validation via `JsonCorrectnessMetric`), plain pytest for grounding and consistency checks. BDD via naming convention (`test_given_X_when_Y_then_Z`). ruff for linting and formatting.

2. **pytest + pytest-bdd + custom LLM assertions** — Same runner but Gherkin `.feature` files for BDD, no dedicated eval framework. All LLM evaluation logic hand-written (custom LLM-as-judge code, manual multi-run variance).

3. **pytest + pytest-bdd + promptfoo** — Gherkin for BDD, promptfoo (YAML-based) for LLM evals. Promptfoo is powerful for prompt comparison but less code-native than pytest integration.

### Frontend

1. **vitest + happy-dom + @testing-library/react + Biome** — Vite-native test runner, fast DOM environment, accessible-by-default component queries, single Rust binary for lint + format.

2. **vitest + jsdom + @testing-library/react + ESLint 9 + Prettier** — Same runner and query library but slower DOM and two separate tools for lint/format.

3. **vitest browser mode + ESLint 9** — Real browser for component tests. More accurate DOM but heavier setup, slower feedback loop.

## Decision Outcome

### Backend: Option 1 — pytest + pytest-asyncio + DeepEval + ruff, plain naming

**Test runner:** `pytest` with `pytest-asyncio` (`asyncio_mode = "auto"`) for SSE endpoint testing.

**BDD:** Plain pytest with Given/When/Then in test names. `pytest-bdd` adds `.feature` file ceremony with no audience for a solo developer. The naming convention is grep-friendly and zero-config.

**EDD (LLM evaluation):** `DeepEval` (v2+) for the hard problems, plain pytest for deterministic checks.

| Eval Criterion | Tool | Deterministic? |
|---|---|---|
| Schema compliance (valid Manifest, all items, scores 0.0–1.0) | DeepEval `JsonCorrectnessMetric` + Pydantic | Yes |
| Relevancy (visitor context → correct items scored high) | DeepEval `AnswerRelevancyMetric` (LLM-as-judge) | No — API call |
| Consistency (same input → scores within ±0.15) | Plain pytest multi-run loop | Yes |
| Grounding (bridge text → real catalog IDs) | Plain pytest assertion | Yes |

Evals live in `backend/evals/` with `@pytest.mark.eval` marker. `make test` excludes evals via `addopts = "-m 'not eval'"`. `make test-evals` runs only evals.

**Property testing:** Deferred. `hypothesis` added only if manifest contract grows beyond 5 invariants.

**Coverage:** `pytest-cov` installed, no enforced threshold. On-demand via `--cov`.

**Linting:** `ruff` for both check and format. Config in `pyproject.toml`.

### Frontend: Option 1 — vitest + happy-dom + testing-library + Biome

**Test runner:** `vitest` — Vite-native, shares transform pipeline and config.

**DOM environment:** `happy-dom` — 2-3x faster than jsdom. Per-file jsdom fallback via `// @vitest-environment jsdom` directive if a specific test hits a happy-dom DOM quirk.

**Component testing:** `@testing-library/react` — accessible-by-default queries (`getByRole`, `getByText`). Proven, well-maintained.

**API mocking:** `msw` deferred until Slice 0D when SSE mocking is needed.

**E2E:** Playwright (already decided, no change).

**Linting + formatting:** Biome v2 — single Rust binary replacing ESLint + Prettier. v2.4 is stable, has `useExhaustiveDependencies` for React hooks. No React Compiler rules, but we don't use React Compiler.

### Test harness (Makefile)

```
make test          # fast: pytest (no evals) + vitest
make test-evals    # slow: pytest evals/ -m eval (hits real LLM API)
make test-all      # everything: test + test-evals + e2e
make test-e2e      # Playwright e2e only
make lint          # ruff + biome
make typecheck     # tsc --noEmit
make check         # lint + typecheck + test (CI gate)
```

## Consequences
- Good: DeepEval provides research-backed LLM evaluation metrics (G-Eval, LLM-as-judge) without writing custom evaluation logic; deterministic metrics (`JsonCorrectnessMetric`) cost zero API calls; `@pytest.mark.eval` cleanly separates fast tests from slow LLM evals; Biome eliminates ESLint + Prettier config complexity; happy-dom makes frontend test loop ~2x faster; entire harness controllable via `make` targets
- Bad: DeepEval is an additional dependency (~LLM-as-judge metrics incur API costs per eval run); Biome has fewer community plugins than ESLint (no React Compiler rules); happy-dom has occasional DOM quirks requiring per-file jsdom fallback; plain BDD naming is less readable than Gherkin for non-developers (acceptable for solo project)
