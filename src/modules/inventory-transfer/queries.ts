import { prisma } from "@/lib/db"

export async function listTransfers(params: {
  status?: string
  fromWarehouseId?: string
  toWarehouseId?: string
  page?: number
  pageSize?: number
}) {
  const { status, fromWarehouseId, toWarehouseId, page = 1, pageSize = 25 } = params
  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (fromWarehouseId) where.fromWarehouseId = fromWarehouseId
  if (toWarehouseId) where.toWarehouseId = toWarehouseId

  const [items, total] = await Promise.all([
    prisma.stockTransfer.findMany({
      where,
      include: {
        fromWarehouse: { select: { id: true, name: true } },
        toWarehouse: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.stockTransfer.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getTransferById(id: string) {
  return prisma.stockTransfer.findUnique({
    where: { id },
    include: {
      fromWarehouse: true,
      toWarehouse: true,
      createdBy: { select: { id: true, name: true, username: true } },
      receivedBy: { select: { id: true, name: true, username: true } },
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
