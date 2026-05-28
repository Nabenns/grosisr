import type { Prisma, PrismaClient } from "@prisma/client"
import { AppError } from "@/lib/errors"
import type { CreateWarehouseInput, UpdateWarehouseInput } from "./schema"

type Db = PrismaClient | Prisma.TransactionClient

export async function createWarehouse(db: Db, input: CreateWarehouseInput) {
  const dup = await db.warehouse.findFirst({
    where: { code: input.code, deletedAt: null }
  })
  if (dup) throw new AppError("INVALID_INPUT", "Kode gudang sudah ada", { code: "Duplikat" })
  if (input.isDefault) {
    await db.warehouse.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
  }
  return db.warehouse.create({
    data: {
      code: input.code,
      name: input.name,
      address: input.address ?? null,
      isDefault: input.isDefault
    }
  })
}

export async function updateWarehouse(db: Db, input: UpdateWarehouseInput) {
  const current = await db.warehouse.findUnique({ where: { id: input.id } })
  if (!current || current.deletedAt) throw new AppError("NOT_FOUND", "Gudang tidak ditemukan")
  if (input.isDefault && !current.isDefault) {
    await db.warehouse.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
  }
  return db.warehouse.update({
    where: { id: input.id },
    data: {
      code: input.code,
      name: input.name,
      address: input.address ?? null,
      isDefault: input.isDefault
    }
  })
}

export async function softDeleteWarehouse(db: Db, id: string) {
  const wh = await db.warehouse.findUnique({ where: { id } })
  if (!wh) throw new AppError("NOT_FOUND", "Gudang tidak ditemukan")
  if (wh.isDefault) throw new AppError("INVALID_INPUT", "Gudang default tidak bisa dihapus")
  const stockNonZero = await db.stockBalance.count({
    where: { warehouseId: id, qtyInBase: { not: 0 } }
  })
  if (stockNonZero > 0) {
    throw new AppError(
      "INVALID_INPUT",
      "Gudang masih ada stok > 0, opname/transfer dulu ke 0"
    )
  }
  return db.warehouse.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false }
  })
}
