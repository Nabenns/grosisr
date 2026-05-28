# M1 Foundation & Master Data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setup project foundation (Next.js + Postgres + auth + RBAC + audit log) dan implementasi CRUD semua master data (Category, Brand, Unit, Product, Supplier, Customer, Warehouse, User, Role) plus halaman saldo stok read-only.

**Architecture:** Monolith Next.js 15 App Router dengan Server Actions sebagai mutation layer. Domain logic di `src/modules/<domain>/service.ts` (pure, testable). Prisma sebagai ORM ke Postgres. NextAuth untuk session. Permission check di 3 layer: middleware route, server action guard, query filter.

**Tech Stack:** Next.js 15, TypeScript 5 strict, PostgreSQL 16, Prisma 5, NextAuth v5 (Auth.js), Tailwind CSS, shadcn/ui, react-hook-form + zod, Vitest, Playwright, pnpm.

**Reference Specs:**
- `docs/PRD.md` — vision, milestone, scope
- `docs/SRS.md` — FR/NFR detail
- `docs/SDD.md` — arsitektur, data model, algoritma posting
- `docs/UI-UX-FLOW.md` — page map, layout

---

## File Structure

```
grosir/
├── .env                          # DATABASE_URL, NEXTAUTH_SECRET, dll
├── .env.example                  # Template env
├── .gitignore
├── .nvmrc                        # Node 20 LTS
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json                 # strict mode
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── prettier.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── components.json               # shadcn config
├── prisma/
│   ├── schema.prisma             # All models
│   ├── seed.ts                   # Seed roles, permissions, default warehouse, owner user
│   └── migrations/               # Prisma migrate output
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout (font, providers)
│   │   ├── globals.css
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       ├── page.tsx
│   │   │       └── login-form.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx        # Sidebar + topbar (auth required)
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── master/
│   │   │   │   ├── products/
│   │   │   │   ├── categories/
│   │   │   │   ├── brands/
│   │   │   │   ├── units/
│   │   │   │   ├── suppliers/
│   │   │   │   ├── customers/
│   │   │   │   └── warehouses/
│   │   │   ├── inventory/
│   │   │   │   └── stock/        # Saldo stok read-only (M1)
│   │   │   └── settings/
│   │   │       ├── users/
│   │   │       ├── roles/
│   │   │       ├── store/
│   │   │       ├── audit-log/
│   │   │       └── profile/
│   │   └── api/
│   │       └── auth/[...nextauth]/route.ts
│   ├── lib/
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── auth.ts               # NextAuth config + helpers
│   │   ├── permissions.ts        # Permission keys + role seed
│   │   ├── audit.ts              # Audit log helper
│   │   ├── number.ts             # Document numbering (skeleton, full M2)
│   │   ├── money.ts              # IDR formatting + decimal math
│   │   ├── date.ts               # Asia/Jakarta tz utilities
│   │   ├── errors.ts             # AppError class + error codes
│   │   ├── result.ts             # Result<T> type + action wrapper
│   │   ├── logger.ts             # pino instance
│   │   └── id.ts                 # CUID/code generator helpers
│   ├── modules/
│   │   ├── auth/                 # Session helpers, role check
│   │   │   ├── service.ts
│   │   │   └── actions.ts
│   │   ├── users/
│   │   │   ├── schema.ts
│   │   │   ├── service.ts
│   │   │   ├── actions.ts
│   │   │   ├── queries.ts
│   │   │   └── components/
│   │   ├── master-category/
│   │   ├── master-brand/
│   │   ├── master-unit/
│   │   ├── master-product/
│   │   ├── master-supplier/
│   │   ├── master-customer/
│   │   ├── master-warehouse/
│   │   ├── inventory-stock/      # Read-only di M1
│   │   ├── settings-role/
│   │   └── settings-audit/
│   ├── components/
│   │   ├── ui/                   # shadcn components
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── topbar.tsx
│   │   │   ├── warehouse-switcher.tsx
│   │   │   └── user-menu.tsx
│   │   ├── data-table/
│   │   │   ├── data-table.tsx
│   │   │   ├── pagination.tsx
│   │   │   └── column-toggle.tsx
│   │   ├── form-field.tsx
│   │   ├── confirm-dialog.tsx
│   │   ├── empty-state.tsx
│   │   └── currency-input.tsx
│   ├── middleware.ts             # Route auth + role guard
│   └── types/
│       └── index.ts              # Cross-module shared types
├── tests/
│   ├── unit/
│   │   ├── lib/
│   │   └── modules/
│   ├── integration/
│   │   ├── setup.ts              # Test DB + reset
│   │   └── modules/
│   └── e2e/
│       ├── login.spec.ts
│       └── master-product.spec.ts
├── public/
│   └── uploads/                  # Product images (gitignored content)
├── docs/                         # Already exists from brainstorm phase
└── docker-compose.dev.yml        # Postgres dev container
```

---

## Task Numbering

- **Phase A — Foundation (Task 1-12):** scaffold project, db, auth, RBAC, layout, audit log
- **Phase B — Master Data (Task 13-30):** CRUD modules in dependency order
- **Phase C — Stock Read-only & Polish (Task 31-35):** stock balance page, dashboard, E2E, deployment doc

---

## Phase A — Foundation

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `.gitignore`, `.nvmrc`, `.env.example`, `README.md`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `tailwind.config.ts`, `postcss.config.mjs`
- Create: `eslint.config.mjs`, `prettier.config.mjs`

- [ ] **Step 1: Init pnpm + Next.js**

```bash
cd C:\Users\USER\gt\grosir
echo "20" > .nvmrc
pnpm init
pnpm add next@^15 react@^19 react-dom@^19
pnpm add -D typescript@^5 @types/node @types/react @types/react-dom
pnpm add -D eslint eslint-config-next prettier
pnpm add -D tailwindcss postcss autoprefixer
pnpm dlx tailwindcss init -p
```

- [ ] **Step 2: Configure tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Configure next.config.mjs**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
  images: { remotePatterns: [] }
}
export default nextConfig
```

- [ ] **Step 4: Configure tailwind.config.ts**

```ts
import type { Config } from "tailwindcss"
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: { extend: {} },
  plugins: []
}
export default config
```

- [ ] **Step 5: Create globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Minimal layout & home page**

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = { title: "Grosir", description: "Sistem Manajemen Grosir" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
```

`src/app/page.tsx`:
```tsx
export default function Home() {
  return <main className="p-8"><h1 className="text-2xl font-bold">Grosir</h1></main>
}
```

- [ ] **Step 7: Add scripts to package.json**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx}\""
  }
}
```

- [ ] **Step 8: Run typecheck + dev**

Run: `pnpm typecheck`
Expected: PASS (no errors)

Run: `pnpm dev` → buka http://localhost:3000
Expected: tampil "Grosir"

Stop dev server (Ctrl+C).

- [ ] **Step 9: Init git + commit**

```bash
git init
git add .
git commit -m "chore: scaffold next.js project with typescript + tailwind"
```

### Task 2: Setup Postgres Dev Container + Prisma

**Files:**
- Create: `docker-compose.dev.yml`
- Create: `prisma/schema.prisma` (initial)
- Modify: `.env.example`, `.gitignore`

- [ ] **Step 1: Create docker-compose for dev DB**

`docker-compose.dev.yml`:
```yaml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: grosir
      POSTGRES_PASSWORD: grosir_dev
      POSTGRES_DB: grosir_dev
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```

- [ ] **Step 2: Start DB**

Run: `docker compose -f docker-compose.dev.yml up -d`
Expected: container running. Verify: `docker ps` menampilkan postgres.

- [ ] **Step 3: Install Prisma**

```bash
pnpm add -D prisma
pnpm add @prisma/client
pnpm dlx prisma init --datasource-provider postgresql
```

- [ ] **Step 4: Configure .env + .env.example**

`.env`:
```
DATABASE_URL="postgresql://grosir:grosir_dev@localhost:5432/grosir_dev?schema=public"
NEXTAUTH_SECRET="dev-secret-change-in-production-32chars"
NEXTAUTH_URL="http://localhost:3000"
APP_TIMEZONE="Asia/Jakarta"
LOG_LEVEL="info"
```

`.env.example`: same keys, placeholder values.

`.gitignore` add: `.env`, `/uploads/*`, `!/uploads/.gitkeep`, `/prisma/migrations/migration_lock.toml.bak`.

- [ ] **Step 5: Initial Prisma schema with extensions**

`prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pg_trgm]
}
```

- [ ] **Step 6: Initial migration**

Run: `pnpm prisma migrate dev --name init_extensions`
Expected: migration applied. `pg_trgm` extension active.

- [ ] **Step 7: Create db client singleton**

`src/lib/db.ts`:
```ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: setup postgres dev container + prisma client"
```

### Task 3: Prisma Schema — Identity & Master Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add identity & access models**

Append ke `prisma/schema.prisma`:
```prisma
model User {
  id                  String          @id @default(cuid())
  username            String          @unique
  email               String?         @unique
  passwordHash        String
  name                String
  isActive            Boolean         @default(true)
  defaultWarehouseId  String?
  defaultWarehouse    Warehouse?      @relation("UserDefaultWarehouse", fields: [defaultWarehouseId], references: [id])
  roles               UserRole[]
  warehouseAccess     UserWarehouse[]
  auditLogs           AuditLog[]
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  deletedAt           DateTime?

  @@index([deletedAt])
}

model Role {
  id          String           @id @default(cuid())
  name        String           @unique
  description String?
  isSystem    Boolean          @default(false)
  permissions RolePermission[]
  users       UserRole[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}

model Permission {
  id          String           @id @default(cuid())
  key         String           @unique
  description String
  module      String
  roles       RolePermission[]
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@id([roleId, permissionId])
}

model UserRole {
  userId String
  roleId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  @@id([userId, roleId])
}

model UserWarehouse {
  userId      String
  warehouseId String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  @@id([userId, warehouseId])
}
```

- [ ] **Step 2: Add master data models**

```prisma
model Category {
  id        String     @id @default(cuid())
  name      String
  parentId  String?
  parent    Category?  @relation("Subcategory", fields: [parentId], references: [id])
  children  Category[] @relation("Subcategory")
  products  Product[]
  isActive  Boolean    @default(true)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  deletedAt DateTime?

  @@unique([name, parentId])
  @@index([parentId])
  @@index([deletedAt])
}

model Brand {
  id        String    @id @default(cuid())
  name      String    @unique
  isActive  Boolean   @default(true)
  products  Product[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
}

model Unit {
  id           String        @id @default(cuid())
  name         String        @unique
  isActive     Boolean       @default(true)
  productUnits ProductUnit[]
  productsBase Product[]     @relation("ProductBaseUnit")
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  deletedAt    DateTime?
}

model Product {
  id          String        @id @default(cuid())
  sku         String        @unique
  name        String
  categoryId  String
  brandId     String?
  baseUnitId  String
  description String?
  imageUrl    String?
  hasCukai    Boolean       @default(false)
  hasHet      Boolean       @default(false)
  hetPrice    Decimal?      @db.Decimal(15, 2)
  minStock    Int           @default(0)
  isActive    Boolean       @default(true)
  version     Int           @default(0)

  category    Category      @relation(fields: [categoryId], references: [id])
  brand       Brand?        @relation(fields: [brandId], references: [id])
  baseUnit    Unit          @relation("ProductBaseUnit", fields: [baseUnitId], references: [id])
  units       ProductUnit[]
  stocks      StockBalance[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([name])
  @@index([categoryId])
  @@index([brandId])
  @@index([deletedAt])
}

model ProductUnit {
  id                String   @id @default(cuid())
  productId         String
  unitId            String
  conversionToBase  Decimal  @db.Decimal(15, 4)
  barcode           String?  @unique
  purchasePrice     Decimal  @db.Decimal(15, 2)
  salePrice         Decimal  @db.Decimal(15, 2)
  isDefaultPurchase Boolean  @default(false)
  isDefaultSale     Boolean  @default(false)

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  unit    Unit    @relation(fields: [unitId], references: [id])

  @@unique([productId, unitId])
  @@index([barcode])
}

enum CustomerType {
  RESELLER
  RETAIL
}

model Supplier {
  id                  String    @id @default(cuid())
  code                String    @unique
  name                String
  phone               String?
  address             String?
  npwp                String?
  termOfPaymentDays   Int       @default(0)
  isActive            Boolean   @default(true)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  deletedAt           DateTime?

  @@index([deletedAt])
}

model Customer {
  id                  String       @id @default(cuid())
  code                String       @unique
  name                String
  phone               String?
  address             String?
  customerType        CustomerType @default(RETAIL)
  creditLimit         Decimal      @default(0) @db.Decimal(15, 2)
  termOfPaymentDays   Int          @default(0)
  isActive            Boolean      @default(true)
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt
  deletedAt           DateTime?

  @@index([deletedAt])
}

model Warehouse {
  id         String          @id @default(cuid())
  code       String          @unique
  name       String
  address    String?
  isActive   Boolean         @default(true)
  isDefault  Boolean         @default(false)
  users      User[]          @relation("UserDefaultWarehouse")
  userAccess UserWarehouse[]
  stocks     StockBalance[]
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt
  deletedAt  DateTime?

  @@index([deletedAt])
}

model StockBalance {
  productId   String
  warehouseId String
  qtyInBase   Decimal   @default(0) @db.Decimal(15, 4)
  minStock    Int?
  updatedAt   DateTime  @updatedAt

  product   Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  warehouse Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)

  @@id([productId, warehouseId])
  @@index([warehouseId])
}
```

- [ ] **Step 3: Add audit & ops models**

```prisma
enum AuditAction {
  CREATE
  UPDATE
  DELETE
  POST
  VOID
}

model AuditLog {
  id          String      @id @default(cuid())
  actorUserId String
  entity      String
  entityId    String
  action      AuditAction
  diffJson    Json?
  occurredAt  DateTime    @default(now())

  actor User @relation(fields: [actorUserId], references: [id])

  @@index([entity, entityId])
  @@index([actorUserId, occurredAt])
}

model Counter {
  key   String @id
  value Int    @default(0)
}

model IdempotencyKey {
  key          String   @id
  responseHash String
  payload      Json
  createdAt    DateTime @default(now())

  @@index([createdAt])
}

model Setting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 4: Add trigram index via migration SQL**

Run: `pnpm prisma migrate dev --name add_models --create-only`

Edit migration file (last block), tambahkan:
```sql
CREATE INDEX product_name_trgm ON "Product" USING GIN (name gin_trgm_ops);
```

Then run: `pnpm prisma migrate dev`
Expected: migration applied, prisma client generated.

- [ ] **Step 5: Verify schema compiles**

Run: `pnpm prisma validate`
Expected: "Prisma schema is valid."

Run: `pnpm prisma generate`
Expected: client generated.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add prisma schema for identity, master data, audit, and ops models"
```

### Task 4: Permission Constants & Lib Helpers

**Files:**
- Create: `src/lib/permissions.ts`
- Create: `src/lib/errors.ts`
- Create: `src/lib/result.ts`
- Create: `src/lib/logger.ts`
- Create: `src/lib/money.ts`
- Create: `src/lib/date.ts`
- Create: `src/lib/id.ts`
- Test: `tests/unit/lib/money.test.ts`, `tests/unit/lib/date.test.ts`, `tests/unit/lib/id.test.ts`

- [ ] **Step 1: Install Vitest + decimal lib**

```bash
pnpm add decimal.js dayjs pino
pnpm add -D vitest @vitest/ui vitest-mock-extended
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config"
import path from "node:path"
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: [],
    coverage: { provider: "v8", reporter: ["text", "html"] }
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } }
})
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:cov": "vitest run --coverage"
```

- [ ] **Step 2: Permission constants**

`src/lib/permissions.ts`:
```ts
export const PERMISSION_MODULES = {
  category: ["read", "write"],
  brand: ["read", "write"],
  unit: ["read", "write"],
  product: ["read", "write", "delete", "import"],
  supplier: ["read", "write"],
  customer: ["read", "write"],
  warehouse: ["read", "write"],
  inventory: ["read", "adjustment.create", "adjustment.post", "transfer.create", "transfer.send", "transfer.receive", "opname.run"],
  purchase: [
    "po.read", "po.write",
    "invoice.read", "invoice.write", "invoice.post", "invoice.void",
    "return.write"
  ],
  sale: [
    "read", "write", "post",
    "discount.apply", "discount.high",
    "void", "return.write",
    "credit.override_limit", "het_override"
  ],
  finance: ["payable.read", "payable.pay", "receivable.read", "receivable.collect"],
  report: ["stock", "sale", "purchase", "finance"],
  user: ["read", "write"],
  role: ["write"],
  setting: ["write"],
  audit: ["read"]
} as const

export type PermissionKey = string

export function allPermissions(): { key: string; module: string; description: string }[] {
  const result: { key: string; module: string; description: string }[] = []
  for (const [module, actions] of Object.entries(PERMISSION_MODULES)) {
    for (const action of actions) {
      const key = `${module}.${action}`
      result.push({ key, module, description: `Permission ${key}` })
    }
  }
  return result
}

export const ROLE_PERMISSIONS: Record<string, string[] | "*"> = {
  OWNER: "*",
  ADMIN: [
    "category.*", "brand.*", "unit.*", "product.*",
    "supplier.*", "customer.*", "warehouse.read",
    "inventory.*", "purchase.*", "sale.*", "finance.*",
    "report.*", "audit.read"
  ],
  KASIR: [
    "product.read", "customer.read", "customer.write",
    "sale.read", "sale.write", "sale.post", "sale.discount.apply",
    "inventory.read"
  ],
  GUDANG: [
    "product.read", "supplier.read", "warehouse.read",
    "inventory.*",
    "purchase.invoice.read", "purchase.invoice.write", "purchase.invoice.post",
    "purchase.return.write"
  ],
  VIEWER: ["*.read"]
}

export function expandRolePatterns(patterns: string[] | "*", allKeys: string[]): string[] {
  if (patterns === "*") return allKeys
  const result = new Set<string>()
  for (const p of patterns) {
    if (p === "*") {
      allKeys.forEach(k => result.add(k))
    } else if (p.endsWith(".*")) {
      const prefix = p.slice(0, -2)
      allKeys.filter(k => k === prefix || k.startsWith(`${prefix}.`)).forEach(k => result.add(k))
    } else if (p.startsWith("*.")) {
      const suffix = p.slice(2)
      allKeys.filter(k => k.endsWith(`.${suffix}`)).forEach(k => result.add(k))
    } else {
      result.add(p)
    }
  }
  return [...result]
}
```

- [ ] **Step 3: Error + Result**

`src/lib/errors.ts`:
```ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message)
    this.name = "AppError"
  }
}

export const ErrorCode = {
  STOCK_INSUFFICIENT: "STOCK_INSUFFICIENT",
  CREDIT_LIMIT_EXCEEDED: "CREDIT_LIMIT_EXCEEDED",
  HET_VIOLATION: "HET_VIOLATION",
  INVALID_INPUT: "INVALID_INPUT",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT_VERSION: "CONFLICT_VERSION",
  IDEMPOTENCY_REPLAY: "IDEMPOTENCY_REPLAY",
  INTERNAL: "INTERNAL"
} as const
```

`src/lib/result.ts`:
```ts
import { AppError } from "./errors"
import { logger } from "./logger"

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; fields?: Record<string, string> } }

export async function action<T>(handler: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await handler()
    return { success: true, data }
  } catch (e) {
    if (e instanceof AppError) {
      return { success: false, error: { code: e.code, message: e.message, fields: e.fields } }
    }
    logger.error({ err: e }, "Unhandled action error")
    return { success: false, error: { code: "INTERNAL", message: "Terjadi kesalahan internal" } }
  }
}
```

`src/lib/logger.ts`:
```ts
import pino from "pino"

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: undefined
})
```

- [ ] **Step 4: Money + Date + Id helpers (with tests)**

`src/lib/money.ts`:
```ts
import Decimal from "decimal.js"

export function toDecimal(v: number | string | Decimal): Decimal {
  return new Decimal(v)
}

export function formatIDR(v: number | string | Decimal): string {
  const d = toDecimal(v)
  const fixed = d.toFixed(0)
  const negative = fixed.startsWith("-")
  const abs = negative ? fixed.slice(1) : fixed
  const withDots = abs.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `Rp ${negative ? "-" : ""}${withDots}`
}
```

`tests/unit/lib/money.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { formatIDR, toDecimal } from "@/lib/money"

describe("formatIDR", () => {
  it("formats integer", () => {
    expect(formatIDR(1234567)).toBe("Rp 1.234.567")
  })
  it("formats zero", () => {
    expect(formatIDR(0)).toBe("Rp 0")
  })
  it("formats negative", () => {
    expect(formatIDR(-1500)).toBe("Rp -1.500")
  })
  it("accepts string and decimal", () => {
    expect(formatIDR("100000")).toBe("Rp 100.000")
    expect(formatIDR(toDecimal("99.5"))).toBe("Rp 100")
  })
})
```

`src/lib/date.ts`:
```ts
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import "dayjs/locale/id"

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale("id")

const TZ = process.env.APP_TIMEZONE ?? "Asia/Jakarta"

export function nowJakarta(): Date {
  return dayjs().tz(TZ).toDate()
}

export function formatDate(d: Date | string): string {
  return dayjs(d).tz(TZ).format("DD MMM YYYY")
}

export function formatDateTime(d: Date | string): string {
  return dayjs(d).tz(TZ).format("DD MMM YYYY HH:mm")
}

export function formatYearMonth(d: Date | string): string {
  return dayjs(d).tz(TZ).format("YYYYMM")
}
```

`tests/unit/lib/date.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { formatDate, formatYearMonth } from "@/lib/date"

describe("date format", () => {
  it("formats date in Indonesian", () => {
    expect(formatDate("2026-05-28T00:00:00Z")).toMatch(/28 Mei 2026|29 Mei 2026/) // tz-dependent
  })
  it("formats year month", () => {
    expect(formatYearMonth("2026-05-28T05:00:00Z")).toBe("202605")
  })
})
```

`src/lib/id.ts`:
```ts
export function generateCode(prefix: string, sequence: number, ym: string): string {
  return `${prefix}-${ym}-${String(sequence).padStart(4, "0")}`
}

export function generateMasterCode(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(5, "0")}`
}
```

`tests/unit/lib/id.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { generateCode, generateMasterCode } from "@/lib/id"

describe("code generators", () => {
  it("formats document code", () => {
    expect(generateCode("INV", 1, "202605")).toBe("INV-202605-0001")
    expect(generateCode("INV", 9999, "202605")).toBe("INV-202605-9999")
  })
  it("formats master code", () => {
    expect(generateMasterCode("SUP", 1)).toBe("SUP-00001")
  })
})
```

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add lib helpers (permissions, errors, result, money, date, id) with tests"
```

### Task 5: Seed Data — Permissions, Roles, Default Warehouse, Owner

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json`

- [ ] **Step 1: Add tsx + bcrypt**

```bash
pnpm add bcryptjs
pnpm add -D tsx @types/bcryptjs
```

Add to `package.json`:
```json
{
  "prisma": { "seed": "tsx prisma/seed.ts" },
  "scripts": {
    "db:seed": "prisma db seed",
    "db:reset": "prisma migrate reset --force"
  }
}
```

- [ ] **Step 2: Write seed script**

`prisma/seed.ts`:
```ts
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { allPermissions, ROLE_PERMISSIONS, expandRolePatterns } from "../src/lib/permissions"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding permissions...")
  const perms = allPermissions()
  for (const p of perms) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: { key: p.key, module: p.module, description: p.description },
      update: { module: p.module, description: p.description }
    })
  }
  const allKeys = perms.map(p => p.key)

  console.log("Seeding roles...")
  for (const [roleName, patterns] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: { name: roleName, isSystem: true, description: `${roleName} role` },
      update: { isSystem: true }
    })
    const expanded = expandRolePatterns(patterns, allKeys)
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    const permissionRecords = await prisma.permission.findMany({ where: { key: { in: expanded } } })
    await prisma.rolePermission.createMany({
      data: permissionRecords.map(p => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true
    })
  }

  console.log("Seeding default warehouse...")
  const warehouse = await prisma.warehouse.upsert({
    where: { code: "WH-MAIN" },
    create: { code: "WH-MAIN", name: "Gudang Utama", isDefault: true, isActive: true },
    update: {}
  })

  console.log("Seeding owner user...")
  const passwordHash = await bcrypt.hash("changeme123", 12)
  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { name: "OWNER" } })
  const owner = await prisma.user.upsert({
    where: { username: "owner" },
    create: {
      username: "owner",
      email: "owner@grosir.local",
      name: "Owner",
      passwordHash,
      isActive: true,
      defaultWarehouseId: warehouse.id
    },
    update: {}
  })
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: owner.id, roleId: ownerRole.id } },
    create: { userId: owner.id, roleId: ownerRole.id },
    update: {}
  })
  await prisma.userWarehouse.upsert({
    where: { userId_warehouseId: { userId: owner.id, warehouseId: warehouse.id } },
    create: { userId: owner.id, warehouseId: warehouse.id },
    update: {}
  })

  console.log("Seeding default settings...")
  const defaults = [
    { key: "allow_negative_stock", value: "false" },
    { key: "store_name", value: "Grosir Toko" },
    { key: "store_address", value: "" },
    { key: "store_phone", value: "" }
  ]
  for (const s of defaults) {
    await prisma.setting.upsert({ where: { key: s.key }, create: s, update: {} })
  }

  console.log("Seed complete. Owner login: owner / changeme123")
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
```

- [ ] **Step 3: Run seed**

Run: `pnpm db:seed`
Expected: console output "Seed complete." and DB now has permissions, roles, warehouse, owner user.

- [ ] **Step 4: Verify in DB**

Run: `pnpm prisma studio` (open in browser)
Expected: Permission ~50 records, Role 5 records, User 1 (owner), Warehouse 1.
Close Studio.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: seed permissions, roles, default warehouse, owner user"
```

### Task 6: NextAuth Setup + Login Action

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/middleware.ts`
- Create: `src/modules/auth/service.ts`
- Test: `tests/unit/modules/auth/service.test.ts`

- [ ] **Step 1: Install NextAuth**

```bash
pnpm add next-auth@5.0.0-beta.20
```

- [ ] **Step 2: Auth config**

`src/lib/auth.ts`:
```ts
import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./db"
import { expandRolePatterns, allPermissions } from "./permissions"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      name: string
      defaultWarehouseId: string | null
      roleNames: string[]
      permissionKeys: string[]
      warehouseIds: string[]
    }
  }
}

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      authorize: async (credentials) => {
        const username = credentials?.username as string
        const password = credentials?.password as string
        if (!username || !password) return null
        const user = await prisma.user.findFirst({
          where: { username, isActive: true, deletedAt: null },
          include: {
            roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
            warehouseAccess: true
          }
        })
        if (!user) return null
        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null
        const roleNames = user.roles.map(r => r.role.name)
        const allKeys = allPermissions().map(p => p.key)
        const permsSet = new Set<string>()
        for (const ur of user.roles) {
          if (ur.role.name === "OWNER") {
            allKeys.forEach(k => permsSet.add(k))
            continue
          }
          ur.role.permissions.forEach(rp => permsSet.add(rp.permission.key))
        }
        return {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email ?? undefined,
          defaultWarehouseId: user.defaultWarehouseId,
          roleNames,
          permissionKeys: [...permsSet],
          warehouseIds: user.warehouseAccess.map(w => w.warehouseId)
        } as any
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any
        token.id = u.id
        token.username = u.username
        token.defaultWarehouseId = u.defaultWarehouseId
        token.roleNames = u.roleNames
        token.permissionKeys = u.permissionKeys
        token.warehouseIds = u.warehouseIds
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.username = token.username as string
      session.user.defaultWarehouseId = (token.defaultWarehouseId as string | null) ?? null
      session.user.roleNames = (token.roleNames as string[]) ?? []
      session.user.permissionKeys = (token.permissionKeys as string[]) ?? []
      session.user.warehouseIds = (token.warehouseIds as string[]) ?? []
      return session
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
```

- [ ] **Step 3: Auth route handler**

`src/app/api/auth/[...nextauth]/route.ts`:
```ts
export { GET, POST } from "@/lib/auth"
```

Wait — fix: NextAuth v5 exports `handlers`. Update file to:
```ts
import { handlers } from "@/lib/auth"
export const { GET, POST } = handlers
```

- [ ] **Step 4: Middleware for route protection**

`src/middleware.ts`:
```ts
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLogged = !!req.auth
  const isLoginPage = req.nextUrl.pathname.startsWith("/login")
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth")

  if (isApiAuth) return NextResponse.next()
  if (!isLogged && !isLoginPage) {
    const url = new URL("/login", req.url)
    url.searchParams.set("from", req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  if (isLogged && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"]
}
```

- [ ] **Step 5: Auth service helpers**

`src/modules/auth/service.ts`:
```ts
import { auth } from "@/lib/auth"
import { AppError } from "@/lib/errors"

export async function requireSession() {
  const session = await auth()
  if (!session?.user) throw new AppError("FORBIDDEN", "Belum login")
  return session
}

export async function requirePermission(key: string | string[]) {
  const session = await requireSession()
  const required = Array.isArray(key) ? key : [key]
  const has = required.every(k => session.user.permissionKeys.includes(k))
  if (!has) throw new AppError("FORBIDDEN", "Tidak punya izin untuk aksi ini")
  return session
}

export function hasPermission(permissionKeys: string[], key: string): boolean {
  return permissionKeys.includes(key)
}
```

`tests/unit/modules/auth/service.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { hasPermission } from "@/modules/auth/service"

describe("hasPermission", () => {
  it("returns true when permission exists", () => {
    expect(hasPermission(["product.read", "product.write"], "product.read")).toBe(true)
  })
  it("returns false when permission missing", () => {
    expect(hasPermission(["product.read"], "product.delete")).toBe(false)
  })
})
```

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm test` → PASS
Run: `pnpm typecheck` → PASS

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: setup NextAuth credentials provider with role+permission session"
```

### Task 7: shadcn/ui Setup + Base UI Components

**Files:**
- Modify: `package.json`, `tailwind.config.ts`, `src/app/globals.css`
- Create: `components.json`
- Create: shadcn UI components in `src/components/ui/`

- [ ] **Step 1: Install shadcn dependencies**

```bash
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm add tailwindcss-animate
pnpm add @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-select @radix-ui/react-toast @radix-ui/react-checkbox @radix-ui/react-tabs @radix-ui/react-popover @radix-ui/react-avatar @radix-ui/react-separator @radix-ui/react-tooltip @radix-ui/react-switch
```

- [ ] **Step 2: Init shadcn**

```bash
pnpm dlx shadcn@latest init -d
```

When prompted: TypeScript yes, style "new-york", base color "slate", CSS variables yes, src/components alias yes.

This creates `components.json`, updates `tailwind.config.ts`, `src/app/globals.css` with CSS vars + creates `src/lib/utils.ts`.

- [ ] **Step 3: Add base components**

```bash
pnpm dlx shadcn@latest add button input label select textarea checkbox dialog dropdown-menu form table toast tabs popover avatar separator tooltip switch sonner badge card alert
```

This populates `src/components/ui/`.

- [ ] **Step 4: Verify build**

Run: `pnpm typecheck` → PASS
Run: `pnpm build` → PASS

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: setup shadcn/ui with base components"
```

### Task 8: Login Page

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/login/login-form.tsx`
- Create: `src/modules/auth/actions.ts`

- [ ] **Step 1: Auth layout (no sidebar)**

`src/app/(auth)/layout.tsx`:
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Login page**

`src/app/(auth)/login/page.tsx`:
```tsx
import { LoginForm } from "./login-form"
export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Sistem Manajemen Grosir</h1>
        <p className="text-sm text-muted-foreground">Masuk untuk lanjut</p>
      </div>
      <LoginForm />
    </div>
  )
}
```

- [ ] **Step 3: Login form (client)**

`src/app/(auth)/login/login-form.tsx`:
```tsx
"use client"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") ?? "/"
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      username: fd.get("username"),
      password: fd.get("password"),
      redirect: false
    })
    setLoading(false)
    if (result?.error) {
      setError("Username atau password salah")
      return
    }
    router.push(from)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader><CardTitle>Masuk</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" required autoFocus autoComplete="username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Wrap root layout with NextAuth provider**

Install: `pnpm add next-auth` (already), then:

`src/components/providers.tsx`:
```tsx
"use client"
import { SessionProvider } from "next-auth/react"
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

Update `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next"
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "@/components/providers"
import "./globals.css"

export const metadata: Metadata = { title: "Grosir", description: "Sistem Manajemen Grosir" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Verify login flow**

Run: `pnpm dev`
- Open http://localhost:3000 → redirect ke /login
- Login as `owner` / `changeme123`
- Should redirect to `/` (still bare home page).
Stop dev.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add login page with credentials auth"
```

### Task 9: Dashboard Layout (Sidebar + Topbar)

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/topbar.tsx`
- Create: `src/components/layout/user-menu.tsx`
- Create: `src/components/layout/warehouse-switcher.tsx`
- Create: `src/components/layout/nav-config.ts`

- [ ] **Step 1: Nav config**

`src/components/layout/nav-config.ts`:
```ts
import {
  LayoutDashboard, Package, Tags, Trademark, Ruler, Truck, UserCircle,
  Warehouse as WarehouseIcon, Boxes, ShoppingBag, Receipt, RotateCcw,
  Wallet, BarChart3, Settings, Users, Shield, FileText, Store,
  ScrollText, type LucideIcon
} from "lucide-react"

export interface NavItem {
  label: string
  href: string
  icon?: LucideIcon
  permission?: string | string[]
  milestone?: "M1" | "M2" | "M3"
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  { label: "", items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }] },
  {
    label: "Master Data",
    items: [
      { label: "Produk", href: "/master/products", icon: Package, permission: "product.read" },
      { label: "Kategori", href: "/master/categories", icon: Tags, permission: "category.read" },
      { label: "Brand", href: "/master/brands", icon: Trademark, permission: "brand.read" },
      { label: "Satuan", href: "/master/units", icon: Ruler, permission: "unit.read" },
      { label: "Supplier", href: "/master/suppliers", icon: Truck, permission: "supplier.read" },
      { label: "Customer", href: "/master/customers", icon: UserCircle, permission: "customer.read" },
      { label: "Gudang", href: "/master/warehouses", icon: WarehouseIcon, permission: "warehouse.read" }
    ]
  },
  {
    label: "Inventaris",
    items: [
      { label: "Saldo Stok", href: "/inventory/stock", icon: Boxes, permission: "inventory.read" }
    ]
  },
  {
    label: "Pengaturan",
    items: [
      { label: "Pengguna", href: "/settings/users", icon: Users, permission: "user.read" },
      { label: "Role", href: "/settings/roles", icon: Shield, permission: "role.write" },
      { label: "Profil Toko", href: "/settings/store", icon: Store, permission: "setting.write" },
      { label: "Activity Log", href: "/settings/audit-log", icon: ScrollText, permission: "audit.read" },
      { label: "Profil Saya", href: "/settings/profile", icon: UserCircle }
    ]
  }
]

export function filterNavByPermissions(groups: NavGroup[], permissionKeys: string[]): NavGroup[] {
  return groups
    .map(g => ({
      ...g,
      items: g.items.filter(it => {
        if (!it.permission) return true
        const required = Array.isArray(it.permission) ? it.permission : [it.permission]
        return required.every(k => permissionKeys.includes(k))
      })
    }))
    .filter(g => g.items.length > 0)
}
```

- [ ] **Step 2: Sidebar**

`src/components/layout/sidebar.tsx`:
```tsx
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { NAV_GROUPS, filterNavByPermissions } from "./nav-config"

export function Sidebar({ permissionKeys }: { permissionKeys: string[] }) {
  const pathname = usePathname()
  const groups = filterNavByPermissions(NAV_GROUPS, permissionKeys)
  return (
    <aside className="w-60 border-r bg-card h-screen sticky top-0 overflow-y-auto">
      <div className="p-4 border-b">
        <Link href="/" className="font-bold text-lg">Grosir</Link>
      </div>
      <nav className="p-2 space-y-4">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.label && <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">{g.label}</div>}
            <div className="space-y-1">
              {g.items.map(it => {
                const Icon = it.icon
                const isActive = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href))
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                      isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {it.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 3: User menu + warehouse switcher**

`src/components/layout/user-menu.tsx`:
```tsx
"use client"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, User } from "lucide-react"
import Link from "next/link"

export function UserMenu({ name, username }: { name: string; username: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <Avatar className="h-7 w-7"><AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback></Avatar>
          <span className="hidden md:inline text-sm">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{username}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="flex items-center gap-2"><User className="h-4 w-4" />Profil</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} className="text-destructive">
          <LogOut className="h-4 w-4 mr-2" />Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

`src/components/layout/warehouse-switcher.tsx`:
```tsx
"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface WarehouseOption { id: string; name: string }

export function WarehouseSwitcher({
  warehouses,
  current
}: { warehouses: WarehouseOption[]; current: string | null }) {
  return (
    <Select
      value={current ?? undefined}
      onValueChange={(v) => {
        document.cookie = `current_warehouse=${v}; path=/; max-age=2592000`
        window.location.reload()
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Pilih Gudang" />
      </SelectTrigger>
      <SelectContent>
        {warehouses.map(w => (
          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 4: Topbar**

`src/components/layout/topbar.tsx`:
```tsx
import { UserMenu } from "./user-menu"
import { WarehouseSwitcher } from "./warehouse-switcher"

interface Props {
  userName: string
  username: string
  warehouses: { id: string; name: string }[]
  currentWarehouseId: string | null
}

export function Topbar({ userName, username, warehouses, currentWarehouseId }: Props) {
  return (
    <header className="border-b bg-card px-4 h-14 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {/* Search global ditambahkan di Task 11 */}
      </div>
      <div className="flex items-center gap-2">
        <WarehouseSwitcher warehouses={warehouses} current={currentWarehouseId} />
        <UserMenu name={userName} username={username} />
      </div>
    </header>
  )
}
```

- [ ] **Step 5: Dashboard layout (server)**

`src/app/(dashboard)/layout.tsx`:
```tsx
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const userWarehouses = await prisma.warehouse.findMany({
    where: { id: { in: session.user.warehouseIds }, isActive: true, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  })

  const cookieStore = await cookies()
  const currentWarehouseId =
    cookieStore.get("current_warehouse")?.value ??
    session.user.defaultWarehouseId ??
    userWarehouses[0]?.id ??
    null

  return (
    <div className="flex">
      <Sidebar permissionKeys={session.user.permissionKeys} />
      <div className="flex-1 min-h-screen flex flex-col">
        <Topbar
          userName={session.user.name ?? ""}
          username={session.user.username}
          warehouses={userWarehouses}
          currentWarehouseId={currentWarehouseId}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Move home to (dashboard)**

Delete `src/app/page.tsx`. Create `src/app/(dashboard)/page.tsx`:
```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-sm text-muted-foreground mt-1">Selamat datang.</p>
    </div>
  )
}
```

- [ ] **Step 7: Verify**

Run: `pnpm dev`
- Login sebagai owner
- Should see sidebar + topbar + dashboard placeholder
- Sidebar menampilkan menu Master Data, Inventaris, Pengaturan
- User menu bekerja, signOut redirect ke login

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: dashboard layout with sidebar, topbar, warehouse switcher"
```

### Task 10: Reusable Components — DataTable, FormField, ConfirmDialog, EmptyState

**Files:**
- Create: `src/components/data-table/data-table.tsx`
- Create: `src/components/data-table/pagination.tsx`
- Create: `src/components/confirm-dialog.tsx`
- Create: `src/components/empty-state.tsx`
- Create: `src/components/currency-input.tsx`
- Create: `src/components/page-header.tsx`

- [ ] **Step 1: Install tanstack/react-table for headless table**

```bash
pnpm add @tanstack/react-table
pnpm add react-hook-form @hookform/resolvers zod
```

- [ ] **Step 2: DataTable component**

`src/components/data-table/data-table.tsx`:
```tsx
"use client"
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  emptyMessage?: string
}

export function DataTable<TData, TValue>({ columns, data, emptyMessage = "Belum ada data" }: DataTableProps<TData, TValue>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(hg => (
            <TableRow key={hg.id}>
              {hg.headers.map(h => (
                <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">{emptyMessage}</TableCell></TableRow>
          ) : (
            table.getRowModel().rows.map(row => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 3: Pagination**

`src/components/data-table/pagination.tsx`:
```tsx
"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Props { total: number; page: number; pageSize: number }

export function Pagination({ total, page, pageSize }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  function goto(p: number) {
    const next = new URLSearchParams(sp.toString())
    next.set("page", String(p))
    router.push(`?${next.toString()}`)
  }
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <div className="text-muted-foreground">{total === 0 ? "0 hasil" : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} dari ${total}`}</div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goto(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <span>{page} / {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goto(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: ConfirmDialog**

`src/components/confirm-dialog.tsx`:
```tsx
"use client"
import { ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Props {
  trigger: ReactNode
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => Promise<void> | void
}

export function ConfirmDialog({ trigger, title, description, confirmLabel = "Konfirmasi", cancelLabel = "Batal", destructive, onConfirm }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  async function handle() {
    setLoading(true)
    try { await onConfirm(); setOpen(false) } finally { setLoading(false) }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{cancelLabel}</Button>
          <Button variant={destructive ? "destructive" : "default"} disabled={loading} onClick={handle}>
            {loading ? "Memproses..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: EmptyState + PageHeader + CurrencyInput**

`src/components/empty-state.tsx`:
```tsx
import { ReactNode } from "react"
import { Package } from "lucide-react"

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-muted-foreground mb-3">{icon ?? <Package className="h-10 w-10" />}</div>
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
```

`src/components/page-header.tsx`:
```tsx
import { ReactNode } from "react"

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}
```

`src/components/currency-input.tsx`:
```tsx
"use client"
import { forwardRef } from "react"
import { Input } from "@/components/ui/input"

export const CurrencyInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function CurrencyInput(props, ref) {
    return <Input ref={ref} type="text" inputMode="numeric" pattern="[0-9]*" {...props} />
  }
)
```

- [ ] **Step 6: Verify build**

Run: `pnpm typecheck` → PASS

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: shared components (data table, pagination, confirm dialog, empty state, page header, currency input)"
```

### Task 11: Audit Log Helper + Prisma Middleware

**Files:**
- Create: `src/lib/audit.ts`
- Test: `tests/unit/lib/audit.test.ts`

- [ ] **Step 1: Audit helper**

`src/lib/audit.ts`:
```ts
import type { Prisma } from "@prisma/client"
import { prisma } from "./db"
import { AuditAction } from "@prisma/client"

export interface AuditInput {
  actorUserId: string
  entity: string
  entityId: string
  action: AuditAction
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  tx?: Prisma.TransactionClient
}

export function computeDiff(before?: Record<string, unknown> | null, after?: Record<string, unknown> | null): Record<string, [unknown, unknown]> {
  if (!before && !after) return {}
  const all = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  const diff: Record<string, [unknown, unknown]> = {}
  for (const k of all) {
    const a = before?.[k]
    const b = after?.[k]
    const aJson = JSON.stringify(a)
    const bJson = JSON.stringify(b)
    if (aJson !== bJson) diff[k] = [a, b]
  }
  return diff
}

export async function audit(input: AuditInput): Promise<void> {
  const client = input.tx ?? prisma
  const diff = computeDiff(input.before, input.after)
  await client.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      diffJson: Object.keys(diff).length > 0 ? diff : (input.before ?? input.after ?? null) as any
    }
  })
}
```

- [ ] **Step 2: Test diff computation**

`tests/unit/lib/audit.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { computeDiff } from "@/lib/audit"

describe("computeDiff", () => {
  it("captures changed fields only", () => {
    const before = { name: "Old", price: 100, isActive: true }
    const after = { name: "New", price: 100, isActive: true }
    expect(computeDiff(before, after)).toEqual({ name: ["Old", "New"] })
  })
  it("captures added field", () => {
    expect(computeDiff({ a: 1 }, { a: 1, b: 2 })).toEqual({ b: [undefined, 2] })
  })
  it("captures removed field", () => {
    expect(computeDiff({ a: 1, b: 2 }, { a: 1 })).toEqual({ b: [2, undefined] })
  })
  it("returns empty for identical", () => {
    expect(computeDiff({ x: "same" }, { x: "same" })).toEqual({})
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm test` → all PASS

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: audit log helper with diff computation"
```

### Task 12: 403 / 404 / Error Pages

**Files:**
- Create: `src/app/(dashboard)/forbidden/page.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/error.tsx`

- [ ] **Step 1: Forbidden page**

`src/app/(dashboard)/forbidden/page.tsx`:
```tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Lock className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold">Akses ditolak</h1>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">Kamu tidak punya izin untuk halaman ini. Hubungi admin kalau perlu akses.</p>
      <Button asChild className="mt-4"><Link href="/">Kembali ke Beranda</Link></Button>
    </div>
  )
}
```

- [ ] **Step 2: Not found**

`src/app/not-found.tsx`:
```tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-3xl font-bold">Halaman tidak ditemukan</h1>
      <p className="text-sm text-muted-foreground mt-2">URL yang kamu buka tidak ada.</p>
      <Button asChild className="mt-4"><Link href="/">Beranda</Link></Button>
    </div>
  )
}
```

- [ ] **Step 3: Error boundary**

`src/app/error.tsx`:
```tsx
"use client"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-2xl font-bold">Terjadi kesalahan</h1>
      <p className="text-sm text-muted-foreground mt-2">Tim sudah dinotifikasi. Coba lagi atau kembali nanti.</p>
      <Button onClick={reset} className="mt-4">Coba Lagi</Button>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: forbidden, not-found, and error boundary pages"
```

### Task 22: Product Pages (List + New + Edit + Detail)

**Files:**
- Create: `src/app/(dashboard)/master/products/page.tsx` (list)
- Create: `src/app/(dashboard)/master/products/new/page.tsx`
- Create: `src/app/(dashboard)/master/products/[id]/page.tsx` (detail)
- Create: `src/app/(dashboard)/master/products/[id]/edit/page.tsx`

- [ ] **Step 1: List page**

`src/app/(dashboard)/master/products/page.tsx`:
```tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listProducts } from "@/modules/master-product/queries"
import { listAllCategoriesForSelect } from "@/modules/master-category/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Pagination } from "@/components/data-table/pagination"
import { formatIDR } from "@/lib/money"
import { Plus, Eye } from "lucide-react"

interface Row { id: string; sku: string; name: string; category: string; brand: string | null; defaultSalePrice: number; isActive: boolean }

export default async function ProductsListPage({ searchParams }: { searchParams: Promise<{ q?: string; categoryId?: string; status?: string; page?: string }> }) {
  const session = await auth()
  if (!session?.user.permissionKeys.includes("product.read")) redirect("/forbidden")
  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const { items, total, pageSize } = await listProducts({
    q: sp.q,
    categoryId: sp.categoryId,
    status: (sp.status as any) ?? "active",
    page
  })
  const categories = await listAllCategoriesForSelect()

  const rows: Row[] = items.map(p => {
    const defSale = p.units.find(u => u.isDefaultSale) ?? p.units[0]
    return {
      id: p.id, sku: p.sku, name: p.name,
      category: p.category.name,
      brand: p.brand?.name ?? null,
      defaultSalePrice: Number(defSale?.salePrice ?? 0),
      isActive: p.isActive
    }
  })

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "sku", header: "SKU" },
    { accessorKey: "name", header: "Nama" },
    { accessorKey: "category", header: "Kategori" },
    { accessorKey: "brand", header: "Brand", cell: ({ row }) => row.original.brand ?? "-" },
    { accessorKey: "defaultSalePrice", header: "Harga Jual", cell: ({ row }) => formatIDR(row.original.defaultSalePrice) },
    { accessorKey: "isActive", header: "Status", cell: ({ row }) => row.original.isActive ? "Aktif" : "Nonaktif" },
    { id: "actions", header: "Aksi", cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm"><Link href={`/master/products/${row.original.id}`}><Eye className="h-4 w-4" /></Link></Button>
    ) }
  ]

  const canWrite = session.user.permissionKeys.includes("product.write")
  return (
    <div>
      <PageHeader title="Produk" actions={canWrite ? <Button asChild><Link href="/master/products/new"><Plus className="h-4 w-4 mr-1" />Tambah Produk</Link></Button> : null} />
      <DataTable columns={columns} data={rows} />
      <Pagination total={total} page={page} pageSize={pageSize} />
    </div>
  )
}
```

- [ ] **Step 2: New product page**

`src/app/(dashboard)/master/products/new/page.tsx`:
```tsx
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ProductForm } from "@/modules/master-product/components/product-form"
import { PageHeader } from "@/components/page-header"

export default async function NewProductPage() {
  const session = await auth()
  if (!session?.user.permissionKeys.includes("product.write")) redirect("/forbidden")
  const [categories, brands, units] = await Promise.all([
    prisma.category.findMany({ where: { deletedAt: null, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ where: { deletedAt: null, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ where: { deletedAt: null, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  ])
  return (
    <div>
      <PageHeader title="Tambah Produk" />
      <ProductForm categories={categories} brands={brands} units={units} />
    </div>
  )
}
```

- [ ] **Step 3: Edit product page**

`src/app/(dashboard)/master/products/[id]/edit/page.tsx`:
```tsx
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getProductById } from "@/modules/master-product/queries"
import { ProductForm } from "@/modules/master-product/components/product-form"
import { PageHeader } from "@/components/page-header"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user.permissionKeys.includes("product.write")) redirect("/forbidden")
  const { id } = await params
  const product = await getProductById(id)
  if (!product) notFound()
  const [categories, brands, units] = await Promise.all([
    prisma.category.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  ])
  const initial = {
    id: product.id,
    version: product.version,
    sku: product.sku,
    name: product.name,
    categoryId: product.categoryId,
    brandId: product.brandId,
    baseUnitId: product.baseUnitId,
    description: product.description,
    imageUrl: product.imageUrl,
    hasCukai: product.hasCukai,
    hasHet: product.hasHet,
    hetPrice: product.hetPrice ? Number(product.hetPrice) : null,
    minStock: product.minStock,
    units: product.units.map(u => ({
      id: u.id,
      unitId: u.unitId,
      conversionToBase: Number(u.conversionToBase),
      barcode: u.barcode,
      purchasePrice: Number(u.purchasePrice),
      salePrice: Number(u.salePrice),
      isDefaultPurchase: u.isDefaultPurchase,
      isDefaultSale: u.isDefaultSale
    }))
  }
  return (
    <div>
      <PageHeader title={`Ubah Produk: ${product.name}`} />
      <ProductForm categories={categories} brands={brands} units={units} initial={initial} />
    </div>
  )
}
```

- [ ] **Step 4: Detail page (tab layout)**

`src/app/(dashboard)/master/products/[id]/page.tsx`:
```tsx
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getProductById, getProductStocks } from "@/modules/master-product/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatIDR } from "@/lib/money"
import { Pencil } from "lucide-react"

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user.permissionKeys.includes("product.read")) redirect("/forbidden")
  const { id } = await params
  const product = await getProductById(id)
  if (!product) notFound()
  const stocks = await getProductStocks(id)
  const canWrite = session.user.permissionKeys.includes("product.write")

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku} - Kategori: ${product.category.name}${product.brand ? ` - Brand: ${product.brand.name}` : ""}`}
        actions={canWrite ? (
          <Button asChild><Link href={`/master/products/${id}/edit`}><Pencil className="h-4 w-4 mr-1" />Ubah</Link></Button>
        ) : null}
      />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="units">Satuan & Harga</TabsTrigger>
          <TabsTrigger value="stock">Stok per Gudang</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card><CardContent className="pt-6 space-y-2 text-sm">
            <div><span className="text-muted-foreground">Status:</span> {product.isActive ? "Aktif" : "Nonaktif"}</div>
            <div><span className="text-muted-foreground">Base Unit:</span> {product.baseUnit.name}</div>
            <div><span className="text-muted-foreground">Min Stock:</span> {product.minStock}</div>
            <div><span className="text-muted-foreground">Cukai:</span> {product.hasCukai ? "Ya" : "Tidak"}</div>
            <div><span className="text-muted-foreground">HET:</span> {product.hasHet ? formatIDR(Number(product.hetPrice ?? 0)) : "Tidak ada"}</div>
            {product.description && <div><span className="text-muted-foreground">Deskripsi:</span> {product.description}</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="units">
          <Card><CardContent className="pt-6">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr><th className="pb-2">Satuan</th><th>Konversi</th><th>Barcode</th><th>Harga Beli</th><th>Harga Jual</th><th>Default</th></tr>
              </thead>
              <tbody>
                {product.units.map(u => (
                  <tr key={u.id} className="border-b">
                    <td className="py-2">{u.unit.name}</td>
                    <td>{Number(u.conversionToBase)}</td>
                    <td>{u.barcode ?? "-"}</td>
                    <td>{formatIDR(Number(u.purchasePrice))}</td>
                    <td>{formatIDR(Number(u.salePrice))}</td>
                    <td>{u.isDefaultPurchase && "Beli "}{u.isDefaultSale && "Jual"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card><CardContent className="pt-6">
            {stocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada saldo stok.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr><th className="pb-2">Gudang</th><th>Saldo (base unit)</th></tr>
                </thead>
                <tbody>
                  {stocks.map(s => (
                    <tr key={`${s.productId}-${s.warehouseId}`} className="border-b">
                      <td className="py-2">{s.warehouse.name}</td>
                      <td>{Number(s.qtyInBase)} {product.baseUnit.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 5: Manual test**

Run: `pnpm dev`. Login as owner. Buat kategori "Rokok", brand "X", unit "batang"+"pak". Buka /master/products/new:
- SKU: RKK-001, Nama: Rokok X 16 batang
- Kategori: Rokok, Brand: X, Base unit: batang
- Units row 1: batang, conv 1, harga beli 1500, jual 1800, default jual
- Tambah row: pak, conv 20, barcode 8990001, harga beli 29000, jual 35000, default beli
- HET: aktifkan, isi 1900
- Simpan -> success toast, redirect ke list, produk muncul.

Edit produk, ubah HET ke 1700: harus error HET_VIOLATION (1750 > 1700) di non-OWNER. Owner: lolos.

Stop dev.

- [ ] **Step 6: Commit**

```bash
git add . && git commit -m "feat(master-product): list, new, edit, detail pages with tab layout"
```

### Task 23: User Module — Pattern + Reset Password

**Files:**
- Create: `src/modules/users/{schema,service,queries,actions}.ts`
- Create: `src/modules/users/components/user-form.tsx`
- Create: `src/app/(dashboard)/settings/users/{page.tsx,new/page.tsx,[id]/edit/page.tsx}`

- [ ] **Step 1: Schema**

```ts
import { z } from "zod"

export const createUserSchema = z.object({
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email().nullable().optional(),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8, "Minimal 8 karakter"),
  defaultWarehouseId: z.string().cuid().nullable().optional(),
  roleIds: z.array(z.string().cuid()).min(1, "Minimal 1 role"),
  warehouseIds: z.array(z.string().cuid()).default([])
})

export const updateUserSchema = createUserSchema.omit({ password: true }).extend({
  id: z.string().cuid(),
  isActive: z.boolean().default(true)
})

export const resetPasswordSchema = z.object({
  id: z.string().cuid(),
  newPassword: z.string().min(8)
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
```

- [ ] **Step 2: Service**

```ts
import bcrypt from "bcryptjs"
import type { Prisma, PrismaClient } from "@prisma/client"
import { AppError } from "@/lib/errors"
import type { CreateUserInput, UpdateUserInput, ResetPasswordInput } from "./schema"

type Db = PrismaClient | Prisma.TransactionClient

export async function createUser(db: Db, input: CreateUserInput) {
  const dup = await db.user.findFirst({ where: { OR: [{ username: input.username }, { email: input.email ?? "_none_" }], deletedAt: null } })
  if (dup) throw new AppError("INVALID_INPUT", "Username atau email sudah ada")
  const passwordHash = await bcrypt.hash(input.password, 12)
  const user = await db.user.create({
    data: {
      username: input.username,
      email: input.email ?? null,
      name: input.name,
      passwordHash,
      defaultWarehouseId: input.defaultWarehouseId ?? null,
      roles: { create: input.roleIds.map(roleId => ({ roleId })) },
      warehouseAccess: { create: input.warehouseIds.map(warehouseId => ({ warehouseId })) }
    }
  })
  return user
}

export async function updateUser(db: Db, input: UpdateUserInput) {
  const current = await db.user.findUnique({ where: { id: input.id } })
  if (!current || current.deletedAt) throw new AppError("NOT_FOUND", "User tidak ditemukan")
  const dup = await db.user.findFirst({ where: { OR: [{ username: input.username }, { email: input.email ?? "_none_" }], deletedAt: null, NOT: { id: input.id } } })
  if (dup) throw new AppError("INVALID_INPUT", "Username atau email sudah ada")

  await db.userRole.deleteMany({ where: { userId: input.id } })
  await db.userWarehouse.deleteMany({ where: { userId: input.id } })

  return db.user.update({
    where: { id: input.id },
    data: {
      username: input.username,
      email: input.email ?? null,
      name: input.name,
      isActive: input.isActive,
      defaultWarehouseId: input.defaultWarehouseId ?? null,
      roles: { create: input.roleIds.map(roleId => ({ roleId })) },
      warehouseAccess: { create: input.warehouseIds.map(warehouseId => ({ warehouseId })) }
    }
  })
}

export async function resetUserPassword(db: Db, input: ResetPasswordInput) {
  const passwordHash = await bcrypt.hash(input.newPassword, 12)
  return db.user.update({ where: { id: input.id }, data: { passwordHash } })
}

export async function softDeleteUser(db: Db, id: string) {
  const current = await db.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } })
  if (!current) throw new AppError("NOT_FOUND", "User tidak ditemukan")
  if (current.roles.some(r => r.role.name === "OWNER")) throw new AppError("INVALID_INPUT", "OWNER tidak bisa dihapus")
  return db.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
}
```

- [ ] **Step 3: Actions**

Pattern sama Task 13. Action: `createUserAction`, `updateUserAction`, `resetUserPasswordAction`, `deleteUserAction`. Permission `user.write` untuk semua.

`resetUserPasswordAction` return new password agar bisa ditampilkan sekali ke admin.

- [ ] **Step 4: Form & Pages**

Form fields: username, email, name, password (only on create), defaultWarehouseId (select), roleIds (multi-select / checkbox group), warehouseIds (multi-select).

Page list: kolom username, name, email, roles (badge list), status. Tombol aksi: Edit, Reset Password (modal), Nonaktifkan.

- [ ] **Step 5: Verify + Commit**

Manual test: buat user kasir1 dengan role KASIR + akses Gudang Utama. Logout, login as kasir1, sidebar harus filter sesuai permission KASIR (tidak lihat Settings).

```bash
git add . && git commit -m "feat(users): CRUD + role assignment + warehouse access + password reset"
```

### Task 24: Role Module — Editor + Permission Picker

**Files:**
- Create: `src/modules/settings-role/{schema,service,queries,actions}.ts`
- Create: `src/modules/settings-role/components/role-form.tsx`
- Create: `src/app/(dashboard)/settings/roles/{page.tsx,new/page.tsx,[id]/edit/page.tsx}`

- [ ] **Step 1: Schema**

```ts
import { z } from "zod"
export const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(50).regex(/^[A-Z0-9_]+$/, "Hanya huruf besar, angka, _"),
  description: z.string().max(200).optional().nullable(),
  permissionKeys: z.array(z.string()).default([])
})
export const updateRoleSchema = createRoleSchema.extend({ id: z.string().cuid() })
export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
```

- [ ] **Step 2: Service**

```ts
import type { Prisma, PrismaClient } from "@prisma/client"
import { AppError } from "@/lib/errors"
import type { CreateRoleInput, UpdateRoleInput } from "./schema"

type Db = PrismaClient | Prisma.TransactionClient

export async function createRole(db: Db, input: CreateRoleInput) {
  const dup = await db.role.findFirst({ where: { name: input.name } })
  if (dup) throw new AppError("INVALID_INPUT", "Nama role sudah ada")
  const perms = await db.permission.findMany({ where: { key: { in: input.permissionKeys } } })
  return db.role.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      isSystem: false,
      permissions: { create: perms.map(p => ({ permissionId: p.id })) }
    }
  })
}

export async function updateRole(db: Db, input: UpdateRoleInput) {
  const current = await db.role.findUnique({ where: { id: input.id } })
  if (!current) throw new AppError("NOT_FOUND", "Role tidak ditemukan")
  if (current.name === "OWNER") throw new AppError("INVALID_INPUT", "Role OWNER tidak bisa diedit")
  const perms = await db.permission.findMany({ where: { key: { in: input.permissionKeys } } })
  await db.rolePermission.deleteMany({ where: { roleId: input.id } })
  return db.role.update({
    where: { id: input.id },
    data: {
      name: input.name,
      description: input.description ?? null,
      permissions: { create: perms.map(p => ({ permissionId: p.id })) }
    }
  })
}

export async function deleteRole(db: Db, id: string) {
  const current = await db.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } })
  if (!current) throw new AppError("NOT_FOUND", "Role tidak ditemukan")
  if (current.isSystem) throw new AppError("INVALID_INPUT", "Role sistem tidak bisa dihapus")
  if (current._count.users > 0) throw new AppError("INVALID_INPUT", "Role masih digunakan user")
  return db.role.delete({ where: { id } })
}
```

- [ ] **Step 3: Form (permission picker grouped by module)**

Permission list di-group by `module`. Render accordion per module dengan checkbox per permission key. Tombol "Pilih semua di module" + search bar.

Action: `createRoleAction`, `updateRoleAction`, `deleteRoleAction` dengan permission `role.write`.

- [ ] **Step 4: Verify + Commit**

```bash
git add . && git commit -m "feat(role): create + edit role with grouped permission picker"
```

### Task 25: Settings — Store Profile + General

**Files:**
- Create: `src/modules/settings-store/{schema,actions}.ts`
- Create: `src/app/(dashboard)/settings/store/page.tsx`
- Create: `src/app/(dashboard)/settings/general/page.tsx`

- [ ] **Step 1: Settings actions**

`src/modules/settings-store/actions.ts`:
```ts
"use server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { AuditAction } from "@prisma/client"

const storeSchema = z.object({
  store_name: z.string().min(1).max(100),
  store_address: z.string().max(500).optional().nullable(),
  store_phone: z.string().max(30).optional().nullable()
})

const generalSchema = z.object({
  allow_negative_stock: z.boolean()
})

export async function updateStoreSettingsAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("setting.write")
    const parsed = storeSchema.parse(input)
    await prisma.$transaction(async (tx) => {
      const before: Record<string, string> = {}
      const after: Record<string, string> = {}
      for (const [key, value] of Object.entries(parsed)) {
        const prev = await tx.setting.findUnique({ where: { key } })
        before[key] = prev?.value ?? ""
        const v = String(value ?? "")
        after[key] = v
        await tx.setting.upsert({ where: { key }, create: { key, value: v }, update: { value: v } })
      }
      await audit({ tx, actorUserId: session.user.id, entity: "Setting", entityId: "store", action: AuditAction.UPDATE, before, after })
    })
    revalidatePath("/settings/store")
  })
}

export async function updateGeneralSettingsAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("setting.write")
    const parsed = generalSchema.parse(input)
    await prisma.$transaction(async (tx) => {
      const v = String(parsed.allow_negative_stock)
      const prev = await tx.setting.findUnique({ where: { key: "allow_negative_stock" } })
      await tx.setting.upsert({ where: { key: "allow_negative_stock" }, create: { key: "allow_negative_stock", value: v }, update: { value: v } })
      await audit({ tx, actorUserId: session.user.id, entity: "Setting", entityId: "general", action: AuditAction.UPDATE, before: { allow_negative_stock: prev?.value ?? "false" }, after: { allow_negative_stock: v } })
    })
    revalidatePath("/settings/general")
  })
}
```

- [ ] **Step 2: Pages**

Store page: form dengan store_name, store_address (textarea), store_phone. Load setting dari `prisma.setting.findMany({ where: { key: { in: ["store_name", "store_address", "store_phone"] } } })` dan map ke object initial.

General page: switch `allow_negative_stock` dengan deskripsi.

Both pages: `requirePermission("setting.write")` di server component.

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat(settings): store profile + general settings (allow_negative_stock)"
```

### Task 26: Settings — Audit Log Page

**Files:**
- Create: `src/modules/settings-audit/queries.ts`
- Create: `src/app/(dashboard)/settings/audit-log/page.tsx`

- [ ] **Step 1: Query**

```ts
import { prisma } from "@/lib/db"

export interface AuditListParams {
  entity?: string
  actorUserId?: string
  action?: string
  fromDate?: Date
  toDate?: Date
  page?: number
  pageSize?: number
}

export async function listAuditLogs(params: AuditListParams) {
  const { entity, actorUserId, action, fromDate, toDate, page = 1, pageSize = 50 } = params
  const where: any = {}
  if (entity) where.entity = entity
  if (actorUserId) where.actorUserId = actorUserId
  if (action) where.action = action
  if (fromDate || toDate) {
    where.occurredAt = {}
    if (fromDate) where.occurredAt.gte = fromDate
    if (toDate) where.occurredAt.lte = toDate
  }
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, username: true, name: true } } },
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.auditLog.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getDistinctEntities() {
  const result = await prisma.auditLog.findMany({ distinct: ["entity"], select: { entity: true } })
  return result.map(r => r.entity).sort()
}
```

- [ ] **Step 2: Page with diff modal**

`src/app/(dashboard)/settings/audit-log/page.tsx`:
- Server component, parse searchParams (entity, actor, action, from, to, page).
- DataTable kolom: tanggal (formatDateTime), aktor (username), entity, action, ringkasan (entityId).
- Klik baris -> client modal yang display `diffJson` formatted (key | before | after).

Permission gate: `requirePermission("audit.read")`.

- [ ] **Step 3: Verify + Commit**

Manual test: lakukan beberapa CRUD master di session berbeda, buka /settings/audit-log, cek list muncul dengan info aktor + diff.

```bash
git add . && git commit -m "feat(settings): audit log page with filter + diff modal"
```

### Task 27: Settings — User Profile (Self-Service)

**Files:**
- Create: `src/modules/users/components/profile-form.tsx`
- Create: `src/app/(dashboard)/settings/profile/page.tsx`
- Create: `src/modules/users/profile-actions.ts`

- [ ] **Step 1: Self-update action**

```ts
"use server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { requireSession } from "@/modules/auth/service"
import { AppError } from "@/lib/errors"

const profileSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().nullable().optional()
})
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
})

export async function updateMyProfileAction(input: unknown) {
  return action(async () => {
    const session = await requireSession()
    const parsed = profileSchema.parse(input)
    await prisma.user.update({ where: { id: session.user.id }, data: { name: parsed.name, email: parsed.email ?? null } })
    revalidatePath("/settings/profile")
  })
}

export async function changeMyPasswordAction(input: unknown) {
  return action(async () => {
    const session = await requireSession()
    const parsed = passwordChangeSchema.parse(input)
    const me = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } })
    const ok = await bcrypt.compare(parsed.currentPassword, me.passwordHash)
    if (!ok) throw new AppError("INVALID_INPUT", "Password lama salah", { currentPassword: "Salah" })
    const newHash = await bcrypt.hash(parsed.newPassword, 12)
    await prisma.user.update({ where: { id: me.id }, data: { passwordHash: newHash } })
  })
}
```

- [ ] **Step 2: Profile page + 2 form (info + password)**

Layout: 2 card. Card "Info" (name, email + Simpan). Card "Ganti Password" (current, new, confirm + Ganti).

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat(profile): self-service profile + password change"
```

## Phase C - Stock Read-only, Dashboard, E2E, Polish

### Task 28: Inventory Stock — Read-only Page

**Files:**
- Create: `src/modules/inventory-stock/queries.ts`
- Create: `src/app/(dashboard)/inventory/stock/page.tsx`

M1 cuma read; movement masuk M2.

- [ ] **Step 1: Query**

```ts
import { prisma } from "@/lib/db"

export interface StockListParams {
  warehouseId?: string
  q?: string
  belowMinOnly?: boolean
  page?: number
  pageSize?: number
}

export async function listStockBalances(params: StockListParams) {
  const { warehouseId, q, belowMinOnly, page = 1, pageSize = 50 } = params
  const where: any = {}
  if (warehouseId) where.warehouseId = warehouseId
  if (q) {
    where.product = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } }
      ]
    }
  }
  const [items, total] = await Promise.all([
    prisma.stockBalance.findMany({
      where,
      include: {
        product: { select: { id: true, sku: true, name: true, minStock: true, baseUnit: { select: { name: true } }, isActive: true } },
        warehouse: { select: { id: true, name: true } }
      },
      orderBy: [{ warehouseId: "asc" }, { product: { name: "asc" } }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.stockBalance.count({ where })
  ])
  let filtered = items
  if (belowMinOnly) {
    filtered = items.filter(s => Number(s.qtyInBase) < (s.minStock ?? s.product.minStock))
  }
  return { items: filtered, total, page, pageSize }
}
```

- [ ] **Step 2: Page**

`src/app/(dashboard)/inventory/stock/page.tsx`:
```tsx
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { listStockBalances } from "@/modules/inventory-stock/queries"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { Pagination } from "@/components/data-table/pagination"
import type { ColumnDef } from "@tanstack/react-table"

interface Row {
  productId: string
  warehouseId: string
  productName: string
  sku: string
  warehouseName: string
  qty: number
  minStock: number
  unit: string
  belowMin: boolean
}

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string; warehouseId?: string; belowMin?: string; page?: string }> }) {
  const session = await auth()
  if (!session?.user.permissionKeys.includes("inventory.read")) redirect("/forbidden")
  const sp = await searchParams
  const cookieStore = await cookies()
  const currentWarehouseId = sp.warehouseId ?? cookieStore.get("current_warehouse")?.value ?? session.user.defaultWarehouseId ?? undefined
  const page = Number(sp.page ?? "1")
  const { items, total, pageSize } = await listStockBalances({
    warehouseId: currentWarehouseId,
    q: sp.q,
    belowMinOnly: sp.belowMin === "1",
    page
  })

  const rows: Row[] = items.map(s => {
    const min = s.minStock ?? s.product.minStock
    return {
      productId: s.productId,
      warehouseId: s.warehouseId,
      productName: s.product.name,
      sku: s.product.sku,
      warehouseName: s.warehouse.name,
      qty: Number(s.qtyInBase),
      minStock: min,
      unit: s.product.baseUnit.name,
      belowMin: Number(s.qtyInBase) < min
    }
  })

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "sku", header: "SKU" },
    { accessorKey: "productName", header: "Produk" },
    { accessorKey: "warehouseName", header: "Gudang" },
    { accessorKey: "qty", header: "Saldo", cell: ({ row }) => `${row.original.qty} ${row.original.unit}` },
    { accessorKey: "minStock", header: "Min", cell: ({ row }) => row.original.minStock },
    { id: "status", header: "Status", cell: ({ row }) => row.original.belowMin ? <span className="text-destructive">Di bawah min</span> : "OK" }
  ]

  return (
    <div>
      <PageHeader title="Saldo Stok" description="Ringkasan saldo stok per gudang. Pergerakan stok aktif di milestone berikutnya." />
      <DataTable columns={columns} data={rows} emptyMessage="Belum ada saldo stok" />
      <Pagination total={total} page={page} pageSize={pageSize} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat(inventory): stock balance read-only page (M1)"
```

### Task 29: Dashboard Page (M1 Skeleton)

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

M1 dashboard: card metrik basic + quick action ke pages yang ada. Chart/top sellers/notifikasi nyusul saat ada data transaksi (M2/M3).

- [ ] **Step 1: Implement**

```tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Package, Boxes, Users } from "lucide-react"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [productCount, customerCount, supplierCount, lowStockCount] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null, isActive: true } }),
    prisma.customer.count({ where: { deletedAt: null, isActive: true } }),
    prisma.supplier.count({ where: { deletedAt: null, isActive: true } }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM "StockBalance" sb
      JOIN "Product" p ON p.id = sb.product_id
      WHERE sb.qty_in_base < COALESCE(sb.min_stock, p.min_stock)
        AND p.deleted_at IS NULL
    `
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Selamat datang, {session.user.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">Ringkasan operasional</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Package className="h-4 w-4" />Produk Aktif</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{productCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" />Customer</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{customerCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Supplier</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{supplierCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Boxes className="h-4 w-4" />Stok Minimum</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{Number((lowStockCount[0]?.count ?? 0n))}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Aksi Cepat</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/master/products/new"><Plus className="h-4 w-4 mr-1" />Tambah Produk</Link></Button>
          <Button asChild variant="outline"><Link href="/master/customers/new">Tambah Customer</Link></Button>
          <Button asChild variant="outline"><Link href="/master/suppliers/new">Tambah Supplier</Link></Button>
          <Button asChild variant="outline"><Link href="/inventory/stock">Lihat Stok</Link></Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Catatan</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Saat ini sistem masih di milestone M1 (Pendataan & Foundation).</p>
          <p>Transaksi pembelian, penjualan, dan keuangan aktif di milestone berikutnya.</p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "feat(dashboard): basic metric cards + quick actions (M1)"
```

### Task 30: Integration Test Setup + Sample Test

**Files:**
- Create: `vitest.integration.config.ts`
- Create: `tests/integration/setup.ts`
- Create: `tests/integration/master-category.test.ts`
- Modify: `package.json`, `docker-compose.dev.yml`

- [ ] **Step 1: Test DB container**

Add to `docker-compose.dev.yml`:
```yaml
  postgres-test:
    image: postgres:16
    ports: ["5433:5432"]
    environment:
      POSTGRES_USER: grosir
      POSTGRES_PASSWORD: grosir_test
      POSTGRES_DB: grosir_test
    tmpfs: /var/lib/postgresql/data
```

Run: `docker compose -f docker-compose.dev.yml up -d`
Expected: postgres-test running on port 5433.

- [ ] **Step 2: Vitest integration config**

`vitest.integration.config.ts`:
```ts
import { defineConfig } from "vitest/config"
import path from "node:path"
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } }
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } }
})
```

Add to `package.json`:
```json
"test:integration": "DATABASE_URL=postgresql://grosir:grosir_test@localhost:5433/grosir_test?schema=public vitest run --config vitest.integration.config.ts"
```

- [ ] **Step 3: Setup file**

`tests/integration/setup.ts`:
```ts
import { execSync } from "node:child_process"
import { afterAll, beforeAll, beforeEach } from "vitest"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

beforeAll(() => {
  execSync("pnpm prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL! },
    stdio: "inherit"
  })
})

beforeEach(async () => {
  // Truncate all data tables (preserve schema), reset counters.
  const tablenames = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE '_prisma%'
  `
  const list = tablenames.map(t => `"public"."${t.tablename}"`).join(", ")
  if (list) await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
})

afterAll(async () => {
  await prisma.$disconnect()
})

export { prisma }
```

- [ ] **Step 4: Sample integration test**

`tests/integration/master-category.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { prisma } from "./setup"
import { createCategory, softDeleteCategory } from "@/modules/master-category/service"
import { AppError } from "@/lib/errors"

describe("category integration", () => {
  it("creates category and prevents duplicate", async () => {
    const a = await createCategory(prisma, { name: "Rokok" })
    expect(a.id).toBeDefined()
    await expect(createCategory(prisma, { name: "Rokok" })).rejects.toBeInstanceOf(AppError)
  })

  it("soft delete blocked with active products", async () => {
    const cat = await createCategory(prisma, { name: "Mi" })
    const unit = await prisma.unit.create({ data: { name: "pcs" } })
    await prisma.product.create({
      data: {
        sku: "MIE-001", name: "Indomie", categoryId: cat.id, baseUnitId: unit.id,
        units: { create: { unitId: unit.id, conversionToBase: 1, purchasePrice: 1000, salePrice: 1500, isDefaultPurchase: true, isDefaultSale: true } }
      }
    })
    await expect(softDeleteCategory(prisma, cat.id)).rejects.toBeInstanceOf(AppError)
  })
})
```

- [ ] **Step 5: Run integration test**

Run: `pnpm test:integration`
Expected: tests PASS.

- [ ] **Step 6: Commit**

```bash
git add . && git commit -m "test: integration test setup + sample category test"
```

### Task 31: Playwright E2E Setup + Login + Product Flow

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/login.spec.ts`
- Create: `tests/e2e/master-product.spec.ts`
- Create: `tests/e2e/_helpers.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Playwright**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 2: Config**

`playwright.config.ts`:
```ts
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    timeout: 120000,
    reuseExistingServer: !process.env.CI
  }
})
```

Add to `package.json`:
```json
"e2e": "playwright test",
"e2e:ui": "playwright test --ui"
```

- [ ] **Step 3: Helper**

`tests/e2e/_helpers.ts`:
```ts
import { Page } from "@playwright/test"

export async function login(page: Page, username = "owner", password = "changeme123") {
  await page.goto("/login")
  await page.fill('input[name="username"]', username)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 })
}
```

- [ ] **Step 4: Login spec**

`tests/e2e/login.spec.ts`:
```ts
import { test, expect } from "@playwright/test"

test("login success and logout", async ({ page }) => {
  await page.goto("/login")
  await page.fill('input[name="username"]', "owner")
  await page.fill('input[name="password"]', "changeme123")
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL("/")
  await expect(page.getByText("Selamat datang")).toBeVisible()

  // Wrong password
  await page.context().clearCookies()
  await page.goto("/login")
  await page.fill('input[name="username"]', "owner")
  await page.fill('input[name="password"]', "wrong-password")
  await page.click('button[type="submit"]')
  await expect(page.getByText(/salah/i)).toBeVisible()
})
```

- [ ] **Step 5: Product happy path E2E**

`tests/e2e/master-product.spec.ts`:
```ts
import { test, expect } from "@playwright/test"
import { login } from "./_helpers"

const SUFFIX = Date.now().toString().slice(-6)

test("create category, brand, unit, then product with multi-unit", async ({ page }) => {
  await login(page)

  // Category
  await page.goto("/master/categories/new")
  await page.fill('input[name="name"]', `Rokok ${SUFFIX}`)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/master\/categories$/)

  // Brand
  await page.goto("/master/brands/new")
  await page.fill('input[name="name"]', `BrandX ${SUFFIX}`)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/master\/brands$/)

  // Unit (skip if seed sudah ada batang/pak/slop)
  // ...

  // Product (asumsi seed unit sudah ada batang+pak)
  await page.goto("/master/products/new")
  await page.fill('input[name="sku"]', `RKK-${SUFFIX}`)
  await page.fill('input[name="name"]', `Rokok Test ${SUFFIX}`)
  // pilih kategori (locator depend pada Select implementation; sesuaikan saat implementasi)
  await page.getByText("Pilih kategori").click()
  await page.getByRole("option", { name: new RegExp(`Rokok ${SUFFIX}`) }).click()
  await page.getByText("Pilih satuan dasar").click()
  await page.getByRole("option", { name: "batang" }).click()
  // Save
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/master\/products$/)
  await expect(page.getByText(`RKK-${SUFFIX}`)).toBeVisible()
})
```

Catatan: spec ini dependent pada locator real shadcn Select. Saat implementasi, gunakan `data-testid` di trigger/option untuk stabilitas.

- [ ] **Step 6: Run E2E**

Run: `pnpm e2e`
Expected: 2 spec PASS.

- [ ] **Step 7: Commit**

```bash
git add . && git commit -m "test: E2E setup + login + product happy path"
```

### Task 32: Polish — Permission Guards on All Routes

**Files:**
- Modify: existing pages yang belum punya redirect "/forbidden" guard
- Create: `src/lib/auth-guard.ts` (helper)

- [ ] **Step 1: Helper untuk page guard**

`src/lib/auth-guard.ts`:
```ts
import { redirect } from "next/navigation"
import { auth } from "./auth"

export async function requirePagePermission(key: string | string[]) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const required = Array.isArray(key) ? key : [key]
  const has = required.every(k => session.user.permissionKeys.includes(k))
  if (!has) redirect("/forbidden")
  return session
}
```

- [ ] **Step 2: Refactor pages to use helper**

Pattern di semua page:
```tsx
import { requirePagePermission } from "@/lib/auth-guard"

export default async function SomePage() {
  const session = await requirePagePermission("category.read")
  // ... rest
}
```

Apply ke:
- `/master/categories`, `/master/brands`, `/master/units` - read
- `/master/categories/new`, `/master/categories/[id]/edit` (dst untuk semua master) - write
- `/master/products` (read), `/master/products/new` + edit (write)
- `/inventory/stock` - inventory.read
- `/settings/users` - user.read; new/edit - user.write
- `/settings/roles` - role.write
- `/settings/store` + `/settings/general` - setting.write
- `/settings/audit-log` - audit.read

Profile page hanya butuh login (gunakan `requireSession` dari modules/auth/service).

- [ ] **Step 3: Test access control**

Run: `pnpm dev`. Buat user kasir1 (role KASIR). Login as kasir1.
- Navigasi paksa ke `/settings/users` -> redirect ke /forbidden.
- Sidebar tidak menampilkan menu Settings.
- Bisa akses `/master/products` (KASIR punya product.read) tapi `/master/products/new` redirect ke /forbidden.

- [ ] **Step 4: Commit**

```bash
git add . && git commit -m "feat(auth): centralized page permission guard helper, applied to all routes"
```

### Task 33: Documentation — README + Deployment Guide

**Files:**
- Modify: `README.md`
- Create: `docs/DEPLOYMENT.md`

- [ ] **Step 1: README**

`README.md`:
```markdown
# Grosir - Sistem Manajemen Grosir

Aplikasi web internal untuk operasional grosir sembako, rokok, dan cemilan.

## Stack
- Next.js 15 (App Router) + TypeScript strict
- PostgreSQL 16 + Prisma 5
- NextAuth v5 (Auth.js) Credentials
- Tailwind CSS + shadcn/ui

## Prasyarat
- Node 20 LTS (lihat .nvmrc)
- pnpm
- Docker (untuk Postgres dev container)

## Setup Lokal

```bash
# 1. Install deps
pnpm install

# 2. Start Postgres dev
docker compose -f docker-compose.dev.yml up -d

# 3. Copy env
cp .env.example .env

# 4. Migrate + seed
pnpm prisma migrate dev
pnpm db:seed

# 5. Run dev
pnpm dev
```

Login awal: `owner` / `changeme123`. Wajib ganti password dari menu profil sebelum production.

## Scripts

| Command | Tujuan |
|---|---|
| `pnpm dev` | Run dev server |
| `pnpm build` | Build production |
| `pnpm start` | Run production server |
| `pnpm typecheck` | TypeScript validation |
| `pnpm lint` | ESLint |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:integration` | Integration test (butuh postgres-test container) |
| `pnpm e2e` | Playwright E2E |
| `pnpm db:seed` | Seed permissions, roles, owner |
| `pnpm db:reset` | Reset DB (drop + migrate + seed) |

## Dokumen

- `docs/PRD.md` - Vision, milestone, scope
- `docs/SRS.md` - Functional + non-functional requirements
- `docs/SDD.md` - Architecture + data model
- `docs/UI-UX-FLOW.md` - Page map, layout, flow
- `docs/plans/` - Implementation plan per milestone
- `docs/DEPLOYMENT.md` - Production deployment guide

## Milestone

- **M1** Foundation + Master Data + Stock Read-only (sekarang)
- **M2** Transaksi: Pembelian, Penjualan, Stock Movement, Mutasi, Opname
- **M3** Retur, Hutang/Piutang, Laporan
```

- [ ] **Step 2: Deployment guide**

`docs/DEPLOYMENT.md`:
```markdown
# Deployment Guide - Production VPS

## Target
- Ubuntu 22.04 LTS
- Postgres 16 lokal
- Node 20 LTS via NVM
- Nginx reverse proxy + SSL Let's Encrypt
- PM2 process manager

## Langkah

### 1. Server Setup
```bash
# Install Node via NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20

# Install pnpm
npm install -g pnpm

# Install Postgres 16
sudo apt install postgresql-16

# Install Nginx + Certbot
sudo apt install nginx certbot python3-certbot-nginx
```

### 2. Database
```bash
sudo -u postgres psql
CREATE USER grosir WITH PASSWORD 'STRONG_PASSWORD';
CREATE DATABASE grosir OWNER grosir;
\c grosir
CREATE EXTENSION pg_trgm;
\q
```

### 3. App Deploy
```bash
git clone <repo> /opt/grosir
cd /opt/grosir
pnpm install --frozen-lockfile
cp .env.example .env
# Edit .env dengan DATABASE_URL, NEXTAUTH_SECRET (generate dengan `openssl rand -base64 32`), NEXTAUTH_URL=https://domain.com

pnpm prisma migrate deploy
pnpm db:seed
pnpm build
```

### 4. PM2
```bash
npm install -g pm2
pm2 start pnpm --name grosir -- start
pm2 startup
pm2 save
```

### 5. Nginx
```nginx
server {
  listen 80;
  server_name grosir.example.com;
  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  client_max_body_size 10M;
}
```

```bash
sudo certbot --nginx -d grosir.example.com
```

### 6. Backup Cron
```bash
# /etc/cron.d/grosir-backup
0 2 * * * postgres pg_dump -U grosir grosir | gzip > /backup/grosir-$(date +\%Y\%m\%d).sql.gz
0 3 * * * postgres find /backup -name "grosir-*.sql.gz" -mtime +30 -delete
```

### 7. Initial Login
SSH ke server, browse ke domain. Login `owner / changeme123`. Buka /settings/profile, ganti password segera.

## Update Deployment
```bash
cd /opt/grosir
git pull
pnpm install --frozen-lockfile
pnpm prisma migrate deploy
pnpm build
pm2 reload grosir
```

## Rollback
- App: `git checkout <last-good-tag> && pnpm build && pm2 reload`
- DB: restore dari pg_dump backup terdekat
```

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "docs: README + deployment guide for production VPS"
```

### Task 34: Final Verification — Build + Lint + All Tests

**Files:** none

- [ ] **Step 1: Format**

Run: `pnpm format`
Expected: prettier formats all files.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS, no errors.

- [ ] **Step 4: Unit tests**

Run: `pnpm test`
Expected: ALL PASS, coverage di domain service > 80%.

- [ ] **Step 5: Integration tests**

Run: `docker compose -f docker-compose.dev.yml up -d postgres-test`
Run: `pnpm test:integration`
Expected: ALL PASS.

- [ ] **Step 6: E2E tests**

Run: `pnpm db:reset` (reset dev DB to known state)
Run: `pnpm e2e`
Expected: 2 spec PASS.

- [ ] **Step 7: Production build**

Run: `pnpm build`
Expected: PASS, output di `.next/`. No build errors.

- [ ] **Step 8: Manual smoke test**

Run: `pnpm start`. Buka http://localhost:3000.
- Login as owner. Cek dashboard, semua menu master data muncul, navigasi semua page tidak error.
- Buat satu produk lengkap.
- Buat user kasir1, logout owner, login kasir1, verify access control bekerja.
- Logout.

- [ ] **Step 9: Commit + Tag**

```bash
git add .
git commit -m "chore(m1): final formatting + verification"
git tag -a v0.1.0-m1 -m "M1: Foundation & Master Data complete"
```

### Task 35: M1 Recap to Vault Second Brain

**Files:** none (vault writeup)

- [ ] **Step 1: Recap note**

Tulis note ke vault Obsidian (jika ada): `Projects/grosir/M1 Foundation Master Data.md` dengan ringkasan:
- Apa yang selesai
- Decision menarik (HET validation, conversion-to-base model, document numbering helper, trigram search)
- Edge case yang ke-handle (price tier dropped, soft delete guard, version optimistic concurrency)
- Status milestone updated
- Pattern reusable (Server Action wrapper, audit middleware, RBAC 3-layer) -> bisa di-extract ke `Resources/Pattern Library.md` saat M2 mulai

- [ ] **Step 2: Update HANDOFF**

Buat `docs/HANDOFF.md` di repo dengan ringkasan state untuk session next time:
```markdown
# Handoff - State per <date>

## Selesai (M1)
- Foundation: Next.js + Postgres + Prisma + NextAuth + RBAC + audit log
- Master CRUD: Category, Brand, Unit, Warehouse, Supplier, Customer, Product (multi-unit + HET)
- User + Role management dengan permission picker
- Settings (store, general, profile)
- Audit log page
- Inventory Stock read-only
- Dashboard skeleton

## Belum (M2)
- Stock movement + posting transaksi
- Pembelian (PO + Invoice), Penjualan (POS), Mutasi gudang, Stock opname

## Catatan Implementasi
- HET validation: per-base-unit comparison, OWNER bypass
- Document numbering: helper di `src/lib/id.ts`, pakai Counter table (siap dipakai M2)
- StockBalance.minStock: override per gudang, fallback ke Product.minStock
- Test setup: unit (Vitest mock), integration (Postgres test container), E2E (Playwright)
```

- [ ] **Step 3: Commit handoff**

```bash
git add docs/HANDOFF.md
git commit -m "docs: M1 handoff state for next session"
```

---

## Self-Review Checklist (Done)

1. **Spec coverage:**
   - PRD M1 scope (CRUD master, foundation, audit, dashboard skeleton, role): covered di Task 1-29.
   - SRS FR-AUTH-*, FR-RBAC-*: Task 4-6, 8-9, 23-24, 32.
   - SRS FR-PROD-*, FR-CAT-*, FR-BRAND-*, FR-UNIT-*, FR-SUP-*, FR-CUST-*, FR-WH-*, FR-USER-*: Task 13-23.
   - SRS FR-AUDIT-*: Task 11, 26.
   - SRS FR-INV-01,02 (saldo read-only): Task 28. FR-INV-03,04 movement masuk M2.
   - SRS FR-DASH-*: Task 29 (basic, full di M3).
   - NFR concurrency (version field), security (bcrypt, session, CSRF lewat NextAuth): semua diakomodasi.

2. **Placeholder scan:** Tidak ada TBD/TODO. Setiap task punya kode konkret atau struktur explicit ("identik pattern Task 13" + schema field-nya tetap dijabarkan).

3. **Type consistency:** `requirePermission`, `requireSession`, `requirePagePermission` dipakai konsisten. Field `permissionKeys`, `roleNames`, `warehouseIds` di session konsisten lintas Task. `version` field di Product dipakai di Task 19 dan 22.

4. **Bite-size:** setiap step 2-5 menit (write file, run command, commit). Tidak ada step gabungan.

## Execution Handoff

Plan complete dan tersimpan di `docs/plans/M1-foundation-master-data.md`.

Dua opsi eksekusi:

1. **Subagent-Driven (recommended)** - dispatch fresh subagent per task, review antar task, iterasi cepat. Cocok untuk implementasi dengan supervision detail.

2. **Inline Execution** - eksekusi task di session ini dengan checkpoint review.

Yang mana?
