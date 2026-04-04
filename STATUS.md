# Status

## Current State
FEAT-001 complete. FEAT-002 Scope 1 (UX Protocol Layer) complete on `develop`. The four-dimensional UX protocol (salience, organization, tempo, agency) flows end-to-end: backend domain models → AG-UI transport adapter → SSE stream → frontend Zustand store → Canvas rendering (walking skeleton: items grouped by `group`, opacity from `salience`). FEAT-002 design spec (Iron-Gall Ink palette, breathing, depth layer) locked. Protocol spec at `.claude/plans/functional-growing-cascade.md`. Implementation plan at `docs/superpowers/plans/2026-04-04-ux-protocol-layer.md`.

## Accomplished This Session
- **UX Protocol designed** — four fundamental cognitive dimensions (salience, organization, tempo, agency) as a standalone protocol orthogonal to AG-UI/A2UI/MCP. Agent speaks experience intent, frontend interprets into pixels.
- **FEAT-002 scoped** — five Shape Up scopes discovered: Protocol Layer, The Surface, Breathing, The Depth, Chrome.
- **Scope 1 implemented** — 9 tasks via subagent-driven development:
  - `UXGlobals`, `UXItem`, `UXState` domain models (`backend/src/app/domain/ux.py`)
  - Content catalog evolved: `default_salience` (aliased from `default_importance`) + `default_group` per item
  - AG-UI transport adapter: `ux_snapshot_event`, `ux_salience_event`, `ux_tempo_event`, `ux_agency_event`
  - LLM prompt redesigned for UX-aware scoring (salience + group + tempo + agency)
  - SSE stream routes emit UX protocol events
  - Frontend `useUXStore` (Zustand) + `ux-parsers` type guards
  - `use-agent-stream` and `use-command-bar` hooks consume UX events
  - Canvas renders items grouped by `group` with `opacity` from `salience`
- **192 tests passing** (118 backend + 74 frontend), all lint clean, typecheck clean
- **Dead code noted** — old `sse.py`, `manifest.py`, `manifest-store.ts`, `sse-parsers.ts` remain for backward compat but are unused by routes/canvas

## Key Decisions
- UX protocol is standalone and transport-agnostic — AG-UI adapter is one integration, not a dependency
- `importance` renamed to `salience` (contextual relevance, not absolute importance)
- Decision events (transparency) dropped from routes — transparency panel will be reworked in Chrome scope
- `_salience_changes` computes actual diff (only sends items where salience changed)
- Catalog YAML keeps `default_importance` key (alias) for migration compatibility

## Blockers
None.

## Next Step
Scope 2: **The Surface** — build the Iron-Gall Ink design language interpreter. This is the frontend code that maps the four UX dimensions to the editorial canvas: palette (`--ink-*` custom properties), typography (Zilla Slab + Inter), 8px spacing, 12-column grid, 3-row layout, surface hierarchy (inset/featured/recessed/base), zone content rendering via molecules. The HTML prototype at `docs/design/prototypes/feat-002-surface-state.html` is the reference. Start with a spec/plan session — the Surface is large enough to need its own slice decomposition.

## Remaining Decisions
1. Mobile breathing — scroll-stop vs long-press (needs device testing)
2. Content generation scope — generative vs variant selection (needs EDD evals)
3. "Holy shit" reveal — deferred to post-implementation evaluation
4. Dead code cleanup — old manifest infrastructure (chore task)
