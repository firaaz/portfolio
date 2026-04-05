# Pitch: Agent Content Intelligence — Progressive Personalization

## Problem

The agent can rerank content but can't change **what** visitors see. A LinkedIn recruiter and a GitHub developer read the exact same project descriptions, the exact same experience text — just at different visual weights. The intelligence is invisible.

The design spec promises three capabilities only an LLM provides: **Generate** (custom descriptions), **Connect** (cross-content bridges), and **Converse** (command bar compositions). None exist. The current agent is a content reranker — it assigns importance scores but never touches the text. The thesis ("an LLM agent communicates through content composition, not conversation") is stated but unproven.

Meanwhile, the behavioral loop is open — the frontend tracks dwell time per zone (`use-dwell.ts`) but never sends it to the backend. The agent can't adapt to what the visitor is actually doing.

## Appetite

**Big batch — 3 weeks.** Full progressive intelligence pipeline with a spike-first validation. Decomposed into vertical slices, each independently shippable. PydanticAI as the agent framework (pending spike validation). Models evaluated during building, not prescribed.

## Solution

### The experience

A visitor arrives from LinkedIn. Immediately, the surface emphasizes leadership and business impact — not different content, but different **framing**. Project descriptions highlight team size and outcomes. Experience entries foreground roles, not tools.

After 10 seconds, the agent notices the visitor dwelling on the Skills zone. It shifts: architecture details surface in the featured projects. The experience zone gains technical depth. The adaptation is felt, not seen — the visitor thinks "this page gets me."

After 30 seconds, the agent is confident: this is a technical leader evaluating architecture capability. It generates a bridge annotation: *"Your interest in system design connects to the event-driven architecture in the Salama platform."* It rewrites the project description to emphasize distributed systems patterns, not the business metrics it started with.

Through the command bar, the visitor asks "show me your distributed systems experience" — the agent composes a custom response pulling from projects, experience, and skills. Text that didn't exist before this visitor arrived.

### Three-tier progressive intelligence

The agent earns the right to personalize. Intelligence deepens as engagement grows.

```
Time ──────────────────────────────────────────────►

Tier 1: SELECT          Tier 2+3: ADAPT           ⌘K: COMPOSE
(0s, referrer)          (5-30s, behavioral)        (explicit query)

Score + emphasize       Re-score + shift           Custom composition
LinkedIn → leadership   + generate if confident    Cross-content synthesis
GitHub → architecture   Dwell → shift emphasis     Natural language queries
Direct → balanced       Skip → recede
                        High confidence → novel text + bridges

1 LLM call              1 LLM call                 1 LLM call per query
Every visitor            Engaged visitors only      On-demand
```

**Tier 1 — Select (1 LLM call, 0s):** Importance scores + **emphasis directives**. Not rewritten text — instructions to the frontend about which data fields to foreground. "For project-salama, emphasize `team_size` and `business_impact` over `tech_stack`." The frontend already has all the data; it chooses what to display.

**Tier 2+3 — Adapt (1 LLM call, 5-30s+):** Merged into a single evaluation. Gets the full behavioral profile (dwell map, skip patterns, inferred interests). Produces refined scores + updated emphasis. **If confidence > 0.7**, also produces:
- **Generated descriptions** — same facts, different framing per visitor context
- **Bridge annotations** — connection text linking content pieces

The output depth varies by confidence — one call, variable result.

**Compose (1 LLM call, on-demand):** Command bar queries → custom content assembled from multiple catalog items. Cross-content synthesis.

### LLM call budget per session

| Scenario | Calls | Cost estimate |
|----------|-------|---------------|
| Cached referrer (repeat visitor type) | **0** | $0.00 |
| New visitor, bounces in <5s | **1** | ~$0.001 |
| Engaged visitor (5-30s+) | **2** | ~$0.005-0.01 |
| Active with command bar | **2 + N** | ~$0.005 per query |

Cost control: referrer caching (existing `CachePort`), signal debouncing (don't trigger Adapt until profile shifts meaningfully), session dedup (don't re-run Adapt if profile hasn't changed).

### Scalable agent architecture

**Strategy-driven evaluation.** One LLM adapter, one evaluation port, multiple pluggable strategies.

```
Domain Layer (orchestrator)
  │  Decides WHICH strategy to run (confidence gating)
  ▼
LLMPort (single method):
  evaluate(strategy, profile, catalog) -> IntelligenceResult
  │
  ▼
PydanticAI Adapter
  │  Builds prompt from strategy
  │  Runs agent with strategy's result schema
  │  Validates result with strategy's validator
  │  Model from configuration, not code
  ▼
LLM Provider (configured per strategy)
```

**EvaluationStrategy protocol:**
- `build_prompt(profile, catalog) -> str`
- `result_schema() -> type[BaseModel]` — PydanticAI validates this
- `validate(result, catalog) -> ValidationResult`
- `model_config() -> ModelConfig` — model, temperature, max_tokens

**Strategies:** `SelectStrategy`, `AdaptStrategy`, `ComposeStrategy`. Adding new capabilities = new strategy classes. No changes to LLMPort, adapter, or orchestrator.

**Model selection is configuration.** Models evaluated during building against EDD criteria (latency, cost, grounding accuracy, consistency, schema compliance). Per-strategy configuration via environment/settings.

### Unified result type

One result type that accommodates all strategies. Optional fields expand as intelligence deepens:

```
IntelligenceResult:
  items: list[ItemResult]
  bridges: list[BridgeAnnotation] | None  # Adapt only (when confident)

ItemResult:
  id: str
  importance: float              # 0.0-1.0
  emphasis: list[str] | None     # Which data fields to foreground
  generated: dict[str, str] | None  # Field-level text overrides

BridgeAnnotation:
  source_id: str
  target_id: str
  text: str
  grounding: list[str]           # Catalog facts this is based on
```

### Five-verb protocol (ADR-0003) — now implemented

The five verbs become AG-UI Custom events with staggered dispatch (400-800ms gaps):

| Verb | Strategy | AG-UI Event | Example |
|------|----------|-------------|---------|
| FOCUS | Select, Adapt | `ux:focus` | Elevate project-salama, emphasize architecture |
| RECEDE | Select, Adapt | `ux:recede` | Deprioritize contact, fade to 45% |
| BRIDGE | Adapt (confident) | `ux:bridge` | "Your interest in X connects to Y" |
| SURFACE | Adapt (confident) | `ux:surface` | Generated description replaces static text |
| SIGNAL | All | `ux:signal` | Confidence level + reasoning (transparency panel) |

Staggered dispatch makes the agent feel like it's *thinking*, not page-swapping.

### Behavioral signal loop

Frontend collects signals, sends to backend, agent adapts:

**Signals collected:** `dwell` (time on zone), `skip` (zone scrolled past), `click` (zone/item clicked), `hover` (brief attention without dwell).

**Transport:** POST `/api/agent/signal` every 3-5 seconds with a `SignalBatch`. SSE stream remains open — Adapt results flow back through the existing stream.

**Session management:** New `SessionPort` with in-memory adapter (same pattern as `CachePort`). Stores `VisitorProfile` per session with TTL. Profile accumulates signals, computes confidence, tracks tier state.

### Reliability architecture

Four levels of anti-hallucination defense:

**Level 1 — System prompt constraints:** "You may only use facts present in the provided catalog data. Do not invent achievements, metrics, technologies, or experiences."

**Level 2 — Structured outputs:** PydanticAI validates result schema automatically. Every field is typed and constrained. Invalid output → retry or fallback.

**Level 3 — Post-generation validation:** Domain-layer validator checks all referenced item IDs exist, emphasis fields exist in item data, bridge targets are real items, generated text length is bounded. Fail → silent fallback to static content.

**Level 4 — EDD evals:** Content grounding, factual accuracy, consistency, tone, bridge validity — all written before the agent is built.

**Confidence gating:** Tier 1 always runs. Adapt requires ≥3 behavioral signals. Generation requires confidence > 0.7. Below threshold → serve the simpler tier's result.

**Fallback guarantee:** If any tier fails, the visitor sees the previous tier's result (or static defaults). Nothing disappears, nothing breaks. Progressive enhancement.

### Content model changes

**Extended ManifestItem:**
- Existing: `id`, `importance`, `molecule`, `data`
- New: `emphasis: list[str] | None`, `generated: dict[str, str] | None`

**Bridges are a separate structure** (not per-item fields) — a bridge connects two items:
- `BridgeAnnotation` — `source_id`, `target_id`, `text`, `grounding: list[str]`
- Stored alongside the manifest, not inside individual items

**New domain models:**
- `BehavioralSignal` — type, zone, duration_ms, timestamp
- `SignalBatch` — session_id, signals
- `VisitorProfile` — session_id, context, signals, confidence, tier, dwell_map, interests
- `EvaluationStrategy` — protocol for pluggable intelligence strategies
- `IntelligenceResult`, `ItemResult`, `BridgeAnnotation` — unified result type

**New ports:**
- `SessionPort` — get/upsert/delete visitor profiles
- Expanded `LLMPort` — single `evaluate(strategy, profile, catalog)` method

**Frontend changes:**
- Molecules render `emphasis` fields (highlight/collapse based on directives)
- Molecules prefer `generated[field]` over `data[field]` when present
- Bridge annotations render as subtle text below items
- New `use-signal-collector` hook batches behavioral events
- Signal POST endpoint wired from collector

### PydanticAI integration

PydanticAI replaces raw OpenAI calls inside the LLM adapter — **not** the route layer. The hexagonal architecture stays clean:
- PydanticAI agents sit behind `LLMPort` (adapter layer)
- Route layer orchestrates strategies and manages SSE
- Domain layer owns confidence gating and post-generation validation
- `AGUIAdapter` is NOT used for routing — we control the SSE stream ourselves

### Key design decisions

- **Strategy, not agents.** One evaluation port with pluggable strategies, not separate agents per tier. Scalable to new capabilities without architectural changes.
- **Merged Adapt+Generate.** Tier 2 and Tier 3 collapse into one LLM call. Output depth varies by confidence. 2 calls max per session (not counting command bar).
- **Emphasis before generation.** Tiers 1-2 are 100% reliable (they select existing content, not generate new text). Generation only when confident. Most visitors never see generated text.
- **Catalog as ground truth.** The LLM can select, reframe, and compose — never invent. Four-level validation enforces this.
- **Models as configuration.** No model prescribed in spec. Evaluated during building against EDD criteria per strategy.
- **Domain controls tiers.** Confidence gating is deterministic domain logic, not LLM decision. The LLM is given focused tasks, not autonomy over when to escalate.

## Rabbit Holes

- **PydanticAI structured output reliability.** Different LLM providers have different structured output support. Some may need function-calling mode, others JSON mode. The spike (Slice 0) must validate this works with at least two providers before committing. If structured outputs are unreliable, fall back to raw calls with post-hoc Pydantic parsing (current approach).

- **Behavioral signal noise.** Mouse hover on desktop ≠ scroll-stop on mobile. Signal interpretation must account for device type. Don't over-engineer signal processing — start with dwell-only (proven via `use-dwell.ts`), add other signals incrementally. The `SignalPort.process()` method should be simple: accumulate, compute dwell_map, infer interests from top-dwelled zones.

- **Staggered dispatch timing.** ADR-0003 says 400-800ms gaps. This means the SSE route must hold events in a queue and dispatch them on a timer, not send immediately. This adds complexity to the streaming route. Don't let the dispatch timer block the event loop — use asyncio tasks.

- **Session cleanup.** In-memory sessions accumulate. Need TTL expiry (30 min?) and a cleanup mechanism. The existing `MemoryCache` has LRU eviction — reuse that pattern. Don't build a custom garbage collector.

- **Generated content caching.** If the same behavioral profile produces the same generated content, cache it. But behavioral profiles are continuous (dwell times vary by milliseconds), so cache key design matters. Quantize profiles into buckets for cache key hashing.

- **Bridge rendering.** Bridge annotations are a new UI concept — text connecting two zones. Where do they render? Below the source item? As a floating annotation? This is a frontend design question that should be resolved during Slice 6, not upfront. Start with inline text below the item.

- **Command bar compose vs. existing command bar.** The command bar already works — it sends text to `/api/agent/command` and gets re-scored results. The Compose strategy replaces this with generative output. Ensure backward compatibility during migration.

## No-Gos

- **No persistent user tracking.** Session-only behavioral analysis. No cookies, no fingerprinting, no cross-session profiles. GDPR-compliant.
- **No autonomous model selection.** The LLM doesn't choose which model to call or when to escalate tiers. Domain logic controls this deterministically.
- **No multi-turn conversation.** Command bar queries are stateless (enriched by visitor profile, but no conversation history). The agent doesn't remember previous queries within a session.
- **No real-time model switching.** Models are configured at startup, not swapped mid-session based on load or cost.
- **No depth layer (pagination).** That's a separate spec. This spec is intelligence only.
- **No mobile behavioral signals beyond dwell.** Touch-based signals (scroll-stop, long-press) are deferred. Desktop dwell is the only signal for this spec.
- **No A/B testing infrastructure.** Strategy comparison happens in EDD evals, not in production traffic splitting.

## Referenced ADRs

- ADR-0003: Agent Interaction Protocol — five verbs, staggered dispatch, signal-scoped lifecycle
- ADR-0004: Editorial Canvas & Motion — opacity-only transitions, hero stability
- ADR-0005: Stack Change — FastAPI + Vite + React 19
- ADR-0006: Testing Frameworks — pytest + DeepEval + vitest + Biome
- ADR-0007: Breathing Motion Language — grid-template transitions

## Slice Decomposition (high-level)

Detailed implementation plan follows in a separate session.

| Slice | Name | Description | Files est. |
|-------|------|-------------|-----------|
| 0 | **Spike** | PydanticAI + structured output prototype. Validate latency, schema compliance, grounding accuracy, strategy pattern, AG-UI compatibility. Go/no-go. | 3-4 |
| 1 | **Session + Signals** | `SessionPort`, `SignalPort`, `VisitorProfile` model, `use-signal-collector` hook, POST `/api/agent/signal`, signal accumulation. | 5 |
| 2 | **Select Strategy** | `SelectStrategy`, `IntelligenceResult`, emphasis directives, PydanticAI adapter replacing raw LLM calls, EDD evals for select. | 5 |
| 3 | **Adapt Strategy** | `AdaptStrategy`, behavioral profile → refined scores + emphasis + generation (confidence-gated), post-generation validation, EDD evals. | 5 |
| 4 | **Compose Strategy** | `ComposeStrategy` replacing current command route, cross-content synthesis, EDD evals. | 4 |
| 5 | **Five-Verb Events** | `ux:focus`, `ux:recede`, `ux:bridge`, `ux:surface`, `ux:signal` AG-UI Custom events. Staggered dispatch (400-800ms). Decision records to transparency panel. | 4 |
| 6 | **Frontend Rendering** | Molecule emphasis rendering, generated content display, bridge annotations, signal collector wiring, updated tests. | 5 |

## Testing Approach

**EDD (written before agents):**
- Grounding accuracy, structured output compliance, latency benchmarks, consistency, emphasis relevancy, bridge validity, persona differentiation

**BDD (behavioral specs):**
- Given LinkedIn referrer → contact/experience emphasis ≥ 0.7
- Given 10s dwell on skills → project emphasis shifts to tech fields
- Given confidence > 0.7 → generated descriptions present
- Given command bar "distributed systems" → response includes project-salama

**Unit tests:**
- VisitorProfile accumulation, confidence calculation
- Strategy prompt construction
- Post-generation catalog validation
- Staggered dispatch timing
- Frontend emphasis rendering logic
