# FEAT-007 — Protocol Reification

**Shape Up pitch · 2026-04-26**

## Problem

After six features and ~30 slices, the portfolio's underlying agent works in isolation. It reads the visitor (`ReadStrategy` → Persona), speaks (whisper / letter / dialogue voices), acts (importance events drive bento layout), and polishes (transparency panel, debounce, mobile disclosure, "do not infer" toggle). The mechanical loop is alive.

The page itself does not feel like a designed editorial experience or like the agent is meaningfully shaping it. The "Agent IS the page" thesis carried forward from FEAT-006 is structurally claimed but visually undelivered. The gap has three observable shapes in the codebase today:

1. **Substrate is unfinished.** FEAT-003 introduced a density mechanism (the `breathing-extra` hook in `ProjectCard.tsx:44-45` and `ExperienceCard.tsx:25-30`) and an `emphasis` prop. Five of six molecules ignore it. The agent's adaptive output silently drops on the floor — verified by reading every component in `frontend/src/molecules/`. `HeroMolecule`, `EducationMolecule`, `ContactCard`, `SkillTag` don't even accept `emphasis` as a prop. `ExperienceCard` accepts and ignores it. Only `ProjectCard` consumes it.

2. **Voices are duplicated three ways.** `DialogueOverlay`, `CoverLetterPanel`, `WhisperLayer` each implement the same opacity-by-active-voice pattern, the same gate-on-utterances-existing logic, the same parallel CSS antipattern. FEAT-006 D9b's prompt fix had to be made to dialogue alone; the same metadata-leak bug remains live in letter (visible in field testing — "with a confidence level of 0.6") and whisper (defensively undeclared but identical vulnerability).

3. **AdaptStrategy has no molecule-tier constraint.** Skills with `default_importance: 0.3` can be promoted to tier-3 (2×2 cells) by the LLM, allocating significant grid real estate to a 7-line `SkillTag` component that renders only a small inline tag. The result is empty-looking cards that consume space projects could fill — visible in field testing.

Underneath these three observable shapes lies the *real* architectural fault: **ADR-0003's five-verb protocol is real on paper and aspirational in code.** The five verbs (`focus / recede / bridge / surface / signal`) defined in ADR-0003 have drifted significantly from implementation:

| Protocol verb | ADR-0003 semantic | Code today | Drift |
|---|---|---|---|
| `focus(id, importance?)` | "Content breathes open — expands detail, increases depth" | `applyFocus(itemId, importance, emphasis)` | OK-ish, `emphasis` parameter added without the ADR authorizing it |
| `recede(id)` | "Content compresses to minimal — background depth" | `applyRecede(itemId, importance)` | Lost the "compresses" semantic — just lowers a number |
| `bridge(text, from, to)` | "Narrative text appears between content — the guide's voice" | `addBridge(sourceId, targetId, text)` | Renderer is missing — bridges accumulate in store with no visible component |
| `surface(id, reason)` | "New content slides in with a visual marker — proactive contribution" | `applySurface(itemId, generated: dict[str,str])` | **Completely different verb in code than in protocol.** Code `surface` does generated-copy injection. Protocol `surface` is "new content arrives." Same name, different operation. |
| `signal(state)` | "Status line updates — ambient presence" | `setTempo` + `setAgency` separately; no unified status-line | Status line doesn't exist. The four intent states (`exploring / evaluating / deep_diving / seeking_contact`) are nowhere in the codebase. |

Plus three protocol invariants that are silent in the code:

- **Staggered dispatch** (150–350 ms gaps per ADR-0009) — honored within each adaptation cycle by `staggered_dispatch` in `dispatch.py`, but consecutive cycles are not coordinated. Successive bursts can arrive too close together at the cycle boundary, breaking the "agent thinking" cadence.
- **Signal-scoped lifecycle** — bridges and surfaces should auto-clear when intent state changes; no mechanism exists.
- **Voices live outside the verb vocabulary** — whisper / letter / dialogue arrive as typed `VOICE_UTTERANCE` extension events from FEAT-006 (additive to AG-UI). The wire format is fine; the duplication is at the *component* layer (three parallel `<Layer>` files, no shared rendering primitive). Folding voices into the verb vocabulary is out of scope for this pitch — see No-Gos.

The page therefore looks barebones not because the design is undone, but because the *substrate the design was meant to ride on never finished*, and the *protocol the substrate was meant to honor stayed aspirational*. FEAT-007's job is to reify the protocol end-to-end, finish the substrate as a consequence, and install structural guardrails (the **"no loose-ends growth"** principle) that prevent this same gap from accumulating again.

## Appetite

**4 weeks** (~20 working days of focused effort, not calendar weeks). Within Shape Up's <=4-week small-batch range — avoids the cooldown-eating problem of 6-week big batches while being big enough to deliver substrate-level architectural change.

**Cut variable, named up front:** the editorial restraint pass (week 4 typography work) is the negotiation point. The protocol reification, substrate completion, and no-loose-ends sweep are *not* cuttable — they are the actual problem this pitch exists to solve.

**Week breakdown:**
- **Week 1** — protocol foundation + walking skeleton (`protocol.{ts,py}` types; `applyRephrase` rename; `signal(state)` end-to-end; ProjectCard end-to-end through new layout grid + new VoiceSlot).
- **Week 2** — cadence queue (cross-cycle pacing) + signal-scoped lifecycle + bridge renderer + voice migration to `<VoiceSlot>` (whisper + letter + dialogue collapse to thin renderers; no protocol change to voices).
- **Week 3** — molecule expansion across the other 5 (Hero, Experience, Skill, Education, Contact) + AdaptStrategy `max_tier` constraint + SkillTag richness.
- **Week 4** — `BASE_VOICE_RULES` extraction + EDD evals for letter + whisper + property-based tests + editorial restraint pass + no-loose-ends sweep.

Within each week, slices follow the existing project rhythm: ≤5 files, ≤200 line diffs, test-first, commit on green, separate sessions for decomposition vs implementation.

## Solution

### The protocol as foundation

A new file `frontend/src/protocol/protocol.ts` (and matching `backend/src/app/domain/protocol.py`) defines the typed verb vocabulary with explicit semantics. Both files import nothing framework-specific — the protocol is portable per ADR-0003's "Must compose into a reusable design system" decision driver.

```ts
// protocol.ts (sketch)
export type IntentState = "exploring" | "evaluating" | "deep_diving" | "seeking_contact";

export type Verb =
  | { kind: "focus"; id: string; importance: number; emphasis?: string[] }
  | { kind: "recede"; id: string; importance: number }
  | { kind: "bridge"; text: string; from: string; to: string }
  | { kind: "surface"; id: string; reason: string }
  | { kind: "signal"; state: IntentState; rationale: string };

export const INTENT_GAP_MS_MIN = 150;
export const INTENT_GAP_MS_MAX = 350;
```

`backend/src/app/domain/protocol.py` mirrors these as Pydantic models. A property-based round-trip test (Hypothesis on Python side, fast-check on TS side) asserts the wire format stays consistent across the two files.

**Voices stay outside the verb vocabulary** — they arrive as the typed `VOICE_UTTERANCE` extension events FEAT-006 already shipped (additive to AG-UI). The bug-prevention property this pitch needs (fix one prompt-leak, fix everywhere) is delivered at the *component* layer alone: `BASE_VOICE_RULES` shares prompt rules across whisper/letter/dialogue; `<VoiceSlot>` shares rendering invariants across the same three. Folding voices into the verb vocabulary as a sixth verb is deferred to a future feature when there's evidence cadence pacing improves voice UX. (See No-Gos.)

### Verb-by-verb implementation commitments

**`focus(id, importance?)`** — semantic: "content breathes open." Implementation: `bento-layout` grants larger tier; molecule renders richer subfields per the tier-baseline + emphasis-modulation contract (defined below). Removes the inert `breathing-extra` div from FEAT-003 and replaces it with honest conditional rendering.

**`recede(id)`** — semantic: "content compresses to minimal." Smaller tier; molecule renders only its tier-appropriate subfields. Today's implementation just lowers a number with no compression behavior — this fixes that.

**`bridge(text, from, to)`** — semantic: "narrative text appears between content." A new `<BridgeLayer>` component reads `bridges[]` from the store and renders narrative text as positioned overlays connecting two cards. Initial implementation: midpoint text + thin straight SVG line. Curves, animation, edge-routing are deferred to FEAT-008. **The point is bridges become visible at all.**

**`surface(id, reason)`** — semantic: "new content slides in with a visual marker." The current `applySurface(id, generated)` action is renamed to `applyRephrase(id, generated)` (rename to its honest meaning, semantics unchanged). A new `applySurface(id, reason)` flips a `surfaced` field on the item; the molecule renders a `<SurfaceMarker>` (◇ glyph) for ~3 seconds, then settles. **Two distinct verbs, two distinct operations. Frees the name `surface` to mean what the protocol says.**

**`signal(state)`** — semantic: "ambient presence communicating current understanding." Backend grows an `IntentStrategy` that infers `exploring | evaluating | deep_diving | seeking_contact` from persona + dwell patterns. Frontend grows a `<StatusLine>` component near `<PresenceDot>` that surfaces the current intent state in a single italic phrase ("noticing engineering depth"). `setTempo` + `setAgency` actions are removed; intent state is the canonical "where is the visitor."

### Density mechanism: tier baseline + emphasis modulation

Each molecule grows two new props (`tier: 0..5` from `bento-layout`'s `entry.tier`, and `emphasis: string[]` from focus events) plus an internal `subfieldsForTier(tier)` map.

**Tier sets the baseline content set; emphasis modulates within it.** Tier guarantees the card never overflows; emphasis lets the agent steer the visitor's attention to specific subfields.

| Molecule | Subfields | Tier 1 | Tier 3 | Tier 5 | `max_tier` |
|---|---|---|---|---|---|
| **Hero** | name, title, subtitle, summary | name | name + title + subtitle | full | 5 |
| **Project** | title, description, tech, outcomes, links | title | + description | + tech + outcomes | 5 |
| **Experience** | company, role, duration, description, achievements | company + role | + duration | + description + achievements | 4 |
| **Skill** *(renamed from SkillTag)* | name, proficiency, related_projects, years | name | + proficiency dot + 1 related | + years + 2 related | 2 |
| **Education** | degree, institution, year, focus_area | degree + institution | + year | + focus_area | 2 |
| **Contact** | email, cta, calendar_link, response_time | cta button | + email | + calendar_link + response_time | 2 |

The `max_tier` column lives in catalog YAML per item (override-able for specific items). `AdaptStrategy` clamps any LLM-returned importance such that the resulting tier never exceeds it. **This is the structural guard that prevents skill cards from claiming hero-sized real estate.**

`SkillTag.tsx` is renamed to `Skill.tsx` (molecule key in catalog is already `"skill"`). Catalog YAML expands with the new subfields. `breathing-extra` divs in `ProjectCard.tsx:44-45` and `ExperienceCard.tsx:25-30` are removed entirely.

### Voice abstraction (component-layer only)

Wire format unchanged from FEAT-006: voices arrive as typed `VOICE_UTTERANCE` events; FEAT-007 does **not** introduce a sixth verb. `<VoiceSlot>` is a React abstraction that consumes the existing event stream and unifies the three layers' rendering boilerplate:

```tsx
<VoiceSlot region="rail"   voiceTag="whisper">  <WhisperContent />  </VoiceSlot>
<VoiceSlot region="letter" voiceTag="letter">   <LetterContent />   </VoiceSlot>
<VoiceSlot region="rail"   voiceTag="dialogue"> <DialogueContent /> </VoiceSlot>
```

`<VoiceSlot>` owns: gate-on-active-voice, opacity transition, aria-label conventions, empty-state return-null, kind-specific render dispatch via children. The three current files become thin renderers (~15 lines each). `useNarrowViewport` extracts to `frontend/src/hooks/use-media-query.ts` (third media-query consumer — promotion threshold met per `lessons.md`).

`BASE_VOICE_RULES` is a module-level string constant in `voice.py` carrying the second-person rule, the forbidden-third-person phrase list, the forbidden-metadata-leak phrase list. Each voice prompt is `BASE_VOICE_RULES + voice_specific_section`. Adding a future voice means writing only its specific section. **A leak in any voice gets fixed once.**

### Layout: canvas-shell becomes a CSS grid

```css
.canvas-shell {
  display: grid;
  grid-template-columns: 140px 1fr 60px;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "letter letter letter"
    "rail   bento   gutter";
  height: 100dvh;
  width: 100%;
}
```

Voices, chrome, and bento are siblings in the grid — overlap is impossible by construction. Bento usable width drops from ~1024px to ~870px at 1280px viewport; in exchange the rail and gutter get *guaranteed* clearance. Mobile collapse (≤640px): grid-template-areas collapses to single column; rail content moves into a `<details>` disclosure (existing pattern from D8).

### Cross-cutting protocol guarantees

**Cadence queue** — `backend/src/app/adapters/api/cadence.py`. Builds on the existing `staggered_dispatch` (in `dispatch.py`, ADR-0003 + ADR-0009) which already paces events *within* a single adaptation cycle. The new cadence queue extends pacing **across cycles** with a per-session `asyncio.Queue` + sleeper that enforces 150–350 ms gaps between successive **layout-verb** events. Pre-existing `_run_adaptation` becomes a queue producer. Bounded queue (`maxsize=64` per session). Producer-side cap: 30 verbs per cycle.

Voice utterances **bypass** the cadence queue and emit at SSE write speed — pacing prose reads as artificial typing animation; voice keeps FEAT-006's bursty delivery. Voice events route through the existing `VOICE_UTTERANCE` SSE channel directly.

**Interaction with FEAT-006's per-session signal debounce** (`_DEBOUNCE_WINDOW_S = 2.0` in `signal_route.py`): the debounce is input-side (coalescing rapid signal POSTs); the cadence queue is output-side (pacing emitted layout verbs). The two operate at different layers and do not compose — implementers should not add additional pacing.

**Signal-scoped lifecycle** — when `signal(state)` transitions, all bridges + surface markers from the previous state auto-clear via `clearSignalScoped()` action. **Persistent state** (salience, generated copy, intent_state, **voice utterances**) is kept; **ephemeral state** (bridges, surface markers) is cleared. Voices are explicitly exempt from `clearSignalScoped()` — preserving FEAT-006's accumulation rule ("the page never erases prior agent expression within a session"). Stage lighting (opacity-by-active-voice from FEAT-006) handles the visual-weight job for backgrounded voices: when dialogue activates, letter shrinks to a small italic line and whispers fade further; both remain readable.

### What gets *removed* (no-loose-ends growth)

The principle: **every prop accepted is consumed; every event emitted reaches a visual; every voice rule lives in one place.** Concretely, this pitch removes:

- `breathing-extra` inert div in `ProjectCard.tsx:44-45` and `ExperienceCard.tsx:25-30`.
- Unused `emphasis` parameter on molecules that won't gain it (preferably they all gain it; if any can't, the prop comes off).
- `setTempo` + `setAgency` actions (folded into `signal(state)`).
- Parallel CSS for `.dialogue-overlay`, `.cover-letter`, `.whisper-layer`, `.fallback-utterance` (replaced by grid-area assignment + `<VoiceSlot>` styling).
- The `DialogueOverlay` / `CoverLetterPanel` / `WhisperLayer` triplicate (collapsed into `<VoiceSlot>` configurations).

A static no-loose-ends audit script (regex-based v1, `scripts/audit-loose-ends.mjs`) runs in CI to enforce the "every accepted prop is consumed" rule going forward.

### Data flow (per verb, end-to-end)

The shared invariant: every layout verb is type-checked against `protocol.{ts,py}` at the emit boundary; voices stay on the FEAT-006 `VOICE_UTTERANCE` channel.

```
Layout verbs (cadence-queued):
  ReadStrategy → Persona → AdaptStrategy / IntentStrategy
    → emits typed Verb (focus / recede / bridge / surface / signal)
    → cadence queue (150–350 ms gaps, per session)
    → SSE custom-event → use-agent-stream parses against protocol.ts type
    → store reducer applies (ux-store / new intent-state field)
    → component renders the resulting state change
    → on signal(state) transition: clearSignalScoped() wipes bridges + surface markers
                                   (voice utterances exempt — they persist)

Voices (unchanged from FEAT-006):
  ReadStrategy → Persona → VoiceStrategy
    → emits VOICE_UTTERANCE (additive to AG-UI; outside verb vocabulary)
    → SSE custom-event (no cadence queue) → use-agent-stream
    → voice-store reducer
    → <VoiceSlot> renders by voice_tag, gates on activeVoice
    → utterances persist within session
```

### Error handling (cataloged)

| Case | Behavior |
|---|---|
| Emphasis names a subfield outside molecule's tier set | Silently drop overflow; render only what tier allows. Log warning. Don't clamp tier up. |
| `max_tier` violated by LLM | Backend clamps post-LLM in `AdaptStrategy` itself. Frontend trusts the wire. Single point of clamping. |
| Bridge to nonexistent item | `<BridgeLayer>` filters via `itemsById.has(from) && itemsById.has(to)`. Bridges remain in store; cleared on signal transition. |
| In-flight verb during signal transition | Cadence queue applies in emission order — bridge applies first, then `clearSignalScoped` wipes it. 1–2 frame visible flicker is acceptable: it's honest signal that the agent's understanding shifted mid-thought. |
| Cadence queue overflow | Bounded `maxsize=64` per session; drop oldest on overflow; log it. Producer-side 30-verb cap is the real defense. |
| `<SurfaceMarker>` timer cleanup | Use `motion`'s `AnimatePresence` exit animation; handles unmount-during-animation correctly. |
| Snapshot during cadence drain | Snapshot applies; buffered verbs continue draining. E1's snapshot-merge fix (preserves client-mutated salience/emphasis/generated) ensures no collision. |
| "Do not infer" toggle flipped during in-flight verbs | Verbs already emitted complete normally. Once toggle is set, no new signals reach backend, so no new verbs emitted. One-cycle latency, consistent with privacy intent. |
| SSE reconnect during cadence drain | Cadence queue is per-session and persists across reconnects (server-side asyncio queue). Reconnecting frontend gets snapshot then continues receiving paced verbs. |
| Voice utterance arrives after `activeVoice` changed | Utterance lands in voice-store. `<VoiceSlot>` renders at backgrounded opacity per stage lighting (per FEAT-006 coexistence rule); foregrounds when its `voice_tag` becomes active again. Different voice tags don't conflict (each slot is tagged). Voice utterances persist within session — exempt from `clearSignalScoped()`. |

### Testing strategy

Three layers per ADR-0006 (pytest TDD + DeepEval EDD + vitest BDD), plus a new **protocol contract layer** specifically for the silent-drop bug class.

**TDD — domain logic** (pytest): `protocol.py` Pydantic types; `IntentStrategy` with mocked LLM; cadence queue timing (with `freeze_time`); `clearSignalScoped()` logic both directions; `max_tier` clamping in `AdaptStrategy`; `subfieldsForTier` per molecule (six small tests); `BASE_VOICE_RULES` composition.

**BDD — behavior** (vitest + happy-dom): store reducers; `<MoleculeResolver>` prop forwarding; `<VoiceSlot>` gating + opacity + empty-state; `<BridgeLayer>` rendering + missing-endpoint filtering; `<StatusLine>`; `<SurfaceMarker>`; `canvas-shell` grid layout at desktop and ≤640 px collapse.

**EDD — LLM evals** (DeepEval, real LLM, gated by `LLM_API_KEY`):
- `evals/test_intent_inference.py` — new. Asserts the four `IntentState` distinctions on fixture personas.
- `evals/test_voice_letter.py` — new. Mirrors `test_voice_dialogue.py`: second-person, no metadata-leak substrings, no third-person narration.
- `evals/test_voice_whisper.py` — new. Similar shape: 1–3 short lines, present-tense, first-person agent voice.
- `evals/test_voice_dialogue.py` — existing, must continue to pass after `BASE_VOICE_RULES` extraction.
- `evals/test_persona_inference.py` — existing, unchanged.

**Protocol contract layer** (new): emit each verb at backend boundary, parse via `protocol.ts`, assert store ends in expected state. Lives in `frontend/e2e/protocol-contract.spec.ts` running against a backend `TestClient` fixture.

**Property-based tests** (Hypothesis on Python, fast-check on TS): three high-leverage invariants only.
- `setSnapshot` merge invariant (the E1 fix as a property): for any sequence of mutations + any subsequent snapshot, items in both snapshots have client-mutated fields preserved.
- `computeLayout` invariants: cell budget never exceeded; at most one tier-5 hero claimed; no items dropped silently; descending salience with stable index tiebreaker.
- Protocol type round-trips: random instance of one of the **five layout verbs** (focus / recede / bridge / surface / signal) → JSON → parse on the other side → equivalence assertion, in both directions. **Catches the "we changed protocol.py but forgot to update protocol.ts" silent breakage at CI time.** `VOICE_UTTERANCE` is not part of the verb vocabulary and is covered by its existing FEAT-006 wire-format tests.

**E2E walking-skeleton scenario** (Playwright): one headline test that proves the full protocol loop end-to-end. Open `?utm_source=linkedin` → assert differentiated tiers → assert second-person cover letter, no metadata substrings → Cmd+K + dialogue answer → bridge connects two cards → mock signal-state transition → assert bridge clears + surface markers clear within 350 ms; salience persists; status line reflects new intent state.

**Static no-loose-ends audit** (`scripts/audit-loose-ends.mjs`): regex-based v1. Finds destructured props in molecule signatures, asserts each name appears elsewhere in the same file. Fails CI on silent drops.

### Test count after pitch ships (target)

| Layer | Today | After FEAT-007 |
|---|---|---|
| pytest (unit + behavior) | 264 | ~295 |
| vitest | 186 | ~220 |
| EDD evals | 2 | 5 |
| Playwright e2e | 7 | 9 |
| Hypothesis / fast-check properties | 0 | 3 |
| Static no-loose-ends audit | 0 | 1 CI check |

## Rabbit Holes

**Bridge renderer visual polish.** Drawing curved lines/arrows between grid items that reflow is non-trivial. **Mitigation:** initial implementation is midpoint text + thin straight SVG line. Visual polish for bridges deferred to FEAT-008.

**`IntentStrategy` four-state distinction.** The LLM may struggle to reliably distinguish `evaluating` from `deep_diving`. **Mitigation:** if EDD eval fails after one round of prompt iteration (one EXAMPLE block + one rule sharpening — same lesson as FEAT-006 D9a), collapse to binary `exploring` vs `focused` and ship that. Four-state nuance becomes a future pitch with more signal-shape research.

**`<VoiceSlot>` API generality.** Three voices with genuinely different rendering needs tempt a kitchen-sink API. **Mitigation:** start with minimal `<VoiceSlot>` (`region`, `voiceTag`, `children`). If the abstraction strains mid-pitch, drop `<VoiceSlot>` and extract just the shared `useVoiceActive(voiceTag)` hook + the shared CSS class. The structural goal (one place to fix prompt-leak class bugs) is already achieved by `BASE_VOICE_RULES`; the component abstraction is bonus.

**Bento FLIP under grid-area reflow.** When tier changes, `gridColumn`/`gridRow` span changes; FLIP with span changes can flicker. **Mitigation:** test at the walking-skeleton stage in week 1. If FLIP doesn't work cleanly with span reflow, fall back to opacity-only transitions for tier changes (existing `prefers-reduced-motion` path).

**Static no-loose-ends audit script.** Real AST-based prop-consumption analysis is multi-day tooling. **Mitigation:** regex-based v1 only. Finds destructured props and asserts each appears in same file. False positives on prop forwarding accepted; ignore comments as needed. AST-based audit deferred.

**Cadence queue under SSE backpressure.** Slow SSE consumer + runaway agent emissions = memory creep. **Mitigation:** bounded queue (`maxsize=64` per session), drop oldest on overflow, log. Producer cap (30 verbs/cycle) is the real defense.

## No-Gos

**Editorial typography pass / Iron-Gall Ink palette / Zilla Slab applied across surfaces.** This is the deferred Option C from the appetite conversation. FEAT-007's week-4 restraint pass is minimal — basic monochromatic consistency, no per-surface editorial design execution. Full editorial polish lands in **FEAT-008: Editorial Polish** (a future ~3-week pitch drawing from `docs/research/editorial-design-research.md` and the Iron-Gall Ink palette work).

**Runtime LLM composition for molecules.** No `CompositionStrategy` that rephrases project descriptions per persona. Molecules render static catalog data + emphasis-driven subfield selection. The cover letter and dialogue voices keep their existing runtime LLM treatment (LETTER and DIALOGUE prompts).

**`override(view)` user escape hatch.** ADR-0003 defines a visible view-switcher. The "do not infer" toggle (FEAT-006 D9b) is the only user-side control in scope. View-switching belongs to a future user-agency pitch.

**Bridge visual polish.** Straight SVG lines + midpoint text only. No curves, no animation, no edge-routing, no styled arrowheads. The point is bridges become *visible*; making them beautiful is FEAT-008's job.

**Codegen between `protocol.ts` and `protocol.py`.** Hand-mirrored with the property-based round-trip test as the consistency guard. Real codegen (Pydantic → JSON Schema → TS) is tooling pitch of its own.

**Mobile editorial design treatment.** Narrow viewports get the new layout grid collapsed to single column + the existing D8 `<details>` disclosure pattern for whispers. No bespoke mobile design.

**Public deployment / push to origin.** `develop` stays local. Whether to push (currently 168 commits behind origin) is a separate decision the user makes when ready.

**New voice tags.** Voices remain whisper / letter / dialogue. No fourth voice (e.g., "dossier") or audio output. Adding voice tags becomes trivial after `BASE_VOICE_RULES` extraction; actually adding one is a future pitch.

**N-ary bridges.** `bridge(text, from, to)` stays binary. Multi-item narrative connections are a verb extension for later.

**Folding voices into the verb vocabulary as a sixth `speak` verb.** Considered and deferred. Voices stay as `VOICE_UTTERANCE` extension events from FEAT-006. Two reasons. (1) The bug-prevention motivation — metadata leaks across whisper/letter/dialogue — is fully addressed at the component layer (`BASE_VOICE_RULES` + `<VoiceSlot>`); the wire format is not the source of the bug class. (2) Cadence pacing of voice utterances would be a behavior change with no surfaced evidence it improves UX — paced delivery of conversational text reads as artificial typing animation. We'll revisit this only with field evidence that pacing helps. If folding does happen later, it requires a new ADR (likely ADR-0011) extending ADR-0003's five-verb vocabulary; the immutability rule means ADR-0003 is not edited.

**Clearing voice utterances on signal-state transition.** Considered and rejected. Voices are exempt from `clearSignalScoped()` — preserves FEAT-006's accumulation rule ("the page never erases prior agent expression within a session"). Visual de-weighting of older voices is handled by stage lighting (opacity-by-active-voice), not deletion.

**Anti-creepy hard-constraint amendments.** Per CLAUDE.md, "do not infer toggle + presence dot + 300–500 ms transitions" stays exactly as today. No new anti-creepy primitives, no new transparency surfaces beyond what's already shipped.

## References

- ADR-0003 — Agent Interaction Protocol (the five verbs this pitch reifies)
- ADR-0009 — Dispatch Timing Revision (cadence constants 150–350 ms; existing `staggered_dispatch` in `backend/src/app/adapters/api/dispatch.py`)
- ADR-0010 — Persona Protocol (FEAT-006 wire types: `PERSONA_DELTA`, `VOICE_UTTERANCE`; persona-store + voice-store descend from this)
- ADR-0006 — Testing Frameworks (pytest + DeepEval + vitest + Biome)
- `tasks/lessons.md` #6 (frozen-sentinel for record-keyed selectors), #22 (e2e catches contract drift), #30 (spec EXAMPLE blocks are load-bearing), #31 (EDD evals catch what mocks miss)
- `frontend/src/molecules/` — six molecule files, current state
- `frontend/src/voice/{WhisperLayer,CoverLetterPanel,DialogueOverlay}.tsx` — three parallel implementations to be unified
- `backend/src/app/domain/strategies/voice.py` — three voice prompts to be unified under `BASE_VOICE_RULES`
- `backend/content/catalog.yaml` — to be expanded with `max_tier` per item + new subfields
