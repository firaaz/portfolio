# Lessons Learned
Last reviewed: 2026-04-26

## Critical Rules (promoted after 2+ occurrences)
- Shape Up methodology for all planning. Pitches (Problem/Appetite/Solution/Rabbit Holes/No-Gos), not PRDs. One spec at a time, no waterfall phasing. (2 occurrences: sessions 3, 4)
- Zustand v5 selectors that return a record-keyed array fallback MUST use a hoisted frozen sentinel, never `?? []`. `useSyncExternalStore` compares snapshots by `Object.is`; `arr ?? []` mints a fresh `[]` every call → "getSnapshot should be cached" warning → `Maximum update depth exceeded` crash on first render with no entries. Pattern: `const EMPTY: readonly T[] = Object.freeze([]); export function getX(s: State) { return s.byKey.x ?? EMPTY; }`. (2 occurrences: D3 caught it via the empty-state unit test on first run; D4 plan code reproduced the anti-pattern verbatim and we sidestepped it by adding a parallel `getLetterUtterances` selector reusing the existing `EMPTY_UTTERANCES` constant.)

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
- Readiness-polling for the dev backend must probe a non-streaming route (`/openapi.json`) — never `/api/agent/stream`. `curl --max-time 1` against an SSE endpoint returns timeout exit 28 even when the server is fully up; with `-fsS` and an `until` loop the polling can continue indefinitely and emit hundreds of phantom GETs in the access log that look like a frontend reconnect bug. Burned ~2 min during the 2026-04-26 C2 smoke test diagnosing the noise before realizing it was self-inflicted.
- `git diff --stat` doesn't count untracked files. When sanity-checking slice diff size against the 200-line cap, run `wc -l <new_files>` separately. D7.2 shipped at +415/-2 because the new 218-line test file was untracked at the pre-commit stat preview and silently overshot the cap. (Single occurrence; promote to top-level CLAUDE.md if a second slice repeats the miss.)
- Slice lint scope: run `uv run ruff check <touched files>` / `pnpm exec biome check <touched files>`, not project-wide `make lint` / `pnpm lint`. Pre-existing project-wide issues (tracked in STATUS.md blockers — `session.py:49` E501, `Canvas.test.tsx` formatter, `SkillTag` noNonNullAssertion, `index.css !important` ×2, `test_validation.py` / `test_five_verb_events.py` ruff E501) will fail the wide check but aren't slice blockers; scoping to touched files keeps green confidence honest. Promote to backend/frontend CLAUDE.md if it's hit a second time.
- Spec EXAMPLE blocks may be prompt-load-bearing, not illustrative. The Shape Up spec for FEAT-006 (`docs/research/...`/spec body Solution → Persona creation mechanism) included an explicit 4-line EXAMPLE in the ReadStrategy SYSTEM_PROMPT sketch (LinkedIn referrer + Salama dwell + Education skip → 3 typed observations). The D1 implementation dropped it — likely as "rabbit hole avoidance," treating it as illustrative prose. D9a's persona-inference eval revealed the omission was the bug: with the example absent, the LLM emitted `observations: []` even when its top-level rationale was rich. Restoring the EXAMPLE block verbatim fixed the eval (3 observations, trust 0.8). Lesson: when a spec's prompt sketch contains a concrete EXAMPLE, default to including it in the implemented prompt; only drop it with a measured reason (token budget, prompt length, etc.). Specs are pitches, but their few-shot anchors are usually load-bearing. (Single occurrence; promote to top-level CLAUDE.md if a second EDD eval surfaces a missing-example bug.)
- EDD evals are uniquely able to surface prompt-quality bugs that mocked unit tests will never catch. Backend pytest had 264 passing tests against the read prompt at D9a start — every one of them patched `evaluate_persona` with mock returns. Only `evals/test_persona_inference.py` running against a real LLM revealed the empty-`observations` bug. The eval paid for itself on its first run. (Single occurrence; promote when a second eval catches a comparable hole.)
- Playwright MCP requires system Chrome (`/Applications/Google Chrome.app`) and can't be repointed mid-session; the Playwright-cache chromium doesn't satisfy it. Fallback that worked for the 2026-06-10 smoke test: a standalone `node` script importing `chromium` from the frontend's `@playwright/test`, with an `addInitScript` EventSource wrapper to tap raw SSE traffic — strictly more observable than MCP for streaming apps.
- `page.goto(..., {waitUntil: "networkidle"})` never resolves on any page holding an open SSE connection — the stream counts as in-flight network forever. Use `"load"` and explicit waits.
- A passing EDD eval doesn't guarantee live behavior: the D9a persona eval passes with 3 observations, but the 2026-06-10 smoke test got `observations: []` on 5/5 live deltas (same model family) — including via the command route where referral context was present. Until the divergence (provider structured-output mode? max_tokens? prompt parity?) is explained, treat ReadStrategy eval greens as necessary, not sufficient, and spot-check the live wire after prompt changes.

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
