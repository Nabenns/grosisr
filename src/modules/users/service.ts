import bcrypt from "bcryptjs"
import type { Prisma, PrismaClient } from "@prisma/client"
import { AppError } from "@/lib/errors"
import type { CreateUserInput, UpdateUserInput, ResetPasswordInput } from "./schema"

type Db = PrismaClient | Prisma.TransactionClient

async function findDuplicate(db: Db, username: string, email: string | null, excludeId?: string) {
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    OR: [{ username }, ...(email ? [{ email }] : [])]
  }
  if (excludeId) where.NOT = { id: excludeId }
  return db.user.findFirst({ where })
}

export async function createUser(db: Db, input: CreateUserInput) {
  const dup = await findDuplicate(db, input.username, input.email ?? null)
  if (dup) throw new AppError("INVALID_INPUT", "Username atau email sudah ada")
  const passwordHash = await bcrypt.hash(input.password, 12)
  return db.user.create({
    data: {
      username: input.username,
      email: input.email ?? null,
      name: input.name,
      passwordHash,
      defaultWarehouseId: input.defaultWarehouseId ?? null,
      roles: { create: input.roleIds.map((roleId) => ({ roleId })) },
      warehouseAccess: {
        create: input.warehouseIds.map((warehouseId) => ({ warehouseId }))
      }
    }
  })
}

export async function updateUser(db: Db, input: UpdateUserInput) {
  const current = await db.user.findUnique({ where: { id: input.id } })
  if (!current || current.deletedAt) throw new AppError("NOT_FOUND", "User tidak ditemukan")
  const dup = await findDuplicate(db, input.username, input.email ?? null, input.id)
  if (dup) throw new AppError("INVALID_INPUT", "Username atau email sudah ada")

  await db.userRole.deleteMany({ where: { userId: input.id } })
  await db.userWarehouse.deleteMany({ where: { userId: input.id } })

  return db.user.update({
    where: { id: input.id },
    data: {
      username: input.username,
      email: input.email ?? null,
      name: input.name,
      isActive: input.isActive,
      defaultWarehouseId: input.defaultWarehouseId ?? null,
      roles: { create: input.roleIds.map((roleId) => ({ roleId })) },
      warehouseAccess: {
        create: input.warehouseIds.map((warehouseId) => ({ warehouseId }))
      }
    }
  })
}

export async function resetUserPassword(db: Db, input: ResetPasswordInput) {
  const passwordHash = await bcrypt.hash(input.newPassword, 12)
  return db.user.update({ where: { id: input.id }, data: { passwordHash } })
}

export async function softDeleteUser(db: Db, id: string) {
  const current = await db.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } }
  })
  if (!current) throw new AppError("NOT_FOUND", "User tidak ditemukan")
  if (current.username === "system") throw new AppError("INVALID_INPUT", "User system tidak bisa dihapus")
  if (current.roles.some((r) => r.role.name === "OWNER")) {
    throw new AppError("INVALID_INPUT", "OWNER tidak bisa dihapus")
  }
  return db.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false }
  })
}
