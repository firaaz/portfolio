# FEAT-002 Scope 2+3: The Surface (Expanded Bet)

## Context

FEAT-002 Scope 1 (UX Protocol Layer) is complete on `develop`. The four-dimensional UX protocol flows end-to-end through SSE. But the Canvas is a walking skeleton: vertical sections, Geist font, OKLCH tokens, rounded borders, backdrop-blur cards, radial gradient body. It looks like every shadcn template.

The Surface is the most important part of the portfolio — it IS the first impression. Shipping it static-only on desktop would leave the most important feature incomplete. This expanded bet merges the original Scope 2 (static editorial grid) + Scope 3 (breathing) + mobile responsive into a single scope that delivers the complete first impression: **the editorial grid, alive and responsive**.

**Appetite:** ~4 weeks. 5 slices. One builder.

**HTML prototype reference:** `docs/design/prototypes/feat-002-surface-state.html`
**Design spec:** `docs/superpowers/specs/2026-04-04-design-and-agent-ux-design.md`
**Breathing ADR:** `docs/adrs/0007-breathing-motion-language.md`
**Motion ADR:** `docs/adrs/0004-editorial-canvas-motion.md`

---

## Three Specs Considered

### Spec A: "Design System as Infrastructure"
Build tokens → surface utilities → grid shell → zone content rendering. Four sequential layers. Clean separation but delayed visual payoff — first visible result arrives mid-scope. **Rejected:** violates the walking-skeleton lesson.

### Spec B: "Zone-Driven Vertical Slices" (THE BET)
Build row by row. Each row-slice introduces grid positions, surface levels, and molecule restyling. Tokens arrive naturally with the first slice. Each increment is visually shippable. Breathing and mobile added as finishing slices after the static surface is complete.

### Spec C: "Molecule-Driven Surface"
Style each molecule to editorial quality, then compose into a grid. Focuses on craft but treats the grid as an afterthought. 1-week appetite is too aggressive. **Rejected:** the grid IS the spatial model change, not just plumbing.

**Stolen from rejected specs:**
- From A: Token coexistence strategy (remap shadcn aliases to ink values)
- From C: Molecule-as-craft philosophy, breathing-extra pre-wire, SkillLink→SkillTag rename

---

## Full Pitch: Zone-Driven Vertical Slices + Breathing + Mobile

### Problem

The portfolio has a working agent pipeline but the visual layer is a shadcn default: vertical scroll, Geist font, rounded cards, OKLCH tokens, radial gradients. The design spec calls for an Iron-Gall Ink editorial surface: monochromatic palette, Zilla Slab + Inter typography, 12-column bento grid in a single viewport, tonal depth via background opacity, no card chrome, breathing zones that expand on visitor dwell, and responsive collapse on mobile. Nothing in the current Canvas resembles this.

### Appetite

~4 weeks. 5 slices. Each shippable.

### Solution

---

#### Slice 1: Hero Row + Tokens + Grid Shell

The biggest visual impact first. Introduces the entire design system in one shot because the hero zone requires every token.

**Token layer** (`frontend/src/index.css`):
- Iron-Gall Ink palette: `--ink` (#1C2430), `--canvas` (#F3F4F6), 10 opacity stops (--ink-100 through --ink-03)
- Spacing: `--sp-1` through `--sp-7` (4px–64px, 8px base)
- Typography: Zilla Slab + Inter via `@fontsource/zilla-slab` and `@fontsource-variable/inter` (replacing `@fontsource-variable/geist`)
- `@theme inline` block: `--font-heading: 'Zilla Slab', serif`, `--font-sans: 'Inter', sans-serif`
- Shadcn OKLCH `:root` variables remapped to ink equivalents (e.g., `--background: var(--canvas)`, `--foreground: var(--ink)`)
- `.dark` block stays but dormant (no `dark` class on `<html>`)
- Body radial gradients removed → `background: var(--canvas)`
- Hero glow pseudo-element (`[data-zone="hero"]::before`) removed

**Surface classes** in `index.css`:
- `.surface-inset` { background: var(--ink-03) } — hover: rgba(28,36,48,0.05)
- `.surface-featured` { background: var(--ink-06) } — hover: rgba(28,36,48,0.08)
- `.surface-recessed` { background: var(--ink-05) } — hover: rgba(28,36,48,0.07)
- `.surface-base` { background: var(--canvas) } — hover: rgba(28,36,48,0.02)
- All: `transition: background 0.3s ease-out`, `overflow: hidden`

**Grid shell** (`frontend/src/canvas/Canvas.tsx`):
- `<main>` with `max-w-5xl` → CSS grid: `100dvh` (fallback `100vh`), `repeat(12, 1fr)` columns, `1.4fr 1fr auto` rows, `2px` gap, `var(--sp-5)` padding
- `@media (max-height: 800px)`: reduce surface padding to `var(--sp-3)`, zone padding to `var(--sp-3)`

**Zone mapping** (`frontend/src/canvas/zone-map.ts` — new file):
Pure function: `(items: UXItem[]) => Map<ZoneName, UXItem[]>`:
```
identity group:  hero → Identity zone
work group:      molecule=project, highest salience → Featured zone
                 molecule=project, remaining → OtherWork zone
                 molecule=experience → Experience zone
background group: molecule=contact → Contact zone
                  molecule=skill → Skills zone
                  molecule=education → Education zone
Command zone → static (no item)
```

**Row 1 zones:**
- Identity (c1-4, r1): `surface-inset`, zone label "Identity"
  - HeroMolecule restyled: Zilla Slab 700 name at `clamp(24px, 3.5vw, 32px)` --ink-100, Inter 11px uppercase title at --ink-45 with 0.12em tracking, Inter 13px summary at --ink-65, social icon links (SVG at --ink-35, hover → --ink-100)
  - AnimatePresence removed (static for this scope)
- Featured Work (c5-12, r1): `surface-featured`, zone label "Featured Work"
  - ProjectCard restyled: Zilla Slab 300 italic title at `clamp(16px, 2vw, 22px)` --ink-100, Inter 12px description at --ink-65, tech tags as 8px uppercase chips (--ink-06 bg, --ink-50 text, 0.1em tracking, 3px 10px padding)
  - No borders, no rounded corners, no backdrop-blur, no shadow
  - `.breathing-extra` div pre-wired (hidden: `opacity: 0; max-height: 0; overflow: hidden`) for Slice 4

**Zone label component**: 9px uppercase Inter, --ink-45, `letter-spacing: 0.12em`, `margin-bottom: var(--sp-2)`

**Files:** `index.css`, `Canvas.tsx`, `zone-map.ts` (new), `HeroMolecule.tsx`, `ProjectCard.tsx` + npm install fonts

---

#### Slice 2: Flow Row (Row 2)

Three zones testing bento subdivision:

- **Experience** (c1-4, r2): `surface-inset`, zone label "Experience"
  - ExperienceCard restyled: Inter 700 10px uppercase company at --ink-50 with 0.08em tracking, Zilla Slab 400 16px role at --ink-100, Inter 10px duration at --ink-45
  - No borders, no blur. Multiple experiences stack vertically within zone.

- **Other Work** (c5-8, r2): `surface-base`, zone label "Other Work"
  - Remaining project(s). Same ProjectCard but rendered with smaller title (16px, --ink-65 instead of --ink-100) and Inter 10px meta description instead of full description.

- **Skills** (c9-12, r2): `surface-base`, zone label "Skills"
  - SkillLink.tsx → SkillTag.tsx: Inter 500 8px uppercase, --ink-06 bg, --ink-50 text, 3px 10px padding. No dot prefix. `display: flex; flex-wrap: wrap; gap: 6px`.

**Files:** `Canvas.tsx` (zone mapping additions), `ExperienceCard.tsx`, `SkillLink.tsx` → `SkillTag.tsx` (rename), `MoleculeResolver.tsx`

---

#### Slice 3: Utility Row (Row 3)

Auto-height row:

- **Contact** (c1-4, r3): `surface-recessed`, zone label "Contact"
  - ContactCard restyled: `<button>` with --ink-100 bg, --canvas text, Inter 700 9px uppercase, 0.15em tracking, 12px 28px padding, hover `opacity: 0.85`, 0.3s ease-out. Email link: Inter 12px --ink-50, underlined, `text-underline-offset: 3px`, hover → --ink-100.
  - Flex layout: `display: flex; align-items: center; gap: 16px; flex-wrap: wrap`

- **Education** (c5-8, r3): `surface-base`, zone label "Education"
  - **New EducationMolecule**: Inter 12px degree at --ink-65, Inter 10px institution at --ink-45
  - Add to MoleculeResolver registry as `education`

- **Command** (c9-12, r3): `surface-base`, no zone label
  - Static text: "⌘K" at 10px --ink-20, "Ask me anything" at 9px --ink-20
  - Aligned bottom-right: `display: flex; align-items: flex-end; justify-content: flex-end`
  - PresenceDot repositioned here (from floating position)

**Files:** `ContactCard.tsx`, `EducationMolecule.tsx` (new), `MoleculeResolver.tsx`, `Canvas.tsx` (command zone + PresenceDot placement)

---

#### Slice 4: Breathing

Zones expand/contract on visitor dwell. This is what makes the surface feel alive.

**Dwell detection hook** (`frontend/src/hooks/use-dwell.ts` — new):
- Track `mouseenter` timestamp per zone
- Fire `onDwell` callback after 2000ms threshold
- Track `mouseleave` for contraction timing
- Debounce logic: <1000ms hover = nothing, 1000-2000ms = short contract, >2000ms = full breathing
- Returns `{ isDwelling, dwellZone }` state

**Grid-template transitions** (CSS in `index.css` or Canvas):
- Per ADR-0007: transitions on `grid-template-rows`, `grid-template-columns`, `gap` only
- Duration: 600ms, easing: `cubic-bezier(0.4, 0, 0.2, 1)`
- Expanding zone grows its grid track fraction; neighboring zones shrink proportionally
- `overflow: hidden` on all zones already applied (Slice 1) — content clips on contraction

**Expanded content per molecule** (from design spec Zone Content Map):
| Molecule | Surface (compact) | Breathing (dwell 2s+) |
|----------|-------------------|----------------------|
| hero | No change | No change (stability) |
| project | Title + one-line desc + 2-3 tags | +full description, additional tags, "View details →" link |
| experience | Company + role + duration | +description text below role |
| contact | No change | No change (already complete) |
| skill/education | No change | No change |

**Content reveal on expand**: opacity 0→1, 450ms ease-out, 150ms delay
**Content clip on contract**: overflow: hidden does the work (ADR-0007)
**Linger on leave**: 300ms hold at expanded size, then 600ms contraction
**Short hover (<2s)**: tonal surface lift only (already handled by surface hover classes from Slice 1)

**`prefers-reduced-motion`**: grid/gap transitions snap instantly (no animation). Opacity transitions remain. Overflow clipping still works.

**Deprioritized zones** (salience < threshold): 45% opacity default, hover → 100% (300ms), leave → 45% (500ms)

**Files:** `use-dwell.ts` (new), `Canvas.tsx` (dynamic grid-template-rows/columns via inline style or CSS class), `ProjectCard.tsx` (breathing-extra content reveal), `ExperienceCard.tsx` (expanded description)

---

#### Slice 5: Mobile Responsive

Grid collapse for narrow viewports. Single-column vertical scroll.

**Breakpoint strategy** (from design spec):
- Desktop (>= 768px): 12-column grid, 100dvh, no scroll, 32px outer margin, 24px zone padding
- Mobile (< 768px): single column, scrollable, 16px outer margin, 16px zone padding
- No tablet-specific layout — mobile stacks, desktop grids

**Grid collapse** (`index.css`):
```css
@media (max-width: 767px) {
  .surface {
    height: auto;           /* scrollable */
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    padding: var(--sp-3);   /* 16px */
    overflow-y: auto;
  }
  .zone { padding: var(--sp-3); }  /* 16px */
  /* All zones become full-width, stacked */
  .zone-identity, .zone-featured, .zone-experience,
  .zone-other, .zone-skills, .zone-contact,
  .zone-education, .zone-cmdk {
    grid-column: 1;
    grid-row: auto;
  }
}
```

**Zone stacking order** (mobile): Identity → Featured → Experience → Other Work → Skills → Contact → Education → Command (same reading order as desktop L→R, T→B)

**Mobile breathing**: the design spec has this as an open question ("scroll-stop detection? Long-press?"). For this scope: **disable breathing on touch devices**. The tonal hover lifts also don't apply on touch. Instead, all zones render at full size with compact content. Breathing on mobile is a separate experiment needing device testing.

**Typography**: `clamp()` already handles responsive scaling — no changes needed.

**Files:** `index.css` (media query for grid collapse + zone resets), possibly `Canvas.tsx` (zone order via CSS `order` if needed)

---

### Rabbit Holes

- **Font loading**: `@fontsource/zilla-slab` (300, 400, 700, 300 italic) + `@fontsource-variable/inter`. Same pattern as existing Geist import. Don't use Google Fonts CDN.
- **Zone mapping granularity**: Don't add `zone` field to UXItem. Don't build a generic assignment DSL. The cast list is derived from `group` + `molecule` + `salience`.
- **shadcn token remapping**: Remap, don't delete. Chrome components (Dialog, Sheet) reference shadcn aliases. Fix Dialog appearance if it looks wrong in light mode — don't maintain two token systems.
- **SkillLink rename**: Rename to SkillTag. Update all imports and tests.
- **Row 1 without rows 2-3**: Empty rows consume space but grid holds shape. Don't hide empty rows.
- **Breathing grid-template perf**: 8 zones breathing simultaneously = layout reflow. Profile with Chrome DevTools. If janky, limit to one zone breathing at a time (expand the dwelled zone, don't shrink others).
- **Breathing state management**: Track dwelled zone in local component state (useState), not in Zustand. This is UI interaction state, not UX protocol state.
- **100dvh**: Use `100dvh` with `100vh` fallback. One-line CSS.
- **Mobile breathing**: Disable for this scope. Touch dwell detection needs device testing (open question in design spec). Ship mobile with static grid, add touch breathing later.
- **motion/react removal from Hero**: Remove AnimatePresence. Static render. Hero animation is a future concern.
- **Body overflow**: Desktop: `overflow: hidden` on html/body (single viewport). Mobile: `overflow-y: auto` (scrollable).

### No-Gos

- **No depth layers** — Click-to-expand case studies, pagination, frozen surface. Scope 4.
- **No chrome restyling** — Command bar + transparency panel keep shadcn styling. Scope 5.
- **No dark mode** — Iron-Gall Ink is light-only by design. `.dark` block dormant.
- **No agent-driven zone assignment** — Zone positions deterministic from item metadata. Agent controls salience, not placement.
- **No content changes** — YAML catalog stays as-is. No new items, no schema changes, no backend modifications.
- **No custom Tailwind plugins** — Use `@theme inline` for token registration.
- **No touch breathing** — Mobile gets static grid. Touch dwell is a separate experiment.
- **No generative content** — Molecules render catalog data only. AI-generated content is a separate scope.

---

## Testing Strategy

The Surface is entirely visual. Unit tests (vitest + happy-dom) verify component structure and logic but cannot verify that the grid renders correctly, fonts loaded, colors are right, or breathing feels smooth. **Playwright visual regression is the primary quality gate.**

### Existing setup (to evolve, not replace)
- `frontend/playwright.config.ts`: Chromium, 1280x720 default, `maxDiffPixelRatio: 0.01`, auto-starts both backend + frontend
- `frontend/e2e/visual.spec.ts`: 4 screenshot tests (full-page, hero-zone, flow-zone, background-zone) — reference the old walking skeleton zones
- `frontend/e2e/smoke.spec.ts`: functional tests checking SSE delivery and zone visibility
- Snapshots in `frontend/e2e/visual.spec.ts-snapshots/`
- Commands: `pnpm test:e2e`, `pnpm test:e2e:update` (regenerate baselines)

### Three test layers

**Layer 1: Visual regression (screenshot baselines)**
Evolve `visual.spec.ts` per slice. Each slice updates the screenshot baselines.

After Slice 3 completion (full static surface), the baseline set becomes:
```
full-surface.png          — full page at 1280x720 (all 8 zones visible)
zone-identity.png         — Identity zone (c1-4, r1)
zone-featured.png         — Featured Work zone (c5-12, r1)
zone-experience.png       — Experience zone (c1-4, r2)
zone-other-work.png       — Other Work zone (c5-8, r2)
zone-skills.png           — Skills zone (c9-12, r2)
zone-contact.png          — Contact zone (c1-4, r3)
zone-education.png        — Education zone (c5-8, r3)
zone-command.png          — Command zone (c9-12, r3)
```

After Slice 4, add breathing state screenshots:
```
breathing-featured-expanded.png   — Featured zone after 2.5s dwell (extra content visible)
breathing-featured-hover.png      — Featured zone on short hover (tonal lift only)
```

After Slice 5, add mobile screenshots:
```
mobile-full-page.png              — Full page at 375x812 (scrollable, all zones stacked)
```

**Layer 2: Layout assertion tests** (`frontend/e2e/layout.spec.ts` — new)
Computed CSS property checks that catch structural regressions screenshots might miss:

```typescript
// Grid structure
test("surface grid has 12 columns", async ({ page }) => {
  const grid = page.locator(".surface");
  const cols = await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns);
  expect(cols.split(" ")).toHaveLength(12);
});

// Typography
test("hero name uses Zilla Slab", async ({ page }) => {
  const name = page.locator(".name, [data-zone='identity'] h1");
  const font = await name.evaluate(el => getComputedStyle(el).fontFamily);
  expect(font).toContain("Zilla Slab");
});

// Surface hierarchy
test("featured zone has correct background", async ({ page }) => {
  const zone = page.locator("[data-zone='featured']");
  const bg = await zone.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgba(28, 36, 48, 0.06)");
});

// Zone positioning
test("identity zone spans columns 1-4", async ({ page }) => {
  const zone = page.locator("[data-zone='identity']");
  const col = await zone.evaluate(el => getComputedStyle(el).gridColumn);
  expect(col).toMatch(/1\s*\/\s*5/);
});
```

**Layer 3: Interaction tests** (`frontend/e2e/breathing.spec.ts` — new, Slice 4)
Playwright hover + timing for breathing mechanics:

```typescript
test("featured zone expands on 2s dwell", async ({ page }) => {
  const zone = page.locator("[data-zone='featured']");
  const extra = zone.locator(".breathing-extra");

  // Rest: extra content hidden
  await expect(extra).not.toBeVisible();

  // Dwell: hover for 2.5s
  await zone.hover();
  await page.waitForTimeout(2500);

  // Expanded: extra content visible
  await expect(extra).toBeVisible();
  await expect(zone).toHaveScreenshot("breathing-featured-expanded.png");
});

test("zone contracts after mouse leave with linger", async ({ page }) => {
  const zone = page.locator("[data-zone='featured']");
  const extra = zone.locator(".breathing-extra");

  // Trigger breathing
  await zone.hover();
  await page.waitForTimeout(2500);
  await expect(extra).toBeVisible();

  // Leave zone
  await page.mouse.move(0, 0);
  // 300ms linger + 600ms contract + buffer
  await page.waitForTimeout(1200);

  await expect(extra).not.toBeVisible();
});

test("short hover shows tonal lift only", async ({ page }) => {
  const zone = page.locator("[data-zone='featured']");
  const extra = zone.locator(".breathing-extra");

  // Short hover (500ms < 2s threshold)
  await zone.hover();
  await page.waitForTimeout(500);

  // No breathing triggered
  await expect(extra).not.toBeVisible();
  // But tonal lift visible (background change)
  await expect(zone).toHaveScreenshot("breathing-featured-hover.png");
});

test("prefers-reduced-motion disables grid transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  // ... verify grid snaps instead of animating
});
```

### Rerunnable visual capture script

A dedicated Playwright script that captures the surface at every key state for manual inspection. Run it anytime to get a full visual audit:

**File:** `frontend/e2e/capture-surface.spec.ts`

```typescript
// Run: pnpm test:e2e --grep "capture" --update-snapshots
// Output: screenshots in e2e/capture-surface.spec.ts-snapshots/

test.describe("Surface visual capture", () => {
  test("desktop rest state", async ({ page }) => {
    // Wait for SSE data
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot("capture-desktop-rest.png", { fullPage: true });
  });

  test("desktop breathing states", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({ timeout: 10_000 });

    // Hover each zone briefly for tonal lift
    for (const zone of ["identity", "featured", "experience", "other", "skills", "contact"]) {
      await page.locator(`[data-zone='${zone}']`).hover();
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot(`capture-hover-${zone}.png`);
    }

    // Dwell on featured for breathing
    await page.locator("[data-zone='featured']").hover();
    await page.waitForTimeout(2500);
    await expect(page).toHaveScreenshot("capture-breathing-featured.png");
  });

  test("mobile rest state", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot("capture-mobile-rest.png", { fullPage: true });
  });

  test("reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot("capture-reduced-motion.png", { fullPage: true });
  });
});
```

**Rerun command:** `pnpm test:e2e --grep "capture" --update-snapshots` regenerates all captures. `pnpm test:e2e --grep "capture"` compares against last baseline.

### Per-slice test expectations

| Slice | Unit tests (vitest) | Visual tests (Playwright) |
|-------|-------------------|--------------------------|
| 1: Hero Row | zone-map.ts pure function, ZoneLabel render | Update visual.spec.ts zones to new names, layout assertions for grid + row 1, font assertions |
| 2: Flow Row | SkillTag render, ExperienceCard render | Add zone screenshots for row 2, layout assertions for bento subdivision |
| 3: Utility Row | EducationMolecule render, ContactCard CTA | Full 8-zone screenshot baseline, all zone screenshots, complete layout assertions |
| 4: Breathing | use-dwell hook logic (timers), breathing state transitions | breathing.spec.ts: dwell expand, contract, short hover, reduced motion |
| 5: Mobile | — | Mobile viewport screenshots, no horizontal overflow, zone stacking order |

### Evolving existing tests

The existing `smoke.spec.ts` and `visual.spec.ts` reference walking skeleton zones (`data-zone="hero"`, `data-zone="flow"`, `data-zone="background"`). These evolve:
- `data-zone="hero"` → `data-zone="identity"` (row 1 zones get individual names)
- `data-zone="flow"` → removed (row 2 zones get individual names)
- `data-zone="background"` → removed (row 3 zones get individual names)
- Smoke test: update to check `data-zone="identity"` and `data-zone="featured"` instead
- Visual snapshots: regenerate all baselines after each slice (`pnpm test:e2e:update`)

---

## Verification

**After each slice:**
1. `pnpm typecheck` — zero errors
2. `pnpm test` — all vitest unit tests pass (existing + new)
3. `pnpm lint` — Biome clean
4. `pnpm test:e2e:update` — regenerate visual baselines
5. `pnpm test:e2e` — all Playwright tests pass (visual + layout + smoke)
6. `pnpm test:e2e --grep "capture"` — visual capture for manual inspection

**After Slice 4 (breathing):**
7. `pnpm test:e2e --grep "breathing"` — all interaction tests pass
8. Chrome DevTools Performance tab: no layout thrashing during breathing transitions

**After Slice 5 (mobile):**
9. `pnpm test:e2e --grep "mobile"` — mobile viewport tests pass
10. No horizontal overflow at 375px width

---

## Critical Files

| File | Action | Slice |
|------|--------|-------|
| `frontend/src/index.css` | Replace tokens, fonts, body, surface classes, grid CSS, media queries | 1, 5 |
| `frontend/src/canvas/Canvas.tsx` | Vertical stack → CSS grid with zones, breathing grid-template | 1-4 |
| `frontend/src/canvas/zone-map.ts` | **New** — pure function: items → zone assignments | 1 |
| `frontend/src/molecules/HeroMolecule.tsx` | Editorial restyle (Zilla Slab, ink, remove AnimatePresence) | 1 |
| `frontend/src/molecules/ProjectCard.tsx` | Editorial restyle + breathing-extra slot | 1, 4 |
| `frontend/src/molecules/ExperienceCard.tsx` | Editorial restyle + breathing description | 2, 4 |
| `frontend/src/molecules/SkillLink.tsx` → `SkillTag.tsx` | Rename + restyle (tag chip) | 2 |
| `frontend/src/molecules/MoleculeResolver.tsx` | Add education, update skill key | 2-3 |
| `frontend/src/molecules/ContactCard.tsx` | Editorial restyle (CTA button) | 3 |
| `frontend/src/molecules/EducationMolecule.tsx` | **New** — degree + institution | 3 |
| `frontend/src/hooks/use-dwell.ts` | **New** — dwell detection with debounce + linger | 4 |
| `frontend/e2e/visual.spec.ts` | Evolve zone names + screenshots per slice | 1-5 |
| `frontend/e2e/layout.spec.ts` | **New** — computed CSS assertions for grid, fonts, colors | 1-3 |
| `frontend/e2e/breathing.spec.ts` | **New** — dwell/expand/contract interaction tests | 4 |
| `frontend/e2e/capture-surface.spec.ts` | **New** — rerunnable visual capture at all key states | 3-5 |
| `frontend/e2e/smoke.spec.ts` | Update zone selectors to new names | 1 |

## Reuse

- `MoleculeResolver` registry pattern: unchanged, just additions
- `useUXStore` and selectors: unchanged, Canvas reads items the same way
- `data-zone` attribute convention: preserved (zone names change)
- `PresenceDot`: kept, repositioned to command zone
- `presence-pulse` keyframe: kept in index.css
- `ux-parsers` and `use-agent-stream`: unchanged — breathing is client-side UI, not protocol
- Playwright config: unchanged (webServer, browser, tolerance settings all reused)
