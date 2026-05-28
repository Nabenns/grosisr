import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getAdjustmentById } from "@/modules/inventory-adjustment/queries"
import { AdjustmentActions } from "@/modules/inventory-adjustment/components/adjustment-actions"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/date"

export default async function AdjustmentDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("inventory.adjustment.create"))
    redirect("/forbidden")

  const { id } = await params
  const adj = await getAdjustmentById(id)
  if (!adj) notFound()

  const canPost = session.user.permissionKeys.includes("inventory.adjustment.post")
  const canCancel = session.user.permissionKeys.includes("inventory.adjustment.create")

  return (
    <div>
      <PageHeader
        title={`Adjustment ${adj.code}`}
        description={`Status: ${adj.status} - Alasan: ${adj.reason}`}
        actions={
          <AdjustmentActions
            id={adj.id}
            status={adj.status}
            canPost={canPost}
            canCancel={canCancel}
          />
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Info</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">Gudang:</span> {adj.warehouse.name}
          </div>
          <div>
            <span className="text-muted-foreground">Dibuat oleh:</span>{" "}
            {adj.createdBy.name} pada {formatDateTime(adj.createdAt)}
          </div>
          {adj.postedAt && (
            <div>
              <span className="text-muted-foreground">Di-post oleh:</span>{" "}
              {adj.postedBy?.name ?? "-"} pada {formatDateTime(adj.postedAt)}
            </div>
          )}
          {adj.note && (
            <div>
              <span className="text-muted-foreground">Catatan:</span> {adj.note}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item ({adj.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left border-b">
              <tr>
                <th className="pb-2">SKU</th>
                <th>Produk</th>
                <th>Diff (base unit)</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {adj.items.map((item) => {
                const diff = Number(item.qtyInBaseDiff)
                const isPositive = diff > 0
                return (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.product.sku}</td>
                    <td>{item.product.name}</td>
                    <td className={isPositive ? "text-emerald-600" : "text-destructive"}>
                      {isPositive ? "+" : ""}
                      {diff} {item.product.baseUnit.name}
                    </td>
                    <td className="text-muted-foreground">{item.note ?? "-"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
