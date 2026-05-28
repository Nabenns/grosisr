"use server"

import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { createUnitSchema, updateUnitSchema } from "./schema"
import { createUnit, updateUnit, softDeleteUnit } from "./service"

export async function createUnitAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("unit.write")
    const parsed = createUnitSchema.parse(input)
    const created = await prisma.$transaction(async (tx) => {
      const result = await createUnit(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Unit",
        entityId: result.id,
        action: AuditAction.CREATE,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/master/units")
    return created
  })
}

export async function updateUnitAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("unit.write")
    const parsed = updateUnitSchema.parse(input)
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.unit.findUnique({ where: { id: parsed.id } })
      const result = await updateUnit(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Unit",
        entityId: result.id,
        action: AuditAction.UPDATE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/master/units")
    return updated
  })
}

export async function deleteUnitAction(id: string) {
  return action(async () => {
    const session = await requirePermission("unit.write")
    await prisma.$transaction(async (tx) => {
      const before = await tx.unit.findUnique({ where: { id } })
      const result = await softDeleteUnit(tx, id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Unit",
        entityId: id,
        action: AuditAction.DELETE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
    })
    revalidatePath("/master/units")
  })
}
