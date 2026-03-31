# Stack Change: FastAPI + Vite Replacing Next.js

## Status
accepted

## Date
2026-04-01

## Participants
Firaaz Farook, Claude (AI pair)

## Context and Problem Statement
During the home experience spec session, we decided to build from scratch rather than modify the forked dillionverma/portfolio template. This triggered a stack re-evaluation: the original stack (ADR-0001) was chosen partly because the Next.js template eliminated ~70% of design/scaffold work. Without that template advantage, Next.js's complexity becomes overhead rather than leverage — and the project's actual needs (Python LLM agent, AG-UI SSE streaming, editorial canvas) pull toward a different architecture.

## Decision Drivers
- **Developer expertise alignment.** Firaaz is a senior AI/Python engineer. The backend is where the agent logic, LLM orchestration, and manifest assembly live — this should be in his strongest language.
- **AI/ML ecosystem.** Python has first-class support for LLM libraries (LangGraph, PydanticAI, raw API clients), Pydantic for domain models, and evaluation tooling for EDD.
- **No SSR requirement.** The inline default manifest strategy (build step embeds a JSON manifest in static HTML) eliminates the need for server-side rendering. React reads it synchronously on mount — content visible in ~100ms.
- **AG-UI compatibility.** AG-UI's transport is SSE — framework-agnostic. A FastAPI endpoint streaming AG-UI events works identically to a Next.js API route, with the bonus that the agent logic stays in Python rather than being split across languages.
- **Template no longer needed.** Building from scratch means no benefit from Next.js template scaffolding. The framework's complexity (App Router, RSC conventions, middleware API) becomes pure overhead.
- **Deployment flexibility.** Decoupling frontend (static SPA) from backend (Python API) allows deploying each to the best-fit platform: Cloudflare Pages for static assets, Fly.io/Railway for persistent SSE connections.

## Considered Options

1. **FastAPI (Python) + Vite + React 19 (SPA)** — Python backend for agent/LLM logic, Vite-bundled React SPA for the canvas, connected via AG-UI SSE. Two separate deployments.

2. **Keep Next.js, build from scratch without template** — Use App Router's API routes for the agent, RSC for the canvas. Single deployment on Vercel.

3. **Vite + Hono (TypeScript full-stack)** — Lightweight TypeScript server with Vite frontend. Single language, but agent logic in TypeScript.

4. **TanStack Start or React Router v7** — Newer React meta-frameworks with SSR. Smaller communities, less proven at production scale.

## Decision Outcome
Chosen option: **FastAPI (Python) + Vite + React 19**, because:

- The agent — the core differentiator of this portfolio — lives in Python where Firaaz has deep expertise and the AI/ML ecosystem is richest. Domain models use Pydantic, LLM calls use native Python libraries, evals run in pytest.
- The frontend is a pure SPA with no SSR needs. Vite provides fast builds, HMR, and zero framework opinions. React 19 renders the canvas from Zustand state fed by AG-UI events.
- Hexagonal architecture on the backend (ports for LLM, content, signals, observability) means adapters are swappable without touching domain logic.
- The two-deployment model (static SPA + Python API) matches modern cloud pricing: static hosting is free everywhere, and the API only needs to handle SSE streams.
- OpenAPI types flow from FastAPI's Pydantic models to TypeScript via codegen (`openapi-typescript` or similar), eliminating duplicate type maintenance.

### Specific technology choices

| Layer | Technology | Replaces (ADR-0001) |
|-------|-----------|---------------------|
| Backend | FastAPI (Python) | Next.js API routes |
| Frontend bundler | Vite | Next.js (webpack/turbopack) |
| Frontend framework | React 19 (SPA) | Next.js App Router (RSC) |
| State | Zustand | Zustand (unchanged) |
| Styling | Tailwind 4 + shadcn/ui | Tailwind + shadcn/ui (unchanged) |
| Animation | motion | Framer Motion |
| Protocol | AG-UI (SSE) | N/A (new) |
| Deploy (frontend) | Cloudflare Pages | Vercel |
| Deploy (backend) | Fly.io or Railway | Vercel (unified) |
| First-load classification | FastAPI middleware | Vercel Edge Functions |
| LLM (build-time variants) | Removed — LLM generates manifests at request time behind LLMPort | Claude Haiku at build time |
| Client-side ML | Deferred to future slice | TensorFlow.js |

### What stays the same
- Three-layer adaptation architecture (ADR-0002) — concept unchanged, Layer 3 implementation moves from Vercel Edge to FastAPI middleware
- Agent interaction protocol (ADR-0003) — five verbs, AG-UI Custom events
- Editorial canvas & motion (ADR-0004) — importance-driven layout, opacity-only transitions

## Consequences
- Good: Agent logic in Python aligns with developer expertise and AI ecosystem; no framework overhead for a use case that doesn't need SSR; clean separation of concerns (SPA + API); each piece deployable to best-fit platform; OpenAPI codegen eliminates cross-language type drift
- Bad: Two deployments to manage instead of one; CORS configuration needed between SPA and API; AG-UI's primary SDK is TypeScript so Python integration requires raw SSE with AG-UI-shaped JSON (verify early); lose Vercel's zero-config deployment convenience; SEO requires a static HTML shell with meta tags since there's no SSR
