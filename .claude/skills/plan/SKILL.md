---
name: plan
description: Create a feature spec with codebase research — no code. Use this skill whenever the user says /plan, "spec out", "design this feature", "plan how to build", or wants to decompose a feature into a specification before implementation. Takes a feature description as argument.
allowed-tools: Read, Write, Bash(ls:*), Bash(cat:*), Bash(mkdir:*)
argument-hint: <feature-description>
---

Create a specification for: $ARGUMENTS

## Existing Specs
!`ls specs/*/spec.md 2>/dev/null || echo "None yet"`

## Architecture
!`cat docs/architecture.md 2>/dev/null || echo "No architecture doc"`

## Process

1. **Analyze the request** — identify scope, affected components, and dependencies
2. **Research the repo** — read relevant source files, check `docs/adrs/` for constraints
3. **Check conventions** — read CLAUDE.md for code conventions and implementation rules
4. **Determine next spec number** — check existing specs in `specs/` directory
5. **Draft the spec** using the format below
6. **Write to** `specs/NNN-<feature-name>/spec.md`

## Spec Format

```markdown
# FEAT-NNN: [Feature Name]
Status: specifying
Owner: Firaaz

## Goal
[One sentence: who benefits and how]

## Acceptance Criteria
- [ ] [Testable condition]
- [ ] [Testable condition]

## Completeness
- [ ] Happy path defined
- [ ] Input validation (what gets rejected, how)
- [ ] Error handling (dependency failures, timeouts)
- [ ] Edge cases (empty, null, too large, concurrent)
- [ ] Auth/permissions (who can, who can't)
- [ ] Loading/progress states
- [ ] Rollback behavior (partial failure)

## Design Notes
[Enough detail for an AI agent to implement without guessing — component structure, data flow, key interfaces]

## Referenced ADRs
- ADR-NNNN: [relevant decision]

## Tasks (vertical slices, ordered)
- [ ] Slice 1: [end-to-end behavior, independently testable]
- [ ] Slice 2: [end-to-end behavior, independently testable]
```

Each slice should be one vertical piece of user-facing behavior that can be built, tested, and committed independently. If a slice would touch more than 5 files, break it down further.

**Do NOT implement.** This is a decomposition session — spec only. Implementation happens in a separate session with `/implement`.
