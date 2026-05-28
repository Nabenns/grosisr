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
    throw new AppError(
      "INVALID_INPUT",
      `Transfer status ${transfer.status} tidak bisa di-kirim`
    )
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
    throw new AppError(
      "INVALID_INPUT",
      `Transfer status ${transfer.status} tidak bisa di-terima`
    )
  }

  const itemMap = new Map(transfer.items.map((i) => [i.id, i]))
  for (const r of input.receivedItems) {
    const sent = itemMap.get(r.itemId)
    if (!sent) throw new AppError("INVALID_INPUT", "Item tidak ada di transfer")
    if (new Decimal(r.qtyReceived).gt(sent.qtyInBase)) {
      throw new AppError("INVALID_INPUT", "Qty terima > qty kirim")
    }
  }

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

    // Discrepancy: if qty received < qty sent, generate ADJUSTMENT in source warehouse
    // for the diff (asal goes deeper minus, since stock already deducted at SEND).
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
