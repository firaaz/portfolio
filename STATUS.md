# Status

## Current State
FEAT-001 Slices 0A–4 complete on `develop`. Canvas renders three editorial zones with animated opacity transitions (500ms ease-out) via AnimatedMolecule wrapper. Agent presence dot pulses at bottom-right viewport edge (0.3→0.7 opacity, 3s loop), paused when `prefers-reduced-motion` is active. HeroMolecule has AnimatePresence crossfade ready for future content swaps. All tests pass: 33 backend + 34 frontend vitest + 6 Playwright e2e (2 smoke + 4 visual).

## Accomplished This Session
- Created `useReducedMotion` hook reading `prefers-reduced-motion` media query with live updates.
- Created `AnimatedMolecule` component: importance→opacity mapping (1.0/0.55/0.25) with 500ms ease-out CSS transitions.
- Created `PresenceDot` component: fixed-position agent indicator with CSS keyframe pulse, respects reduced motion.
- Wired both into `Canvas.tsx`, replacing inline opacity divs with `AnimatedMolecule` wrapper.
- Added `motion` v12 dependency; wrapped `HeroMolecule` in `AnimatePresence` for 500ms crossfade on content swap.
- Added 10 new tests across 3 test files. All 67 tests pass (33 backend + 34 frontend).
- Implemented on `feat/001-motion`, merged to `develop` via fast-forward.

## Key Decisions
- No new ADRs. All motion follows ADR-0004: opacity-only transitions, no transforms, no springs.
- CSS transitions for AnimatedMolecule (framework-portable, testable). `motion` library only for AnimatePresence on HeroMolecule.
- PresenceDot uses `useReducedMotion` hook to pause the repetitive pulse animation; AnimatedMolecule does NOT disable transitions for reduced motion (opacity fades are accessibility-safe per ADR-0004).
- Playwright visual baselines not updated yet — the PresenceDot is small enough (8px) to stay within the 1% pixel tolerance.

## Blockers
None.

## Next Step
**Slice 5 — LLM Agent** from `specs/001-home-experience/plan.md`. Create `feat/001-llm-agent` from `develop`. This is the first slice that touches both backend and frontend. Start with EDD evals (manifest relevancy, schema validation, consistency, content grounding) before writing the agent. Then TDD: VisitorContext model, agent service with LLMPort, fallback to default manifest on error. Finally, update stream route to emit StateSnapshot (default) immediately, then StateDelta (LLM-refined). Choose cheapest LLM provider that passes evals.
