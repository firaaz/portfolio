# Status

## Current State
Spec complete for the first vertical slice (FEAT-001: Home Experience). Stack decision made: FastAPI (Python) + Vite + React 19 + AG-UI, replacing Next.js. Template will be removed — building from scratch. Four ADRs define architecture, one Shape Up pitch defines the first feature. No production code yet.

## Accomplished This Session
- Brainstormed and designed the home experience as the first shippable feature
- Decided to build from scratch, not modify the forked template
- Designed editorial canvas with importance-driven layout (no hardcoded zones, no persona views)
- Designed agent interaction model: passive guidance + ⌘K command bar override + slide-over transparency
- Decided atoms + molecules only — the agent IS the organism layer, composes via manifest
- Evaluated AG-UI — adopting for agent↔canvas event streaming (five verbs as Custom events)
- Evaluated A2UI — rejected (chat-centric, not suitable for editorial canvas)
- Evaluated frameworks: Next.js, Vite+Hono, TanStack Start, React Router v7
- Chose FastAPI (Python) + Vite + React 19 (no meta-framework) — aligns with Firaaz's Python expertise and AI/ML ecosystem
- Chose Cloudflare Pages (frontend) + Fly.io/Railway (backend) for deployment
- Designed inline default manifest for fast first paint without SSR
- Defined testing methodology: TDD (domain) + BDD (behavior) + EDD (Evaluation-Driven Development for LLM evals)
- Added basic LLM agent to scope (single prompt → manifest, provider TBD)
- Wrote Shape Up pitch at specs/001-home-experience/spec.md
- Deleted waterfall-style story map, removed phasing from architecture.md
- Updated CLAUDE.md with new conventions and stack info
- Promoted Shape Up methodology to critical rule in lessons.md

## Key Decisions
- Stack: FastAPI + Vite + React 19 + Zustand + Tailwind 4 + AG-UI (needs ADR-0005 to supersede ADR-0001)
- Deploy: Cloudflare Pages (frontend) + Fly.io or Railway (backend)
- Protocol: AG-UI Custom events for five verbs, StateSnapshot for manifests
- Manifest-not-views: importance score (0.0–1.0) drives visual treatment, no persona view-switching
- Agent as composer: atoms + molecules only, agent composes via manifest, no content organisms
- Spec defines ports, building picks adapters (testing tools, LLM provider, agentic framework all TBD)

## Blockers
None.

## Next Step
Write ADR-0005 (stack change: FastAPI + Vite + React replacing Next.js) then start implementation planning for FEAT-001 with `/plan`. The ADR must be written first — it supersedes ADR-0001 and future sessions will reference it.
