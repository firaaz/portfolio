# Research: Lightweight Edge & Backend Agent Architectures for Web Experiences (2025-2026)

## Purpose
Research findings on agent architectures operating at different layers of a web application, with practical implications for the AI-adaptive portfolio project.

---

## 1. Client-Side / Browser Agents

### 1.1 ML Runtimes in the Browser

**TensorFlow.js**
- Mature runtime, supports WebGL, WebAssembly, and WebGPU backends
- Good for custom classification models — a small dense neural network for behavioral classification easily fits under 200KB
- WASM backend provides consistent cross-browser performance; WebGPU backend (newer) provides GPU acceleration
- 3-5ms inference for small models is realistic and well-documented

**ONNX Runtime Web (v2.6+)**
- Near CPU-parity performance in browser: benchmarks show 12.3ms/token for LLaMA-7B vs 11.8ms native (4.2% gap)
- Supports 4-bit and 8-bit quantized models, making even billion-parameter models feasible in-browser
- WebGPU support via collaboration with Transformers.js
- Converts from PyTorch, TensorFlow, Scikit-learn, HuggingFace

**Transformers.js (Hugging Face)**
- Functionally equivalent to Python transformers library but runs entirely in-browser
- Uses ONNX Runtime Web under the hood
- 20+ reference implementations for WebGPU-accelerated browser apps
- Supports text classification, NER, question answering, embeddings, summarization, and more
- Best option if you want pre-trained HuggingFace models in the browser without conversion hassle

**WebLLM (MLC-AI)**
- High-performance in-browser LLM inference engine using WebGPU
- Retains up to 80% of native performance on same device
- Supports Llama 3, Phi 3, Gemma, Mistral, Qwen natively
- 7B parameter models compressed to run in browser memory
- WebWorkers for off-main-thread inference (keeps UI responsive)
- **Too heavy for a <200KB agent** — these are full LLMs measured in GB even when quantized

### 1.2 Chrome Built-in AI APIs

**Gemini Nano via Prompt API** (Chrome 140+, July 2025)
- Small LLM running entirely in-browser via WebAssembly/WebGPU, no cloud calls
- Model downloaded separately on first use (~1.7GB download, runs locally after)
- Supported APIs: Prompt API, Summarizer API, Translator API, Writer API, Rewriter API
- Multimodal support: image and audio input
- Language support: English, Spanish, Japanese (as of Chrome 140)
- **Limitations**: Desktop only (no mobile), Chrome-only, large initial download
- CPU support rolling out (previously GPU-only)
- **Not suitable for portfolio project**: Chrome-only, huge download, overkill for classification

### 1.3 What's Realistic for a <200KB Browser Agent?

For the portfolio's behavioral classification use case, the realistic options are:

| Approach | Size | Inference Time | Feasibility |
|----------|------|---------------|-------------|
| TensorFlow.js custom MLP | 50-150KB model + ~70KB WASM runtime (cached) | 2-5ms | **Best fit** — purpose-built for this |
| ONNX Runtime Web small model | 50-200KB model + ~200KB runtime | 3-8ms | Good alternative, better tooling for model export |
| Rule-based classifier (no ML) | <10KB | <1ms | Simplest, no ML overhead, good enough for 3-5 personas |
| Transformers.js tiny model | 500KB+ minimum | 10-50ms | Too large for constraint |
| WebLLM / Gemini Nano | GB-scale | 100ms+ | Way too large |

**Recommendation for the portfolio**: A rule-based classifier or tiny TensorFlow.js MLP is the sweet spot. For 3-5 persona classification from ~15 behavioral signals, a hand-crafted rule system may outperform ML given the limited training data. Reserve TF.js for Phase 3 when you have real behavioral data to train on.

---

## 2. Edge Agents (Vercel Edge, Cloudflare Workers, Deno Deploy)

### 2.1 Vercel Edge Functions

**Capabilities**:
- V8 isolate-based, boot in milliseconds (no cold start)
- Streaming responses supported natively, up to 300 seconds
- AI SDK integration optimized for edge runtime
- Sub-50ms TTFB achievable for decision logic

**Vercel AI SDK v6 (Feb 2026)**:
- Unified access to 100+ AI models via AI Gateway (OpenAI, Anthropic, Google, Mistral, etc.)
- `useChat()` hook for streaming chat interfaces (<20 lines of code)
- `useObject()` hook for streaming structured data with incremental updates
- Agent class (since SDK v5, July 2025): wraps `generateText`/`streamText` with agentic loop control
- `stopWhen` and `prepareStep` for fine-grained multi-step tool call control
- Prompt caching, real-time observability, budget controls
- **Production latency**: sub-50ms with caching, 30% cost reduction through prompt caching

**Limitations for edge**:
- Edge functions can't run TensorFlow.js or heavy ML (no WASM support for large models)
- Edge is best for lightweight logic: referrer parsing, UTM classification, cookie management
- LLM calls from edge add 100-500ms per inference call (network to API provider)

### 2.2 Cloudflare Agents SDK (2025)

This is the most significant development for edge agents:

**Architecture**:
- Agents are TypeScript classes running on Durable Objects (stateful micro-servers)
- Each agent has: persistent SQL database, key-value state, WebSocket connections, scheduling
- State syncs to connected clients in real-time, survives restarts/deploys/hibernation
- Agents hibernate when idle, wake on demand — **millions of instances, zero cost when inactive**

**Key primitives**:
- `@callable()` decorator turns methods into typed RPC endpoints
- Built-in AI model calls (Workers AI, OpenAI, Anthropic, Gemini) with streaming
- Scheduling: delays, specific times, cron expressions — agents wake themselves
- Server-side tools, client-side browser tools, human-in-the-loop approval flows
- MCP support for inter-agent tool sharing

**Workers AI inference at the edge**:
- 50+ open-source models available (text gen, image classification, speech-to-text)
- Custom inference engine "Infire" (Rust-based) for optimized performance
- **Realistic latency**: 10-30ms network to edge, then 500-2000ms for 8B parameter model inference
- For small classification models, much faster — but still not sub-50ms for LLM inference

**vs. Plain Workers**: Workers are stateless request handlers. Agents maintain persistent state, coordinate across instances, operate autonomously on schedules, and support multi-turn conversations.

### 2.3 Can an Edge Agent Make Decisions in <50ms?

**Yes, for rule-based decisions**:
- Referrer/UTM parsing + cookie setting: 1-5ms
- Simple classification logic (if/else, lookup tables): <1ms
- Reading/writing edge KV store: 5-10ms
- **Total: 10-20ms** — well within budget

**No, for LLM-based decisions**:
- Even the smallest models take 100ms+ for inference
- Network hop to LLM API: 50-200ms additional
- **Minimum: 200-500ms** for any LLM call

**Verdict**: Edge is ideal for Layer 3 (first-load persona detection). Use deterministic logic, not LLM inference, at the edge.

---

## 3. Backend Agents for Web Experiences

### 3.1 Agent Frameworks

**LangGraph (LangChain)**:
- Stateful, multi-agent workflows as directed cyclic graphs
- State persistence with reducer logic for concurrent updates
- Precise control over execution order, branching, error recovery
- Token-by-token streaming for frontend visualization
- Best for complex workflows with loops, parallel branches, approval gates
- **Python-first** (has JS bindings but less mature)

**CrewAI**:
- Role-based multi-agent orchestration ("crews" of specialized agents)
- Gets from idea to working prototype ~40% faster than LangGraph
- v1.10.1 (March 2026): native MCP and A2A (Agent-to-Agent) support
- 44,600+ GitHub stars
- Human-in-the-loop for oversight and adjustment
- **Python-only**

**Mastra** (from the Gatsby team):
- **TypeScript-native** agent framework — most relevant for Next.js projects
- 22.3k+ GitHub stars, millions of monthly downloads
- Agents, workflows, memory (short-term and long-term), RAG, evals
- Mastra Studio: local developer playground for visualizing/testing agents
- Integrates with React, Next.js, CopilotKit, Assistant UI
- Deploys anywhere as standalone server or integrates into existing Node apps
- **Best fit for a Next.js portfolio project** if backend agents are needed

### 3.2 Agent-Frontend Communication

**AG-UI Protocol (CopilotKit, May 2025)**:
- Open protocol standardizing AI agent <-> frontend communication
- Event-driven architecture with 16 standardized event types:
  - Lifecycle: RUN_STARTED, RUN_FINISHED, RUN_ERROR, STEP_STARTED, STEP_FINISHED
  - Text: TEXT_MESSAGE_START, TEXT_MESSAGE_CONTENT, TEXT_MESSAGE_END
  - Tool calls: TOOL_CALL_START, TOOL_CALL_ARGS, TOOL_CALL_END
  - State: STATE_SNAPSHOT, STATE_DELTA, MESSAGES_SNAPSHOT
  - Special: RAW, CUSTOM
- Transport-agnostic: SSE, HTTP Binary Protocol, WebSockets, Webhooks
- Already adopted by Google, Amazon, Microsoft, LangChain
- Integrations: LangGraph, Mastra, CrewAI, AG2; coming soon for Vercel AI SDK, Cloudflare Agents

**Other communication patterns**:
- **SSE (Server-Sent Events)**: Simplest for one-way streaming (agent -> frontend). Works with HTTP/2.
- **WebSockets**: Bidirectional, needed for real-time user signal -> agent -> UI adaptation loops
- **Vercel AI SDK streaming**: Built-in streaming over HTTP with `useChat`/`useObject` hooks

### 3.3 Real-Time Behavioral Observation from Backend

**Latency cost of server round-trip**:
- User event -> server -> decision -> response: 100-300ms minimum
- With LLM inference: 500-2000ms additional
- **Too slow for real-time UI adaptation** (target is <100ms total)

**When backend agents make sense**:
- Build-time content generation (your Layer 1)
- Analytics aggregation and model retraining
- Complex multi-step reasoning that doesn't need real-time response
- A/B test configuration management
- Periodic (not real-time) persona refinement

### 3.4 CopilotKit Architecture

- Frontend: React components (`<CopilotChat>`, `<CopilotPopup>`)
- Backend Runtime: `@copilotkit/runtime` — server-side middle layer between frontend, LLMs, and agents
- Python SDK bridges to LangGraph, CrewAI, etc.
- Agents run in backend (runtimeUrl) for security
- v1.50 (2026): simplified architecture, InMemory and SQLite thread runners
- **Not directly applicable to portfolio** — designed for interactive copilot UIs, not ambient adaptation

---

## 4. Hybrid Architectures

### 4.1 Decision Matrix: What Runs Where?

| Decision Type | Layer | Latency | Example |
|--------------|-------|---------|---------|
| First-load persona hint | Edge middleware | 10-20ms | LinkedIn referrer -> recruiter layout |
| Real-time behavioral classification | Client (browser) | 15-25ms | Scroll/click patterns -> persona confidence |
| Section reordering / CTA swap | Client (Zustand) | 1-5ms | Apply pre-computed variant from JSON |
| Content variant generation | Build-time (backend) | N/A (pre-computed) | Claude Haiku generates persona JSONs |
| Analytics aggregation | Backend | N/A (async) | PostHog events, model effectiveness |
| Model retraining | Backend (offline) | N/A (batch) | Update TF.js model from collected signals |

### 4.2 Coordination Across Layers

**Pattern: Cascading confidence with pre-computed variants**

1. **Build time**: Generate all persona variant JSONs (3-5 variants). No runtime LLM calls needed.
2. **Edge (first request)**: Check referrer/UTM. If match (e.g., LinkedIn), set persona cookie, serve matching variant. Confidence: medium (0.6-0.8).
3. **Client (0-5 seconds)**: Load default variant. Begin collecting behavioral signals.
4. **Client (5-15 seconds)**: Run classification. If confidence > 0.7 and disagrees with edge hint, transition to new variant. If agrees, increase confidence.
5. **Client (ongoing)**: Continue refining. Only adapt at natural breakpoints (scroll pause, section transition) to avoid jarring changes.

**State flow**:
```
Edge cookie (persona hint)
  -> Zustand initial state
  -> Behavioral signals update Zustand
  -> React re-renders with Framer Motion transitions
```

No backend round-trips needed during the user session. This is the key insight: **the portfolio architecture should be backend-free at runtime**.

### 4.3 Industry Pattern: Hybrid Edge-Cloud AI

- 65% of enterprise AI apps now use hybrid architectures (2025 data)
- Pattern: edge for latency-critical decisions, cloud for complex reasoning
- Cloudflare Agents + Workers AI is the most complete edge-native agent platform
- Vercel Edge + AI SDK is the most Next.js-integrated option

---

## 5. Specific Tools & Frameworks Summary

### 5.1 Vercel AI SDK (v6)

| Feature | Relevance to Portfolio |
|---------|----------------------|
| AI Gateway (100+ models) | Build-time variant generation via Claude Haiku |
| `useChat()` / `useObject()` hooks | Not needed (no chat UI) |
| Edge Runtime streaming | Could stream variant selection rationale for debug mode |
| Agent class (`stopWhen`, `prepareStep`) | Overkill — portfolio doesn't need multi-step agent loops |
| Prompt caching | Saves cost on repeated build-time generation |

### 5.2 Cloudflare Agents SDK

| Feature | Relevance to Portfolio |
|---------|----------------------|
| Stateful Durable Objects | Could maintain per-user session state without cookies |
| WebSocket real-time sync | Could stream behavioral classification to dashboard |
| Workers AI inference | Too slow for real-time adaptation; fine for analytics |
| Scheduling / cron | Content variant regeneration on schedule |
| MCP support | Inter-agent communication (future) |

**Verdict**: Interesting but adds infrastructure complexity. Vercel Edge + client-side is simpler for the portfolio scale.

### 5.3 Mastra (TypeScript Agent Framework)

| Feature | Relevance to Portfolio |
|---------|----------------------|
| TypeScript-native | Matches stack perfectly |
| Agents + workflows | Build-time content generation pipeline |
| Memory (short/long-term) | Not needed for session-only analysis |
| Mastra Studio | Useful for debugging agent behavior locally |
| AG-UI integration | Could connect build-time agent to preview UI |

**Verdict**: Worth considering if build-time variant generation becomes complex enough to warrant an agent framework. Currently Claude Haiku API calls are simple enough without it.

### 5.4 AG-UI Protocol

| Feature | Relevance to Portfolio |
|---------|----------------------|
| Standardized event types | Useful if adding a debug/admin panel showing adaptation decisions |
| Transport agnostic | SSE would work for streaming classification updates |
| State management events | STATE_DELTA maps well to Zustand partial updates |

**Verdict**: Over-engineered for the portfolio's needs. The adaptation is ambient, not conversational. AG-UI is designed for interactive agent UIs.

### 5.5 Ambient/Background Agent Frameworks

The "ambient agent" space in 2025-2026 is mostly focused on **browser automation agents** (Browser Use, Fellou, OpenAI Atlas) rather than **background UX adaptation agents**. No framework specifically targets the "silent stage manager" pattern the portfolio uses.

**This means**: The portfolio's architecture is novel. There's no off-the-shelf framework for ambient behavioral adaptation. The three-layer architecture (build-time variants + client classification + edge middleware) is a custom design that draws from multiple paradigms but doesn't map to any single framework.

---

## 6. Practical Implications for the Portfolio

### What the research validates:
1. **TensorFlow.js WASM for <200KB classification is well-supported** — the runtime is mature, 3-5ms inference is realistic
2. **Vercel Edge middleware for first-load persona detection is the right pattern** — sub-50ms deterministic decisions
3. **No runtime LLM calls is the right constraint** — even edge LLM inference takes 200ms+
4. **Pre-computed variants (Layer 1) avoid the biggest latency trap** — build-time is where LLMs belong

### What the research suggests reconsidering:
1. **Rule-based classifier may beat TF.js for Phase 1** — with only 3-5 personas and ~15 signals, a hand-tuned decision tree could match ML accuracy without the model weight overhead. Start with rules, graduate to TF.js when you have training data.
2. **ONNX Runtime Web is a viable alternative to TF.js** — better model export tooling, similar performance. Worth evaluating.
3. **Cloudflare Agents is interesting but wrong layer** — stateful edge agents are powerful but the portfolio doesn't need persistent per-user state beyond session cookies. Vercel Edge is simpler and sufficient.
4. **AG-UI/CopilotKit/Mastra are for interactive agents, not ambient ones** — the portfolio's agent is a silent classifier, not a conversational assistant. These frameworks solve a different problem.

### Recommended architecture (unchanged but refined):

```
Build Time (Layer 1)
├── Claude Haiku via Vercel AI SDK → persona variant JSONs
├── Prompt caching for cost efficiency
└── ISR for periodic regeneration

Edge Middleware (Layer 3 — runs first)
├── Vercel Edge Function (not Cloudflare)
├── Referrer/UTM → persona hint cookie
├── Deterministic logic only, no ML/LLM
└── Target: <20ms

Client Runtime (Layer 2)
├── Phase 1: Rule-based classifier (<10KB)
│   └── Weighted scoring of ~15 behavioral signals
├── Phase 3: TF.js WASM model (<150KB)
│   └── Trained on real behavioral data from PostHog
├── Zustand for state management
├── Framer Motion for transitions (300-500ms)
└── Target: <25ms total classification + render

Analytics (async, non-blocking)
├── PostHog events via sendBeacon
└── Feed back into model training (Phase 3)
```

---

## Sources

### Client-Side ML
- [Battle of Lightweight AI Engines: TF Lite vs ONNX Runtime Web](https://dev.to/m-a-h-b-u-b/battle-of-the-lightweight-ai-engines-tensorflow-lite-vs-onnx-runtime-web-fch)
- [Client-Side AI in 2025](https://medium.com/@sauravgupta2800/client-side-ai-in-2025-what-i-learned-running-ml-models-entirely-in-the-browser-aa12683f457f)
- [WebAssembly for LLM Inference in Browsers](https://dasroot.net/posts/2026/01/webassembly-llm-inference-browsers-onnx-webgpu/)
- [AI in Browser with WebGPU: 2025 Guide](https://aicompetence.org/ai-in-browser-with-webgpu/)
- [WebLLM GitHub](https://github.com/mlc-ai/web-llm)
- [WebLLM Paper (arXiv)](https://arxiv.org/abs/2412.15803)
- [3W for In-Browser AI: WebLLM + WASM + WebWorkers](https://blog.mozilla.ai/3w-for-in-browser-ai-webllm-wasm-webworkers/)
- [Transformers.js v3 Announcement](https://huggingface.co/blog/transformersjs-v3)
- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js/en/index)

### Chrome Built-in AI
- [Chrome Prompt API Documentation](https://developer.chrome.com/docs/ai/prompt-api)
- [Chrome Built-in AI Overview](https://developer.chrome.com/docs/ai)
- [Gemini Nano CPU Support](https://developer.chrome.com/blog/gemini-nano-cpu-support)
- [Chrome Gemini Nano Complete Guide](https://flaming.codes/posts/chrome-gemini-nano-built-in-ai)

### Edge Agents
- [Vercel AI SDK v6 Announcement](https://vercel.com/blog/ai-sdk-6)
- [Vercel AI SDK Introduction](https://ai-sdk.dev/docs/introduction)
- [Vercel Edge Functions](https://vercel.com/docs/functions/runtimes/edge/edge-functions.rsc)
- [Vercel AI Review 2026](https://www.truefoundry.com/blog/vercel-ai-review-2026-we-tested-it-so-you-dont-have-to)
- [Cloudflare Agents Documentation](https://developers.cloudflare.com/agents/)
- [Cloudflare Agents GitHub](https://github.com/cloudflare/agents)
- [Cloudflare Workers AI](https://workers.cloudflare.com/product/workers-ai/)
- [Cloudflare AI Week 2025](https://www.cloudflare.com/innovation-week/ai-week-2025/updates/)
- [Edge Computing with Cloudflare Workers 2026](https://calmops.com/cloud/edge-computing-cloudflare-workers-complete-guide-2026/)

### Backend Agent Frameworks
- [AI Agent Frameworks Compared 2026](https://letsdatascience.com/blog/ai-agent-frameworks-compared)
- [LangGraph vs CrewAI vs AutoGen 2026](https://o-mega.ai/articles/langgraph-vs-crewai-vs-autogen-top-10-agent-frameworks-2026)
- [Mastra Framework](https://mastra.ai/)
- [Mastra on The New Stack](https://thenewstack.io/mastra-empowers-web-devs-to-build-ai-agents-in-typescript/)
- [Mastra GitHub](https://github.com/mastra-ai/mastra)

### Agent-Frontend Communication
- [AG-UI Protocol GitHub](https://github.com/ag-ui-protocol/ag-ui)
- [AG-UI Architecture Documentation](https://docs.ag-ui.com/concepts/architecture)
- [AG-UI Introduction (CopilotKit)](https://www.copilotkit.ai/blog/introducing-ag-ui-the-protocol-where-agents-meet-users)
- [AG-UI Codecademy Guide](https://www.codecademy.com/article/ag-ui-agent-user-interaction-protocol)
- [CopilotKit v1.50 Release](https://www.copilotkit.ai/blog/copilotkit-v1-50-release-announcement-whats-new-for-agentic-ui-builders)

### Hybrid Architectures
- [Hybrid AI Agent Architectures 2025](https://markaicode.com/tech/hybrid-ai-agent-architectures-2025/)
- [Deploying Agentic AI in Edge/On-Prem/Hybrid](https://digitalthoughtdisruption.com/2025/07/31/deploying-agentic-ai-edge-onprem-hybrid-cloud/)
- [Agentic Browser Landscape 2026](https://nohacks.co/blog/agentic-browser-landscape-2026)
