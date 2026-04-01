# Frontend — Portfolio UI

React 19, Vite 6.3, TypeScript 5.8 strict. Tailwind 4 (Vite plugin). Biome 2.0 for lint/format.
Will use: Zustand, shadcn/ui, motion.

## Commands
- `pnpm test` — vitest + happy-dom + @testing-library/react
- `pnpm test:e2e` — Playwright e2e tests
- `pnpm typecheck` — TypeScript strict check (no `any`)
- `pnpm lint` — Biome lint
- pnpm may need PATH: `export PATH="$HOME/.local/share/pnpm:$HOME/.npm-global/bin:/usr/local/bin:$PATH"`

## Conventions
- TypeScript strict, no `any`. Named exports only.
- Tests: vitest with happy-dom env, globals disabled (explicit imports).
- Setup file: `src/__tests__/setup.ts` (jest-dom matchers).
