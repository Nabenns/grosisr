import { prisma } from "@/lib/db"

export async function listPurchaseInvoices(params: {
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
    prisma.purchaseInvoice.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        po: { select: { id: true, code: true } }
      },
      orderBy: { invoiceDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.purchaseInvoice.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getPurchaseInvoiceById(id: string) {
  return prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      supplier: true,
      warehouse: true,
      po: true,
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

/**
 * For pre-fill from PO. Returns PO items with sisa qty (qty - qtyReceived).
 */
export async function getPOItemsForInvoice(poId: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      supplier: true,
      warehouse: true,
      items: {
        include: {
          productUnit: {
            include: {
              product: { select: { id: true, sku: true, name: true } },
              unit: { select: { name: true } }
            }
          }
        }
      }
    }
  })
  if (!po) return null
  return {
    poId: po.id,
    poCode: po.code,
    supplier: po.supplier,
    warehouse: po.warehouse,
    items: po.items
      .map((i) => {
        const remaining = Number(i.qty) - Number(i.qtyReceived)
        return {
          poItemId: i.id,
          productUnitId: i.productUnitId,
          productSku: i.productUnit.product.sku,
          productName: i.productUnit.product.name,
          unitName: i.productUnit.unit.name,
          qtyOrdered: Number(i.qty),
          qtyReceived: Number(i.qtyReceived),
          qtyRemaining: remaining,
          price: Number(i.price),
          discount: Number(i.discount)
        }
      })
      .filter((i) => i.qtyRemaining > 0)
  }
}
