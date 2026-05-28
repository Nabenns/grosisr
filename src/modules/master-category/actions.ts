"use server"

import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { createCategorySchema, updateCategorySchema } from "./schema"
import { createCategory, updateCategory, softDeleteCategory, setCategoryActive } from "./service"

export async function createCategoryAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("category.write")
    const parsed = createCategorySchema.parse(input)
    const created = await prisma.$transaction(async (tx) => {
      const result = await createCategory(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Category",
        entityId: result.id,
        action: AuditAction.CREATE,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/master/categories")
    return created
  })
}

export async function updateCategoryAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("category.write")
    const parsed = updateCategorySchema.parse(input)
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.category.findUnique({ where: { id: parsed.id } })
      const result = await updateCategory(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Category",
        entityId: result.id,
        action: AuditAction.UPDATE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/master/categories")
    return updated
  })
}

export async function deleteCategoryAction(id: string) {
  return action(async () => {
    const session = await requirePermission("category.write")
    await prisma.$transaction(async (tx) => {
      const before = await tx.category.findUnique({ where: { id } })
      const result = await softDeleteCategory(tx, id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Category",
        entityId: id,
        action: AuditAction.DELETE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
    })
    revalidatePath("/master/categories")
  })
}

export async function toggleCategoryActiveAction(id: string, isActive: boolean) {
  return action(async () => {
    const session = await requirePermission("category.write")
    await prisma.$transaction(async (tx) => {
      const before = await tx.category.findUnique({ where: { id } })
      const result = await setCategoryActive(tx, id, isActive)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Category",
        entityId: id,
        action: AuditAction.UPDATE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
    })
    revalidatePath("/master/categories")
  })
}
