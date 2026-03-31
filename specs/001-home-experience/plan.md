# FEAT-001 Implementation Plan: Home Experience

> **Canonical location**: `specs/001-home-experience/plan.md` (committed to git)
> **Reconstructed** from spec, ADRs, STATUS.md context after the original plan was lost.

## Context

FEAT-001 is the first shippable increment of the AI-adaptive portfolio. Five ADRs define the architecture. The repo still contains the Next.js template — no production code exists. This plan cuts through the entire stack as a walking skeleton, then adds depth slice by slice.

**Source**: `specs/001-home-experience/spec.md` (Shape Up pitch)
**Stack**: FastAPI + Vite + React 19 + Zustand + Tailwind 4 + shadcn/ui + motion + AG-UI (ADR-0005)

## Test-First Methodology

Every slice follows **Red → Green → Refactor**. The workflow within each slice is:

1. **Write tests first** — they define the contract. Tests fail (RED).
2. **Implement** — minimum code to make tests pass (GREEN).
3. **Refactor** — clean up while tests stay green.
4. **Commit on green** — `make test` + `pnpm typecheck` + `make lint` all pass.

Three test layers (from CLAUDE.md):
- **TDD** — domain logic: manifest assembly, importance scoring, models
- **BDD** — agent behavior: Given/When/Then scenarios for context-driven adaptation
- **EDD** — LLM evals: written before the agent, define what "good" output looks like

## Test Tooling Decision (Slice 0B prerequisite)

Test frameworks must be chosen and configured before writing the first failing test. This is a building-phase decision per Shape Up — the spec says "test first" but not which tools.

### Decision criteria
- Minimal config, fast feedback loop
- Native to the build tool (Vite-native for frontend, pytest ecosystem for backend)
- BDD should feel natural, not ceremonial — prefer lightweight over framework-heavy
- EDD evals must be separable from fast tests (different `make` target, can hit real APIs)

### Candidates to evaluate during 0B

**Backend (Python):**

| Concern | Option A | Option B | Decision criteria |
|---------|----------|----------|-------------------|
| Runner | `pytest` | — | Only real choice for Python. No decision needed. |
| BDD | `pytest-bdd` (Gherkin `.feature` files) | Plain pytest with `Given/When/Then` in test names | pytest-bdd if team needs readable specs; plain pytest if overhead isn't worth it for solo dev |
| Property | `hypothesis` | Manual edge cases | hypothesis if manifest contract has enough invariants to justify; skip if <5 property tests |
| EDD | `pytest` in `evals/` dir with `--evals` marker | Separate `evals/` conftest | Must run separately (`make test-evals`), must be skippable in CI fast path |
| Coverage | `pytest-cov` | — | Only if useful signal; don't chase 100% |
| Async | `pytest-asyncio` or `anyio` | `httpx.AsyncClient` for FastAPI | Needed for SSE endpoint testing |

**Frontend (TypeScript):**

| Concern | Option A | Option B | Decision criteria |
|---------|----------|----------|-------------------|
| Runner | `vitest` | — | Vite-native, shares config. No decision needed. |
| Component | `@testing-library/react` | `vitest` browser mode | testing-library is proven, accessible-by-default queries |
| DOM | `jsdom` | `happy-dom` | happy-dom is faster; jsdom has better compat. Try happy-dom first. |
| E2E | `Playwright` | — | Already in CLAUDE.md commands. No decision needed. |
| MSW | `msw` for SSE mocking | Manual fetch mocks | msw if SSE mocking is clean; manual if simpler |

**Harness (Makefile targets):**

```makefile
make test          # fast: pytest (no evals) + vitest
make test-evals    # slow: pytest evals/ (hits real LLM API)
make test-all      # everything: test + test-evals + e2e
make test-e2e      # Playwright e2e only
make lint          # ruff + eslint
make typecheck     # pnpm typecheck (TypeScript strict)
make check         # lint + typecheck + test (CI gate for commits)
```

### How to decide during 0B
1. Set up pytest + vitest with minimal config
2. Write the first failing test (`test_health.py`, `App.test.tsx`)
3. For each "Option A vs B" above: try the simpler option first. Only add complexity if the simpler option causes friction.
4. Lock choices into `pyproject.toml` / `package.json`. Don't revisit unless something breaks.

---

## Branching Strategy

### Model: GitHub Flow + develop

```
main ──────────────────────────────────────────────► (production-ready, protected)
  │
  └─ develop ──────────────────────────────────────► (integration branch)
       │
       ├─ feat/001-scaffold ──► merge → develop
       ├─ feat/001-backend-sse ──► merge → develop     (parallel)
       ├─ feat/001-frontend-canvas ──► merge → develop  (parallel)
       ├─ feat/001-content-catalog ──► merge → develop
       ├─ feat/001-molecules ──► merge → develop
       ├─ feat/001-canvas-layout ──► merge → develop
       ├─ feat/001-motion ──► merge → develop
       ├─ feat/001-llm-agent ──► merge → develop
       ├─ feat/001-command-bar ──► merge → develop      (parallel)
       ├─ feat/001-referrer-cache ──► merge → develop   (parallel)
       └─ feat/001-transparency ──► merge → develop
                                          │
                                          └─► PR to main (FEAT-001 complete)
```

### Branch naming
- `feat/001-<slice-name>` — feature slices
- `fix/001-<description>` — bug fixes discovered during implementation
- `chore/001-<description>` — tooling, config, non-functional changes

### Rules
- `main` is protected. Only merged from `develop` via PR when a feature is complete.
- `develop` is the integration branch. Each slice merges here via fast-forward or squash.
- Slice branches are short-lived (one session). Create at start, merge at end.
- Parallel slices (0C+0D, 6+7) branch from `develop` independently, merge sequentially.
- Never commit directly to `main` or `develop`.

### Setup (before Slice 0A)
```bash
git checkout -b develop
git push -u origin develop
```

## Conventional Commits

All commits follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]
```

### Types
| Type | When |
|------|------|
| `feat` | New functionality (slice implementations) |
| `test` | Adding or updating tests (RED phase commits) |
| `fix` | Bug fixes |
| `refactor` | Code restructuring without behavior change (REFACTOR phase) |
| `chore` | Tooling, config, dependencies, CI |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (no logic change) |

### Scopes
| Scope | Covers |
|-------|--------|
| `backend` | Python backend code |
| `frontend` | React/TypeScript frontend code |
| `api` | API routes, SSE endpoints |
| `domain` | Domain models, business logic |
| `canvas` | Canvas components, layout |
| `agent` | LLM agent, manifest assembly |
| `test` | Test infrastructure, harness |
| `dx` | Developer experience (Makefile, tooling) |

### Examples per slice phase
```
test(domain): add failing manifest model validation tests     # RED
feat(domain): implement ManifestItem with importance scoring  # GREEN
refactor(domain): extract importance range to constant        # REFACTOR
chore(dx): configure pytest with asyncio and httpx            # TOOLING
```

### Commit flow within a slice
1. `test(<scope>): ...` — RED phase (failing tests committed)
2. `feat(<scope>): ...` or `fix(<scope>): ...` — GREEN phase (implementation)
3. `refactor(<scope>): ...` — REFACTOR phase (optional, only if cleanup needed)
4. `chore(<scope>): ...` — any config/tooling changes

---

## Dependency Graph and Parallelization

```
Slice 0A (delete template)
  └→ Slice 0B (scaffolds)
       ├→ Slice 0C (backend SSE) ──────┐
       └→ Slice 0D (frontend canvas) ──┘ (parallel via worktrees)
             └→ Slice 1 (content catalog — backend only)
                  └→ Slice 2 (molecules — frontend only)
                       └→ Slice 3 (canvas layout — frontend only)
                            └→ Slice 4 (motion + presence — frontend only)
                                 └→ Slice 5 (LLM agent — backend, then frontend delta handling)
                                      ├→ Slice 6 (command bar) ───┐
                                      └→ Slice 7 (referrer+cache) ┘ (parallel via worktrees)
                                           └→ Slice 8 (transparency panel)
```

### Parallelization Opportunities

| Window | Parallel Slices | Method | Why it works |
|--------|----------------|--------|-------------|
| After 0B | 0C + 0D | Worktree | Backend SSE and frontend canvas touch zero shared files |
| After 5 | 6 + 7 | Worktree | Command bar (frontend+route) and referrer+cache (backend middleware) are independent |

**Sequential constraints**: Slices 1→2→3→4 are strictly sequential (each builds on the previous layer). Slice 5 needs both backend and frontend working together. Slice 8 needs the presence dot from Slice 4 and decision events from Slice 5+.

---

## Slice 0 — Scaffold + Walking Skeleton

**Goal**: Delete template, create monorepo, wire SSE end-to-end, hero renders on screen.

### 0A — Delete Template
- Delete: `src/`, `content/`, `public/`, `node_modules/`, `content-collections.ts`, `next.config.mjs`, `postcss.config.mjs`, `eslint.config.mjs`, `.eslintrc.json`, `components.json`, `tsconfig.tsbuildinfo`, `pnpm-lock.yaml`, `package.json`
- Keep: `docs/`, `specs/`, `tasks/`, `.claude/`, `.git/`, `.gitignore`, `CLAUDE.md`, `STATUS.md`, `LICENSE`, `README.md`
- Done: repo clean of template code

### 0B — Create Scaffolds

**1. RED — write failing tests:**
- `backend/tests/test_health.py` — GET /health returns 200 with `{"status": "ok"}`
- `frontend/src/__tests__/App.test.tsx` — App component mounts without error

**2. GREEN — implement to pass:**
- `Makefile` — dev, test, lint targets (stubbed)
- `backend/pyproject.toml` — FastAPI, uvicorn, pydantic, pytest (uv)
- `backend/src/app/__init__.py` + `backend/src/app/main.py` — FastAPI app, health endpoint
- `frontend/package.json` + `frontend/vite.config.ts` + `frontend/tsconfig.json` — Vite + React 19 + Tailwind 4
- `frontend/index.html` — minimal shell with SEO meta tags, inline default manifest JSON
- `frontend/src/main.tsx` + `frontend/src/App.tsx` — React entry

**Done**: `make dev` starts both servers, health responds, frontend shows blank page

### 0C — Backend SSE Endpoint ⚡ (parallelizable with 0D)

**1. RED — write failing tests:**
- `backend/tests/test_manifest_model.py` — ManifestItem validates importance 0.0–1.0, rejects out-of-range; Manifest requires non-empty items list
- `backend/tests/test_stream.py` — GET `/api/agent/stream` returns `text/event-stream` content type; response contains AG-UI StateSnapshot event; snapshot manifest has 13 items with valid importance scores

**2. GREEN — implement to pass:**
- `backend/src/app/domain/manifest.py` — Pydantic: `ManifestItem(id, importance, molecule, data)`, `Manifest(items)`
- `backend/src/app/ports/stream.py` — `StreamPort` protocol
- `backend/src/app/adapters/api/stream_route.py` — `/api/agent/stream` SSE, hardcoded default manifest as StateSnapshot
- `backend/src/app/adapters/api/__init__.py` — router registration

**Rabbit hole**: AG-UI on Python — verify raw SSE with AG-UI-shaped JSON works with `@ag-ui/client`
**Done**: `curl /api/agent/stream` returns SSE with valid manifest

### 0D — Frontend Canvas ⚡ (parallelizable with 0C)

**1. RED — write failing tests:**
- `frontend/src/__tests__/manifest-store.test.ts` — store initializes with empty manifest; `setManifest` replaces items; `getHero` returns item with highest importance (≥0.9)
- `frontend/src/__tests__/Canvas.test.tsx` — given manifest with hero item (importance 1.0), renders name and title; given empty manifest, renders loading state

**2. GREEN — implement to pass:**
- `frontend/src/store/manifest-store.ts` — Zustand: holds Manifest, replace from SSE, init from inline JSON
- `frontend/src/canvas/Canvas.tsx` — reads store, renders hero (importance ≥ 0.9) prominently, rest as plain text
- `frontend/src/hooks/use-agent-stream.ts` — EventSource to `/api/agent/stream`, parses StateSnapshot, updates store
- Update `frontend/src/App.tsx` — mounts Canvas + useAgentStream

**Rabbit hole**: `@ag-ui/client` compatibility — use if works, else raw EventSource
**Done**: Browser shows Firaaz's name + title + summary from SSE. **Walking skeleton complete.**

---

## Slice 1 — Content Catalog (YAML Data Files)

**Goal**: Content as data, not code. Backend loads from YAML via content adapter.

**1. RED — write failing tests:**
- `backend/tests/test_content_models.py` — ContentItem Pydantic models validate each content type (project, experience, skill, education, publication, contact, hero); reject missing required fields
- `backend/tests/test_yaml_loader.py` — loads `catalog.yaml`, returns 13 items; each item has `id`, `molecule`, and type-specific data; no duplicate IDs
- `backend/tests/test_stream_with_content.py` (BDD) — Given catalog loaded / When SSE stream requested / Then manifest items match catalog entries with default importance scores

**2. GREEN — implement to pass:**
- `backend/src/app/domain/content.py` — Pydantic models per content type
- `backend/src/app/ports/content.py` — `ContentPort` protocol: `load_catalog() -> list[ContentItem]`
- `backend/src/app/adapters/content/yaml_loader.py` — reads catalog.yaml
- `backend/content/catalog.yaml` — all 13 items with full data
- Update `stream_route.py` — use ContentPort instead of hardcoded manifest

**Rabbit hole**: Duck-typing disambiguation — add `molecule` key if data shapes overlap
**Done**: Same visual, content from YAML. Edit YAML to change content, not Python.

---

## Slice 2 — Molecule Components

**Goal**: Real visual components for each content type per ADR-0004.

**1. RED — write failing tests:**
- `frontend/src/__tests__/MoleculeResolver.test.tsx` — given data with `molecule: "project"`, renders ProjectCard; given `molecule: "experience"`, renders ExperienceCard; given `molecule: "hero"`, renders HeroMolecule; unknown molecule renders fallback
- `frontend/src/__tests__/ProjectCard.test.tsx` — renders title, summary, tech tags from props; accessibility: has heading role
- `frontend/src/__tests__/ExperienceCard.test.tsx` — renders company, role, duration, description

**2. GREEN — implement to pass:**
- `frontend/src/molecules/HeroMolecule.tsx` — large type, full opacity
- `frontend/src/molecules/ProjectCard.tsx` — card with border, title, summary, tech tags
- `frontend/src/molecules/ExperienceCard.tsx` — company, role, duration
- `frontend/src/molecules/MoleculeResolver.tsx` — reads `molecule` key → picks component
- Update `Canvas.tsx` — use MoleculeResolver, importance→opacity mapping (1.0/0.55/0.25)

**Done**: Real molecules with visual differentiation. Starting to look like the fat marker sketch.

---

## Slice 3 — Canvas Layout (Editorial Zones)

**Goal**: Three semantic zones driven by importance thresholds.

**1. RED — write failing tests:**
- `frontend/src/__tests__/Canvas.test.tsx` (update) — items with importance ≥0.85 render inside `[data-zone="hero"]`; 0.4–0.84 inside `[data-zone="flow"]`; <0.4 inside `[data-zone="background"]`
- `frontend/src/__tests__/FlowZone.test.tsx` — renders children in CSS grid; grid has asymmetric column layout
- `frontend/src/__tests__/ContactCard.test.tsx` — renders email link, CTA button with accessible label

**2. GREEN — implement to pass:**
- Refactor `Canvas.tsx` — partition by importance thresholds, render in three zones
- `frontend/src/canvas/FlowZone.tsx` — asymmetric bento grid (~1.6:1 golden ratio)
- `frontend/src/canvas/BackgroundZone.tsx` — text links at ~25% opacity
- `frontend/src/molecules/SkillLink.tsx` — minimal text for background-depth items
- `frontend/src/molecules/ContactCard.tsx` — card with CTA

**Done**: Looks like the fat marker sketch. Hero top, bento middle, faded bottom.

---

## Slice 4 — Motion + Agent Presence

**Goal**: ADR-0004 opacity transitions. Agent presence dot.

**1. RED — write failing tests:**
- `frontend/src/__tests__/AnimatedMolecule.test.tsx` — renders child; applies opacity style matching importance (1.0/0.55/0.25); has `transition` CSS property
- `frontend/src/__tests__/PresenceDot.test.tsx` — renders at viewport edge; has `aria-label` for accessibility; is visible
- `frontend/src/__tests__/use-reduced-motion.test.ts` — returns `true` when `prefers-reduced-motion: reduce` matches

**2. GREEN — implement to pass:**
- `frontend/src/canvas/AnimatedMolecule.tsx` — motion opacity wrapper (500ms ease-out depth, 450ms reveal/hide)
- `frontend/src/chrome/PresenceDot.tsx` — viewport edge dot, opacity pulse 0.3→0.7 (3s loop)
- `frontend/src/hooks/use-reduced-motion.ts` — reads `prefers-reduced-motion`
- Update `Canvas.tsx` — wrap in AnimatedMolecule, add PresenceDot
- Update `HeroMolecule.tsx` — AnimatePresence crossfade (500ms)

**Done**: Smooth transitions. Agent dot pulsing. Feels alive and editorial.

---

## Slice 5 — LLM Agent

**Goal**: Real LLM produces importance scores. Default manifest first, LLM-refined via StateDelta.

**1. RED — write failing evals (EDD — evals before agent):**
- `backend/evals/test_manifest_relevancy.py` — Given LinkedIn referrer context / When agent assembles manifest / Then contact and experience importance > 0.7, higher than default
- `backend/evals/test_manifest_schema.py` — LLM output always parses to valid Manifest; all 13 items present; all scores 0.0–1.0; no missing IDs
- `backend/evals/test_manifest_consistency.py` — same input → similar output across 3 runs (importance scores within ±0.15)
- `backend/evals/test_content_grounding.py` — any bridge text references only real catalog item IDs

**2. RED — write failing unit tests (TDD):**
- `backend/tests/test_context_model.py` — VisitorContext parses referrer URL into type (linkedin, github, direct); handles missing/malformed referrer
- `backend/tests/test_agent.py` — agent calls LLMPort with context + catalog; returns valid manifest; falls back to default manifest on LLM error; never raises

**3. GREEN — implement to pass:**
- `backend/src/app/domain/context.py` — Pydantic model for visitor context
- `backend/src/app/ports/llm.py` — `LLMPort` protocol: `assemble_manifest(context, catalog) -> Manifest`
- `backend/src/app/domain/agent.py` — agent service: context + catalog → LLM → manifest (fallback on error)
- `backend/src/app/adapters/llm/provider.py` — implements LLMPort, single prompt → manifest JSON
- Update `stream_route.py` — StateSnapshot (default) immediately, then StateDelta (LLM-refined)

**4. Iterate prompts until evals pass.** Provider chosen during this step (cheapest that passes).

**Rabbit holes**: LLM latency (default first, delta after), provider selection
**Done**: Default content instant. ~1-2s later, canvas transitions as LLM scores arrive. LinkedIn visitor sees elevated contact/experience.

---

## Slice 6 — Command Bar ⚡ (parallelizable with 7)

**Goal**: ⌘K override interaction. Visitor request → agent → manifest update.

**1. RED — write failing tests:**
- `backend/tests/test_command_route.py` — POST `/api/agent/command` with `{"text": "show contact"}` returns SSE stream; stream contains StateSnapshot with valid manifest
- `backend/evals/test_command_relevancy.py` (EDD) — Given command "show me your AI projects" / When agent processes / Then Salama AI importance increases above default
- `frontend/src/__tests__/CommandBar.test.tsx` — opens on ⌘K keydown; closes on Escape; calls onSubmit with input value on Enter; input clears after submit
- `frontend/src/__tests__/use-command-bar.test.ts` — posts to `/api/agent/command`; updates manifest store on SSE response

**2. GREEN — implement to pass:**
- `backend/src/app/adapters/api/command_route.py` — POST `/api/agent/command`, returns SSE
- `frontend/src/chrome/CommandBar.tsx` — shadcn/ui Dialog + Input, ⌘K open, Escape close
- `frontend/src/hooks/use-command-bar.ts` — keyboard listener, POST handler
- Update `manifest-store.ts` — action for command flow
- Update `Canvas.tsx` — render CommandBar

**Done**: ⌘K → "show contact info" → canvas emphasizes contact. Override layer works.

---

## Slice 7 — Referrer Middleware + Caching ⚡ (parallelizable with 6)

**Goal**: Parse referrer/UTM. Cache manifests by pattern. Bound LLM costs.

**1. RED — write failing tests:**
- `backend/tests/test_referrer_middleware.py` — parses `https://linkedin.com/...` → type `linkedin`; parses GitHub referrer → `github`; missing header → `direct`; extracts UTM params from query string
- `backend/tests/test_memory_cache.py` — stores manifest by key; retrieves stored manifest; returns None for unknown key; respects TTL (expired entries return None); LRU evicts oldest when full
- `backend/tests/test_agent_caching.py` (BDD) — Given cached manifest for "linkedin" / When LinkedIn visitor requests / Then LLMPort is NOT called; Given no cache / When visitor requests / Then LLMPort IS called and result is cached

**2. GREEN — implement to pass:**
- `backend/src/app/adapters/api/referrer_middleware.py` — extract Referer + UTM, parse type
- `backend/src/app/ports/cache.py` — `CachePort` protocol
- `backend/src/app/adapters/cache/memory_cache.py` — in-memory LRU, TTL configurable
- Update `domain/agent.py` — cache check before LLM, cache result after
- Update `stream_route.py` — pass referrer context from middleware

**Done**: Repeat LinkedIn visitors skip LLM. Costs bounded. Layer 3 adaptation works.

---

## Slice 8 — Transparency Panel

**Goal**: Presence dot → slide-over audit trail of agent decisions.

**1. RED — write failing tests:**
- `backend/tests/test_decision_model.py` — DecisionRecord validates: requires context, manifest_diff, reasoning; reasoning must be non-empty string
- `frontend/src/__tests__/audit-store.test.ts` — store starts empty; `addDecision` appends to list; decisions ordered by timestamp; stores context + changes + reason per decision
- `frontend/src/__tests__/TransparencyPanel.test.tsx` — given list of decisions, renders each with timestamp and reasoning; empty state shows "No decisions yet"; panel has accessible heading

**2. GREEN — implement to pass:**
- `backend/src/app/domain/decision.py` — Pydantic model for decision record
- `frontend/src/store/audit-store.ts` — Zustand, collects AG-UI Custom events
- `frontend/src/chrome/TransparencyPanel.tsx` — shadcn/ui Sheet, decision list
- Update `stream_route.py` — emit Custom events with decision records
- Update `PresenceDot.tsx` — onClick opens TransparencyPanel

**Done**: Click dot → see "Detected LinkedIn referrer — elevated contact." All 3 interaction layers complete. **FEAT-001 done.**

---

## Walking Skeleton Progression

| After | State |
|-------|-------|
| Slice 0 | Ugly but real — hero on screen via SSE. End-to-end stack works. |
| Slice 1 | Content is data (YAML), not code. Same visual. |
| Slice 2 | Looks like a portfolio. Real molecules with visual differentiation. |
| Slice 3 | Looks like the fat marker sketch. Editorial canvas with zones. |
| Slice 4 | Feels alive. Smooth opacity transitions, agent dot pulsing. |
| Slice 5 | Agent is real. LLM scores, canvas adapts to context. |
| Slice 6 | Visitor can interact. ⌘K drives the agent. |
| Slice 7 | Production-viable. Caching, referrer detection, cost control. |
| Slice 8 | Transparent. Agent decisions visible. FEAT-001 complete. |

## Multi-Session Execution

This plan spans multiple sessions. Each session = one slice (or one sub-slice for Slice 0).

### Session workflow
1. **Start**: `/catchup` — reads STATUS.md, this plan, lessons.md
2. **Locate**: find current slice in this plan (STATUS.md tracks which slice is next)
3. **Execute**: `/implement` with the slice from this plan
4. **End**: `/handoff` — updates STATUS.md with completed slice, sets next slice

### STATUS.md tracking format
After each slice, STATUS.md should record:
```
## Next Step
Slice [N] — [Name] from `specs/001-home-experience/plan.md`.
[One-line description of what this slice does.]
```

### Slice boundary rules
- Each slice is one session. Don't start a new slice in the same session.
- If a slice is too big, decompose within the session (sub-commits A/B/C) but stay within the slice scope.
- Parallel slices (0C+0D, 6+7) use worktrees — each worktree is its own session.
- Test tooling decisions (0B prerequisite) are resolved in the 0B session and locked in.

### Recovery from context loss
If context is lost mid-slice:
1. `/catchup` reads STATUS.md + this plan
2. `git log --oneline -5` shows what was committed
3. `make test` shows what's passing
4. Resume from the RED or GREEN step — tests define where you are

---

## Explicitly Deferred

- Behavioral signals (IntersectionObserver, scroll) — Phase 2
- Staggered dispatch (400-800ms agent cadence) — polish after FEAT-001
- Blog/secondary pages — separate feature
- Deployment optimization — separate slice
- OpenAPI → TypeScript codegen — evaluate during 0C/0D
- Observability port (Langfuse etc.) — evaluate during Slice 5

## Verification

Each slice commits on green:
- `make test` — all backend + frontend tests pass
- `cd frontend && pnpm typecheck` — TypeScript strict, no errors
- `make lint` — ruff + eslint clean
- Visual check: `make dev` and open browser

After Slice 8 (complete):
- E2E: browser loads → hero visible instantly → SSE connects → LLM manifest transitions smoothly
- Command bar: ⌘K → type request → canvas updates
- Transparency: click dot → see decisions
- Referrer: simulate LinkedIn referrer → contact elevated
- Reduced motion: `prefers-reduced-motion` → still opacity-only (already satisfied)
