# Spec-Driven Development Playbook

AI-Assisted Greenfield Projects with Claude Code & Windsurf

**Version:** 2.0 | **Last updated:** March 2026 | **Team:** 2-3 engineers | **Tools:** Claude Code, Windsurf

---

## 1. Quick Reference

| Situation | Action |
|-----------|--------|
| Starting a session | `/catchup` |
| Ending a session | `/handoff` — updates STATUS.md, commits |
| New feature needed | Story-map it first → write spec for one slice → annotate → approve |
| Implementing | `/implement NNN-name` — one vertical slice per session |
| Architectural decision | `/adr decision-title` → records to `docs/adrs/` |
| Comparing approaches | Spike each on separate branches → write ADR with evidence |
| Unknown tech/domain | Spike on `spike/name` branch → capture in `docs/spikes/` |
| AI touching too many files | `Esc Esc` rewind → "What's the smallest testable piece?" |
| AI makes a mistake | Correct → append to `tasks/lessons.md` → continue |
| Reviewing AI output | Automated gates → AI reviewer → human check on security/edges |
| Context window filling | `/compact Focus on [current task]` at ~60% |
| lessons.md over 200 lines | Promote top rules to AGENTS.md, archive rest |
| CLAUDE.md over 100 lines | Move domain rules to `.claude/rules/` with path scoping |
| Plan without coding | Plan Mode: `Shift+Tab ×2` (Claude Code) |
| Decomposing a project | Story map → completeness checklist → pick top-left cell |
| Need unified direction | Read `docs/architecture.md` + `docs/adrs/` |

**Core rule: one change = one vertical slice of one user-facing behavior.**
If it touches more than 5 files, decompose it.

---

## 2. Project Structure

```
project/
├── AGENTS.md                        # Shared instructions (all AI tools read this)
├── CLAUDE.md                        # Claude Code additions (references AGENTS.md)
├── STATUS.md                        # Current state + single next step
│
├── specs/
│   ├── story-map.md                 # Feature roadmap (what's done, what's next)
│   └── 001-feature-name/
│       ├── spec.md                  # What and why
│       ├── plan.md                  # How and where (ephemeral)
│       └── tasks.md                 # Ordered vertical slices
│
├── docs/
│   ├── architecture.md              # System vision + boundaries (updated quarterly)
│   ├── adrs/                        # Architecture Decision Records (permanent)
│   │   ├── template.md
│   │   ├── 0001-tech-stack.md
│   │   └── 0002-architecture-style.md
│   └── spikes/                      # Exploration learnings
│
├── tasks/
│   ├── lessons.md                   # Self-improving mistake log (<200 lines)
│   └── todo.md                      # Current session tasks
│
├── .claude/                         # Claude Code specific
│   ├── settings.json                # Permissions, hooks
│   ├── commands/                    # /plan, /adr, /implement, /review, /catchup, /handoff
│   ├── rules/                       # Path-scoped rules (YAML frontmatter)
│   └── agents/
│       └── code-reviewer.md         # Read-only review subagent
│
└── .windsurf/                       # Windsurf specific
    ├── rules/                       # Activation-mode rules
    └── workflows/                   # Equivalent slash commands
```

| File/Directory | Purpose | Read by |
|----------------|---------|---------|
| `AGENTS.md` | Stack, conventions, architecture refs, implementation rules | All tools |
| `CLAUDE.md` | Session management, self-improvement loop, @references | Claude Code |
| `.windsurf/rules/` | Glob-scoped activation rules | Windsurf |
| `specs/story-map.md` | Feature roadmap with completion tracking | All tools |
| `specs/NNN-name/` | Individual feature specifications | All tools |
| `docs/architecture.md` | System vision, boundaries, component overview | All tools |
| `docs/adrs/` | Architectural decisions (permanent record) | All tools |
| `tasks/lessons.md` | Mistake-derived rules (promoted over time) | Claude Code |
| `STATUS.md` | Session continuity (what's done, what's next) | All tools |

---

## 3. Architectural Governance

Three layers prevent the codebase from growing haphazardly. Each serves a different purpose and operates at a different timescale.

### Layer 1 — Constitution: `docs/architecture.md`

The unified vision for the system. Written on day one, updated quarterly. Every feature is built within this structure. Every AI session reads it.

```markdown
# Architecture Vision

## System Purpose
[2-3 sentences: what this system does and for whom]

## Component Overview
[Containers, services, and their relationships]

## Architectural Style
[e.g., Hexagonal with ports/adapters for external services]

## Boundaries
[Which modules may depend on which. What is forbidden.]

## Key Decisions
- ADR-0001: [Tech Stack] — [summary]
- ADR-0002: [Architecture Style] — [summary]

## Technology Stack
[Languages, frameworks, databases, external services]

## Constraints
[Non-negotiable: performance, security, compliance requirements]

## Future Direction
[Where this system is heading over 6-12 months]
```

### Layer 2 — Legislation: Architecture Decision Records

One decision per file in `docs/adrs/`. Captures what was decided, what alternatives were rejected, and why. AI agents read these before implementing architectural changes, preventing contradictory decisions and repeated debates.

ADRs are immutable after acceptance. New decisions supersede old ones — they never edit history.

```markdown
# [Short title of decision]

## Status
proposed | accepted | deprecated | superseded by ADR-NNNN

## Date
YYYY-MM-DD

## Participants
[Who was involved]

## Context and Problem Statement
[Why this decision came up]

## Decision Drivers
- [Driver 1]
- [Driver 2]

## Considered Options
1. **[Option A]** — [tradeoff]
2. **[Option B]** — [tradeoff]

## Decision Outcome
Chosen option: [option], because [justification].

## Consequences
- Good: [positive outcome]
- Bad: [accepted tradeoff]
```

**For large architectural decisions** (e.g., choosing between two agentic architectures): spike each approach on separate branches, gather evidence, then write the ADR comparing them with concrete findings. The decision is informed by code, not just discussion.

### Layer 3 — Enforcement: Fitness Functions

Automated tests that verify architectural boundaries in CI. AGENTS.md instructions get followed ~70% of the time. CI tests get followed 100%.

Start with one fitness function on day one: "UI layer never imports database modules directly." Add more as boundaries emerge.

Tools: ArchUnitTS (TypeScript), PyTestArch (Python), ESLint custom rules, dependency-cruiser.

---

## 4. Feature Decomposition

### Story Mapping (not flat lists)

AI decomposition produces overwhelming flat lists. Story mapping organizes features into a 2D grid: user journey (horizontal) × depth (vertical). This prevents scope explosion and makes priority obvious.

```markdown
# specs/story-map.md

| Journey Step → | Upload Photo | Analyze | Generate Quote | Deliver |
|----------------|-------------|---------|----------------|---------|
| **Must (skeleton)** | [x] Single JPEG/PNG | [x] Mock response | [ ] Flat price calc | [ ] Display |
| **Should** | [ ] Multi-image, HEIC | [ ] Real API call | [ ] Tiered pricing | [ ] PDF export |
| **Could** | [ ] Camera capture | [ ] Confidence scores | [ ] Client markup % | [ ] Email |
```

The top row is the walking skeleton. Each row below adds depth to existing steps. Always build left-to-right, top-to-bottom.

To generate this, ask the AI: "Map out the user journey as columns. For each column, give me three rows: must-have, should-have, could-have. The top row is the walking skeleton."

### Completeness Checklist

Run against every feature spec before implementation. Prevents the AI from optimizing for the happy path while missing critical concerns.

```markdown
## Feature Completeness Checklist
Before marking any spec as ready:
- [ ] Happy path defined
- [ ] Input validation (what gets rejected, how)
- [ ] Error handling (dependency failures, timeouts)
- [ ] Edge cases (empty, null, too large, concurrent)
- [ ] Auth/permissions (who can, who can't)
- [ ] Loading/progress states
- [ ] Rollback behavior (partial failure)
```

This checklist belongs in the feature spec template. The AI fills it in when generating specs. Reviewing the checklist is faster than reviewing the full spec.

### Feature Spec Format

```markdown
# FEAT-NNN: [Feature Name]
Status: specifying | in-progress | shipped
Owner: [name]

## Goal
[One sentence: who benefits and how]

## Acceptance Criteria
- [ ] [Testable condition]
- [ ] [Testable condition]

## Completeness
- [ ] Happy path
- [ ] Input validation
- [ ] Error handling
- [ ] Edge cases
- [ ] Auth/permissions
- [ ] Loading states
- [ ] Rollback behavior

## Design Notes
[Enough for an AI agent to implement without guessing]

## Referenced ADRs
- ADR-NNNN: [relevant decision]

## Tasks (vertical slices, ordered)
- [ ] Slice 1: [end-to-end behavior]
- [ ] Slice 2: [end-to-end behavior]
```

### Separating Decomposition from Implementation

Decomposition and implementation never happen in the same session. This prevents the AI from seeing the full problem and solving all of it at once.

**Decomposition sessions** (Plan Mode, no code): produce a story map and one feature spec.
**Implementation sessions** (one slice): read one spec, build one slice, commit.

---

## 5. Shared Specifications

### AGENTS.md (~60-80 lines)

Read by Claude Code, Windsurf, Cursor, Copilot, and all major AI coding tools. Contains everything tool-agnostic.

```markdown
# [Project Name]
[One-line description]. Stack: [framework, language, DB].

## Commands
- `npm run dev` — dev server
- `npm run test` — test suite
- `npm run lint` — linter
- `npm run typecheck` — TypeScript strict check

## Architecture
[3-5 line description of structure and patterns]
See docs/architecture.md for system vision.
See docs/adrs/ for all architectural decisions.

## Code Conventions
- TypeScript strict mode, no `any` types
- Named exports only
- Functions max 50 lines, files max 250 lines
- [2-3 project-specific conventions]

## Implementation Rules
- Implement ONE vertical slice per session
- A vertical slice = one user-facing behavior end-to-end
- If a task touches more than 5 files, stop and decompose
- Write failing test first, then implement to green
- Commit after each file passes typecheck
- Never scaffold infrastructure beyond current task needs
- Before architectural changes, read docs/adrs/

## Review Checklist
After implementation, verify:
1. `npm run lint` passes
2. `npm run typecheck` passes
3. `npm run test` passes
4. No hardcoded secrets or API keys
5. User input validated before use
6. Error responses don't leak internals
```

### CLAUDE.md (~30 lines, references AGENTS.md)

```markdown
@AGENTS.md

## Claude Code Specific

### Self-Improvement
- Read tasks/lessons.md before starting any task
- After any correction: append to tasks/lessons.md
- Format: YYYY-MM-DD | category | what went wrong | what to do instead
- Before implementing a pattern, check lessons.md for prior mistakes

### Session Management
- Start sessions with /catchup
- End sessions with /handoff
- At 60% context, run /compact with focus directive

### References
@docs/architecture.md | @docs/adrs/
```

### Windsurf Rules

```markdown
# .windsurf/rules/project.md
---
trigger: always_on
---
Read AGENTS.md at the start of every conversation.
Read docs/adrs/ before making architectural changes.
Implement one vertical slice per session.
```

### Tool Mapping

| Feature | Claude Code | Windsurf |
|---------|------------|----------|
| Project instructions | `CLAUDE.md` + `AGENTS.md` | `.windsurf/rules/` + `AGENTS.md` |
| Slash commands | `.claude/commands/*.md` | `.windsurf/workflows/*.md` |
| Path-scoped rules | `.claude/rules/*.md` | `.windsurf/rules/*.md` (trigger: glob) |
| Plan mode | `Shift+Tab ×2` | Conversation-based |
| Memory | Auto Dream + lessons.md | Cascade Memories |

Specifications and ADRs are plain markdown in `specs/` and `docs/adrs/`. Both tools read them directly. Only the command files in `.claude/` and `.windsurf/` are tool-specific.

---

## 6. Custom Commands

Six commands cover 90% of the workflow. Claude Code versions shown; Windsurf equivalents follow the same logic in `.windsurf/workflows/` without the `!backtick` shell syntax.

### /plan

```markdown
# .claude/commands/plan.md
---
description: Create a feature spec with codebase research
allowed-tools: Read, Write, Bash(ls:*), Bash(cat:*), Bash(mkdir:*)
argument-hint: <feature-description>
---

Create a specification for: $ARGUMENTS

1. Analyze the request — identify scope and dependencies
2. Research the repo — read relevant files, check docs/adrs/
3. Check conventions — read AGENTS.md
4. Draft the spec: overview, affected files, approach,
   edge cases, testing strategy, acceptance criteria
5. Fill in the completeness checklist
6. Write to specs/NNN-<feature-name>/spec.md
Do NOT implement. Spec only.
```

### /adr

```markdown
# .claude/commands/adr.md
---
description: Record an Architecture Decision Record
allowed-tools: Read, Write, Bash(ls:*), Bash(cat:*)
argument-hint: <decision-title>
---

## Existing ADRs
!`ls docs/adrs/*.md 2>/dev/null | grep -v template || echo "None yet"`

Record an ADR for: $ARGUMENTS

1. Read docs/adrs/template.md for format
2. Read related existing ADRs
3. Create with next sequential number (MADR format)
4. Save to docs/adrs/NNNN-<title-with-dashes>.md
5. If any existing ADR is superseded, update its status
```

### /implement

```markdown
# .claude/commands/implement.md
---
description: Implement one vertical slice from a spec
allowed-tools: Read, Write, Bash(*)
argument-hint: <spec-directory-name>
---

## Spec
!`cat specs/$ARGUMENTS/spec.md 2>/dev/null || echo "Spec not found"`

## Plan
!`cat specs/$ARGUMENTS/plan.md 2>/dev/null || echo "No plan"`

Implement ONE vertical slice from specs/$ARGUMENTS/:
1. Read spec and plan carefully
2. Check referenced ADRs for constraints
3. Implement one slice only (≤5 files)
4. Run tests after each significant change
5. Update tasks.md checkboxes
6. Commit after passing typecheck
```

### /review

```markdown
# .claude/commands/review.md
---
description: Review changes against spec and ADRs
allowed-tools: Bash(git:*)
argument-hint: [spec-directory-name]
---

## Changes
!`git diff --name-only main...HEAD 2>/dev/null || git diff --name-only HEAD`

## Diff
!`git diff --stat main...HEAD 2>/dev/null || git diff --stat HEAD`

Review for:
1. Spec alignment — matches specs/$ARGUMENTS/spec.md?
2. Security — input validation, auth, data exposure
3. Missing tests
4. ADR compliance — respects docs/adrs/?
5. Scope — no unrelated changes?
```

### /catchup

```markdown
# .claude/commands/catchup.md
---
description: Orient at the start of a session
---

## Recent Changes
!`git log --oneline -10`

## Uncommitted Work
!`git diff --stat`

## Status
!`cat STATUS.md 2>/dev/null || echo "No STATUS.md"`

## Story Map
!`cat specs/story-map.md 2>/dev/null || echo "No story map"`

Summarize current state and the single next step.
Do NOT implement until confirmed.
```

### /handoff

```markdown
# .claude/commands/handoff.md
---
description: Save session state before stopping
allowed-tools: Read, Write, Bash(git:*)
---

Update STATUS.md with:
1. Current state (what exists, what works)
2. What was accomplished this session
3. Key decisions (reference new ADRs)
4. Blockers
5. THE SINGLE next step

Commit: git add -A && git commit -m "session: [summary]"
```

---

## 7. The Method

### Spike → Spec → Ship

Each feature follows three phases. Each is independently completable in a single session.

**Spike** (when the domain is unknown): Build the riskiest piece on `spike/feature-name`. Output: learning captured in `docs/spikes/` or a new ADR. Delete the branch after.

**Spec** (plan.md annotation cycle): AI drafts spec → you annotate inline → "Address all notes, don't implement yet" → repeat until clear. Usually 1-3 cycles.

**Ship** (one slice per session): Implement one vertical slice end-to-end. Commit when typecheck passes.

### TAPE Workflow (Talk → ADR → Plan → Execute)

For significant features or architectural decisions:

1. **Talk:** Discuss the problem with the AI (15-60 min)
2. **ADR:** Generate a decision record from the conversation (`/adr`)
3. **Plan:** Start a new session with only the ADR as context, produce a plan
4. **Execute:** Implement from the plan (`/implement`)

The ADR persists (explains why). The plan is ephemeral (explains how).

### Walking Skeleton

The first session per project builds a minimal end-to-end system: one page, one API endpoint, one DB operation, one user-facing behavior, deployed. Everything after is additive vertical slices. The skeleton proves the architecture works before investing in features.

---

## 8. Reviewing AI Output

### Three Verification Layers

**Layer 1 — Automated gates (zero effort):** Lint → typecheck → tests. Configure as PostToolUse hooks in Claude Code. Catches ~60% of defects.

**Layer 2 — AI reviews AI (near-zero effort):** `/review` command or built-in `/code-review`. A separate context catches what the implementation session missed. Optionally define a read-only reviewer subagent (`.claude/agents/code-reviewer.md`, tools: Read, Glob, Grep only).

**Layer 3 — Focused human review (10-15 min):** Security boundaries, error handling, edge cases, architectural fit, spec compliance. Skip formatting and naming — linters handle those.

### Diff Size Discipline

Each session produces one vertical slice = one diff under 200 lines. Research across 2,500 code reviews shows defect detection collapses beyond 400 lines. Small diffs are reviewable. Large diffs get rubber-stamped.

### TDD as Specification

Write acceptance tests before implementation. The AI implements until tests pass. Passing tests provide confidence without reading every line of generated code.

---

## 9. Self-Improving Memory

### lessons.md

```markdown
# Lessons Learned
Last reviewed: YYYY-MM-DD

## Critical Rules (promoted after 2+ occurrences)
- [Rule that repeatedly changed behavior]

## Recent Corrections
### YYYY-MM-DD | category
- [What went wrong] → [What to do instead]

## Archived
<!-- Superseded or resolved -->
```

### Promotion Ladder

1. Raw corrections enter `tasks/lessons.md` with date and category
2. After 2+ occurrences, promote to AGENTS.md or `.claude/rules/`
3. After proving stable, encode as a CI check or hook (100% enforcement)

### Compaction

Review every ~10 sessions. Promote repeated lessons. Archive resolved ones. Hard limit: 200 lines. Claude Code's Auto Dream feature also consolidates between sessions automatically.

---

## 10. Preventing Scope Creep

### The 5-File Rule

If a task touches more than 5 files, stop and decompose. This constraint goes in AGENTS.md so all tools enforce it.

### In AGENTS.md

```
- Implement ONE vertical slice per session
- Never scaffold infrastructure beyond current task needs
- If a task touches more than 5 files, stop and ask
```

### Mid-Session Recovery

When the AI starts doing too much: `Esc Esc` to rewind (Claude Code), then: "What's the smallest piece that's independently testable?" Log the correction to lessons.md.

### Planning Discipline

Never: "Plan the whole project."
Always: "Given what exists now, what's the single most valuable next slice?"

Decomposition sessions and implementation sessions are always separate. The AI that decomposes should not also implement in the same context.

---

## Sources

Practitioner-tested patterns from: Boris Cherny (Anthropic), Boris Tane (Cloudflare), Addy Osmani (Google), Kent Beck, Szymon Krajewski, Neal Ford, Martin Fowler's team, Jeff Patton (story mapping).

Tools: Claude Code, Windsurf, difftastic, ArchUnitTS, PyTestArch, AGENTS.md standard.
