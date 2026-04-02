# Status

## Current State
FEAT-001 Slices 0A–3 complete on `develop`. Canvas renders three editorial zones but molecules are visually unstyled (Tailwind 4 preflight resets headings, no utility classes applied). Structural tests all pass (33 backend + 24 frontend vitest + 2 Playwright e2e) but visual output doesn't match the "fat marker sketch" target. A visual regression testing spec has been written and committed to close this gap.

## Accomplished This Session (previous: Slice 3)
- Implemented Slice 3 — Canvas Layout (Editorial Zones) on `feat/001-canvas-layout`, merged to `develop`.
- Refactored Canvas from 2-zone (hero/rest) to 3-zone partitioning (hero/flow/background). Hero excluded by identity, rest split at importance 0.4.
- Added FlowZone — CSS grid with asymmetric 1.6:1 golden ratio columns.
- Added ContactCard (email mailto link + CTA) and SkillLink (minimal text) molecules.
- Registered `contact` and `skill` in MoleculeResolver registry.
- Fixed pre-existing Playwright e2e regression: `hero.locator("p")` strict mode violation from Slice 2's HeroMolecule subtitle/summary additions. Switched to `getByText`.

## Accomplished This Session (current: visual testing design)
- Identified that Slice 3 visual output is broken — molecules render as unstyled browser-default HTML because no Tailwind utility classes were applied.
- Root-caused the gap: all tests (unit + e2e) assert DOM structure only, not visual appearance. Tailwind 4 preflight resets `<h1>` to `font-size: inherit`, so bare semantic HTML looks identical.
- Designed Playwright visual regression testing strategy using built-in `toHaveScreenshot()`.
- Wrote and committed spec: `docs/superpowers/specs/2026-04-02-playwright-visual-tests-design.md`.

## Key Decisions
- No new ADRs. Zone layout follows ADR-0004 editorial canvas design.
- BackgroundZone inlined in Canvas (simple `<section>` wrapper) rather than separate component.
- Zone partitioning excludes hero by `id` rather than hardcoded threshold ranges.
- Visual tests use Playwright built-in `toHaveScreenshot()` — no external services (Percy, Argos). Desktop Chromium only. `maxDiffPixelRatio: 0.01` for subpixel tolerance.
- Baselines committed to git, updated per-slice with `--update-snapshots`.

## Blockers
None.

## Next Steps
1. **Implement visual regression tests** from spec at `docs/superpowers/specs/2026-04-02-playwright-visual-tests-design.md`. Add `frontend/e2e/visual.spec.ts` with full-page + zone-level `toHaveScreenshot()` assertions. Update `playwright.config.ts` with `expect.toHaveScreenshot` settings. Add `test:e2e:update` script to `package.json`. Commit initial baselines (will capture current unstyled state).
2. **Start Slice 4 — Motion + Agent Presence** from `specs/001-home-experience/plan.md`. Create `feat/001-motion` from `develop`. Write failing tests for AnimatedMolecule (opacity wrapper with 500ms ease-out transitions), PresenceDot (agent indicator pulsing at viewport edge with `aria-label`), and use-reduced-motion hook (reads `prefers-reduced-motion`). Then implement and wire into Canvas + HeroMolecule. Frontend-only work.
