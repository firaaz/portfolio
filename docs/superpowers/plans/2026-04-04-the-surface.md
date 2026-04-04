# The Surface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the walking skeleton Canvas into the Iron-Gall Ink editorial surface — a single-viewport 12-column grid with tonal depth, editorial typography, zone breathing, and mobile collapse.

**Architecture:** Zone-driven vertical slices. Each row-slice introduces grid positions, surface levels, and molecule restyling. Tokens arrive with the first slice. Breathing and mobile added as finishing slices. CSS grid for layout, `overflow: hidden` + grid-template transitions for breathing (ADR-0007).

**Tech Stack:** React 19, Zustand, Tailwind 4 (@theme inline tokens), Zilla Slab + Inter (fontsource), Playwright (visual/layout/interaction), Vitest + happy-dom (unit)

**Spec:** `specs/001-home-experience/surface-plan.md`
**Design spec:** `docs/superpowers/specs/2026-04-04-design-and-agent-ux-design.md`
**Prototype:** `docs/design/prototypes/feat-002-surface-state.html`
**Breathing ADR:** `docs/adrs/0007-breathing-motion-language.md`
**Motion ADR:** `docs/adrs/0004-editorial-canvas-motion.md`

---

## File Structure

### Create
| File | Responsibility |
|------|---------------|
| `frontend/src/canvas/zone-map.ts` | Pure function: UXItem[] → Map\<ZoneName, UXItem[]\> |
| `frontend/src/canvas/ZoneLabel.tsx` | 9px uppercase zone heading |
| `frontend/src/molecules/SkillTag.tsx` | Tag chip (replaces SkillLink dot-prefix) |
| `frontend/src/molecules/EducationMolecule.tsx` | Degree + institution |
| `frontend/src/hooks/use-dwell.ts` | Dwell detection: 2s threshold, 300ms linger |
| `frontend/src/__tests__/zone-map.test.ts` | Zone mapping logic |
| `frontend/src/__tests__/ZoneLabel.test.tsx` | Zone label render |
| `frontend/src/__tests__/SkillTag.test.tsx` | Skill tag render |
| `frontend/src/__tests__/EducationMolecule.test.tsx` | Education render |
| `frontend/src/__tests__/use-dwell.test.ts` | Dwell hook timer logic |
| `frontend/e2e/layout.spec.ts` | CSS computed property assertions |
| `frontend/e2e/breathing.spec.ts` | Dwell/expand/contract interaction tests |
| `frontend/e2e/capture-surface.spec.ts` | Rerunnable visual capture at key states |

### Modify
| File | Change | Slice |
|------|--------|-------|
| `frontend/src/index.css` | Tokens, fonts, surface classes, grid, media queries | 1, 4, 5 |
| `frontend/src/canvas/Canvas.tsx` | Vertical stack → CSS grid with 8 zones + breathing | 1, 4 |
| `frontend/src/molecules/HeroMolecule.tsx` | Editorial restyle, remove AnimatePresence | 1 |
| `frontend/src/molecules/ProjectCard.tsx` | Editorial restyle + breathing-extra slot | 1, 4 |
| `frontend/src/molecules/ExperienceCard.tsx` | Editorial restyle, description → breathing-extra | 2, 4 |
| `frontend/src/molecules/ContactCard.tsx` | CTA button restyle | 3 |
| `frontend/src/molecules/MoleculeResolver.tsx` | Add education, skill→SkillTag | 2, 3 |
| `frontend/src/chrome/PresenceDot.tsx` | Remove fixed positioning | 3 |
| `frontend/e2e/visual.spec.ts` | Evolve zone names + screenshots | 1 |
| `frontend/e2e/smoke.spec.ts` | Update zone selectors | 1 |
| `frontend/src/__tests__/Canvas.test.tsx` | Rewrite for grid zones | 1 |
| `frontend/src/__tests__/ProjectCard.test.tsx` | Update for new styling | 1 |
| `frontend/src/__tests__/ExperienceCard.test.tsx` | Update for compact view | 2 |
| `frontend/src/__tests__/ContactCard.test.tsx` | Update for CTA button | 3 |
| `frontend/src/__tests__/MoleculeResolver.test.tsx` | Add education + skill tag cases | 2, 3 |
| `frontend/src/__tests__/PresenceDot.test.tsx` | Remove fixed-position assertion | 3 |

### Delete
| File | Reason |
|------|--------|
| `frontend/src/canvas/AnimatedMolecule.tsx` | Replaced by surface opacity |
| `frontend/src/canvas/FlowZone.tsx` | Replaced by CSS grid |
| `frontend/src/molecules/SkillLink.tsx` | Renamed to SkillTag |
| `frontend/src/__tests__/AnimatedMolecule.test.tsx` | Component removed |
| `frontend/src/__tests__/FlowZone.test.tsx` | Component removed |

---

## Slice 1: Hero Row + Tokens + Grid Shell

### Task 1: Install Fonts + Replace Design Tokens

**Files:**
- Modify: `frontend/package.json` (dependencies)
- Modify: `frontend/src/index.css` (complete rewrite)

- [ ] **Step 1: Install font packages**

```bash
cd frontend && pnpm add @fontsource/zilla-slab @fontsource-variable/inter
```

- [ ] **Step 2: Replace index.css with Iron-Gall Ink tokens, surface classes, and grid shell**

Replace the entire `frontend/src/index.css` with:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@fontsource/zilla-slab/300.css";
@import "@fontsource/zilla-slab/300-italic.css";
@import "@fontsource/zilla-slab/400.css";
@import "@fontsource/zilla-slab/700.css";
@import "@fontsource-variable/inter";

@custom-variant dark (&:is(.dark *));

@keyframes presence-pulse {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.7;
  }
}

@theme inline {
  /* Typography */
  --font-heading: "Zilla Slab", serif;
  --font-sans: "Inter", sans-serif;

  /* Iron-Gall Ink palette as Tailwind utilities */
  --color-ink: rgba(28, 36, 48, 1);
  --color-ink-100: rgba(28, 36, 48, 1);
  --color-ink-65: rgba(28, 36, 48, 0.65);
  --color-ink-50: rgba(28, 36, 48, 0.5);
  --color-ink-45: rgba(28, 36, 48, 0.45);
  --color-ink-40: rgba(28, 36, 48, 0.4);
  --color-ink-35: rgba(28, 36, 48, 0.35);
  --color-ink-20: rgba(28, 36, 48, 0.2);
  --color-ink-06: rgba(28, 36, 48, 0.06);
  --color-ink-05: rgba(28, 36, 48, 0.05);
  --color-ink-03: rgba(28, 36, 48, 0.03);
  --color-canvas: #f3f4f6;

  /* shadcn color aliases → CSS vars */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  /* Radii */
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  /* shadcn aliases remapped to ink */
  --background: #f3f4f6;
  --foreground: #1c2430;
  --card: #f3f4f6;
  --card-foreground: #1c2430;
  --popover: #f3f4f6;
  --popover-foreground: #1c2430;
  --primary: #1c2430;
  --primary-foreground: #f3f4f6;
  --secondary: rgba(28, 36, 48, 0.03);
  --secondary-foreground: #1c2430;
  --muted: rgba(28, 36, 48, 0.03);
  --muted-foreground: rgba(28, 36, 48, 0.5);
  --accent: rgba(28, 36, 48, 0.03);
  --accent-foreground: #1c2430;
  --destructive: oklch(0.577 0.245 27.325);
  --border: rgba(28, 36, 48, 0.06);
  --input: rgba(28, 36, 48, 0.06);
  --ring: rgba(28, 36, 48, 0.35);
  --chart-1: rgba(28, 36, 48, 1);
  --chart-2: rgba(28, 36, 48, 0.65);
  --chart-3: rgba(28, 36, 48, 0.5);
  --chart-4: rgba(28, 36, 48, 0.35);
  --chart-5: rgba(28, 36, 48, 0.2);
  --radius: 0px;
  --sidebar: #f3f4f6;
  --sidebar-foreground: #1c2430;
  --sidebar-primary: #1c2430;
  --sidebar-primary-foreground: #f3f4f6;
  --sidebar-accent: rgba(28, 36, 48, 0.03);
  --sidebar-accent-foreground: #1c2430;
  --sidebar-border: rgba(28, 36, 48, 0.06);
  --sidebar-ring: rgba(28, 36, 48, 0.35);
}

.dark {
  /* Dormant — no .dark class on <html> */
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

/* Surface hierarchy */
.surface-inset {
  background: rgba(28, 36, 48, 0.03);
  transition: background 0.3s ease-out;
  overflow: hidden;
}
.surface-inset:hover {
  background: rgba(28, 36, 48, 0.05);
}

.surface-featured {
  background: rgba(28, 36, 48, 0.06);
  transition: background 0.3s ease-out;
  overflow: hidden;
}
.surface-featured:hover {
  background: rgba(28, 36, 48, 0.08);
}

.surface-recessed {
  background: rgba(28, 36, 48, 0.05);
  transition: background 0.3s ease-out;
  overflow: hidden;
}
.surface-recessed:hover {
  background: rgba(28, 36, 48, 0.07);
}

.surface-base {
  background: #f3f4f6;
  transition: background 0.3s ease-out;
  overflow: hidden;
}
.surface-base:hover {
  background: rgba(28, 36, 48, 0.02);
}

/* Grid shell */
.surface-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: 1.4fr 1fr auto;
  gap: 2px;
  height: 100vh;
  height: 100dvh;
  max-width: 64rem;
  margin: 0 auto;
  padding: 32px;
}

/* Zone positions */
.zone {
  padding: 24px;
}
.zone-identity {
  grid-column: 1 / 5;
  grid-row: 1;
}
.zone-featured {
  grid-column: 5 / 13;
  grid-row: 1;
}
.zone-experience {
  grid-column: 1 / 5;
  grid-row: 2;
}
.zone-other-work {
  grid-column: 5 / 9;
  grid-row: 2;
}
.zone-skills {
  grid-column: 9 / 13;
  grid-row: 2;
}
.zone-contact {
  grid-column: 1 / 5;
  grid-row: 3;
}
.zone-education {
  grid-column: 5 / 9;
  grid-row: 3;
}
.zone-command {
  grid-column: 9 / 13;
  grid-row: 3;
}

@media (max-height: 800px) {
  .surface-grid {
    padding: 16px;
  }
  .zone {
    padding: 16px;
  }
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
    overflow: hidden;
  }
}
```

- [ ] **Step 3: Verify typecheck passes**

```bash
cd frontend && pnpm typecheck
```

Expected: 0 errors. If font imports cause issues, check that `@fontsource/zilla-slab` package was installed correctly.

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/src/index.css
git commit -m "feat(frontend): replace design tokens with Iron-Gall Ink palette and grid shell"
```

---

### Task 2: Zone Mapping Function (TDD)

**Files:**
- Create: `frontend/src/__tests__/zone-map.test.ts`
- Create: `frontend/src/canvas/zone-map.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/zone-map.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { mapItemsToZones } from "../canvas/zone-map";
import type { UXItem } from "../store/ux-store";

function item(overrides: Partial<UXItem> & { id: string }): UXItem {
  return {
    salience: 0.5,
    group: "work",
    molecule: "project",
    data: {},
    ...overrides,
  };
}

describe("mapItemsToZones", () => {
  it("maps identity group to identity zone", () => {
    const items = [item({ id: "hero", group: "identity", molecule: "hero" })];
    const zones = mapItemsToZones(items);
    expect(zones.get("identity")).toHaveLength(1);
    expect(zones.get("identity")![0].id).toBe("hero");
  });

  it("maps highest-salience project to featured zone", () => {
    const items = [
      item({ id: "p1", salience: 0.8, group: "work", molecule: "project" }),
      item({ id: "p2", salience: 0.6, group: "work", molecule: "project" }),
    ];
    const zones = mapItemsToZones(items);
    expect(zones.get("featured")).toHaveLength(1);
    expect(zones.get("featured")![0].id).toBe("p1");
    expect(zones.get("other-work")).toHaveLength(1);
    expect(zones.get("other-work")![0].id).toBe("p2");
  });

  it("maps work experiences to experience zone", () => {
    const items = [
      item({ id: "e1", group: "work", molecule: "experience" }),
      item({ id: "e2", group: "work", molecule: "experience" }),
    ];
    const zones = mapItemsToZones(items);
    expect(zones.get("experience")).toHaveLength(2);
  });

  it("maps background molecules to correct zones", () => {
    const items = [
      item({ id: "c1", group: "background", molecule: "contact" }),
      item({ id: "s1", group: "background", molecule: "skill" }),
      item({ id: "s2", group: "background", molecule: "skill" }),
      item({ id: "ed1", group: "background", molecule: "education" }),
    ];
    const zones = mapItemsToZones(items);
    expect(zones.get("contact")).toHaveLength(1);
    expect(zones.get("skills")).toHaveLength(2);
    expect(zones.get("education")).toHaveLength(1);
  });

  it("returns empty map for empty items", () => {
    const zones = mapItemsToZones([]);
    expect(zones.size).toBe(0);
  });

  it("handles single project as featured (no other-work)", () => {
    const items = [
      item({ id: "p1", salience: 0.8, group: "work", molecule: "project" }),
    ];
    const zones = mapItemsToZones(items);
    expect(zones.get("featured")).toHaveLength(1);
    expect(zones.has("other-work")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd frontend && pnpm test src/__tests__/zone-map.test.ts
```

Expected: FAIL — `Cannot find module '../canvas/zone-map'`

- [ ] **Step 3: Implement zone-map**

Create `frontend/src/canvas/zone-map.ts`:

```typescript
import type { UXItem } from "../store/ux-store";

export type ZoneName =
  | "identity"
  | "featured"
  | "experience"
  | "other-work"
  | "skills"
  | "contact"
  | "education";

export function mapItemsToZones(items: UXItem[]): Map<ZoneName, UXItem[]> {
  const zones = new Map<ZoneName, UXItem[]>();

  const projects = items
    .filter((i) => i.group === "work" && i.molecule === "project")
    .sort((a, b) => b.salience - a.salience);
  const featuredId = projects[0]?.id;

  for (const item of items) {
    let zone: ZoneName | undefined;

    if (item.group === "identity") {
      zone = "identity";
    } else if (item.molecule === "project") {
      zone = item.id === featuredId ? "featured" : "other-work";
    } else if (item.molecule === "experience") {
      zone = "experience";
    } else if (item.molecule === "contact") {
      zone = "contact";
    } else if (item.molecule === "skill") {
      zone = "skills";
    } else if (item.molecule === "education") {
      zone = "education";
    }

    if (zone) {
      const list = zones.get(zone) ?? [];
      list.push(item);
      zones.set(zone, list);
    }
  }

  return zones;
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd frontend && pnpm test src/__tests__/zone-map.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/canvas/zone-map.ts frontend/src/__tests__/zone-map.test.ts
git commit -m "feat(frontend): add zone-map pure function for editorial grid layout"
```

---

### Task 3: ZoneLabel Component + Canvas Grid Rewrite

**Files:**
- Create: `frontend/src/canvas/ZoneLabel.tsx`
- Create: `frontend/src/__tests__/ZoneLabel.test.tsx`
- Modify: `frontend/src/canvas/Canvas.tsx`
- Modify: `frontend/src/__tests__/Canvas.test.tsx`

- [ ] **Step 1: Write ZoneLabel test**

Create `frontend/src/__tests__/ZoneLabel.test.tsx`:

```typescript
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ZoneLabel } from "../canvas/ZoneLabel";

afterEach(cleanup);

describe("ZoneLabel", () => {
  it("renders label text", () => {
    render(<ZoneLabel>Identity</ZoneLabel>);
    expect(screen.getByText("Identity")).toBeInTheDocument();
  });

  it("applies uppercase styling", () => {
    const { container } = render(<ZoneLabel>Featured Work</ZoneLabel>);
    const el = container.firstElementChild!;
    expect(el.className).toContain("uppercase");
  });
});
```

- [ ] **Step 2: Implement ZoneLabel**

Create `frontend/src/canvas/ZoneLabel.tsx`:

```typescript
export function ZoneLabel({ children }: { children: string }) {
  return (
    <span className="block font-sans text-[9px] uppercase tracking-[0.12em] text-ink-45 mb-2">
      {children}
    </span>
  );
}
```

- [ ] **Step 3: Run ZoneLabel test — verify it passes**

```bash
cd frontend && pnpm test src/__tests__/ZoneLabel.test.tsx
```

- [ ] **Step 4: Rewrite Canvas.tsx to CSS grid with zone mapping**

Replace `frontend/src/canvas/Canvas.tsx` with:

```typescript
import { PresenceDot } from "../chrome/PresenceDot";
import { MoleculeResolver } from "../molecules/MoleculeResolver";
import { useUXStore } from "../store/ux-store";
import { ZoneLabel } from "./ZoneLabel";
import type { ZoneName } from "./zone-map";
import { mapItemsToZones } from "./zone-map";

const ZONE_CONFIG: { name: ZoneName; label: string; surface: string }[] = [
  { name: "identity", label: "Identity", surface: "surface-inset" },
  { name: "featured", label: "Featured Work", surface: "surface-featured" },
  { name: "experience", label: "Experience", surface: "surface-inset" },
  { name: "other-work", label: "Other Work", surface: "surface-base" },
  { name: "skills", label: "Skills", surface: "surface-base" },
  { name: "contact", label: "Contact", surface: "surface-recessed" },
  { name: "education", label: "Education", surface: "surface-base" },
];

export function Canvas({
  onPresenceDotClick,
}: {
  onPresenceDotClick: () => void;
}) {
  const items = useUXStore((s) => s.items);

  if (items.length === 0) {
    return (
      <div
        role="status"
        aria-label="Loading"
        className="flex items-center justify-center min-h-screen text-ink-50 text-sm"
      >
        Loading...
      </div>
    );
  }

  const zones = mapItemsToZones(items);

  return (
    <main className="surface-grid">
      {ZONE_CONFIG.map(({ name, label, surface }) => (
        <section
          key={name}
          data-zone={name}
          className={`zone zone-${name} ${surface}`}
        >
          <ZoneLabel>{label}</ZoneLabel>
          {zones.get(name)?.map((item) => (
            <div
              key={item.id}
              style={{ opacity: item.salience }}
              className="transition-opacity duration-500 ease-out"
            >
              <MoleculeResolver molecule={item.molecule} data={item.data} />
            </div>
          ))}
        </section>
      ))}
      <section
        data-zone="command"
        className="zone zone-command surface-base flex items-end justify-end"
      >
        {/* Command zone: no dwell handlers — static chrome */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block text-[10px] text-ink-20">⌘K</span>
            <span className="block text-[9px] text-ink-20">
              Ask me anything
            </span>
          </div>
          <PresenceDot onClick={onPresenceDotClick} />
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Rewrite Canvas test for grid zones**

Replace `frontend/src/__tests__/Canvas.test.tsx` with:

```typescript
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Canvas } from "../canvas/Canvas";
import { useUXStore } from "../store/ux-store";

afterEach(() => {
  useUXStore.setState({ items: [], ux: { tempo: 0.5, agency: 0.5 } });
  cleanup();
});

const FULL_ITEMS = [
  {
    id: "hero",
    salience: 1.0,
    group: "identity",
    molecule: "hero",
    data: {
      name: "Firaaz Farook",
      title: "Senior Software Engineer",
      subtitle: "AI Systems",
      summary: "Building production AI",
    },
  },
  {
    id: "p1",
    salience: 0.8,
    group: "work",
    molecule: "project",
    data: {
      title: "Salama AI",
      description: "Agentic platform",
      tech: ["Python"],
    },
  },
  {
    id: "p2",
    salience: 0.6,
    group: "work",
    molecule: "project",
    data: {
      title: "GenAI Migration",
      description: "Code migration",
      tech: ["LLMs"],
    },
  },
  {
    id: "exp1",
    salience: 0.7,
    group: "work",
    molecule: "experience",
    data: {
      company: "Deloitte",
      role: "Senior Consultant",
      duration: "4 years",
      description: "Led GenAI",
    },
  },
  {
    id: "contact",
    salience: 0.5,
    group: "background",
    molecule: "contact",
    data: { email: "test@example.com", cta: "Talk" },
  },
  {
    id: "skill-py",
    salience: 0.3,
    group: "background",
    molecule: "skill",
    data: { name: "Python" },
  },
];

describe("Canvas", () => {
  it("renders loading state when store is empty", () => {
    render(<Canvas onPresenceDotClick={() => {}} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders content zones with data-zone attributes", () => {
    useUXStore.setState({ items: FULL_ITEMS });
    render(<Canvas onPresenceDotClick={() => {}} />);

    expect(document.querySelector('[data-zone="identity"]')).toBeInTheDocument();
    expect(document.querySelector('[data-zone="featured"]')).toBeInTheDocument();
    expect(document.querySelector('[data-zone="experience"]')).toBeInTheDocument();
    expect(document.querySelector('[data-zone="other-work"]')).toBeInTheDocument();
    expect(document.querySelector('[data-zone="skills"]')).toBeInTheDocument();
    expect(document.querySelector('[data-zone="contact"]')).toBeInTheDocument();
    expect(document.querySelector('[data-zone="command"]')).toBeInTheDocument();
  });

  it("places highest-salience project in featured zone", () => {
    useUXStore.setState({ items: FULL_ITEMS });
    render(<Canvas onPresenceDotClick={() => {}} />);

    const featured = document.querySelector('[data-zone="featured"]');
    expect(featured).toHaveTextContent("Salama AI");

    const otherWork = document.querySelector('[data-zone="other-work"]');
    expect(otherWork).toHaveTextContent("GenAI Migration");
  });

  it("applies salience as opacity style", () => {
    useUXStore.setState({ items: FULL_ITEMS });
    render(<Canvas onPresenceDotClick={() => {}} />);

    const heading = screen.getByRole("heading", { name: "Salama AI" });
    const wrapper = heading.closest("[style]");
    expect(wrapper).toHaveStyle({ opacity: "0.8" });
  });

  it("renders command zone with keyboard hint", () => {
    useUXStore.setState({ items: FULL_ITEMS });
    render(<Canvas onPresenceDotClick={() => {}} />);

    const command = document.querySelector('[data-zone="command"]');
    expect(command).toHaveTextContent("⌘K");
    expect(command).toHaveTextContent("Ask me anything");
  });
});
```

- [ ] **Step 6: Run all unit tests**

```bash
cd frontend && pnpm test
```

Expected: Canvas + ZoneLabel tests pass. Some other tests may fail if they reference old data-zone values — that's expected, we fix them in Task 5.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/canvas/ZoneLabel.tsx frontend/src/canvas/Canvas.tsx frontend/src/__tests__/ZoneLabel.test.tsx frontend/src/__tests__/Canvas.test.tsx
git commit -m "feat(frontend): rewrite Canvas as 12-column CSS grid with zone mapping"
```

---

### Task 4: Restyle HeroMolecule + ProjectCard

**Files:**
- Modify: `frontend/src/molecules/HeroMolecule.tsx`
- Modify: `frontend/src/molecules/ProjectCard.tsx`
- Modify: `frontend/src/__tests__/ProjectCard.test.tsx`

- [ ] **Step 1: Restyle HeroMolecule — remove AnimatePresence, apply editorial typography**

Replace `frontend/src/molecules/HeroMolecule.tsx` with:

```typescript
export function HeroMolecule({
  name,
  title,
  subtitle,
  summary,
}: {
  name: string;
  title: string;
  subtitle: string;
  summary: string;
}) {
  return (
    <div className="space-y-3">
      <h1
        className="font-heading font-bold text-ink"
        style={{ fontSize: "clamp(24px, 3.5vw, 32px)" }}
      >
        {name}
      </h1>
      <p className="text-[11px] font-sans uppercase tracking-[0.12em] text-ink-45">
        {title} &middot; {subtitle}
      </p>
      <p className="text-[13px] font-sans text-ink-65 leading-relaxed max-w-md">
        {summary}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Restyle ProjectCard — editorial typography + breathing-extra pre-wire**

Replace `frontend/src/molecules/ProjectCard.tsx` with:

```typescript
export function ProjectCard({
  title,
  description,
  tech,
}: {
  title: string;
  description: string;
  tech: string[];
}) {
  return (
    <article className="space-y-2">
      <h3
        className="font-heading font-light italic text-ink"
        style={{ fontSize: "clamp(16px, 2vw, 22px)" }}
      >
        {title}
      </h3>
      <p className="text-xs font-sans text-ink-65 leading-relaxed">
        {description}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {tech.map((t) => (
          <li
            key={t}
            className="text-[8px] font-sans uppercase tracking-[0.1em] bg-ink-06 text-ink-50 px-2.5 py-0.5"
          >
            {t}
          </li>
        ))}
      </ul>
      <div className="breathing-extra opacity-0 max-h-0 overflow-hidden" />
    </article>
  );
}
```

- [ ] **Step 3: Update ProjectCard test**

Replace `frontend/src/__tests__/ProjectCard.test.tsx` with:

```typescript
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectCard } from "../molecules/ProjectCard";

afterEach(cleanup);

describe("ProjectCard", () => {
  it("renders title, description, and tech tags", () => {
    render(
      <ProjectCard
        title="Salama AI Platform"
        description="LangGraph-powered agentic platform"
        tech={["LangGraph", "Python", "FastAPI"]}
      />,
    );

    expect(screen.getByText("Salama AI Platform")).toBeInTheDocument();
    expect(
      screen.getByText("LangGraph-powered agentic platform"),
    ).toBeInTheDocument();
    expect(screen.getByText("LangGraph")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("FastAPI")).toBeInTheDocument();
  });

  it("has an accessible heading", () => {
    render(
      <ProjectCard
        title="GenAI Migration"
        description="Code migration using LLMs"
        tech={["Python"]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "GenAI Migration" }),
    ).toBeInTheDocument();
  });

  it("pre-wires hidden breathing-extra slot", () => {
    const { container } = render(
      <ProjectCard title="P" description="D" tech={[]} />,
    );
    const extra = container.querySelector(".breathing-extra");
    expect(extra).toBeInTheDocument();
    expect(extra).toHaveClass("opacity-0");
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && pnpm test src/__tests__/ProjectCard.test.tsx
```

Expected: all 3 PASS.

- [ ] **Step 5: Verify typecheck**

```bash
cd frontend && pnpm typecheck
```

Expected: 0 errors. If `motion/react` import in HeroMolecule was the only import, typecheck won't complain about the removed import.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/molecules/HeroMolecule.tsx frontend/src/molecules/ProjectCard.tsx frontend/src/__tests__/ProjectCard.test.tsx
git commit -m "feat(frontend): restyle HeroMolecule and ProjectCard to editorial typography"
```

---

### Task 5: Update E2E Tests + Remove Dead Code

**Files:**
- Modify: `frontend/e2e/smoke.spec.ts`
- Modify: `frontend/e2e/visual.spec.ts`
- Delete: `frontend/src/canvas/AnimatedMolecule.tsx`
- Delete: `frontend/src/canvas/FlowZone.tsx`
- Delete: `frontend/src/__tests__/AnimatedMolecule.test.tsx`
- Delete: `frontend/src/__tests__/FlowZone.test.tsx`

- [ ] **Step 1: Update smoke test for new zone names**

Replace `frontend/e2e/smoke.spec.ts` with:

```typescript
import { expect, test } from "@playwright/test";

test.describe("Walking skeleton", () => {
  test("page loads and shows loading state", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText("Loading");
  });

  test("SSE delivers data and identity zone renders", async ({ page }) => {
    await page.goto("/");

    const identity = page.locator("[data-zone='identity']");
    await expect(identity).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Firaaz Farook",
    );

    const featured = page.locator("[data-zone='featured']");
    await expect(featured).toBeVisible();
  });
});
```

- [ ] **Step 2: Update visual regression test for new zones**

Replace `frontend/e2e/visual.spec.ts` with:

```typescript
import { expect, test } from "@playwright/test";

test.describe("Visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("full page layout", async ({ page }) => {
    await expect(page).toHaveScreenshot("full-page.png", {
      fullPage: true,
    });
  });

  test("identity zone", async ({ page }) => {
    const zone = page.locator("[data-zone='identity']");
    await expect(zone).toHaveScreenshot("zone-identity.png");
  });

  test("featured zone", async ({ page }) => {
    const zone = page.locator("[data-zone='featured']");
    await expect(zone).toHaveScreenshot("zone-featured.png");
  });
});
```

- [ ] **Step 3: Delete dead components and their tests**

```bash
cd frontend && rm src/canvas/AnimatedMolecule.tsx src/canvas/FlowZone.tsx src/__tests__/AnimatedMolecule.test.tsx src/__tests__/FlowZone.test.tsx
```

- [ ] **Step 4: Verify no imports reference deleted files**

```bash
cd frontend && pnpm typecheck
```

Expected: 0 errors. AnimatedMolecule and FlowZone were not imported by the new Canvas.

- [ ] **Step 5: Run all unit tests**

```bash
cd frontend && pnpm test
```

Expected: all pass. If any old tests reference deleted components, they were deleted in Step 3.

- [ ] **Step 6: Regenerate visual baselines**

```bash
cd frontend && pnpm test:e2e:update
```

This regenerates screenshot baselines for the new editorial surface. Manually inspect the screenshots in `frontend/e2e/visual.spec.ts-snapshots/` to verify the grid renders correctly.

- [ ] **Step 7: Run e2e tests**

```bash
cd frontend && pnpm test:e2e
```

Expected: all pass with new baselines.

- [ ] **Step 8: Commit**

```bash
git add -A frontend/e2e/ frontend/src/canvas/AnimatedMolecule.tsx frontend/src/canvas/FlowZone.tsx frontend/src/__tests__/AnimatedMolecule.test.tsx frontend/src/__tests__/FlowZone.test.tsx
git commit -m "chore(frontend): update e2e tests for editorial zones, remove dead components"
```

Note: `git add -A` on specific paths stages both the new files and the deletions.

---

## Slice 2: Flow Row

### Task 6: Restyle ExperienceCard + Create SkillTag

**Files:**
- Modify: `frontend/src/molecules/ExperienceCard.tsx`
- Modify: `frontend/src/__tests__/ExperienceCard.test.tsx`
- Create: `frontend/src/molecules/SkillTag.tsx`
- Create: `frontend/src/__tests__/SkillTag.test.tsx`
- Delete: `frontend/src/molecules/SkillLink.tsx`

- [ ] **Step 1: Write SkillTag test**

Create `frontend/src/__tests__/SkillTag.test.tsx`:

```typescript
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SkillTag } from "../molecules/SkillTag";

afterEach(cleanup);

describe("SkillTag", () => {
  it("renders skill name", () => {
    render(<SkillTag name="TypeScript" />);
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("renders as tag chip without dot prefix", () => {
    const { container } = render(<SkillTag name="Python" />);
    expect(container.querySelector("[aria-hidden]")).toBeNull();
    expect(container.firstElementChild!.className).toContain("uppercase");
  });
});
```

- [ ] **Step 2: Implement SkillTag**

Create `frontend/src/molecules/SkillTag.tsx`:

```typescript
export function SkillTag({ name }: { name: string }) {
  return (
    <span className="inline-block text-[8px] font-sans font-medium uppercase tracking-[0.1em] bg-ink-06 text-ink-50 px-2.5 py-0.5">
      {name}
    </span>
  );
}
```

- [ ] **Step 3: Restyle ExperienceCard — description moves to breathing-extra**

Replace `frontend/src/molecules/ExperienceCard.tsx` with:

```typescript
export function ExperienceCard({
  company,
  role,
  duration,
  description,
}: {
  company: string;
  role: string;
  duration: string;
  description: string;
}) {
  return (
    <article className="space-y-1">
      <span className="block text-[10px] font-sans font-bold uppercase tracking-[0.08em] text-ink-50">
        {company}
      </span>
      <h3 className="text-base font-heading text-ink">{role}</h3>
      <span className="block text-[10px] font-sans text-ink-45">{duration}</span>
      <div className="breathing-extra opacity-0 max-h-0 overflow-hidden">
        <p className="text-xs font-sans text-ink-65 leading-relaxed pt-1">
          {description}
        </p>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Update ExperienceCard test — compact view no longer shows description**

Replace `frontend/src/__tests__/ExperienceCard.test.tsx` with:

```typescript
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExperienceCard } from "../molecules/ExperienceCard";

afterEach(cleanup);

describe("ExperienceCard", () => {
  it("renders company, role, and duration in compact view", () => {
    render(
      <ExperienceCard
        company="Deloitte"
        role="Senior Consultant"
        duration="4 years"
        description="Led GenAI initiatives"
      />,
    );

    expect(screen.getByText("Deloitte")).toBeInTheDocument();
    expect(screen.getByText("Senior Consultant")).toBeInTheDocument();
    expect(screen.getByText("4 years")).toBeInTheDocument();
  });

  it("has accessible heading for role", () => {
    render(
      <ExperienceCard
        company="Emaratech"
        role="Senior Software Engineer"
        duration="Current"
        description="Building AI systems"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Senior Software Engineer" }),
    ).toBeInTheDocument();
  });

  it("hides description in breathing-extra slot", () => {
    const { container } = render(
      <ExperienceCard
        company="Co"
        role="Dev"
        duration="1y"
        description="Did things"
      />,
    );
    const extra = container.querySelector(".breathing-extra");
    expect(extra).toBeInTheDocument();
    expect(extra).toHaveClass("opacity-0");
    expect(extra).toHaveTextContent("Did things");
  });
});
```

- [ ] **Step 5: Delete old SkillLink**

```bash
cd frontend && rm src/molecules/SkillLink.tsx
```

- [ ] **Step 6: Run tests**

```bash
cd frontend && pnpm test src/__tests__/SkillTag.test.tsx src/__tests__/ExperienceCard.test.tsx
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/molecules/SkillTag.tsx frontend/src/molecules/ExperienceCard.tsx frontend/src/molecules/SkillLink.tsx frontend/src/__tests__/SkillTag.test.tsx frontend/src/__tests__/ExperienceCard.test.tsx
git commit -m "feat(frontend): restyle ExperienceCard and rename SkillLink to SkillTag"
```

---

### Task 7: Update MoleculeResolver + Verify Row 2

**Files:**
- Modify: `frontend/src/molecules/MoleculeResolver.tsx`
- Modify: `frontend/src/__tests__/MoleculeResolver.test.tsx`

- [ ] **Step 1: Update MoleculeResolver — add SkillTag, keep education placeholder**

Replace `frontend/src/molecules/MoleculeResolver.tsx` with:

```typescript
import type { ComponentType } from "react";
import { ContactCard } from "./ContactCard";
import { ExperienceCard } from "./ExperienceCard";
import { HeroMolecule } from "./HeroMolecule";
import { ProjectCard } from "./ProjectCard";
import { SkillTag } from "./SkillTag";

const registry: Record<string, ComponentType<Record<string, unknown>>> = {
  hero: HeroMolecule as ComponentType<Record<string, unknown>>,
  project: ProjectCard as ComponentType<Record<string, unknown>>,
  experience: ExperienceCard as ComponentType<Record<string, unknown>>,
  contact: ContactCard as ComponentType<Record<string, unknown>>,
  skill: SkillTag as ComponentType<Record<string, unknown>>,
};

export function MoleculeResolver({
  molecule,
  data,
}: {
  molecule: string;
  data: Record<string, unknown>;
}) {
  const Component = registry[molecule];

  if (!Component) {
    return <div>{molecule}</div>;
  }

  return <Component {...data} />;
}
```

- [ ] **Step 2: Update MoleculeResolver test — skill now renders SkillTag**

In `frontend/src/__tests__/MoleculeResolver.test.tsx`, add a test case for skill:

```typescript
  it("renders SkillTag for molecule='skill'", () => {
    render(
      <MoleculeResolver
        molecule="skill"
        data={{ name: "TypeScript" }}
      />,
    );

    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });
```

This goes inside the existing `describe("MoleculeResolver")` block, after the existing tests.

- [ ] **Step 3: Run tests**

```bash
cd frontend && pnpm test src/__tests__/MoleculeResolver.test.tsx
```

Expected: all pass (existing + new skill test).

- [ ] **Step 4: Typecheck + lint**

```bash
cd frontend && pnpm typecheck && pnpm lint
```

Expected: 0 errors. The SkillLink import is gone; SkillTag is in its place.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/molecules/MoleculeResolver.tsx frontend/src/__tests__/MoleculeResolver.test.tsx
git commit -m "feat(frontend): update MoleculeResolver with SkillTag for editorial surface"
```

---

## Slice 3: Utility Row

### Task 8: Restyle ContactCard + Create EducationMolecule

**Files:**
- Modify: `frontend/src/molecules/ContactCard.tsx`
- Modify: `frontend/src/__tests__/ContactCard.test.tsx`
- Create: `frontend/src/molecules/EducationMolecule.tsx`
- Create: `frontend/src/__tests__/EducationMolecule.test.tsx`

- [ ] **Step 1: Write EducationMolecule test**

Create `frontend/src/__tests__/EducationMolecule.test.tsx`:

```typescript
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EducationMolecule } from "../molecules/EducationMolecule";

afterEach(cleanup);

describe("EducationMolecule", () => {
  it("renders degree and institution", () => {
    render(
      <EducationMolecule
        degree="B.E. Computer Science"
        institution="University of Peradeniya"
      />,
    );
    expect(screen.getByText("B.E. Computer Science")).toBeInTheDocument();
    expect(screen.getByText("University of Peradeniya")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement EducationMolecule**

Create `frontend/src/molecules/EducationMolecule.tsx`:

```typescript
export function EducationMolecule({
  degree,
  institution,
}: {
  degree: string;
  institution: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-sans text-ink-65">{degree}</p>
      <p className="text-[10px] font-sans text-ink-45">{institution}</p>
    </div>
  );
}
```

- [ ] **Step 3: Restyle ContactCard — CTA button + email link**

Replace `frontend/src/molecules/ContactCard.tsx` with:

```typescript
export function ContactCard({ email, cta }: { email: string; cta: string }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <a
        href={`mailto:${email}`}
        className="inline-block bg-ink text-canvas font-sans text-[9px] font-bold uppercase tracking-[0.15em] px-7 py-3 hover:opacity-85 transition-opacity duration-300"
      >
        {cta}
      </a>
      <a
        href={`mailto:${email}`}
        className="text-xs font-sans text-ink-50 underline underline-offset-[3px] hover:text-ink transition-colors duration-300"
      >
        {email}
      </a>
    </div>
  );
}
```

- [ ] **Step 4: Update ContactCard test**

Replace `frontend/src/__tests__/ContactCard.test.tsx` with:

```typescript
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ContactCard } from "../molecules/ContactCard";

afterEach(cleanup);

describe("ContactCard", () => {
  it("renders email link", () => {
    render(<ContactCard email="firaaz@example.com" cta="Let's talk" />);
    const links = screen.getAllByRole("link");
    const emailLink = links.find((l) => l.textContent === "firaaz@example.com");
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute("href", "mailto:firaaz@example.com");
  });

  it("renders CTA as primary button link", () => {
    render(<ContactCard email="firaaz@example.com" cta="Get in touch" />);
    const cta = screen.getByRole("link", { name: /get in touch/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "mailto:firaaz@example.com");
  });
});
```

- [ ] **Step 5: Run tests**

```bash
cd frontend && pnpm test src/__tests__/EducationMolecule.test.tsx src/__tests__/ContactCard.test.tsx
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/molecules/EducationMolecule.tsx frontend/src/molecules/ContactCard.tsx frontend/src/__tests__/EducationMolecule.test.tsx frontend/src/__tests__/ContactCard.test.tsx
git commit -m "feat(frontend): add EducationMolecule and restyle ContactCard"
```

---

### Task 9: Register Education + Relocate PresenceDot

**Files:**
- Modify: `frontend/src/molecules/MoleculeResolver.tsx`
- Modify: `frontend/src/__tests__/MoleculeResolver.test.tsx`
- Modify: `frontend/src/chrome/PresenceDot.tsx`
- Modify: `frontend/src/__tests__/PresenceDot.test.tsx`

- [ ] **Step 1: Add education to MoleculeResolver registry**

In `frontend/src/molecules/MoleculeResolver.tsx`, add the import and registry entry:

Add import at top:
```typescript
import { EducationMolecule } from "./EducationMolecule";
```

Add to registry object:
```typescript
  education: EducationMolecule as ComponentType<Record<string, unknown>>,
```

- [ ] **Step 2: Add education test to MoleculeResolver**

In `frontend/src/__tests__/MoleculeResolver.test.tsx`, add inside the describe block:

```typescript
  it("renders EducationMolecule for molecule='education'", () => {
    render(
      <MoleculeResolver
        molecule="education"
        data={{ degree: "B.E. Computer Science", institution: "University" }}
      />,
    );

    expect(screen.getByText("B.E. Computer Science")).toBeInTheDocument();
  });
```

- [ ] **Step 3: Remove fixed positioning from PresenceDot**

Replace `frontend/src/chrome/PresenceDot.tsx` with:

```typescript
import { useReducedMotion } from "../hooks/use-reduced-motion";

export function PresenceDot({ onClick }: { onClick: () => void }) {
  const reduced = useReducedMotion();

  return (
    <button
      type="button"
      aria-label="AI agent active"
      onClick={onClick}
      style={{
        width: "0.5rem",
        height: "0.5rem",
        borderRadius: "50%",
        backgroundColor: "oklch(0.6 0.12 230)",
        boxShadow: reduced
          ? "none"
          : "0 0 10px 2px oklch(0.6 0.12 230 / 0.4)",
        opacity: reduced ? 0.5 : undefined,
        animation: reduced
          ? "none"
          : "presence-pulse 3s ease-in-out infinite",
        border: "none",
        padding: 0,
        cursor: "pointer",
        flexShrink: 0,
      }}
    />
  );
}
```

- [ ] **Step 4: Update PresenceDot test — remove fixed-position assertion**

Replace `frontend/src/__tests__/PresenceDot.test.tsx` with:

```typescript
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PresenceDot } from "../chrome/PresenceDot";

afterEach(cleanup);

describe("PresenceDot", () => {
  it("has aria-label for accessibility", () => {
    render(<PresenceDot onClick={() => {}} />);
    expect(screen.getByLabelText("AI agent active")).toBeInTheDocument();
  });

  it("is visible", () => {
    render(<PresenceDot onClick={() => {}} />);
    expect(screen.getByLabelText("AI agent active")).toBeVisible();
  });

  it("has button role", () => {
    render(<PresenceDot onClick={() => {}} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<PresenceDot onClick={handleClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 5: Run all tests + typecheck + lint**

```bash
cd frontend && pnpm test && pnpm typecheck && pnpm lint
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/molecules/MoleculeResolver.tsx frontend/src/__tests__/MoleculeResolver.test.tsx frontend/src/chrome/PresenceDot.tsx frontend/src/__tests__/PresenceDot.test.tsx
git commit -m "feat(frontend): register EducationMolecule and relocate PresenceDot to command zone"
```

---

### Task 10: Full Surface Visual Baseline + Layout Assertions + Capture Script

**Files:**
- Create: `frontend/e2e/layout.spec.ts`
- Create: `frontend/e2e/capture-surface.spec.ts`
- Modify: `frontend/e2e/visual.spec.ts`

- [ ] **Step 1: Create layout assertion tests**

Create `frontend/e2e/layout.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

test.describe("Layout assertions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("surface grid has 12 columns", async ({ page }) => {
    const grid = page.locator(".surface-grid");
    const cols = await grid.evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns,
    );
    expect(cols.split(" ")).toHaveLength(12);
  });

  test("hero name uses Zilla Slab", async ({ page }) => {
    const name = page.locator("[data-zone='identity'] h1");
    const font = await name.evaluate(
      (el) => getComputedStyle(el).fontFamily,
    );
    expect(font).toContain("Zilla Slab");
  });

  test("identity zone spans columns 1-4", async ({ page }) => {
    const zone = page.locator("[data-zone='identity']");
    const col = await zone.evaluate(
      (el) => getComputedStyle(el).gridColumn,
    );
    expect(col).toMatch(/1\s*\/\s*5/);
  });

  test("featured zone spans columns 5-13", async ({ page }) => {
    const zone = page.locator("[data-zone='featured']");
    const col = await zone.evaluate(
      (el) => getComputedStyle(el).gridColumn,
    );
    expect(col).toMatch(/5\s*\/\s*13/);
  });

  test("featured zone has correct surface background", async ({ page }) => {
    const zone = page.locator("[data-zone='featured']");
    const bg = await zone.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(bg).toBe("rgba(28, 36, 48, 0.06)");
  });

  test("all 8 zones are visible", async ({ page }) => {
    const zoneNames = [
      "identity", "featured", "experience", "other-work",
      "skills", "contact", "education", "command",
    ];
    for (const name of zoneNames) {
      await expect(page.locator(`[data-zone='${name}']`)).toBeVisible();
    }
  });
});
```

- [ ] **Step 2: Expand visual regression to all zones**

Replace `frontend/e2e/visual.spec.ts` with:

```typescript
import { expect, test } from "@playwright/test";

test.describe("Visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("full surface", async ({ page }) => {
    await expect(page).toHaveScreenshot("full-surface.png", {
      fullPage: true,
    });
  });

  for (const zone of [
    "identity", "featured", "experience", "other-work",
    "skills", "contact", "education", "command",
  ]) {
    test(`zone: ${zone}`, async ({ page }) => {
      const el = page.locator(`[data-zone='${zone}']`);
      await expect(el).toHaveScreenshot(`zone-${zone}.png`);
    });
  }
});
```

- [ ] **Step 3: Create visual capture script**

Create `frontend/e2e/capture-surface.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

test.describe("Surface visual capture", () => {
  test("desktop rest state", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveScreenshot("capture-desktop-rest.png", {
      fullPage: true,
    });
  });

  test("desktop hover states", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });

    for (const zone of ["identity", "featured", "experience", "other-work", "skills", "contact"]) {
      await page.locator(`[data-zone='${zone}']`).hover();
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(`capture-hover-${zone}.png`);
    }
  });

  test("reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveScreenshot("capture-reduced-motion.png", {
      fullPage: true,
    });
  });
});
```

- [ ] **Step 4: Delete old visual snapshots and regenerate**

```bash
cd frontend && rm -rf e2e/visual.spec.ts-snapshots/ && pnpm test:e2e:update
```

- [ ] **Step 5: Run all e2e tests**

```bash
cd frontend && pnpm test:e2e
```

Expected: all pass (smoke + visual + layout + capture).

- [ ] **Step 6: Commit**

```bash
git add frontend/e2e/
git commit -m "test(frontend): add layout assertions and visual capture for full editorial surface"
```

---

## Slice 4: Breathing

### Task 11: use-dwell Hook (TDD)

**Files:**
- Create: `frontend/src/__tests__/use-dwell.test.ts`
- Create: `frontend/src/hooks/use-dwell.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/use-dwell.test.ts`:

```typescript
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDwell } from "../hooks/use-dwell";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDwell", () => {
  it("returns null dwellZone initially", () => {
    const { result } = renderHook(() => useDwell());
    expect(result.current.dwellZone).toBeNull();
  });

  it("triggers dwell after 2s threshold", () => {
    const { result } = renderHook(() => useDwell());

    act(() => result.current.handlers("featured").onMouseEnter());
    expect(result.current.dwellZone).toBeNull();

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.dwellZone).toBe("featured");
  });

  it("does not trigger dwell on short hover (<2s)", () => {
    const { result } = renderHook(() => useDwell());

    act(() => result.current.handlers("skills").onMouseEnter());
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.handlers("skills").onMouseLeave());

    expect(result.current.dwellZone).toBeNull();
  });

  it("clears dwell after leave + 300ms linger", () => {
    const { result } = renderHook(() => useDwell());

    act(() => result.current.handlers("featured").onMouseEnter());
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.dwellZone).toBe("featured");

    act(() => result.current.handlers("featured").onMouseLeave());
    expect(result.current.dwellZone).toBe("featured"); // lingering

    act(() => vi.advanceTimersByTime(300));
    expect(result.current.dwellZone).toBeNull();
  });

  it("clears old dwell immediately when entering new zone", () => {
    const { result } = renderHook(() => useDwell());

    act(() => result.current.handlers("featured").onMouseEnter());
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.dwellZone).toBe("featured");

    act(() => result.current.handlers("featured").onMouseLeave());
    act(() => result.current.handlers("experience").onMouseEnter());
    expect(result.current.dwellZone).toBeNull(); // old dwell cleared

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.dwellZone).toBe("experience");
  });

  it("accepts custom threshold and linger", () => {
    const { result } = renderHook(() => useDwell(1000, 500));

    act(() => result.current.handlers("skills").onMouseEnter());
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.dwellZone).toBe("skills");

    act(() => result.current.handlers("skills").onMouseLeave());
    act(() => vi.advanceTimersByTime(499));
    expect(result.current.dwellZone).toBe("skills");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.dwellZone).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd frontend && pnpm test src/__tests__/use-dwell.test.ts
```

Expected: FAIL — `Cannot find module '../hooks/use-dwell'`

- [ ] **Step 3: Implement use-dwell hook**

Create `frontend/src/hooks/use-dwell.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from "react";

export function useDwell(threshold = 2000, linger = 300) {
  const [dwellZone, setDwellZone] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lingerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (lingerTimerRef.current) {
      clearTimeout(lingerTimerRef.current);
      lingerTimerRef.current = null;
    }
  }, []);

  const handlers = useCallback(
    (zone: string) => ({
      onMouseEnter: () => {
        clearTimers();
        dwellRef.current = null;
        setDwellZone(null);
        hoverTimerRef.current = setTimeout(() => {
          dwellRef.current = zone;
          setDwellZone(zone);
        }, threshold);
      },
      onMouseLeave: () => {
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }
        if (dwellRef.current) {
          lingerTimerRef.current = setTimeout(() => {
            dwellRef.current = null;
            setDwellZone(null);
          }, linger);
        }
      },
    }),
    [clearTimers, threshold, linger],
  );

  useEffect(() => clearTimers, [clearTimers]);

  return { dwellZone, handlers };
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd frontend && pnpm test src/__tests__/use-dwell.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/use-dwell.ts frontend/src/__tests__/use-dwell.test.ts
git commit -m "feat(frontend): add use-dwell hook for breathing zone detection"
```

---

### Task 12: Wire Breathing into Canvas + Content Reveal CSS

**Files:**
- Modify: `frontend/src/canvas/Canvas.tsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add breathing grid-template transition CSS to index.css**

Append to `frontend/src/index.css`, after the `.zone-command` rule and before `@media (max-height: 800px)`:

```css
/* Breathing: grid-template transitions (ADR-0007 allowlist) */
.surface-grid {
  transition:
    grid-template-rows 600ms cubic-bezier(0.4, 0, 0.2, 1),
    gap 600ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Content reveal during breathing */
.breathing-extra {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition: opacity 450ms ease-out 150ms;
}
[data-breathing="true"] .breathing-extra {
  opacity: 1;
  max-height: none;
}

/* Deprioritized zone dimming */
.zone-dimmed {
  opacity: 0.45;
  transition: opacity 500ms ease-out;
}
.zone-dimmed:hover {
  opacity: 1;
  transition: opacity 300ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .surface-grid {
    transition: none;
  }
}
```

Note: The `.breathing-extra` selector in this CSS block overrides the inline `opacity-0 max-h-0` Tailwind classes when `[data-breathing="true"]` is set on the parent zone, because the attribute selector has higher specificity.

- [ ] **Step 2: Add breathing logic to Canvas**

Update `frontend/src/canvas/Canvas.tsx` to import and use the dwell hook. Add `data-breathing` attribute and dynamic grid-template-rows:

```typescript
import { useDwell } from "../hooks/use-dwell";
import { PresenceDot } from "../chrome/PresenceDot";
import { MoleculeResolver } from "../molecules/MoleculeResolver";
import type { UXItem } from "../store/ux-store";
import { useUXStore } from "../store/ux-store";
import { ZoneLabel } from "./ZoneLabel";
import type { ZoneName } from "./zone-map";
import { mapItemsToZones } from "./zone-map";

const ZONE_CONFIG: { name: ZoneName; label: string; surface: string }[] = [
  { name: "identity", label: "Identity", surface: "surface-inset" },
  { name: "featured", label: "Featured Work", surface: "surface-featured" },
  { name: "experience", label: "Experience", surface: "surface-inset" },
  { name: "other-work", label: "Other Work", surface: "surface-base" },
  { name: "skills", label: "Skills", surface: "surface-base" },
  { name: "contact", label: "Contact", surface: "surface-recessed" },
  { name: "education", label: "Education", surface: "surface-base" },
];

const ROW1_ZONES: string[] = ["identity", "featured"];
const ROW2_ZONES: string[] = ["experience", "other-work", "skills"];
const DIMMED_THRESHOLD = 0.35;

function getGridRows(dwellZone: string | null): string {
  if (!dwellZone) return "1.4fr 1fr auto";
  if (ROW1_ZONES.includes(dwellZone)) return "1.8fr 0.6fr auto";
  if (ROW2_ZONES.includes(dwellZone)) return "1.0fr 1.4fr auto";
  return "1.4fr 1fr auto";
}

function isZoneDimmed(zoneItems: UXItem[] | undefined): boolean {
  if (!zoneItems || zoneItems.length === 0) return false;
  return zoneItems.every((item) => item.salience < DIMMED_THRESHOLD);
}

export function Canvas({
  onPresenceDotClick,
}: {
  onPresenceDotClick: () => void;
}) {
  const items = useUXStore((s) => s.items);
  const { dwellZone, handlers } = useDwell();

  if (items.length === 0) {
    return (
      <div
        role="status"
        aria-label="Loading"
        className="flex items-center justify-center min-h-screen text-ink-50 text-sm"
      >
        Loading...
      </div>
    );
  }

  const zones = mapItemsToZones(items);

  return (
    <main
      className="surface-grid"
      style={{ gridTemplateRows: getGridRows(dwellZone) }}
    >
      {ZONE_CONFIG.map(({ name, label, surface }) => {
        const zoneItems = zones.get(name);
        const dimmed = isZoneDimmed(zoneItems);
        return (
          <section
            key={name}
            data-zone={name}
            data-breathing={dwellZone === name}
            className={`zone zone-${name} ${surface} ${dimmed ? "zone-dimmed" : ""}`}
            {...handlers(name)}
          >
            <ZoneLabel>{label}</ZoneLabel>
            {zoneItems?.map((item) => (
              <div
                key={item.id}
                style={{ opacity: dimmed ? undefined : item.salience }}
                className="transition-opacity duration-500 ease-out"
              >
                <MoleculeResolver molecule={item.molecule} data={item.data} />
              </div>
            ))}
          </section>
        );
      })}
      <section
        data-zone="command"
        className="zone zone-command surface-base flex items-end justify-end"
      >
        {/* Command zone: no dwell handlers — static chrome */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block text-[10px] text-ink-20">⌘K</span>
            <span className="block text-[9px] text-ink-20">
              Ask me anything
            </span>
          </div>
          <PresenceDot onClick={onPresenceDotClick} />
        </div>
      </section>
    </main>
  );
}
```

When all items in a zone have salience below `DIMMED_THRESHOLD` (0.35), the zone gets the `.zone-dimmed` class (45% opacity, hover → 100%). When dimmed, individual item-level opacity is skipped — the zone-level dimming takes over.

- [ ] **Step 3: Run all unit tests**

```bash
cd frontend && pnpm test
```

Expected: all pass. The Canvas test doesn't test breathing (no fake timers in happy-dom hover).

- [ ] **Step 4: Typecheck + lint**

```bash
cd frontend && pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/canvas/Canvas.tsx frontend/src/index.css
git commit -m "feat(frontend): wire breathing grid transitions, content reveal, and zone dimming"
```

---

### Task 13: Breathing E2E Tests

**Files:**
- Create: `frontend/e2e/breathing.spec.ts`

- [ ] **Step 1: Create breathing interaction tests**

Create `frontend/e2e/breathing.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

test.describe("Breathing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("featured zone expands on 2s dwell", async ({ page }) => {
    const zone = page.locator("[data-zone='featured']");
    const extra = zone.locator(".breathing-extra");

    await expect(extra).not.toBeVisible();

    await zone.hover();
    await page.waitForTimeout(2500);

    await expect(zone).toHaveAttribute("data-breathing", "true");
    await expect(extra).toBeVisible();
    await expect(zone).toHaveScreenshot("breathing-featured-expanded.png");
  });

  test("zone contracts after mouse leave with linger", async ({ page }) => {
    const zone = page.locator("[data-zone='featured']");
    const extra = zone.locator(".breathing-extra");

    await zone.hover();
    await page.waitForTimeout(2500);
    await expect(extra).toBeVisible();

    await page.mouse.move(0, 0);
    await page.waitForTimeout(1200);

    await expect(zone).toHaveAttribute("data-breathing", "false");
  });

  test("short hover shows tonal lift only, no breathing", async ({ page }) => {
    const zone = page.locator("[data-zone='featured']");
    const extra = zone.locator(".breathing-extra");

    await zone.hover();
    await page.waitForTimeout(500);

    await expect(extra).not.toBeVisible();
    await expect(zone).toHaveAttribute("data-breathing", "false");
  });

  test("prefers-reduced-motion disables grid transitions", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });

    const grid = page.locator(".surface-grid");
    const duration = await grid.evaluate(
      (el) => getComputedStyle(el).transitionDuration,
    );
    expect(duration).toBe("0s");
  });
});
```

- [ ] **Step 2: Run breathing tests and update baselines**

```bash
cd frontend && pnpm test:e2e --grep "Breathing" --update-snapshots
```

- [ ] **Step 3: Run all e2e tests**

```bash
cd frontend && pnpm test:e2e
```

Expected: all pass. If visual baselines differ due to breathing state, regenerate: `pnpm test:e2e:update`.

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e/breathing.spec.ts frontend/e2e/breathing.spec.ts-snapshots/
git commit -m "test(frontend): add breathing interaction e2e tests"
```

---

## Slice 5: Mobile Responsive

### Task 14: Mobile Grid Collapse + E2E Tests

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add mobile media query to index.css**

Append to `frontend/src/index.css`, after the `@media (max-height: 800px)` block and before `@layer base`:

```css
@media (max-width: 767px) {
  html {
    overflow: auto;
  }
  .surface-grid {
    height: auto;
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    padding: 16px;
    overflow-y: auto;
  }
  .zone {
    padding: 16px;
  }
  .zone-identity,
  .zone-featured,
  .zone-experience,
  .zone-other-work,
  .zone-skills,
  .zone-contact,
  .zone-education,
  .zone-command {
    grid-column: 1;
    grid-row: auto;
  }
  /* Disable breathing on mobile — touch dwell needs device testing */
  .surface-grid {
    transition: none !important;
  }
  [data-breathing="true"] .breathing-extra {
    opacity: 0;
    max-height: 0;
  }
}
```

- [ ] **Step 2: Add mobile e2e tests**

Add a mobile test to `frontend/e2e/capture-surface.spec.ts` (append to the existing describe block):

```typescript
  test("mobile rest state", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveScreenshot("capture-mobile-rest.png", {
      fullPage: true,
    });
  });
```

Also create a mobile layout assertion in `frontend/e2e/layout.spec.ts` (append to existing describe block):

```typescript
  test("mobile: single column stack", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });

    const grid = page.locator(".surface-grid");
    const cols = await grid.evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns,
    );
    expect(cols.split(" ")).toHaveLength(1);

    // Verify no horizontal overflow
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
```

- [ ] **Step 3: Regenerate all baselines**

```bash
cd frontend && pnpm test:e2e:update
```

- [ ] **Step 4: Run all tests**

```bash
cd frontend && pnpm test && pnpm test:e2e && pnpm typecheck && pnpm lint
```

Expected: all pass — unit, e2e, typecheck, lint.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/index.css frontend/e2e/
git commit -m "feat(frontend): add mobile responsive grid collapse"
```

---

## Verification Checklist

After all 14 tasks are complete, run the full verification suite:

```bash
cd frontend && pnpm typecheck && pnpm test && pnpm lint && pnpm test:e2e
```

**Slice gates:**
- [x] Slice 1: Tokens + grid + hero row render editorially
- [x] Slice 2: Flow row (experience, other-work, skills) render editorially
- [x] Slice 3: Utility row (contact, education, command) complete, all 8 zones visible
- [x] Slice 4: Breathing — zones expand on 2s dwell, contract on leave, reduced-motion respected
- [x] Slice 5: Mobile — single column at <768px, no horizontal overflow, breathing disabled

**Manual inspection:** Run `pnpm test:e2e --grep "capture" --update-snapshots` and review the screenshots in `frontend/e2e/capture-surface.spec.ts-snapshots/`:
- `capture-desktop-rest.png` — full surface at 1280x720
- `capture-hover-*.png` — tonal lift on each zone
- `capture-breathing-featured.png` — expanded featured zone (if breathing test added to capture)
- `capture-mobile-rest.png` — 375x812 scrollable stack
- `capture-reduced-motion.png` — no animations
