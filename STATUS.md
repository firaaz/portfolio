# Status

## Current State (2026-04-25, post-Slice-C2 + FEAT-006 brainstorm, merged into develop)

Slice C2 (consumer side of persistent SSE adapt loop) **shipped and merged into `develop`** via `--no-ff` ceremony, alongside the **FEAT-006 spec + ADR-0010 (Persona Protocol)** produced by a brainstorming session in the same turn. The visible adapt loop is now closed end-to-end: signal → tier escalation → AdaptStrategy → SessionEventBus → long-lived stream subscription → frontend.

**Branch state:** `develop` at `3f4cbc8` (merge commit). `feat/005-event-bus` carried 3 commits before the merge:
- `d72f406` — Slice C1 producer
- `24c6bf8` — Slice C2 consumer
- `bf45c7d` — FEAT-006 spec + ADR-0010

`develop` is now **108 commits ahead of `origin/develop`** (the catchup-stated 102 was off; actual was 104 pre-merge, +4 from this session = 108). No push this session.

**Test counts on `develop` (post-merge):** backend pytest **198** (was 182, +16 across C1+C2 — 8 event_bus + 6 signal_route adaptation + 2 stream subscription), frontend vitest **120** (was 117, +3 use-agent-stream URL composition), e2e **6/6** unchanged. pytest 0.85s.

**The visible adapt loop is now alive but requires `LLM_API_KEY` to demonstrate.** Without a key, `signal_route._run_adaptation`'s `if llm is not None` gate skips scheduling, so manual smoke testing (hover a card, see layout shift) needs the key set in the running backend. The unit + integration tests prove the wiring.

## Accomplished This Session

1. **Slice C2 implementation (TDD-driven, 4 source + 3 tests + 1 e2e fixture-glob fix):**
   - Lifted `get_event_bus()` singleton from `signal_route` into `adapters/sse/event_bus.py` so producer + consumer share one bus instance.
   - `signal_route.py` updated to use the shared singleton (replaced private `_get_event_bus`).
   - `stream_route.py` accepts `?session_id=<sid>` query param; after the deterministic prefix and optional initial cascade, subscribes to the bus and yields events until disconnect. Lifecycle: snapshot → signal → optional LLM cascade → optional persistent bus subscription.
   - `useAgentStream` reads `useSessionId()` internally and appends `?session_id=<encoded>` to the URL — **no caller changes** (App.tsx unchanged).
   - Fixed `bento-cascade.spec.ts` scenario 5 fixture glob from `**/api/agent/stream` (path-only) to a regex matching the new query string. Forced collateral from the URL change; not a feature.
   - Verification: backend 198/198, frontend 120/120, e2e 6/6, ruff/biome clean on slice files. Commit `24c6bf8` — 8 files, +190 / -39.

2. **Merged `feat/005-event-bus` into `develop` via `--no-ff`** — merge commit `3f4cbc8`. C1 + C2 + FEAT-006 spec all landed together.

3. **Brainstorm: FEAT-006 "agent IS the page"** — full brainstorming-skill workflow executed:
   - Visual companion (browser-based brainstorm aid) used for paradigm/layer/rendering comparisons across the session.
   - Diagnosed why the current bento "doesn't feel wow" despite working: PresenceDot, CommandBar, TransparencyPanel exist but presence is **inert** (no expression), causality decoupled (gesture-to-response gap), narrative thin (cards rearrange but page doesn't *say* anything).
   - Locked the thesis (user-corrected, now in memory): **agent IS the page** — not "operates the page." Saved as `feedback_agent_is_the_page.md` with the test "does this make the agent feel like the page itself, or like a layer behind it?"
   - Three-paradigm progression confirmed (whisper / letter / dialogue) as **stages** not features — expressions of growing confidence in the agent's read. Cohabitation with stage lighting (foreground voice at full weight; lower voices remain visible at reduced opacity).
   - User's reframe ("we are building a protocol") drove the protocol-vs-agent-vs-client three-layer split. The portfolio is the first implementation of PROTOCOL-001, not its reason for existing.
   - Persona protocol designed iteratively: Closed enums → small core + observations → **pure observations + rationale + trust** (no privileged fields). Multi-valued observations per dimension (multivoice — e.g., LinkedIn-technical = role=recruiter conf 0.4 + role=engineer conf 0.6 concurrent). Append-only.
   - Protocol audit pass cut `VOICE_STEER` (existing `/api/agent/command` POST is the steer channel) and `PERSONA_DELTA.reason` (redundant with `rationale`). Final surface: 3 types (Persona, Observation, Ref) + 2 new server events (PERSONA_DELTA, VOICE_UTTERANCE) + 1 extended type (VisitorContext) + 0 new HTTP endpoints.
   - 9-slice walking-skeleton decomposition (D1 protocol scaffold → D2 transparency render = first visible end-to-end beat → D3-D5 voices in confidence order → D6 visitor steer → D7-D9 telemetry/mobile/EDD).

4. **Spec written and committed** (`bf45c7d`):
   - `specs/006-agent-is-the-page/spec.md` (~295 lines) — Shape Up pitch with Problem/Appetite/Solution/Rabbit Holes/No-Gos. Solution covers the three-voice cohabitation, persona protocol, ReadStrategy prompt sketch (with LinkedIn-technical worked example), VoiceStrategy + StageSelector, three-layer architecture, frontend rendering, failure modes, slice decomposition.
   - `docs/adrs/0010-persona-protocol.md` (~137 lines) — accompanying ADR. Codifies open-vocabulary discipline, append-only multi-valued observation semantics, FallbackUtterance graceful-degrade requirement, and the 3-question rule for future protocol additions.
   - User reviewed and approved the spec.

5. **Memory updates:** `feedback_agent_is_the_page.md` saved with foundational thesis test (in `~/.claude/projects/.../memory/`, outside repo).

## Key Decisions

- **PROTOCOL-001 (Persona Protocol)** — typed wire format separating "agent thinks" from "agent speaks." Open vocabulary on `dimension`, `voice_tag`, `utterance_kind`. Append-only multi-valued observations. Visible audit trail via `rationale` + `source_signals`. See `docs/adrs/0010-persona-protocol.md` for the full set of disciplines and the 3-question rule.
- **Three-layer split: protocol / agent / client.** Protocol is the wire format (PROTOCOL-001). Agent is server-side implementation choices (ReadStrategy, VoiceStrategy, prompts, trust thresholds). Client is frontend rendering (WhisperLayer/CoverLetterPanel/DialogueOverlay/FallbackUtterance). Different agents can speak the same protocol with different prompts; different clients can render it as audio/chat/etc. See spec Solution section.
- **Cohabitation with stage lighting (not stage replacement).** As trust climbs, lower voices stay visible at reduced opacity. The page densifies; never erases prior agent expression within session. Failure modes for cohabitation handled by voice prompts sharing Persona context.
- **Stage selector is a pure function:** `(persona.trust, visitor_steer) → voice_tag`. Thresholds 0.4/0.7 (tunable). Cmd+K → forced dialogue.
- **ReadStrategy prompt is the load-bearing artifact** — not the protocol. Soft conventions (common dimensions: role/intent/depth/source) live in the prompt, not the type. Persona creation = LLM-driven inference guided by prompt seeding. D9 covers it with DeepEval.
- **Multivoice handling:** drop "latest in dimension wins" — observations accumulate; multiple observations may share a dimension; voices compose across them. Critical for visitors who match multiple personas.
- **Dropped from earlier proposals:** `VOICE_STEER` event (use existing command POST), `PERSONA_DELTA.reason` (redundant), `observations_updated`/`observations_removed` (append-only is enough), pre-computed pattern signals (agent derives from raw signals), `core` field in Persona (re-introduces lock-in).
- **Slice C2 file budget acknowledged over** — 4 source + 3 tests + 1 e2e fixture fix = 8 files. Source count (4) is within ≤5; test count is collateral. C1 was 6; pattern is consistent.

## Blockers

- **FEAT-006 implementation has not started** — only the spec + ADR exist. Next session begins the writing-plans skill (per brainstorming-skill terminal step).
- **Manual smoke test of the C2 visible loop pending.** Wiring is proven by tests (backend integration test + frontend unit test); end-to-end demo requires `LLM_API_KEY` in the running backend. Not a code blocker — operational verification.
- **`develop` 108 commits ahead of `origin/develop`** — unchanged push posture from prior sessions. Decision still pending; not autonomously pushing.
- **Pre-existing backend ruff E501 errors** — 12 still in untouched files (`tests/test_validation.py`, `src/app/domain/strategies/*.py`). Not touched this session.
- **Pre-existing frontend Biome lint errors** — `src/__tests__/SkillTag.test.tsx:16` (non-null assertion), `src/__tests__/Canvas.test.tsx` (formatting), `src/index.css` (`!important` warnings). Not touched this session.

## Next Step

**Run the `writing-plans` skill (Superpowers) against `specs/006-agent-is-the-page/spec.md` to produce the per-slice implementation plan.** This is the explicit terminal handoff from the brainstorming skill. Don't invoke any implementation skill (frontend-design, mcp-builder, etc.) — `writing-plans` is the only correct next-step skill.

**Concrete starting state for fresh context:**

- Spec: `specs/006-agent-is-the-page/spec.md` (Shape Up pitch, ~295 lines).
- ADR: `docs/adrs/0010-persona-protocol.md` (PROTOCOL-001, ~137 lines).
- Branch start point: `develop` @ `3f4cbc8` (post-merge of feat/005-event-bus).
- Spec contains a 9-slice decomposition table (D1–D9) with file-count estimates. `writing-plans` should refine these into per-slice TDD plans.
- Walking-skeleton property: D1 (persona protocol scaffold, backend types + ReadStrategy) and D2 (PERSONA_DELTA on the wire + frontend persona-store + TransparencyPanel render) together form the first visible end-to-end beat — visitor opens TransparencyPanel and sees what the agent thinks of them. No voice rendering yet.

**Per-slice implementation guidance the spec already commits to** (writing-plans should preserve):

- Each slice ≤5 files (source); test files are collateral and don't strictly count.
- Each slice independently shippable; never produces a worse UX than prior state.
- TDD discipline: write failing test first, watch fail, implement minimal, watch pass.
- D9 includes DeepEval evals for the ReadStrategy prompt as a tested artifact.

**Open design forks the brainstorm explicitly deferred to slice work** (writing-plans should NOT lock these in — let implementation discover):

- Exact voice prompt wording (whisper / letter / dialogue prompts).
- Trust threshold values (0.4 / 0.7 are placeholders; tune in D9).
- TransparencyPanel "do not infer" toggle (D9 candidate, not committed).
- `command_route.py` refactor shape (D6 — emits PERSONA_DELTA + VOICE_UTTERANCE through bus, replaces ComposeStrategy-only behavior).

**Branching strategy for FEAT-006:** start `feat/006-d1-persona-scaffold` from `develop` for the first slice. Each subsequent slice = its own short-lived branch from `develop`, merged back via `--no-ff` (matches Slice B / C2 pattern). Don't stack — these are independent shippables.

### Backlogged (not for next session unless user redirects)

- **Manual smoke test of C2 with `LLM_API_KEY` set** — confirm the visible adapt loop firing in the browser. Standalone task, doesn't block FEAT-006 plan.
- **Push `develop` to `origin`** — 103 commits unpushed. User decision pending.
- **Pre-existing lint issues** (SkillTag non-null, Canvas formatting, index.css `!important`, ruff E501 in test_validation/strategies). Clean-up sweep, ~5-min slice if done in isolation.
- **Cost debounce for AdaptStrategy** — surfaced in C1, partially addressed by 2s debounce in spec D9. Could land sooner if cost in practice exceeds expectations.
- **Bento cohesion beyond tiling** (editorial rhythm, content-to-shape matching, narrative flow). Distinct problem; needs its own brainstorm.
- **Tooling-hooks slice (cairn cherry-pick)** — still backlogged behind feature work.

---

## Previous State (2026-04-25, post-Slice-C1, branch unmerged)
Slice C1 (persistent SSE infrastructure for adaptive cascade) shipped on `feat/005-event-bus`, not yet merged. Backend detected tier/confidence-band crossings on signal batches and scheduled BackgroundTasks running AdaptStrategy via SessionEventBus. Producer half of the adapt loop alive; consumer half (long-lived stream + frontend session_id) was Slice C2 (now shipped). Single commit `d72f406`. 194 backend tests, 117 frontend, 6/6 e2e.

## Previous State (2026-04-25, post-Slice-B, merged into develop)
Slice B (causal cursor signals) shipped and merged into `develop` via `--no-ff`. Per-bento-card hover/dwell/click events flow `Canvas.tsx` → `useCardSignals` → `useSignalCollector` → `POST /api/agent/signal` → `VisitorProfile.accumulate()`. Merge commit `15b2686`. `develop` 102 commits ahead of origin, backend pytest 182, frontend vitest 117, e2e 6/6.

## Previous State (2026-04-25, post-scenario-5-fix, pre-Slice-B)
E2e scenario 5 fixed via Playwright `page.route()` SSE fixture and merged into `develop` (commits `4085968`, `49938e2`). FEAT-002 + FEAT-003 + scenario-5 fix all live. `develop` 96 commits ahead of origin. Backend 181, vitest 106, e2e 5/5 in 5.4s.

## Previous State (2026-04-24, pre-scenario-5 fix)
FEAT-002 and FEAT-003 merged into `develop` via `--no-ff` ceremony (`47216b6`, `c6bc033`, `254859e`). 93 commits ahead of origin. E2e 4/5 passing — scenario 5 timing out because the LinkedIn persona's LLM cascade didn't produce tier-1 items in the 0.15–0.35 band.

## Previous State (pre-merge, FEAT-002 + FEAT-003 on feature branches)
FEAT-003 breathing bento shipped on `feat/003-breathing-bento` stacked on `feat/002-stream-integration`. 13 implementation tasks covered ADR drafting, pure `computeLayout` function, property-based tests, staggered-dispatch retune, pre-LLM signal builder, `Bento.tsx` motion component, CSS cutover, Canvas integration, e2e scenario set.

Prior FEAT-002 shipped `stream_route.py` running `SelectStrategy` via `PydanticAIProvider.evaluate()`, `command_route.py` running `ComposeStrategy`, `app/domain/evaluation.py::evaluate_intelligence()` orchestrator, `ux_events.py::intelligence_to_events()` transformer, `MemoryCache[T]` genericization. Both routes dispatch through `staggered_dispatch` (now 150–350ms post-FEAT-003).

## Story Map
No story map
