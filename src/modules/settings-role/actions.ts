"use server"

import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { createRoleSchema, updateRoleSchema } from "./schema"
import { createRole, updateRole, deleteRole } from "./service"

export async function createRoleAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("role.write")
    const parsed = createRoleSchema.parse(input)
    const created = await prisma.$transaction(async (tx) => {
      const result = await createRole(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Role",
        entityId: result.id,
        action: AuditAction.CREATE,
        after: { ...result, permissionKeys: parsed.permissionKeys }
      })
      return result
    })
    revalidatePath("/settings/roles")
    return { id: created.id }
  })
}

export async function updateRoleAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("role.write")
    const parsed = updateRoleSchema.parse(input)
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.role.findUnique({ where: { id: parsed.id } })
      const result = await updateRole(tx, parsed)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Role",
        entityId: result.id,
        action: AuditAction.UPDATE,
        before: before as unknown as Record<string, unknown> | null,
        after: { ...result, permissionKeys: parsed.permissionKeys }
      })
      return result
    })
    revalidatePath("/settings/roles")
    return { id: updated.id }
  })
}

export async function deleteRoleAction(id: string) {
  return action(async () => {
    const session = await requirePermission("role.write")
    await prisma.$transaction(async (tx) => {
      const before = await tx.role.findUnique({ where: { id } })
      await deleteRole(tx, id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Role",
        entityId: id,
        action: AuditAction.DELETE,
        before: before as unknown as Record<string, unknown> | null
      })
    })
    revalidatePath("/settings/roles")
  })
}
