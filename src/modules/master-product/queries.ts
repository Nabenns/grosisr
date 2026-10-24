import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { orderByFrom } from "@/lib/sort"

const SORT_COLUMNS: Record<string, (dir: "asc" | "desc") => Prisma.ProductOrderByWithRelationInput> = {
  sku: (dir) => ({ sku: dir }),
  name: (dir) => ({ name: dir }),
  category: (dir) => ({ category: { name: dir } }),
  brand: (dir) => ({ brand: { name: dir } }),
  isActive: (dir) => ({ isActive: dir })
}

export interface ProductListParams {
  q?: string
  categoryId?: string
  brandId?: string
  status?: "active" | "inactive" | "all"
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: "asc" | "desc"
}

export async function listProducts(params: ProductListParams) {
  const { q, categoryId, brandId, status = "active", page = 1, pageSize = 25, sortBy, sortDir = "asc" } = params
  const where: Record<string, unknown> = { deletedAt: null }
  if (status === "active") where.isActive = true
  else if (status === "inactive") where.isActive = false
  if (categoryId) where.categoryId = categoryId
  if (brandId) where.brandId = brandId
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { units: { some: { barcode: q } } }
    ]
  }
  const orderBy = orderByFrom(sortBy, sortDir, SORT_COLUMNS, { name: "asc" })
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        baseUnit: { select: { id: true, name: true } },
        units: { include: { unit: { select: { id: true, name: true } } } },
        _count: { select: { stocks: true } }
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.product.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      brand: true,
      baseUnit: true,
      units: { include: { unit: true }, orderBy: { conversionToBase: "asc" } }
    }
  })
}

export async function getProductStocks(productId: string) {
  return prisma.stockBalance.findMany({
    where: { productId },
    include: { warehouse: { select: { id: true, name: true, code: true } } }
  })
}
