# M2 Transactions & Stock Movement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement stock movement engine + pembelian (PO + faktur) + penjualan (POS) + mutasi antar gudang + stock opname dengan posting yang transactional + idempotent + auditable.

**Architecture:** Server Action layer thin (auth + zod parse + service call + audit). Service layer pure (Prisma client param). Setiap operasi pengubah stok wajib via `applyStockMovement` helper dengan SELECT FOR UPDATE row lock di StockBalance. Document numbering via Counter table dengan UPDATE...RETURNING (atomic). Idempotency key di sale + payment posts. Status state machines untuk PO (DRAFT->SENT->PARTIAL->COMPLETED), Transfer (DRAFT->IN_TRANSIT->COMPLETED), Adjustment (DRAFT->POSTED), Sale/PurchaseInvoice (UNPAID->PARTIAL->PAID->VOID).

**Tech Stack:** Next.js 15 + Prisma 6 + decimal.js. No new top-level deps; reuses M1 lib helpers (audit, errors, result, money, date, id).

**Reference Specs:**
- `docs/SDD.md` Section 3.3-3.5 (data model: StockMovement, StockAdjustment, StockTransfer, PurchaseOrder, PurchaseInvoice, SaleInvoice)
- `docs/SDD.md` Section 4 (algoritma posting)
- `docs/SRS.md` FR-INV-* / FR-PO-* / FR-PINV-* / FR-SALE-* / FR-XFR-* / FR-ADJ-* / FR-OPNAME-*
- `docs/UI-UX-FLOW.md` Section 10-13 (POS, faktur pembelian, transfer, opname)
- `docs/HANDOFF.md` (M1 state, known issues, M2 prerequisites)

---

## File Structure

```
prisma/
  schema.prisma                          # ADD ~10 new models (StockMovement, StockAdjustment, etc)
  migrations/                            # ADD migration: m2_transaction_models

src/
  lib/
    stock-movement.ts                    # ADD: applyStockMovement helper (SELECT FOR UPDATE)
    document-number.ts                   # ADD: nextDocumentCode helper (atomic counter)
  modules/
    inventory-adjustment/
      schema.ts                          # zod input
      service.ts                         # createAdjustment, postAdjustment
      queries.ts                         # listAdjustments, getById
      actions.ts                         # Server Actions
      components/
        adjustment-form.tsx
        adjustment-detail.tsx
    inventory-transfer/
      schema.ts
      service.ts                         # createTransfer, sendTransfer, receiveTransfer
      queries.ts
      actions.ts
      components/
        transfer-form.tsx
        transfer-receive-form.tsx
        transfer-detail.tsx
    inventory-opname/
      schema.ts
      service.ts                         # generateWorksheet, postOpname
      queries.ts
      actions.ts
      components/
        opname-worksheet.tsx
    purchase-order/
      schema.ts
      service.ts                         # createPO, sendPO, cancelPO
      queries.ts
      actions.ts
      components/
        po-form.tsx
        po-detail.tsx
    purchase-invoice/
      schema.ts
      service.ts                         # createFromPO, createDirect, postInvoice, voidInvoice
      queries.ts
      actions.ts
      components/
        invoice-form.tsx
        invoice-detail.tsx
    sale-pos/
      schema.ts
      service.ts                         # postSale, voidSale, applyPayment
      queries.ts
      actions.ts
      components/
        pos-cart.tsx                     # 2-pane POS layout
        pos-product-search.tsx           # search/scan barcode
        pos-payment-modal.tsx
    sale-invoice/                        # list + detail + receipt print
      queries.ts
      components/
        invoice-list.tsx
        invoice-detail.tsx
  app/(dashboard)/
    inventory/
      adjustments/page.tsx
      adjustments/new/page.tsx
      adjustments/[id]/page.tsx
      transfers/page.tsx
      transfers/new/page.tsx
      transfers/[id]/page.tsx
      transfers/[id]/receive/page.tsx
      opname/page.tsx
    purchase/
      orders/page.tsx
      orders/new/page.tsx
      orders/[id]/page.tsx
      invoices/page.tsx
      invoices/new/page.tsx
      invoices/[id]/page.tsx
    sale/
      pos/page.tsx                       # POS layout
      invoices/page.tsx
      invoices/[id]/page.tsx
  components/layout/
    nav-config.ts                        # MODIFY: add Inventaris/Pembelian/Penjualan menu items

tests/
  unit/
    lib/
      stock-movement.test.ts             # SELECT FOR UPDATE, balance compute, negative stock
      document-number.test.ts            # atomic counter format
    modules/
      inventory-adjustment/service.test.ts
      inventory-transfer/service.test.ts
      purchase-invoice/service.test.ts   # posting flow + reverse on void
      sale-pos/service.test.ts           # posting + credit limit + idempotency
  integration/                           # ADD: integration test infrastructure
    setup.ts                             # postgres test container, reset between tests
    flows/
      sale-cash.test.ts                  # full happy path posting
      purchase-invoice.test.ts
      transfer-cycle.test.ts             # send + receive
      opname.test.ts
```

## Task Numbering

- **Phase A — Schema & Core (Task 1-4):** Prisma migration + applyStockMovement + document numbering
- **Phase B — Inventaris (Task 5-12):** Adjustment, Transfer, Opname (all stock-only, no money)
- **Phase C — Pembelian (Task 13-18):** PurchaseOrder, PurchaseInvoice, posting + payable creation
- **Phase D — Penjualan (Task 19-26):** POS UI, sale posting, void, sale list
- **Phase E — Test infra & polish (Task 27-30):** integration test setup, navigation update, M2 recap

---

## Phase A - Schema & Core

### Task 1: Prisma Schema - Stock Movement & Transaction Models

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_m2_transactions/migration.sql`

- [ ] **Step 1: Add stock movement models to schema.prisma**

Append after `StockBalance`:

```prisma
enum MovementDirection {
  IN
  OUT
}

enum MovementType {
  PURCHASE
  SALE
  ADJUSTMENT
  TRANSFER_IN
  TRANSFER_OUT
  RETURN_IN
  RETURN_OUT
  OPNAME
}

model StockMovement {
  id           String            @id @default(cuid())
  productId    String
  warehouseId  String
  qtyInBase    Decimal           @db.Decimal(15, 4)
  direction    MovementDirection
  movementType MovementType
  refType      String
  refId        String
  occurredAt   DateTime          @default(now())
  createdById  String
  note         String?

  product   Product   @relation(fields: [productId], references: [id])
  warehouse Warehouse @relation(fields: [warehouseId], references: [id])
  createdBy User      @relation(fields: [createdById], references: [id])

  @@index([productId, warehouseId, occurredAt])
  @@index([refType, refId])
}

enum AdjustmentReason {
  RUSAK
  HILANG
  OPNAME
  KOREKSI
  LAINNYA
}

enum AdjustmentStatus {
  DRAFT
  POSTED
  CANCELLED
}

model StockAdjustment {
  id          String           @id @default(cuid())
  code        String           @unique
  warehouseId String
  reason      AdjustmentReason
  status      AdjustmentStatus @default(DRAFT)
  note        String?
  createdById String
  postedAt    DateTime?
  postedById  String?
  items       StockAdjustmentItem[]

  warehouse Warehouse @relation(fields: [warehouseId], references: [id])
  createdBy User      @relation("AdjustmentCreatedBy", fields: [createdById], references: [id])
  postedBy  User?     @relation("AdjustmentPostedBy", fields: [postedById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([warehouseId])
  @@index([status])
}

model StockAdjustmentItem {
  id            String  @id @default(cuid())
  adjustmentId  String
  productId     String
  qtyInBaseDiff Decimal @db.Decimal(15, 4)
  note          String?

  adjustment StockAdjustment @relation(fields: [adjustmentId], references: [id], onDelete: Cascade)
  product    Product         @relation(fields: [productId], references: [id])
}

enum TransferStatus {
  DRAFT
  IN_TRANSIT
  COMPLETED
  CANCELLED
}

model StockTransfer {
  id              String         @id @default(cuid())
  code            String         @unique
  fromWarehouseId String
  toWarehouseId   String
  status          TransferStatus @default(DRAFT)
  note            String?
  createdById     String
  sentAt          DateTime?
  receivedAt      DateTime?
  receivedById    String?
  items           StockTransferItem[]

  fromWarehouse Warehouse @relation("TransferFrom", fields: [fromWarehouseId], references: [id])
  toWarehouse   Warehouse @relation("TransferTo", fields: [toWarehouseId], references: [id])
  createdBy     User      @relation("TransferCreatedBy", fields: [createdById], references: [id])
  receivedBy    User?     @relation("TransferReceivedBy", fields: [receivedById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status])
}

model StockTransferItem {
  id         String  @id @default(cuid())
  transferId String
  productId  String
  qtyInBase  Decimal @db.Decimal(15, 4)

  transfer StockTransfer @relation(fields: [transferId], references: [id], onDelete: Cascade)
  product  Product       @relation(fields: [productId], references: [id])
}
```

- [ ] **Step 2: Add purchase models to schema.prisma**

```prisma
enum PurchaseOrderStatus {
  DRAFT
  SENT
  PARTIAL
  COMPLETED
  CANCELLED
}

model PurchaseOrder {
  id           String              @id @default(cuid())
  code         String              @unique
  supplierId   String
  warehouseId  String
  orderDate    DateTime
  expectedDate DateTime?
  status       PurchaseOrderStatus @default(DRAFT)
  total        Decimal             @db.Decimal(15, 2)
  note         String?
  createdById  String
  items        PurchaseOrderItem[]
  invoices     PurchaseInvoice[]

  supplier  Supplier  @relation(fields: [supplierId], references: [id])
  warehouse Warehouse @relation(fields: [warehouseId], references: [id])
  createdBy User      @relation("POCreatedBy", fields: [createdById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([supplierId])
  @@index([status])
}

model PurchaseOrderItem {
  id            String  @id @default(cuid())
  poId          String
  productUnitId String
  qty           Decimal @db.Decimal(15, 4)
  qtyReceived   Decimal @db.Decimal(15, 4) @default(0)
  price         Decimal @db.Decimal(15, 2)
  discount      Decimal @db.Decimal(15, 2) @default(0)
  subtotal      Decimal @db.Decimal(15, 2)

  po          PurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)
  productUnit ProductUnit   @relation(fields: [productUnitId], references: [id])
}

enum PurchaseInvoiceStatus {
  UNPAID
  PARTIAL
  PAID
  VOID
}

model PurchaseInvoice {
  id                String                @id @default(cuid())
  code              String                @unique
  poId              String?
  supplierId        String
  warehouseId       String
  supplierInvoiceNo String?
  invoiceDate       DateTime
  dueDate           DateTime
  subtotal          Decimal               @db.Decimal(15, 2)
  discount          Decimal               @db.Decimal(15, 2) @default(0)
  tax               Decimal               @db.Decimal(15, 2) @default(0)
  total             Decimal               @db.Decimal(15, 2)
  paidAmount        Decimal               @db.Decimal(15, 2) @default(0)
  status            PurchaseInvoiceStatus @default(UNPAID)
  note              String?
  createdById       String
  postedAt          DateTime
  voidedAt          DateTime?
  voidedById        String?
  voidReason        String?
  items             PurchaseInvoiceItem[]

  po        PurchaseOrder? @relation(fields: [poId], references: [id])
  supplier  Supplier       @relation(fields: [supplierId], references: [id])
  warehouse Warehouse      @relation(fields: [warehouseId], references: [id])
  createdBy User           @relation("PInvCreatedBy", fields: [createdById], references: [id])
  voidedBy  User?          @relation("PInvVoidedBy", fields: [voidedById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([supplierId])
  @@index([status])
}

model PurchaseInvoiceItem {
  id            String  @id @default(cuid())
  invoiceId     String
  productUnitId String
  qty           Decimal @db.Decimal(15, 4)
  qtyReturned   Decimal @db.Decimal(15, 4) @default(0)
  price         Decimal @db.Decimal(15, 2)
  discount      Decimal @db.Decimal(15, 2) @default(0)
  subtotal      Decimal @db.Decimal(15, 2)

  invoice     PurchaseInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  productUnit ProductUnit     @relation(fields: [productUnitId], references: [id])
}
```

- [ ] **Step 3: Add sale models to schema.prisma**

```prisma
enum SaleType {
  CASH
  CREDIT
}

enum SaleStatus {
  DRAFT
  UNPAID
  PARTIAL
  PAID
  VOID
}

enum PaymentMethod {
  TUNAI
  TRANSFER
  QRIS
  KARTU
}

model SaleInvoice {
  id            String         @id @default(cuid())
  code          String         @unique
  customerId    String?
  warehouseId   String
  saleType      SaleType       @default(CASH)
  invoiceDate   DateTime
  dueDate       DateTime?
  subtotal      Decimal        @db.Decimal(15, 2)
  discount      Decimal        @db.Decimal(15, 2) @default(0)
  tax           Decimal        @db.Decimal(15, 2) @default(0)
  total         Decimal        @db.Decimal(15, 2)
  paidAmount    Decimal        @db.Decimal(15, 2) @default(0)
  changeAmount  Decimal        @db.Decimal(15, 2) @default(0)
  status        SaleStatus
  paymentMethod PaymentMethod?
  paymentRefNo  String?
  note          String?
  createdById   String
  postedAt      DateTime
  voidedAt      DateTime?
  voidedById    String?
  voidReason    String?
  items         SaleInvoiceItem[]

  customer  Customer? @relation(fields: [customerId], references: [id])
  warehouse Warehouse @relation(fields: [warehouseId], references: [id])
  createdBy User      @relation("SaleCreatedBy", fields: [createdById], references: [id])
  voidedBy  User?     @relation("SaleVoidedBy", fields: [voidedById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([customerId])
  @@index([status, postedAt])
}

model SaleInvoiceItem {
  id            String  @id @default(cuid())
  invoiceId     String
  productUnitId String
  qty           Decimal @db.Decimal(15, 4)
  qtyReturned   Decimal @db.Decimal(15, 4) @default(0)
  price         Decimal @db.Decimal(15, 2)
  discount      Decimal @db.Decimal(15, 2) @default(0)
  subtotal      Decimal @db.Decimal(15, 2)

  invoice     SaleInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  productUnit ProductUnit @relation(fields: [productUnitId], references: [id])
}
```

- [ ] **Step 4: Add inverse relations to existing models**

Modify these existing models in `schema.prisma`:

`User` model: add reverse relations:
```prisma
  movementsCreated     StockMovement[]
  adjustmentsCreated   StockAdjustment[]   @relation("AdjustmentCreatedBy")
  adjustmentsPosted    StockAdjustment[]   @relation("AdjustmentPostedBy")
  transfersCreated     StockTransfer[]     @relation("TransferCreatedBy")
  transfersReceived    StockTransfer[]     @relation("TransferReceivedBy")
  posCreated           PurchaseOrder[]     @relation("POCreatedBy")
  pInvCreated          PurchaseInvoice[]   @relation("PInvCreatedBy")
  pInvVoided           PurchaseInvoice[]   @relation("PInvVoidedBy")
  salesCreated         SaleInvoice[]       @relation("SaleCreatedBy")
  salesVoided          SaleInvoice[]       @relation("SaleVoidedBy")
```

`Warehouse` model: add reverse relations:
```prisma
  movements        StockMovement[]
  adjustments      StockAdjustment[]
  transfersFrom    StockTransfer[]   @relation("TransferFrom")
  transfersTo      StockTransfer[]   @relation("TransferTo")
  purchaseOrders   PurchaseOrder[]
  purchaseInvoices PurchaseInvoice[]
  sales            SaleInvoice[]
```

`Product` model: add:
```prisma
  movements          StockMovement[]
  adjustmentItems    StockAdjustmentItem[]
  transferItems      StockTransferItem[]
```

`ProductUnit` model: add:
```prisma
  poItems          PurchaseOrderItem[]
  pInvItems        PurchaseInvoiceItem[]
  saleItems        SaleInvoiceItem[]
```

`Supplier` model: add:
```prisma
  purchaseOrders   PurchaseOrder[]
  purchaseInvoices PurchaseInvoice[]
```

`Customer` model: add:
```prisma
  sales SaleInvoice[]
```

- [ ] **Step 5: Generate + apply migration**

Run: `pnpm prisma migrate dev --name m2_transactions`
Expected: migration created + applied. Prisma client regenerated with new types.

- [ ] **Step 6: Verify**

```bash
pnpm prisma validate
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```
All PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add M2 transaction models (stock movement, adjustment, transfer, PO, invoice, sale)"
```

### Task 2: Document Numbering Helper

**Files:**
- Create: `src/lib/document-number.ts`
- Test: `tests/unit/lib/document-number.test.ts`

- [ ] **Step 1: Write document numbering helper**

```ts
import type { Prisma, PrismaClient } from "@prisma/client"
import { generateCode } from "./id"
import { formatYearMonth } from "./date"

type Db = PrismaClient | Prisma.TransactionClient

/**
 * Atomically increment a counter and return the formatted document code.
 * Format: {PREFIX}-{YYYYMM}-{seq:04}, e.g. "INV-202605-0001"
 *
 * Counter key: {TYPE}_{YYYYMM} so each month restarts from 0001.
 */
export async function nextDocumentCode(
  db: Db,
  type: string,
  prefix: string,
  date: Date = new Date()
): Promise<string> {
  const ym = formatYearMonth(date)
  const key = `${type}_${ym}`
  const result = await db.$queryRawUnsafe<{ value: number }[]>(
    `INSERT INTO "Counter" (key, value) VALUES ($1, 1)
     ON CONFLICT (key) DO UPDATE SET value = "Counter".value + 1
     RETURNING value`,
    key
  )
  const seq = result[0]?.value ?? 1
  return generateCode(prefix, seq, ym)
}

export const DOC_TYPES = {
  PO: { type: "PURCHASE_ORDER", prefix: "PO" },
  PINV: { type: "PURCHASE_INVOICE", prefix: "INV" },
  SALE: { type: "SALE", prefix: "SO" },
  ADJ: { type: "STOCK_ADJUSTMENT", prefix: "ADJ" },
  XFR: { type: "STOCK_TRANSFER", prefix: "XFR" },
  PRET: { type: "PURCHASE_RETURN", prefix: "RTNB" },
  SRET: { type: "SALE_RETURN", prefix: "RTNJ" }
} as const
```

- [ ] **Step 2: Write test**

`tests/unit/lib/document-number.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended"
import type { PrismaClient } from "@prisma/client"
import { nextDocumentCode, DOC_TYPES } from "@/lib/document-number"

let prisma: DeepMockProxy<PrismaClient>

beforeEach(() => {
  prisma = mockDeep<PrismaClient>()
  mockReset(prisma)
})

describe("nextDocumentCode", () => {
  it("formats with current year-month and incremented sequence", async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([{ value: 1 }] as never)
    const result = await nextDocumentCode(
      prisma,
      DOC_TYPES.SALE.type,
      DOC_TYPES.SALE.prefix,
      new Date("2026-05-28T05:00:00Z")
    )
    expect(result).toBe("SO-202605-0001")
  })

  it("uses returned sequence value", async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([{ value: 9999 }] as never)
    const result = await nextDocumentCode(
      prisma,
      DOC_TYPES.PO.type,
      DOC_TYPES.PO.prefix,
      new Date("2026-05-28T05:00:00Z")
    )
    expect(result).toBe("PO-202605-9999")
  })

  it("calls $queryRawUnsafe with correct key format", async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([{ value: 1 }] as never)
    await nextDocumentCode(prisma, "SALE", "SO", new Date("2026-05-28T05:00:00Z"))
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.any(String),
      "SALE_202605"
    )
  })
})
```

- [ ] **Step 3: Run test + verify**

```bash
pnpm test tests/unit/lib/document-number
```
Expected: 3 PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/document-number.ts tests/unit/lib/document-number.test.ts
git commit -m "feat(lib): atomic document number helper with monthly counter"
```

### Task 3: Stock Movement Helper (applyStockMovement)

**Files:**
- Create: `src/lib/stock-movement.ts`
- Test: `tests/unit/lib/stock-movement.test.ts`

- [ ] **Step 1: Write applyStockMovement helper**

```ts
import type { Prisma } from "@prisma/client"
import Decimal from "decimal.js"
import { AppError } from "./errors"

type Tx = Prisma.TransactionClient

export interface ApplyMovementParams {
  productId: string
  warehouseId: string
  qtyInBase: Decimal | number | string
  direction: "IN" | "OUT"
  movementType:
    | "PURCHASE"
    | "SALE"
    | "ADJUSTMENT"
    | "TRANSFER_IN"
    | "TRANSFER_OUT"
    | "RETURN_IN"
    | "RETURN_OUT"
    | "OPNAME"
  refType: string
  refId: string
  actorId: string
  note?: string | null
  allowNegative?: boolean
}

const ALLOW_NEGATIVE_TYPES = new Set(["ADJUSTMENT", "OPNAME"])

/**
 * Apply a stock movement: lock balance row FOR UPDATE, mutate balance, write movement.
 * MUST run inside a Prisma $transaction (interactive). Throws on insufficient stock.
 *
 * Returns the new balance value as a Decimal.
 */
export async function applyStockMovement(
  tx: Tx,
  params: ApplyMovementParams
): Promise<Decimal> {
  const qty = new Decimal(params.qtyInBase)
  if (qty.isNegative() || qty.isZero()) {
    throw new AppError("INVALID_INPUT", "Qty stock movement harus > 0")
  }

  // SELECT FOR UPDATE the balance row (lock for serializable update)
  const rows = await tx.$queryRawUnsafe<{ qty_in_base: string }[]>(
    `SELECT qty_in_base::text FROM "StockBalance"
     WHERE "productId" = $1 AND "warehouseId" = $2
     FOR UPDATE`,
    params.productId,
    params.warehouseId
  )
  const current = rows[0] ? new Decimal(rows[0].qty_in_base) : new Decimal(0)
  const delta = params.direction === "IN" ? qty : qty.neg()
  const next = current.plus(delta)

  // Negative stock guard (skip for adjustment/opname which can post negative diffs explicitly)
  if (
    next.isNegative() &&
    !params.allowNegative &&
    !ALLOW_NEGATIVE_TYPES.has(params.movementType)
  ) {
    throw new AppError(
      "STOCK_INSUFFICIENT",
      `Stok tidak cukup. Saldo saat ini ${current.toString()}, mau dikurangi ${qty.toString()}.`
    )
  }

  // Upsert balance
  await tx.stockBalance.upsert({
    where: {
      productId_warehouseId: {
        productId: params.productId,
        warehouseId: params.warehouseId
      }
    },
    create: {
      productId: params.productId,
      warehouseId: params.warehouseId,
      qtyInBase: next
    },
    update: { qtyInBase: next }
  })

  // Insert immutable movement record
  await tx.stockMovement.create({
    data: {
      productId: params.productId,
      warehouseId: params.warehouseId,
      qtyInBase: qty,
      direction: params.direction,
      movementType: params.movementType,
      refType: params.refType,
      refId: params.refId,
      createdById: params.actorId,
      note: params.note ?? null
    }
  })

  return next
}
```

- [ ] **Step 2: Write integration-style test (with mock prisma)**

`tests/unit/lib/stock-movement.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest"
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended"
import type { Prisma } from "@prisma/client"
import Decimal from "decimal.js"
import { applyStockMovement } from "@/lib/stock-movement"
import { AppError } from "@/lib/errors"

type Tx = Prisma.TransactionClient
let tx: DeepMockProxy<Tx>

beforeEach(() => {
  tx = mockDeep<Tx>()
  mockReset(tx)
})

describe("applyStockMovement", () => {
  const baseParams = {
    productId: "p1",
    warehouseId: "w1",
    refType: "Test",
    refId: "r1",
    actorId: "u1"
  }

  it("rejects qty <= 0", async () => {
    await expect(
      applyStockMovement(tx, {
        ...baseParams,
        qtyInBase: 0,
        direction: "IN",
        movementType: "PURCHASE"
      })
    ).rejects.toBeInstanceOf(AppError)
  })

  it("computes new balance from existing row + IN direction", async () => {
    tx.$queryRawUnsafe.mockResolvedValue([{ qty_in_base: "100" }] as never)
    tx.stockBalance.upsert.mockResolvedValue({} as never)
    tx.stockMovement.create.mockResolvedValue({} as never)
    const next = await applyStockMovement(tx, {
      ...baseParams,
      qtyInBase: 50,
      direction: "IN",
      movementType: "PURCHASE"
    })
    expect(next.toNumber()).toBe(150)
  })

  it("computes new balance OUT direction", async () => {
    tx.$queryRawUnsafe.mockResolvedValue([{ qty_in_base: "100" }] as never)
    tx.stockBalance.upsert.mockResolvedValue({} as never)
    tx.stockMovement.create.mockResolvedValue({} as never)
    const next = await applyStockMovement(tx, {
      ...baseParams,
      qtyInBase: 30,
      direction: "OUT",
      movementType: "SALE"
    })
    expect(next.toNumber()).toBe(70)
  })

  it("creates balance from zero when no row exists", async () => {
    tx.$queryRawUnsafe.mockResolvedValue([] as never)
    tx.stockBalance.upsert.mockResolvedValue({} as never)
    tx.stockMovement.create.mockResolvedValue({} as never)
    const next = await applyStockMovement(tx, {
      ...baseParams,
      qtyInBase: 25,
      direction: "IN",
      movementType: "PURCHASE"
    })
    expect(next.toNumber()).toBe(25)
  })

  it("throws on insufficient stock when OUT and no allowNegative", async () => {
    tx.$queryRawUnsafe.mockResolvedValue([{ qty_in_base: "10" }] as never)
    await expect(
      applyStockMovement(tx, {
        ...baseParams,
        qtyInBase: 50,
        direction: "OUT",
        movementType: "SALE"
      })
    ).rejects.toBeInstanceOf(AppError)
  })

  it("allows negative balance when allowNegative=true", async () => {
    tx.$queryRawUnsafe.mockResolvedValue([{ qty_in_base: "10" }] as never)
    tx.stockBalance.upsert.mockResolvedValue({} as never)
    tx.stockMovement.create.mockResolvedValue({} as never)
    const next = await applyStockMovement(tx, {
      ...baseParams,
      qtyInBase: 50,
      direction: "OUT",
      movementType: "SALE",
      allowNegative: true
    })
    expect(next.toNumber()).toBe(-40)
  })

  it("allows negative balance for ADJUSTMENT/OPNAME without flag", async () => {
    tx.$queryRawUnsafe.mockResolvedValue([{ qty_in_base: "5" }] as never)
    tx.stockBalance.upsert.mockResolvedValue({} as never)
    tx.stockMovement.create.mockResolvedValue({} as never)
    const next = await applyStockMovement(tx, {
      ...baseParams,
      qtyInBase: 10,
      direction: "OUT",
      movementType: "ADJUSTMENT"
    })
    expect(next.toNumber()).toBe(-5)
  })
})
```

- [ ] **Step 3: Run test**

```bash
pnpm test tests/unit/lib/stock-movement
```
Expected: 7 PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/stock-movement.ts tests/unit/lib/stock-movement.test.ts
git commit -m "feat(lib): applyStockMovement with SELECT FOR UPDATE row lock + negative stock guard"
```

### Task 4: Setting Helper for allow_negative_stock

**Files:**
- Create: `src/lib/setting.ts`

- [ ] **Step 1: Setting helper**

```ts
import type { Prisma, PrismaClient } from "@prisma/client"

type Db = PrismaClient | Prisma.TransactionClient

export async function getSetting(db: Db, key: string): Promise<string | null> {
  const row = await db.setting.findUnique({ where: { key } })
  return row?.value ?? null
}

export async function getBooleanSetting(
  db: Db,
  key: string,
  defaultValue = false
): Promise<boolean> {
  const v = await getSetting(db, key)
  if (v === null) return defaultValue
  return v === "true"
}
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm typecheck
git add src/lib/setting.ts
git commit -m "feat(lib): setting getter helpers"
```

---

## Phase B - Inventaris

### Task 5: Stock Adjustment - Schema + Service

**Files:**
- Create: `src/modules/inventory-adjustment/{schema,service,queries}.ts`
- Test: `tests/unit/modules/inventory-adjustment/service.test.ts`

- [ ] **Step 1: Schema**

`src/modules/inventory-adjustment/schema.ts`:
```ts
import { z } from "zod"

export const adjustmentItemSchema = z.object({
  productId: z.string().cuid(),
  qtyInBaseDiff: z.coerce.number().refine((v) => v !== 0, "Diff harus != 0"),
  note: z.string().max(200).nullable().optional()
})

export const createAdjustmentSchema = z.object({
  warehouseId: z.string().cuid(),
  reason: z.enum(["RUSAK", "HILANG", "OPNAME", "KOREKSI", "LAINNYA"]),
  note: z.string().max(500).nullable().optional(),
  items: z.array(adjustmentItemSchema).min(1, "Minimal 1 item")
})

export const postAdjustmentSchema = z.object({
  id: z.string().cuid()
})

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>
export type PostAdjustmentInput = z.infer<typeof postAdjustmentSchema>
```

- [ ] **Step 2: Service**

`src/modules/inventory-adjustment/service.ts`:
```ts
import type { Prisma, PrismaClient } from "@prisma/client"
import Decimal from "decimal.js"
import { AppError } from "@/lib/errors"
import { applyStockMovement } from "@/lib/stock-movement"
import { nextDocumentCode, DOC_TYPES } from "@/lib/document-number"
import type { CreateAdjustmentInput } from "./schema"

type Db = PrismaClient | Prisma.TransactionClient
type Tx = Prisma.TransactionClient

export async function createAdjustment(
  tx: Tx,
  input: CreateAdjustmentInput,
  actorId: string
) {
  const code = await nextDocumentCode(tx, DOC_TYPES.ADJ.type, DOC_TYPES.ADJ.prefix)
  return tx.stockAdjustment.create({
    data: {
      code,
      warehouseId: input.warehouseId,
      reason: input.reason,
      status: "DRAFT",
      note: input.note ?? null,
      createdById: actorId,
      items: {
        create: input.items.map((i) => ({
          productId: i.productId,
          qtyInBaseDiff: new Decimal(i.qtyInBaseDiff),
          note: i.note ?? null
        }))
      }
    }
  })
}

export async function postAdjustment(tx: Tx, id: string, actorId: string) {
  const adj = await tx.stockAdjustment.findUnique({
    where: { id },
    include: { items: true }
  })
  if (!adj) throw new AppError("NOT_FOUND", "Adjustment tidak ditemukan")
  if (adj.status === "POSTED") {
    throw new AppError("INVALID_INPUT", "Adjustment sudah di-post")
  }
  if (adj.status === "CANCELLED") {
    throw new AppError("INVALID_INPUT", "Adjustment sudah dibatalkan")
  }

  for (const item of adj.items) {
    const diff = new Decimal(item.qtyInBaseDiff)
    if (diff.isZero()) continue
    await applyStockMovement(tx, {
      productId: item.productId,
      warehouseId: adj.warehouseId,
      qtyInBase: diff.abs(),
      direction: diff.isPositive() ? "IN" : "OUT",
      movementType: adj.reason === "OPNAME" ? "OPNAME" : "ADJUSTMENT",
      refType: "StockAdjustment",
      refId: adj.id,
      actorId,
      note: item.note ?? adj.note
    })
  }

  return tx.stockAdjustment.update({
    where: { id },
    data: { status: "POSTED", postedAt: new Date(), postedById: actorId }
  })
}

export async function cancelAdjustment(db: Db, id: string) {
  const current = await db.stockAdjustment.findUnique({ where: { id } })
  if (!current) throw new AppError("NOT_FOUND", "Adjustment tidak ditemukan")
  if (current.status !== "DRAFT") {
    throw new AppError("INVALID_INPUT", "Hanya DRAFT yang bisa dibatalkan")
  }
  return db.stockAdjustment.update({
    where: { id },
    data: { status: "CANCELLED" }
  })
}
```

- [ ] **Step 3: Queries**

`src/modules/inventory-adjustment/queries.ts`:
```ts
import { prisma } from "@/lib/db"

export async function listAdjustments(params: {
  warehouseId?: string
  status?: string
  page?: number
  pageSize?: number
}) {
  const { warehouseId, status, page = 1, pageSize = 25 } = params
  const where: Record<string, unknown> = {}
  if (warehouseId) where.warehouseId = warehouseId
  if (status) where.status = status

  const [items, total] = await Promise.all([
    prisma.stockAdjustment.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.stockAdjustment.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getAdjustmentById(id: string) {
  return prisma.stockAdjustment.findUnique({
    where: { id },
    include: {
      warehouse: true,
      createdBy: { select: { id: true, name: true, username: true } },
      postedBy: { select: { id: true, name: true, username: true } },
      items: {
        include: {
          product: {
            include: { baseUnit: { select: { name: true } } }
          }
        }
      }
    }
  })
}
```

- [ ] **Step 4: Test service**

`tests/unit/modules/inventory-adjustment/service.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended"
import type { Prisma } from "@prisma/client"
import { postAdjustment, cancelAdjustment } from "@/modules/inventory-adjustment/service"
import { AppError } from "@/lib/errors"

type Tx = Prisma.TransactionClient
let tx: DeepMockProxy<Tx>

beforeEach(() => {
  tx = mockDeep<Tx>()
  mockReset(tx)
})

describe("postAdjustment", () => {
  it("throws if adjustment not found", async () => {
    tx.stockAdjustment.findUnique.mockResolvedValue(null)
    await expect(postAdjustment(tx, "x", "u1")).rejects.toBeInstanceOf(AppError)
  })

  it("rejects if already POSTED", async () => {
    tx.stockAdjustment.findUnique.mockResolvedValue({
      status: "POSTED",
      items: []
    } as never)
    await expect(postAdjustment(tx, "x", "u1")).rejects.toBeInstanceOf(AppError)
  })

  it("rejects if CANCELLED", async () => {
    tx.stockAdjustment.findUnique.mockResolvedValue({
      status: "CANCELLED",
      items: []
    } as never)
    await expect(postAdjustment(tx, "x", "u1")).rejects.toBeInstanceOf(AppError)
  })
})

describe("cancelAdjustment", () => {
  it("rejects non-DRAFT", async () => {
    tx.stockAdjustment.findUnique.mockResolvedValue({
      id: "a1",
      status: "POSTED"
    } as never)
    await expect(cancelAdjustment(tx, "a1")).rejects.toBeInstanceOf(AppError)
  })
})
```

- [ ] **Step 5: Run + commit**

```bash
pnpm test tests/unit/modules/inventory-adjustment
git add src/modules/inventory-adjustment/ tests/unit/modules/inventory-adjustment/
git commit -m "feat(adjustment): schema + service + tests for stock adjustment"
```

### Task 6: Stock Adjustment - Actions + Pages

**Files:**
- Create: `src/modules/inventory-adjustment/actions.ts`
- Create: `src/modules/inventory-adjustment/components/adjustment-form.tsx`
- Create: `src/app/(dashboard)/inventory/adjustments/{page.tsx,new/page.tsx,[id]/page.tsx}`

- [ ] **Step 1: Actions**

`src/modules/inventory-adjustment/actions.ts`:
```ts
"use server"
import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { createAdjustmentSchema } from "./schema"
import { createAdjustment, postAdjustment, cancelAdjustment } from "./service"

export async function createAdjustmentAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("inventory.adjustment.create")
    const parsed = createAdjustmentSchema.parse(input)
    const created = await prisma.$transaction(async (tx) => {
      const result = await createAdjustment(tx, parsed, session.user.id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "StockAdjustment",
        entityId: result.id,
        action: AuditAction.CREATE,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/inventory/adjustments")
    return { id: created.id, code: created.code }
  })
}

export async function postAdjustmentAction(id: string) {
  return action(async () => {
    const session = await requirePermission("inventory.adjustment.post")
    const result = await prisma.$transaction(async (tx) => {
      const posted = await postAdjustment(tx, id, session.user.id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "StockAdjustment",
        entityId: id,
        action: AuditAction.POST,
        after: posted as unknown as Record<string, unknown>
      })
      return posted
    })
    revalidatePath("/inventory/adjustments")
    revalidatePath(`/inventory/adjustments/${id}`)
    return result
  })
}

export async function cancelAdjustmentAction(id: string) {
  return action(async () => {
    const session = await requirePermission("inventory.adjustment.create")
    await prisma.$transaction(async (tx) => {
      const before = await tx.stockAdjustment.findUnique({ where: { id } })
      const result = await cancelAdjustment(tx, id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "StockAdjustment",
        entityId: id,
        action: AuditAction.UPDATE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
    })
    revalidatePath("/inventory/adjustments")
  })
}
```

- [ ] **Step 2: Form component**

Form fields: warehouse select (default current), reason select, items array (product autocomplete + qtyDiff numeric + note), submit posts as DRAFT then user reviews + clicks "Post" on detail page.

Pattern follows Task 13 (Category) Form but with field array via `useFieldArray`. Search products via existing `prisma.product.findMany({ where: { deletedAt: null, isActive: true }, select: { id, sku, name, baseUnit: { name } }, take: 50 })` exposed in queries.ts.

- [ ] **Step 3: List page**

`src/app/(dashboard)/inventory/adjustments/page.tsx` follows pattern from M1 Task 13:
- Permission: `inventory.adjustment.create` (read level - shown if user can create)
- Columns: code, warehouse, reason, status (badge color: DRAFT=gray, POSTED=green, CANCELLED=red), createdBy, createdAt, items count
- "Tambah" button -> /inventory/adjustments/new

- [ ] **Step 4: New page**

Calls `listAllWarehousesForSelect()` for warehouse dropdown. Renders AdjustmentForm.

- [ ] **Step 5: Detail page**

Read-only view + Post/Cancel buttons (conditional on status=DRAFT, permission inventory.adjustment.post).
Uses `ConfirmDialog` for posting confirmation: "Posting akan mengubah stok permanent. Lanjut?"

- [ ] **Step 6: Verify + commit**

```bash
pnpm typecheck
pnpm test
pnpm build
git add src/modules/inventory-adjustment/ src/app/\(dashboard\)/inventory/adjustments/
git commit -m "feat(adjustment): pages + form + post/cancel actions"
```
### Task 7: Stock Transfer - Schema + Service

**Files:**
- Create: `src/modules/inventory-transfer/{schema,service,queries}.ts`
- Test: `tests/unit/modules/inventory-transfer/service.test.ts`

- [ ] **Step 1: Schema**

```ts
import { z } from "zod"

export const transferItemSchema = z.object({
  productId: z.string().cuid(),
  qtyInBase: z.coerce.number().positive("Qty harus > 0")
})

export const createTransferSchema = z
  .object({
    fromWarehouseId: z.string().cuid(),
    toWarehouseId: z.string().cuid(),
    note: z.string().max(500).nullable().optional(),
    items: z.array(transferItemSchema).min(1)
  })
  .refine((d) => d.fromWarehouseId !== d.toWarehouseId, {
    message: "Gudang asal dan tujuan harus berbeda",
    path: ["toWarehouseId"]
  })

export const receiveTransferSchema = z.object({
  id: z.string().cuid(),
  receivedItems: z.array(
    z.object({
      itemId: z.string().cuid(),
      qtyReceived: z.coerce.number().min(0)
    })
  )
})

export type CreateTransferInput = z.infer<typeof createTransferSchema>
export type ReceiveTransferInput = z.infer<typeof receiveTransferSchema>
```

- [ ] **Step 2: Service**

```ts
import type { Prisma } from "@prisma/client"
import Decimal from "decimal.js"
import { AppError } from "@/lib/errors"
import { applyStockMovement } from "@/lib/stock-movement"
import { nextDocumentCode, DOC_TYPES } from "@/lib/document-number"
import type { CreateTransferInput, ReceiveTransferInput } from "./schema"

type Tx = Prisma.TransactionClient

export async function createTransfer(
  tx: Tx,
  input: CreateTransferInput,
  actorId: string
) {
  const code = await nextDocumentCode(tx, DOC_TYPES.XFR.type, DOC_TYPES.XFR.prefix)
  return tx.stockTransfer.create({
    data: {
      code,
      fromWarehouseId: input.fromWarehouseId,
      toWarehouseId: input.toWarehouseId,
      status: "DRAFT",
      note: input.note ?? null,
      createdById: actorId,
      items: {
        create: input.items.map((i) => ({
          productId: i.productId,
          qtyInBase: new Decimal(i.qtyInBase)
        }))
      }
    }
  })
}

export async function sendTransfer(tx: Tx, id: string, actorId: string) {
  const transfer = await tx.stockTransfer.findUnique({
    where: { id },
    include: { items: true }
  })
  if (!transfer) throw new AppError("NOT_FOUND", "Transfer tidak ditemukan")
  if (transfer.status !== "DRAFT") {
    throw new AppError("INVALID_INPUT", `Transfer status ${transfer.status} tidak bisa di-kirim`)
  }
  for (const item of transfer.items) {
    await applyStockMovement(tx, {
      productId: item.productId,
      warehouseId: transfer.fromWarehouseId,
      qtyInBase: new Decimal(item.qtyInBase),
      direction: "OUT",
      movementType: "TRANSFER_OUT",
      refType: "StockTransfer",
      refId: transfer.id,
      actorId
    })
  }
  return tx.stockTransfer.update({
    where: { id },
    data: { status: "IN_TRANSIT", sentAt: new Date() }
  })
}

export async function receiveTransfer(
  tx: Tx,
  input: ReceiveTransferInput,
  actorId: string
) {
  const transfer = await tx.stockTransfer.findUnique({
    where: { id: input.id },
    include: { items: true }
  })
  if (!transfer) throw new AppError("NOT_FOUND", "Transfer tidak ditemukan")
  if (transfer.status !== "IN_TRANSIT") {
    throw new AppError("INVALID_INPUT", `Transfer status ${transfer.status} tidak bisa di-terima`)
  }

  // Validate received qty <= sent qty
  const itemMap = new Map(transfer.items.map((i) => [i.id, i]))
  for (const r of input.receivedItems) {
    const sent = itemMap.get(r.itemId)
    if (!sent) throw new AppError("INVALID_INPUT", "Item tidak ada di transfer")
    if (new Decimal(r.qtyReceived).gt(sent.qtyInBase)) {
      throw new AppError("INVALID_INPUT", "Qty terima > qty kirim")
    }
  }

  // Receive: add to destination warehouse
  for (const r of input.receivedItems) {
    if (r.qtyReceived <= 0) continue
    const sent = itemMap.get(r.itemId)!
    await applyStockMovement(tx, {
      productId: sent.productId,
      warehouseId: transfer.toWarehouseId,
      qtyInBase: new Decimal(r.qtyReceived),
      direction: "IN",
      movementType: "TRANSFER_IN",
      refType: "StockTransfer",
      refId: transfer.id,
      actorId
    })

    // Discrepancy: if qtyReceived < sent, generate ADJUSTMENT in source warehouse for the diff
    const diff = new Decimal(sent.qtyInBase).minus(r.qtyReceived)
    if (diff.gt(0)) {
      await applyStockMovement(tx, {
        productId: sent.productId,
        warehouseId: transfer.fromWarehouseId,
        qtyInBase: diff,
        direction: "OUT",
        movementType: "ADJUSTMENT",
        refType: "StockTransfer",
        refId: transfer.id,
        actorId,
        note: `Selisih terima transfer ${transfer.code}`
      })
    }
  }

  return tx.stockTransfer.update({
    where: { id: input.id },
    data: {
      status: "COMPLETED",
      receivedAt: new Date(),
      receivedById: actorId
    }
  })
}

export async function cancelTransfer(tx: Tx, id: string) {
  const current = await tx.stockTransfer.findUnique({ where: { id } })
  if (!current) throw new AppError("NOT_FOUND", "Transfer tidak ditemukan")
  if (current.status !== "DRAFT") {
    throw new AppError("INVALID_INPUT", "Hanya DRAFT yang bisa dibatalkan")
  }
  return tx.stockTransfer.update({
    where: { id },
    data: { status: "CANCELLED" }
  })
}
```

- [ ] **Step 3: Queries**

`listTransfers(params)`, `getTransferById(id)`, `listIncomingTransfers(warehouseId)` (status=IN_TRANSIT, toWarehouseId=warehouseId).

- [ ] **Step 4: Test service**

5 tests:
- sendTransfer rejects non-DRAFT
- sendTransfer happy path generates TRANSFER_OUT movements
- receiveTransfer rejects non-IN_TRANSIT
- receiveTransfer rejects qty > sent
- receiveTransfer with discrepancy generates ADJUSTMENT for diff

- [ ] **Step 5: Commit**

```bash
git add src/modules/inventory-transfer/ tests/unit/modules/inventory-transfer/
git commit -m "feat(transfer): service for create/send/receive with discrepancy adjustment"
```
### Task 8: Stock Transfer - Actions + Pages

**Files:**
- Create: `src/modules/inventory-transfer/actions.ts`
- Create: `src/modules/inventory-transfer/components/{transfer-form,transfer-receive-form,transfer-detail}.tsx`
- Create: `src/app/(dashboard)/inventory/transfers/{page.tsx,new/page.tsx,[id]/page.tsx,[id]/receive/page.tsx}`

- [ ] **Step 1: Actions**

`createTransferAction(input)` -> requirePermission("inventory.transfer.create"), parse, $transaction { createTransfer + audit CREATE }, revalidate.
`sendTransferAction(id)` -> requirePermission("inventory.transfer.send"), $transaction { sendTransfer + audit POST }.
`receiveTransferAction(input)` -> requirePermission("inventory.transfer.receive"), parse, $transaction { receiveTransfer + audit POST }.
`cancelTransferAction(id)` -> requirePermission("inventory.transfer.create"), $transaction { cancelTransfer + audit UPDATE }.

- [ ] **Step 2: Form**

TransferForm fields: from + to warehouse selects, items array (product + qty + saldo asal display), submit creates DRAFT.
On detail page, "Kirim" button (DRAFT only) calls sendTransferAction with confirm.

- [ ] **Step 3: Receive form**

Pre-loads sent items, qty terima default = qty kirim, user adjust kalau ada selisih, click "Terima" -> receiveTransferAction.

- [ ] **Step 4: Pages**

List: filter by status, kolom code, from->to, status, sentAt, receivedAt.
New: TransferForm.
Detail: status badge, items table, action buttons (Kirim/Batal/Terima depend on status + role + warehouse access).
Receive: only accessible if user has access to toWarehouse + status=IN_TRANSIT.

- [ ] **Step 5: Commit**

```bash
git add src/modules/inventory-transfer/ src/app/\(dashboard\)/inventory/transfers/
git commit -m "feat(transfer): pages + send/receive UI flow"
```

### Task 9: Stock Opname - Worksheet + Posting

**Files:**
- Create: `src/modules/inventory-opname/{schema,service,queries,actions}.ts`
- Create: `src/modules/inventory-opname/components/opname-worksheet.tsx`
- Create: `src/app/(dashboard)/inventory/opname/page.tsx`

- [ ] **Step 1: Schema**

```ts
import { z } from "zod"

export const generateWorksheetSchema = z.object({
  warehouseId: z.string().cuid(),
  categoryId: z.string().cuid().nullable().optional()
})

export const postOpnameSchema = z.object({
  warehouseId: z.string().cuid(),
  note: z.string().max(500).nullable().optional(),
  items: z.array(
    z.object({
      productId: z.string().cuid(),
      qtyPhysical: z.coerce.number().min(0),
      note: z.string().max(200).nullable().optional()
    })
  ).min(1)
})

export type GenerateWorksheetInput = z.infer<typeof generateWorksheetSchema>
export type PostOpnameInput = z.infer<typeof postOpnameSchema>
```

- [ ] **Step 2: Service**

```ts
export async function generateWorksheet(
  db: Db,
  input: GenerateWorksheetInput
) {
  const products = await db.product.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(input.categoryId ? { categoryId: input.categoryId } : {})
    },
    select: {
      id: true,
      sku: true,
      name: true,
      baseUnit: { select: { name: true } },
      stocks: {
        where: { warehouseId: input.warehouseId },
        select: { qtyInBase: true }
      }
    },
    orderBy: { name: "asc" }
  })
  return products.map((p) => ({
    productId: p.id,
    sku: p.sku,
    name: p.name,
    unitName: p.baseUnit.name,
    qtySystem: p.stocks[0]?.qtyInBase ?? 0
  }))
}

export async function postOpname(
  tx: Tx,
  input: PostOpnameInput,
  actorId: string
) {
  // For each item with diff != 0, generate adjustment
  const adjustmentItems: { productId: string; qtyInBaseDiff: Decimal; note: string | null }[] = []
  for (const i of input.items) {
    const stock = await tx.stockBalance.findUnique({
      where: {
        productId_warehouseId: {
          productId: i.productId,
          warehouseId: input.warehouseId
        }
      }
    })
    const current = stock ? new Decimal(stock.qtyInBase) : new Decimal(0)
    const diff = new Decimal(i.qtyPhysical).minus(current)
    if (!diff.isZero()) {
      adjustmentItems.push({
        productId: i.productId,
        qtyInBaseDiff: diff,
        note: i.note ?? null
      })
    }
  }
  if (adjustmentItems.length === 0) {
    throw new AppError("INVALID_INPUT", "Tidak ada selisih untuk di-post")
  }

  const code = await nextDocumentCode(tx, DOC_TYPES.ADJ.type, DOC_TYPES.ADJ.prefix)
  const adj = await tx.stockAdjustment.create({
    data: {
      code,
      warehouseId: input.warehouseId,
      reason: "OPNAME",
      status: "DRAFT",
      note: input.note ?? `Opname stock`,
      createdById: actorId,
      items: { create: adjustmentItems }
    }
  })

  // Auto-post
  return postAdjustment(tx, adj.id, actorId)
}
```

- [ ] **Step 3: Worksheet UI**

Two-step UI in single page:
1. Step 1: pilih gudang + kategori (optional) -> "Generate Worksheet"
2. Step 2: tampil grid produk (sku, nama, qty sistem read-only, qty fisik input, selisih computed, note). "Posting" button generates StockAdjustment with reason=OPNAME and auto-posts.

Server side state: worksheet snapshot generated fresh; client holds qtyPhysical input.

- [ ] **Step 4: Test + commit**

```bash
git add src/modules/inventory-opname/ src/app/\(dashboard\)/inventory/opname/
git commit -m "feat(opname): worksheet generator + auto-post adjustment"
```

---

## Phase C - Pembelian
### Task 10: PurchaseOrder - Schema + Service

**Files:**
- Create: `src/modules/purchase-order/{schema,service,queries,actions}.ts`
- Test: `tests/unit/modules/purchase-order/service.test.ts`

- [ ] **Step 1: Schema**

```ts
import { z } from "zod"

export const poItemSchema = z.object({
  id: z.string().cuid().optional(),
  productUnitId: z.string().cuid(),
  qty: z.coerce.number().positive(),
  price: z.coerce.number().min(0),
  discount: z.coerce.number().min(0)
})

export const createPOSchema = z.object({
  supplierId: z.string().cuid(),
  warehouseId: z.string().cuid(),
  orderDate: z.coerce.date(),
  expectedDate: z.coerce.date().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  items: z.array(poItemSchema).min(1)
})

export const updatePOSchema = createPOSchema.extend({
  id: z.string().cuid()
})

export type CreatePOInput = z.infer<typeof createPOSchema>
export type UpdatePOInput = z.infer<typeof updatePOSchema>
```

- [ ] **Step 2: Service**

```ts
function computePOItem(item: { qty: number; price: number; discount: number }) {
  const subtotal = new Decimal(item.qty)
    .times(item.price)
    .minus(new Decimal(item.qty).times(item.discount))
  return { subtotal }
}

function computePOTotal(items: { qty: number; price: number; discount: number }[]) {
  return items.reduce(
    (acc, i) => acc.plus(computePOItem(i).subtotal),
    new Decimal(0)
  )
}

export async function createPO(tx: Tx, input: CreatePOInput, actorId: string) {
  const code = await nextDocumentCode(tx, DOC_TYPES.PO.type, DOC_TYPES.PO.prefix, input.orderDate)
  const total = computePOTotal(input.items)
  return tx.purchaseOrder.create({
    data: {
      code,
      supplierId: input.supplierId,
      warehouseId: input.warehouseId,
      orderDate: input.orderDate,
      expectedDate: input.expectedDate ?? null,
      status: "DRAFT",
      total,
      note: input.note ?? null,
      createdById: actorId,
      items: {
        create: input.items.map((i) => ({
          productUnitId: i.productUnitId,
          qty: new Decimal(i.qty),
          price: new Decimal(i.price),
          discount: new Decimal(i.discount),
          subtotal: computePOItem(i).subtotal
        }))
      }
    }
  })
}

export async function updatePO(tx: Tx, input: UpdatePOInput) {
  const current = await tx.purchaseOrder.findUnique({ where: { id: input.id } })
  if (!current) throw new AppError("NOT_FOUND", "PO tidak ditemukan")
  if (current.status !== "DRAFT") {
    throw new AppError("INVALID_INPUT", "Hanya DRAFT yang bisa diubah")
  }
  await tx.purchaseOrderItem.deleteMany({ where: { poId: input.id } })
  const total = computePOTotal(input.items)
  return tx.purchaseOrder.update({
    where: { id: input.id },
    data: {
      supplierId: input.supplierId,
      warehouseId: input.warehouseId,
      orderDate: input.orderDate,
      expectedDate: input.expectedDate ?? null,
      total,
      note: input.note ?? null,
      items: {
        create: input.items.map((i) => ({
          productUnitId: i.productUnitId,
          qty: new Decimal(i.qty),
          price: new Decimal(i.price),
          discount: new Decimal(i.discount),
          subtotal: computePOItem(i).subtotal
        }))
      }
    }
  })
}

export async function sendPO(tx: Tx, id: string) {
  const current = await tx.purchaseOrder.findUnique({ where: { id } })
  if (!current) throw new AppError("NOT_FOUND", "PO tidak ditemukan")
  if (current.status !== "DRAFT") {
    throw new AppError("INVALID_INPUT", "Hanya DRAFT yang bisa di-kirim")
  }
  return tx.purchaseOrder.update({
    where: { id },
    data: { status: "SENT" }
  })
}

export async function cancelPO(tx: Tx, id: string) {
  const current = await tx.purchaseOrder.findUnique({ where: { id } })
  if (!current) throw new AppError("NOT_FOUND", "PO tidak ditemukan")
  if (current.status === "COMPLETED") {
    throw new AppError("INVALID_INPUT", "PO sudah COMPLETED, tidak bisa dibatalkan")
  }
  return tx.purchaseOrder.update({
    where: { id },
    data: { status: "CANCELLED" }
  })
}

/**
 * Recompute PO status based on linked invoice qty_received vs po qty.
 * Called after PurchaseInvoice posting.
 */
export async function recomputePOStatus(tx: Tx, poId: string) {
  const po = await tx.purchaseOrder.findUnique({
    where: { id: poId },
    include: { items: true }
  })
  if (!po) return
  const allReceived = po.items.every((i) =>
    new Decimal(i.qtyReceived).gte(i.qty)
  )
  const anyReceived = po.items.some((i) =>
    new Decimal(i.qtyReceived).gt(0)
  )
  const next = allReceived ? "COMPLETED" : anyReceived ? "PARTIAL" : "SENT"
  if (next !== po.status) {
    await tx.purchaseOrder.update({ where: { id: poId }, data: { status: next } })
  }
}
```

- [ ] **Step 3: Test**

```ts
describe("computePOTotal", () => {
  it("sums item subtotals net of per-unit discount", () => {
    expect(
      computePOTotal([
        { qty: 10, price: 1000, discount: 100 }, // (1000-100)*10 = 9000
        { qty: 5, price: 500, discount: 0 } // 2500
      ]).toNumber()
    ).toBe(11500)
  })
})

describe("recomputePOStatus", () => {
  // tests for partial vs complete
})
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/purchase-order/ tests/unit/modules/purchase-order/
git commit -m "feat(po): purchase order schema + service with status state machine"
```
### Task 11: PurchaseOrder - Pages

**Files:**
- Create: `src/modules/purchase-order/components/po-form.tsx`
- Create: `src/app/(dashboard)/purchase/orders/{page.tsx,new/page.tsx,[id]/page.tsx,[id]/edit/page.tsx}`

- [ ] **Step 1: PO form**

POForm fields:
- supplier dropdown (active only)
- warehouse dropdown
- orderDate (default today), expectedDate (optional)
- items: useFieldArray of {productUnitId picker, qty, price, discount, subtotal-calc}
- product picker: search by SKU/name, on select shows ProductUnit options (with current purchase price as default)
- footer: total calculated reactive

- [ ] **Step 2: List page**

Columns: code, supplier, warehouse, orderDate, total (formatIDR), status badge.
Filter: supplier, status, date range.
Action: View detail.

- [ ] **Step 3: Detail page**

Shows PO header + items + total. Action buttons:
- Edit (DRAFT only) -> /edit
- Kirim (DRAFT -> SENT) with confirm
- Cancel (DRAFT/SENT -> CANCELLED) with confirm + reason
- Buat Faktur Pembelian (SENT/PARTIAL only) -> /purchase/invoices/new?poId=<id>

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(po): pages with edit/send/cancel + invoice creation link"
```

### Task 12: PurchaseInvoice - Schema + Service (Posting)

**Files:**
- Create: `src/modules/purchase-invoice/{schema,service,queries,actions}.ts`
- Test: `tests/unit/modules/purchase-invoice/service.test.ts`

- [ ] **Step 1: Schema**

```ts
export const pInvItemSchema = z.object({
  productUnitId: z.string().cuid(),
  qty: z.coerce.number().positive(),
  price: z.coerce.number().min(0),
  discount: z.coerce.number().min(0),
  poItemId: z.string().cuid().nullable().optional()
})

export const createPInvSchema = z.object({
  poId: z.string().cuid().nullable().optional(),
  supplierId: z.string().cuid(),
  warehouseId: z.string().cuid(),
  supplierInvoiceNo: z.string().max(50).nullable().optional(),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  taxAmount: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0),
  note: z.string().max(500).nullable().optional(),
  items: z.array(pInvItemSchema).min(1)
})

export type CreatePInvInput = z.infer<typeof createPInvSchema>
```

- [ ] **Step 2: Service - postInvoice (the posting flow)**

```ts
export async function postPurchaseInvoice(
  tx: Tx,
  input: CreatePInvInput,
  actorId: string
) {
  // 1. Generate code
  const code = await nextDocumentCode(
    tx,
    DOC_TYPES.PINV.type,
    DOC_TYPES.PINV.prefix,
    input.invoiceDate
  )

  // 2. Compute totals
  let subtotal = new Decimal(0)
  for (const item of input.items) {
    const sub = new Decimal(item.qty)
      .times(item.price)
      .minus(new Decimal(item.qty).times(item.discount))
    subtotal = subtotal.plus(sub)
  }
  const total = subtotal
    .minus(new Decimal(input.discountAmount))
    .plus(new Decimal(input.taxAmount))

  // 3. Resolve productId from productUnitId (need it for stock movement)
  const productUnits = await tx.productUnit.findMany({
    where: { id: { in: input.items.map((i) => i.productUnitId) } },
    select: { id: true, productId: true, conversionToBase: true }
  })
  const puMap = new Map(productUnits.map((pu) => [pu.id, pu]))

  // 4. Create invoice + items
  const invoice = await tx.purchaseInvoice.create({
    data: {
      code,
      poId: input.poId ?? null,
      supplierId: input.supplierId,
      warehouseId: input.warehouseId,
      supplierInvoiceNo: input.supplierInvoiceNo ?? null,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate,
      subtotal,
      discount: new Decimal(input.discountAmount),
      tax: new Decimal(input.taxAmount),
      total,
      paidAmount: new Decimal(0),
      status: "UNPAID",
      note: input.note ?? null,
      createdById: actorId,
      postedAt: new Date(),
      items: {
        create: input.items.map((i) => {
          const sub = new Decimal(i.qty)
            .times(i.price)
            .minus(new Decimal(i.qty).times(i.discount))
          return {
            productUnitId: i.productUnitId,
            qty: new Decimal(i.qty),
            price: new Decimal(i.price),
            discount: new Decimal(i.discount),
            subtotal: sub
          }
        })
      }
    }
  })

  // 5. Generate stock movements (IN to warehouse, qty in base unit)
  for (const item of input.items) {
    const pu = puMap.get(item.productUnitId)
    if (!pu) throw new AppError("INVALID_INPUT", "ProductUnit tidak ditemukan")
    const qtyInBase = new Decimal(item.qty).times(pu.conversionToBase)
    await applyStockMovement(tx, {
      productId: pu.productId,
      warehouseId: input.warehouseId,
      qtyInBase,
      direction: "IN",
      movementType: "PURCHASE",
      refType: "PurchaseInvoice",
      refId: invoice.id,
      actorId
    })
  }

  // 6. If linked to PO, update qtyReceived per item + recompute PO status
  if (input.poId) {
    for (const item of input.items) {
      if (!item.poItemId) continue
      const poItem = await tx.purchaseOrderItem.findUnique({
        where: { id: item.poItemId }
      })
      if (!poItem) continue
      await tx.purchaseOrderItem.update({
        where: { id: item.poItemId },
        data: { qtyReceived: new Decimal(poItem.qtyReceived).plus(item.qty) }
      })
    }
    const { recomputePOStatus } = await import("@/modules/purchase-order/service")
    await recomputePOStatus(tx, input.poId)
  }

  return invoice
}

export async function voidPurchaseInvoice(
  tx: Tx,
  id: string,
  reason: string,
  actorId: string
) {
  const inv = await tx.purchaseInvoice.findUnique({
    where: { id },
    include: { items: { include: { productUnit: true } } }
  })
  if (!inv) throw new AppError("NOT_FOUND", "Faktur tidak ditemukan")
  if (inv.status === "VOID") {
    throw new AppError("INVALID_INPUT", "Faktur sudah VOID")
  }
  if (new Decimal(inv.paidAmount).gt(0)) {
    throw new AppError("INVALID_INPUT", "Faktur sudah ada pembayaran, tidak bisa di-VOID langsung")
  }

  // Reverse stock movements (OUT to negate the IN)
  for (const item of inv.items) {
    const qtyInBase = new Decimal(item.qty).times(item.productUnit.conversionToBase)
    await applyStockMovement(tx, {
      productId: item.productUnit.productId,
      warehouseId: inv.warehouseId,
      qtyInBase,
      direction: "OUT",
      movementType: "PURCHASE",
      refType: "PurchaseInvoiceVoid",
      refId: inv.id,
      actorId,
      note: `VOID: ${reason}`,
      allowNegative: true
    })
  }

  return tx.purchaseInvoice.update({
    where: { id },
    data: {
      status: "VOID",
      voidedAt: new Date(),
      voidedById: actorId,
      voidReason: reason
    }
  })
}
```

- [ ] **Step 3: Tests**

5 tests:
- postInvoice computes total = subtotal - discount + tax
- postInvoice creates IN movements
- postInvoice updates PO qtyReceived if linked
- voidInvoice rejects if already VOID
- voidInvoice rejects if paidAmount > 0

- [ ] **Step 4: Actions + Pages**

`postPurchaseInvoiceAction` (perm: purchase.invoice.post)
`voidPurchaseInvoiceAction` (perm: purchase.invoice.void)

Pages:
- /purchase/invoices: list with filter supplier, status, date
- /purchase/invoices/new: form, accept ?poId=xxx to pre-fill from PO
- /purchase/invoices/[id]: detail + Void button (with reason modal)

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(purchase-invoice): post + void flow with stock IN/OUT + PO sync"
```
---

## Phase D - Penjualan (POS)

### Task 13: Sale POS - Schema + Service (Posting)

**Files:**
- Create: `src/modules/sale-pos/{schema,service,queries,actions}.ts`
- Test: `tests/unit/modules/sale-pos/service.test.ts`

- [ ] **Step 1: Schema**

```ts
export const saleItemSchema = z.object({
  productUnitId: z.string().cuid(),
  qty: z.coerce.number().positive(),
  price: z.coerce.number().min(0),
  discount: z.coerce.number().min(0)
})

export const postSaleSchema = z.object({
  customerId: z.string().cuid().nullable().optional(),
  warehouseId: z.string().cuid(),
  saleType: z.enum(["CASH", "CREDIT"]),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date().nullable().optional(),
  discountAmount: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0),
  paymentMethod: z.enum(["TUNAI", "TRANSFER", "QRIS", "KARTU"]).nullable().optional(),
  paymentRefNo: z.string().max(50).nullable().optional(),
  paidAmount: z.coerce.number().min(0),
  note: z.string().max(500).nullable().optional(),
  idempotencyKey: z.string().min(1).max(100),
  items: z.array(saleItemSchema).min(1)
})

export const voidSaleSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().min(1).max(500)
})

export type PostSaleInput = z.infer<typeof postSaleSchema>
export type VoidSaleInput = z.infer<typeof voidSaleSchema>
```

- [ ] **Step 2: Service - postSale (most complex flow in M2)**

```ts
export async function postSale(
  tx: Tx,
  input: PostSaleInput,
  actorId: string
) {
  // 0. Idempotency check
  const existing = await tx.idempotencyKey.findUnique({
    where: { key: input.idempotencyKey }
  })
  if (existing) {
    // Return cached response
    const cached = existing.payload as { invoiceId: string }
    const inv = await tx.saleInvoice.findUnique({ where: { id: cached.invoiceId } })
    if (inv) {
      throw new AppError("IDEMPOTENCY_REPLAY", "Transaksi sudah pernah di-post", { idempotencyKey: cached.invoiceId })
    }
  }

  // 1. CREDIT validations
  if (input.saleType === "CREDIT") {
    if (!input.customerId) {
      throw new AppError("INVALID_INPUT", "Customer wajib untuk sale CREDIT")
    }
    if (!input.dueDate) {
      throw new AppError("INVALID_INPUT", "Due date wajib untuk sale CREDIT")
    }
  }

  // 2. Compute totals
  let subtotal = new Decimal(0)
  for (const item of input.items) {
    const sub = new Decimal(item.qty)
      .times(item.price)
      .minus(new Decimal(item.qty).times(item.discount))
    subtotal = subtotal.plus(sub)
  }
  const total = subtotal
    .minus(new Decimal(input.discountAmount))
    .plus(new Decimal(input.taxAmount))

  // 3. CASH validation: paid >= total, else error. Compute change.
  const paid = new Decimal(input.paidAmount)
  let change = new Decimal(0)
  let status: "PAID" | "UNPAID" | "PARTIAL" = "UNPAID"
  if (input.saleType === "CASH") {
    if (paid.lt(total)) {
      throw new AppError("INVALID_INPUT", "Pembayaran kurang dari total")
    }
    change = paid.minus(total)
    status = "PAID"
  } else {
    // CREDIT: paid <= total
    if (paid.gt(total)) {
      throw new AppError("INVALID_INPUT", "Pembayaran > total tidak valid untuk CREDIT")
    }
    if (paid.isZero()) status = "UNPAID"
    else if (paid.lt(total)) status = "PARTIAL"
    else status = "PAID"
  }

  // 4. Generate code
  const code = await nextDocumentCode(
    tx,
    DOC_TYPES.SALE.type,
    DOC_TYPES.SALE.prefix,
    input.invoiceDate
  )

  // 5. Resolve productId from productUnitId
  const productUnits = await tx.productUnit.findMany({
    where: { id: { in: input.items.map((i) => i.productUnitId) } },
    select: { id: true, productId: true, conversionToBase: true, salePrice: true }
  })
  const puMap = new Map(productUnits.map((pu) => [pu.id, pu]))

  // 6. Pre-check stock for all items (fail fast before locks)
  const allowNegative = await getBooleanSetting(tx, "allow_negative_stock", false)

  // 7. Create invoice
  const invoice = await tx.saleInvoice.create({
    data: {
      code,
      customerId: input.customerId ?? null,
      warehouseId: input.warehouseId,
      saleType: input.saleType,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate ?? null,
      subtotal,
      discount: new Decimal(input.discountAmount),
      tax: new Decimal(input.taxAmount),
      total,
      paidAmount: paid,
      changeAmount: change,
      status,
      paymentMethod: input.paymentMethod ?? null,
      paymentRefNo: input.paymentRefNo ?? null,
      note: input.note ?? null,
      createdById: actorId,
      postedAt: new Date(),
      items: {
        create: input.items.map((i) => {
          const sub = new Decimal(i.qty)
            .times(i.price)
            .minus(new Decimal(i.qty).times(i.discount))
          return {
            productUnitId: i.productUnitId,
            qty: new Decimal(i.qty),
            price: new Decimal(i.price),
            discount: new Decimal(i.discount),
            subtotal: sub
          }
        })
      }
    }
  })

  // 8. Stock movements (OUT)
  for (const item of input.items) {
    const pu = puMap.get(item.productUnitId)
    if (!pu) throw new AppError("INVALID_INPUT", "ProductUnit tidak ditemukan")
    const qtyInBase = new Decimal(item.qty).times(pu.conversionToBase)
    await applyStockMovement(tx, {
      productId: pu.productId,
      warehouseId: input.warehouseId,
      qtyInBase,
      direction: "OUT",
      movementType: "SALE",
      refType: "SaleInvoice",
      refId: invoice.id,
      actorId,
      allowNegative
    })
  }

  // 9. Save idempotency key
  await tx.idempotencyKey.create({
    data: {
      key: input.idempotencyKey,
      responseHash: invoice.id,
      payload: { invoiceId: invoice.id }
    }
  })

  return invoice
}

export async function voidSale(
  tx: Tx,
  input: VoidSaleInput,
  actorId: string
) {
  const inv = await tx.saleInvoice.findUnique({
    where: { id: input.id },
    include: { items: { include: { productUnit: true } } }
  })
  if (!inv) throw new AppError("NOT_FOUND", "Faktur tidak ditemukan")
  if (inv.status === "VOID") {
    throw new AppError("INVALID_INPUT", "Faktur sudah VOID")
  }

  // Reverse stock (IN) - allow negative since stock movements are auditable
  for (const item of inv.items) {
    const qtyInBase = new Decimal(item.qty).times(item.productUnit.conversionToBase)
    await applyStockMovement(tx, {
      productId: item.productUnit.productId,
      warehouseId: inv.warehouseId,
      qtyInBase,
      direction: "IN",
      movementType: "SALE",
      refType: "SaleInvoiceVoid",
      refId: inv.id,
      actorId,
      note: `VOID: ${input.reason}`
    })
  }

  return tx.saleInvoice.update({
    where: { id: input.id },
    data: {
      status: "VOID",
      voidedAt: new Date(),
      voidedById: actorId,
      voidReason: input.reason
    }
  })
}
```

- [ ] **Step 3: Tests**

7 tests:
- postSale CASH happy path: status=PAID, change=paid-total
- postSale CREDIT requires customerId + dueDate
- postSale CASH rejects if paid < total
- postSale OUT movements created with correct base qty conversion
- postSale idempotency key save (replay returns cached)
- voidSale reverses stock (IN movements)
- voidSale rejects if already VOID

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(sale-pos): post sale flow with idempotency + void with stock reversal"
```
### Task 14: POS UI - Layout + Search

**Files:**
- Create: `src/modules/sale-pos/components/pos-cart.tsx`
- Create: `src/modules/sale-pos/components/pos-product-search.tsx`
- Create: `src/modules/sale-pos/components/pos-payment-modal.tsx`
- Create: `src/app/(dashboard)/sale/pos/page.tsx`

POS adalah halaman paling sering dipakai kasir; harus keyboard-friendly.

- [ ] **Step 1: Product search server query**

`src/modules/sale-pos/queries.ts`:
```ts
export async function searchProductsForPOS(q: string, warehouseId: string, limit = 8) {
  if (!q || q.length < 2) return []
  // Try barcode exact match first
  const byBarcode = await prisma.productUnit.findFirst({
    where: { barcode: q, product: { isActive: true, deletedAt: null } },
    include: {
      product: { include: { baseUnit: true } },
      unit: true
    }
  })
  if (byBarcode) {
    return [
      {
        productUnitId: byBarcode.id,
        productId: byBarcode.productId,
        sku: byBarcode.product.sku,
        name: byBarcode.product.name,
        unitName: byBarcode.unit.name,
        conversionToBase: Number(byBarcode.conversionToBase),
        salePrice: Number(byBarcode.salePrice)
      }
    ]
  }
  // Else: search by SKU or name
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [
        { sku: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } }
      ]
    },
    include: {
      baseUnit: true,
      units: {
        where: { isDefaultSale: true },
        include: { unit: true }
      }
    },
    take: limit
  })
  return products
    .filter((p) => p.units.length > 0)
    .map((p) => {
      const defSale = p.units[0]
      return {
        productUnitId: defSale.id,
        productId: p.id,
        sku: p.sku,
        name: p.name,
        unitName: defSale.unit.name,
        conversionToBase: Number(defSale.conversionToBase),
        salePrice: Number(defSale.salePrice)
      }
    })
}

export async function getProductUnitsForCart(productId: string) {
  return prisma.productUnit.findMany({
    where: { productId },
    include: { unit: true },
    orderBy: { conversionToBase: "asc" }
  })
}
```

Expose this via Server Action `searchProductsAction(q, warehouseId)` returning `ActionResult<...>`.

- [ ] **Step 2: POS layout (page.tsx)**

```tsx
// /sale/pos page - 2 pane layout, full screen friendly
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth"
import { POSCart } from "@/modules/sale-pos/components/pos-cart"

export default async function POSPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("sale.write")) redirect("/forbidden")

  const cookieStore = await cookies()
  const warehouseId =
    cookieStore.get("current_warehouse")?.value ??
    session.user.defaultWarehouseId
  if (!warehouseId) redirect("/forbidden") // require warehouse selection

  return <POSCart warehouseId={warehouseId} userPermissions={session.user.permissionKeys} />
}
```

- [ ] **Step 3: POSCart client component**

State: cart items array (productUnitId, name, unitName, qty, price, discount, subtotal-calc).
Layout 2-pane:
- Left 60%: ProductSearch (autocomplete) + Cart table
- Right 40%: Customer picker (default Walk-in) + Summary + Payment panel

Keyboard shortcuts:
- F2 / "/" -> focus search
- F4 -> open customer picker
- F8 -> focus payment input
- Esc -> clear cart (with confirm if >0 items)
- ArrowUp/Down on search -> navigate dropdown

Cart row controls: qty +/- buttons, satuan picker (loads ProductUnits for that product), price editable (if permission `sale.discount.apply`), delete row.

After Bayar (F8): submit postSaleAction with idempotencyKey = generated UUID per cart session. Toast success + clear cart + show change.

- [ ] **Step 4: Print receipt**

After successful post, modal:
```
✓ Penjualan SO-202605-0231 disimpan
Total: Rp 43.000  Bayar: Rp 50.000  Kembali: Rp 7.000
[Cetak Struk]  [Lewati]  [Lanjut Transaksi (Enter)]
```
"Cetak Struk" opens browser print dialog with simple HTML receipt template at `/sale/invoices/[id]/receipt` route (server-rendered, minimal CSS for thermal/A4 print).

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(pos): cart UI with search/scan + keyboard shortcuts + receipt print"
```

### Task 15: Sale Invoice List + Detail + VOID

**Files:**
- Create: `src/app/(dashboard)/sale/invoices/{page.tsx,[id]/page.tsx,[id]/receipt/page.tsx}`
- Create: `src/modules/sale-invoice/components/invoice-detail.tsx`
- Create: `src/modules/sale-invoice/queries.ts`

- [ ] **Step 1: Queries**

`listSaleInvoices(params)`, `getSaleInvoiceById(id)`.

- [ ] **Step 2: List page**

Filter: status, customer, kasir, date range.
Columns: code, invoiceDate, customer, kasir, total, status badge.
Permission: `sale.read`.

- [ ] **Step 3: Detail page**

Read-only view. Action button:
- "VOID" (permission `sale.void`, status != VOID): modal with reason textarea, calls voidSaleAction.
- "Cetak Struk" -> opens /receipt route.

- [ ] **Step 4: Receipt page**

Server-rendered minimal HTML, store name + alamat (from Setting), invoice items, total, paid, change, footer "Terima kasih". Print-friendly CSS.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(sale-invoice): list/detail/receipt + void flow"
```
---

## Phase E - Test Infrastructure & Polish

### Task 16: Integration Test Setup

**Files:**
- Modify: `docker-compose.dev.yml` (add postgres-test service)
- Create: `vitest.integration.config.ts`
- Create: `tests/integration/setup.ts`
- Create: `tests/integration/flows/sale-cash.test.ts` (sample integration test)

- [ ] **Step 1: Test postgres container**

Add to `docker-compose.dev.yml`:
```yaml
  postgres-test:
    image: postgres:16
    ports: ["5434:5432"]
    environment:
      POSTGRES_USER: grosir
      POSTGRES_PASSWORD: grosir_test
      POSTGRES_DB: grosir_test
    tmpfs: /var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U grosir -d grosir_test"]
      interval: 5s
      timeout: 3s
      retries: 5
```

Run: `docker compose -f docker-compose.dev.yml up -d postgres-test`

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
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30000
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  }
})
```

Add to `package.json`:
```json
"test:integration": "cross-env DATABASE_URL=postgresql://grosir:grosir_test@localhost:5434/grosir_test?schema=public vitest run --config vitest.integration.config.ts"
```

Install cross-env: `pnpm add -D cross-env`

- [ ] **Step 3: Setup file**

`tests/integration/setup.ts`:
```ts
import { execSync } from "node:child_process"
import { afterAll, beforeAll, beforeEach } from "vitest"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

beforeAll(async () => {
  // Apply migrations to test DB
  execSync("pnpm prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL! },
    stdio: "inherit"
  })
})

beforeEach(async () => {
  // Truncate all data tables (preserve schema)
  const tablenames = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname='public' AND tablename NOT LIKE '_prisma%'
  `
  const list = tablenames.map((t) => `"public"."${t.tablename}"`).join(", ")
  if (list) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})

export { prisma }
```

- [ ] **Step 4: Sample integration test - sale CASH happy path**

`tests/integration/flows/sale-cash.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import Decimal from "decimal.js"
import { prisma } from "../setup"
import { postSale } from "@/modules/sale-pos/service"

async function setupTestData() {
  const wh = await prisma.warehouse.create({
    data: { code: "TEST-WH", name: "Test", isDefault: false }
  })
  const cat = await prisma.category.create({ data: { name: "Test Cat" } })
  const unit = await prisma.unit.create({ data: { name: "pcs" } })
  const role = await prisma.role.create({ data: { name: "TEST_ROLE", isSystem: false } })
  const user = await prisma.user.create({
    data: {
      username: "tester",
      name: "Tester",
      passwordHash: "x",
      isActive: true
    }
  })
  const product = await prisma.product.create({
    data: {
      sku: "TST-001",
      name: "Test Product",
      categoryId: cat.id,
      baseUnitId: unit.id,
      units: {
        create: {
          unitId: unit.id,
          conversionToBase: 1,
          purchasePrice: 1000,
          salePrice: 1500,
          isDefaultPurchase: true,
          isDefaultSale: true
        }
      }
    },
    include: { units: true }
  })
  // Pre-seed stock balance
  await prisma.stockBalance.create({
    data: { productId: product.id, warehouseId: wh.id, qtyInBase: 100 }
  })
  return { wh, product, productUnit: product.units[0], user }
}

describe("postSale CASH flow", () => {
  it("posts sale, decrements stock, creates movement", async () => {
    const { wh, productUnit, user } = await setupTestData()
    const invoice = await prisma.$transaction((tx) =>
      postSale(
        tx,
        {
          warehouseId: wh.id,
          saleType: "CASH",
          invoiceDate: new Date(),
          discountAmount: 0,
          taxAmount: 0,
          paymentMethod: "TUNAI",
          paidAmount: 5000,
          idempotencyKey: "test-key-1",
          items: [{ productUnitId: productUnit.id, qty: 2, price: 1500, discount: 0 }]
        },
        user.id
      )
    )
    expect(invoice.status).toBe("PAID")
    expect(invoice.changeAmount.toString()).toBe("2000")

    const balance = await prisma.stockBalance.findUnique({
      where: {
        productId_warehouseId: {
          productId: productUnit.productId,
          warehouseId: wh.id
        }
      }
    })
    expect(balance?.qtyInBase.toString()).toBe("98")

    const movements = await prisma.stockMovement.findMany({
      where: { refType: "SaleInvoice", refId: invoice.id }
    })
    expect(movements).toHaveLength(1)
    expect(movements[0]?.movementType).toBe("SALE")
    expect(movements[0]?.direction).toBe("OUT")
  })

  it("rejects insufficient stock", async () => {
    const { wh, productUnit, user } = await setupTestData()
    await expect(
      prisma.$transaction((tx) =>
        postSale(
          tx,
          {
            warehouseId: wh.id,
            saleType: "CASH",
            invoiceDate: new Date(),
            discountAmount: 0,
            taxAmount: 0,
            paymentMethod: "TUNAI",
            paidAmount: 1000000,
            idempotencyKey: "test-key-2",
            items: [{ productUnitId: productUnit.id, qty: 999, price: 1500, discount: 0 }]
          },
          user.id
        )
      )
    ).rejects.toThrow(/Stok tidak cukup/)
  })
})
```

- [ ] **Step 5: Run + commit**

```bash
docker compose -f docker-compose.dev.yml up -d postgres-test
pnpm test:integration
git add docker-compose.dev.yml vitest.integration.config.ts tests/integration/ package.json
git commit -m "test: integration test infrastructure + sale CASH flow integration test"
```
### Task 17: Navigation Update + Permission Guards

**Files:**
- Modify: `src/components/layout/nav-config.ts`

- [ ] **Step 1: Add M2 menu items**

Insert into NAV_GROUPS in `src/components/layout/nav-config.ts`:

After "Inventaris" group (Saldo Stok), add:
```ts
{ label: "Penyesuaian Stok", href: "/inventory/adjustments", icon: ClipboardList, permission: "inventory.adjustment.create" },
{ label: "Mutasi Antar Gudang", href: "/inventory/transfers", icon: ArrowLeftRight, permission: "inventory.transfer.create" },
{ label: "Stok Opname", href: "/inventory/opname", icon: ClipboardCheck, permission: "inventory.opname.run" }
```

Add new groups:
```ts
{
  label: "Pembelian",
  items: [
    { label: "Purchase Order", href: "/purchase/orders", icon: ShoppingCart, permission: "purchase.po.read" },
    { label: "Faktur Pembelian", href: "/purchase/invoices", icon: FileText, permission: "purchase.invoice.read" }
  ]
},
{
  label: "Penjualan",
  items: [
    { label: "Kasir / POS", href: "/sale/pos", icon: Calculator, permission: "sale.write" },
    { label: "Faktur Penjualan", href: "/sale/invoices", icon: Receipt, permission: "sale.read" }
  ]
}
```

Lucide imports to add: `ClipboardList, ArrowLeftRight, ClipboardCheck, ShoppingCart, FileText, Calculator, Receipt`.

- [ ] **Step 2: Verify role permissions match**

Re-check `src/lib/permissions.ts` `ROLE_PERMISSIONS`:
- KASIR: should have sale.* + customer + product.read + inventory.read (already correct from M1)
- GUDANG: should have inventory.* + purchase.invoice.* + purchase.return.* (already correct)

- [ ] **Step 3: Verify all pages have requirePermission**

Spot-check each new page (opname, transfers/[id]/receive, sale/pos) to ensure `redirect("/forbidden")` for missing permissions.

- [ ] **Step 4: Build + commit**

```bash
pnpm build
git add src/components/layout/nav-config.ts
git commit -m "feat(nav): add M2 menu items (inventory adjustments, transfers, opname, purchase, sale)"
```

### Task 18: M2 Recap + Handoff Update

**Files:**
- Modify: `docs/HANDOFF.md`
- Create git tag: `v0.2.0-m2`

- [ ] **Step 1: Append M2 section to HANDOFF.md**

Add section "M2 Closed (date)" with:
- What landed: stock movement engine, adjustment, transfer, opname, PO, purchase invoice, sale POS, void flow
- Key invariants: applyStockMovement always FOR UPDATE, idempotency on sale, document number atomic counter
- Test coverage: unit (service tests) + integration (sample flows)
- Known issues / followups for M3
- Migration path for M3 (returns + payable/receivable)

- [ ] **Step 2: Update README**

Update milestone section in README:
```
- M1 Foundation + Master Data + Stock read-only ✓
- M2 Transaksi: Pembelian, Penjualan, Stock Movement, Mutasi, Opname ✓ (current)
- M3 Retur + Hutang/Piutang + Laporan
```

- [ ] **Step 3: Final verification**

```bash
pnpm format
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm build
```
All PASS.

- [ ] **Step 4: Tag release**

```bash
git add docs/HANDOFF.md README.md
git commit -m "docs: M2 handoff state + README milestone update"
git tag -a v0.2.0-m2 -m "M2: Transactions & Stock Movement complete"
```

---

## Self-Review Checklist (After Plan Written)

1. **Spec coverage:**
   - SDD §3.3 (StockMovement, StockAdjustment, StockTransfer): Tasks 1, 5-9
   - SDD §3.4 (PurchaseOrder, PurchaseInvoice): Tasks 1, 10-12
   - SDD §3.5 (SaleInvoice): Tasks 1, 13-15
   - SDD §4.2 (Stock posting): Task 3 (applyStockMovement)
   - SDD §4.1 (Document numbering): Task 2
   - SRS FR-INV-* (adjustment, transfer, opname): Tasks 5-9
   - SRS FR-PO-* / FR-PINV-*: Tasks 10-12
   - SRS FR-SALE-*: Tasks 13-15
   - NFR concurrency (FOR UPDATE, idempotency): Tasks 3, 13
   - UI-UX-FLOW §10 (POS layout): Task 14
   - UI-UX-FLOW §11 (purchase invoice): Task 12
   - UI-UX-FLOW §12 (transfer): Task 8
   - UI-UX-FLOW §13 (opname): Task 9

2. **Out of scope (M3):**
   - Returns (purchase + sale)
   - AccountPayable + payments
   - AccountReceivable + payments
   - Reports
   - Dashboard charts

3. **Dependencies between tasks:**
   - Task 1 (schema) -> all
   - Task 2 (doc number) -> Tasks 5, 7, 10, 12, 13
   - Task 3 (applyStockMovement) -> Tasks 5-15
   - Task 4 (setting helper) -> Task 13
   - Task 11 (PO pages) requires Task 10 (PO service)
   - Task 12 (PurchaseInvoice) hooks back to Task 10 (recomputePOStatus)
   - Task 14 (POS UI) requires Task 13 (sale service)
   - Task 16 (integration) requires Tasks 1-15 to test against

4. **Type consistency:**
   - All services use `Tx = Prisma.TransactionClient` consistently.
   - applyStockMovement signature: same in all callers.
   - Document number format: SO-YYYYMM-0001, PO-YYYYMM-0001, INV-YYYYMM-0001, ADJ-YYYYMM-0001, XFR-YYYYMM-0001.
   - Decimal handling: always `new Decimal(input)` for inputs, return `Decimal` for amounts.
   - ProductUnit always provides `conversionToBase` and `productId` for stock movement resolution.

5. **No placeholders:**
   - All code blocks have actual TS code, no "TODO".
   - Pages with shorter spec (Task 6 step 2-5, Task 8 step 1-4, Task 11) reference earlier patterns explicitly with field-level detail.

## Execution Handoff

Plan complete dan tersimpan di `docs/plans/M2-transactions-stock-movement.md`.

Berdasarkan pengalaman M1, **execution direct (bukan subagent)** lebih efisien:
- Subagent sering return empty / cut-off untuk task panjang.
- Direct implementation di session ini lebih reliable, pakai write tool + bash verify.
- Tradeoff: konteks main lebih kepenuhan, tapi acceptable karena pattern udah well-established dari M1.

Recommendation: jalankan M2 di **sesi baru** dengan plan + handoff M1 sebagai context starter, jangan di sesi ini (token udah lumayan terpakai).

Phase A (Task 1-4: schema + helpers) bisa selesai dalam 1 sesi. Phase B-D (Task 5-15: modules + UI) sebaiknya di-split per phase atau bahkan per task untuk konteks bersih.