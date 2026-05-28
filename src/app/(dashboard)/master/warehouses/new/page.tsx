import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { WarehouseForm } from "@/modules/master-warehouse/components/warehouse-form"
import { PageHeader } from "@/components/page-header"

export default async function NewWarehousePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("warehouse.write")) redirect("/forbidden")
  return (
    <div>
      <PageHeader title="Tambah Gudang" />
      <WarehouseForm />
    </div>
  )
}
