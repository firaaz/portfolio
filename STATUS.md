# Status

## Current State
FEAT-001 Slices 0A–1 complete on `develop`. Walking skeleton with content-as-data: backend loads 13 portfolio items from `backend/content/catalog.yaml` via YAML adapter, validates each molecule type (hero, project, experience, contact, skill, education) through Pydantic sub-models, and serves them as AG-UI StateSnapshot via SSE. Frontend unchanged — still connects via EventSource, stores manifest in Zustand, renders Canvas. All gates green: 33 backend tests (22 new) + 9 frontend tests, typecheck, lint. PyYAML added as dependency.

## Accomplished This Session
- Created `backend/src/app/domain/content.py` — 6 typed data models (HeroData, ProjectData, etc.) + ContentItem with model_validator for per-molecule shape enforcement
- Created `backend/src/app/ports/content.py` — ContentPort protocol for catalog loading
- Created `backend/src/app/adapters/content/yaml_loader.py` — reads and validates catalog.yaml
- Created `backend/content/catalog.yaml` — all 13 portfolio items as YAML data
- Updated `stream_route.py` — replaced hardcoded DEFAULT_MANIFEST with catalog load + content_to_manifest conversion
- Added 22 new tests: 14 content model validation, 5 YAML loader, 3 BDD stream-serves-catalog integration
- TDD workflow: RED commit (failing tests) → GREEN commit (implementation) → merged to develop via fast-forward

## Key Decisions
- No new ADRs. Content-as-data was already established in CLAUDE.md and ADR-0005.
- ContentItem uses `dict[str, Any]` for data (matching ManifestItem wire format) but validates against typed sub-models via model_validator — type safety at boundary without changing serialization.
- `default_importance` lives in the YAML catalog — the LLM agent (Slice 5) will override these scores.
- Unknown molecule types are rejected at load time, not silently passed through.

## Blockers
None.

## Next Step
Slice 2 — Molecule Components from `specs/001-home-experience/plan.md`. Create `feat/001-molecules` from `develop`. Write failing tests for MoleculeResolver (molecule key → component), ProjectCard, and ExperienceCard. Then implement HeroMolecule, ProjectCard, ExperienceCard, MoleculeResolver, and update Canvas to use MoleculeResolver with importance→opacity mapping (1.0/0.55/0.25). This is frontend-only work.
