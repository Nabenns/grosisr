import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { orderByFrom } from "@/lib/sort"

export interface BrandListParams {
  q?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: "asc" | "desc"
}

const SORT_COLUMNS: Record<string, (dir: "asc" | "desc") => Prisma.BrandOrderByWithRelationInput> = {
  name: (dir) => ({ name: dir }),
  isActive: (dir) => ({ isActive: dir }),
  createdAt: (dir) => ({ createdAt: dir })
}

export async function listBrands({ q, page = 1, pageSize = 25, sortBy, sortDir }: BrandListParams) {
  const where = {
    deletedAt: null,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {})
  }
  const orderBy = orderByFrom(sortBy, sortDir, SORT_COLUMNS, { name: "asc" })
  const [items, total] = await Promise.all([
    prisma.brand.findMany({
      where,
      include: { _count: { select: { products: true } } },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.brand.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getBrandById(id: string) {
  return prisma.brand.findUnique({ where: { id } })
}

export async function listAllBrandsForSelect() {
  return prisma.brand.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  })
}
