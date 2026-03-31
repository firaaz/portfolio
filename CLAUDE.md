# AI-Adaptive Portfolio Website

Portfolio that adapts layout/content by visitor persona (recruiter, tech lead, developer). AI is the stage manager, not the performer.

## Stack
Next.js 14+ (App Router), shadcn/ui, Tailwind, Zustand, Framer Motion, TensorFlow.js, Claude Haiku (build-time), Vercel Edge, PostHog. Fork of dillionverma/portfolio.

## Commands
- `npm run dev` — dev server
- `npm run test` — test suite
- `npm run lint` — linter
- `npm run typecheck` — TypeScript strict check

## Conventions
- TypeScript strict, no `any`. Named exports only.
- Functions ≤50 lines, files ≤250 lines. RSC by default.
- ONE vertical slice per session. ≤5 files or decompose.
- Test first, then implement. Commit on green typecheck. Diffs ≤200 lines.
- Decomposition and implementation are always separate sessions.

## Hard Constraints
- Zero Emaratech references in public content
- GDPR: session-only behavioral analysis, no persistent cookies
- WCAG 2.1 AA, `prefers-reduced-motion` → opacity transitions
- Anti-creepy: group personalization, visible view-switcher, 300-500ms transitions

## Methodology
Spike → Spec → Ship. Each session = shippable increment.
- Start: `/catchup` | End: `/handoff` | At ~60% context: `/compact`
- Review: automated gates → AI `/review` → human check
- Corrections → `tasks/lessons.md` → promote after 2+ → CI check

## References
- @docs/architecture.md — system vision, three-layer architecture, tech stack
- @docs/adrs/ — architecture decisions (immutable)
- `specs/story-map.md` — phased build plan
- `docs/pre-start-docs/AI-Adaptive-Portfolio-Website-Handoff.docx` — full spec
