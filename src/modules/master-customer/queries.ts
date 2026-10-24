import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { orderByFrom } from "@/lib/sort"

export interface CustomerListParams {
  q?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: "asc" | "desc"
}

const SORT_COLUMNS: Record<string, (dir: "asc" | "desc") => Prisma.CustomerOrderByWithRelationInput> = {
  code: (dir) => ({ code: dir }),
  name: (dir) => ({ name: dir }),
  customerType: (dir) => ({ customerType: dir }),
  isActive: (dir) => ({ isActive: dir })
}

export async function listCustomers({ q, page = 1, pageSize = 25, sortBy, sortDir }: CustomerListParams) {
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
    prisma.customer.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.customer.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({ where: { id } })
}
