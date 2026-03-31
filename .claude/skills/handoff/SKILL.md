---
name: handoff
description: Save session state before stopping — update STATUS.md and commit. Use this skill whenever ending a session, the user says /handoff, "save state", "I'm done for now", "wrap up", or anything about preserving progress before stopping work.
allowed-tools: Read, Write, Bash(git:*)
---

Update STATUS.md with these sections:

1. **Current State** — what exists and works right now
2. **Accomplished This Session** — bullet list of what changed
3. **Key Decisions** — reference any new ADRs created this session
4. **Blockers** — anything preventing progress (or "None")
5. **Next Step** — THE SINGLE most valuable next action

The next step is critical — it's what the next session's `/catchup` will read to know where to start. Be specific enough that a fresh context can act on it without ambiguity.

Then commit everything:

```bash
git add -A && git commit -m "session: [one-line summary of what was accomplished]"
```

The commit message should describe the session's output, not the process. "session: add edge middleware for referrer classification" not "session: worked on stuff".
