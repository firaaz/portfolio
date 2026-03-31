---
name: catchup
description: Orient at the start of a session — summarize current state and next step. Use this skill whenever starting a new session, resuming work, or when the user says /catchup, "what's the status", "where did we leave off", "catch me up", or anything about getting oriented on current project state.
allowed-tools: Read, Bash(git:*), Bash(ls:*), Bash(cat:*)
---

## Recent Changes
!`git log --oneline -10`

## Uncommitted Work
!`git diff --stat`

## Status
!`cat STATUS.md 2>/dev/null || echo "No STATUS.md"`

## Story Map
!`cat specs/story-map.md 2>/dev/null || echo "No story map"`

Read `tasks/lessons.md` before proceeding — it contains rules learned from past mistakes that apply to all future work.

Summarize concisely:
1. **What exists and works** — current project state
2. **What was last accomplished** — most recent session's output
3. **The single next step** — from STATUS.md

Do NOT implement anything until the user confirms the next step. The purpose of catchup is orientation, not action.
