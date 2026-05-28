import { prisma } from "@/lib/db"

export interface StockListParams {
  warehouseId?: string
  q?: string
  belowMinOnly?: boolean
  page?: number
  pageSize?: number
}

export async function listStockBalances(params: StockListParams) {
  const { warehouseId, q, belowMinOnly, page = 1, pageSize = 50 } = params
  const where: Record<string, unknown> = {}
  if (warehouseId) where.warehouseId = warehouseId
  if (q) {
    where.product = {
      OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }]
    }
  }
  const [items, total] = await Promise.all([
    prisma.stockBalance.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            minStock: true,
            baseUnit: { select: { name: true } },
            isActive: true
          }
        },
        warehouse: { select: { id: true, name: true } }
      },
      orderBy: [{ warehouseId: "asc" }, { product: { name: "asc" } }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.stockBalance.count({ where })
  ])
  let filtered = items
  if (belowMinOnly) {
    filtered = items.filter((s) => Number(s.qtyInBase) < (s.minStock ?? s.product.minStock))
  }
  return { items: filtered, total, page, pageSize }
}
