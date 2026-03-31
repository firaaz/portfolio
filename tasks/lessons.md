# Lessons Learned
Last reviewed: 2026-03-31

## Critical Rules (promoted after 2+ occurrences)

## Recent Corrections
- ADRs are immutable. Never edit an existing ADR. Create a new one and update only the `superseded by` field on the old one.
- Plan one spec at a time (Shape Up). Don't lay out multiple sessions/phases linearly — that's waterfall.
- Use direct tools only. Don't chain fallback alternatives (e.g., `pandoc ... || python3 ...`). If the tool fails, diagnose.
- Don't re-pitch rejected ideas. If user says "I don't like any of these," push for fundamentally different paradigms next time.
- The agentic UX must feel like guidance, not invisible manipulation. The user should FEEL the agent's presence and support.

## Archived
