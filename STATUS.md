# Status

## Current State
FEAT-001 complete on `develop`. FEAT-002 design spec complete — all component styles, spacing, breathing animation, depth layer layout, and pagination defined. Palette changed from warm black to Iron-Gall Ink (#1C2430 → #F3F4F6). ADR-0007 written (breathing motion language). HTML prototype built at `docs/design/prototypes/feat-002-surface-state.html`. No implementation started.

## Accomplished This Session
- **ADR-0007** — Evolved motion language for breathing. Grid-template + gap transitions allowed on container; content stays opacity-only (ADR-0004). Content clipping via `overflow: hidden` on contraction. `prefers-reduced-motion` snaps grid instantly.
- **Spacing system** — 8px base, scale 4/8/16/24/32/48/64. 12-column grid, 3 rows (1.4fr 1fr auto). 32px outer margin, 2px gap, 24px zone padding.
- **Breathing animation** — 2s dwell threshold, 600ms expand/contract with cubic-bezier(0.4,0,0.2,1). 300ms linger on leave. Short hover (<2s) gets subtle opacity lift. Two-layer model: agent sets default layout, visitor overrides via dwell.
- **Zone content map** — Molecule-based design language (per-type rendering at Surface vs Breathing). Grid allocation is importance-driven, not hardcoded.
- **Component styles** — Three button levels (primary/secondary/ghost), tags (Ink 6% bg), bottom-border inputs, monochromatic LinkedIn/GitHub SVGs at Ink 35%. ⌘K bar: surface blur(2px), overlay 35%, Zilla Slab italic input.
- **Depth layer** — Fade-in entry over frozen surface. Keyboard arrows + edge-click pagination. Linear counter + 2px progress bar. 64px padding.
- **Palette change** — Iron-Gall Ink (#1C2430) replaces warm black (#141210). Canvas #F3F4F6. Chosen via color psychology analysis: competence + intelligence + productive disfluency. Evaluated navy, indigo, umber, graphite, warm black.
- **Opacity scale revised** — Headlines 100%, body 65%, tags 50%, labels 45%, chrome 50%, counter 40%, hints 20%. Original stops were too light for light background.
- **HTML prototype** — Single-file surface state with all locked decisions. Hover on Featured Work zone suggests breathing.

## Key Decisions
- Iron-Gall Ink over warm black — the AI writes content; the color IS writing. Blue-black manuscript ink. Cool ink on warm paper mirrors the precision + warmth tension.
- ADR-0007 extends ADR-0004 (not supersedes) — container can animate spatially, content stays opacity-only.
- 600ms breathing duration — "calm" editorial pace over snappy (400ms) or deliberate (800ms).
- Content clip on contraction, opacity fade on expansion — asymmetry is psychologically sound (expansion = discovery, contraction = physical boundary).
- ⌘K overlay: blur(2px) + 35% opacity — light enough to see surface, focused enough on modal.
- "Holy shit" reveal deferred — build without it, evaluate behavioral intelligence first.

## Blockers
None.

## Next Step
Story map — break FEAT-002 into vertical slices for implementation (spec → plan → ship cycle). The visual design is fully specified; now decompose into shippable increments.

## Remaining Decisions
1. **Mobile breathing** — scroll-stop detection vs long-press. Needs real device testing.
2. **Content generation scope** — generative vs variant selection. Needs EDD evals.
3. **"Holy shit" reveal** — deferred to post-implementation evaluation.

## Story Map
No story map yet — FEAT-002 needs slicing after this session.
