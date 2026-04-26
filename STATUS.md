# Status

## Current State (2026-04-26, post-Slice-D3 whisper voice, merged into develop)

Slice D3 of FEAT-006 ("Agent IS the Page") **shipped and merged into `develop`** via `--no-ff` ceremony (merge commit `47fb3ab`). **The agent now speaks on the page.** When the adapt cycle fires for a low-trust visitor (trust < 0.4), the backend runs `evaluate_persona` → emits PERSONA_DELTA → calls `select_voice` → instantiates `VoiceStrategy("whisper")` → calls `evaluate_voice` → emits one VOICE_UTTERANCE event per utterance through `SessionEventBus`. The frontend's `useVoiceStore` collects them and `WhisperLayer.tsx` renders italic gutter observations next to the bento at 0.6 opacity (active) / 0.3 (backgrounded). Whisper-only in D3 — `VOICE_PROMPTS` registers `"whisper"`; `select_voice` returning `"letter"` (trust 0.4–0.69) or `"dialogue"` (trust ≥ 0.7) currently falls through silently because those tags are not yet registered. D4 and D5 fill them.

**Branch state:** `develop` at `47fb3ab`. `feat/006-d3-whisper` carried 6 commits pre-merge:
- `a0f71a0` — D3.1 `select_voice` pure function + `VisitorSteer` model (5 tests)
- `d954a5e` — D3.2 `VoiceStrategy` + `VOICE_PROMPTS` registry + `WHISPER_PROMPT` + `VoiceUtterance`/`VoiceUtteranceList` schemas (6 tests)
- `2b7b8ac` — D3.3 `voice_utterance_event` SSE formatter appended to `persona_events.py` (2 new tests)
- `20bd883` — D3.4 wire StageSelector + VoiceStrategy into `_run_adaptation`; new `domain/voice_evaluation.py` (1 new integration test)
- `2dac107` — D3.5 frontend `voice-store` + `isVoiceUtterance` guard + `useAgentStream` voice branch (6 frontend tests across 3 files)
- `96b2f58` — D3.6 `WhisperLayer.tsx` + Canvas integration (3 tests)

No fixup commit needed — every task commit was clean at commit time (typecheck + ruff + biome + tests all green per task).

`develop` is now **133 commits ahead of `origin/develop`** (was 126 pre-D3; +6 slice commits + 1 merge = +7 ✓). No push this session.

**Test counts on `develop` (post-merge):** backend pytest **239** (was 225, +14: 5 stage_selector + 6 voice_strategy + 2 persona_events.voice + 1 signal_route.voice_emission), frontend vitest **139** (was 130, +9: 3 voice-store + 2 sse-parsers.voice + 1 use-agent-stream.voice + 3 WhisperLayer), e2e **6/6** unchanged. pytest 0.86s; vitest 2.10s; e2e 7.3s.

## Accomplished This Session

1. **Plan written and approved** — `/Users/firaazfarook/.claude/plans/humble-shimmying-kahan.md` (D3 plan referencing the prescriptive task code at `specs/006-agent-is-the-page/plan.md` lines 1432–2332). User approved via ExitPlanMode then said "start d3."

2. **Slice D3 implementation (TDD-driven, 6 tasks, all green at commit time):**
   - **D3.1** `backend/src/app/domain/stage.py` (~25 lines) — `VisitorSteer` Pydantic model with open-vocab `requested_voice: str`; `select_voice(persona, steer) -> str` pure function with module-private thresholds `_LETTER_THRESHOLD=0.4` and `_DIALOGUE_THRESHOLD=0.7`. Steer overrides trust-based routing. Selector does NOT validate against `VOICE_PROMPTS` — that validation lives at the strategy boundary, keeping the selector pure.
   - **D3.2** `backend/src/app/domain/strategies/voice.py` (~95 lines) — plain class (mirrors `read.py`/`adapt.py`; avoids Pydantic's reserved `model_config` `ClassVar` shadow if ever migrated to `BaseModel`). `VOICE_PROMPTS = {"whisper": WHISPER_PROMPT}`. `WHISPER_PROMPT` instructs 1-3 short italic lines (≤12 words), present-tense first-person, never breaking the fourth wall. `VoiceUtterance` + `VoiceUtteranceList(min_length=1)` are the wire shapes for the LLM's structured output. `__init__` raises `ValueError` on unknown `voice_tag` (fail-fast). Temperature 0.5 (warmer than ReadStrategy's 0.2 for tonal variety), max_tokens 512.
   - **D3.3** `voice_utterance_event` appended to `backend/src/app/adapters/api/persona_events.py` — same AG-UI CustomEvent envelope shape as `persona_delta_event` (`type: "CUSTOM"`, nested `custom.eventType: "voice:utterance"`). Decision: keep it co-located with persona events for now; renaming to `agent_events.py` deferred to D6.
   - **D3.4** `backend/src/app/domain/voice_evaluation.py` (new, parallel to `persona_evaluation.py`) + `signal_route._run_adaptation` rewrite. The orchestration sequence is now: `evaluate_persona` → publish `persona:delta` → `select_voice(persona, None)` → if `voice_tag in VOICE_PROMPTS`, `VoiceStrategy(voice_tag)` + assign `strategy.persona = persona` + `evaluate_voice` → publish one `voice:utterance` per utterance → `evaluate_intelligence` → publish UX events. Ordering enforces think → speak → act causality. `evaluate_voice` calls `strategy.system_prompt()` internally (cleaner than `evaluate_persona`'s `system_prompt` arg, because `VoiceStrategy` carries the prompt via the registry).
   - **D3.5** `frontend/src/store/voice-store.ts` (~45 lines) — Zustand store `{ activeVoice: string ("whisper"), utterancesByVoice: Record<string, VoiceUtterance[]>, setActiveVoice }`. Standalone exported `addUtterance` action (mirrors `persona-store`'s `applyPersonaDelta` pattern; no store methods). `isVoiceUtterance` type guard + `VoiceUtteranceEvent` interface appended to `hooks/sse-parsers.ts`. `use-agent-stream.ts` voice branch dispatches `addUtterance` + `useVoiceStore.getState().setActiveVoice(voice_tag)`.
   - **D3.6** `frontend/src/voice/WhisperLayer.tsx` (~50 lines, new directory) — italic `<aside aria-label="Whisper layer">` rendered before `<Bento />` in `Canvas.tsx` (DOM-order-first so screen readers hear the agent's voice before its content). Opacity 0.6 when `activeVoice === "whisper"`, 0.3 otherwise. `transition: opacity 350ms ease-out` (opacity-only — `prefers-reduced-motion` is satisfied automatically). Local `withStableKeys` helper mirrors D2's TransparencyPanel pattern for content-derived collision-resistant keys.

3. **Two design moves worth noting:**
   - **Stable empty-array sentinel for Zustand v5 selectors** — the plan's `?? []` fallback in `getWhisperUtterances` triggered Zustand v5's "getSnapshot should be cached to avoid an infinite loop" warning, then a `Maximum update depth exceeded` crash on first render with no utterances. Root cause: `useSyncExternalStore` compares snapshots by `Object.is`, and `arr ?? []` mints a fresh empty array each call → "state changed" on every render → infinite loop. Fix: hoisted `EMPTY_UTTERANCES = Object.freeze([])` constant. **Caught by the `renders nothing when no whisper utterances` unit test on first run** — would have shipped as a runtime bug visible immediately when any new visitor loaded the page before an utterance arrived. Worth promoting to `tasks/lessons.md` as a Zustand v5 selector idiom (relevant any time a selector returns a record-keyed array fallback).
   - **`withStableKeys` for utterance list** — the plan-prescribed `${voice_tag}-${idx}-${content.slice(0,12)}` template included `${idx}` and tripped Biome's `noArrayIndexKey`. Refactored to a Map-based collision counter keyed on `${voice_tag}::${content}` — content-derived, suppression-free, identical pattern to D2's TransparencyPanel `withStableKeys`. Same lesson D2 surfaced; same fix.

4. **Process discipline:** direct execution (not subagent-driven). The plan's task code blocks were prescriptive enough that subagents per task would have been pure overhead, especially since D3 tasks are sequentially dependent (D3.4 imports D3.1+D3.2+D3.3; D3.5 imports D3.3 wire shape; D3.6 imports D3.5). Single-file edits with TDD per task — failing test → watch fail → implement minimal → green → commit. Six commits, six clean test runs, zero fixups. Mirrors D2's pattern.

## Key Decisions

- **`VoiceStrategy` is a plain class, not `BaseModel`** — explicit decision, mirrors `ReadStrategy`/`AdaptStrategy`. Pydantic's `model_config` is a reserved `ClassVar`; the strategy's `model_config()` method would shadow it if any strategy were ever migrated to `BaseModel`. The constraint is implicit but stable across the strategies module.
- **`evaluate_voice` lives in a new `domain/voice_evaluation.py`, parallel to `persona_evaluation.py`** — not a generic refactor. D2 set this precedent: parallel functions over premature abstraction. The existing `evaluate_intelligence`/`evaluate_persona` contracts are stable and other tests depend on them; adding a third focused function preserves stability. Refactor when there's a fourth.
- **Whisper-only voice tag in D3 — architecture complete, registry intentionally sparse.** `VOICE_PROMPTS = {"whisper": ...}`. When `select_voice` returns `"letter"` or `"dialogue"`, the `voice_tag in VOICE_PROMPTS` guard short-circuits the voice branch silently. Visitors with trust ≥ 0.4 hear nothing yet. D4 registers `"letter"` (trust 0.4–0.69), D5 registers `"dialogue"` (trust ≥ 0.7). New voices = prompt registration, not protocol change.
- **`select_voice` is open-vocab on input, `VoiceStrategy` is closed-vocab on instantiation.** Steer can request `"podcast"` and the selector returns it unchanged; passing `"podcast"` to `VoiceStrategy()` raises `ValueError`. Separation lets the selector stay pure (no registry coupling) and lets future voices be added at the strategy layer without revisiting the selector.
- **PERSONA_DELTA → VOICE_UTTERANCE → UX events ordering is load-bearing** — preserves visitor-perceived causality (think → speak → act). The voice consumes the freshly-published persona because the persona delta has already been bus-published before voice generation begins. The same `_run_adaptation` invocation publishes all three event types in order on the bus.
- **Stable empty-array sentinel as Zustand v5 selector idiom** — promoted in spirit (see Accomplished). Any selector that returns `state.someRecord[key] ?? []` needs an identity-stable fallback or it will infinite-loop via `useSyncExternalStore`. A reasonable lessons.md candidate after one more occurrence.

## Blockers

- **D4 implementation has not started** — letter voice for trust band 0.4–0.69. Plan task list is in `specs/006-agent-is-the-page/plan.md` slice D4. Mirrors D3 structure: register `LETTER_PROMPT` in `VOICE_PROMPTS`; create `LetterPanel.tsx` that renders when `activeVoice === "letter"`; whisper stays visible at 0.3 opacity (cohabitation, not replacement).
- **Triple LLM round-trips per adapt cycle now in flight** — D3 added a third LLM call (read + voice + adapt) on every escalation. The 2s debounce planned for D9 may need to land earlier than scheduled; flag this once a manual smoke test produces dev-cost observations.
- **`develop` 133 commits ahead of `origin/develop`** — unchanged push posture. User decision pending.
- **Pre-existing backend ruff issues** — 12 errors in untouched files (`tests/test_validation.py`, `src/app/domain/strategies/*.py`); 7 files would reformat (also pre-existing). Untouched this session.
- **Pre-existing frontend Biome issues** — `src/__tests__/SkillTag.test.tsx:16` (noNonNullAssertion), `src/__tests__/Canvas.test.tsx` (format), `src/index.css:232-233` (noImportantStyles ×2). Untouched this session.
- **No manual smoke test of the D3 whisper loop yet.** Wiring is proven by 14 backend + 9 frontend + 6 e2e tests. End-to-end demo with `LLM_API_KEY` set in the running backend would confirm whisper utterances arrive on the same bus subscription a low-trust visitor's PERSONA_DELTA travels, render in the gutter, and dim correctly when (eventually) `activeVoice` changes. Operational verification, not a code blocker — and it doubles as the cost-debounce datapoint above.

## Next Step

**Run Slice D4 of FEAT-006 — letter voice + LetterPanel.** Trust band 0.4–0.69. Mid-confidence visitor sees a "cover-letter pitch" surface as the foreground voice; whisper stays visible at reduced opacity (cohabitation per spec line 226–229).

**Concrete starting state for fresh context:**
- Branch start point: `develop` @ `47fb3ab` (post-D3 merge).
- New branch name: `feat/006-d4-letter` from `develop`.
- Plan: `specs/006-agent-is-the-page/plan.md` Slice D4 (mirrors D3 structure: register `LETTER_PROMPT` → ship `LetterPanel.tsx` → adjust opacity logic so whisper backgrounds when letter is active).
- D3's substrate is in place: `VoiceStrategy` engine, `VOICE_PROMPTS` registry, `voice_utterance_event` formatter, frontend `useVoiceStore` + `isVoiceUtterance` guard + stream branch, `WhisperLayer` precedent for layout. D4 reuses everything except adds one prompt + one component.
- LLM_API_KEY in `backend/.env` works — D4 dev should include manual smoke-test passes (and would also exercise D3's whisper loop incidentally via low-trust runs).

### Backlogged (not for next session unless user redirects)

- **Manual smoke test of D3 whisper loop with `LLM_API_KEY` set** — verify whisper utterances render in the gutter under a real Anthropic round-trip; capture cost observations for the debounce-priority decision.
- **Push `develop` to `origin`** — 133 commits unpushed. User decision pending.
- **Pre-existing lint sweep** (SkillTag noNonNullAssertion, Canvas.test format, index.css `!important` ×2, ruff E501 across test_validation/strategies). Standalone ~5-min slice.
- **Cost debounce for read+voice+adapt cycle** (D9-scoped, may land sooner). Currently 3 LLM calls per escalation; need real-LLM dev observations to size the actual spend.
- **Promote Zustand v5 stable-sentinel idiom to `tasks/lessons.md`** if/when it surfaces in another store. Currently a single occurrence; lessons.md threshold is 2+.
- **Bento cohesion beyond tiling** (editorial rhythm). Distinct problem; needs its own brainstorm.
- **Tooling-hooks slice (cairn cherry-pick)** — still backlogged behind feature work.

---

## Previous State (2026-04-26, post-Slice-D2 persona on the wire, merged into develop)

Slice D2 of FEAT-006 ("Agent IS the Page") **shipped and merged into `develop`** via `--no-ff` ceremony (merge commit `c8e22c8`). **First visible end-to-end beat from FEAT-006 is now live:** when the adapt cycle fires, the backend runs `evaluate_persona` alongside `evaluate_intelligence`, formats the result as a `persona:delta` AG-UI CustomEvent, and publishes it through `SessionEventBus` ahead of the UX events. The frontend stream hook routes it into a new `usePersonaStore`; `TransparencyPanel` now reads "What the agent thinks of you" — rationale + trust + per-observation cards (dimension / value / confidence / rationale). No voice rendering yet — that's D3+.

**Branch state:** `develop` at `c8e22c8`. `feat/006-d2-persona-on-wire` carried 6 commits pre-merge:
- `17843b0` — D2.1 `persona_delta_event` SSE formatter (6 tests)
- `47930a0` — D2.2 emit PERSONA_DELTA before UX events (1 new + 1 updated test)
- `535da18` — D2.3 `persona-store` + `isPersonaDelta` type guard (5 + 3 tests)
- `d39978c` — D2.4 route PERSONA_DELTA into `usePersonaStore` (1 new test)
- `3984795` — D2.5 render persona in `TransparencyPanel` (2 new + 3 updated tests)
- `c2d902c` — fixup: typecheck + biome lint clean across D2 (no behavior change)

`develop` is now **125 commits ahead of `origin/develop`** (was 117 pre-D2 per prior catchup; +6 slice commits + 1 merge = +7 expected, observed +8 — minor catchup-count drift, git is authoritative). No push this session.

**Test counts on `develop` (post-merge):** backend pytest **225** (was 218, +7 across D2 — 6 persona_events + 1 signal_route persona-emission), frontend vitest **130** (was 120, +10 across D2 — 5 persona-store + 3 sse-parsers + 1 use-agent-stream + 2 TransparencyPanel.persona, plus 1 prior TransparencyPanel test removed), e2e **6/6** unchanged. pytest 0.85s; vitest 1.94s; e2e 8.2s.

## Accomplished This Session

1. **Slice D2 implementation (TDD-driven, 6 tasks, all green at commit time):**
   - **D2.1** `backend/src/app/adapters/api/persona_events.py` (28 lines) — pure formatter; emits delta semantics where `rationale` and `trust` only appear in the payload when they've changed, while `observations_added` carries the full new persona's observations (id-based coalescing deferred to D9 polish per plan).
   - **D2.2** `backend/src/app/adapters/api/signal_route.py` `_run_adaptation` rewrite — now runs `evaluate_persona(ReadStrategy(), READ_SYSTEM_PROMPT, ...)` first, publishes the delta to the bus, *then* runs `evaluate_intelligence`/UX events. PERSONA_DELTA-before-UX ordering preserves causality from the visitor's POV (think → speak → act). The prior `test_run_adaptation_publishes_events_to_bus` was tightened to mock `evaluate_persona` to `None` so it continues to assert the legacy intelligence-event count of 2.
   - **D2.3** `frontend/src/store/persona-store.ts` (46 lines) — Zustand store with append-only `applyPersonaDelta`. Standalone `getRoleObservations` selector follows project convention. New `isPersonaDelta` type guard appended to `sse-parsers.ts`.
   - **D2.4** `useAgentStream` gains a `isPersonaDelta(data)` branch that calls `applyPersonaDelta`. Imports added to dependency-array-equivalent (the hook reads stable function references, no extra useEffect deps needed).
   - **D2.5** `TransparencyPanel.tsx` renamed and rebuilt around persona. Heading is now "What the agent thinks of you". Empty state = "The agent has not formed a read yet." Decision history kept as a secondary section, only rendered when `decisions.length > 0`. Refactored away from array-index keys via a `withStableKeys` helper that disambiguates legitimate ts+dimension+value collisions with a per-render Map collision counter — keys are stable across re-renders for the append-only prefix.

2. **Process discipline:** Direct execution (not subagent-driven) — the plan's task code blocks were prescriptive enough that subagents per task would have been pure overhead given that D2's tasks are sequential by design (D2.2 imports D2.1; D2.4 imports D2.3; D2.5 reads D2.3). Single fixup commit (`c2d902c`) consolidated typecheck + Biome cleanup across the slice rather than amending each task commit.

3. **Three lint/format issues hit and fixed:**
   - `pushed?.()` typed as `never` in the new `useAgentStream` test (TS couldn't see the prototype-setter mutation). Fix: holder object `{ handler: Handler | null }` instead of bare `let pushed`.
   - Biome's `noArrayIndexKey` flagged the original plan-prescribed `key={...idx}` template; suppression-comment syntax in JSX did not attach to the `.map` callback parameter. Fixed by refactoring to `withStableKeys` (cleaner than a suppression — keys are now derived from observation content, not array position).
   - Biome's empty-constructor warning on `constructor(_url: string) {}` → store the URL on `readonly url: string` (now meaningful even if unused by the test).

## Key Decisions

- **PERSONA_DELTA emits before UX events on the same adapt cycle** — preserves the visitor's perceived causality (the agent's read updates *before* the canvas reorders). Plan-mandated; reaffirmed during D2.2 review of the bus ordering test.
- **`withStableKeys` over `noArrayIndexKey` suppression** — the plan's `${idx}` was a pragmatic choice that turned out to fight Biome. The Map-based collision counter is content-derived, suppression-free, and identical in stability for append-only lists. Net: a small abstraction lift in exchange for strictly better lint posture.
- **Observation deltas ship the full new observations list, not a real diff** — protocol allows it (append-only client-side), and id-based coalescing introduces a per-session prior-persona cache the bus doesn't currently carry. Deferred to D9. The `prior_trust=0.0, prior_rationale=""` call site in `_run_adaptation` is the placeholder for the future cached call.
- **TransparencyPanel keeps decisions list as a secondary section** — the panel's primary content is now persona, but the existing audit trail (DECISION events) is still there when present. Doesn't break prior tests beyond updating the heading text and dropping the obsolete "No decisions yet" empty-state assertion.

## Blockers

- **D3 implementation has not started** — the first voice-rendering slice (whisper voice + StageSelector + WhisperLayer.tsx). Plan task list is in `specs/006-agent-is-the-page/plan.md` slice D3 (~5 source files). D3 introduces the agent's first *spoken* output on the page; D2's TransparencyPanel only shows the agent's *thinking*.
- **`develop` 125 commits ahead of `origin/develop`** — unchanged push posture. User decision pending.
- **Pre-existing backend ruff E501 errors** — 12 still in untouched files (`tests/test_validation.py`, `src/app/domain/strategies/*.py`). Untouched this session.
- **Pre-existing frontend Biome lint issues** — `src/__tests__/SkillTag.test.tsx:16` (non-null assertion), `src/__tests__/Canvas.test.tsx` (formatting), `src/index.css:232-233` (`!important` warnings). Untouched this session.
- **No manual smoke test of the D2 visible loop yet.** Wiring is proven by 7 backend tests + 11 frontend tests + 6 e2e. End-to-end demo with `LLM_API_KEY` set in the running backend would confirm a real Anthropic round-trip emits both PERSONA_DELTA and UX events on the same bus subscription. Not a code blocker — operational verification, identical pattern to C2 smoke test.

## Next Step

**Run Slice D3 of FEAT-006 — whisper voice + StageSelector.** The agent's first spoken beat: low-trust visitors (trust 0.0–0.4) see ambient italic gutter observations next to the bento.

**Concrete starting state for fresh context:**
- Branch start point: `develop` @ `c8e22c8` (post-D2 merge).
- New branch name: `feat/006-d3-whisper` from `develop`.
- Plan: `specs/006-agent-is-the-page/plan.md` Slice D3 (~5 source files: voice tag registry + whisper prompt + `VoiceStrategy` + `StageSelector` pure function + frontend `useVoiceStore` + `WhisperLayer.tsx`).
- D3 closes the loop from "agent thinks" (D1+D2) to "agent speaks." `StageSelector` is a pure function `(persona.trust, visitor_steer) → voice_tag`; D3 only wires the whisper branch (trust < 0.4). Letter (D4) and dialogue (D5) come later.
- LLM_API_KEY in `backend/.env` works — D3 dev can include manual smoke-test passes.

### Backlogged (not for next session unless user redirects)

- **Manual smoke test of D2 visible loop with `LLM_API_KEY` set** — confirm PERSONA_DELTA + UX events arrive on the same bus subscription and the panel updates as expected. Standalone task, doesn't block D3.
- **Push `develop` to `origin`** — 125 commits unpushed. User decision pending.
- **Pre-existing lint issues** (SkillTag non-null, Canvas formatting, index.css `!important`, ruff E501 in test_validation/strategies). Clean-up sweep, ~5-min slice if done in isolation.
- **Cost debounce for AdaptStrategy + ReadStrategy** — D2 just doubled the LLM round-trips per adapt cycle (intelligence + persona). Real-LLM observations will tell us whether the 2s debounce planned for D9 needs to land sooner.
- **Bento cohesion beyond tiling** (editorial rhythm). Distinct problem; needs its own brainstorm.
- **Tooling-hooks slice (cairn cherry-pick)** — still backlogged behind feature work.

---

## Previous State (2026-04-26, post-C2 smoke-test verification — no code changes)

**Operational verification session, not a code session.** No source files changed; working tree clean. Branch state and test counts identical to prior catchup: `develop` at `80d0674` (post-D1 merge), backend pytest **218**, frontend vitest **120**, e2e **6/6**, `develop` **117 commits ahead of `origin/develop`** (was 116; the +1 is a small drift, likely accumulated count mistakes across past handoffs — git is authoritative).

**The C2 visible adapt loop was smoke-tested end-to-end via Playwright MCP + dev-log instrumentation, with `LLM_API_KEY` from `backend/.env` and a real Anthropic round-trip.** Verdict: **PASS at all three evidence layers.**

- **Wire/network:** browser opened exactly **1** persistent stream `GET /api/agent/stream?session_id=be50590e-...` (the C2 consumer subscription). Sent **8** `POST /api/agent/signal` over ~12s of activity. The shared `session_id` join key (frontend's `portfolio.sid` in `sessionStorage` ↔ backend's `SessionEventBus` channel) was confirmed identical on both sides.
- **Backend:** **0** `Background adaptation failed` log lines. Real LLM call completed under load; `evaluate_intelligence` parsed without errors.
- **DOM (visible):** bento bottom row reordered after activity. The card I last hovered + clicked (`GenAI Code Migration`) was promoted from rightmost (x=703) to leftmost (x=39); `Senior Consultant` and `Senior Software Engineer` shifted right. Top row (Hero + Salama) unchanged. Card dimensions identical (328×359), confirming `AdaptStrategy` reorders/promotes but doesn't resize — resizing remains a local breathing-bento dwell behavior.
- **Latency:** ~4–6s from last hover to visible reorder under real LLM. Felt usable but slower than mocks suggested.

**What this verifies that the test suite can't:** real Anthropic auth + parsing under live conditions; the producer-consumer rendezvous on `SessionEventBus` via the shared client-generated UUID; that the long-lived SSE connection survives a `BackgroundTasks` scheduling cycle and delivers new events. Tests use a shared in-memory bus and mocked `EventSource`; they could pass while any of the above were broken in the same direction.

**Implication for D2:** the substrate is operationally proven. D2 (which extends `signal_route._run_adaptation` to also emit `PERSONA_DELTA` events through the same bus) can be built with confidence that any failure during dev work will be in the new code path (ReadStrategy invocation, formatter, `isPersonaDelta` guard, `useAgentStream` branch) — not in the bus or long-lived subscription transport.

## Accomplished This Session

1. **Agentic smoke test of C2 visible adapt loop** using Playwright MCP browser tools + `tail`-style dev-log inspection. No screenshots needed; evidence was network counts, backend log greps, and DOM `getBoundingClientRect()` deltas captured via `browser_evaluate`.

2. **Three-layer evidence captured and compared baseline → post-activity:**
   - Baseline DOM snapshot saved at `.playwright-mcp/baseline-snapshot.md` (gitignored).
   - Post-activity snapshot saved at `.playwright-mcp/post-activity-snapshot.md` (gitignored).
   - Full backend run log retained at `/tmp/portfolio-dev.log` (transient).

3. **Dev-loop dependency map confirmed:** `portfolio.sid` in `sessionStorage` is the load-bearing client-side state — without it, signals POST to one session_id and the EventSource subscribes to a different one and the bus fan-out fails silently. Confirmed both sides use the same UUID.

4. **One operational pitfall surfaced and recorded** (added to `tasks/lessons.md`): readiness-polling for an SSE-serving dev server should probe `/openapi.json` (or any non-streaming route), never the streaming endpoint. `curl --max-time 1` against a streaming response returns timeout exit 28 even when the server is fully up, and an `until` loop combined with `-fsS` can produce hundreds of phantom GETs in the access log that look like a frontend reconnect bug. Lost ~2 minutes diagnosing the noise before realizing it was self-inflicted.

5. **Removed stale blocker:** "Manual smoke test of the C2 visible loop pending" carried forward through 2 prior handoffs. Now closed.

## Key Decisions

- **No new ADRs** — operational verification only, no architectural change.
- **No code changes** — the smoke test is a runtime probe, not a fix or feature. STATUS.md and `tasks/lessons.md` are the only files modified this session.
- **D2 starting state is the same as it was before this session** — no point pre-creating the D2 branch from this session's clean tree. Fresh session starts from `develop` @ `80d0674`.

## Blockers

- **D2 implementation has not started** — the first visible-beat slice. D2 wires `PERSONA_DELTA` SSE events into `signal_route._run_adaptation`, parses them in the frontend, and renders the persona in `TransparencyPanel`. Plan task list is in `specs/006-agent-is-the-page/plan.md` slice D2 (~6 tasks).
- **`develop` 117 commits ahead of `origin/develop`** — unchanged push posture. User decision pending.
- **Pre-existing backend ruff E501 errors** — 12 still in untouched files (`tests/test_validation.py`, `src/app/domain/strategies/*.py`).
- **Pre-existing frontend Biome lint errors** — `src/__tests__/SkillTag.test.tsx:16` (non-null assertion), `src/__tests__/Canvas.test.tsx` (formatting), `src/index.css` (`!important` warnings).

## Next Step

**Run Slice D2 of FEAT-006 — the first visible-beat slice.** C2's substrate is operationally proven, so D2 can build on it with high confidence.

**Concrete starting state for fresh context:**
- Branch start point: `develop` @ `80d0674` (unchanged from prior catchup; this session changed only STATUS + lessons).
- New branch name: `feat/006-d2-persona-on-wire` from `develop`.
- Plan: `specs/006-agent-is-the-page/plan.md` Slice D2 (~6 tasks: D2.1 persona_delta_event SSE formatter → D2.2 wire ReadStrategy + emit PERSONA_DELTA from signal_route → D2.3 frontend persona-store + isPersonaDelta guard → D2.4 useAgentStream branch → D2.5 TransparencyPanel persona render → D2.6 verify+merge).
- D2 deliberately ships with **no voice rendering** — that's D3+. D2's whole point: visitor opens TransparencyPanel and sees what the agent thinks of them (rationale, trust, observations). First visible UX beat from FEAT-006.
- LLM_API_KEY in `backend/.env` works — D2 dev can include manual smoke-test passes in the loop.

### Backlogged (not for next session unless user redirects)

- **Push `develop` to `origin`** — 117 commits unpushed. User decision pending.
- **Pre-existing lint issues** (SkillTag non-null, Canvas formatting, index.css `!important`, ruff E501 in test_validation/strategies). Clean-up sweep, ~5-min slice if done in isolation.
- **Cost debounce for AdaptStrategy** — surfaced in C1, scoped to D9 in spec but could land sooner if real-LLM cost in dev exceeds expectations (the ~4–6s round-trip per adapt cycle observed today suggests cost will be modest at typical visitor pacing, but worth monitoring once D2+ generate more traffic).
- **Bento cohesion beyond tiling** (editorial rhythm). Distinct problem; needs its own brainstorm.
- **Tooling-hooks slice (cairn cherry-pick)** — still backlogged behind feature work.

---

## Previous State (2026-04-26, post-Slice-D1 persona protocol scaffold, merged into develop)

Slice D1 of FEAT-006 ("Agent IS the Page") **shipped and merged into `develop`** via `--no-ff` ceremony (merge commit `80d0674`). The persona protocol now has its backend foundation: typed wire models (`Persona`, `Observation`, `SignalRef`), a `ReadStrategy` that builds a multivoice-aware prompt, and an `evaluate_persona` orchestrator that runs it through the LLM port. **Pure backend foundation — no events on the wire, no UI change.** D2 is the first visible-beat slice (PERSONA_DELTA + TransparencyPanel render).

**Branch state:** `develop` at `80d0674`. `feat/006-d1-persona-scaffold` carried 6 commits pre-merge:
- `f013913` — D1.1 Persona/Observation/SignalRef Pydantic models
- `c25cd16` — chore: FEAT-006 implementation plan (3,522 lines, 9-slice walking skeleton)
- `b05b488` — D1.2 ReadStrategy with multivoice-seeded prompt
- `a29f93e` — D1.2 review fixups (prompt grounding for source_signals id space + tightened multivoice test assertion)
- `76bd479` — D1.3 evaluate_persona orchestrator
- `8d86eaa` — D1.3 review fixup (kwargs test asserts user_prompt + max_tokens)

`develop` is now **116 commits ahead of `origin/develop`** (was 108 pre-D1 per prior catchup; +7 from this session = 115; reconcile with git's actual 116 — minor catchup-count drift, not a real discrepancy). No push this session.

**Test counts on `develop` (post-merge):** backend pytest **218** (was 198, +20 across D1 — 7 persona_model + 9 read_strategy + 4 persona_evaluation), frontend vitest **120** unchanged, e2e **6/6** unchanged. pytest 0.86s.

**Process discipline this session:** Subagent-driven development with two-stage review per task (spec compliance → code quality). Both review passes caught real findings: D1.2 review I-1 (prompt didn't bind `source_signals` to the `s0..s19` id space — would have caused runtime validation failures downstream) + I-2 (multivoice test assertion was too lenient); D1.3 review minor (kwargs test missing `user_prompt`/`max_tokens`). All applied as fixup commits before merge.

## Accomplished This Session

1. **`writing-plans` skill executed against the FEAT-006 spec.** Produced `specs/006-agent-is-the-page/plan.md` (3,522 lines) — 9 slices × 38 tasks with full TDD code blocks for D1–D6 and compressed task descriptions for D7–D9 (pattern repeats).

2. **Subagent-driven execution of Slice D1 (4 tasks, fresh subagent per task, two-stage review per task):**
   - D1.1 — `backend/src/app/domain/persona.py` (32 lines) + `backend/tests/test_persona_model.py` (107 lines, 7 tests). Open vocabulary on `dimension`, `Field(min_length=1)` on `source_signals`, trust + confidence clamped 0..1, append-only via convention (not `frozen=True` — see ADR-0010 discipline 1).
   - D1.2 — `backend/src/app/domain/strategies/read.py` (87 lines) + `backend/tests/test_read_strategy.py` (71 lines, 9 tests). Plain class (not BaseModel — avoids Pydantic's reserved `model_config` shadowing) mirroring `adapt.py` shape. Prompt seeds the four soft conventions (role/intent/depth/source) without locking them into the type.
   - D1.3 — `backend/src/app/domain/persona_evaluation.py` (39 lines) + `backend/tests/test_persona_evaluation.py` (78 lines, 4 tests). Parallel function alongside `evaluate_intelligence` rather than generic refactor — matches the existing pattern, leaves the stable code path untouched.
   - D1.4 — verify-and-merge. 218/218 backend tests, ruff clean on D1 files, `--no-ff` merge into develop.

3. **Two review-driven fixups landed pre-merge:**
   - D1.2 fixup `a29f93e`: prompt now explicitly tells the LLM that `source_signals` must cite ids from the "Recent signals" block (e.g. `{"kind": "signal", "id": "s3"}`), not card ids or invented ids. Closes ADR-0010 discipline 3 grounding gap.
   - D1.3 fixup `8d86eaa`: kwargs test now also asserts `max_tokens == 1024` and `"Visitor referrer:" in user_prompt`.

## Key Decisions

- **Parallel `evaluate_persona` alongside `evaluate_intelligence`, not a generic refactor.** The existing `evaluate_intelligence` runtime-checks `isinstance(raw, IntelligenceResult)` and runs validation specific to that type. Other tests depend on its exact contract. Cleaner to have two focused functions than retrofit generics. Documented in plan; reaffirmed by both reviewers.
- **`ReadStrategy` is a plain class, not a `BaseModel`.** Mirrors `adapt.py`/`select.py`/`compose.py`. The `model_config` method name would shadow Pydantic's reserved `ClassVar` if any strategy ever became a `BaseModel`. The constraint is implicit but stable across the strategies module.
- **Open-vocabulary discipline preserved at the type level.** `Observation.dimension: str` (not `Literal[...]`). The four common dimensions (role/intent/depth/source) live in the prompt's soft conventions, never in the type. This is the load-bearing design choice from ADR-0010 — adding a new dimension never requires a schema migration.
- **Append-only enforced by convention, not by `frozen=True`.** ADR-0010 discipline 1 calls this out explicitly. A frozen `Observation` would block legitimate use cases later (e.g. attaching post-hoc analytics).

## Blockers

- **D2 implementation has not started** — the first visible-beat slice. D2 wires `PERSONA_DELTA` SSE events into `signal_route._run_adaptation`, parses them in the frontend, and renders the persona in `TransparencyPanel`. Plan task list is in `specs/006-agent-is-the-page/plan.md` slice D2 (~5 tasks).
- **`develop` 116 commits ahead of `origin/develop`** — unchanged push posture from prior sessions. Decision still pending; not autonomously pushing.
- **Pre-existing backend ruff E501 errors** — 12 still in untouched files (`tests/test_validation.py`, `src/app/domain/strategies/*.py`). Not touched this session.
- **Pre-existing frontend Biome lint errors** — `src/__tests__/SkillTag.test.tsx:16` (non-null assertion), `src/__tests__/Canvas.test.tsx` (formatting), `src/index.css` (`!important` warnings). Not touched this session.
- **Manual smoke test of the C2 visible loop still pending** — needs `LLM_API_KEY` in the running backend. Independent of D1; carries forward.

## Next Step

**Run Slice D2 of FEAT-006** — the first visible-beat slice. Either:
1. Continue subagent-driven execution from `specs/006-agent-is-the-page/plan.md` slice D2.
2. Manually smoke-test D1 + the existing C2 loop with `LLM_API_KEY` set before adding more code (operational verification, not a code blocker).

Project convention is "ONE vertical slice per session," which is why D2 starts a fresh session rather than continuing here. The plan's D2 outcome: visitor opens TransparencyPanel and sees what the agent thinks of them (rationale, trust, observations) — the first visible UX beat from FEAT-006.

**Concrete starting state for D2's session:**
- Branch start point: `develop` @ `80d0674` (post-D1 merge).
- Plan: `specs/006-agent-is-the-page/plan.md` Slice D2 (~5 tasks: D2.1 persona_delta_event SSE formatter → D2.2 wire ReadStrategy + emit PERSONA_DELTA from signal_route → D2.3 frontend persona-store + isPersonaDelta guard → D2.4 useAgentStream branch → D2.5 TransparencyPanel persona render → D2.6 verify+merge).
- New branch name: `feat/006-d2-persona-on-wire` from `develop`.
- D2 deliberately ships with **no voice rendering** — that's D3+. D2's whole point is "the protocol works end-to-end and is rendered as the agent's read of you, even before the agent learns to speak."

### Backlogged (not for next session unless user redirects)

- **Push `develop` to `origin`** — 116 commits unpushed. User decision pending.
- **Manual smoke test of C2 + D1 with `LLM_API_KEY` set.** Independent of D2 plan.
- **Pre-existing lint issues** (SkillTag non-null, Canvas formatting, index.css `!important`, ruff E501 in test_validation/strategies). Clean-up sweep, ~5-min slice if done in isolation.
- **Cost debounce for AdaptStrategy** — surfaced in C1, scoped to D9 in spec but could land sooner.
- **Bento cohesion beyond tiling** (editorial rhythm). Distinct problem; needs its own brainstorm.
- **Tooling-hooks slice (cairn cherry-pick)** — still backlogged behind feature work.

---

## Previous State (2026-04-25, post-Slice-C2 + FEAT-006 brainstorm, merged into develop)

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
