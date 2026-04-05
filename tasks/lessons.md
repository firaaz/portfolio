# Lessons Learned
Last reviewed: 2026-04-04

## Critical Rules (promoted after 2+ occurrences)
- Shape Up methodology for all planning. Pitches (Problem/Appetite/Solution/Rabbit Holes/No-Gos), not PRDs. One spec at a time, no waterfall phasing. (2 occurrences: sessions 3, 4)

## Recent Corrections
- Plans must be persisted to disk. Claude Code's plan mode keeps plans in conversation context only — they are NOT written to `.claude/plans/` or anywhere on disk. A `/clear` or new session destroys them. Always save implementation plans to a committed location (e.g., `specs/<feature>/plan.md`). Lost the entire FEAT-001 9-slice implementation plan (~100k tokens of work) because it only existed in conversation context.
- ADRs are immutable. Never edit an existing ADR. Create a new one and update only the `superseded by` field on the old one.
- Specs are Shape Up pitches. No acceptance criteria, no task breakdowns, no type schemas. The builder discovers tasks.
- Don't dismiss existing protocols/tools prematurely. Evaluate deeply before rejecting — the user may see value you don't.
- Spec defines ports, building picks adapters. Don't specify testing tools, LLM providers, or frameworks in specs.
- EDD = Evaluation-Driven Development (LLM evals first), not Example-Driven Development.
- Use direct tools only. Don't chain fallback alternatives (e.g., `pandoc ... || python3 ...`). If the tool fails, diagnose.
- Don't re-pitch rejected ideas. If user says "I don't like any of these," push for fundamentally different paradigms next time.
- The agentic UX must feel like guidance, not invisible manipulation. The user should FEEL the agent's presence and support.
- Walking skeleton over bottom-up. Cut through entire stack thinly (end-to-end) before adding depth. User rejected plans where first visible result was session 3+.
- Emaratech constraint is about IP leaks, not hiding employer name. Employer name fine in resume context. Don't reveal internal tools/processes.
- Content as data, not code. Portfolio content lives as YAML files, loaded by adapter — not hardcoded in Python or TypeScript.
- `tasks/lessons.md` is the intake funnel. All session learnings land here FIRST. Only promote to CLAUDE.md after 2+ occurrences. `/revise-claude-md` should check lessons.md for promotion candidates, not write directly to CLAUDE.md.
- E2e tests catch contract mismatches that unit tests miss. Both sides had passing tests but the SSE wire format (named vs unnamed events, snapshot shape) was wrong. Add e2e coverage as soon as there's a working walking skeleton.
- Use `127.0.0.1` not `localhost` in dev proxy configs. macOS resolves `localhost` to `::1` (IPv6) first; uvicorn only binds IPv4. The proxy silently fails.
- 2s dwell threshold for breathing feels too long. Tune down — try 1.2–1.5s. The `useDwell` hook accepts a custom threshold as first argument.
- Walking skeleton had `class="dark"` on `<html>` (shadcn default). Iron-Gall Ink is light-only — must remove dark class when switching palettes.
- iOS Firefox dark mode ignores `color-scheme: light only`. The surface renders dark on Firefox for iOS despite meta tag + CSS rule. Safari on iOS works correctly. Firefox on iOS uses WebKit but has its own color-scheme quirks. Low priority — desktop is primary target.

## CLAUDE.md Management
- Lessons.md is fast-moving (low bar, capture immediately). CLAUDE.md is curated (high bar, 2+ occurrences).
- `/revise-claude-md` workflow: review session → write learnings to lessons.md → check for items with 2+ occurrences → promote those to CLAUDE.md → remove promoted items from lessons.md.
- Factual corrections (stack changed, commands changed) can go directly to CLAUDE.md — they're not opinions, they're facts.
- Convention/preference corrections (walking skeleton, hexagonal) go to lessons.md first — they need validation across sessions.
- CLAUDE.md is part of every prompt. Keep entries to one line. Don't duplicate ADR content — reference the ADR.

## Archived
- Zustand selectors as standalone functions — promoted to `frontend/CLAUDE.md` (2026-04-01).
- happy-dom EventSource polyfill — promoted to `frontend/CLAUDE.md` (2026-04-01).
- Hexagonal domain: zero framework imports — promoted to `backend/CLAUDE.md` (2026-04-01).
