# Status

## Current State
FEAT-001 complete. FEAT-002 Scope 1 (UX Protocol Layer) complete. FEAT-002 Scope 2+3 (The Surface) complete on `develop`. The editorial surface is live: Iron-Gall Ink palette, Zilla Slab + Inter typography, 12-column CSS grid with 8 named zones, tonal surface hierarchy (inset/featured/recessed/base), zone breathing on 2s dwell, mobile responsive collapse at <768px. 87 unit tests passing, typecheck clean, 0 lint errors. E2e test files created (layout assertions, visual regression, breathing interactions, capture script) but baselines not yet generated.

## Accomplished This Session
- **Mobile dark mode investigation** — iOS Safari renders the surface in dark mode despite no `.dark` class. Added `color-scheme: light only` via meta tag, inline style, and CSS `:root` rule. Did not resolve the issue — needs deeper investigation (likely Safari automatic dark mode or Tailwind 4 base layer behavior).

## Key Decisions
- No new ADRs created.
- `color-scheme: light only` added defensively (correct CSS practice even if Safari ignores it in this case).

## Blockers
- **iOS Safari dark mode** — surface renders dark on mobile despite light-only palette. Not blocking next step (depth layer), but needs resolution before mobile testing. Low priority per user.

## Next Step
Scope 4: **The Depth** — click-to-expand case studies with paginated viewport-sized pages over a frozen surface. The design spec describes: opaque canvas overlay, 64px padding, page 1 (title+overview+metrics), page 2 (architecture+tags), keyboard/edge navigation, linear counter "1/4", 2px progress bar, close button + escape. This is the third gesture in the user mental model: Look (surface) → Pick up (depth) → Put down (back). Start with a spec/plan session. Reference: `docs/superpowers/specs/2026-04-04-design-and-agent-ux-design.md` (Depth Layer section).

## Remaining Decisions
1. Dwell threshold tuning — 2s feels too long, try 1.2–1.5s (noted in tasks/lessons.md)
2. Mobile breathing — scroll-stop vs long-press (needs device testing)
3. Content generation scope — generative vs variant selection (needs EDD evals)
4. "Holy shit" reveal — deferred to post-implementation evaluation
5. Dead code cleanup — old manifest/sse infrastructure (chore task)
6. E2e visual baselines — need to regenerate with `pnpm test:e2e:update` after confirming surface looks correct
7. iOS Safari dark mode — surface renders dark on phone despite light-only CSS. Needs debugging.
