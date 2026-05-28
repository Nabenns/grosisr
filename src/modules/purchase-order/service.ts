import type { Prisma, PrismaClient } from "@prisma/client"
import Decimal from "decimal.js"
import { AppError } from "@/lib/errors"
import { nextDocumentCode, DOC_TYPES } from "@/lib/document-number"
import type { CreatePOInput, UpdatePOInput } from "./schema"

type Db = PrismaClient | Prisma.TransactionClient
type Tx = Prisma.TransactionClient

interface ItemMath {
  qty: number
  price: number
  discount: number
}

function computeItemSubtotal(item: ItemMath): Decimal {
  return new Decimal(item.qty)
    .times(item.price)
    .minus(new Decimal(item.qty).times(item.discount))
}

export function computePOTotal(items: ItemMath[]): Decimal {
  return items.reduce((acc, i) => acc.plus(computeItemSubtotal(i)), new Decimal(0))
}

export async function createPO(tx: Tx, input: CreatePOInput, actorId: string) {
  const code = await nextDocumentCode(
    tx,
    DOC_TYPES.PO.type,
    DOC_TYPES.PO.prefix,
    input.orderDate
  )
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
          subtotal: computeItemSubtotal(i)
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
          subtotal: computeItemSubtotal(i)
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
  const allReceived = po.items.every((i) => new Decimal(i.qtyReceived).gte(i.qty))
  const anyReceived = po.items.some((i) => new Decimal(i.qtyReceived).gt(0))
  const next = allReceived ? "COMPLETED" : anyReceived ? "PARTIAL" : "SENT"
  if (next !== po.status) {
    await tx.purchaseOrder.update({ where: { id: poId }, data: { status: next } })
  }
}
