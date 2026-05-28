# Grosir — Sistem Manajemen Grosir

Aplikasi web internal untuk operasional grosir sembako, rokok, dan cemilan. Menggantikan pencatatan manual dengan sistem terintegrasi: master data, transaksi pembelian-penjualan, manajemen stok multi-gudang, retur, hutang/piutang, dan laporan.

## Stack

- Next.js 15 (App Router) + TypeScript strict
- PostgreSQL 16 + Prisma 6
- NextAuth v5 (Auth.js, Credentials provider)
- Tailwind CSS v4 + shadcn/ui (base-nova)
- react-hook-form + zod
- pino (logging) + Vitest (test)

## Prasyarat

- Node 20 LTS (lihat `.nvmrc`)
- pnpm 10+
- Docker (untuk Postgres dev container)

## Setup Lokal

```bash
# 1. Install deps
pnpm install

# 2. Start Postgres dev container (port 5433)
docker compose -f docker-compose.dev.yml up -d

# 3. Copy env
cp .env.example .env

# 4. Apply migrations + seed
pnpm prisma migrate dev
pnpm db:seed

# 5. Run dev server
pnpm dev
```

Buka http://localhost:3000 dan login pakai:

- Username: `owner`
- Password: `changeme123`

**Wajib ganti password segera dari menu Profil sebelum production.**

## Scripts

| Command | Tujuan |
|---|---|
| `pnpm dev` | Run dev server (http://localhost:3000) |
| `pnpm build` | Build production |
| `pnpm start` | Run production server |
| `pnpm typecheck` | TypeScript validation |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier write |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm test:cov` | Vitest with coverage |
| `pnpm db:seed` | Seed permissions, roles, owner, default warehouse |
| `pnpm db:reset` | Reset DB (drop + migrate + seed) |
| `pnpm prisma studio` | Browse DB at http://localhost:5555 |

## Catatan Dev

- **Postgres port 5433** (bukan default 5432) untuk menghindari konflik dengan instalasi Postgres host kalau ada.
- **Tailwind v4** tanpa file config — semua theme tokens di `src/app/globals.css` dengan `@theme inline {}` block.
- **Edge-safe middleware:** `src/lib/auth.config.ts` adalah versi minimal (no bcrypt) dipakai middleware. `src/lib/auth.ts` punya Credentials provider lengkap (Node-runtime).
- **Soft delete pakai `deletedAt`.** Query default exclude soft-deleted via `where: { deletedAt: null }`.
- **Audit log otomatis** untuk semua mutation master data via Server Action wrapper.
- **HET validation** untuk produk rokok: sale price per base unit harus ≤ HET, kecuali user OWNER atau punya permission `sale.het_override`.
- **Document numbering** via tabel `Counter` (atomic insert/upsert) untuk format `{PREFIX}-{YYYYMM}-{seq:0000}` (M2+).

## Dokumen

- `docs/PRD.md` — Product Requirements Document (vision, scope, milestone)
- `docs/SRS.md` — Software Requirements Specification (FR + NFR)
- `docs/SDD.md` — Software Design Document (arsitektur, data model, posting algorithm)
- `docs/UI-UX-FLOW.md` — Page map, layout, flow utama
- `docs/plans/M1-foundation-master-data.md` — Implementation plan (35 tasks)
- `docs/DEPLOYMENT.md` — Production deployment guide
- `docs/HANDOFF.md` — State per milestone close

## Milestone

- **M1** Foundation + Master Data + Stock read-only ✓ (current)
- **M2** Transaksi: Pembelian (PO + Invoice), Penjualan (POS), Stock Movement, Mutasi, Opname (next)
- **M3** Retur, Hutang/Piutang, Laporan, Dashboard chart

## Login Roles (after seed)

| Role | Permissions |
|---|---|
| OWNER | All (52 permissions) |
| ADMIN | Operasional kecuali user/role management |
| KASIR | Penjualan + lihat stok + manage customer |
| GUDANG | Inventaris + terima pembelian + mutasi |
| VIEWER | Read-only laporan |
