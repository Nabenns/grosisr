import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { listProductsForPicker } from "@/modules/inventory-adjustment/queries"
import { listAllWarehousesForSelect } from "@/modules/users/queries"
import { TransferForm } from "@/modules/inventory-transfer/components/transfer-form"
import { PageHeader } from "@/components/page-header"

export default async function NewTransferPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("inventory.transfer.create"))
    redirect("/forbidden")

  const [warehouses, products] = await Promise.all([
    listAllWarehousesForSelect(),
    listProductsForPicker()
  ])

  return (
    <div>
      <PageHeader title="Mutasi Antar Gudang Baru" />
      <TransferForm
        warehouses={warehouses}
        products={products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          unitName: p.baseUnit.name
        }))}
        defaultFromWarehouseId={session.user.defaultWarehouseId}
      />
    </div>
  )
}
