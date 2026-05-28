import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getPurchaseInvoiceById } from "@/modules/purchase-invoice/queries"
import { PInvActions } from "@/modules/purchase-invoice/components/pinv-actions"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, formatDateTime } from "@/lib/date"
import { formatIDR } from "@/lib/money"

export default async function PInvDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("purchase.invoice.read"))
    redirect("/forbidden")

  const { id } = await params
  const inv = await getPurchaseInvoiceById(id)
  if (!inv) notFound()
  const canVoid = session.user.permissionKeys.includes("purchase.invoice.void")

  return (
    <div>
      <PageHeader
        title={`Faktur ${inv.code}`}
        description={`Status: ${inv.status} - Total ${formatIDR(Number(inv.total))}`}
        actions={<PInvActions id={inv.id} status={inv.status} canVoid={canVoid} />}
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Info</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">Supplier:</span> {inv.supplier.name}
          </div>
          <div>
            <span className="text-muted-foreground">Gudang:</span> {inv.warehouse.name}
          </div>
          {inv.po && (
            <div>
              <span className="text-muted-foreground">Dari PO:</span>{" "}
              <Link href={`/purchase/orders/${inv.po.id}` as never} className="underline">
                {inv.po.code}
              </Link>
            </div>
          )}
          {inv.supplierInvoiceNo && (
            <div>
              <span className="text-muted-foreground">No. Supplier:</span>{" "}
              {inv.supplierInvoiceNo}
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Tgl Faktur:</span>{" "}
            {formatDate(inv.invoiceDate)}
          </div>
          <div>
            <span className="text-muted-foreground">Jatuh Tempo:</span>{" "}
            {formatDate(inv.dueDate)}
          </div>
          <div>
            <span className="text-muted-foreground">Posted oleh:</span>{" "}
            {inv.createdBy.name} pada {formatDateTime(inv.postedAt)}
          </div>
          {inv.voidedAt && (
            <div className="text-destructive">
              <span>VOID oleh:</span> {inv.voidedBy?.name ?? "-"} pada{" "}
              {formatDateTime(inv.voidedAt)} - alasan: {inv.voidReason}
            </div>
          )}
          {inv.note && (
            <div>
              <span className="text-muted-foreground">Catatan:</span> {inv.note}
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
              <tr>
                <td colSpan={6} className="py-1 text-right text-muted-foreground">
                  Pajak
                </td>
                <td>+ {formatIDR(Number(inv.tax))}</td>
              </tr>
              <tr className="border-t font-bold">
                <td colSpan={6} className="py-2 text-right">
                  Total
                </td>
                <td>{formatIDR(Number(inv.total))}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
