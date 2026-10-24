import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { orderByFrom } from "@/lib/sort"

export interface CategoryListParams {
  q?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: "asc" | "desc"
}

const SORT_COLUMNS: Record<string, (dir: "asc" | "desc") => Prisma.CategoryOrderByWithRelationInput> = {
  name: (dir) => ({ name: dir }),
  parent: (dir) => ({ parent: { name: dir } }),
  isActive: (dir) => ({ isActive: dir })
}

export async function listCategories({ q, page = 1, pageSize = 25, sortBy, sortDir }: CategoryListParams) {
  const where = {
    deletedAt: null,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {})
  }
  const orderBy = orderByFrom(sortBy, sortDir, SORT_COLUMNS, { name: "asc" })
  const [items, total] = await Promise.all([
    prisma.category.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true } }
      },
      orderBy: sortBy ? orderBy : [{ parentId: { sort: "asc", nulls: "first" } }, orderBy],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.category.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
    include: { parent: true }
  })
}

export async function listAllCategoriesForSelect() {
  return prisma.category.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true, parentId: true },
    orderBy: { name: "asc" }
  })
}
