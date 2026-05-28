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
    revalidatePath(`/inventory/adjustments/${id}`)
  })
}
