"use server"

import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { createPOSchema, updatePOSchema } from "./schema"
import { createPO, updatePO, sendPO, cancelPO } from "./service"

export async function createPOAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("purchase.po.write")
    const parsed = createPOSchema.parse(input)
    const created = await prisma.$transaction(async (tx) => {
      const result = await createPO(tx, parsed, session.user.id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "PurchaseOrder",
        entityId: result.id,
        action: AuditAction.CREATE,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/purchase/orders")
    return { id: created.id, code: created.code }
  })
}

export async function updatePOAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("purchase.po.write")
    const parsed = updatePOSchema.parse(input)
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.purchaseOrder.findUnique({ where: { id: parsed.id } })
      const result = await updatePO(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "PurchaseOrder",
        entityId: result.id,
        action: AuditAction.UPDATE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/purchase/orders")
    revalidatePath(`/purchase/orders/${parsed.id}`)
    return { id: updated.id }
  })
}

export async function sendPOAction(id: string) {
  return action(async () => {
    const session = await requirePermission("purchase.po.write")
    const result = await prisma.$transaction(async (tx) => {
      const sent = await sendPO(tx, id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "PurchaseOrder",
        entityId: id,
        action: AuditAction.UPDATE,
        after: sent as unknown as Record<string, unknown>
      })
      return sent
    })
    revalidatePath("/purchase/orders")
    revalidatePath(`/purchase/orders/${id}`)
    return result
  })
}

export async function cancelPOAction(id: string) {
  return action(async () => {
    const session = await requirePermission("purchase.po.write")
    await prisma.$transaction(async (tx) => {
      const before = await tx.purchaseOrder.findUnique({ where: { id } })
      const result = await cancelPO(tx, id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "PurchaseOrder",
        entityId: id,
        action: AuditAction.UPDATE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
    })
    revalidatePath("/purchase/orders")
    revalidatePath(`/purchase/orders/${id}`)
  })
}
