import type { Prisma, PrismaClient } from "@prisma/client"
import { AppError } from "@/lib/errors"
import type { CreateUnitInput, UpdateUnitInput } from "./schema"

type Db = PrismaClient | Prisma.TransactionClient

export async function createUnit(db: Db, input: CreateUnitInput) {
  const dup = await db.unit.findFirst({ where: { name: input.name, deletedAt: null } })
  if (dup) throw new AppError("INVALID_INPUT", "Nama satuan sudah ada", { name: "Duplikat" })
  return db.unit.create({ data: { name: input.name } })
}

export async function updateUnit(db: Db, input: UpdateUnitInput) {
  const current = await db.unit.findUnique({ where: { id: input.id } })
  if (!current || current.deletedAt) throw new AppError("NOT_FOUND", "Satuan tidak ditemukan")
  const dup = await db.unit.findFirst({
    where: { name: input.name, deletedAt: null, NOT: { id: input.id } }
  })
  if (dup) throw new AppError("INVALID_INPUT", "Nama satuan sudah ada", { name: "Duplikat" })
  return db.unit.update({ where: { id: input.id }, data: { name: input.name } })
}

export async function softDeleteUnit(db: Db, id: string) {
  const usedAsBase = await db.product.count({ where: { baseUnitId: id, deletedAt: null } })
  const usedInProductUnit = await db.productUnit.count({ where: { unitId: id } })
  if (usedAsBase > 0 || usedInProductUnit > 0) {
    throw new AppError("INVALID_INPUT", "Satuan dipakai produk")
  }
  return db.unit.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false }
  })
}
