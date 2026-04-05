# Status

## Current State
FEAT-001 complete. FEAT-002 Scopes 1-3 (UX Protocol + Surface + Breathing) complete on `develop`. The editorial surface is live with Iron-Gall Ink palette, 12-column CSS grid, 8 named zones, breathing mechanics, mobile responsive collapse. 87 frontend tests passing, typecheck clean, 0 lint errors. FEAT-002 Agent Content Intelligence spec and implementation plan are written and committed.

## Accomplished This Session
- **Spec written:** `specs/002-agent-intelligence/spec.md` — Shape Up pitch for progressive personalization pipeline (Select → Adapt → Compose)
- **Architecture designed:** Strategy-driven evaluation pattern with pluggable strategies, single `LLMPort.evaluate()`, unified `IntelligenceResult` type
- **Framework decided:** PydanticAI (native AG-UI, structured outputs, Pydantic-native) over LangGraph (third-party adapter, async streaming issues)
- **Reliability architecture:** Four-level anti-hallucination defense (prompt constraints → structured outputs → post-generation validation → EDD evals)
- **Implementation plan written:** `specs/002-agent-intelligence/plan.md` — 7 slices (spike → domain models → session/signals → select strategy → adapt strategy → compose strategy → five-verb events → frontend rendering), test-first, complete code blocks
- **Research:** PydanticAI AG-UI integration docs, LangGraph streaming issues, Context7 docs for both frameworks

## Key Decisions
- PydanticAI over LangGraph for agent framework (native AG-UI, no async streaming bugs, lighter)
- Strategy pattern over per-tier agents (scalable, pluggable)
- Merged Tier 2+3 into single Adapt call (2 LLM calls max per session)
- Models as configuration, not code (evaluated during building via EDD)
- Emphasis directives (Tier 1-2) before generation (Tier 3) — most visitors see only reliable content selection
- No new ADRs created (five-verb protocol implementation follows existing ADR-0003)

## Blockers
- iOS Safari dark mode rendering (low priority, not blocking intelligence work)
- E2E visual baselines not yet generated (not blocking)

## Next Step
Start implementation with **Slice 0: Spike** — validate PydanticAI structured outputs before committing to the full build. Branch `feat/002-spike-pydantic-ai`. Run `specs/002-agent-intelligence/plan.md` Task 0: add `pydantic-ai` dependency, run the spike script testing schema compliance, latency, and grounding accuracy. Go/no-go decision. If spike passes, proceed to Task 1 (domain models). Reference the plan for exact code and commands.
