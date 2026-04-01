# Status

## Current State
FEAT-001 Slices 0A–0D complete on `develop`. Walking skeleton is wired end-to-end: backend serves AG-UI StateSnapshot events via SSE at `/api/agent/stream` with 13 hardcoded manifest items; frontend connects via EventSource, stores manifest in Zustand, and renders hero section + flow items in Canvas component. All gates green: 20 tests (11 backend + 9 frontend), typecheck, lint. Both `backend/CLAUDE.md` and `frontend/CLAUDE.md` now have comprehensive coding conventions (9–10 sections each) derived from actual code patterns.

## Accomplished This Session
- Expanded `backend/CLAUDE.md` from 4 to 9 sections: added Architecture, Naming, Types & Models, Imports, Style, FastAPI Patterns; expanded Testing
- Expanded `frontend/CLAUDE.md` from 3 to 10 sections: added Architecture, Naming, TypeScript, React Patterns, Zustand, Style, SSE/AG-UI; expanded Testing
- Promoted 3 validated lessons from `tasks/lessons.md` to their respective CLAUDE.md files: Zustand selector pattern, happy-dom EventSource polyfill, hexagonal domain isolation
- All conventions are derived from existing code patterns — nothing aspirational
- No duplication between root CLAUDE.md (methodology) and side-specific files (language idiom)

## Key Decisions
- No new ADRs. This session codified existing patterns, not new architectural decisions.
- Pydantic explicitly documented as the one allowed import in domain layer (it IS the domain modeling tool, not a framework dependency).
- Promotion threshold respected: only items validated in code + across sessions moved to CLAUDE.md.

## Blockers
None.

## Next Step
Slice 1 — Content Catalog (YAML data files) from `specs/001-home-experience/plan.md`. Create `feat/001-content-catalog` from `develop`. Write failing tests for ContentItem Pydantic models + YAML loader + BDD stream-with-content scenario, then implement `catalog.yaml` with all 13 items and wire it into the SSE endpoint. This replaces the hardcoded DEFAULT_MANIFEST with content-as-data.
