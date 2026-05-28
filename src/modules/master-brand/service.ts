import type { Prisma, PrismaClient } from "@prisma/client"
import { AppError } from "@/lib/errors"
import type { CreateBrandInput, UpdateBrandInput } from "./schema"

type Db = PrismaClient | Prisma.TransactionClient

export async function createBrand(db: Db, input: CreateBrandInput) {
  const dup = await db.brand.findFirst({ where: { name: input.name, deletedAt: null } })
  if (dup) throw new AppError("INVALID_INPUT", "Nama brand sudah ada", { name: "Duplikat" })
  return db.brand.create({ data: { name: input.name } })
}

export async function updateBrand(db: Db, input: UpdateBrandInput) {
  const current = await db.brand.findUnique({ where: { id: input.id } })
  if (!current || current.deletedAt) throw new AppError("NOT_FOUND", "Brand tidak ditemukan")
  const dup = await db.brand.findFirst({
    where: { name: input.name, deletedAt: null, NOT: { id: input.id } }
  })
  if (dup) throw new AppError("INVALID_INPUT", "Nama brand sudah ada", { name: "Duplikat" })
  return db.brand.update({ where: { id: input.id }, data: { name: input.name } })
}

export async function softDeleteBrand(db: Db, id: string) {
  const productCount = await db.product.count({ where: { brandId: id, deletedAt: null } })
  if (productCount > 0) {
    throw new AppError("INVALID_INPUT", "Brand dipakai produk aktif")
  }
  return db.brand.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false }
  })
}
