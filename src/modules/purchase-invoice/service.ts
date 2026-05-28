import type { Prisma } from "@prisma/client"
import Decimal from "decimal.js"
import { AppError } from "@/lib/errors"
import { applyStockMovement } from "@/lib/stock-movement"
import { nextDocumentCode, DOC_TYPES } from "@/lib/document-number"
import { recomputePOStatus } from "@/modules/purchase-order/service"
import type { CreatePInvInput, VoidPInvInput } from "./schema"

type Tx = Prisma.TransactionClient

function computeItemSubtotal(qty: number, price: number, discount: number): Decimal {
  return new Decimal(qty).times(price).minus(new Decimal(qty).times(discount))
}

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
    subtotal = subtotal.plus(computeItemSubtotal(item.qty, item.price, item.discount))
  }
  const total = subtotal
    .minus(new Decimal(input.discountAmount))
    .plus(new Decimal(input.taxAmount))

  // 3. Resolve productId from productUnitId
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

  // 5. Stock movements (IN to warehouse)
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
    await recomputePOStatus(tx, input.poId)
  }

  return invoice
}

export async function voidPurchaseInvoice(
  tx: Tx,
  input: VoidPInvInput,
  actorId: string
) {
  const inv = await tx.purchaseInvoice.findUnique({
    where: { id: input.id },
    include: { items: { include: { productUnit: true } } }
  })
  if (!inv) throw new AppError("NOT_FOUND", "Faktur tidak ditemukan")
  if (inv.status === "VOID") {
    throw new AppError("INVALID_INPUT", "Faktur sudah VOID")
  }
  if (new Decimal(inv.paidAmount).gt(0)) {
    throw new AppError(
      "INVALID_INPUT",
      "Faktur sudah ada pembayaran, tidak bisa di-VOID langsung"
    )
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
      note: `VOID: ${input.reason}`,
      allowNegative: true
    })
  }

  // If linked to PO, decrement qtyReceived back
  if (inv.poId) {
    for (const item of inv.items) {
      // Find PO item by productUnitId (best effort - admins shouldn't void with multi-line same SKU)
      const poItem = await tx.purchaseOrderItem.findFirst({
        where: { poId: inv.poId, productUnitId: item.productUnitId }
      })
      if (poItem) {
        const newReceived = new Decimal(poItem.qtyReceived).minus(item.qty)
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { qtyReceived: newReceived.lt(0) ? new Decimal(0) : newReceived }
        })
      }
    }
    await recomputePOStatus(tx, inv.poId)
  }

  return tx.purchaseInvoice.update({
    where: { id: input.id },
    data: {
      status: "VOID",
      voidedAt: new Date(),
      voidedById: actorId,
      voidReason: input.reason
    }
  })
}
