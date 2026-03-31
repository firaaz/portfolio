# Agent Interaction Protocol

## Status
accepted

## Date
2026-03-31

## Participants
Firaaz Farook, Claude (AI pair)

## Context and Problem Statement
ADR-0002 defines three layers for adaptation but not HOW the agent communicates intent to the UI. The original spec described invisible section reordering. A spike (worktree `spike/agentic-ux-poc`) explored what "agentic UX" actually means — not a portfolio with adaptive features, but a design system for agent-driven interfaces. The portfolio is the reference implementation.

Key question: what vocabulary does the agent use to affect the user's experience, and how should that vocabulary be structured?

## Decision Drivers
- Agent must be FELT, not hidden — a named guide, not invisible manipulation
- Must feel natural and human — zero learning curve for visitors
- Protocol must be small enough to reason about, expressive enough for a full canvas
- Must be framework-agnostic — protocol types should have no React dependency
- Must support incremental adaptation, not page-swapping
- Must compose into a reusable design system, not just a portfolio feature

## Considered Options
1. **Agent-protocol-first** — define a small verb vocabulary; primitives respond to intents
2. **Primitive-first** — define components independently with their own APIs; compose freely
3. **Composition-first** — define the canvas layout algorithm; primitives emerge from it

## Decision Outcome
Chosen option: **Agent-protocol-first**, with a five-verb vocabulary.

### The Protocol

The agent speaks five declarative intents. It says WHAT should happen; primitives decide HOW.

| Intent | Signature | Effect |
|--------|-----------|--------|
| **focus** | `focus(id, importance?)` | Content breathes open — expands detail, increases depth |
| **recede** | `recede(id)` | Content compresses to minimal — background depth |
| **bridge** | `bridge(text, from, to)` | Narrative text appears between content — the guide's voice |
| **surface** | `surface(id, reason)` | New content slides in with a visual marker — proactive contribution |
| **signal** | `signal(state)` | Status line updates — ambient presence communicating current understanding |

User escape hatch: `override(view)` — visible view-switcher lets the user manually set a layout.

### Intent States

The agent tracks exploration intents (behavioral state), not personas (identity):

- **exploring** — visitor just arrived, balanced weight
- **evaluating** — visitor comparing, reading multiple sections carefully
- **deep-diving** — visitor focused on one area, wants depth
- **seeking-contact** — visitor ready to act

### Critical: Staggered Dispatch

Intents MUST be dispatched individually with 400-800ms gaps. Simultaneous dispatch feels like page-swapping (adaptive UI). Staggered dispatch feels like an agent thinking (agentic UI). This temporal pacing is the core design innovation — it makes each agent decision individually observable.

"Agent cadence" (the timing between intents) is a first-class design token, not an implementation detail.

### Content Lifecycle

Bridges and surfaced content are **signal-scoped**: they auto-clear when the agent's intent state changes. When the agent transitions from "deep-diving" to "seeking-contact," stale bridges from the deep-dive phase fade out naturally. This ties content lifecycle to the agent's own model of the user — no manual retirement needed.

### Architecture

```
protocol.ts    — pure types, zero framework deps (portable)
agent-store.ts — Zustand, processes intents into layout state
primitives/    — motion/react components responding to state
canvas.tsx     — composition layer arranging primitives
```

Each layer depends only on the one below it. The protocol layer can drive any UI framework.

## Consequences
- Good: five verbs cover all observed agent behaviors; protocol is framework-agnostic; staggered dispatch creates the "guided" feeling; signal-scoped lifecycle prevents content accumulation; small surface area = easy to reason about
- Bad: five verbs may need extension for future use cases (e.g., "compare" for side-by-side); stagger timing needs real-user tuning; signal-scoped clearing may occasionally remove still-relevant bridges if state transitions are too frequent
