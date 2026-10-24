import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { orderByFrom } from "@/lib/sort"

export interface WarehouseListParams {
  q?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: "asc" | "desc"
}

const SORT_COLUMNS: Record<string, (dir: "asc" | "desc") => Prisma.WarehouseOrderByWithRelationInput> = {
  code: (dir) => ({ code: dir }),
  name: (dir) => ({ name: dir }),
  isDefault: (dir) => ({ isDefault: dir }),
  isActive: (dir) => ({ isActive: dir })
}

export async function listWarehouses({ q, page = 1, pageSize = 25, sortBy, sortDir }: WarehouseListParams) {
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
  const orderBy = orderByFrom(sortBy, sortDir, SORT_COLUMNS, { name: "asc" })
  const [items, total] = await Promise.all([
    prisma.warehouse.findMany({
      where,
      orderBy: sortBy ? orderBy : [{ isDefault: "desc" }, { name: "asc" }],
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
