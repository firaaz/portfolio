# Status

## Current State
FEAT-001 Slices 0A–2 complete on `develop`. Walking skeleton now renders real molecule components: HeroMolecule, ProjectCard, ExperienceCard via registry-based MoleculeResolver. Canvas applies importance→opacity mapping (1.0/0.55/0.25). Playwright e2e infra merged. All gates green: 33 backend tests + 17 frontend vitest + 2 Playwright e2e, lint, typecheck.

## Accomplished This Session
- Merged `feat/001-playwright` into `develop` (fast-forward).
- Added MoleculeResolver — registry-based dispatch from `molecule` key to React component, with fallback for unknown types.
- Added HeroMolecule (name, title, subtitle, summary), ProjectCard (title, description, tech tags), ExperienceCard (company, role, duration, description).
- Refactored Canvas from inline duck-typing to MoleculeResolver dispatch with importance→opacity mapping.
- Updated Canvas tests for complete molecule data shapes. Used spread syntax in ExperienceCard tests to avoid Biome ARIA `role` prop collision.

## Key Decisions
- No new ADRs. Molecule components follow ADR-0004 editorial canvas design.
- `role` prop collision with HTML ARIA attribute handled via spread syntax in tests rather than renaming the prop — keeps data shape aligned with YAML catalog.

## Blockers
None.

## Next Step
Start Slice 3 — Canvas Layout (Editorial Zones) from `specs/001-home-experience/plan.md`. Create `feat/001-canvas-layout` from `develop`. Write failing tests for three semantic zones (`data-zone="hero"`, `data-zone="flow"`, `data-zone="background"`) driven by importance thresholds (≥0.85 hero, 0.4–0.84 flow, <0.4 background), FlowZone with asymmetric bento grid, and ContactCard. Then implement zone partitioning in Canvas, FlowZone, BackgroundZone, SkillLink, and ContactCard. Frontend-only work.
