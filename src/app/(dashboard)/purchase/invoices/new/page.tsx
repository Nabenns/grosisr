import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { listProductUnitsForPicker } from "@/modules/purchase-order/queries"
import { getPOItemsForInvoice } from "@/modules/purchase-invoice/queries"
import { PInvForm } from "@/modules/purchase-invoice/components/pinv-form"
import { PageHeader } from "@/components/page-header"

export default async function NewPInvPage({
  searchParams
}: {
  searchParams: Promise<{ poId?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("purchase.invoice.write"))
    redirect("/forbidden")

  const sp = await searchParams
  const poPrefill = sp.poId ? await getPOItemsForInvoice(sp.poId) : null

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
      <PageHeader
        title={poPrefill ? `Faktur dari ${poPrefill.poCode}` : "Faktur Pembelian Baru"}
      />
      <PInvForm
        suppliers={suppliers}
        warehouses={warehouses}
        productUnits={productUnits}
        defaultWarehouseId={session.user.defaultWarehouseId}
        poPrefill={poPrefill}
      />
    </div>
  )
}
