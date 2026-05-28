import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getPOById } from "@/modules/purchase-order/queries"
import { POActions } from "@/modules/purchase-order/components/po-actions"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, formatDateTime } from "@/lib/date"
import { formatIDR } from "@/lib/money"

export default async function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("purchase.po.read")) redirect("/forbidden")

  const { id } = await params
  const po = await getPOById(id)
  if (!po) notFound()

  const canWrite = session.user.permissionKeys.includes("purchase.po.write")
  const canInvoice = session.user.permissionKeys.includes("purchase.invoice.write")

  return (
    <div>
      <PageHeader
        title={`PO ${po.code}`}
        description={`Status: ${po.status} - Total ${formatIDR(Number(po.total))}`}
        actions={
          <POActions id={po.id} status={po.status} canWrite={canWrite} canInvoice={canInvoice} />
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Info</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">Supplier:</span> {po.supplier.name}
          </div>
          <div>
            <span className="text-muted-foreground">Gudang Tujuan:</span> {po.warehouse.name}
          </div>
          <div>
            <span className="text-muted-foreground">Tgl Pesan:</span>{" "}
            {formatDate(po.orderDate)}
          </div>
          {po.expectedDate && (
            <div>
              <span className="text-muted-foreground">Tgl Diharapkan:</span>{" "}
              {formatDate(po.expectedDate)}
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Dibuat oleh:</span>{" "}
            {po.createdBy.name} pada {formatDateTime(po.createdAt)}
          </div>
          {po.note && (
            <div>
              <span className="text-muted-foreground">Catatan:</span> {po.note}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item ({po.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left border-b">
              <tr>
                <th className="pb-2">SKU</th>
                <th>Produk</th>
                <th>Satuan</th>
                <th>Qty</th>
                <th>Diterima</th>
                <th>Harga</th>
                <th>Diskon/unit</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.productUnit.product.sku}</td>
                  <td>{item.productUnit.product.name}</td>
                  <td>{item.productUnit.unit.name}</td>
                  <td>{Number(item.qty)}</td>
                  <td>{Number(item.qtyReceived)}</td>
                  <td>{formatIDR(Number(item.price))}</td>
                  <td>{formatIDR(Number(item.discount))}</td>
                  <td>{formatIDR(Number(item.subtotal))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <td colSpan={7} className="py-2 text-right">
                  Total
                </td>
                <td>{formatIDR(Number(po.total))}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
