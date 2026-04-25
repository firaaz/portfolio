# FEAT-006 — Agent IS the Page

**Shape Up pitch · 2026-04-25**

## Problem

The adapt loop is wired end-to-end as of slice C2. Signals flow `Canvas → useCardSignals → /api/agent/signal → AdaptStrategy → SessionEventBus → /api/agent/stream → useAgentStream → bento layout`. Hover a card past dwell, the tier escalates, the LLM runs, the layout shifts. Mechanically, the agent is alive.

The visible artifact reads as **"13 bento cards that resize."** That is a familiar form (cards in a grid, salience-ranked) with novel mechanics underneath. Visitors don't see a thinking presence; they see a layout that adapts. Three concrete gaps observed during this brainstorm:

1. **Presence is inert.** `PresenceDot` pulses identically whether the agent is idle, observing, thinking, or adapting. `CommandBar` is reactive (Cmd+K only). `TransparencyPanel` is hidden behind a click and lists past decisions as records, not the agent's *current* read of the visitor. The components exist; they don't *express*.
2. **Causality is decoupled.** A 1.2s dwell + 1–2s LLM round-trip means the visible adaptation lands ~3s after the gesture. By then the moment is gone. The visitor doesn't feel "I caused that."
3. **Narrative is thin.** Cards rearrange, but the page doesn't *say* anything. No agent voice in the surface — no observation, no pitch, no answered question. The transparency rationale lives in a panel, not on the page.

The thesis from day one — captured in memory as both `project_design_direction.md` ("agent = content not layout") and reinforced by user this session as **"agent IS the page"** — was always that the portfolio's content, voice, and form should *emanate* from the agent's read of the visitor, not be a static page that the agent decorates from behind. Slices to date built the loop; **no slice has yet built the agent's expressive surface.** This is that work.

The portfolio is the demo. The wow we're chasing is the visitor experience of *reading the agent itself*, not reading a page that has been agent-tuned. The constraint is sharp: the experience must be **runtime-LLM-dependent** — content that did not exist before this visit, which is what eliminates pre-computed variants, hardcoded persona texts, build-time decisions. The agent IS the page means the agent's voice is the content.

## Appetite

**Feature-scale: ~9 slices, multi-week.** Walking-skeleton cut: D1+D2 prove the protocol end-to-end with no rendered voice (the visitor opens TransparencyPanel and sees what the agent thinks of them — the first visible end-to-end beat, no UI surfaces yet); D3+D4+D5 add voices in confidence order; D6 wires visitor steer; D7 expands telemetry; D8 handles mobile; D9 polishes with EDD evals.

**One new ADR (ADR-0010 — Persona Protocol).** All other decisions (voice prompts, stage thresholds, frontend rendering style) are implementation that lives in code and this spec.

**Each slice ≤5 files, shippable independently.** No slice produces a worse UX than today — the walking-skeleton cut means the worst case is "TransparencyPanel shows persona, page looks the same as today." Each subsequent slice strictly adds.

## Solution

### The thesis: agent IS the page through three voices

The agent's expression on the page is **three voices that cohabitate with stage lighting**. The active voice is foregrounded; lower-confidence voices remain visible at reduced opacity. The page **densifies** as the agent's read deepens — visitor watches the agent grow more articulate.

| Voice | When | What | Visual |
|---|---|---|---|
| **whisper** | trust 0.0–0.4 | 1-line italic observations of what the agent is noticing about the visitor | gutter italics around bento, opacity 0.6 |
| **letter** | trust 0.4–0.7 | 2–3 sentence cover-letter pitch addressed to inferred role(s) | Zilla Slab serif at top of canvas |
| **dialogue** | trust ≥ 0.7 OR visitor steered (Cmd+K) | inferred question + agent's prose answer + bento receipts highlighted | Q above bento, A below, receipts bordered |

Voices coexist. When dialogue activates, letter shrinks to a small italic line at top; whispers fade further but remain ambient. The page never erases prior agent expression within a session — that would be "agent operates the page," which we've ruled out. The page accumulates the agent's expression — that's "agent IS the page."

The three voices are **expressions of growing confidence in the read**, not three separate features. Stage choice is a property of the speaker (the agent), not a property of the visitor.

### PROTOCOL-001 — The Persona Protocol

The protocol is the typed wire format separating "agent thinks" (`ReadStrategy`) from "agent speaks" (`VoiceStrategy`). This is the load-bearing decision and gets its own ADR (ADR-0010). The protocol stays minimal: 3 types, 2 new server-pushed event types on top of AG-UI's existing five-verb vocabulary, 1 extension to `VisitorContext`, 0 new client-pushed events.

#### Types

```
Persona     = { rationale: str,
                observations: list[Observation],   # multi-valued per dimension
                trust: float }                      # 0.0–1.0

Observation = { dimension: str,                     # OPEN vocabulary
                value: str,
                confidence: float,
                rationale: str,
                source_signals: list[SignalRef],
                ts: datetime }

Ref         = { kind: "signal" | "observation" | "item",
                id: str }
```

Open vocabulary on `dimension` — the agent invents dimension names as patterns emerge (`role`, `intent`, `depth`, `source`, `tonal-pref`, `decision-pace`, ...). No closed enum. Observations are append-only; the persona is the cumulative read; multiple observations can share a dimension (multivoice).

#### Server → client events (additive to AG-UI)

```
PERSONA_DELTA = { rationale?: str,                  # if changed
                  trust?: float,                    # if changed
                  observations_added: list[Observation],
                  ts }

VOICE_UTTERANCE = { voice_tag: str,                 # OPEN — "whisper" | "letter" | "dialogue" | future
                    utterance_kind: str,            # OPEN — "observation" | "pitch" | "question" | "answer" | "receipt"
                    content: str,
                    references?: list[Ref],
                    ts }
```

Open vocabulary on `voice_tag` and `utterance_kind` — same protocol property as `dimension`. New voice types (e.g., `"podcast"`, `"peer-debate"`) can be introduced by the agent without protocol change. Clients gracefully degrade unknown tags via `FallbackUtterance`.

#### Extended type — VisitorContext

```
VisitorContext now carries:
  referrer_type: ReferrerType                       # existing
  viewport: { width, height, pointer_type, prefers_reduced_motion }   # NEW
  landing_path: str                                                     # NEW
  user_agent_summary: { family, platform }                              # NEW — aggregated, no full UA
```

Sent **once** on session start, not as repeating events. Privacy-budgeted: never the full UA string, never canvas/audio/hardware fingerprints.

#### Client → server (existing endpoints, no new wire events)

- `POST /api/agent/signal` — behavioral signals (existing vocabulary: `hover | dwell | click | skip` per card)
- `POST /api/agent/command` — Cmd+K query (repurposed: now triggers `ReadStrategy` + `VoiceStrategy` and emits results to the bus, replacing its current `ComposeStrategy`-only behavior)

#### Discipline (codified in ADR-0010)

Three questions every proposed protocol addition must answer:

1. **Why must this be on the wire?** — could it be derived by the agent from existing data? could it be implementation-specific? could it be HTTP instead of an event?
2. **What breaks if a client ignores it?** — if "nothing important," it shouldn't be in the protocol.
3. **Is it open-vocabulary?** — would a discriminated union of subtypes be needed? if yes, smell — collapse to `tag: str` + open value.

### Persona creation mechanism — ReadStrategy is load-bearing

The Persona is the wire shape; **`ReadStrategy`'s prompt is what populates it.** The prompt encodes soft conventions (which dimensions are common, when to emit them, how to multivoice) without enums. Protocol stays open; agent enforces discipline via prompting.

**Inputs:** prior `Persona`, recent signal stream (last N batches, ordered), recent Cmd+K command submissions (visible to the agent layer because `/api/agent/command` triggers `ReadStrategy` synchronously), `VisitorContext`, content catalog summary.

**Outputs:** updated `Persona`, `PERSONA_DELTA` event published to the C2 bus.

**Prompt structure (sketch — final lives in `domain/strategies/read.py`):**

```
SYSTEM:
You read visitor behavioral signals and infer who they are.
Output observations with typed dimensions.

CORE DIMENSIONS (use these labels when applicable; extend if a pattern
doesn't fit any of them):
  - role    : the kind of person they appear to be
              (common values: recruiter, engineer, founder, builder,
               peer, curious, unknown — composites or novel labels OK)
  - intent  : what they're trying to accomplish
              (common values: hiring, evaluating, learning, comparing, browsing)
  - depth   : how technically deep they're reading
              (common values: technical, outcome-focused, brand-only)
  - source  : where their journey started (referrer-derived)

MULTIVOICE RULE:
When the visitor exhibits patterns matching multiple roles, EMIT
MULTIPLE observations with the same dimension. Use confidence to
weight your degree of belief. Do not collapse multi-modal visitors
to a single label — voices can address all matched roles.

EXAMPLE (LinkedIn referrer + Salama dwell + Education skip):
  - {dim="role", value="recruiter", confidence=0.4,
     rationale="LinkedIn typically signals hiring context"}
  - {dim="role", value="engineer", confidence=0.6,
     rationale="dwell pattern on tenancy section + LangGraph diagram
     shows direct technical reading, not surrogate skim"}
  - {dim="depth", value="technical", confidence=0.7,
     rationale="time on architecture detail exceeds time on outcomes"}

CONVENTIONS:
  - Include observation with dim="role" when trust > 0.4
  - source_signals must reference actual signal IDs in the input batch
  - Use new dimension names freely if the seed taxonomy doesn't fit
  - Keep value strings short — composites should be multiple observations,
    not concatenated values
  - Don't restate an observation if it doesn't materially differ from a recent one
```

**Firing:** every signal batch, debounced 2s (also closes the cost-debounce backlog item from C2).

**Pattern derivation** (reading path, revisits, skips, engagement intensity) happens **inside the prompt**, not as pre-computed signals. The protocol carries raw signals; the agent infers patterns. If token cost becomes a concern, small pure-Python helpers in the agent layer can summarize signals into structured text inputs — still inside the agent layer, protocol unchanged.

### VoiceStrategy — single strategy, voice-tag parameterized

No `MarginaliaStrategy` / `LetterStrategy` / `QAStrategy` classes — that's the lock-in we explicitly avoided. One `VoiceStrategy` consults a registry:

```python
voices: dict[str, VoicePrompt] = {
    "whisper":  WHISPER_PROMPT,
    "letter":   LETTER_PROMPT,
    "dialogue": DIALOGUE_PROMPT,
}
```

Adding a fourth voice = registering a new entry. Engine doesn't change.

**Fires on:** stage transition (active voice tag changed), significant Persona update (new observation in a dimension the active voice's prompt cares about), or explicit visitor steer.

**Outputs:** `VOICE_UTTERANCE` events. A whisper voice emits multiple short utterances (one per surfaced observation). Letter voice emits one utterance. Dialogue voice emits a `question` utterance + `answer` utterance + receipt utterances referencing item IDs.

**Voice prompts must:** read multiple role observations and compose across them (multivoice handling — see ReadStrategy example). Output should be specific, not generic — "address every role observation with confidence > 0.3, weighted by confidence."

### StageSelector — pure function, agent layer

```python
def select_voice(persona: Persona, steer: VisitorSteer | None) -> VoiceTag:
    if steer:
        return steer.requested_voice    # Cmd+K override → "dialogue"
    if persona.trust >= 0.7:
        return "dialogue"
    if persona.trust >= 0.4:
        return "letter"
    return "whisper"
```

Three knobs (two trust thresholds + visitor-steer override). No state. Easy to test, easy to tune. Lives in `domain/`.

### Three-layer architecture

| Layer | Owns | Examples |
|---|---|---|
| **Protocol** (PROTOCOL-001) | Wire format. Stable, versioned. | Persona, Observation, PERSONA_DELTA, VOICE_UTTERANCE, open vocabulary on dimension/voice_tag/utterance_kind, source_signals discipline. |
| **Agent** (this portfolio's server) | Implementation choices. Replaceable. | ReadStrategy + VoiceStrategy + StageSelector, voice tag registry + prompts, trust thresholds, debounce, conventions enforced via prompting, LLM provider, cache. |
| **Client** (this portfolio's frontend) | Stylistic rendering. Replaceable. | usePersonaStore, useVoiceStore, WhisperLayer / CoverLetterPanel / DialogueOverlay components, FallbackUtterance for unknown tags, signal collection hooks, Cmd+K → command POST. |

A different agent could speak the same protocol with totally different prompts. A different client could render the same protocol as audio, a chat sidebar, console output. The portfolio is one of N possible implementations of PROTOCOL-001.

### Frontend rendering — cohabitate with stage lighting

```
src/voice/
  WhisperLayer.tsx        # gutter italics, opacity 0.6 → 0.4 → 0.3 across stages
  CoverLetterPanel.tsx    # serif prose at top, scales down in dialogue stage
  DialogueOverlay.tsx     # question + answer + receipt highlights
  FallbackUtterance.tsx   # for unknown voice_tags (graceful degrade — required protocol participant)

src/store/
  persona-store.ts        # parses PERSONA_DELTA, exposes current persona
  voice-store.ts          # holds active utterances per voice_tag, tracks active stage

src/canvas/
  Canvas.tsx              # composes voice layers + bento; manages stage lighting
  Bento.tsx               # existing — receives optional `highlighted: list[item_id]` from dialogue receipts
```

**Visual rules:**
- Foreground voice: Zilla Slab at scale, opacity 1.0, spring entry 350ms ease-out.
- Backgrounded voice: same family, smaller/lighter, opacity 0.3–0.5. Stays visible within session.
- `prefers-reduced-motion`: opacity-only transitions, no transforms (per ADR-0004).
- `PresenceDot`: gains stage-aware visual (dim/normal/glowing for whisper/letter/dialogue). Doesn't react per-signal — that was Approach A and we ruled it out.

**Mobile degradation** (acceptable, not redesigned):
- `WhisperLayer` gutters → collapsed into a "notes" disclosure at top of bento (tap to expand)
- `CoverLetterPanel` → unchanged, scales naturally
- `DialogueOverlay` → unchanged, scales naturally
- Cmd+K → tap PresenceDot to open command bar
- Touch signals are thinner (no hover; tap = click; long-press = dwell). Trust climbs slower; the arc still works on a longer timeline.

### Failure modes

| What breaks | Mitigation |
|---|---|
| LLM unavailable / rate-limited | ReadStrategy doesn't run → trust=0 → page sits in whisper stage with default content. Same as current LLM-disabled path; proven in C2 tests. |
| Wrong inference (looks dumb) | Visible `rationale` in TransparencyPanel + Cmd+K override + trust > 0.4 gate prevents premature commitment + dialogue receipts let visitor verify. |
| Slow inference (latency spike) | Debounce coalesces rapid signals; `PresenceDot` pulse rate signals "thinking"; persona snapshot replayed on stream reconnect. |
| Persona drift / contradiction | Multi-valued observations preserve all readings; ReadStrategy prompt enforces self-consistency check; trust drops on detected contradiction → agent dials back. |
| Hostile signals (dev-tool POSTs) | Per-session rate limit, Pydantic payload validation, batch-size cap, session lifetime cap. Operational, not protocol. |
| Empty / no signals | VisitorContext (referrer + viewport + UA) seeds low-trust initial inference; default bento renders; visit still useful. |
| Unknown voice_tag (client/agent skew) | `FallbackUtterance` renders unknown utterances as plain gutter italic. Protocol property: graceful degrade is first-class, not error. |
| Visitor finds inference creepy | Anti-creepy: rationale plainly stated; TransparencyPanel toggle to disable inference (D9 candidate); session-scoped only. |
| Conflicting voices in cohabitation | Voice prompts share Persona context → should converge; visual hierarchy resolves remaining tension; contradiction → trust drop → dial back. |
| Agent over-emits redundant observations | ReadStrategy prompt instruction to skip restatement; debounce + cache mitigate cost. |

## Rabbit Holes

- **Voice prompt tuning.** Three prompts will need iteration. Restraint: ship simple prompts first. EDD evals (DeepEval, per ADR-0006) cover them in D9. Don't build per-prompt eval harnesses upfront.
- **Mobile rendering redesign.** Disclosure pattern for whispers is enough. Don't redesign the mobile UX from scratch — bento already works on touch; voice layers degrade gracefully.
- **Persona evolution heuristics.** When does the agent "back off" a high-confidence reading? Defer to prompt-level discipline ("if a new observation flatly contradicts a recent one with much higher confidence, emit dim=correction and lower trust"). Don't build state machines for revision logic.
- **Voice contradiction detection.** Could be deeply complex (cross-voice consistency checks, semantic distance metrics). Keep to "trust drop on prompt-detected inconsistency."
- **Cost.** ~8–10 LLM calls/session for ReadStrategy + 1–3 for VoiceStrategy. Debounce + cache mitigate. If this proves expensive in practice, add request-cost budgeting (max N LLM calls/session) — but not in scope for this feature.
- **Stage transitions feeling jarring.** Cohabitation with stage lighting should solve this; if not, add per-stage transition ceremonies (e.g., letter "drafting" animation before content lands). Defer to D9 polish.

## No-Gos

- **No closed enums in the protocol.** `dimension`, `voice_tag`, `utterance_kind` are open strings. New values never require a schema migration. The seed list of common dimensions/voices lives in *prompts*, not types.
- **No persistent persona.** Session-scoped only, dies with `SESSION_TTL_SECONDS`. No cross-session linkage. Aligns with GDPR boundary.
- **No fingerprinting.** UA aggregated to family + platform. No canvas, audio, hardware, IP fingerprints. No precise screen specs.
- **No invisible inference.** TransparencyPanel must always render the current persona — `rationale`, `observations`, `trust`. Visitor can always see what the agent thinks of them and why. Anti-creepy through transparency is a hard requirement.
- **No removing observations.** Append-only. Corrections are new observations (dim=correction or new observation in same dimension with higher confidence), not deletions. Audit trail is the protocol's audit trail.
- **No new HTTP endpoints.** Repurpose `/api/agent/command` for visitor steer; protocol additions through existing event channels.
- **No role taxonomy lockdown.** Even though common roles (recruiter/engineer/founder/builder/peer/curious/unknown) are seeded in the ReadStrategy prompt, they are *not* enumerated in the protocol. The agent can invent novel role labels; voices can address them.
- **No per-utterance device data.** Viewport/UA goes in `VisitorContext` once on connect; never re-emits.

## Slice decomposition (writing-plans will detail)

| # | Name | Outcome | Files (est.) |
|---|---|---|---|
| **D1** | Persona protocol scaffold | `domain/persona.py` types, baseline `ReadStrategy`, prompts, tests. Backend computes persona from signals; emits no events yet. | 4–5 |
| **D2** | Persona on the wire | `PERSONA_DELTA` emitter + parser + `usePersonaStore` + TransparencyPanel renders persona. **First visible end-to-end beat:** open transparency, see what the agent thinks of you. | 5 |
| **D3** | Whisper voice + StageSelector | `VoiceStrategy` + voice tag registry + whisper prompt + `WhisperLayer.tsx` + `useVoiceStore`. **Low-trust visitors see ambient marginalia.** | 5 |
| **D4** | Letter voice | Letter prompt + `CoverLetterPanel.tsx` + Canvas integration + tests. **Trust ≥ 0.4 → cover letter at top.** | 4 |
| **D5** | Dialogue voice | Dialogue prompt + `DialogueOverlay.tsx` + Bento receipt highlighting + tests. **Trust ≥ 0.7 → Q&A with receipts.** | 5 |
| **D6** | Visitor steer (Cmd+K rewiring) | `command_route.py` refactor → emits PERSONA_DELTA + VOICE_UTTERANCE through bus + `FallbackUtterance.tsx`. **Cmd+K forces dialogue with visitor's framing.** | 4 |
| **D7** | VisitorContext expansion | `domain/context.py` extension + `referrer.py` extension + `useInitialContext` hook + tests. **Mobile/desktop inference improves.** | 4 |
| **D8** | Mobile degradation | WhisperLayer disclosure variant + responsive Canvas + e2e mobile spec. | 3 |
| **D9** | Polish + cost debounce + EDD evals | ReadStrategy debounce config + audit-store extensions + `evals/test-persona-inference.py` (DeepEval) + TransparencyPanel toggle to disable inference. | 4 |

Walking-skeleton property: after D2 the entire stack is wired with zero rendered voices; visitor can already see "what the agent thinks of me" in TransparencyPanel. Each subsequent slice strictly adds.

## Related ADRs

- **ADR-0010 — Persona Protocol (PROTOCOL-001)** *(new, accompanying this spec)* — extends ADR-0003's five-verb interaction protocol with a typed persona artifact. Defines the protocol surface, the open-vocabulary discipline, and the 3-question rule for future additions.
- **ADR-0003 — Agent Interaction Protocol** — five-verb base; PERSONA_DELTA and VOICE_UTTERANCE are additive.
- **ADR-0004 — Editorial Canvas & Motion** — `prefers-reduced-motion` opacity-only constraint applies to all voice transitions.
- **ADR-0006 — Testing Frameworks** — D9 EDD evals use DeepEval for ReadStrategy prompt validation.
