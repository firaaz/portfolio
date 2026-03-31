# Status

## Current State
FEAT-001 (Home Experience) is fully specced with a persistent implementation plan at `specs/001-home-experience/plan.md`. Five ADRs define the architecture. The plan has 9 slices (walking skeleton), test-first methodology (RED→GREEN→REFACTOR), conventional commits, and a branching strategy (main → develop → feat branches). No production code yet — the repo still contains the Next.js template that will be deleted in Slice 0.

## Accomplished This Session
- Reconstructed the FEAT-001 implementation plan after the original was lost (was in ephemeral `.claude/plans/`, never persisted to disk)
- Saved plan to `specs/001-home-experience/plan.md` (committed, not ephemeral)
- Added test-first methodology with RED→GREEN→REFACTOR workflow to every slice
- Added test tooling decision matrix (Slice 0B prerequisite) — candidates for backend (pytest-bdd vs plain, hypothesis, pytest-asyncio) and frontend (vitest, testing-library, happy-dom, msw)
- Defined Makefile harness targets (test, test-evals, test-all, test-e2e, lint, typecheck, check)
- Added branching strategy: GitHub Flow + develop, feat/001-<slice> branches, never commit to main/develop directly
- Added conventional commits spec: types (feat, test, fix, refactor, chore, docs), scopes (backend, frontend, api, domain, canvas, agent, test, dx)
- Updated CLAUDE.md: plan reference, conventional commits, branching conventions
- Updated lessons.md: plans must be persisted to disk (context-only plans are lost on /clear)

## Key Decisions
- Implementation plan persisted to `specs/001-home-experience/plan.md` (not `.claude/plans/`)
- Branching: main (protected) → develop (integration) → feat/001-<slice> (short-lived)
- Conventional Commits format for all commits
- Test tooling is a building-phase decision, resolved during Slice 0B

## Blockers
None.

## Next Step
Create `develop` branch, then start Slice 0A — Delete Template from `specs/001-home-experience/plan.md`.
Setup: `git checkout -b develop`, then `git checkout -b feat/001-scaffold`. Delete all Next.js template code (src/, content/, public/, node_modules/, config files). Keep docs/, specs/, tasks/, CLAUDE.md, STATUS.md.
