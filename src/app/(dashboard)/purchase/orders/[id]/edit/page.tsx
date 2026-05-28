import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getPOById, listProductUnitsForPicker } from "@/modules/purchase-order/queries"
import { POForm } from "@/modules/purchase-order/components/po-form"
import { PageHeader } from "@/components/page-header"

export default async function EditPOPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("purchase.po.write")) redirect("/forbidden")

  const { id } = await params
  const po = await getPOById(id)
  if (!po) notFound()
  if (po.status !== "DRAFT") redirect(`/purchase/orders/${id}`)

  const [suppliers, warehouses, productUnits] = await Promise.all([
    prisma.supplier.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.warehouse.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    listProductUnitsForPicker()
  ])

  return (
    <div>
      <PageHeader title={`Ubah PO: ${po.code}`} />
      <POForm
        suppliers={suppliers}
        warehouses={warehouses}
        productUnits={productUnits}
        defaultWarehouseId={session.user.defaultWarehouseId}
        initial={{
          id: po.id,
          supplierId: po.supplierId,
          warehouseId: po.warehouseId,
          orderDate: po.orderDate,
          expectedDate: po.expectedDate,
          note: po.note,
          items: po.items.map((i) => ({
            productUnitId: i.productUnitId,
            qty: Number(i.qty),
            price: Number(i.price),
            discount: Number(i.discount)
          }))
        }}
      />
    </div>
  )
}
