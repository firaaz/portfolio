---
name: adr
description: Record an Architecture Decision Record using MADR format. Use this skill whenever the user says /adr, "record a decision", "document this architecture choice", "why did we choose", or wants to capture the rationale behind a technical or architectural decision. Takes a decision title as argument.
allowed-tools: Read, Write, Bash(ls:*), Bash(cat:*)
argument-hint: <decision-title>
---

## Existing ADRs
!`ls docs/adrs/*.md 2>/dev/null | grep -v template || echo "None yet"`

Record an ADR for: $ARGUMENTS

## Process

1. **Read the template** — `docs/adrs/template.md` defines the MADR format
2. **Read related ADRs** — check if any existing decisions are relevant or would be superseded
3. **Determine next number** — look at existing ADR filenames and increment
4. **Write the ADR** with these sections:
   - **Context and Problem Statement** — why this decision came up (the trigger, not just background)
   - **Decision Drivers** — the specific constraints that shaped the choice
   - **Considered Options** — at least 2 options with honest tradeoffs for each
   - **Decision Outcome** — which option was chosen and why, with enough detail that someone reading this in 6 months understands the reasoning
   - **Consequences** — both good (what we gain) and bad (what we accept as tradeoff)
5. **Save to** `docs/adrs/NNNN-<title-with-dashes>.md`
6. **If superseding** an existing ADR, update that ADR's status to "superseded by ADR-NNNN"
7. **Update** the Key Decisions section in `docs/architecture.md`

ADRs are permanent records — they capture what was decided and why at a point in time. They are never edited after acceptance; new decisions supersede old ones. This history is valuable because it prevents relitigating settled questions and helps new contributors understand why things are the way they are.
