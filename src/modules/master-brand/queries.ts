import { prisma } from "@/lib/db"

export interface BrandListParams {
  q?: string
  page?: number
  pageSize?: number
}

export async function listBrands({ q, page = 1, pageSize = 25 }: BrandListParams) {
  const where = {
    deletedAt: null,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {})
  }
  const [items, total] = await Promise.all([
    prisma.brand.findMany({
      where,
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
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
