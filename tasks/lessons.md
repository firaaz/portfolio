# Lessons Learned
Last reviewed: 2026-03-31

## Critical Rules (promoted after 2+ occurrences)
- Shape Up methodology for all planning. Pitches (Problem/Appetite/Solution/Rabbit Holes/No-Gos), not PRDs. One spec at a time, no waterfall phasing. (2 occurrences: sessions 3, 4)

## Recent Corrections
- ADRs are immutable. Never edit an existing ADR. Create a new one and update only the `superseded by` field on the old one.
- Specs are Shape Up pitches. No acceptance criteria, no task breakdowns, no type schemas. The builder discovers tasks.
- Don't dismiss existing protocols/tools prematurely. Evaluate deeply before rejecting — the user may see value you don't.
- Spec defines ports, building picks adapters. Don't specify testing tools, LLM providers, or frameworks in specs.
- EDD = Evaluation-Driven Development (LLM evals first), not Example-Driven Development.
- Use direct tools only. Don't chain fallback alternatives (e.g., `pandoc ... || python3 ...`). If the tool fails, diagnose.
- Don't re-pitch rejected ideas. If user says "I don't like any of these," push for fundamentally different paradigms next time.
- The agentic UX must feel like guidance, not invisible manipulation. The user should FEEL the agent's presence and support.

## Archived
