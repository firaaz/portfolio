# Architecture Vision

## System Purpose
A personal portfolio website where an underlying AI agent tracks visitor behavior and silently adapts the interface — reordering sections, adjusting detail levels, changing CTAs — based on who's visiting. The AI is the stage manager, not the performer.

## Component Overview
```
┌─────────────────────────────────────────────────────┐
│  Vercel Edge Middleware (Layer 3)                    │
│  Referrer/UTM → persona hint → layout cookie        │
├─────────────────────────────────────────────────────┤
│  Next.js App Router                                 │
│  ┌──────────────┐  ┌───────────────────────────┐   │
│  │ Static pages  │  │ Pre-computed variant JSON  │   │
│  │ (ISR/SSG)     │  │ (Layer 1, build-time)      │   │
│  └──────────────┘  └───────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │ Client-side behavioral classification         │   │
│  │ TensorFlow.js + Zustand (Layer 2, runtime)    │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │ UI: shadcn/ui + Tailwind + Framer Motion      │   │
│  └──────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  PostHog Analytics (adaptation effectiveness)       │
└─────────────────────────────────────────────────────┘
```

## Three-Layer Adaptation Architecture

### Layer 1 — Pre-computed Variants (Build Time)
Claude Haiku generates 3-5 persona-specific layout configurations at build/ISR time: section ordering, expanded/collapsed states, headline copy, CTA text. Stored as static JSON. Cost: ~$0.01/build. **No runtime LLM calls.**

### Layer 2 — Client-side Behavioral Classification (Runtime)
Lightweight TensorFlow.js model (<200KB, WASM backend) processes ~15 behavioral signals: scroll velocity, section dwell times (IntersectionObserver), click targets, mouse movement variance, hesitation patterns. Inference every 3-5 seconds. Adapts only at confidence >0.7.

**Browser APIs used:**
- IntersectionObserver — element visibility (thresholds: 0, 0.25, 0.5, 0.75, 1.0)
- mousemove — throttled to requestAnimationFrame
- MutationObserver — dead-click detection
- document.visibilityState — exclude background-tab time
- navigator.sendBeacon — fire-and-forget analytics on unload

### Layer 3 — Edge Middleware (First Load)
Vercel Edge Functions read referrer URL and UTM parameters. LinkedIn visitor → recruiter-optimized layout before any behavioral data. Eliminates the 3-5 second classification delay for the most important segment.

## Latency Budget

| Step | Target | Expected |
|------|--------|----------|
| Signal collection | Continuous | ~0ms (event listeners) |
| Feature vector computation | <10ms | ~2-3ms |
| TensorFlow.js inference | <10ms | ~3-5ms |
| React state update (Zustand) | <16ms | ~1ms |
| DOM reconciliation | <16ms | ~5-10ms |
| **Total adaptation** | **<100ms** | **~15-25ms** |

## Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Framework | Next.js 14+ (App Router) | ISR for variant generation, Edge Middleware, Vercel deployment |
| UI | shadcn/ui + Tailwind CSS | Professional components, no design skill required |
| Starting point | dillionverma/portfolio | Eliminates ~70% of design/scaffold work |
| State | Zustand | Lightweight, fast store updates for layout adaptation |
| Animation | Framer Motion | Smooth layout transitions when sections reorder |
| Classification | TensorFlow.js (WASM) | <200KB, 3-5ms inference, no server round-trip |
| Build-time AI | Claude Haiku API | Generate persona variants (~$0.01/build) |
| Edge | Vercel Edge Functions | Sub-50ms referrer classification, no cold starts |
| Analytics | PostHog (free tier) | Measure adaptation effectiveness |
| Hosting | Vercel (free tier) | Edge network, ISR, zero config |

## Constraints
- **Privacy:** GDPR — session-based behavioral analysis only, no persistent tracking cookies without consent
- **Accessibility:** WCAG 2.1 AA minimum, `prefers-reduced-motion` → opacity-only transitions
- **Anti-creepy design:** group personalization only, visible view-switcher, 300-500ms ease-in-out transitions, default view excellent standalone
- **Performance:** <100ms total adaptation latency, TF.js model <200KB
- **Content:** Zero Emaratech references in public content

## Key Decisions
- ADR-0001: [Tech Stack](adrs/0001-tech-stack.md) — Next.js + shadcn/ui + TF.js + Claude Haiku
- ADR-0002: [Three-Layer Architecture](adrs/0002-three-layer-architecture.md) — build-time variants + client classification + edge middleware

## Future Direction
- **Extractable middleware:** Adaptive UI middleware as standalone npm package for other Next.js sites
- **Blog post:** 2,000-word technical write-up — problem framing, architecture, latency optimization, results
- **ML model:** Replace rule-based classifier with trained TensorFlow.js model (Phase 3)

## Source Document
Full project specification: `docs/pre-start-docs/AI-Adaptive-Portfolio-Website-Handoff.docx`
