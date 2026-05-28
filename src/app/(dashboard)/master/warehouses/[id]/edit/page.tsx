import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getWarehouseById } from "@/modules/master-warehouse/queries"
import { WarehouseForm } from "@/modules/master-warehouse/components/warehouse-form"
import { PageHeader } from "@/components/page-header"

export default async function EditWarehousePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("warehouse.write")) redirect("/forbidden")
  const { id } = await params
  const wh = await getWarehouseById(id)
  if (!wh) notFound()
  return (
    <div>
      <PageHeader title="Ubah Gudang" />
      <WarehouseForm
        initial={{
          id: wh.id,
          code: wh.code,
          name: wh.name,
          address: wh.address,
          isDefault: wh.isDefault
        }}
      />
    </div>
  )
}
