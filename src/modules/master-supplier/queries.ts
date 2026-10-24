import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { orderByFrom } from "@/lib/sort"

export interface SupplierListParams {
  q?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: "asc" | "desc"
}

const SORT_COLUMNS: Record<string, (dir: "asc" | "desc") => Prisma.SupplierOrderByWithRelationInput> = {
  code: (dir) => ({ code: dir }),
  name: (dir) => ({ name: dir }),
  isActive: (dir) => ({ isActive: dir })
}

export async function listSuppliers({ q, page = 1, pageSize = 25, sortBy, sortDir }: SupplierListParams) {
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
  const orderBy = orderByFrom(sortBy, sortDir, SORT_COLUMNS, { name: "asc" })
  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy,
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
