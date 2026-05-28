import { prisma } from "@/lib/db"

export interface SupplierListParams {
  q?: string
  page?: number
  pageSize?: number
}

export async function listSuppliers({ q, page = 1, pageSize = 25 }: SupplierListParams) {
  const where = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { code: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } }
          ]
        }
      : {})
  }
  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.supplier.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getSupplierById(id: string) {
  return prisma.supplier.findUnique({ where: { id } })
}
