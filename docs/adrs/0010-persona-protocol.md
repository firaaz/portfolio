# Persona Protocol (PROTOCOL-001)

## Status
proposed

## Date
2026-04-25

## Participants
Firaaz, Claude (brainstorming session)

## Context and Problem Statement

ADR-0003 defined the agent ↔ UI interaction protocol: five verbs (`focus`, `recede`, `bridge`, `surface`, `signal`) plus salience/agency/tempo state events. That protocol describes *how the canvas changes* in response to agent decisions. It does not describe *the agent's read of the visitor itself.*

FEAT-006 (`specs/006-agent-is-the-page`) introduces the agent's expressive surface — three voices (whisper / letter / dialogue) that are expressions of the agent's growing read. For voices to compose intelligently, they need a typed artifact carrying the agent's current understanding of the visitor: who they are, what they want, why the agent thinks so. This artifact must be:

- **Auditable** — visitor can open `TransparencyPanel` and see what the agent thinks of them and why (anti-creepy through transparency)
- **Reusable across voices** — a single shared "read" so the cover letter and the dialogue answer are addressing the same person
- **Extensible without schema migrations** — new agent implementations or new voices may need to express dimensions the original design didn't anticipate
- **Wire-format-stable** — clients must be able to parse it consistently across agent implementations

Three approaches were considered during brainstorming:

1. **Embed persona inference inside `VoiceStrategy`'s prompt** — single LLM call generates inference + prose simultaneously. No separate persona artifact.
2. **Per-stage strategies** (`MarginaliaStrategy`, `LetterStrategy`, `QAStrategy`) each handling their own inference + voice.
3. **Separate `ReadStrategy` (produces typed Persona) + `VoiceStrategy` (consumes it)** with a typed wire format between them.

User feedback rejected (1) and (2) because they "lock in the types of interactions" — codifying voices in either prompt logic or class taxonomy makes adding a new voice (e.g., `"podcast"`, `"peer-debate"`) a structural change. (3) keeps voices as pluggable consumers of a shared protocol; new voices can be added without changing the inference layer.

## Decision Drivers

- **Protocol-first design** — explicit user constraint: "we are building a protocol." This portfolio is the first implementation; future implementations (different portfolios, different surfaces) should be able to speak the protocol without inheriting this portfolio's specific UI choices.
- **Anti-creepy via transparency** — every inference must be visible to the visitor, with rationale and source signals, in plain language.
- **Lightweight wire surface** — every event in the protocol is a forever-cost (parsing code, emitter logic, downstream tooling). Audit each addition.
- **Multivoice handling** — visitors are often multi-modal (e.g., technical recruiter ≈ recruiter + engineer). The protocol must represent multiple concurrent inferences in the same dimension.
- **Open vocabulary preserves protocol-property** — closing enumerations (role, intent, voice tag, utterance kind) re-introduces the lock-in we explicitly rejected. Conventions must live in *prompts*, not *types*.
- **Compatible with existing infrastructure** — the C2 `SessionEventBus` already carries arbitrary AG-UI events keyed by session_id. Persona events should ride that channel without new transport.

## Considered Options

1. **Closed-schema Persona** (typed slots: `role: RoleEnum, intent: IntentEnum, depth: DepthEnum, ...`) — maximum stability and tooling, but locks in the ontology. New dimensions require schema migration. Rejected: the user-articulated failure mode of Approaches (1)/(2) above.
2. **Pure-observations Persona** (open `dimension: str` for everything; no privileged fields) — most agent-native; agent extends its own vocabulary. Hardest to operate on — voice prompts and audit UI must handle arbitrary dimension keys with no spine.
3. **Hybrid Persona with stable spine + open observations** (`core.role + core.intent + ... + observations[]`) — gives voices reliable slots while preserving extensibility. Eventually rejected during brainstorm because even a small `core` re-introduces lock-in: which dimensions are "core" is itself a closed decision, and minimal cores still need a schema to evolve.
4. **Pure-observations Persona with shared cross-cutting metadata** (`rationale + observations[] + trust`) — three top-level fields, all of which are *about the read as a whole* (not about any single observation). Open vocabulary on dimensions. Multi-valued per dimension. Append-only. **Chosen.**

The path through (1) → (3) → (4) is the trace of the brainstorm — each iteration removed a piece of structure that turned out to be lock-in disguised as convenience.

## Decision Outcome

**Adopt Approach 4: a minimal Persona protocol with three top-level fields, open-vocabulary observations, and append-only multi-valued semantics.**

### Types

```
Persona     = { rationale: str,
                observations: list[Observation],
                trust: float }                       # 0.0–1.0

Observation = { dimension: str,                      # OPEN vocabulary
                value: str,
                confidence: float,
                rationale: str,
                source_signals: list[SignalRef],
                ts: datetime }

Ref         = { kind: "signal" | "observation" | "item",
                id: str }
```

### Server → client events (additive to ADR-0003 vocabulary)

```
PERSONA_DELTA   = { rationale?: str,                 # if changed
                    trust?: float,                   # if changed
                    observations_added: list[Observation],
                    ts }

VOICE_UTTERANCE = { voice_tag: str,                  # OPEN
                    utterance_kind: str,             # OPEN
                    content: str,
                    references?: list[Ref],
                    ts }
```

### Extended type

`VisitorContext` (defined in `app.domain.context`) gains `viewport`, `landing_path`, `user_agent_summary`. Sent once on session start. Aggregated only — no fingerprintable detail.

### Disciplines (enforced by convention, not type)

1. **Append-only.** Observations are never updated or removed. Corrections are new observations (either in same dimension with higher confidence and newer ts, or in `dimension="correction"`).
2. **Multi-valued per dimension.** Multiple observations may share a dimension. The persona reflects all readings, not the latest.
3. **Source-signal trace.** Every observation MUST reference at least one real signal ID from the input batch that produced it. Audit trail is the protocol's audit trail.
4. **Open vocabulary on `dimension`, `voice_tag`, `utterance_kind`.** New values do not require protocol changes. Specific values are emergent agreements between an agent and a client.
5. **Graceful degrade for unknown tags.** Clients MUST provide a `FallbackUtterance` rendering for unknown `voice_tag` / `utterance_kind`. Unknown tags are first-class, not errors.
6. **Conventions live in prompts.** Dimension seeding (common dimensions: role/intent/depth/source), value examples, and multivoice handling are documented in agent-layer prompts (`ReadStrategy`, voice prompts), not in the protocol.

### Three-question rule for future protocol additions

Every proposed addition to PROTOCOL-001 must answer:

1. **Why must this be on the wire?** Could it be derived by the agent from existing data? Could it be implementation-specific? Could it be HTTP instead of an event?
2. **What breaks if a client ignores it?** If "nothing important," it shouldn't be in the protocol — it belongs in a higher layer.
3. **Is it open-vocabulary?** Would a discriminated union of subtypes be needed? If yes, that's a smell — collapse to `tag: str` + open value.

This rule applied to the brainstorm itself eliminated `VOICE_STEER` (existing `/api/agent/command` POST is the steer channel — no new event needed) and `PERSONA_DELTA.reason` (redundant with `rationale`). Future contributors should apply it to their own proposed additions.

## Consequences

**Good:**
- The protocol is genuinely lightweight: 3 types, 2 new events, 1 extended type, 0 new HTTP endpoints. Smaller wire surface than the existing five-verb vocabulary.
- The open-vocabulary fields (`dimension`, `voice_tag`, `utterance_kind`) preserve extensibility — adding a new voice or a new inference dimension does not require a protocol change.
- Multi-valued observations support multivoice visitors honestly. Voices compose across observations rather than collapsing them.
- The audit trail (`rationale` + `source_signals`) is built into the type, making `TransparencyPanel` rendering straightforward and anti-creepy compliance structural.
- The protocol is reusable: a different agent (different prompts, different LLM, different debounce) can speak it; a different client (audio, chat sidebar, console) can render it.
- Append-only semantics are simple to reason about. PERSONA_DELTA only ever adds; no diff calculation between persona snapshots is needed.

**Bad:**
- Voices have to handle missing observations (no guarantee a `dimension="role"` observation exists at any given time). Mitigation: ReadStrategy prompt enforces "include role observation when trust > 0.4"; voices fall back to `rationale` + `trust` when observations are sparse.
- Voices have to handle multi-valued observations (composing across multiple `role` observations rather than reading a single one). Mitigation: voice prompts include explicit "address every observation with confidence > 0.3, weighted by confidence" instructions.
- Append-only means observations grow within a session. Bounded by `SESSION_TTL_SECONDS`; no cross-session linkage. Per-session observation count expected to be < 50 in practice — well under any payload concern.
- Convention enforcement lives in prompts, which are less rigorous than types. A buggy ReadStrategy prompt can produce malformed (but still type-valid) personas. Mitigation: D9 EDD evals (DeepEval, per ADR-0006) cover the ReadStrategy prompt as a tested artifact.
- Unknown voice_tag handling requires every client to ship a `FallbackUtterance` — a small but real protocol-conformance burden.
- The "three-question rule" is a discipline, not a mechanical check. Future additions can violate it if reviewers don't apply it. Mitigation: this ADR is the document that codifies the rule for future PRs to point at.

## Relationship to other ADRs

- **Extends ADR-0003** (Agent Interaction Protocol) — PERSONA_DELTA and VOICE_UTTERANCE are additive event types alongside the existing five verbs (focus/recede/bridge/surface/signal). The five verbs continue to handle UX state changes; the new events handle the agent's read and voice.
- **Constrained by ADR-0004** (Editorial Canvas & Motion) — voice rendering must respect `prefers-reduced-motion` (opacity-only transitions for stage changes).
- **Tested per ADR-0006** (Testing Frameworks) — ReadStrategy and VoiceStrategy prompts are evaluated with DeepEval (EDD) in slice D9 of FEAT-006.

## What this ADR is NOT

- **Not a UI design.** Voice rendering style (Zilla Slab serif, opacity bands, layout positions) is in `specs/006-agent-is-the-page/spec.md`, not here. Different clients can render the same protocol differently.
- **Not a prompt design.** The `ReadStrategy` system prompt and voice prompts live in `app/domain/strategies/read.py` and `app/domain/strategies/voice.py`. The protocol does not enshrine specific prompts.
- **Not a stage-selector specification.** Trust thresholds (0.4 / 0.7) and visitor-steer behavior are agent-layer implementation choices, documented in the spec, not in the protocol.
