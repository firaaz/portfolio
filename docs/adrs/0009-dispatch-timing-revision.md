# Dispatch Timing Revision — 400-800ms → 150-350ms

## Status
accepted

## Date
2026-04-24

## Participants
Firaaz Farook, Claude (AI pair)

## Context and Problem Statement
ADR-0003 established staggered dispatch as a first-class design token: intents MUST be dispatched individually with 400–800ms gaps, because simultaneous dispatch feels like page-swapping while staggered dispatch feels like an agent thinking. That framing was correct.

FEAT-002 shipped the end-to-end stream + command integration. Manual E2E review revealed a problem with the specific constant: 400–800ms gaps make the cascade read as a scripted CSS reveal — deliberate, beat-by-beat, almost theatrical. The visitor watches each intent land and waits for the next. The pause between intents is dead air, not presence.

FEAT-003 introduces spring-settled FLIP on individual bento cards (`<motion.div layout>`, spring stiffness 200, damping 22 — ADR-0008). With spring physics, a card begins settling before it finishes its animation — the perceived settle is ≤400ms. That means a card is already moving when the next intent could be dispatched. With 400–800ms gaps, the next dispatch arrives after the card has long since settled: the agent appears to pause and wait, then announce. With 150–350ms gaps, card settle and the next dispatch overlap: the cascade reads as continuous thinking, not scripted beats.

## Decision Drivers
- Keep the individual-dispatch primitive intact — simultaneous dispatch remains wrong
- Let transitions overlap rather than serialize — presence via continuity, not cadence
- Preserve the agent-feels-present quality ADR-0003 was designed to protect
- Callers must retain the ability to override timing when legibility requires it
- Remain honest: we have not collected real-user data; this is a hypothesis that needs validation

## Decision Outcome
Revise the staggered-dispatch default gap from 400–800ms to 150–350ms.

The five-verb protocol, the staggered-dispatch primitive, and the signal-scoped lifecycle established by ADR-0003 are unchanged. Only the specific timing constant changes.

The implementation is a two-line diff in `backend/src/app/adapters/api/dispatch.py`:

```
min_gap_ms: int = 150   # was 400
max_gap_ms: int = 350   # was 800
```

Callers that pass explicit `min_gap_ms`/`max_gap_ms` kwargs are unaffected. The defaults are a sensible-out-of-the-box experience, not a constraint on callers.

## Consequences
- Good: cascade feels continuous because card settle and next event overlap; fewer "staring at nothing" frames between intents; subjectively reads as agent thinking rather than agent announcing
- Bad: smaller gap window means less temporal room for visitors to consciously register individual agent decisions before the next arrives; requires real-user validation that we have not lost legibility at the lower bound; 150ms approaches the edge of conscious perception for subtle cards
- Neutral: callers can override at any time; the test suite pins the defaults explicitly so any future accidental drift will fail fast

## Supersedes
ADR-0003 (partially — the five-verb protocol, staggered-dispatch primitive, and signal-scoped lifecycle all stand; only the specific 400–800ms timing constant is revised to 150–350ms)
