import type { Prisma, PrismaClient } from "@prisma/client"
import { AppError } from "@/lib/errors"
import type { CreateRoleInput, UpdateRoleInput } from "./schema"

type Db = PrismaClient | Prisma.TransactionClient

export async function createRole(db: Db, input: CreateRoleInput) {
  const dup = await db.role.findFirst({ where: { name: input.name } })
  if (dup) throw new AppError("INVALID_INPUT", "Nama role sudah ada", { name: "Duplikat" })
  const perms = await db.permission.findMany({ where: { key: { in: input.permissionKeys } } })
  return db.role.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      isSystem: false,
      permissions: { create: perms.map((p) => ({ permissionId: p.id })) }
    }
  })
}

export async function updateRole(db: Db, input: UpdateRoleInput) {
  const current = await db.role.findUnique({ where: { id: input.id } })
  if (!current) throw new AppError("NOT_FOUND", "Role tidak ditemukan")
  if (current.name === "OWNER") {
    throw new AppError("INVALID_INPUT", "Role OWNER tidak bisa diedit")
  }
  const perms = await db.permission.findMany({ where: { key: { in: input.permissionKeys } } })
  await db.rolePermission.deleteMany({ where: { roleId: input.id } })
  return db.role.update({
    where: { id: input.id },
    data: {
      name: input.name,
      description: input.description ?? null,
      permissions: { create: perms.map((p) => ({ permissionId: p.id })) }
    }
  })
}

export async function deleteRole(db: Db, id: string) {
  const current = await db.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } }
  })
  if (!current) throw new AppError("NOT_FOUND", "Role tidak ditemukan")
  if (current.isSystem) throw new AppError("INVALID_INPUT", "Role sistem tidak bisa dihapus")
  if (current._count.users > 0) {
    throw new AppError("INVALID_INPUT", "Role masih digunakan user")
  }
  return db.role.delete({ where: { id } })
}
