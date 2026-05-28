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

  // SELECT FOR UPDATE the balance row to serialize concurrent modifications.
  const rows = await tx.$queryRawUnsafe<{ qty_in_base: string }[]>(
    `SELECT "qtyInBase"::text AS qty_in_base FROM "StockBalance"
     WHERE "productId" = $1 AND "warehouseId" = $2
     FOR UPDATE`,
    params.productId,
    params.warehouseId
  )
  const current = rows[0] ? new Decimal(rows[0].qty_in_base) : new Decimal(0)
  const delta = params.direction === "IN" ? qty : qty.neg()
  const next = current.plus(delta)

  // Negative-stock guard.
  // Some movement types (ADJUSTMENT/OPNAME) explicitly allow negative diffs because
  // operator might be correcting an over-counted past entry.
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
