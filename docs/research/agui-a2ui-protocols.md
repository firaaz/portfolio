# Research: Agent-UI Interaction Protocols and Design Patterns

## 1. AG-UI: The Agent-User Interaction Protocol

### Interaction Model

AG-UI is an open, event-based protocol by CopilotKit that standardizes real-time, bidirectional communication between AI agent backends and user-facing frontends. It sits at the **Agent <-> User** layer of the emerging protocol stack (alongside MCP for Agent <-> Tools, and A2A for Agent <-> Agent).

The core insight: traditional request-response (REST/GraphQL) fails for agentic applications because agents produce **long-running, streaming, nondeterministic outputs** mixing text, tool calls, and state mutations. AG-UI replaces ad-hoc WebSocket wiring with a single typed JSON event sequence over standard HTTP.

### The 17 Event Types (5 Categories)

**Lifecycle Events (5):**
- `RunStarted` / `RunFinished` / `RunError` -- bracket an agent execution
- `StepStarted` / `StepFinished` -- bracket sub-tasks within a run
- Pattern: `RunStarted -> (StepStarted -> StepFinished)* -> RunFinished|RunError`

**Text Message Events (3):**
- `TextMessageStart` (messageId, role) -> `TextMessageContent` (delta chunks) -> `TextMessageEnd`
- Enables token-by-token streaming display

**Tool Call Events (4):**
- `ToolCallStart` (tool_call_id, tool_name) -> `ToolCallArgs` (streamed argument deltas) -> `ToolCallEnd` -> `ToolCallResult`
- Makes tool execution visible; supports both frontend-executed and backend tools

**State Management Events (3):**
- `StateSnapshot` -- full JSON state for initial sync
- `StateDelta` -- incremental JSON Patch (RFC 6902) diffs
- `MessagesSnapshot` -- complete conversation history refresh
- Pattern: `StateSnapshot -> StateDelta* -> StateSnapshot -> StateDelta*`

**Special Events (2):**
- `RawEvent` -- passthrough from external systems (with source identifier)
- `CustomEvent` -- application-specific extensions (name + value)

**Draft Events (not yet finalized):**
- Activity events (progress between messages)
- Reasoning events (LLM thinking visibility)
- Meta events (annotations/signals independent of runs)
- Interrupt events (for branching/human-in-the-loop)

### Emerging Patterns

1. **Streaming-first**: Every event type supports incremental delivery. No "wait for complete response" pattern.
2. **State synchronization**: Full snapshot + delta model mirrors CRDT thinking -- agents and UIs share mutable state with conflict resolution.
3. **Tool visibility**: Tool calls are first-class events, not hidden behind text. The UI can render progress, arguments, and results.
4. **Composability**: Sub-agent events propagate up through nested runs. A deeply nested sub-agent's UI instructions surface to the top-level frontend.
5. **Spec-agnostic transport**: AG-UI carries A2UI, Open-JSON-UI, or MCP-Apps payloads -- it's a meta-transport, not a UI spec.

### Design Philosophy

- "For many of the most important use-cases, agents are helpful if they can work alongside users" -- the vision is **collaborative agents**, not autonomous ones
- Mirrors how Cursor works: agents aren't separate from users but integrated into shared workspaces
- Zero vendor lock-in: swap agent backends without UI changes, swap UI frameworks without backend changes
- Developer experience: "reducing ad-hoc wiring complexity" while keeping behavior debuggable

---

## 2. A2UI: Google's Declarative Agent-to-UI Spec

### How Agents "Speak UI"

A2UI lets agents express UI intent as **declarative JSON** -- structured data describing what components to render, not executable code. The agent says "I want a date picker bound to /booking/date" and the client renders its own native date picker widget.

### Core Architecture

**Four concepts:**
1. **Surfaces** -- canvases/containers that hold components
2. **Components** -- individual UI elements (Button, TextField, Card, Chart, Map...)
3. **Data Model** -- application state that components bind to declaratively
4. **Catalog** -- the client's pre-approved component library that constrains what agents can request

**Message types:**
- `surfaceUpdate` -- add/modify/remove surfaces
- `updateComponents` -- add/modify components within surfaces
- `dataModelUpdate` -- update bound application state
- `beginRendering` -- signal that a batch of updates is ready to display

### The Catalog Model (Key Innovation)

The client application maintains a whitelist of trusted components. The agent can ONLY request components from this catalog. This is the security boundary -- no arbitrary code execution, no injection vectors, no iframe sandboxing needed.

The catalog also serves as a **capability negotiation** mechanism: the agent knows what UI vocabulary the client supports and composes within those constraints. Different clients (web, mobile, desktop) can expose different catalogs while receiving the same agent output.

### Design Principles

1. **LLM-friendly**: Flat component lists with ID references (not deep nesting). LLMs can generate incrementally, correct errors, and stream updates progressively.
2. **Framework-agnostic**: Same JSON renders as React components, Flutter widgets, or native iOS views. The client owns styling and accessibility.
3. **Separation of concerns**: UI structure (what to show), data model (what state exists), and rendering (how to draw it) are distinct layers.
4. **Safe like data, expressive like code**: Declarative format eliminates code execution risks while supporting rich, interactive interfaces.
5. **Incremental updates**: Agents can efficiently modify existing UI rather than regenerating from scratch -- essential for conversational, evolving interfaces.

### What A2UI Is NOT
- Not a framework (no runtime, no SDK)
- Not a replacement for HTML
- Not a styling system
- Not limited to web platforms

### Versions
- v0.8 stable: Nested component definitions with wrapped objects
- v0.9 draft: Flattened syntax (`"component": "Text"` instead of nested objects), version field added

---

## 3. CopilotKit's "Chatless" Pattern

### The Problem with Chat

Most agent experiences force everything through chat, even when the task needs forms, previews, controls, or step-by-step feedback. Chat becomes a bottleneck: tool execution is hidden behind text, inputs lack validation, multi-step workflows feel opaque.

### Key Components and Hooks

**`useCopilotAction`** -- Defines functions the agent can call in the frontend. The agent triggers actions that manifest as UI changes, not chat messages. Supports `renderAndWait` / `renderAndWaitForResponse` for human-in-the-loop: the agent pauses, presents a custom UI component (e.g., confirmation dialog), and waits for user input before continuing.

**`useCoAgent`** -- Bidirectional state sync between a LangGraph agent and the React application. `useCoAgent("agent-name")` gives the frontend live access to agent state; `setState` feeds application context back to the agent. One hook, full two-way binding.

**`useCoAgentStateRender`** -- Binds specific agent execution nodes to custom UI components:
```javascript
useCoAgentStateRender({
  name: "research_agent",
  node: "download_progress",
  render: ({ state }) => <Progress logs={state.logs} />
})
```
This is the "chatless" mechanism: as the agent moves through its task graph, different UI surfaces render based on the current node/state -- no chat window required.

**`useCopilotChat`** -- Headless hook exposing raw state (messages, input, loading) so you can build fully custom UI. Chat is optional, not required.

### Three Generative UI Patterns

1. **Static Generative UI** (high frontend control): Pre-built components, agent decides when to display them and what data to populate. Like your portfolio's pre-computed variants.
2. **Declarative Generative UI** (shared control): Agent returns JSON specs (A2UI/Open-JSON-UI); frontend renders with its own styling. Agent has creative freedom within the component catalog.
3. **Open-Ended Generative UI** (high agent freedom): Agent returns complete UI surfaces. Maximum flexibility, trades consistency for expressiveness.

### The Architectural Shift

The key insight: **state-based UI rendering replaces tool-calling abstraction**. Instead of "agent calls tool, tool returns text, text displays in chat," the pattern is "agent updates state, state change triggers UI re-render, user sees native components." This eliminates blank loading screens and builds confidence through transparency.

---

## 4. Artium's Dynamic Blocks

### Origin Story

Artium built an innovation management platform for medical researchers. Initial testing showed that conversational AI "was actively undermining the experience" -- researchers needed structured analysis tools, not chat.

### The Dynamic Blocks Pattern

**What they are:** Context-responsive UI components that appear, populate, and adapt based on AI analysis of user needs. When a researcher uploads a document, the system analyzes it and automatically structures findings according to the Stanford Bio Design framework, displaying results as a visual grid of information blocks.

**Key distinction from traditional components:** Dynamic Blocks are not pre-defined layouts with data slots. They are emergent -- the AI decides which blocks to create, what they contain, and how they relate to each other based on content analysis. The block catalog (types of blocks available) is defined; the specific instantiation is AI-driven.

### Governor Patterns (Trust Mechanism)

New AI-generated blocks appear at **70% opacity** to signal provisional status. Users review and approve them to full visibility. This creates a "human-in-the-loop feedback loop that maintained the user's sense of ownership."

This is a crucial design pattern: **visual differentiation between AI-suggested and user-confirmed content**. The UI itself communicates confidence levels.

### Milestone Markers

AI-generated progress indicators and next-step suggestions that "highlight potential gaps in their innovation documentation" without enforcing linear paths. Personalized guidance delivered through native UI, not chat.

### Design System Approach

Artium uses **atomic design thinking** -- smallest components package into organisms, then templates, enabling "thousands of variations" through composition. This accommodates AI's unpredictable outputs while maintaining visual consistency.

### Key Principle: Enhancement, Not Replacement

AI augments traditional UI patterns rather than replacing them. The system feels like "working with an intelligent system that anticipated needs" rather than "talking to a robot."

---

## 5. Real-World Shipped Products

### Google Opal
AI mini-app builder where users create, edit, and share apps using natural language. Uses A2UI to power its dynamic generative UI system. Core contributor to the A2UI spec from the beginning.

### Gemini Enterprise
Business agents render rich, interactive UIs within enterprise applications using A2UI. Agents generate custom forms, dashboards, and workflow interfaces.

### Flutter GenUI SDK
Dynamic AI-generated UIs across mobile, desktop, and web using A2UI as the agent-to-app communication layer.

### Artium Innovation Platform
Medical research tool using Dynamic Blocks pattern -- AI analyzes uploaded documents and generates structured analysis grids with governor patterns for trust.

### AWS AgentCore + CopilotKit (March 2026)
FAST template pattern with Generative UI, shared state, and human-in-the-loop flows. First major cloud provider integration of AG-UI.

### Cursor (Paradigm Example)
While not using AG-UI/A2UI explicitly, Cursor embodies the design philosophy: an AI agent integrated into the workspace, collaborating through native UI rather than chat. AG-UI's creators cite it as the aspirational model.

---

## 6. Design Philosophy: Principles for Agent-Driven Interfaces

### Six Core Principles

**1. The Agent is the Stage Manager, Not the Performer**
The agent orchestrates what the user sees -- reordering, adapting, generating UI -- but the native interface remains the star. Users interact with familiar components (forms, cards, grids), not with "AI." This directly aligns with the portfolio project's stated vision.

**2. Collaborative Over Autonomous**
The emerging consensus rejects fully autonomous agents in favor of "co-pilot" models. AG-UI's creators: "Agents are helpful if they can work alongside users." The vision is shared workspaces where agent and user see the same state and iterate together.

**3. Transparency Through Native UI, Not Explanations**
Rather than agents explaining what they did in text, they show their work through UI state: progress indicators, provisional content at reduced opacity, visible tool execution, intermediate results rendered as components. Trust comes from seeing, not from being told.

**4. Declarative Intent Over Executable Code**
A2UI's core insight: agents should describe WHAT they want shown, not HOW to show it. The client maintains control over rendering, styling, accessibility, and security. This separation enables the same agent to drive different UIs on different platforms.

**5. Catalog-Constrained Creativity**
Both A2UI's component catalog and Artium's block system follow the same pattern: define a vocabulary of possible UI elements, then let the agent compose freely within that vocabulary. This balances expressiveness with safety and consistency.

**6. Progressive Confidence**
- Start with high-confidence defaults (edge middleware persona detection)
- Refine with behavioral signals over time (client-side classification)
- Always provide a good experience even at zero confidence (default view)
- Signal confidence levels through UI (Artium's 70% opacity pattern)

### The Emerging Architecture Pattern

```
Agent Backend          Protocol Layer         Frontend
--------------         ---------------        ---------
LLM + Tools    --->    AG-UI Events    --->   Native Components
State Machine  <---    State Sync      <---   User Actions
Build-time AI  --->    Static JSON     --->   Pre-computed Variants
Edge Logic     --->    Middleware       --->   Initial Layout
```

### Vision: Ambient, Adaptive Interfaces

The 2026 consensus vision:
- **From fixed to intent-driven**: Interfaces assemble dynamically based on context, not pre-defined page layouts
- **From chat to ambient**: AI "quietly lives inside the UI as an ambient layer, invisible unless needed"
- **From broadcast to personalized**: Two users encounter different layouts optimized for their individual needs -- "coherence under variation"
- **From screens to choreography**: Interaction spans modalities (visual, spatial, temporal) while maintaining unbroken context
- **From automation to governance**: Designers govern agent behavior through intentional friction, checkpoints, and escalation paths

---

## 7. Implications for the AI-Adaptive Portfolio

### Direct Pattern Mappings

| Portfolio Concept | Protocol/Pattern Equivalent |
|---|---|
| Pre-computed persona variants (Layer 1) | A2UI catalog + static generative UI pattern |
| Client-side behavioral classification (Layer 2) | AG-UI StateDelta for real-time state sync |
| Edge middleware persona hints (Layer 3) | AG-UI RunStarted with initial StateSnapshot |
| Section reordering/adaptation | A2UI surfaceUpdate + updateComponents |
| Visible view-switcher | Governor pattern (transparency principle) |
| 300-500ms transitions | "Choreography" principle from ambient UI |
| Confidence threshold (>0.7) | Progressive confidence principle |
| "AI is the stage manager" | Core principle #1 from the protocol ecosystem |

### Novel Patterns to Consider

1. **Governor-Style Confidence Indicators**: Like Artium's 70% opacity, use visual cues (not text) to indicate when the AI has adapted the view. Subtle border changes, section emphasis shifts, or gentle highlight pulses.

2. **Catalog-Constrained Personalization**: Define a finite set of layout variants (A2UI catalog model), then let the behavioral classifier select and interpolate between them. This keeps the experience consistent while enabling personalization.

3. **State-Based Rendering**: Instead of imperative "if recruiter, show X," use a Zustand state machine where the classifier updates persona confidence scores and components reactively render based on those scores (CoAgent pattern).

4. **Declarative Layout Specs**: Store persona variants as A2UI-inspired JSON (surfaces + components + data bindings) rather than conditional React code. This makes variants testable, serializable, and potentially swappable at runtime.

5. **Progressive Disclosure of Agency**: Start with zero visible AI. As confidence grows, introduce subtle adaptations. If the user notices and engages with the view-switcher, acknowledge the personalization. Never lead with "AI-powered."

---

## Sources

- [AG-UI Overview - Official Docs](https://docs.ag-ui.com/)
- [Master the 17 AG-UI Event Types - CopilotKit Blog](https://www.copilotkit.ai/blog/master-the-17-ag-ui-event-types-for-building-agents-the-right-way)
- [Introducing AG-UI: The Protocol Where Agents Meet Users - CopilotKit Blog](https://www.copilotkit.ai/blog/introducing-ag-ui-the-protocol-where-agents-meet-users)
- [AG-UI and A2UI Explained: How the Emerging Agentic Stack Fits Together - CopilotKit Blog](https://www.copilotkit.ai/blog/ag-ui-and-a2ui-explained-how-the-emerging-agentic-stack-fits-together)
- [What is A2UI? - Official Site](https://a2ui.org/introduction/what-is-a2ui/)
- [Introducing A2UI - Google Developers Blog](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/)
- [Google A2UI GitHub](https://github.com/google/A2UI/)
- [The Developer's Guide to Generative UI in 2026 - CopilotKit Blog](https://www.copilotkit.ai/blog/the-developer-s-guide-to-generative-ui-in-2026)
- [Everything You Need To Build Agent-Native Applications - CopilotKit Blog](https://www.copilotkit.ai/blog/everything-you-need-to-build-agent-native-applications)
- [Beyond Chat: How AI is Transforming UI Design Patterns - Artium](https://artium.ai/insights/beyond-chat-how-ai-is-transforming-ui-design-patterns)
- [State of Design 2026: When Interfaces Become Agents - Medium](https://medium.com/design-bootcamp/state-of-design-2026-when-interfaces-become-agents-fc967be10cba)
- [The A2UI Protocol: A 2026 Complete Guide - DEV Community](https://dev.to/czmilo/the-a2ui-protocol-a-2026-complete-guide-to-agent-driven-interfaces-2l3c)
- [A2A, MCP, AG-UI, A2UI: The Essential 2026 AI Agent Protocol Stack - Medium](https://medium.com/@visrow/a2a-mcp-ag-ui-a2ui-the-essential-2026-ai-agent-protocol-stack-ee0e65a672ef)
- [CopilotKit CoAgents](https://webflow.copilotkit.ai/coagents)
- [useCopilotAction Reference](https://docs.copilotkit.ai/reference/hooks/useCopilotAction)
- [useCoAgentStateRender Reference](https://docs.copilotkit.ai/reference/hooks/useCoAgentStateRender)
- [AG-UI GitHub Repository](https://github.com/ag-ui-protocol/ag-ui)
- [The Future of UI Design Past 2026 - Basanta Sapkota](https://www.basantasapkota026.com.np/2026/03/the-future-of-ui-design-past-2026.html)
