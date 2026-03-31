# Three-Layer Adaptation Architecture

## Status
accepted

## Date
2026-03-31

## Participants
Firaaz Farook, Claude (AI pair)

## Context and Problem Statement
The portfolio needs to adapt its UI based on visitor persona (recruiter, technical lead, developer). Must achieve <100ms adaptation latency, work on first load without behavioral data, respect privacy (no persistent tracking), and degrade gracefully.

## Decision Drivers
- Sub-100ms total adaptation latency
- First-load experience matters most for recruiters (primary audience)
- No runtime LLM costs (budget: ~$0.01/build)
- GDPR compliance: session-only behavioral analysis
- Anti-creepy: subtle, group-level personalization only

## Considered Options
1. **Three-layer (build-time + client ML + edge)** — Pre-computed variants, client-side classification, edge middleware for first load
2. **Runtime LLM classification** — Send signals to Claude API for real-time classification
3. **Edge-only (server-side)** — All classification in Vercel Edge Functions with server state
4. **Client-only ML** — TensorFlow.js handles everything, no edge or build-time layer

## Decision Outcome
Chosen option: **Three-layer architecture**, because:

**Layer 1 (build-time):** Claude Haiku generates persona-specific layout configs as static JSON. Eliminates runtime LLM costs entirely.

**Layer 2 (client-side):** TensorFlow.js (<200KB) classifies behavioral signals every 3-5s. Adapts only at confidence >0.7. No server round-trips = sub-25ms adaptation.

**Layer 3 (edge):** Vercel Edge reads referrer/UTM on first request. LinkedIn → recruiter layout immediately, before any behavioral data exists.

The layers are independent and progressively buildable: edge-only works as v1.0, add client classification for v2.0, add ML model for v3.0.

## Consequences
- Good: Sub-25ms adaptation; $0.01/build cost; recruiter experience optimized from first load; each layer is independently shippable; graceful degradation (disable any layer, others still work)
- Bad: Three systems to maintain; build-time variants may drift from runtime behavior; confidence threshold (0.7) needs tuning with real data
