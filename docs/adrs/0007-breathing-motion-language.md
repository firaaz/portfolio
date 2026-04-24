# Breathing Motion Language

## Status
partially superseded by [ADR-0008](0008-motion-flip-under-layout-change.md) — item-level transform ban lifted for bento FLIP; container-level rules stand

## Date
2026-04-04

## Participants
Firaaz Farook, Claude (AI pair)

## Context and Problem Statement
ADR-0004 established an opacity-only motion language for the editorial canvas — no springs, no scale, no sliding, no positional transforms. This was the right call for content elements within zones.

However, FEAT-002 introduces "breathing" — zones that expand and contract in response to visitor dwell behavior. Breathing requires the CSS grid container itself to animate its template tracks. This is a layout-level transition that ADR-0004 didn't anticipate, and it conflicts with the literal "no positional transforms" rule.

The question: how do we evolve the motion language to support breathing without abandoning the calm, editorial tone that ADR-0004 was designed to protect?

## Decision Drivers
- Breathing is core to the single-viewport interaction model — zones must physically resize
- ADR-0004's spirit matters more than its letter: calm confidence, content-focused, not app-like
- Grid-template transitions are fundamentally different from element transforms — they're layout reflow, not animation
- `prefers-reduced-motion` must still be fully respected
- Content clipping during contraction should feel physical (window closing), not digital (fade-out)

## Considered Options

### Scope of allowed layout transitions
1. **Grid-template only** — `grid-template-rows` and `grid-template-columns` transitions, nothing else
2. **Grid-template + gap** — also allow `gap` transitions for richer micro-detail as zones breathe
3. **Grid-template + content clip** — grid transitions plus `max-height` transitions on zone content for smooth reveal/hide
4. **Full layout transitions** — allow any layout property to transition (padding, gap, max-height, grid-template)

### Content behavior during contraction
1. **Opacity fade-out** — content fades to 0 as zone shrinks (consistent with ADR-0004)
2. **Content clipping** — zone has `overflow: hidden`, content gets cropped at shrinking boundary (physical/spatial feel)
3. **Instant hide** — content disappears when contraction starts (simplest but abrupt)

## Decision Outcome

### Layout transitions: Grid-template + gap

Three CSS properties are allowed to transition on the grid container:
- `grid-template-rows`
- `grid-template-columns`
- `gap`

No other layout properties (padding, margin, width, height, max-height, transform) may be animated. This is an exhaustive allowlist, not a starting point.

### Content behavior: Clipping on contraction, opacity on expansion

Two different behaviors depending on direction:

- **Expanding zone (breathing in):** New content fades in via opacity (0 → 1), per ADR-0004. The grid grows, then content appears.
- **Contracting zone (breathing out):** Content is clipped by `overflow: hidden` on the zone. No opacity transition — the zone boundary slides over the content like a window closing. More physical than a fade.

`overflow: hidden` is a static CSS property on all zones — it is always applied, not toggled during transitions. At stable state, the grid is always sized so that each zone's content fits fully. Clipping is only ever visible during the breathing transition, when a contracting zone is temporarily smaller than its content. Once the grid settles, everything fits cleanly — the mechanism is permanent, but the visual effect is transient.

### Reduced motion

When `prefers-reduced-motion: reduce` is active:
- Grid-template and gap transitions are disabled (zones snap to new sizes instantly)
- Opacity transitions on content remain (per ADR-0004 — opacity is inherently non-disorienting)
- Overflow clipping still works (it's not motion, it's layout)

### Relationship to ADR-0004

ADR-0004 is not superseded — it remains the authority for content-level motion (everything inside zones). This ADR extends the motion vocabulary to cover the zone container itself, which ADR-0004 didn't address.

The hierarchy:
- **Zone container (grid):** ADR-0007 — grid-template + gap transitions allowed
- **Zone content (elements inside):** ADR-0004 — opacity-only, no transforms

## Consequences
- Good: breathing mechanics are now possible without violating the motion language's spirit; content clipping gives a physical, editorial feel to contraction; the allowlist is tight (3 properties) so the calm tone is preserved; reduced motion degrades gracefully
- Bad: grid-template transitions can cause layout reflow — needs performance testing with 8 simultaneous zones breathing; content clipping means partially-visible text during contraction (acceptable — it's transient and directional, like turning a page)
