import type { Prisma } from "@prisma/client"
import Decimal from "decimal.js"
import { AppError } from "@/lib/errors"
import { applyStockMovement } from "@/lib/stock-movement"
import { nextDocumentCode, DOC_TYPES } from "@/lib/document-number"
import { getBooleanSetting } from "@/lib/setting"
import type { PostSaleInput, VoidSaleInput } from "./schema"

type Tx = Prisma.TransactionClient

function computeItemSubtotal(qty: number, price: number, discount: number): Decimal {
  return new Decimal(qty).times(price).minus(new Decimal(qty).times(discount))
}

export async function postSale(tx: Tx, input: PostSaleInput, actorId: string) {
  // 0. Idempotency check
  const existing = await tx.idempotencyKey.findUnique({
    where: { key: input.idempotencyKey }
  })
  if (existing) {
    throw new AppError(
      "IDEMPOTENCY_REPLAY",
      "Transaksi sudah pernah di-post (idempotency key duplikat)"
    )
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
    subtotal = subtotal.plus(computeItemSubtotal(item.qty, item.price, item.discount))
  }
  const total = subtotal
    .minus(new Decimal(input.discountAmount))
    .plus(new Decimal(input.taxAmount))

  // 3. Payment validation
  const paid = new Decimal(input.paidAmount)
  let change = new Decimal(0)
  let status: "PAID" | "UNPAID" | "PARTIAL"
  if (input.saleType === "CASH") {
    if (paid.lt(total)) {
      throw new AppError("INVALID_INPUT", "Pembayaran kurang dari total")
    }
    change = paid.minus(total)
    status = "PAID"
  } else {
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
    select: { id: true, productId: true, conversionToBase: true }
  })
  const puMap = new Map(productUnits.map((pu) => [pu.id, pu]))

  const allowNegative = await getBooleanSetting(tx, "allow_negative_stock", false)

  // 6. Create invoice
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
        create: input.items.map((i) => ({
          productUnitId: i.productUnitId,
          qty: new Decimal(i.qty),
          price: new Decimal(i.price),
          discount: new Decimal(i.discount),
          subtotal: computeItemSubtotal(i.qty, i.price, i.discount)
        }))
      }
    }
  })

  // 7. Stock movements (OUT)
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

  // 8. Save idempotency key
  await tx.idempotencyKey.create({
    data: {
      key: input.idempotencyKey,
      responseHash: invoice.id,
      payload: { invoiceId: invoice.id, code: invoice.code }
    }
  })

  return invoice
}

export async function voidSale(tx: Tx, input: VoidSaleInput, actorId: string) {
  const inv = await tx.saleInvoice.findUnique({
    where: { id: input.id },
    include: { items: { include: { productUnit: true } } }
  })
  if (!inv) throw new AppError("NOT_FOUND", "Faktur tidak ditemukan")
  if (inv.status === "VOID") {
    throw new AppError("INVALID_INPUT", "Faktur sudah VOID")
  }

  // Reverse stock (IN)
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
