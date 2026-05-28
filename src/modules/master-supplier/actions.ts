"use server"

import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { createSupplierSchema, updateSupplierSchema } from "./schema"
import { createSupplier, updateSupplier, softDeleteSupplier } from "./service"

export async function createSupplierAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("supplier.write")
    const parsed = createSupplierSchema.parse(input)
    const created = await prisma.$transaction(async (tx) => {
      const result = await createSupplier(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Supplier",
        entityId: result.id,
        action: AuditAction.CREATE,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/master/suppliers")
    return created
  })
}

export async function updateSupplierAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("supplier.write")
    const parsed = updateSupplierSchema.parse(input)
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.supplier.findUnique({ where: { id: parsed.id } })
      const result = await updateSupplier(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Supplier",
        entityId: result.id,
        action: AuditAction.UPDATE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/master/suppliers")
    return updated
  })
}

export async function deleteSupplierAction(id: string) {
  return action(async () => {
    const session = await requirePermission("supplier.write")
    await prisma.$transaction(async (tx) => {
      const before = await tx.supplier.findUnique({ where: { id } })
      const result = await softDeleteSupplier(tx, id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Supplier",
        entityId: id,
        action: AuditAction.DELETE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
    })
    revalidatePath("/master/suppliers")
  })
}
