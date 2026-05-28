"use server"

import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { createWarehouseSchema, updateWarehouseSchema } from "./schema"
import { createWarehouse, updateWarehouse, softDeleteWarehouse } from "./service"

export async function createWarehouseAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("warehouse.write")
    const parsed = createWarehouseSchema.parse(input)
    const created = await prisma.$transaction(async (tx) => {
      const result = await createWarehouse(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Warehouse",
        entityId: result.id,
        action: AuditAction.CREATE,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/master/warehouses")
    return created
  })
}

export async function updateWarehouseAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("warehouse.write")
    const parsed = updateWarehouseSchema.parse(input)
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.warehouse.findUnique({ where: { id: parsed.id } })
      const result = await updateWarehouse(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Warehouse",
        entityId: result.id,
        action: AuditAction.UPDATE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/master/warehouses")
    return updated
  })
}

export async function deleteWarehouseAction(id: string) {
  return action(async () => {
    const session = await requirePermission("warehouse.write")
    await prisma.$transaction(async (tx) => {
      const before = await tx.warehouse.findUnique({ where: { id } })
      const result = await softDeleteWarehouse(tx, id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Warehouse",
        entityId: id,
        action: AuditAction.DELETE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
    })
    revalidatePath("/master/warehouses")
  })
}
