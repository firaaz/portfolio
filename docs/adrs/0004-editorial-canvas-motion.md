# Editorial Canvas and Motion Language

## Status
accepted — extended by ADR-0007 (breathing motion language for zone container transitions)

## Date
2026-03-31

## Participants
Firaaz Farook, Claude (AI pair)

## Context and Problem Statement
With the agent protocol defined (ADR-0003), how should the canvas render it visually? The spike explored multiple layout models (focus+context, narrative stack, constellation, card lists) and multiple motion approaches (spring physics, scale transforms, sliding, opacity).

Key question: what visual language makes the agent's actions feel natural and classy rather than busy and app-like?

## Decision Drivers
- Must feel natural and intuitive — zero learning curve
- Must feel premium/editorial, not like a dashboard
- Must respect `prefers-reduced-motion` (WCAG 2.1 AA)
- Typography-driven hierarchy, not card-chrome hierarchy
- Mixed element types (not uniform cards)
- The layout IS the agent's voice — spatial allocation communicates importance

## Considered Options

### Layout Model
1. **Editorial canvas** — hero zone + asymmetric bento flow + background text links
2. **Focus + context** — one card expands, others shrink around it (desktop metaphor)
3. **Narrative stack** — cards stacked like a deck, agent deals next card
4. **Constellation** — spatial node field with gravitational pull

### Motion Language
1. **Opacity-only** — pure fades, no transforms, slow ease curves
2. **Spring physics** — bounce, overshoot, physical feel
3. **Mixed transforms** — scale + opacity + position for rich animation

## Decision Outcome

### Layout: Editorial Canvas

Three semantic zones the agent fills:

- **Hero zone** (~40% top) — spotlight for highest-importance content. Typography-driven (large light-weight headlines), no card chrome. The agent picks what fills this.
- **Flow zone** (middle) — asymmetric bento grid at ~1.6:1 ratio (golden ratio). Mixed element types: cards for projects, bare numbers for metrics, compact rows for secondary content. Agent controls importance → span mapping.
- **Background zone** (bottom) — text links at ~25% opacity. Always accessible, never prominent.

Agent bridges live between zones as italic narrative text — no container, just typography.

### Motion: Opacity-Only with Slow Ease

All transitions are **opacity fades only**. No springs, no scale, no sliding, no positional transforms.

| Concern | Approach | Duration |
|---------|----------|----------|
| Depth changes | Opacity: 1.0 / 0.55 / 0.25 | 500ms ease-out |
| Content reveal (detail, bridges) | Opacity 0→1 | 450ms ease-out |
| Content hide | Opacity 1→0 | 450ms ease-out |
| Font-size, border-color | CSS `transition-all` | 500ms (GPU-accelerated) |
| Agent presence dot | Opacity pulse 0.3→0.7 | 3s ease-in-out loop |
| Hero swap | `AnimatePresence` crossfade | 500ms ease-out |
| `prefers-reduced-motion` | Same opacity transitions, all fine | unchanged |

**Why no springs:** Springs have overshoot and bounce. They feel energetic and app-like. For a portfolio with an agent guide, calm confidence is the right tone. Opacity transitions feel like something appearing "naturally" — like a thought forming, not an element being animated.

**Why no transforms:** Scale and position changes draw attention to the mechanism. Opacity changes draw attention to the content. The agent should be felt through what appears and disappears, not through things moving around.

### Mixed Element Types

Uniform cards feel lifeless. Content type determines rendering:

| Content Type | Rendering |
|-------------|-----------|
| Project | Card with border, title, summary, expandable detail |
| Metric | Bare number (large, light weight) + small label, no card chrome |
| Article/Writing | Card, similar to project but without CTA |
| Link (skills, etc.) | At background depth: plain text. At midground: compact single-line row |
| Contact | Card with CTA link |

### Key Learning: Hero Stability

Swapping which content occupies the hero zone feels like a page change even with crossfades. The hero should stay stable (same content) and adapt its framing — detail level, CTA text, subheading — rather than being replaced by different content. Hero swaps should be rare, not part of normal intent transitions.

## Consequences
- Good: premium editorial feel with zero learning curve; `prefers-reduced-motion` is trivially satisfied (already opacity-only); mixed types prevent "card list" monotony; framework-portable (opacity transitions work in any framework)
- Bad: no positional animation means content reordering in the flow zone is abrupt (items just appear/disappear rather than sliding into new positions); hero stability constraint limits how dramatically the agent can reshape the page; opacity-only may feel too subtle for some users
