**AI-Adaptive Portfolio Website**

Project Handoff Document

Last updated: March 2026 \| Status: Ready to scope and build

**Purpose:** Drop this into any Claude session to start building.
Contains the concept, technical architecture, build plan, and all
research findings.

**Companion docs:** Career-Strategy-Complete.md (career context),
Whats-Next-Handoff.md (action sequence)

1\. The Concept

A personal portfolio website where an underlying AI agent tracks visitor
behavior and silently adapts the interface --- reordering sections,
adjusting detail levels, changing CTAs --- based on who\'s visiting and
what they\'re looking for. No chatbot. No visible AI. The agent is the
stage manager, not the performer.

1.1 The Thesis

Chat-first interfaces are lazy design that offloads the UX problem onto
the user. The next generation of AI-powered interfaces should be
invisible --- the AI operates the interface rather than replacing it. A
website that silently notices you\'ve hovered on three project titles
without clicking, infers you\'re trying to understand scope, and
surfaces an architecture diagram before you ask.

1.2 Why This Project

- **Portfolio AND portfolio project in one:** the website IS the
  project. No separate \'thing to put on a website.\'

- **Novel:** No publicly documented portfolio site does this as of March
  2026.

- **Product-engineering signal:** demonstrates how you think about
  users, not just how you write code.

- **Extractable:** the adaptive middleware can be extracted as a
  reusable open-source Next.js package for other developers.

- **Blog post material:** the technical write-up about the system is the
  single highest-value hiring signal per research.

1.3 Who This Is For

Firaaz Farook --- Senior Software/AI Engineer, 6+ years, built
production agentic AI at government scale (Salama platform, 25K+
queries/month, 7 languages). Targeting remote European AI companies at
\$100K-\$140K. Energy-constrained: 1-2 hours per green day, 3-4 crash
days per week. Must be buildable in small increments.

2\. How It Works

2.1 Visitor Personas

The site detects three visitor types and adapts accordingly:

  ------------- ------------------------ ---------------------------------
  **Persona**   **Behavior Signals**     **What They See**

  Recruiter     Arrives from LinkedIn,   Role title + 3 quantified
                fast scroll, scans       achievements + contact CTA above
                headings, \<30s on page  the fold

  Technical     High dwell time on       Detailed case study: problem
  Lead          project sections, clicks framing, constraints, engineering
                architecture links       decisions

  Developer     Arrives from GitHub/HN,  Repository links, tech stack
                engages with code/tech   details, system design artifacts,
                content first            blog posts
  ------------- ------------------------ ---------------------------------

2.2 Three-Layer Architecture

**Layer 1 --- Pre-computed variants (build time):** Call Claude Haiku at
build time to generate 3-5 persona-specific layout configurations ---
section ordering, expanded/collapsed states, headline copy, CTA text.
Stored as static JSON. Cost per build: \~\$0.01. No runtime LLM calls.

**Layer 2 --- Client-side behavioral classification (runtime):**
Lightweight TensorFlow.js model (\<200KB) processes \~15 signals: scroll
velocity, section dwell times (IntersectionObserver), click targets,
mouse movement variance, hesitation patterns. Inference in 3-5ms on WASM
backend. Classifies every 3-5 seconds, adapts only when confidence
\>0.7.

**Layer 3 --- Edge middleware (first load):** Vercel Edge Functions read
referrer URL and UTM parameters. LinkedIn visitor gets
recruiter-optimized layout before any behavioral data is collected.
Eliminates the 3-5 second classification delay for the most important
visitor segment.

2.3 Latency Budget

  -------------------------- ---------------------- ----------------------
  **Step**                   **Target**             **Expected**

  Signal collection          Continuous             \~0ms (event
                                                    listeners)

  Feature vector computation \<10ms                 \~2-3ms

  TensorFlow.js inference    \<10ms                 \~3-5ms

  React state update         \<16ms                 \~1ms
  (Zustand)                                         

  DOM reconciliation         \<16ms                 \~5-10ms

  Total adaptation           \<100ms                \~15-25ms
  -------------------------- ---------------------- ----------------------

2.4 Anti-Creepy Design Rules

- Personalize to audience groups, not individuals

- Keep adaptations in the \'mundane\' tier --- content prioritization,
  not dramatic layout shifts

- Provide a visible view-switcher control (let users pick
  recruiter/technical/developer view)

- Never use cross-context data

- Site works perfectly in default state for anyone who opts out

- 300-500ms transitions with ease-in-out easing for layout changes

- Respect prefers-reduced-motion --- opacity transitions instead of
  positional shifts

- GDPR: session-based behavioral analysis only, no persistent tracking
  cookies without consent

3\. Tech Stack

  ---------------- ------------------------ ---------------------------------
  **Component**    **Technology**           **Why**

  Framework        Next.js 14+ (App Router) ISR for variant generation, Edge
                                            Middleware, Vercel deployment

  UI               shadcn/ui + Tailwind CSS Professional components, no
                                            design skill required

  Starting point   dillionverma/portfolio   Eliminates \~70% of
                   template                 design/scaffold work

  State            Zustand                  Lightweight, fast store updates
                                            for layout adaptation

  Animation        Framer Motion            Smooth layout transitions when
                                            sections reorder

  Classification   TensorFlow.js (WASM)     \<200KB, 3-5ms inference, no
                                            server round-trip

  Build-time AI    Claude Haiku API         Generate persona variants at
                                            build/ISR time (\~\$0.01/build)

  Edge             Vercel Edge Functions    Sub-50ms referrer-based
                                            classification, no cold starts

  Analytics        PostHog (free tier)      Measure adaptation
                                            effectiveness + signal
                                            familiarity to PostHog

  Hosting          Vercel (free tier)       Edge network, ISR, zero config
                                            deployment
  ---------------- ------------------------ ---------------------------------

3.1 Browser APIs Used

- IntersectionObserver --- element visibility tracking (thresholds: 0,
  0.25, 0.5, 0.75, 1.0)

- mousemove events --- throttled to requestAnimationFrame

- MutationObserver --- dead-click detection

- document.visibilityState --- exclude background-tab time from dwell
  calculations

- navigator.sendBeacon --- fire-and-forget analytics on page unload

4\. Build Plan (6-18 hours total)

**Constraint:** 1-2 hours per green day, 3-4 crash days per week,
Mounjaro ramp-up in progress. Each session must produce a shippable
increment. The plan is a menu, not a schedule.

Phase 1: Functional Adaptive Portfolio (6 hours)

**Session 1 (\~2h):** Fork dillionverma/portfolio template. Customize
content: name, role, Salama project details, skills, contact. Deploy to
Vercel. You now have a live portfolio site.

**Session 2 (\~2h):** Add Edge Middleware: classify by referrer URL
(LinkedIn = recruiter, GitHub = developer, else = default). Define three
content variant JSON configs controlling section order, detail levels,
and CTA copy. Add ?view=recruiter and ?view=technical query params for
demos.

**Session 3 (\~2h):** Add /how-it-works page with architecture diagram
explaining the adaptive system. This page IS the portfolio piece --- it
shows hiring managers your thinking. Write clear, concise prose about
the concept and implementation.

**Ship:** v1.0 --- a working adaptive portfolio with referrer-based
classification. Enough to link on applications.

Phase 2: Behavioral Intelligence (+6 hours)

**Session 4 (\~2h):** Add client-side signal collection: custom React
hooks wrapping IntersectionObserver for section dwell time and throttled
scroll/mouse events. Store in Zustand.

**Session 5 (\~2h):** Implement rule-based classifier (no ML yet): if
scroll speed \> X and dwell on projects \< Y, classify as recruiter. Add
smooth Framer Motion transitions when layout adapts. Test adaptation
flow end-to-end.

**Session 6 (\~2h):** Integrate PostHog free tier for analytics. Track:
which variant was served, dwell times per section, CTA clicks,
adaptation triggers. This both measures effectiveness and demonstrates
PostHog familiarity.

**Ship:** v2.0 --- behavioral adaptation in-session. The site now
actively responds to how visitors browse.

Phase 3: Production Polish (+6 hours)

**Session 7 (\~2h):** Replace rule-based classifier with TensorFlow.js
model. Train on synthetic data or use pre-built behavior classification
model. Add confidence thresholding (\>0.7 to trigger adaptation).

**Session 8 (\~2h):** Extract adaptive middleware as standalone package.
Add CONTRIBUTING.md, LICENSE, and package.json for potential npm
publish. Write README with usage examples for other developers.

**Session 9 (\~2h):** Write the blog post (2,000 words). Cover: problem
framing, architecture decisions, latency optimization, what worked, what
you\'d change, measurement results. This is the highest-value
deliverable of the entire project.

**Ship:** v3.0 --- ML-powered, extractable, documented. Staff-level
engineering signal.

5\. Portfolio Content to Feature

The site needs to showcase real work. Here\'s what goes on it:

5.1 Primary Case Study: Salama Platform

- Government-scale agentic AI platform for GDRFA Dubai

- 25K+ queries/month, 7 languages, visa renewals in 10-20 seconds

- 2-person initial team, LangGraph since v0.2

- On-prem Llama deployment for data sovereignty

- Currently rearchitecting: agentic layer + event-driven +
  MCP/Skills-based modernization

- **Framing:** Focus on architecture decisions and trade-offs, not
  features. \'Why on-prem Llama vs cloud API?\' \'Why LangGraph over
  alternatives at v0.2?\' \'How do you handle 7 languages without
  quality degradation?\'

5.2 Secondary Projects

- Macy\'s GenAI code migration (enterprise delivery, 4-6 person team)

- Dollar Tree Data Landing Zone (terabyte scale)

- Broadcom Slack-to-ServiceNow integration

- COFTA production readiness (security, performance, Deloitte
  compliance)

5.3 The Adaptive System Itself

- The /how-it-works page is a project showcase in its own right

- Architecture diagram, latency budget, design decisions, measurement
  results

- Link to extracted middleware package if built

5.4 Resume Details (already finalized)

- Resume HTML file exists: Firaaz_Farook_Resume_Final.html

- Dark teal (#006D77) accent, Inter font, ATS-verified 29/29 keywords

- Can be linked or embedded as downloadable PDF from the site

6\. Key Research Findings

6.1 What Hiring Managers Actually Look For

- Grafana Labs: \'The code itself isn\'t the pass criteria. It\'s about
  showing how you think through a problem.\'

- PostHog: explicitly seeks \'people who build cool stuff for the sake
  of it\'

- AgenticCareers (March 2026): \'Two or three deep, well-documented
  projects with genuine evaluation work will outperform ten
  surface-level implementations every time.\'

- Universal signals: clean repo structure, documented trade-offs,
  observable commit history, Docker/CI, and evaluation/observability
  work

6.2 The Agentic UX Paradigm

- Jakob Nielsen calls it the \'third UI paradigm\' --- intent-based
  outcome specification

- Microsoft Design: AI agents \'should be mostly invisible\'

- Salesforce: designers shifting \'from interface architects to
  experience orchestrators\'

- CopilotKit defines \'Chatless\' application surface where agents
  communicate through native interface

- Artium built an innovation platform that replaced chat with \'Dynamic
  Blocks\' --- UI components that adapt based on AI analysis of user
  needs

6.3 Existing Tools in the Space

- Dynamic Yield (Mastercard): commercial AI layout adaptation, 17.6%
  conversion lift for e.l.f. Cosmetics

- Evolv AI: evolutionary algorithms for continuous layout optimization

- Tambo: React SDK where AI selects which component to render and
  streams props

- Vercel AI SDK: generative UI through tool-call-to-component mapping

- Google A2UI spec (v0.8): declarative JSON format for agent-driven UI

- **Gap:** None of these are personal portfolio sites. No publicly
  documented example exists.

7\. Constraints and Anti-Patterns

7.1 Energy Constraints

- 1-2 hours per green day maximum

- 3-4 crash days per week (injection cycle)

- Active Mounjaro ramp-up (2.5mg) --- GI side effects may reduce
  available days

- Each session must produce a shippable increment

- The plan is a menu, not a schedule --- weekly review picks what to
  work on

7.2 Anti-Patterns to Watch

- **Over-engineering:** Start with rule-based classification (referrer
  URL + scroll speed). ML model is Phase 3, not Phase 1.

- **Scope creep:** The site needs to work as a portfolio first, be
  adaptive second. If adaptation breaks, the default view must be
  excellent.

- **Design paralysis:** Use dillionverma/portfolio template. Do not
  design from scratch. You are not a designer.

- **Perfectionism before shipping:** Phase 1 with referrer-based
  classification is a valid v1.0. Ship it.

- **Blog post procrastination:** The blog post is the highest-value
  deliverable. Do not skip it.

7.3 Hard Rules

- Zero reference to Emaratech in any public content

- Stealth mode: no LinkedIn changes until offer secured

- All Salama descriptions must be abstractable --- focus on
  architecture, not employer

- GDPR compliant: session-based analysis, no persistent cookies without
  consent

- Accessible: WCAG 2.1 AA minimum, respect prefers-reduced-motion

8\. Two Outputs From One Project

8.1 Output 1: The Portfolio Site

- Personal website at firaazfarook.com (or similar)

- Showcases Salama and other work

- Adapts to visitor type (recruiter/technical/developer)

- Includes /how-it-works page explaining the adaptive system

- Links to resume, GitHub, contact

8.2 Output 2: Extractable Middleware Package

- Standalone Next.js package for behavioral UI adaptation

- Other developers can use it on their own sites

- Open-source on GitHub with README, examples, and CONTRIBUTING.md

- This is the \'developer tool for developers\' angle --- bringing value
  to your people

8.3 Output 3: The Blog Post

- 2,000 words covering problem framing, architecture, trade-offs,
  results

- Published on the portfolio site itself

- This is the single highest-value hiring signal per research

- Can be shared on HN, Reddit, or developer communities for organic
  reach

9\. Decision Log

  ---------------- ------------------- -----------------------------------
  **Decision**     **Choice**          **Rationale**

  Project type     AI-adaptive         Portfolio AND project in one;
                   portfolio website   product-engineering signal for
                                       target companies

  vs. MCP          Deferred/optional   Strong infra signal but doesn\'t
  compliance test                      embody the \'bring value to
  kit                                  people\' thesis

  vs. AICONMAC     Separate track      Real business value for family but
  quoting tool                         heavy data bootstrapping; not a
                                       hiring signal

  AI interaction   Invisible           Chat-first is lazy design; the AI
  model            adaptation, no      should be the stage manager
                   chatbot             

  Classification   Referrer →          Progressive sophistication matching
  approach         rule-based →        energy budget per phase
                   TensorFlow.js       

  Design approach  Fork existing       Not a designer; template eliminates
                   template            70% of scaffolding

  No runtime LLM   Pre-computed        Sub-25ms adaptation; \$0.01/build
  calls            variants at build   vs \$0.01/visitor
                   time                

  Analytics        PostHog free tier   Measures effectiveness + signals
                                       familiarity to PostHog (target
                                       company)
  ---------------- ------------------- -----------------------------------
