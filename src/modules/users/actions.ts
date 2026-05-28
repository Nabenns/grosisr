"use server"

import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { createUserSchema, updateUserSchema, resetPasswordSchema } from "./schema"
import { createUser, updateUser, resetUserPassword, softDeleteUser } from "./service"

export async function createUserAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("user.write")
    const parsed = createUserSchema.parse(input)
    const created = await prisma.$transaction(async (tx) => {
      const result = await createUser(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "User",
        entityId: result.id,
        action: AuditAction.CREATE,
        after: { ...result, passwordHash: "[REDACTED]" } as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/settings/users")
    return { id: created.id, username: created.username }
  })
}

export async function updateUserAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("user.write")
    const parsed = updateUserSchema.parse(input)
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({ where: { id: parsed.id } })
      const result = await updateUser(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "User",
        entityId: result.id,
        action: AuditAction.UPDATE,
        before: before ? ({ ...before, passwordHash: "[REDACTED]" } as unknown as Record<string, unknown>) : null,
        after: { ...result, passwordHash: "[REDACTED]" } as unknown as Record<string, unknown>
      })
      return result
    })
    revalidatePath("/settings/users")
    return { id: updated.id }
  })
}

export async function resetUserPasswordAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("user.write")
    const parsed = resetPasswordSchema.parse(input)
    await prisma.$transaction(async (tx) => {
      await resetUserPassword(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "User",
        entityId: parsed.id,
        action: AuditAction.UPDATE,
        after: { passwordReset: true }
      })
    })
    revalidatePath("/settings/users")
  })
}

export async function deleteUserAction(id: string) {
  return action(async () => {
    const session = await requirePermission("user.write")
    await prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({ where: { id } })
      const result = await softDeleteUser(tx, id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "User",
        entityId: id,
        action: AuditAction.DELETE,
        before: before ? ({ ...before, passwordHash: "[REDACTED]" } as unknown as Record<string, unknown>) : null,
        after: { ...result, passwordHash: "[REDACTED]" } as unknown as Record<string, unknown>
      })
    })
    revalidatePath("/settings/users")
  })
}
