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
