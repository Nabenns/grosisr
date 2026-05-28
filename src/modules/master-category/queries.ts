import { prisma } from "@/lib/db"

export interface CategoryListParams {
  q?: string
  page?: number
  pageSize?: number
}

export async function listCategories({ q, page = 1, pageSize = 25 }: CategoryListParams) {
  const where = {
    deletedAt: null,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {})
  }
  const [items, total] = await Promise.all([
    prisma.category.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true } }
      },
      orderBy: [{ parentId: { sort: "asc", nulls: "first" } }, { name: "asc" }],
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
