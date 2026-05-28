import type { Prisma, PrismaClient } from "@prisma/client"
import { AppError } from "@/lib/errors"
import type { CreateCategoryInput, UpdateCategoryInput } from "./schema"

type Db = PrismaClient | Prisma.TransactionClient

const MAX_DEPTH = 3

export async function getCategoryDepth(db: Db, categoryId: string): Promise<number> {
  let depth = 1
  let current = await db.category.findUnique({
    where: { id: categoryId },
    select: { parentId: true }
  })
  while (current?.parentId) {
    depth += 1
    if (depth > MAX_DEPTH) return depth
    current = await db.category.findUnique({
      where: { id: current.parentId },
      select: { parentId: true }
    })
  }
  return depth
}

export async function createCategory(db: Db, input: CreateCategoryInput) {
  if (input.parentId) {
    const depth = await getCategoryDepth(db, input.parentId)
    if (depth >= MAX_DEPTH) {
      throw new AppError("INVALID_INPUT", `Kedalaman kategori maksimal ${MAX_DEPTH}`)
    }
  }
  const existing = await db.category.findFirst({
    where: { name: input.name, parentId: input.parentId ?? null, deletedAt: null }
  })
  if (existing) {
    throw new AppError("INVALID_INPUT", "Nama kategori sudah ada di level yang sama", {
      name: "Duplikat"
    })
  }
  return db.category.create({
    data: { name: input.name, parentId: input.parentId ?? null }
  })
}

export async function updateCategory(db: Db, input: UpdateCategoryInput) {
  const current = await db.category.findUnique({ where: { id: input.id } })
  if (!current || current.deletedAt) {
    throw new AppError("NOT_FOUND", "Kategori tidak ditemukan")
  }
  if (input.parentId === input.id) {
    throw new AppError("INVALID_INPUT", "Kategori tidak bisa jadi parent dirinya sendiri")
  }
  if (input.parentId) {
    const depth = await getCategoryDepth(db, input.parentId)
    if (depth >= MAX_DEPTH) {
      throw new AppError("INVALID_INPUT", `Kedalaman kategori maksimal ${MAX_DEPTH}`)
    }
  }
  return db.category.update({
    where: { id: input.id },
    data: { name: input.name, parentId: input.parentId ?? null }
  })
}

export async function softDeleteCategory(db: Db, id: string) {
  const productCount = await db.product.count({ where: { categoryId: id, deletedAt: null } })
  if (productCount > 0) {
    throw new AppError("INVALID_INPUT", "Kategori dipakai produk aktif, tidak bisa dihapus")
  }
  const childCount = await db.category.count({ where: { parentId: id, deletedAt: null } })
  if (childCount > 0) {
    throw new AppError("INVALID_INPUT", "Kategori punya subkategori aktif, hapus subkategori dulu")
  }
  return db.category.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false }
  })
}

export async function setCategoryActive(db: Db, id: string, isActive: boolean) {
  return db.category.update({ where: { id }, data: { isActive } })
}
