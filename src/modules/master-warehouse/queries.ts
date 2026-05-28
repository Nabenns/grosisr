import { prisma } from "@/lib/db"

export interface WarehouseListParams {
  q?: string
  page?: number
  pageSize?: number
}

export async function listWarehouses({ q, page = 1, pageSize = 25 }: WarehouseListParams) {
  const where = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { code: { contains: q, mode: "insensitive" as const } }
          ]
        }
      : {})
  }
  const [items, total] = await Promise.all([
    prisma.warehouse.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.warehouse.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getWarehouseById(id: string) {
  return prisma.warehouse.findUnique({ where: { id } })
}
