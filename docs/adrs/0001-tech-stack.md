# Tech Stack Selection

## Status
superseded by ADR-0005

## Date
2026-03-31

## Participants
Firaaz Farook, Claude (AI pair)

## Context and Problem Statement
Need a tech stack for an AI-adaptive portfolio site that: (1) supports build-time AI content generation, (2) runs client-side ML inference, (3) has edge middleware for first-load classification, (4) deploys with zero config, (5) is buildable in small increments by one developer.

## Decision Drivers
- Energy-constrained developer: 1-2 hours per green day
- Must ship incrementally (each session = shippable increment)
- Sub-100ms adaptation latency requirement
- Free/near-free hosting
- Professional look without design skill

## Considered Options
1. **Next.js 14+ (App Router) + shadcn/ui + Tailwind** — Full-featured, ISR, Edge Middleware, Vercel deployment, great DX
2. **Astro + React islands** — Faster static pages, but no native Edge Middleware, weaker ISR story
3. **Remix** — Good SSR, but no ISR, smaller ecosystem for UI components
4. **Plain React SPA** — Simplest, but no SSR/ISR, no edge middleware, poor SEO

## Decision Outcome
Chosen option: **Next.js 14+ with App Router, shadcn/ui, Tailwind CSS, Zustand, Framer Motion, TensorFlow.js, Claude Haiku API, Vercel Edge Functions, PostHog.**

**Starting point:** Fork of dillionverma/portfolio template — eliminates ~70% of design/scaffold work.

Because:
- App Router provides ISR for build-time variant generation and Edge Middleware for referrer classification
- shadcn/ui + Tailwind gives professional appearance with zero design effort
- Zustand is lightweight enough for sub-16ms state updates during adaptation
- Framer Motion handles smooth layout transitions when sections reorder
- TensorFlow.js WASM backend delivers 3-5ms inference without server round-trips
- Claude Haiku at build time costs ~$0.01/build with no runtime LLM costs
- Vercel free tier covers hosting with edge network and zero-config deployment
- PostHog free tier provides adaptation effectiveness analytics

## Consequences
- Good: Entire stack is free-tier deployable; template eliminates weeks of design work; progressive enhancement path from rule-based to ML classification
- Bad: Locked into Vercel ecosystem; dillionverma template may need significant modification; TensorFlow.js adds ~200KB to client bundle
