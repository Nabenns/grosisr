import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getSaleInvoiceById } from "@/modules/sale-pos/queries"
import { formatDateTime } from "@/lib/date"
import { formatIDR } from "@/lib/money"

export default async function ReceiptPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) return null

  const { id } = await params
  const inv = await getSaleInvoiceById(id)
  if (!inv) notFound()

  const settings = await prisma.setting.findMany({
    where: { key: { in: ["store_name", "store_address", "store_phone"] } }
  })
  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  const storeName = settingMap.store_name ?? "Grosir"
  const storeAddress = settingMap.store_address ?? ""
  const storePhone = settingMap.store_phone ?? ""

  return (
    <html lang="id">
      <head>
        <title>Struk {inv.code}</title>
        <style>{`
          body { font-family: monospace; max-width: 320px; margin: 0 auto; padding: 12px; font-size: 12px; }
          .center { text-align: center; }
          .right { text-align: right; }
          hr { border: 0; border-top: 1px dashed #999; margin: 8px 0; }
          table { width: 100%; }
          .item-name { font-size: 11px; }
          .item-row td { vertical-align: top; padding: 1px 0; }
          @media print {
            body { padding: 0; }
          }
        `}</style>
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{ __html: "window.addEventListener('load', () => window.print())" }}
        />
        <div className="center">
          <strong>{storeName}</strong>
          {storeAddress && <div>{storeAddress}</div>}
          {storePhone && <div>{storePhone}</div>}
        </div>
        <hr />
        <div>
          {inv.code}
          <span className="right" style={{ float: "right" }}>
            {formatDateTime(inv.postedAt)}
          </span>
        </div>
        <div>
          Kasir: {inv.createdBy.name}
          <br />
          Customer: {inv.customer?.name ?? "Walk-in"}
        </div>
        <hr />
        <table>
          <tbody>
            {inv.items.map((item) => (
              <tr key={item.id} className="item-row">
                <td colSpan={2} className="item-name">
                  {item.productUnit.product.name}
                  <br />
                  {Number(item.qty)} {item.productUnit.unit.name} @ {formatIDR(Number(item.price))}
                </td>
                <td className="right" style={{ whiteSpace: "nowrap" }}>
                  {formatIDR(Number(item.subtotal))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr />
        <table>
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td className="right">{formatIDR(Number(inv.subtotal))}</td>
            </tr>
            {Number(inv.discount) > 0 && (
              <tr>
                <td>Diskon</td>
                <td className="right">-{formatIDR(Number(inv.discount))}</td>
              </tr>
            )}
            <tr>
              <td>
                <strong>TOTAL</strong>
              </td>
              <td className="right">
                <strong>{formatIDR(Number(inv.total))}</strong>
              </td>
            </tr>
            <tr>
              <td>Bayar</td>
              <td className="right">{formatIDR(Number(inv.paidAmount))}</td>
            </tr>
            {Number(inv.changeAmount) > 0 && (
              <tr>
                <td>Kembali</td>
                <td className="right">{formatIDR(Number(inv.changeAmount))}</td>
              </tr>
            )}
          </tbody>
        </table>
        <hr />
        <div className="center">
          Terima kasih
          <br />
          Selamat berbelanja kembali
        </div>
      </body>
    </html>
  )
}
