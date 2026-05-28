import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getTransferById } from "@/modules/inventory-transfer/queries"
import { TransferActions } from "@/modules/inventory-transfer/components/transfer-actions"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/date"

export default async function TransferDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("inventory.transfer.create"))
    redirect("/forbidden")

  const { id } = await params
  const t = await getTransferById(id)
  if (!t) notFound()

  return (
    <div>
      <PageHeader
        title={`Transfer ${t.code}`}
        description={`${t.fromWarehouse.name} -> ${t.toWarehouse.name}`}
        actions={
          <TransferActions
            id={t.id}
            status={t.status}
            toWarehouseId={t.toWarehouseId}
            userWarehouseIds={session.user.warehouseIds}
            canSend={session.user.permissionKeys.includes("inventory.transfer.send")}
            canReceive={session.user.permissionKeys.includes("inventory.transfer.receive")}
            canCancel={session.user.permissionKeys.includes("inventory.transfer.create")}
          />
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Info</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">Status:</span> {t.status}
          </div>
          <div>
            <span className="text-muted-foreground">Dibuat oleh:</span>{" "}
            {t.createdBy.name} pada {formatDateTime(t.createdAt)}
          </div>
          {t.sentAt && (
            <div>
              <span className="text-muted-foreground">Dikirim:</span>{" "}
              {formatDateTime(t.sentAt)}
            </div>
          )}
          {t.receivedAt && (
            <div>
              <span className="text-muted-foreground">Diterima oleh:</span>{" "}
              {t.receivedBy?.name ?? "-"} pada {formatDateTime(t.receivedAt)}
            </div>
          )}
          {t.note && (
            <div>
              <span className="text-muted-foreground">Catatan:</span> {t.note}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item ({t.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left border-b">
              <tr>
                <th className="pb-2">SKU</th>
                <th>Produk</th>
                <th>Qty (base unit)</th>
              </tr>
            </thead>
            <tbody>
              {t.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.product.sku}</td>
                  <td>{item.product.name}</td>
                  <td>
                    {Number(item.qtyInBase)} {item.product.baseUnit.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
