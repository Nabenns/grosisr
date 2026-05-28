import { prisma } from "@/lib/db"

export async function listPOs(params: {
  supplierId?: string
  status?: string
  page?: number
  pageSize?: number
}) {
  const { supplierId, status, page = 1, pageSize = 25 } = params
  const where: Record<string, unknown> = {}
  if (supplierId) where.supplierId = supplierId
  if (status) where.status = status

  const [items, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.purchaseOrder.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getPOById(id: string) {
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      warehouse: true,
      createdBy: { select: { id: true, name: true, username: true } },
      items: {
        include: {
          productUnit: {
            include: {
              product: { select: { id: true, sku: true, name: true } },
              unit: { select: { id: true, name: true } }
            }
          }
        }
      }
    }
  })
}

export async function listProductUnitsForPicker(q?: string, limit = 30) {
  const where: Record<string, unknown> = {
    product: { deletedAt: null, isActive: true }
  }
  if (q && q.length >= 2) {
    where.product = {
      ...(where.product as object),
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } }
      ]
    }
  }
  const items = await prisma.productUnit.findMany({
    where,
    select: {
      id: true,
      barcode: true,
      conversionToBase: true,
      purchasePrice: true,
      salePrice: true,
      isDefaultPurchase: true,
      isDefaultSale: true,
      product: { select: { id: true, sku: true, name: true } },
      unit: { select: { id: true, name: true } }
    },
    orderBy: { product: { name: "asc" } },
    take: limit
  })
  return items.map((pu) => ({
    id: pu.id,
    barcode: pu.barcode,
    conversionToBase: Number(pu.conversionToBase),
    purchasePrice: Number(pu.purchasePrice),
    salePrice: Number(pu.salePrice),
    isDefaultPurchase: pu.isDefaultPurchase,
    isDefaultSale: pu.isDefaultSale,
    productId: pu.product.id,
    productSku: pu.product.sku,
    productName: pu.product.name,
    unitName: pu.unit.name
  }))
}
