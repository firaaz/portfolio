@AGENTS.md

# AI-Adaptive Portfolio Website

Personal portfolio that silently adapts layout/content based on visitor persona (recruiter, technical lead, developer). No chatbot — the AI is the stage manager, not the performer.

## Tech Stack
Next.js 14+ (App Router), shadcn/ui + Tailwind CSS, Zustand, Framer Motion, TensorFlow.js, Claude Haiku API (build-time only), Vercel Edge Functions, PostHog. Fork of dillionverma/portfolio template.

## Architecture (Three Layers)
1. **Pre-computed variants (build time):** Claude Haiku generates persona-specific layout configs as static JSON (~$0.01/build). No runtime LLM calls.
2. **Client-side classification (runtime):** TensorFlow.js (<200KB, WASM) processes ~15 behavioral signals every 3-5s. Adapts only at confidence >0.7. Target: <25ms total adaptation latency.
3. **Edge middleware (first load):** Vercel Edge reads referrer/UTM. LinkedIn → recruiter layout before any behavioral data.

## Visitor Personas
| Persona | Signals | Adapted View |
|---------|---------|-------------|
| Recruiter | LinkedIn referrer, fast scroll, <30s dwell | Role + 3 achievements + contact CTA above fold |
| Technical Lead | High dwell on projects, clicks arch links | Case study: problem framing, constraints, decisions |
| Developer | GitHub/HN referrer, code/tech content first | Repos, stack details, system design, blog posts |

## Phased Build Plan
- **Phase 1 (6h):** Fork template → customize content → Edge Middleware referrer classification → /how-it-works page → ship v1.0
- **Phase 2 (+6h):** Client-side signal collection hooks → rule-based classifier → Framer Motion transitions → PostHog analytics → ship v2.0
- **Phase 3 (+6h):** TensorFlow.js model → extract middleware as npm package → blog post (2K words) → ship v3.0

## Hard Constraints
- **Zero Emaratech references** in any public content — Salama descriptions must focus on architecture, not employer
- **GDPR:** session-based behavioral analysis only, no persistent tracking cookies without consent
- **Accessibility:** WCAG 2.1 AA minimum, `prefers-reduced-motion` → opacity transitions instead of positional shifts
- **Anti-creepy:** group personalization only, visible view-switcher, 300-500ms ease-in-out transitions, default view must be excellent standalone

## Session Constraints
Each session must produce a shippable increment. The plan is a menu, not a schedule.

## Commands
- `npm run dev` — dev server
- `npm run test` — test suite
- `npm run lint` — linter
- `npm run typecheck` — TypeScript strict check

## Development Methodology
**Spike → Spec → Ship.** One vertical slice per session. If it touches >5 files, decompose.

### Session Protocol
- Start: `/catchup` — read STATUS.md, recent commits, story map
- End: `/handoff` — update STATUS.md, commit
- At ~60% context: `/compact` with focus directive

### Slash Commands
- `/plan <feature>` — create spec (no code)
- `/implement <spec-dir>` — build one slice from spec
- `/review [spec-dir]` — review against spec + ADRs
- `/adr <title>` — record architecture decision
- `/catchup` — orient at session start
- `/handoff` — save state at session end

### Self-Improvement Loop
- After corrections: append to `tasks/lessons.md` (date | category | mistake | fix)
- After 2+ occurrences: promote to AGENTS.md or `.claude/rules/`
- After proving stable: encode as CI check

## Project Structure
```
specs/           — story map + feature specs (NNN-name/spec.md)
docs/adrs/       — architecture decision records (immutable)
docs/spikes/     — exploration learnings
tasks/           — lessons.md + todo.md
STATUS.md        — session continuity (what's done, single next step)
AGENTS.md        — shared AI instructions (all tools)
```

## Key References
- Full project spec: `docs/pre-start-docs/AI-Adaptive-Portfolio-Website-Handoff.docx`
- Development methodology: `docs/pre-start-docs/Spec-Driven-Development-Playbook-v2.md`
- Architecture decisions: `docs/adrs/`
- System vision: `docs/architecture.md`
