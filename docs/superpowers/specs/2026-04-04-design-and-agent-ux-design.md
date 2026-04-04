# Design & Agent UX Spec — "Intelligence Without Conversation"

## The Thesis

Every AI interface today defaults to chat. This portfolio proves there's another way: an LLM agent that communicates through **content composition** rather than language acts. The visitor never types a word, never sees a chat box, but leaves feeling the page was made for them.

A portfolio is the hardest case — it doesn't need intelligence. If intelligence improves UX here, it proves the thesis for everything else.

## What the AI Actually Does

The AI doesn't do layout. A human designer handles CSS, grids, typography, and spacing. The AI controls **what content appears in each zone, how it's described, and what details are shown**. Different visitors see different content in the same containers.

### Three capabilities only an LLM provides

1. **Generate** — Write custom descriptions of the same project for different visitor contexts. Same project, different framing. The text didn't exist before this visitor arrived.
2. **Connect** — Synthesize across content pieces. "Your interest in the Salama architecture connects to the compliance-first design pattern in my blog post." No static site can create these bridges.
3. **Converse** — ⌘K enables natural language queries. "Show me your distributed systems experience" → custom composition pulling from projects, experience, and blog posts.

### Progressive intelligence — earns the right to personalize

| Signal level | When | What the AI does |
|---|---|---|
| Low (referrer only) | 0s | **Select** — pick which pre-written content variant to show. LinkedIn → experience-first. GitHub → projects-first. Cheap, reliable. |
| Medium (behavioral) | 5-15s | **Adjust** — shift content within zones based on dwell/skip patterns. Same project, different details emphasized. |
| High (pattern or ⌘K) | 30s+ | **Generate** — create novel text synthesizing across content. Annotations, connections, custom compositions. LLM earns its tokens here. |

### Available signals (GDPR-compliant, session-only)

**Pre-render:** Referrer URL, UTM parameters, device/viewport, time of day.
**Behavioral:** Dwell time per zone, click targets, hover patterns, page depth in expanded zones.
**Explicit:** ⌘K natural language queries.

No cookies, no fingerprinting, no cross-session tracking. Classify into behavioral groups (technical evaluator, career assessor, casual browser), never individuals.

## Visual Design Direction

### Aesthetic: "The Monograph"

Warm editorial — not dark-mode startup, not default white. The feel of a high-quality printed monograph or architecture magazine.

### Palette

- **Canvas:** #F6F5F2 — warm neutral, lighter than original. Warm but clean, no yellow bias.
- **Ink:** #141210 — near-black with warm undertone. High contrast against canvas without harshness of pure #000.
- **All grays derived from Ink at opacity stops:** 50% (body text), 45% (descriptions), 35% (labels/metadata), 12% (hints/ghost UI), 6% (surface tints), 4% (subtle backgrounds).
- **No accent color for agent.** The agent's presence is communicated through size and detail density, not color. No blue, no color markers.
- **Surface stepping (no borders):** Zones differentiated by Ink-tinted backgrounds at different opacities:
  - Canvas: #F6F5F2 (base)
  - Inset: Ink at 3% (~#F0EFEC)
  - Recessed: Ink at 5% (~#EAE9E5)
  - Featured: Ink at 5-6% (slightly darker to draw attention through tonal weight, not color)
  - Receded: Canvas at 45% opacity (agent deprioritized, hover restores to 100%)

### Typography

- **Headlines:** Zilla Slab (slab serif). "Built, not styled." Engineering authority. Bold 700 for name/identity. Regular 400 for section titles. Light italic 300 for project names. Mozilla's DNA — tech credibility without decoration.
- **Body/Labels:** Inter (sans-serif). Precision, technical clarity. Used for descriptions, metadata, navigation, all UI text.
- **One-source rule:** All text colors are Ink (#141210) at different opacities. No ad-hoc color picking. Headlines = 100%. Body = 50%. Labels = 35%. Hints = 12%.
- **Agent-generated content:** Rendered in the same typography system as static content. The agent's intelligence is in WHAT text appears, not how it's styled. No visual distinction between AI-generated and static text — the visitor shouldn't know or care which is which.

### Key rules

- **0px border radius** — sharp edges signal engineering precision. Softness comes from spacing and typography, not corner radius.
- **No border lines for layout** — grouping through tonal surface shifts (Gestalt proximity + similarity). 2px gap between zones is the only separator.
- **Architectural spacing** — 64px, 80px, 128px between major sections within expanded zones. Generous space signals confidence.
- **WCAG 2.1 AA** — all contrast ratios compliant. Ink #141210 on Canvas #F6F5F2 = ratio ~15.5:1 (exceeds AAA). `prefers-reduced-motion` → opacity-only transitions.
- **No accent color** — the design is monochromatic (warm blacks on warm whites). No blue, no brand color. The restraint IS the aesthetic.

### Agent signal model

The agent's presence is communicated through **size + detail density**, not through color or symbols:
- **Promoted content:** Larger zone, richer detail (descriptions, tags, metrics visible). The spatial allocation IS the signal.
- **Default content:** Medium zone, title only.
- **Deprioritized content:** Smaller zone, faded to 45% opacity. Hover restores to 100%.
- **No color markers, no dots, no status bars.** The arrangement is the only signal. The visitor attributes good organization to design quality, not AI — that's the point.

### Why this looks good (psychology)

- **Processing fluency:** Limited palette (monochrome warm), consistent hierarchy, high contrast → brain rewards ease of parsing with pleasure (Reber et al., 2004).
- **Weber-Fechner tonal stepping:** Surface tones at perceptually calibrated just-noticeable differences. Grouping without borders.
- **Dual-voice typography:** Slab serif (structural authority) + Sans (precision) mirrors the "AI Engineer + Systems Architect" identity. Zilla = built. Inter = precise.
- **Sharp edges + generous space:** 0px radius triggers competence/precision (Bar & Neta, 2006), offset by warm palette and spatial generosity.
- **Warmth-Competence Model:** Light editorial palette hits both warmth AND competence → admiration, not just respect (Fiske et al., 2007). This drives FOMO better than dark mode.
- **Productive disfluency:** Light editorial is rare in engineering portfolios → demands deeper processing → increases memorability (Alter et al., 2007).
- **Monochromatic restraint:** No accent color signals "I don't need to grab your attention — the work speaks." Luxury through absence, not addition.

## Interaction Model

### True single viewport

The surface never scrolls. All content zones fit within one screen. The agent's job includes fitting everything into the viewport — this is a design constraint the LLM must satisfy.

### Three states

**Surface** — All zones visible. Agent controls zone sizes within a CSS grid. Big zones = important. Faded zones = deprioritized but accessible. Hover restores any faded zone. The "room you walk into."

**Breathing** — Dwell on a zone (3s+) → it expands, revealing more content. Other zones contract to compensate. Total surface area is constant — zero-sum spatial budget. Skip past a zone → it contracts. Redistribution, never overflow.

**Depth** — Click a zone → it opens as a layer on top of the surface. Long-form content (case studies, blog posts) is paginated into viewport-sized pages within the expanded zone. Back/Escape → surface returns unchanged. The surface persists underneath, frozen.

### User's mental model

Three gestures borrowed from physical space:
- **Look** — scan the room. Big things catch your eye.
- **Pick up** — click a zone. Examine it closely.
- **Put down** — back/escape. Everything where you left it.

No navbar. No tutorial. No onboarding. The constraint forces the agent to curate — without intelligence, one screen of content is mediocre for everyone. With intelligence, one screen is perfectly composed for each visitor.

### Mobile

The grid collapses to a vertical stack. The agent controls order and height. Important items are taller. Compact items are one-liners. Breathing works via scroll position rather than hover. Same principle: emphasis, never access.

### ⌘K Command Bar

Always available. Natural language queries about the portfolio. The second proof of the thesis: the agent CAN converse when needed, but the viewport proves it doesn't have to. Both modes demonstrate intelligence from different angles.

### Agent presence

The agent is felt through the **quality of the experience**, not through symbols (dots, status bars, labels). The visitor thinks "this page gets me" without knowing why.

The transparency panel exists as opt-in depth — accessible via ⌘K or a discoverable trigger. Shows all agent decisions for curious/technical visitors. The portfolio demonstrates. The transparency panel proves. The blog explains.

## Reliability

- **Nothing disappears** — every zone is always on screen. Agent controls size and opacity, never visibility. Worst case: small and faded. Never gone.
- **Hover restores** — any deprioritized zone restores to full opacity on hover. User intent overrides agent judgment.
- **Default is excellent** — without any agent (JS disabled, API down), the surface shows a balanced static layout. Progressive enhancement.
- **⌘K escapes everything** — direct access to any content, bypassing agent arrangement.
- **Confidence gating** — agent only acts above 0.7 confidence. Below threshold, serve the balanced default.

## Content Architecture

### Content types

1. **Identity** — name, title, one-line description. Always top-left, always prominent.
2. **Featured work** — 1-2 projects the agent selects and describes for this visitor.
3. **Other work** — remaining projects, compact but accessible.
4. **Experience** — career timeline. Depth varies by visitor type.
5. **Blog** — latest posts. Agent selects which to promote.
6. **Personal projects** — side projects, open source.
7. **Credentials** — certifications, publications.
8. **Contact** — email, LinkedIn, GitHub. Always accessible.

### Content as data

All content lives as YAML/JSON files loaded by the frontend. The agent selects, reframes, and composes — but the raw content is structured data, not hardcoded.

### Depth within zones

Each zone has multiple "pages" of content (paginated, not scrolled). A case study might have: Overview → Architecture → Technical Decisions → Results. The agent can control which pages appear and in what order per visitor.

## How This Builds on FEAT-001

FEAT-001 already implemented:
- AG-UI event streaming pipeline (SSE)
- LLM agent with referrer detection
- Manifest store with importance scores
- Molecule-based content rendering
- Command bar with natural language input
- Transparency panel with decision logging
- LRU caching
- 89 backend tests + 61 frontend tests + 6 e2e + 11 EDD evals

What changes:
- **Visual layer** — replace current Geist/OKLCH/rounded styling with Playfair+Inter/warm-neutral/sharp-edge editorial design.
- **Layout model** — replace scrolling canvas with true single-viewport CSS grid. Breathing mechanics via grid-template transitions.
- **Content rendering** — molecule system evolves from uniform cards to variable-sized zones with agent-controlled internal content.
- **Agent output** — expand manifest to include content variants (different descriptions per visitor context), not just importance scores.
- **Pagination** — add viewport-sized pagination within expanded zones.

What stays:
- Backend hexagonal architecture
- AG-UI SSE protocol
- Zustand stores
- Command bar
- Transparency panel
- All test infrastructure

## Design References

- Visual direction: `docs/design/architectural-ledger/` (Stitch mockups for aesthetic reference — dark mode versions, to be adapted to light)
- Psychology research: `docs/research/psychology-adaptive-interfaces.md`
- Editorial layout research: `docs/research/editorial-layout-design.md`
- UX philosophy: agent guides and supports, not invisible manipulation. User feels in control.

## Open Questions

1. **Pagination UX for depth** — Page dots? Arrow keys? Swipe? Need to prototype what feels natural for viewport-sized case study pages within expanded zones.
2. **Mobile breathing** — How does dwell-expand work on touch? Long-press? Scroll-stop detection? Needs testing on real devices.
3. **Content generation scope** — How much text does the AI generate vs. select from variants? Token cost vs. quality trade-off. Needs EDD evals to measure whether generated content outperforms pre-written variants.
4. **The "holy shit" moment** — Is the behavioral intelligence (size + detail density shifts) enough to be theatrical, or do we need an explicit reveal mechanism (e.g., ⌘K → "show what others see" comparison)?
5. **Breathing animation specifics** — What are the exact transition durations, easing curves, and thresholds for dwell-expand and skip-contract? Needs prototyping to find the sweet spot between "responsive" and "distracting."

## Resolved Questions

- **Agent signal mechanism:** Size + detail density. No color, no symbols. (Resolved: color felt default and out of place.)
- **Headline font:** Zilla Slab. Slab serif = engineering authority. (Resolved: Playfair too decorative, DM Serif too literary, Sora too neutral.)
- **Contrast level:** Punchy — Canvas #F6F5F2, Ink #141210, labels at 30%, body at 45%. (Resolved: original #F4F3F0/#1E1C1A was too washed out.)
- **Agent-generated content styling:** No visual distinction from static content. Same fonts, same colors. The intelligence is in WHAT appears, not how it's styled. (Resolved: separate styling draws attention to the system, not the content.)
- **Dark vs. light mode:** Light. Warmth + competence drives admiration/FOMO. Dark mode is "startup trying to look cool." (Resolved early in design exploration.)
