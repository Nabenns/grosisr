"use server"

import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { createCustomerSchema, updateCustomerSchema } from "./schema"
import { createCustomer, updateCustomer, softDeleteCustomer } from "./service"

export async function createCustomerAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("customer.write")
    const parsed = createCustomerSchema.parse(input)
    const created = await prisma.$transaction(async (tx) => {
      const result = await createCustomer(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Customer",
        entityId: result.id,
        action: AuditAction.CREATE,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/master/customers")
    return created
  })
}

export async function updateCustomerAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("customer.write")
    const parsed = updateCustomerSchema.parse(input)
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.customer.findUnique({ where: { id: parsed.id } })
      const result = await updateCustomer(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Customer",
        entityId: result.id,
        action: AuditAction.UPDATE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/master/customers")
    return updated
  })
}

export async function deleteCustomerAction(id: string) {
  return action(async () => {
    const session = await requirePermission("customer.write")
    await prisma.$transaction(async (tx) => {
      const before = await tx.customer.findUnique({ where: { id } })
      const result = await softDeleteCustomer(tx, id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Customer",
        entityId: id,
        action: AuditAction.DELETE,
        before: before as unknown as Record<string, unknown> | null,
        after: result as unknown as Record<string, unknown>
      })
    })
    revalidatePath("/master/customers")
  })
}
