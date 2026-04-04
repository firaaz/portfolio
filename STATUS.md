# Status

## Current State
FEAT-001 complete. FEAT-002 Scope 1 (UX Protocol Layer) complete. FEAT-002 Scope 2+3 (The Surface) complete on `develop`. The editorial surface is live: Iron-Gall Ink palette, Zilla Slab + Inter typography, 12-column CSS grid with 8 named zones, tonal surface hierarchy (inset/featured/recessed/base), zone breathing on 2s dwell, mobile responsive collapse at <768px. 87 unit tests passing, typecheck clean, 0 lint errors. E2e test files created (layout assertions, visual regression, breathing interactions, capture script) but baselines not yet generated.

## Accomplished This Session
- **Implementation plan written** — 14-task plan at `docs/superpowers/plans/2026-04-04-the-surface.md`, executed via subagent-driven development with spec + code quality reviews
- **Slice 1: Hero Row + Tokens + Grid Shell** — Iron-Gall Ink tokens (ink/canvas palette, 10 opacity stops), Zilla Slab + Inter fonts (replaced Geist), surface classes, CSS grid shell, zone-map pure function, ZoneLabel component, Canvas rewritten from vertical stack to 12-column grid, HeroMolecule + ProjectCard restyled to editorial typography, dead code removed (AnimatedMolecule, FlowZone)
- **Slice 2: Flow Row** — ExperienceCard restyled (description moved to breathing-extra), SkillLink renamed to SkillTag (tag chip), MoleculeResolver updated
- **Slice 3: Utility Row** — ContactCard restyled (CTA button), EducationMolecule created, PresenceDot relocated from fixed to command zone, layout assertions + visual capture e2e tests added
- **Slice 4: Breathing** — use-dwell hook (TDD, 6 tests), Canvas wired with dynamic grid-template-rows, data-breathing attribute, zone-dimmed logic, breathing CSS (ADR-0007 compliant), prefers-reduced-motion handled, breathing e2e tests
- **Slice 5: Mobile** — Grid collapses to single column at <768px, breathing disabled on mobile, mobile e2e tests
- **Bug fix** — Removed `class="dark"` from `<html>` (shadcn default was activating dark mode over Iron-Gall Ink light palette)
- **42 files changed** — 1098 additions, 494 deletions across 19 commits on feat/001-surface, merged to develop

## Key Decisions
- No new ADRs created. Breathing implementation follows ADR-0007 (grid-template + gap transitions only). Surface follows ADR-0004 (opacity-only for content elements).
- `100dvh` without `100vh` fallback — dropped the fallback to avoid Biome's noDuplicateProperties lint error. Browser support for dvh is >95%.
- Zone dimming threshold set at 0.35 salience — zones where all items are below this get 45% opacity with hover-to-restore.

## Blockers
None.

## Next Step
Scope 4: **The Depth** — click-to-expand case studies with paginated viewport-sized pages over a frozen surface. The design spec describes: opaque canvas overlay, 64px padding, page 1 (title+overview+metrics), page 2 (architecture+tags), keyboard/edge navigation, linear counter "1/4", 2px progress bar, close button + escape. This is the third gesture in the user mental model: Look (surface) → Pick up (depth) → Put down (back). Start with a spec/plan session. Reference: `docs/superpowers/specs/2026-04-04-design-and-agent-ux-design.md` (Depth Layer section).

## Remaining Decisions
1. Dwell threshold tuning — 2s feels too long, try 1.2–1.5s (noted in tasks/lessons.md)
2. Mobile breathing — scroll-stop vs long-press (needs device testing)
3. Content generation scope — generative vs variant selection (needs EDD evals)
4. "Holy shit" reveal — deferred to post-implementation evaluation
5. Dead code cleanup — old manifest/sse infrastructure (chore task)
6. E2e visual baselines — need to regenerate with `pnpm test:e2e:update` after confirming surface looks correct
