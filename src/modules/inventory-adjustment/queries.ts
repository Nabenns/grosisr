import { prisma } from "@/lib/db"

export async function listAdjustments(params: {
  warehouseId?: string
  status?: string
  page?: number
  pageSize?: number
}) {
  const { warehouseId, status, page = 1, pageSize = 25 } = params
  const where: Record<string, unknown> = {}
  if (warehouseId) where.warehouseId = warehouseId
  if (status) where.status = status

  const [items, total] = await Promise.all([
    prisma.stockAdjustment.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.stockAdjustment.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getAdjustmentById(id: string) {
  return prisma.stockAdjustment.findUnique({
    where: { id },
    include: {
      warehouse: true,
      createdBy: { select: { id: true, name: true, username: true } },
      postedBy: { select: { id: true, name: true, username: true } },
      items: {
        include: {
          product: {
            include: { baseUnit: { select: { name: true } } }
          }
        }
      }
    }
  })
}

export async function listProductsForPicker(q?: string, limit = 20) {
  const where: Record<string, unknown> = { deletedAt: null, isActive: true }
  if (q && q.length >= 2) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } }
    ]
  }
  return prisma.product.findMany({
    where,
    select: {
      id: true,
      sku: true,
      name: true,
      baseUnit: { select: { name: true } }
    },
    orderBy: { name: "asc" },
    take: limit
  })
}
