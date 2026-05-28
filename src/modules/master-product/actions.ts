"use server"

import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { createProductSchema, updateProductSchema } from "./schema"
import { createProduct, updateProduct, softDeleteProduct } from "./service"

function hasHetOverride(session: { user: { permissionKeys: string[]; roleNames: string[] } }) {
  return (
    session.user.permissionKeys.includes("sale.het_override") ||
    session.user.roleNames.includes("OWNER")
  )
}

export async function createProductAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("product.write")
    const parsed = createProductSchema.parse(input)
    const allowHetOverride = hasHetOverride(session)
    const result = await prisma.$transaction(async (tx) => {
      const created = await createProduct(tx, parsed, { allowHetOverride })
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Product",
        entityId: created.id,
        action: AuditAction.CREATE,
        after: created as unknown as Record<string, unknown>
      })
      return created
    })
    revalidatePath("/master/products")
    return result
  })
}

export async function updateProductAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("product.write")
    const parsed = updateProductSchema.parse(input)
    const allowHetOverride = hasHetOverride(session)
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.product.findUnique({
        where: { id: parsed.id },
        include: { units: true }
      })
      const updated = await updateProduct(tx, parsed, { allowHetOverride })
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Product",
        entityId: parsed.id,
        action: AuditAction.UPDATE,
        before: before as unknown as Record<string, unknown> | null,
        after: updated as unknown as Record<string, unknown>
      })
      return updated
    })
    revalidatePath("/master/products")
    revalidatePath(`/master/products/${parsed.id}`)
    return result
  })
}

export async function deleteProductAction(id: string) {
  return action(async () => {
    const session = await requirePermission("product.delete")
    await prisma.$transaction(async (tx) => {
      const before = await tx.product.findUnique({ where: { id } })
      const result = await softDeleteProduct(tx, id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Product",
        entityId: id,
        action: AuditAction.DELETE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
    })
    revalidatePath("/master/products")
  })
}

export async function toggleProductActiveAction(id: string, isActive: boolean) {
  return action(async () => {
    const session = await requirePermission("product.write")
    await prisma.$transaction(async (tx) => {
      const before = await tx.product.findUnique({ where: { id } })
      const updated = await tx.product.update({
        where: { id },
        data: { isActive, version: { increment: 1 } }
      })
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Product",
        entityId: id,
        action: AuditAction.UPDATE,
        before: before as unknown as Record<string, unknown> | null,
        after: updated as unknown as Record<string, unknown>
      })
    })
    revalidatePath("/master/products")
  })
}
