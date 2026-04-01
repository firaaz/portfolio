# Status

## Current State
FEAT-001 Slices 0A–1 complete on `develop`, Playwright e2e infra on `feat/001-playwright` (5 commits ahead of develop). Walking skeleton validated end-to-end in a real browser for the first time: backend loads 13 items from YAML catalog, serves via SSE, Vite proxies `/api` to backend, frontend receives StateSnapshot via EventSource, renders Canvas with hero + flow sections. All gates green: 33 backend tests + 9 frontend vitest + 2 Playwright e2e, lint, typecheck.

## Accomplished This Session
- Fixed SSE named-event bug: backend emitted `event: STATE_SNAPSHOT` (named) but frontend used `source.onmessage` (unnamed only). Removed redundant event name.
- Fixed SSE contract mismatch: backend sent `snapshot.items` but frontend expected `snapshot.manifest.items`. Wrapped manifest in `snapshot.manifest`.
- Added Vite `server.proxy` for `/api` → backend at `127.0.0.1:8000` (explicit IPv4 to avoid macOS `::1` resolution).
- Installed `@playwright/test`, created `playwright.config.ts` with dual `webServer` (backend + frontend), Chromium only.
- Created `e2e/smoke.spec.ts` — two tests: loading state + SSE hero render with flow items.
- Added `tsconfig.e2e.json`, `test:e2e` script, Playwright artifacts to `.gitignore`.
- Added lessons learned to `tasks/lessons.md`.

## Key Decisions
- No new ADRs. Playwright was already decided in ADR-0006.
- SSE fix on backend side (remove event name) rather than frontend (switch to addEventListener) — avoids duplicating type discrimination in SSE event name and JSON `type` field.
- Explicit `127.0.0.1` over `localhost` in proxy config — macOS IPv6 resolution issue.

## Blockers
None.

## Next Step
Merge `feat/001-playwright` into `develop` (fast-forward), then start Slice 2 — Molecule Components from `specs/001-home-experience/plan.md`. Create `feat/001-molecules` from `develop`. Write failing tests for MoleculeResolver (molecule key → component), ProjectCard, and ExperienceCard. Then implement HeroMolecule, ProjectCard, ExperienceCard, MoleculeResolver, and update Canvas to use MoleculeResolver with importance→opacity mapping (1.0/0.55/0.25). This is frontend-only work.
