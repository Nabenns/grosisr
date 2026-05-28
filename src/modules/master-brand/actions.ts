"use server"

import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { createBrandSchema, updateBrandSchema } from "./schema"
import { createBrand, updateBrand, softDeleteBrand } from "./service"

export async function createBrandAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("brand.write")
    const parsed = createBrandSchema.parse(input)
    const created = await prisma.$transaction(async (tx) => {
      const result = await createBrand(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Brand",
        entityId: result.id,
        action: AuditAction.CREATE,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/master/brands")
    return created
  })
}

export async function updateBrandAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("brand.write")
    const parsed = updateBrandSchema.parse(input)
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.brand.findUnique({ where: { id: parsed.id } })
      const result = await updateBrand(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Brand",
        entityId: result.id,
        action: AuditAction.UPDATE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/master/brands")
    return updated
  })
}

export async function deleteBrandAction(id: string) {
  return action(async () => {
    const session = await requirePermission("brand.write")
    await prisma.$transaction(async (tx) => {
      const before = await tx.brand.findUnique({ where: { id } })
      const result = await softDeleteBrand(tx, id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Brand",
        entityId: id,
        action: AuditAction.DELETE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
    })
    revalidatePath("/master/brands")
  })
}
