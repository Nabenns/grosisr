# Grosir

Sistem Manajemen Grosir — internal admin tool.

## Stack

- Next.js 15 (App Router) + TypeScript strict
- Tailwind CSS
- Postgres + Prisma (M2)
- NextAuth (M2)
- shadcn/ui (M2)

## Requirements

- Node 20+ (see `.nvmrc`)
- pnpm 10+

## Setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Scripts

- `pnpm dev` — dev server
- `pnpm build` — production build
- `pnpm start` — start production
- `pnpm lint` — ESLint
- `pnpm typecheck` — TypeScript check
- `pnpm format` — Prettier

## Docs

See `docs/` for PRD, SRS, SDD, UI/UX flows, and milestone plans.
