# AI-Adaptive Portfolio Website

Portfolio that adapts layout/content by visitor persona (recruiter, tech lead, developer). AI is the stage manager, not the performer.

## Stack
FastAPI (Python) + Vite + React 19 + Zustand + Tailwind 4 + shadcn/ui + motion + AG-UI (event streaming). See ADR-0005.
Deploy: Cloudflare Pages (frontend) + Fly.io/Railway (backend). Building from scratch.
Monorepo: `frontend/` (pnpm) + `backend/` (uv). Hexagonal backend architecture.

## Commands
**After scaffold (Slice 0):**
- `make dev` — run both frontend + backend dev servers
- `make test` — run all tests (frontend vitest + backend pytest)
- `make lint` — lint both (eslint + ruff)
- `cd frontend && pnpm typecheck` — TypeScript strict check
- `cd frontend && pnpm test:e2e` — Playwright e2e tests
- `cd backend && uv run pytest` — Python unit + behavior tests
- `cd backend && uv run pytest evals/` — LLM evaluation suite (slow, hits API)
- pnpm may need PATH: `export PATH="$HOME/.local/share/pnpm:$HOME/.npm-global/bin:/usr/local/bin:$PATH"`

## Conventions
- TypeScript strict, no `any`. Named exports only. Python type hints required.
- Functions ≤50 lines, files ≤250 lines.
- ONE vertical slice per session. ≤5 files or decompose.
- Test first, then implement. Commit on green typecheck. Diffs ≤200 lines.
- Decomposition and implementation are always separate sessions.
- Never add "Co-Authored-By" lines to commits.
- Specs are Shape Up pitches (Problem/Appetite/Solution/Rabbit Holes/No-Gos), not PRDs.
- Spec defines ports, building picks adapters. Don't lock tools/providers in specs.
- Test-first = TDD (domain) + BDD (behavior) + EDD (Evaluation-Driven Development for LLM).
- Manifest, not views. No persona view-switching — importance drives visual treatment.

## Hard Constraints
- No Emaratech IP leaks in public content (employer name OK in resume context, but no internal tools/processes)
- GDPR: session-only behavioral analysis, no persistent cookies
- WCAG 2.1 AA, `prefers-reduced-motion` → opacity transitions
- Anti-creepy: group personalization, agent presence dot + command bar (not invisible), 300-500ms transitions

## Methodology
Spike → Spec → Ship. Each session = shippable increment.
- Start: `/catchup` | End: `/handoff` | At ~60% context: `/compact`
- Review: automated gates → AI `/review` → human check
- Corrections → `tasks/lessons.md` → promote after 2+ → CI check

## References
- @docs/architecture.md — system vision, three-layer architecture, tech stack
- @docs/adrs/ — architecture decisions (immutable)
- `specs/001-home-experience/spec.md` — Shape Up pitch for first vertical slice
- `docs/pre-start-docs/AI-Adaptive-Portfolio-Website-Handoff.docx` — full spec
- `docs/research/` — UX research (psychology, protocols, editorial design, brainstorms)
- Use `pandoc` for docx/pdf conversions — no fallback chains
- `.claude/plans/fizzy-rolling-mango.md` — FEAT-001 implementation plan (9 slices, walking skeleton)
