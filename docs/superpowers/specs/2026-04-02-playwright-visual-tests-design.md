# Playwright Visual Regression Tests

## Problem

Slice 3 (Canvas Layout) passed all structural e2e and unit tests but rendered visually broken — unstyled HTML with no typography, spacing, or card appearance. The existing tests assert DOM structure (correct zones, correct text content) but nothing about visual output. The plan's "done" criteria ("looks like the fat marker sketch") was a visual assertion with no automated enforcement.

## Appetite

Small batch. One new test file, minor config changes, baseline PNGs committed to git. No new dependencies.

## Solution

Add Playwright `toHaveScreenshot()` visual regression tests to the existing e2e suite.

### Test file

`frontend/e2e/visual.spec.ts` — lives alongside `smoke.spec.ts`, shares the same Playwright config.

### Screenshots captured

| Name | Target | What it validates |
|------|--------|-------------------|
| `full-page` | Full page | Overall layout — hero top, bento middle, faded bottom |
| `hero-zone` | `[data-zone="hero"]` | Hero molecule typography and spacing |
| `flow-zone` | `[data-zone="flow"]` | Bento grid layout, card appearance, asymmetric columns |
| `background-zone` | `[data-zone="background"]` | Low-opacity items — visibly faded, not invisible |

### Test flow

1. Navigate to `/`
2. Wait for all three zones (`[data-zone="hero"]`, `[data-zone="flow"]`, `[data-zone="background"]`) to be visible — ensures SSE manifest is fully rendered
3. Capture zone-level screenshots, then full-page screenshot with `toHaveScreenshot()`

### Playwright config changes

Add `expect.toHaveScreenshot` to `frontend/playwright.config.ts`:

```ts
expect: {
  toHaveScreenshot: {
    maxDiffPixelRatio: 0.01,
  },
},
```

`maxDiffPixelRatio: 0.01` allows 1% pixel variance for subpixel rendering differences between runs.

Baselines auto-save to `e2e/visual.spec.ts-snapshots/` (Playwright's default convention).

### Package.json script

Add one new script:

```json
"test:e2e:update": "playwright test --update-snapshots"
```

Used when a slice intentionally changes visual output and the new baselines should be accepted.

### Baseline management

- Baselines are PNGs committed to git — they are the source of truth
- `*-snapshots/` directory is NOT gitignored
- Update with `pnpm test:e2e:update` when visual changes are intentional
- Commit updated baselines alongside code changes

### Per-slice workflow

1. Write failing tests (RED) — including visual test if the slice changes appearance
2. Implement (GREEN) — make structural + visual tests pass
3. If visual output changed intentionally: `pnpm test:e2e --update-snapshots` to accept new baselines
4. Commit baselines alongside code

### When to add/update visual tests

| Slice type | Visual test action |
|---|---|
| Changes visual output (styling, layout, new molecules) | Update baselines, commit new PNGs |
| Backend-only (content catalog, caching, LLM agent) | No changes — existing baselines should still pass |
| New zone or component | Add new screenshot target to `visual.spec.ts` |

### Scope

- Desktop Chromium only (matches current Playwright config)
- No responsive/mobile viewports — add when responsive design becomes a slice
- No external services (Percy, Argos) — built-in Playwright only

## Rabbit Holes

- **Cross-platform pixel differences**: `maxDiffPixelRatio: 0.01` handles subpixel variance. If CI (future) runs on Linux while dev is macOS, a Docker container with consistent fonts solves it. Don't solve this now.
- **Flaky screenshots from SSE timing**: The wait-for-hero-visible pattern (already proven in `smoke.spec.ts`) ensures manifest is loaded before capture.
- **Baseline churn**: Only slices that change visual output update baselines. Backend-only slices should not trigger changes.

## No-Gos

- No cloud-based visual diff services
- No mobile/tablet viewports yet
- No screenshot-per-molecule (zone-level granularity is sufficient)
- No custom diff algorithms or threshold tuning beyond `maxDiffPixelRatio`
