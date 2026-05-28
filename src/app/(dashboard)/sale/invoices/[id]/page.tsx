import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getSaleInvoiceById } from "@/modules/sale-pos/queries"
import { SaleActions } from "@/modules/sale-invoice/components/sale-actions"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, formatDateTime } from "@/lib/date"
import { formatIDR } from "@/lib/money"

export default async function SaleInvoiceDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("sale.read")) redirect("/forbidden")

  const { id } = await params
  const inv = await getSaleInvoiceById(id)
  if (!inv) notFound()
  const canVoid = session.user.permissionKeys.includes("sale.void")

  return (
    <div>
      <PageHeader
        title={`Faktur ${inv.code}`}
        description={`Status: ${inv.status} - Total ${formatIDR(Number(inv.total))}`}
        actions={<SaleActions id={inv.id} status={inv.status} canVoid={canVoid} />}
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Info</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">Customer:</span>{" "}
            {inv.customer?.name ?? "Walk-in"}
          </div>
          <div>
            <span className="text-muted-foreground">Gudang:</span> {inv.warehouse.name}
          </div>
          <div>
            <span className="text-muted-foreground">Tipe:</span> {inv.saleType}
          </div>
          <div>
            <span className="text-muted-foreground">Tgl:</span> {formatDate(inv.invoiceDate)}
          </div>
          {inv.dueDate && (
            <div>
              <span className="text-muted-foreground">Jatuh Tempo:</span>{" "}
              {formatDate(inv.dueDate)}
            </div>
          )}
          {inv.paymentMethod && (
            <div>
              <span className="text-muted-foreground">Bayar:</span> {inv.paymentMethod}
              {inv.paymentRefNo && ` (ref: ${inv.paymentRefNo})`}
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Kasir:</span> {inv.createdBy.name} pada{" "}
            {formatDateTime(inv.postedAt)}
          </div>
          {inv.voidedAt && (
            <div className="text-destructive">
              VOID oleh {inv.voidedBy?.name ?? "-"} pada {formatDateTime(inv.voidedAt)} - alasan:{" "}
              {inv.voidReason}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item ({inv.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left border-b">
              <tr>
                <th className="pb-2">SKU</th>
                <th>Produk</th>
                <th>Satuan</th>
                <th>Qty</th>
                <th>Harga</th>
                <th>Diskon</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.productUnit.product.sku}</td>
                  <td>{item.productUnit.product.name}</td>
                  <td>{item.productUnit.unit.name}</td>
                  <td>{Number(item.qty)}</td>
                  <td>{formatIDR(Number(item.price))}</td>
                  <td>{formatIDR(Number(item.discount))}</td>
                  <td>{formatIDR(Number(item.subtotal))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td colSpan={6} className="py-1 text-right text-muted-foreground">
                  Subtotal
                </td>
                <td>{formatIDR(Number(inv.subtotal))}</td>
              </tr>
              <tr>
                <td colSpan={6} className="py-1 text-right text-muted-foreground">
                  Diskon Faktur
                </td>
                <td>- {formatIDR(Number(inv.discount))}</td>
              </tr>
              <tr className="border-t font-bold">
                <td colSpan={6} className="py-2 text-right">
                  Total
                </td>
                <td>{formatIDR(Number(inv.total))}</td>
              </tr>
              <tr>
                <td colSpan={6} className="py-1 text-right text-muted-foreground">
                  Bayar
                </td>
                <td>{formatIDR(Number(inv.paidAmount))}</td>
              </tr>
              {Number(inv.changeAmount) > 0 && (
                <tr>
                  <td colSpan={6} className="py-1 text-right text-muted-foreground">
                    Kembali
                  </td>
                  <td>{formatIDR(Number(inv.changeAmount))}</td>
                </tr>
              )}
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
