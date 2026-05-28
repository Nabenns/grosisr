import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { listProductsForPicker } from "@/modules/inventory-adjustment/queries"
import { listAllWarehousesForSelect } from "@/modules/users/queries"
import { AdjustmentForm } from "@/modules/inventory-adjustment/components/adjustment-form"
import { PageHeader } from "@/components/page-header"

export default async function NewAdjustmentPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("inventory.adjustment.create"))
    redirect("/forbidden")

  const [warehouses, products] = await Promise.all([
    listAllWarehousesForSelect(),
    listProductsForPicker()
  ])

  return (
    <div>
      <PageHeader title="Penyesuaian Stok Baru" />
      <AdjustmentForm
        warehouses={warehouses}
        products={products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          unitName: p.baseUnit.name
        }))}
        defaultWarehouseId={session.user.defaultWarehouseId}
      />
    </div>
  )
}
