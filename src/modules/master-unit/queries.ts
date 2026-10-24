import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { orderByFrom } from "@/lib/sort"

export interface UnitListParams {
  q?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: "asc" | "desc"
}

const SORT_COLUMNS: Record<string, (dir: "asc" | "desc") => Prisma.UnitOrderByWithRelationInput> = {
  name: (dir) => ({ name: dir }),
  isActive: (dir) => ({ isActive: dir })
}

export async function listUnits({ q, page = 1, pageSize = 25, sortBy, sortDir }: UnitListParams) {
  const where = {
    deletedAt: null,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {})
  }
  const orderBy = orderByFrom(sortBy, sortDir, SORT_COLUMNS, { name: "asc" })
  const [items, total] = await Promise.all([
    prisma.unit.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.unit.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getUnitById(id: string) {
  return prisma.unit.findUnique({ where: { id } })
}

export async function listAllUnitsForSelect() {
  return prisma.unit.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  })
}
