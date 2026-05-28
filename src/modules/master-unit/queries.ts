import { prisma } from "@/lib/db"

export interface UnitListParams {
  q?: string
  page?: number
  pageSize?: number
}

export async function listUnits({ q, page = 1, pageSize = 25 }: UnitListParams) {
  const where = {
    deletedAt: null,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {})
  }
  const [items, total] = await Promise.all([
    prisma.unit.findMany({
      where,
      orderBy: { name: "asc" },
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
