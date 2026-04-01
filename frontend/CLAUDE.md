# Frontend — Portfolio UI

React 19, Vite 6.3, TypeScript 5.8 strict. Tailwind 4 (Vite plugin). Biome 2.0 for lint/format.
Will use: Zustand, shadcn/ui, motion.

## Commands
- `pnpm test` — vitest + happy-dom + @testing-library/react
- `pnpm test:e2e` — Playwright e2e tests
- `pnpm typecheck` — TypeScript strict check (no `any`)
- `pnpm lint` — Biome lint
- pnpm may need PATH: `export PATH="$HOME/.local/share/pnpm:$HOME/.npm-global/bin:/usr/local/bin:$PATH"`

## Architecture
- Feature folders: `src/<feature>/` (e.g., `src/canvas/`). Shared code in `src/hooks/`, `src/store/`.
- Tests in `src/__tests__/`. One test file per module.
- Content as data: portfolio content comes from API/YAML — never hardcoded in TypeScript.

## Naming
- `camelCase` functions, variables, hooks. `PascalCase` components, types, interfaces.
- No `I` prefix on interfaces (`ManifestState`, not `IManifestState`).
- Hook files: `use-<name>.ts`. Store files: `<name>-store.ts`. Components: `<Name>.tsx`.

## TypeScript
- Strict mode: `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`.
- No `any` — use `unknown` and narrow with type guards. `Record<string, unknown>` for untyped data.
- `import type { X }` for type-only imports.
- Named exports only. One exception: `export default` for the root `App` component.
- Type guards as standalone functions for discriminated unions (e.g., `isStateSnapshot`).

## React Patterns
- `function` declarations for exported components and hooks. Arrow functions for inline callbacks.
- Props as inline type: `function Hero({ name, title }: { name: string; title: string })`.
- Hooks always at top of component. Derived state computed inline, not in `useEffect`.
- `data-zone` attributes on layout regions (e.g., `<section data-zone="hero">`).
- Semantic HTML first: `<main>`, `<section>`, `<nav>`. ARIA attributes for dynamic states.

## Zustand
- Selectors as standalone exported functions: `export function getHero(state: ManifestState)`.
- Never use store `get()` in selectors — it breaks reactivity. Selectors receive state as argument.
- Store actions via `set()` in the store definition. Keep stores minimal.
- Reset store state in `afterEach` during tests: `useManifestStore.setState({ items: [] })`.

## Testing
- vitest with happy-dom. Globals disabled — explicit imports: `import { describe, it, expect } from "vitest"`.
- `@testing-library/react` for component tests. Prefer `getByRole`, `getByText` over test IDs.
- `describe/it` blocks, not bare `test()`. `afterEach` with `cleanup()` + store reset.
- Setup file: `src/__tests__/setup.ts` — jest-dom matchers + EventSource polyfill (happy-dom lacks it).
- See ADR-0006 for testing framework rationale.

## Style
- Biome enforced: 2-space indent, recommended rules, auto import organization.
- Biome handles formatting — no Prettier needed. Single binary for lint + format.
- WCAG 2.1 AA: semantic HTML, focus management, `prefers-reduced-motion` → opacity transitions.

## SSE / AG-UI
- `EventSource` for server-sent events. Type-narrow with discriminated union guards.
- happy-dom lacks `EventSource` — stubbed in test setup. Do not import real EventSource in tests.
