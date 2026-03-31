# Pitch: Home Experience — Editorial Canvas

## Problem

The portfolio is a forked template (dillionverma/portfolio) with someone else's content and a standard section-by-section layout. It doesn't represent Firaaz or the adaptive UI vision. Visitors see a generic developer portfolio — no agent presence, no editorial design, no intelligence.

The architectural direction is resolved (ADRs 0001–0004) but zero production code exists. We need a working home page that establishes the agent-driven canvas as the foundation everything else builds on.

## Appetite

**Small batch — 2 weeks.** This is the first shippable increment. It should cut through the entire stack (Python backend → AG-UI stream → React canvas → molecules) with real content visible. Scope-hammer anything that doesn't serve "visitor sees Firaaz's real content in an importance-driven canvas powered by AG-UI."

## Solution

### The experience

A single-viewport editorial canvas. Firaaz's real content — projects, experience, skills, contact — rendered as molecules whose size, opacity, and position are driven by an `importance` score (0.0–1.0). High-importance items appear large and prominent at the top. Low-importance items fade to text links at the bottom. No hardcoded zones — visual treatment emerges from the importance gradient.

The agent's presence is visible but not imposing: a small dot on the edge of the viewport. The content feels curated, not listed.

### Fat marker sketch: the canvas

```
┌─────────────────────────────────────────────┐
│                                             │
│   Firaaz Farook                             │  ← high importance: large type,
│   Senior Software Engineer ·                │     full opacity, no chrome
│   AI Systems & Agentic Platforms            │
│                                             │
│   6+ years building production AI...        │
│                                             │
├─────────────┬───────────────────────────────┤
│             │                               │
│  Salama AI  │  6+        Deloitte           │  ← mid importance: bento grid,
│  Platform   │  years     4 years, GenAI...  │     mixed molecule types,
│  LangGraph  │            ───────────────    │     moderate opacity
│  25K+ q/mo  │  GenAI Code Migration         │
│             │  Led 4-6 engineers...         │
│             │                               │
├─────────────┴───────────────────────────────┤
│  Let's talk · firaazfarook19@gmail.com      │  ← contact: CTA treatment
├─────────────────────────────────────────────┤
│  python · typescript · langgraph · docker   │  ← low importance: faded text,
│  k8s · AWS ML · IEEE pub · B.E. CS         │     always accessible
│                                       [●]  │  ← agent presence dot
└─────────────────────────────────────────────┘
```

### The agent

A basic LLM agent assembles the manifest. Not a complex chain — a single prompt that takes context (visitor referrer, command bar input, content catalog) and outputs importance scores and optional bridge text. The LLM IS the placement logic, replacing hand-written rules.

Behind an `LLMPort` so the provider is swappable. Start with whichever provider is cheapest for this use case — evaluate during building. The agent should feel present but minimal: it curates, it doesn't converse.

### Breadboard: the data flow

```
FastAPI (Python, hexagonal)
  -- SSE endpoint (/api/agent/stream)
  -- Serves AG-UI events: StateSnapshot with manifest
  -- Manifest = flat list of items (id, importance, data)
  -- Referrer middleware reads HTTP headers
  -- LLM agent: context + content catalog → manifest with importance scores
     (single prompt, one call, streamed response)

     ↓ AG-UI SSE stream ↓

React SPA (Vite)
  -- @ag-ui/client connects to SSE
  -- Zustand store holds current manifest
  -- Canvas component reads store
     --> maps importance to visual weight
     --> duck-types data shape to pick molecule
  -- Opacity transitions on importance changes (ADR-0004)
```

### Breadboard: interaction layers

```
Primary (passive, 90% of experience)
  -- Visitor browses
  -- Agent observes (future: signals)
  -- Canvas reflects manifest from server

Override (⌘K command bar)
  -- Visitor presses ⌘K --> command bar opens
  -- Types request --> sent to FastAPI
  -- Agent adjusts manifest --> canvas updates
  -- Command bar dismisses

Transparency (slide-over)
  -- Presence dot on viewport edge
  -- Click --> slide-over panel
  -- Shows: what the agent adjusted and why
  -- Not a conversation, an audit trail
```

### Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Backend | FastAPI (Python) | Firaaz's primary language, AI/ML ecosystem, Pydantic for domain models |
| Protocol | AG-UI | Industry standard for agent↔frontend. Five verbs (ADR-0003) as Custom events |
| Frontend | Vite + React 19 | No framework overhead. AG-UI streams to client, canvas renders from store |
| State | Zustand | Lightweight, reacts to AG-UI events |
| Styling | Tailwind 4 + shadcn/ui | Utility-first, accessible |
| Motion | motion library | Opacity-only per ADR-0004 |
| Deploy (frontend) | Cloudflare Pages | Free, global CDN |
| Deploy (backend) | Fly.io or Railway | Free tier, persistent SSE |
| LLM | Behind LLMPort — provider TBD | Single prompt → manifest. Evaluate provider during building |

### Key design decisions

- **Manifest, not views.** The agent produces a flat list of items with importance scores. The canvas interprets importance into visual treatment. No named zones, no persona views, no page switching.
- **Duck-typed molecules.** Canvas looks at the data keys to decide which molecule to render. No content type enum to maintain.
- **Atoms + molecules only.** The agent IS the organism layer — it composes molecules via the manifest. Only UI chrome (command bar, slide-over, canvas itself) are fixed organisms.
- **AG-UI Custom events for five verbs.** `focus`, `recede`, `bridge`, `surface`, `signal` ride as AG-UI Custom events. StateSnapshot for initial manifest. StateDelta for updates.
- **Hexagonal Python backend.** Domain core is pure Python with ports. Content, layout, signals, LLM, observability — all ports with swappable adapters.
- **Observability port.** Agent decisions must be traceable — what context the agent saw, what manifest it produced, why. This is a port in the hexagonal architecture, not a specific tool. Evaluate tracing tools (Langfuse, LangSmith, etc.) during building.
- **Agentic framework is a building-phase decision.** The agent starts as "single prompt → manifest" but will grow (multi-step reasoning, session memory). Evaluate whether a framework (LangGraph, PydanticAI) earns its keep during building, or if raw LLM calls suffice for this slice.
- **Inline default manifest for fast first paint.** Build step generates a default manifest and embeds it in the HTML as JSON. React reads it synchronously on mount — content visible in ~100ms, no SSR needed. AG-UI connects in parallel and streams any adaptation (referrer-based, LLM-refined) as smooth opacity transitions. Default visitors never wait for the LLM.

### Testing approach — test first

Tests are written before implementation. The test suite is the specification — if the tests pass, the feature works. Tool choices are made during building.

**EDD (Evaluation-Driven Development):** LLM evals are written before the agent is built. Define what a "good" manifest looks like — relevancy (does context affect the right items?), consistency (similar input → similar output across runs), schema compliance (always a valid manifest), content grounding (bridges reference real items). Build the agent to pass evals. Iterate prompts until evals pass. Evals catch regressions when prompts change.

**Backend (Python):**
- **Unit tests** — domain logic: manifest assembly, importance scoring, LLM output parsing. Write the expected manifest for a given input, then implement the function.
- **Behavior specs (Given/When/Then)** — agent behavior: "Given a visitor from LinkedIn / When the agent assembles a manifest / Then contact importance is elevated." Write the scenario, then make it pass.
- **Property-based tests** — manifest contract invariants: scores in 0.0–1.0, all items present, no duplicates, bridge references point to existing items. Validates LLM output parsing against arbitrary strings.
- **LLM evals (EDD)** — written before the agent. Define eval criteria for manifests, then build/iterate the agent to pass them. Evals are the spec for the agent's behavior.

**Frontend (TypeScript):**
- **Unit tests** — store logic, AG-UI event handling, importance-to-visual-weight mapping
- **Component tests** — molecule rendering: "given this data shape, correct molecule renders with correct content"
- **Visual development** — molecules built in isolation with a clear visual contract

**E2E:**
- **Full stack tests** — browser → AG-UI stream → canvas renders → molecules visible with correct content

## Rabbit Holes

- **AG-UI on Python.** AG-UI's primary SDK is TypeScript. Verify that the Python integration (via LangGraph adapter or raw SSE) works for our Custom event pattern before building the full canvas. If it doesn't, we fall back to raw SSE with AG-UI-shaped JSON — the client still uses `@ag-ui/client`.

- **Duck-typing molecule resolution.** If data shapes overlap (e.g., two content types both have `title` + `description`), the resolver gets ambiguous. Solution: don't solve this generically. If ambiguity arises, add a single disambiguating key rather than building a type system.

- **SSE on free tiers.** Verify that Fly.io/Railway free tier supports persistent SSE connections without aggressive timeouts. If not, fall back to polling with StateSnapshot (less elegant but functional).

- **ADR-0001 supersession.** The stack is changing from Next.js to FastAPI + Vite. This needs a new ADR (0005) before building, or ADR-0001 becomes incorrect. Don't skip this — future sessions will reference it.

- **OpenAPI → TypeScript types.** The manifest schema should flow from FastAPI's Pydantic models to the frontend via generated types. Don't hand-maintain duplicate types — that's a maintenance nightmare. Verify the `openapi-typescript` or similar tooling works with FastAPI's OpenAPI output early.

- **SEO shell before AG-UI hydrates.** The React SPA is client-rendered — there's a moment before AG-UI connects where the page is blank. The static HTML shell needs enough content for SEO (Open Graph tags, name, title, structured data) and a loading state that doesn't flash. Don't over-engineer this — a skeleton with real meta tags is fine.

- **LLM latency on first load.** The LLM call adds latency before the manifest arrives. Options: serve a cached/default manifest immediately via StateSnapshot, then stream an LLM-refined manifest via StateDelta. Don't block the first paint on an LLM call.

- **LLM cost at scale.** If every page load triggers an LLM call, costs could grow. Cache manifests by referrer pattern. The LLM should only fire for novel contexts (command bar input, unusual referrer). Default visitors get a cached manifest.

## No-Gos

- **No behavioral signal collection.** IntersectionObserver, scroll tracking, etc. are Phase 2. This slice is server-to-client only.
- **No staggered dispatch.** The 400-800ms agent cadence (ADR-0003) is a polish slice. First slice: manifest arrives, canvas renders.
- **No blog/secondary pages.** Home page only.
- **No deployment optimization.** Get it running locally and on free tiers. Performance tuning is later.
- **Don't build a DSL.** If the manifest format feels like it's growing its own ecosystem, stop and simplify.

## Referenced ADRs

- ADR-0003: Agent Interaction Protocol — five verbs, intent states, signal-scoped lifecycle
- ADR-0004: Editorial Canvas & Motion — importance-driven layout, opacity-only transitions, hero stability
- ADR-0001: Tech Stack — **will be superseded** by new ADR for FastAPI + Vite stack
