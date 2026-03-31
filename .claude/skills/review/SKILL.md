---
name: review
description: Review changes against spec and ADRs. Use this skill whenever the user says /review, "review my changes", "check this against the spec", "code review", or wants to verify that implementation matches its specification. Takes an optional spec directory name as argument.
allowed-tools: Read, Bash(git:*), Bash(ls:*), Bash(cat:*)
argument-hint: [spec-directory-name]
---

## Changes
!`git diff --name-only main...HEAD 2>/dev/null || git diff --name-only HEAD`

## Diff Stats
!`git diff --stat main...HEAD 2>/dev/null || git diff --stat HEAD`

## Full Diff
!`git diff main...HEAD 2>/dev/null || git diff HEAD`

## Review Checklist

Review each category and report **pass/fail with specific evidence** (file paths, line numbers, concrete issues):

1. **Spec alignment** — Does the implementation match `specs/$ARGUMENTS/spec.md` acceptance criteria? Anything missing? Anything extra that wasn't requested?

2. **Security** — Input validated before use? Auth checks in place? No hardcoded secrets or API keys? No XSS/injection vectors? Error responses don't leak internals?

3. **Test coverage** — Are critical paths covered by tests? Are edge cases from the spec's completeness checklist tested?

4. **ADR compliance** — Does the implementation respect constraints in `docs/adrs/`? Any architectural violations?

5. **Scope** — No unrelated changes? Diff under 200 lines? If over, which changes could be split into a separate slice?

6. **Accessibility** — WCAG 2.1 AA met? `prefers-reduced-motion` respected? Semantic HTML? Keyboard navigable?

## Output Format

For each category, output:
- **PASS** or **FAIL**
- Evidence (specific file:line references for issues)
- Suggested fix (if failing)

End with a summary: overall assessment and the single most important issue to address (if any).
