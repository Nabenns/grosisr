# SDD — Sistem Manajemen Grosir

**Status:** Draft v1
**Tanggal:** 2026-05-28

## 1. Pendahuluan

Dokumen ini menjabarkan desain teknis sistem: arsitektur, struktur kode, data model lengkap, alur posting transaksi, dan keputusan teknis penting. Dibaca bersama PRD dan SRS.

## 2. Arsitektur

### 2.1 Stack
- **Runtime:** Node.js 20 LTS, TypeScript 5.x strict mode.
- **Framework:** Next.js 15 App Router (single codebase frontend + backend via Server Actions + Route Handlers).
- **Database:** PostgreSQL 16.
- **ORM:** Prisma 5.
- **UI:** Tailwind CSS + shadcn/ui (Radix primitives) + lucide-react icons.
- **Form:** react-hook-form + zod resolver.
- **State (client):** React state + URL state (search params) untuk filter list. Tidak pakai global store di MVP (server-driven cukup).
- **Auth:** NextAuth (Auth.js v5) Credentials provider, JWT session.
- **Validation:** Zod di Server Action boundary.
- **Logging:** pino, file rotated.
- **Testing:** Vitest (unit + integration), Playwright (E2E).
- **Lint/Format:** ESLint + Prettier.
- **Package manager:** pnpm.

### 2.2 Pola Arsitektur

**Layered architecture per modul:**
```
src/modules/<domain>/
  schema.ts        # Zod schema (input validation)
  service.ts       # Business logic, pure (Prisma client di-inject)
  actions.ts       # Server Actions (auth guard + service call + return result)
  queries.ts       # Server-side data fetching for components (read-only)
  components/      # UI components specific to this module
  types.ts         # TS types (re-export Prisma + custom)
```

**Shared:**
```
src/lib/
  db.ts            # Prisma client singleton
  auth.ts          # NextAuth config + helpers
  permissions.ts   # Permission keys + role-permission seed
  audit.ts         # Audit log helper
  number.ts        # Document numbering helper
  money.ts         # IDR formatting + decimal math (use dinero or decimal.js)
  date.ts          # Date utilities (Asia/Jakarta tz)
  errors.ts        # AppError + error codes
  result.ts        # Result<T> type for actions
src/app/
  (auth)/          # Login route group
  (dashboard)/     # Authenticated app
    layout.tsx     # Sidebar + topbar
    dashboard/page.tsx
    master/...
    inventory/...
    purchase/...
    sale/...
    finance/...
    report/...
    settings/...
src/components/    # Cross-domain UI (DataTable, FormField, etc)
```

**Filosofi:**
- Server Actions ≠ business logic. Action = thin (auth guard, parse input, call service, format response).
- Service = pure business logic, return domain value atau throw `AppError`.
- Queries = read-only, optimized for view (join + select narrow).
- Mutation always via Server Action (idempotent + audited).

### 2.3 Data Flow

**Read flow (list/detail page):**
```
Browser → Next.js RSC page → queries.ts (Prisma) → render HTML
```

**Mutation flow:**
```
Form (client) → Server Action → auth guard → zod parse → service.ts
  → Prisma $transaction:
      - validate business rule
      - mutate domain entities
      - generate StockMovement (if stock-affecting)
      - update StockBalance cache
      - generate AuditLog
  → return Result<T>
Client: success → revalidatePath + toast; error → form error / toast
```

### 2.4 Concurrency Strategy

- **Stock posting**: SELECT ... FOR UPDATE pada `StockBalance` row terkait sebelum compute new balance.
- **Document numbering**: `UPDATE Counter SET value = value + 1 WHERE key = ? RETURNING value` (atomic).
- **Idempotency**: tabel `IdempotencyKey (key, response_hash, created_at)`. Cek sebelum execute mutation; jika exist + hash match return cached response.
- **Optimistic concurrency** untuk edit master data: field `version` (int), increment per update, where clause `version = ?` di update query; mismatch → return conflict error.

## 3. Data Model (Prisma Schema Outline)

Fragment penting; field lengkap di `prisma/schema.prisma` saat implementasi.

### 3.1 Identity & Access

```prisma
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  email        String?  @unique
  passwordHash String
  name         String
  isActive     Boolean  @default(true)
  defaultWarehouseId String?
  defaultWarehouse   Warehouse? @relation(fields: [defaultWarehouseId], references: [id])
  roles        UserRole[]
  warehouseAccess UserWarehouse[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?
}

model Role {
  id          String @id @default(cuid())
  name        String @unique
  description String?
  permissions RolePermission[]
  users       UserRole[]
  isSystem    Boolean @default(false) // OWNER tidak bisa dihapus
}

model Permission {
  id          String @id @default(cuid())
  key         String @unique // mis. "product.create"
  description String
  roles       RolePermission[]
}

model RolePermission { roleId String; permissionId String; @@id([roleId, permissionId]) ... }
model UserRole { userId String; roleId String; @@id([userId, roleId]) ... }
model UserWarehouse { userId String; warehouseId String; @@id([userId, warehouseId]) }
```

### 3.2 Master Data

```prisma
model Category {
  id       String @id @default(cuid())
  name     String
  parentId String?
  parent   Category? @relation("Subcategory", fields: [parentId], references: [id])
  children Category[] @relation("Subcategory")
  products Product[]
  isActive Boolean @default(true)
  deletedAt DateTime?
  @@unique([name, parentId])
}

model Brand { id String @id; name String @unique; products Product[]; ... }

model Unit {
  id   String @id @default(cuid())
  name String @unique // pcs, pak, slop, dus, bal, karton
  productUnits ProductUnit[]
}

model Product {
  id           String @id @default(cuid())
  sku          String @unique
  name         String
  categoryId   String
  brandId      String?
  baseUnitId   String
  description  String?
  imageUrl     String?
  hasCukai     Boolean @default(false)
  hasHet       Boolean @default(false)
  hetPrice     Decimal? @db.Decimal(15,2)
  minStock     Int     @default(0) // threshold default produk; override per-gudang via StockBalance.minStock
  isActive     Boolean @default(true)
  version      Int     @default(0)
  deletedAt    DateTime?

  category     Category @relation(...)
  brand        Brand?   @relation(...)
  baseUnit     Unit     @relation(...)
  units        ProductUnit[]
  stocks       StockBalance[]
  movements    StockMovement[]
  @@index([name])
}

model ProductUnit {
  id              String @id @default(cuid())
  productId       String
  unitId          String
  conversionToBase Decimal @db.Decimal(15,4) // 1 pak = 20 batang -> 20
  barcode         String? @unique
  purchasePrice   Decimal @db.Decimal(15,2)
  salePrice       Decimal @db.Decimal(15,2)
  isDefaultPurchase Boolean @default(false)
  isDefaultSale     Boolean @default(false)
  product         Product @relation(...)
  unit            Unit    @relation(...)
  @@unique([productId, unitId])
  @@index([barcode])
}

model Supplier {
  id String @id; code String @unique; name String; phone String?; address String?
  npwp String?; termOfPaymentDays Int @default(0); isActive Boolean @default(true)
  deletedAt DateTime?
  purchaseOrders PurchaseOrder[]
  invoices       PurchaseInvoice[]
  payables       AccountPayable[]
}

model Customer {
  id String @id; code String @unique; name String; phone String?; address String?
  customerType CustomerType @default(RETAIL) // enum RESELLER, RETAIL
  creditLimit  Decimal @default(0) @db.Decimal(15,2)
  termOfPaymentDays Int @default(0)
  isActive Boolean @default(true)
  deletedAt DateTime?
  sales SaleInvoice[]
  receivables AccountReceivable[]
}

model Warehouse {
  id String @id; code String @unique; name String; address String?
  isActive Boolean @default(true); isDefault Boolean @default(false)
  deletedAt DateTime?
  stocks StockBalance[]
  movements StockMovement[]
  userAccess UserWarehouse[]
}
```

### 3.3 Inventory

```prisma
model StockBalance {
  productId   String
  warehouseId String
  qtyInBase   Decimal @db.Decimal(15,4) @default(0)
  minStock    Int?    // override threshold per-gudang; null = pakai Product.minStock
  updatedAt   DateTime @updatedAt
  product     Product   @relation(...)
  warehouse   Warehouse @relation(...)
  @@id([productId, warehouseId])
  @@index([warehouseId])
}

enum MovementType { PURCHASE SALE ADJUSTMENT TRANSFER_IN TRANSFER_OUT RETURN_IN RETURN_OUT OPNAME }
enum MovementDirection { IN OUT }

model StockMovement {
  id           String @id @default(cuid())
  productId    String
  warehouseId  String
  qtyInBase    Decimal @db.Decimal(15,4)
  direction    MovementDirection
  movementType MovementType
  refType      String  // "PurchaseInvoice" | "SaleInvoice" | "StockAdjustment" | "StockTransfer"
  refId        String
  occurredAt   DateTime @default(now())
  createdById  String
  note         String?
  product      Product   @relation(...)
  warehouse    Warehouse @relation(...)
  @@index([productId, warehouseId, occurredAt])
  @@index([refType, refId])
}

enum AdjustmentReason { RUSAK HILANG OPNAME KOREKSI LAINNYA }
enum AdjustmentStatus { DRAFT POSTED CANCELLED }

model StockAdjustment {
  id          String @id @default(cuid())
  code        String @unique
  warehouseId String
  reason      AdjustmentReason
  status      AdjustmentStatus @default(DRAFT)
  note        String?
  createdById String
  postedAt    DateTime?
  postedById  String?
  items       StockAdjustmentItem[]
  createdAt   DateTime @default(now())
}

model StockAdjustmentItem {
  id           String @id @default(cuid())
  adjustmentId String
  productId    String
  qtyInBaseDiff Decimal @db.Decimal(15,4) // signed
  note         String?
}

enum TransferStatus { DRAFT IN_TRANSIT COMPLETED CANCELLED }

model StockTransfer {
  id              String @id @default(cuid())
  code            String @unique
  fromWarehouseId String
  toWarehouseId   String
  status          TransferStatus @default(DRAFT)
  note            String?
  createdById     String
  sentAt          DateTime?
  receivedAt      DateTime?
  receivedById    String?
  items           StockTransferItem[]
  createdAt       DateTime @default(now())
}

model StockTransferItem { id String @id; transferId String; productId String; qtyInBase Decimal @db.Decimal(15,4) }
```

### 3.4 Purchase

```prisma
enum PurchaseOrderStatus { DRAFT SENT PARTIAL COMPLETED CANCELLED }

model PurchaseOrder {
  id           String @id @default(cuid())
  code         String @unique
  supplierId   String
  warehouseId  String
  orderDate    DateTime
  expectedDate DateTime?
  status       PurchaseOrderStatus @default(DRAFT)
  total        Decimal @db.Decimal(15,2)
  note         String?
  createdById  String
  items        PurchaseOrderItem[]
  invoices     PurchaseInvoice[]
}

model PurchaseOrderItem {
  id            String @id @default(cuid())
  poId          String
  productUnitId String
  qty           Decimal @db.Decimal(15,4)
  qtyReceived   Decimal @db.Decimal(15,4) @default(0)
  price         Decimal @db.Decimal(15,2)
  discount      Decimal @db.Decimal(15,2) @default(0)
  subtotal      Decimal @db.Decimal(15,2)
}

enum PurchaseInvoiceStatus { UNPAID PARTIAL PAID VOID }

model PurchaseInvoice {
  id           String @id @default(cuid())
  code         String @unique
  poId         String?
  supplierId   String
  warehouseId  String
  supplierInvoiceNo String?
  invoiceDate  DateTime
  dueDate      DateTime
  subtotal     Decimal @db.Decimal(15,2)
  discount     Decimal @db.Decimal(15,2) @default(0)
  tax          Decimal @db.Decimal(15,2) @default(0)
  total        Decimal @db.Decimal(15,2)
  paidAmount   Decimal @db.Decimal(15,2) @default(0)
  status       PurchaseInvoiceStatus @default(UNPAID)
  note         String?
  createdById  String
  postedAt     DateTime
  voidedAt     DateTime?
  voidedById   String?
  voidReason   String?
  items        PurchaseInvoiceItem[]
  payable      AccountPayable?
  returns      PurchaseReturn[]
}

model PurchaseInvoiceItem {
  id            String @id @default(cuid())
  invoiceId     String
  productUnitId String
  qty           Decimal @db.Decimal(15,4)
  qtyReturned   Decimal @db.Decimal(15,4) @default(0)
  price         Decimal @db.Decimal(15,2)
  discount      Decimal @db.Decimal(15,2) @default(0)
  subtotal      Decimal @db.Decimal(15,2)
}

model PurchaseReturn {
  id          String @id @default(cuid())
  code        String @unique
  invoiceId   String
  refNo       String? // no referensi supplier
  returnDate  DateTime
  total       Decimal @db.Decimal(15,2)
  note        String?
  createdById String
  postedAt    DateTime
  items       PurchaseReturnItem[]
}

model PurchaseReturnItem {
  id            String @id @default(cuid())
  returnId      String
  invoiceItemId String
  productUnitId String
  qty           Decimal @db.Decimal(15,4)
  price         Decimal @db.Decimal(15,2)
  subtotal      Decimal @db.Decimal(15,2)
}
```

### 3.5 Sale

```prisma
enum SaleType { CASH CREDIT }
enum SaleStatus { DRAFT UNPAID PARTIAL PAID VOID }
enum PaymentMethod { TUNAI TRANSFER QRIS KARTU }

model SaleInvoice {
  id            String @id @default(cuid())
  code          String @unique
  customerId    String?
  warehouseId   String
  saleType      SaleType @default(CASH)
  invoiceDate   DateTime
  dueDate       DateTime?
  subtotal      Decimal @db.Decimal(15,2)
  discount      Decimal @db.Decimal(15,2) @default(0)
  tax           Decimal @db.Decimal(15,2) @default(0)
  total         Decimal @db.Decimal(15,2)
  paidAmount    Decimal @db.Decimal(15,2) @default(0)
  changeAmount  Decimal @db.Decimal(15,2) @default(0)
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
  receivable    AccountReceivable?
  returns       SaleReturn[]
}

model SaleInvoiceItem {
  id            String @id @default(cuid())
  invoiceId     String
  productUnitId String
  qty           Decimal @db.Decimal(15,4)
  qtyReturned   Decimal @db.Decimal(15,4) @default(0)
  price         Decimal @db.Decimal(15,2)
  discount      Decimal @db.Decimal(15,2) @default(0)
  subtotal      Decimal @db.Decimal(15,2)
}

model SaleReturn {
  id          String @id @default(cuid())
  code        String @unique
  invoiceId   String
  returnDate  DateTime
  total       Decimal @db.Decimal(15,2)
  refundMethod String? // CASH | RECEIVABLE_REDUCTION
  note        String?
  createdById String
  postedAt    DateTime
  items       SaleReturnItem[]
}

model SaleReturnItem {
  id            String @id @default(cuid())
  returnId      String
  invoiceItemId String
  productUnitId String
  qty           Decimal @db.Decimal(15,4)
  price         Decimal @db.Decimal(15,2)
  subtotal      Decimal @db.Decimal(15,2)
}
```

### 3.6 Finance

```prisma
enum PayableStatus { UNPAID PARTIAL PAID }

model AccountPayable {
  id          String @id @default(cuid())
  supplierId  String
  invoiceId   String @unique
  amount      Decimal @db.Decimal(15,2)
  paidAmount  Decimal @db.Decimal(15,2) @default(0)
  dueDate     DateTime
  status      PayableStatus @default(UNPAID)
  payments    PayablePaymentApply[]
}

model PayablePayment {
  id           String @id @default(cuid())
  code         String @unique
  supplierId   String
  paymentDate  DateTime
  method       PaymentMethod
  refNo        String?
  amount       Decimal @db.Decimal(15,2)
  note         String?
  createdById  String
  applies      PayablePaymentApply[]
}

model PayablePaymentApply {
  id         String @id @default(cuid())
  paymentId  String
  payableId  String
  amount     Decimal @db.Decimal(15,2)
}

enum ReceivableStatus { UNPAID PARTIAL PAID }

model AccountReceivable {
  id          String @id @default(cuid())
  customerId  String
  invoiceId   String @unique
  amount      Decimal @db.Decimal(15,2)
  paidAmount  Decimal @db.Decimal(15,2) @default(0)
  dueDate     DateTime
  status      ReceivableStatus @default(UNPAID)
  payments    ReceivablePaymentApply[]
}

model ReceivablePayment {
  id           String @id @default(cuid())
  code         String @unique
  customerId   String
  paymentDate  DateTime
  method       PaymentMethod
  refNo        String?
  amount       Decimal @db.Decimal(15,2)
  note         String?
  createdById  String
  applies      ReceivablePaymentApply[]
}

model ReceivablePaymentApply {
  id            String @id @default(cuid())
  paymentId     String
  receivableId  String
  amount        Decimal @db.Decimal(15,2)
}
```

### 3.7 Audit & Ops

```prisma
enum AuditAction { CREATE UPDATE DELETE POST VOID }

model AuditLog {
  id           String @id @default(cuid())
  actorUserId  String
  entity       String   // "Product", "SaleInvoice", etc
  entityId     String
  action       AuditAction
  diffJson     Json?
  occurredAt   DateTime @default(now())
  @@index([entity, entityId])
  @@index([actorUserId, occurredAt])
}

model Counter {
  key   String @id // "PURCHASE_ORDER_202605"
  value Int    @default(0)
}

model IdempotencyKey {
  key          String @id
  responseHash String
  payload      Json
  createdAt    DateTime @default(now())
  @@index([createdAt]) // untuk cleanup > 24 jam
}

model Setting {
  key   String @id // "allow_negative_stock", "require_owner_approval_pct"
  value String // serialized JSON
  updatedAt DateTime @updatedAt
}
```

## 4. Algoritma & Flow Posting

### 4.1 Document Numbering

```
function nextDocCode(type: string, date: Date, tx: PrismaTx): string {
  const ym = format(date, "yyyyMM")           // "202605"
  const key = `${type}_${ym}`                  // "SALE_202605"
  const result = await tx.$queryRaw`
    INSERT INTO "Counter" (key, value) VALUES (${key}, 1)
    ON CONFLICT (key) DO UPDATE SET value = "Counter".value + 1
    RETURNING value
  `
  const seq = result[0].value
  return `${TYPE_PREFIX[type]}-${ym}-${String(seq).padStart(4, "0")}`
}
```

Prefix mapping: `PO`, `INV` (purchase invoice), `SO` (sale), `RTNB` (purchase return), `RTNJ` (sale return), `ADJ` (adjustment), `XFR` (transfer), `BYR` (payable payment), `LNS` (receivable payment).

### 4.2 Stock Posting (Generic)

Setiap operasi yang ngubah stok memanggil `applyStockMovement`:

```typescript
async function applyStockMovement(tx, params: {
  productId, warehouseId, qtyInBase, direction, movementType, refType, refId, actorId, note
}) {
  // 1. SELECT FOR UPDATE balance
  const balance = await tx.$queryRaw`
    SELECT * FROM "StockBalance"
    WHERE product_id = ${params.productId} AND warehouse_id = ${params.warehouseId}
    FOR UPDATE
  `

  const currentQty = balance[0]?.qty_in_base ?? 0
  const delta = params.direction === "IN" ? params.qtyInBase : -params.qtyInBase
  const newQty = currentQty + delta

  // 2. Check negative stock setting (kecuali OPNAME/ADJUSTMENT yang explicit allow)
  if (newQty < 0 && !ALLOW_NEGATIVE_FOR.includes(params.movementType)) {
    const setting = await getSetting(tx, "allow_negative_stock")
    if (!setting) throw new AppError("STOCK_INSUFFICIENT", "Stok tidak cukup")
  }

  // 3. Upsert balance
  await tx.stockBalance.upsert({
    where: { productId_warehouseId: { productId, warehouseId } },
    create: { productId, warehouseId, qtyInBase: newQty },
    update: { qtyInBase: newQty }
  })

  // 4. Insert movement
  await tx.stockMovement.create({
    data: { ...params, createdById: params.actorId, occurredAt: new Date() }
  })
}
```

### 4.3 Posting Sale Invoice

```
beginTransaction
  validate input (zod)
  validate stock per item (precheck cepat sebelum lock semua row)
  if customer CREDIT and creditCheck fails → reject (kecuali override permission)
  generate code via nextDocCode("SALE", invoiceDate)
  for each item:
    convert qty * conversionToBase → qtyInBase
    applyStockMovement(productId, warehouseId, qtyInBase, OUT, SALE, "SaleInvoice", saleId)
  insert SaleInvoice + SaleInvoiceItem rows
  if saleType=CREDIT:
    insert AccountReceivable
  insert AuditLog (action POST)
commitTransaction
```

### 4.4 Posting Purchase Invoice

```
beginTransaction
  validate input
  generate code
  for each item:
    qtyInBase = qty * conversionToBase
    applyStockMovement(productId, warehouseId, qtyInBase, IN, PURCHASE, "PurchaseInvoice", invoiceId)
  insert PurchaseInvoice + items
  insert AccountPayable
  if linked to PO:
    update PurchaseOrderItem.qtyReceived
    recompute PO status (PARTIAL / COMPLETED)
  insert AuditLog
commitTransaction
```

### 4.5 Stock Transfer

**Send (DRAFT → IN_TRANSIT):**
```
beginTransaction
  for each item: applyStockMovement(productId, fromWarehouseId, qty, OUT, TRANSFER_OUT, "StockTransfer", id)
  update StockTransfer.status = IN_TRANSIT, sentAt
  audit
commit
```

**Receive (IN_TRANSIT → COMPLETED):**
```
beginTransaction
  for each item: applyStockMovement(productId, toWarehouseId, qty, IN, TRANSFER_IN, "StockTransfer", id)
  update StockTransfer.status = COMPLETED, receivedAt, receivedById
  audit
commit
```

Catatan: stok IN_TRANSIT visible di laporan via query: movements TRANSFER_OUT - TRANSFER_IN per transfer (selisih = masih in transit).

### 4.6 Stock Adjustment / Opname Posting

```
beginTransaction
  for each item with qtyInBaseDiff != 0:
    direction = diff > 0 ? IN : OUT
    applyStockMovement(productId, warehouseId, abs(diff), direction, ADJUSTMENT, "StockAdjustment", id)
  update StockAdjustment.status = POSTED, postedAt, postedById
  audit
commit
```

### 4.7 Return Posting

**Purchase Return:**
```
beginTransaction
  validate qty per item ≤ (invoice.qty - alreadyReturned)
  for each item: applyStockMovement(productId, warehouseId, qtyInBase, OUT, RETURN_OUT, "PurchaseReturn", id)
  insert PurchaseReturn + items
  update PurchaseInvoiceItem.qtyReturned
  reduce AccountPayable.amount (and recompute paidAmount if needed)
  audit
commit
```

**Sale Return:**
```
beginTransaction
  validate qty
  for each item: applyStockMovement(productId, warehouseId, qtyInBase, IN, RETURN_IN, "SaleReturn", id)
  insert SaleReturn + items
  update SaleInvoiceItem.qtyReturned
  if refundMethod = RECEIVABLE_REDUCTION → reduce AR.amount
  if refundMethod = CASH → no AR change (cash refund tracked di payment ledger if applicable)
  audit
commit
```

### 4.8 Payment Apply (Payable/Receivable)

```
beginTransaction
  validate sum(applies.amount) == payment.amount
  insert PayablePayment / ReceivablePayment
  for each apply:
    insert PayablePaymentApply / ReceivablePaymentApply
    update Payable/Receivable.paidAmount += amount
    recompute status (PAID if paid >= amount, PARTIAL if 0 < paid < amount)
  audit
commit
```

## 5. Permissions Seed

```typescript
const PERMISSIONS = [
  // master
  "category.read", "category.write",
  "brand.read", "brand.write",
  "unit.read", "unit.write",
  "product.read", "product.write", "product.delete", "product.import",
  "supplier.read", "supplier.write",
  "customer.read", "customer.write",
  "warehouse.read", "warehouse.write",
  // inventory
  "inventory.read", "inventory.adjustment.create", "inventory.adjustment.post",
  "inventory.transfer.create", "inventory.transfer.send", "inventory.transfer.receive",
  "inventory.opname.run",
  // purchase
  "purchase.po.read", "purchase.po.write",
  "purchase.invoice.read", "purchase.invoice.write", "purchase.invoice.post",
  "purchase.invoice.void", "purchase.return.write",
  // sale
  "sale.read", "sale.write", "sale.post",
  "sale.discount.apply", "sale.discount.high", // > 5%
  "sale.void", "sale.return.write",
  "sale.credit.override_limit", "sale.het_override",
  // finance
  "finance.payable.read", "finance.payable.pay",
  "finance.receivable.read", "finance.receivable.collect",
  // report
  "report.stock", "report.sale", "report.purchase", "report.finance",
  // settings
  "user.read", "user.write", "role.write", "setting.write",
  "audit.read"
]

const ROLES = {
  OWNER: "*", // all
  ADMIN: ["category.*","brand.*","unit.*","product.*","supplier.*","customer.*","warehouse.read",
          "inventory.*","purchase.*","sale.*","finance.*","report.*","audit.read"],
  KASIR: ["product.read","customer.read","customer.write","sale.read","sale.write","sale.post",
          "sale.discount.apply","inventory.read"],
  GUDANG: ["product.read","supplier.read","warehouse.read","inventory.*",
           "purchase.invoice.read","purchase.invoice.write","purchase.invoice.post",
           "purchase.return.write"],
  VIEWER: ["*.read"]
}
```

## 6. Search & Indexing

- Postgres extension `pg_trgm` aktifkan: `CREATE EXTENSION IF NOT EXISTS pg_trgm`.
- Index trigram: `CREATE INDEX product_name_trgm ON "Product" USING GIN (name gin_trgm_ops)`.
- Search produk pakai `WHERE name ILIKE %q% OR sku ILIKE %q% OR EXISTS (SELECT 1 FROM "ProductUnit" pu WHERE pu.product_id = p.id AND pu.barcode = q)`.
- Tambahan index reguler: lihat di setiap model `@@index`.

## 7. Error Handling

```typescript
class AppError extends Error {
  constructor(public code: string, public message: string, public fields?: Record<string,string>) {
    super(message)
  }
}

type Result<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; fields?: Record<string,string> } }

// Server Action wrapper
async function action<T>(handler: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await handler()
    return { success: true, data }
  } catch (e) {
    if (e instanceof AppError) return { success: false, error: { code: e.code, message: e.message, fields: e.fields } }
    logger.error({ err: e }, "Unhandled action error")
    return { success: false, error: { code: "INTERNAL", message: "Terjadi kesalahan internal" } }
  }
}
```

Error codes utama: `STOCK_INSUFFICIENT`, `CREDIT_LIMIT_EXCEEDED`, `HET_VIOLATION`, `INVALID_INPUT`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT_VERSION`, `IDEMPOTENCY_REPLAY`, `INTERNAL`.

## 8. Audit Log Implementation

- Prisma extension (`$extends`) wrap mutation methods untuk model di `AUDITED_MODELS` set.
- Manual audit untuk transaksi via helper: `audit.log({ actor, entity, entityId, action, before, after })`.
- Diff helper: bandingkan `before` vs `after`, simpan hanya field yang beda.
- Audit log query: `actor`, `entity`, `entityId`, range tanggal; pagination 50/page.

## 9. Reporting Strategy

- Laporan kompleks (penjualan group by produk/kategori/customer) pakai raw SQL CTE untuk performa.
- Aging hutang/piutang: `CASE WHEN due_date - today` bucket.
- Kartu stok produk: query langsung dari `StockMovement` dengan running balance via window function `SUM() OVER (ORDER BY occurred_at)`.
- Export CSV/Excel via library `papaparse` / `exceljs`. PDF via `@react-pdf/renderer` atau Puppeteer (decide saat implementasi).

## 10. Testing Strategy

- **Unit (Vitest)**: pure functions di `service.ts` — money math, stock balance compute, document numbering format, validation rules. Mock Prisma via `vitest-mock-extended`.
- **Integration**: Postgres docker container + reset between tests. Test transaction flow: posting sale, posting purchase, transfer cycle, return chain. Coverage target 100% untuk `posting.ts` per modul.
- **E2E (Playwright)**: 5 happy path:
  1. Login + tambah produk + jual cash
  2. Terima PO dari supplier
  3. Mutasi gudang (kirim + terima)
  4. Stock opname siklus lengkap
  5. Bayar hutang + lunasin piutang

## 11. Deployment

- VPS Ubuntu 22.04, Postgres 16 lokal, Node 20.
- PM2 cluster mode (2-4 instance), Nginx reverse proxy + SSL Let's Encrypt.
- Backup cron: `0 2 * * * pg_dump ... | gzip > /backup/$(date).sql.gz`, retain 30 hari.
- Env: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `APP_TIMEZONE=Asia/Jakarta`, `LOG_LEVEL`.
- Migration: `prisma migrate deploy` saat release; rollback manual dengan migration revert atau restore backup.

## 12. Open Decisions (defer to implementation)

- PDF generator: react-pdf vs Puppeteer headless (decide saat butuh print struk/PO).
- File upload storage: lokal disk dulu; rencana migrasi ke S3-compatible jika multi-server.
- Real-time stock notification: polling 30s atau SSE (defer, MVP polling cukup).
- Background jobs: belum perlu queue (BullMQ/etc); semua sync di Server Action di MVP.
