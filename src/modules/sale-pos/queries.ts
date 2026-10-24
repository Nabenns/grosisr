import { prisma } from "@/lib/db"

export interface POSProductResult {
  productUnitId: string
  productId: string
  sku: string
  name: string
  unitName: string
  conversionToBase: number
  salePrice: number
  stockBalance: number
}

/**
 * Try barcode exact match first; fall back to SKU/name fuzzy.
 * Includes current stock balance at the given warehouse.
 */
export async function searchProductsForPOS(
  q: string,
  warehouseId: string,
  limit = 10
): Promise<POSProductResult[]> {
  if (!q || q.length < 2) return []

  const byBarcode = await prisma.productUnit.findFirst({
    where: { barcode: q, product: { isActive: true, deletedAt: null } },
    include: {
      product: {
        include: {
          baseUnit: true,
          stocks: { where: { warehouseId } }
        }
      },
      unit: true
    }
  })
  if (byBarcode) {
    return [
      {
        productUnitId: byBarcode.id,
        productId: byBarcode.productId,
        sku: byBarcode.product.sku,
        name: byBarcode.product.name,
        unitName: byBarcode.unit.name,
        conversionToBase: Number(byBarcode.conversionToBase),
        salePrice: Number(byBarcode.salePrice),
        stockBalance: Number(byBarcode.product.stocks[0]?.qtyInBase ?? 0)
      }
    ]
  }

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [
        { sku: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } }
      ]
    },
    include: {
      baseUnit: true,
      stocks: { where: { warehouseId } },
      units: {
        where: { isDefaultSale: true },
        include: { unit: true }
      }
    },
    take: limit
  })
  return products
    .filter((p) => p.units.length > 0)
    .map((p) => {
      const defSale = p.units[0]
      if (!defSale) {
        throw new Error("unreachable: filtered out empty units")
      }
      return {
        productUnitId: defSale.id,
        productId: p.id,
        sku: p.sku,
        name: p.name,
        unitName: defSale.unit.name,
        conversionToBase: Number(defSale.conversionToBase),
        salePrice: Number(defSale.salePrice),
        stockBalance: Number(p.stocks[0]?.qtyInBase ?? 0)
      }
    })
}

export async function getProductUnitsForCart(productId: string) {
  const items = await prisma.productUnit.findMany({
    where: { productId },
    include: { unit: true },
    orderBy: { conversionToBase: "asc" }
  })
  return items.map((pu) => ({
    id: pu.id,
    unitName: pu.unit.name,
    conversionToBase: Number(pu.conversionToBase),
    salePrice: Number(pu.salePrice),
    isDefaultSale: pu.isDefaultSale
  }))
}

export async function listSaleInvoices(params: {
  status?: string
  customerId?: string
  page?: number
  pageSize?: number
}) {
  const { status, customerId, page = 1, pageSize = 25 } = params
  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (customerId) where.customerId = customerId

  const [items, total] = await Promise.all([
    prisma.saleInvoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { invoiceDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.saleInvoice.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getSalesReport({ dateFrom, dateTo }: { dateFrom: Date; dateTo: Date }) {
  const to = new Date(dateTo)
  to.setHours(23, 59, 59, 999)
  const invoices = await prisma.saleInvoice.findMany({
    where: { invoiceDate: { gte: dateFrom, lte: to }, status: { not: "VOID" } },
    select: { id: true, code: true, invoiceDate: true, total: true, paidAmount: true, saleType: true, paymentMethod: true },
    orderBy: { invoiceDate: "asc" }
  })
  const byDate: Record<string, { count: number; total: number }> = {}
  invoices.forEach((inv) => {
    const key = inv.invoiceDate.toISOString().slice(0, 10)
    if (!byDate[key]) byDate[key] = { count: 0, total: 0 }
    byDate[key].count += 1
    byDate[key].total += Number(inv.total)
  })
  const items = Object.entries(byDate).map(([date, v]) => ({ date, ...v }))
  const summary = invoices.reduce(
    (acc, inv) => ({
      count: acc.count + 1,
      total: acc.total + Number(inv.total),
      cash: acc.cash + Number(inv.paidAmount)
    }),
    { count: 0, total: 0, cash: 0 }
  )
  return { items, summary }
}

export async function getSaleInvoiceById(id: string) {
  return prisma.saleInvoice.findUnique({
    where: { id },
    include: {
      customer: true,
      warehouse: true,
      createdBy: { select: { id: true, name: true } },
      voidedBy: { select: { id: true, name: true } },
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
