import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { listProductUnitsForPicker } from "@/modules/purchase-order/queries"
import { POForm } from "@/modules/purchase-order/components/po-form"
import { PageHeader } from "@/components/page-header"

export default async function NewPOPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("purchase.po.write")) redirect("/forbidden")

  const [suppliers, warehouses, productUnits] = await Promise.all([
    prisma.supplier.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.warehouse.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    listProductUnitsForPicker()
  ])

  return (
    <div>
      <PageHeader title="Purchase Order Baru" />
      <POForm
        suppliers={suppliers}
        warehouses={warehouses}
        productUnits={productUnits}
        defaultWarehouseId={session.user.defaultWarehouseId}
      />
    </div>
  )
}
