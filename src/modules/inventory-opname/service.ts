import type { Prisma, PrismaClient } from "@prisma/client"
import Decimal from "decimal.js"
import { AppError } from "@/lib/errors"
import { applyStockMovement } from "@/lib/stock-movement"
import { nextDocumentCode, DOC_TYPES } from "@/lib/document-number"
import type { GenerateWorksheetInput, PostOpnameInput } from "./schema"

type Db = PrismaClient | Prisma.TransactionClient
type Tx = Prisma.TransactionClient

export interface WorksheetRow {
  productId: string
  sku: string
  name: string
  unitName: string
  qtySystem: number
}

export async function generateWorksheet(
  db: Db,
  input: GenerateWorksheetInput
): Promise<WorksheetRow[]> {
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
    qtySystem: Number(p.stocks[0]?.qtyInBase ?? 0)
  }))
}

export async function postOpname(
  tx: Tx,
  input: PostOpnameInput,
  actorId: string
) {
  // For each item, compare qtyPhysical vs current StockBalance.
  // Generate adjustment entries only for items with diff != 0.
  const adjustmentItems: {
    productId: string
    qtyInBaseDiff: Decimal
    note: string | null
  }[] = []
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
      note: input.note ?? "Stock opname",
      createdById: actorId,
      items: {
        create: adjustmentItems.map((i) => ({
          productId: i.productId,
          qtyInBaseDiff: i.qtyInBaseDiff,
          note: i.note
        }))
      },
      postedAt: new Date(),
      postedById: actorId
    }
  })

  // Apply movements directly (auto-post)
  for (const item of adjustmentItems) {
    if (item.qtyInBaseDiff.isZero()) continue
    await applyStockMovement(tx, {
      productId: item.productId,
      warehouseId: input.warehouseId,
      qtyInBase: item.qtyInBaseDiff.abs(),
      direction: item.qtyInBaseDiff.isPositive() ? "IN" : "OUT",
      movementType: "OPNAME",
      refType: "StockAdjustment",
      refId: adj.id,
      actorId,
      note: item.note
    })
  }

  return tx.stockAdjustment.update({
    where: { id: adj.id },
    data: { status: "POSTED" }
  })
}
