import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { listAllWarehousesForSelect } from "@/modules/users/queries"
import { listAllCategoriesForSelect } from "@/modules/master-category/queries"
import { OpnameWorksheet } from "@/modules/inventory-opname/components/opname-worksheet"
import { PageHeader } from "@/components/page-header"

export default async function OpnamePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("inventory.opname.run"))
    redirect("/forbidden")

  const [warehouses, categories] = await Promise.all([
    listAllWarehousesForSelect(),
    listAllCategoriesForSelect()
  ])

  return (
    <div>
      <PageHeader
        title="Stok Opname"
        description="Generate worksheet snapshot saldo, input qty fisik, posting selisih sebagai adjustment OPNAME."
      />
      <OpnameWorksheet
        warehouses={warehouses}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        defaultWarehouseId={session.user.defaultWarehouseId}
      />
    </div>
  )
}
