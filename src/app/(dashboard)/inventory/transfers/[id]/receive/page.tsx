import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getTransferById } from "@/modules/inventory-transfer/queries"
import { TransferReceiveForm } from "@/modules/inventory-transfer/components/transfer-receive-form"
import { PageHeader } from "@/components/page-header"

export default async function ReceiveTransferPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("inventory.transfer.receive"))
    redirect("/forbidden")

  const { id } = await params
  const t = await getTransferById(id)
  if (!t) notFound()
  if (t.status !== "IN_TRANSIT") redirect(`/inventory/transfers/${id}`)
  // Restrict to users with access to destination warehouse
  if (!session.user.warehouseIds.includes(t.toWarehouseId)) redirect("/forbidden")

  return (
    <div>
      <PageHeader title={`Terima Transfer ${t.code}`} />
      <TransferReceiveForm
        transferId={t.id}
        fromWarehouseName={t.fromWarehouse.name}
        toWarehouseName={t.toWarehouse.name}
        items={t.items.map((i) => ({
          id: i.id,
          qtyInBase: Number(i.qtyInBase),
          product: {
            sku: i.product.sku,
            name: i.product.name,
            baseUnit: { name: i.product.baseUnit.name }
          }
        }))}
      />
    </div>
  )
}
