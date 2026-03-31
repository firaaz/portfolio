---
name: implement
description: Implement one vertical slice from a spec using TDD. Use this skill whenever the user says /implement, "build this slice", "implement the next task", or wants to execute a specific vertical slice from an existing feature spec. Takes a spec directory name as argument.
allowed-tools: Read, Write, Bash(*)
argument-hint: <spec-directory-name>
---

## Spec
!`cat specs/$ARGUMENTS/spec.md 2>/dev/null || echo "Spec not found at specs/$ARGUMENTS/spec.md — check specs/ for available specs"`

## Plan (if exists)
!`cat specs/$ARGUMENTS/plan.md 2>/dev/null || echo "No plan"`

## Lessons
!`cat tasks/lessons.md 2>/dev/null || echo "No lessons"`

## Implementation Process

Implement **ONE vertical slice** from `specs/$ARGUMENTS/`:

1. **Read the spec and plan carefully** — understand the acceptance criteria for the slice you're building
2. **Check referenced ADRs** — respect architectural constraints in `docs/adrs/`
3. **Pick the next unchecked slice** from the spec's task list
4. **Write a failing test first** — the test defines what "done" means for this slice
5. **Implement the minimal code** to make the test pass
6. **Run tests** after each significant change — stay green
7. **Update the spec's task checkboxes** — mark the slice as complete

## Constraints

These constraints exist because small, focused changes are reviewable and debuggable. Large changes get rubber-stamped and hide bugs.

- **≤5 files** — if you'd touch more, stop and decompose into smaller slices
- **≤200 line diff** — keeps the change reviewable
- **TDD** — failing test first, then implementation. The test is the spec for the code.
- **Commit on green typecheck** — `git add [specific files] && git commit -m "feat: [slice description]"`

Do not add infrastructure, utilities, or abstractions beyond what this single slice requires. The next slice will add what it needs.
