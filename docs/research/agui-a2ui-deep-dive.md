# AG-UI & A2UI Protocol Deep Dive

Research compiled from parallel Claude session, 2026-03-31.

---

Now I have everything I need. Here is the full research synthesis.

---

## Agentic UI Research: State of the Art (March 2026)

### 1. AG-UI Protocol

AG-UI (Agent-User Interaction Protocol) is an open, transport-agnostic protocol for bidirectional communication between AI agents and frontends. Created by CopilotKit and adopted by Microsoft, Google, LangChain, AWS, Oracle, and PydanticAI.

**How it works:** The agent implements a single function -- `run(input: RunAgentInput) -> Observable<BaseEvent>` -- and emits a stream of typed events. The frontend subscribes to this stream and updates accordingly. Transport can be SSE, HTTP binary, or WebSockets.

**The event types fall into six categories:**

| Category | Events | Purpose |
|---|---|---|
| Lifecycle | `RunStarted`, `RunFinished`, `RunError`, `StepStarted`, `StepFinished` | Bracket agent execution |
| Text Messages | `TextMessageStart`, `TextMessageContent`, `TextMessageEnd` | Stream text to UI |
| Tool Calls | `ToolCallStart`, `ToolCallArgs`, `ToolCallEnd`, `ToolCallResult` | Agent invokes frontend tools |
| State Mgmt | `StateSnapshot`, `StateDelta`, `MessagesSnapshot` | Bidirectional state sync |
| Reasoning | `ReasoningStart`, `ReasoningMessageContent`, `ReasoningEnd` | Expose agent thinking |
| Special | `Raw`, `Custom` | Extensibility |

**The critical piece for your project is State Management.** AG-UI uses a snapshot-plus-delta pattern:
- `StateSnapshot` sends the full state object (used at connection start or after disconnects)
- `StateDelta` sends RFC 6902 JSON Patch operations for incremental updates

For a layout-reordering scenario, the state could be:
```json
{
  "layout": {
    "sections": [
      { "id": "experience", "visible": true, "order": 0, "expanded": true },
      { "id": "projects", "visible": true, "order": 1, "expanded": false }
    ],
    "contentVariant": "recruiter"
  }
}
```
The agent emits deltas like `{ "op": "move", "path": "/layout/sections/1", "from": "/layout/sections/0" }` to reorder, or `{ "op": "replace", "path": "/layout/sections/0/expanded", "value": true }` to expand a card.

**Relevance to your project:** AG-UI is the runtime communication channel. Your TF.js classifier could emit `StateDelta` events through a local agent loop (no server needed) to drive Zustand state updates. The protocol is overkill for a local-only agent, but the *pattern* -- snapshot + JSON patch deltas -- is directly applicable.

**Open source:** [github.com/ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui)

---

### 2. A2UI (Agent-to-User Interface)

A2UI is Google's declarative protocol where agents describe UI composition as flat JSON. Released late 2025, currently at v0.9.

**Key design choice: flat adjacency list, not nested trees.** LLMs struggle to generate deeply nested JSON correctly. A2UI uses flat component lists with ID-based parent-child references:

```json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "portfolio_canvas",
    "components": [
      { "id": "root", "component": "Column", "children": ["hero", "experience", "projects"] },
      { "id": "hero", "component": "Card", "child": "hero_content" },
      { "id": "experience", "component": "Card", "text": "..." }
    ]
  }
}
```

**Core concepts:**
- **Surfaces**: Container abstractions for UI regions (your canvas viewport)
- **Catalogs**: Pre-approved component sets the agent can use (guardrail against injection)
- **Data Binding**: JSON Pointer paths (RFC 6901) connecting components to dynamic state
- **updateComponents / updateDataModel**: Separate messages for structure changes vs. data changes

**Data binding** enables components to react to state without regeneration:
```json
{ "id": "headline", "component": "Text", "text": { "path": "/persona/headline" } }
```

**Relevance to your project:** A2UI's adjacency list model maps well to your "breathing cards" concept. Each card is a component with an ID. The agent sends `updateComponents` to reorder children of the root, and `updateDataModel` to change content variants. You would not adopt the full A2UI protocol (it assumes a remote agent), but the JSON structure for describing layouts is a strong candidate for your build-time variant JSON format (Layer 1).

**Open source:** [github.com/google/A2UI](https://github.com/google/A2UI)

---

### 3. CopilotKit "Chatless" Generative UI

CopilotKit (the company behind AG-UI) describes three patterns for agent-driven interfaces that go beyond chat:

**Pattern 1 -- Static/Controlled Generative UI (AG-UI):** Frontend owns all components. Agent selects which component to show and fills it with data. The `useFrontendTool` hook binds React components to tool lifecycle states (inProgress, executing, complete). Highest frontend control, lowest agent freedom.

**Pattern 2 -- Declarative Generative UI (A2UI / Open-JSON-UI):** Agent returns structured JSON specs (cards, lists, forms). Frontend renders them with its own styling constraints. Shared control. Uses `createA2UIMessageRenderer` to consume specs.

**Pattern 3 -- Open-ended Generative UI (MCP Apps):** Agent returns full UI surfaces. Frontend just hosts them. Maximum agent freedom.

**"Chatless" means:** The agent communicates through native interface elements -- rendering task-specific UI when needed, collecting structured inputs, displaying progress, adapting interfaces as context evolves. No chat window required. The AG-UI event stream drives component state directly.

**Relevance to your project:** Pattern 1 is closest to your architecture. Your frontend owns all the card components. The agent (TF.js classifier + Zustand) selects which cards to show, in what order, at what expansion level -- without any chat interface. The agent's decisions manifest purely through layout changes.

---

### 4. Vercel json-render

Released January 2026, already 13k+ GitHub stars. Apache 2.0 license.

**Architecture: AI -> JSON -> Component Catalog -> Rendered UI**

1. Developer defines a catalog of components using Zod schemas
2. LLM generates a JSON spec constrained to that catalog
3. Framework renders progressively as the JSON streams in

**JSON spec format (flat element map with root reference):**
```json
{
  "root": "dashboard",
  "elements": {
    "dashboard": {
      "type": "Card",
      "props": { "title": "Revenue Dashboard" },
      "children": ["revenue"]
    },
    "revenue": {
      "type": "Metric",
      "props": { "label": "Total Revenue", "statePath": "/metrics/revenue", "format": "currency" }
    }
  }
}
```

**Key properties:**
- Guardrailed: AI can only use catalog components (prevents code injection)
- 39 built-in shadcn/ui components
- Cross-platform: same catalog renders on React, Vue, Svelte, React Native
- State binding via `$state`, `$item`, `$index` paths
- Exportable as standalone Next.js projects with zero runtime deps

**Relevance to your project:** json-render's catalog + Zod schema pattern is directly applicable to your Layer 1 (build-time variants). Claude Haiku could generate json-render specs at build time -- one per persona -- constrained to your portfolio component catalog. At runtime, the classifier selects which spec to render. The shadcn/ui compatibility is a bonus since you are already using shadcn.

**Open source:** [github.com/vercel-labs/json-render](https://github.com/vercel-labs/json-render)

---

### 5. Tambo

Open-source React SDK for generative UI. Simpler than CopilotKit, narrower scope.

**How it works:** Components register with Zod schemas that become LLM tool definitions. The agent calls them like functions; Tambo streams props to the component as the LLM generates them.

Two component types:
- **Generative Components**: Render once (summary card, chart)
- **Interactable Components**: Maintain state, handle user interactions (wrapped with `withInteractable()`)

**Relevance to your project:** Less relevant than json-render or AG-UI patterns. Tambo assumes an LLM in the loop at runtime (your constraint is no runtime LLM calls). But the Zod-schema-to-tool-definition pattern is worth noting for how you define your component catalog.

**Open source:** [github.com/tambo-ai/tambo](https://github.com/tambo-ai/tambo)

---

### 6. Real Adaptive Layout Systems

**Evolv AI** is the most technically interesting comparator:
- Uses multi-armed bandit algorithms for dynamic traffic allocation
- Bayesian inference for variant performance validation
- Pipeline: real-time behavior tracking -> ML scoring -> bandit allocation -> variant deployment
- Clusters users by live behavior without predefined rules
- No static personas -- continuously adapts as preferences evolve

**Netflix** (from case studies):
- Dynamic row generation: which content rows appear depends on viewing patterns
- Different artwork for the same title shown to different users
- Binge-watchers get larger "Continue Watching" sections; casual viewers get discovery layouts

**Dynamic Yield** (Mastercard):
- Real-time segmentation + recommendation widgets
- Server-side and client-side experimentation
- 15-25% uplift in personalization effectiveness reported

**No open-source portfolio examples exist.** The search confirmed this is genuinely novel territory for personal sites. Enterprise personalization platforms exist, but nobody has published an open-source portfolio with client-side behavioral classification driving layout adaptation.

---

### 7. Nielsen's "Third UI Paradigm" -- Intent-Based Outcome Specification

Jakob Nielsen's framing (May 2023, expanded through 2025-2026):

| Paradigm | Era | User Action |
|---|---|---|
| Batch Processing | 1945-1964 | Submit complete instruction set, wait for results |
| Command-Based | 1964-present | Issue sequential commands, get feedback per action |
| Intent-Based | Emerging | Specify desired outcome, system determines execution |

The key shift: **the locus of control reverses.** The user says *what* they want, not *how* to get it. The system owns execution decisions.

Nielsen warns this creates a transparency problem -- users cannot trace how results were produced, complicating error correction. His recommendation: **hybrid interfaces** combining intent-based and direct-manipulation elements.

**Relevance to your project:** Your portfolio IS the third paradigm applied to a personal site. The visitor does not navigate -- they express intent through behavior (scrolling patterns, dwell time, click targets), and the agent determines what to show. But Nielsen's hybrid warning maps exactly to your "user must feel in control" constraint. The view-switcher is your direct-manipulation escape hatch. The breathing card transitions are your transparency mechanism -- visible enough that the user knows something is responding to them, gentle enough not to feel manipulative.

---

### Synthesis: What This Means for Your Portfolio

**Architecture patterns that apply directly:**

1. **State format:** Use json-render's flat element map or A2UI's adjacency list for your variant JSON (Layer 1). Both use flat structures with ID references -- ideal for LLM generation at build time and JSON patching at runtime.

2. **State mutation:** AG-UI's snapshot + RFC 6902 JSON Patch pattern for runtime adaptation (Layer 2). Your Zustand store holds the current layout state. The TF.js classifier emits JSON Patch operations to reorder sections, toggle expansion, change content variants.

3. **Component catalog:** Define your card components with Zod schemas (json-render pattern). This constrains what Claude Haiku can generate at build time and what the runtime classifier can activate.

4. **No runtime LLM:** Your architecture is unique among these systems. AG-UI, CopilotKit, Tambo, and json-render all assume an LLM in the loop. You replace the LLM with a TF.js classifier that outputs the same kind of state mutations, but from behavioral signals rather than text prompts.

5. **Agent communication model:** CopilotKit Pattern 1 (Static/Controlled). Frontend owns all components. Agent selects which to show and with what data. No chat. Agent intent expressed purely through layout state changes.

**Open-source repos to study:**
- [vercel-labs/json-render](https://github.com/vercel-labs/json-render) -- catalog definition, JSON spec format, streaming render
- [ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui) -- event types, state sync patterns
- [google/A2UI](https://github.com/google/A2UI) -- adjacency list component model, data binding
- [CopilotKit/CopilotKit](https://github.com/CopilotKit/CopilotKit) -- `useFrontendTool` hook, agent-to-component binding
- [CopilotKit/generative-ui](https://github.com/CopilotKit/generative-ui) -- example implementations of all three patterns

---

Sources:
- [AG-UI Events Documentation](https://docs.ag-ui.com/concepts/events)
- [AG-UI State Management](https://docs.ag-ui.com/concepts/state)
- [A2UI Protocol v0.9 Specification](https://a2ui.org/specification/v0.9-a2ui/)
- [A2UI Components & Structure](https://a2ui.org/concepts/components/)
- [CopilotKit: Developer's Guide to Generative UI in 2026](https://www.copilotkit.ai/blog/the-developer-s-guide-to-generative-ui-in-2026)
- [CopilotKit: State of Agentic UI -- AG-UI vs MCP-UI vs A2UI](https://www.copilotkit.ai/blog/the-state-of-agentic-ui-comparing-ag-ui-mcp-ui-and-a2ui-protocols)
- [Vercel AI SDK: Generative User Interfaces](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces)
- [Vercel json-render (InfoQ)](https://www.infoq.com/news/2026/03/vercel-json-render/)
- [json-render Documentation](https://json-render.dev/)
- [json-render GitHub](https://github.com/vercel-labs/json-render)
- [Tambo GitHub](https://github.com/tambo-ai/tambo)
- [Evolv AI Technical Overview](https://blog.evolv.ai/inside-evolv-ai-technical-overview)
- [Jakob Nielsen: AI Is First New UI Paradigm in 60 Years](https://jakobnielsenphd.substack.com/p/ai-is-first-new-ui-paradigm-in-60)
- [Smart Frontends: AI-Driven UI Case Studies](https://medium.com/kairi-ai/smart-frontends-ai-driven-ui-case-studies-adaptive-ux-examples-2025-guide-69cb42d00697)
- [CopilotKit Generative UI Examples GitHub](https://github.com/CopilotKit/generative-ui)