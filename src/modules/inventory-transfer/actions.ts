"use server"

import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { createTransferSchema, receiveTransferSchema } from "./schema"
import { createTransfer, sendTransfer, receiveTransfer, cancelTransfer } from "./service"

export async function createTransferAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("inventory.transfer.create")
    const parsed = createTransferSchema.parse(input)
    const created = await prisma.$transaction(async (tx) => {
      const result = await createTransfer(tx, parsed, session.user.id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "StockTransfer",
        entityId: result.id,
        action: AuditAction.CREATE,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/inventory/transfers")
    return { id: created.id, code: created.code }
  })
}

export async function sendTransferAction(id: string) {
  return action(async () => {
    const session = await requirePermission("inventory.transfer.send")
    const result = await prisma.$transaction(async (tx) => {
      const sent = await sendTransfer(tx, id, session.user.id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "StockTransfer",
        entityId: id,
        action: AuditAction.POST,
        after: sent as unknown as Record<string, unknown>
      })
      return sent
    })
    revalidatePath("/inventory/transfers")
    revalidatePath(`/inventory/transfers/${id}`)
    return result
  })
}

export async function receiveTransferAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("inventory.transfer.receive")
    const parsed = receiveTransferSchema.parse(input)
    const result = await prisma.$transaction(async (tx) => {
      const received = await receiveTransfer(tx, parsed, session.user.id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "StockTransfer",
        entityId: parsed.id,
        action: AuditAction.POST,
        after: received as unknown as Record<string, unknown>
      })
      return received
    })
    revalidatePath("/inventory/transfers")
    revalidatePath(`/inventory/transfers/${parsed.id}`)
    return result
  })
}

export async function cancelTransferAction(id: string) {
  return action(async () => {
    const session = await requirePermission("inventory.transfer.create")
    await prisma.$transaction(async (tx) => {
      const before = await tx.stockTransfer.findUnique({ where: { id } })
      const result = await cancelTransfer(tx, id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "StockTransfer",
        entityId: id,
        action: AuditAction.UPDATE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
    })
    revalidatePath("/inventory/transfers")
    revalidatePath(`/inventory/transfers/${id}`)
  })
}
