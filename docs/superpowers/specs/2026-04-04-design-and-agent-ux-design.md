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

- **Canvas:** #F3F4F6 — cool-warm neutral with faint blue cast from Ink.
- **Ink:** #1C2430 — iron-gall ink blue-black. The historical color of European manuscript ink. The AI writes content; the color IS writing. High contrast against canvas.
- **All grays derived from Ink at opacity stops:** 100% (headlines), 65% (body text), 50% (tags, icons default), 45% (labels/metadata), 40% (counter/kbd hints), 20% (ghost UI/hints), 6% (surface tints/tag backgrounds).
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
- **Visual layer** — replace current Geist/OKLCH/rounded styling with Zilla Slab+Inter/iron-gall-ink/sharp-edge editorial design.
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

## Spacing System

- **Base unit:** 8px
- **Scale:** 4 / 8 / 16 / 24 / 32 / 48 / 64px
- **Viewport grid:** `100vh × 100vw`, 32px outer margin (16px mobile), 12-column CSS grid, 2px gap
- **Zone internal padding:** 24px (16px mobile)
- **Content gaps within zones:** 16px between elements
- **Row distribution:** `grid-template-rows: 1.4fr 1fr auto` — top row (identity+featured) gets more vertical weight
- **Depth layer padding:** 64px all sides (48px tablet, 24px mobile)
- **Architectural spacing (inside depth layers only):** 64 / 80 / 128px between major sections
- **Short viewport (<800px):** padding reduces from 32px to 16px

Default zone allocation (before agent adjustment):

| Zone | Grid columns | Row |
|------|-------------|-----|
| Identity | 1–4 | 1 |
| Featured work | 5–12 | 1 |
| Experience | 1–4 | 2 |
| Other work | 5–8 | 2 |
| Skills | 9–12 | 2 |
| Contact | 1–4 | 3 |
| Education | 5–8 | 3 |
| ⌘K hint | 9–12 | 3 |

## Breathing Animation

See ADR-0007 for the motion language that enables these transitions.

- **Dwell threshold:** 2000ms (2 seconds)
- **Expand:** 600ms, `cubic-bezier(0.4, 0, 0.2, 1)` on grid-template-rows/columns/gap. Content inside fades in 450ms with 150ms delay.
- **Contract on leave:** 300ms linger (zone holds expanded size), then 600ms contract with same easing. Content clipped by `overflow: hidden` (per ADR-0007).
- **Short hover (<2s):** Subtle opacity/tonal lift on the zone — acknowledges attention without committing to breathing. No grid resize.
- **Skip-contract debounce:** <1000ms hover = nothing. 1000–2000ms = contract 400ms. >2000ms (breathing triggered) = 300ms hold then 600ms contract.
- **Deprioritized zones:** 45% opacity default, hover → 100% (300ms ease-out), leave → 45% (500ms ease-out).
- **`prefers-reduced-motion`:** Grid/gap transitions snap instantly. Opacity transitions remain. Overflow clipping still works.

Two-layer focus model:
1. **Agent-driven importance** — sets default surface layout (zone sizes at rest) based on visitor signals.
2. **Visitor-driven breathing** — triggered by dwell, any zone can expand regardless of importance score. Visitor intent always overrides agent arrangement.

## Zone Content Map (Design Language)

Per-molecule rendering at Surface vs. Breathing state:

| Molecule | Surface (compact) | Breathing (dwell 2s+) |
|----------|-------------------|----------------------|
| **hero** | Name (Zilla 700 32px), title + subtitle (Inter 12px upper), summary (Inter 13px, Ink 65%) | No change — hero stability per ADR-0004 |
| **project** | Title (Zilla 300i 20px), one-line description (Inter 12px, Ink 65%), 2–3 tech tags | +full description, additional tags, "View details" link |
| **experience** | Company (Inter 700 10px upper), role (Zilla 400 16px), duration (Inter 10px, Ink 45%) | +description text appears below role |
| **contact** | Email (Inter, underlined) + CTA button (Ink fill) | No change — already complete |
| **skill** | Name as tag (Inter 8px upper, Ink 50%, Ink 6% bg) | No expansion — skills are atomic |
| **education** | Degree + institution (Inter 12px, Ink 45%) | No change — compact by nature |

Grid allocation is importance-driven, not hardcoded per zone. The agent assigns scores; the grid sorts items into rows by importance bands.

## Component Styles

All monochromatic (Iron-Gall Ink palette), 0px border radius, no borders.

**Buttons:**
- Primary (CTA): Ink bg, Canvas text, Inter 9px uppercase tracking +0.15em, 12×28px padding. Hover: opacity 0.85.
- Secondary: Underline text link, Inter 10px uppercase. Ink 50% → 100% on hover, bottom border Ink 12% → Ink 100%.
- Ghost: Ink 4% bg, Ink 50% text. Hover: Ink 8% bg, Ink 100% text.

**Tags/chips:** Ink 6% bg, Ink 50% text, Inter 8px uppercase, 3×10px padding.

**Icons (LinkedIn, GitHub):** Monochromatic SVGs at Ink 35% default, Ink 100% on hover. 16px size, 28px hit area.

**Input fields:** Bottom-border only (Ink 12%, 1px). Focus: Ink 50%, 2px. No radius.

**Contact zone:** Recessed surface (Ink 5% bg). Inline layout: CTA button + email underlined + icon links. Stacked layout as fallback for constrained zones.

**⌘K command bar:**
- Overlay: Canvas at 35% opacity on top of surface blurred at 2px (`filter: blur(2px)`).
- Modal: Canvas bg, box-shadow 4px+80px spread. No border.
- Input: Zilla Slab italic 300, 24px. Placeholder at Ink 20%.
- Suggestions: Inter 15px, Ink 50%. Hover/active: Ink 3% bg, text → Ink 65%.
- Footer: Ink 3% bg. Keyboard hints in Inter 10px, Ink 20%. Kbd badges: Ink 6% bg, Ink 40% text.

## Depth Layer Layout

Entry: fade-in (opacity 0→1) over frozen surface. Surface stays visible but receives no pointer events.

**Structure:**
- Opaque Canvas background covering frozen surface
- 64px padding (48px tablet, 24px mobile)
- Content paginated into viewport-sized pages

**Pagination:**
- Keyboard arrows (←/→) + invisible 80px edge hit areas (arrows appear on hover at Ink 40%)
- Linear counter bottom-center: "1 / 4" in Inter 10px, Ink 40%
- 2px progress bar at very bottom: Ink 6% track, Ink 20% fill
- Close: ✕ top-right in Inter 14px, Ink 50%. Escape key also closes.
- Keyboard hints bottom-right: kbd badges + labels at Ink 20%

**Content layouts by type:**
- Case study: Page 1 (title 48px + overview + metrics row) → Page 2 (architecture + tech tags) → Page 3 (technical decisions) → Page 4 (results + outcome metrics)
- Experience: Page 1 (full timeline, all roles expanded)
- Education: Single page (degree details)

**`prefers-reduced-motion`:** Depth layer appears instantly (no fade). Pagination transitions snap.

## Design Prototype

Surface state prototype: `docs/design/prototypes/feat-002-surface-state.html`
Standalone mockups (⌘K, depth layer, component styles): `.superpowers/brainstorm/` session directory

## Open Questions

1. **Mobile breathing** — How does dwell-expand work on touch? Long-press? Scroll-stop detection? Direction: scroll-stop detection. Needs testing on real devices.
2. **Content generation scope** — How much text does the AI generate vs. select from variants? Token cost vs. quality trade-off. Needs EDD evals.
3. **The "holy shit" moment** — Deferred to implementation. Build without explicit reveal mechanism first. If behavioral intelligence isn't theatrical enough, add ⌘K "show default view" command later.

## Resolved Questions

- **Agent signal mechanism:** Size + detail density. No color, no symbols. (Resolved: color felt default and out of place.)
- **Headline font:** Zilla Slab. Slab serif = engineering authority. (Resolved: Playfair too decorative, DM Serif too literary, Sora too neutral.)
- **Palette:** Iron-Gall Ink (#1C2430 → #F3F4F6). Colored monochromatic replacing warm black. (Resolved: the AI writes content — the color IS writing. Blue-black manuscript ink. Evaluated navy, indigo, umber, graphite, warm black. Iron-gall scored highest on competence + intelligence + productive disfluency.)
- **Opacity scale:** Revised for light background readability. Headlines 100%, body 65%, tags 50%, labels 45%, chrome 40-50%, hints 20%. (Resolved: original 50%/35%/12% stops were calibrated for dark mode reference.)
- **Breathing animation:** 2s dwell threshold, 600ms expand/contract, cubic-bezier(0.4,0,0.2,1), 300ms linger on leave. (Resolved: prototyped 400/600/800ms, 600ms felt calm and editorial.)
- **Breathing motion language:** ADR-0007. Grid-template + gap transitions for container, opacity-only for content (ADR-0004). Content clipping via overflow:hidden on contraction. (Resolved: extends ADR-0004, doesn't supersede.)
- **Pagination UX:** Keyboard arrows + invisible edge-click hit areas + linear counter "1/4" + 2px progress bar. No dots. (Resolved: dots too playful for editorial. Progress bar adds spatial awareness.)
- **⌘K overlay:** Surface blurred at 2px with 35% Canvas overlay. Surface visible but defocused. (Resolved: iterated from 88%/no-blur → 55%/blur(8px) → 35%/blur(2px). Light blur preserves spatial context.)
- **Spacing system:** 8px base, scale 4/8/16/24/32/48/64. 12-column grid, 3 rows. (Resolved: Fibonacci was elegant but non-standard; 8px aligns with Tailwind defaults.)
- **Component styles:** Three button levels (primary/secondary/ghost), bottom-border inputs, monochromatic SVG icons at Ink 35%. (Resolved: inline contact layout preferred, stacked as fallback.)
- **Agent-generated content styling:** No visual distinction from static content. Same fonts, same colors. The intelligence is in WHAT appears, not how it's styled. (Resolved: separate styling draws attention to the system, not the content.)
- **Dark vs. light mode:** Light. Warmth + competence drives admiration/FOMO. Dark mode is "startup trying to look cool." (Resolved early in design exploration.)
