import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getSaleInvoiceById } from "@/modules/sale-pos/queries"
import { formatDateTime } from "@/lib/date"
import { formatIDR } from "@/lib/money"
import { PrintTrigger } from "./print-trigger"

export const metadata: Metadata = { title: "Struk" }

const PAYMENT_LABEL: Record<string, string> = {
  TUNAI: "Tunai",
  TRANSFER: "Transfer",
  QRIS: "QRIS",
  KARTU: "Kartu"
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  UNPAID: "Belum Bayar",
  PARTIAL: "Bayar Sebagian",
  PAID: "Lunas",
  VOID: "DIBATALKAN"
}

export default async function ReceiptPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ autoprint?: string; w?: string }>
}) {
  const session = await auth()
  if (!session?.user) return null

  const { id } = await params
  const sp = await searchParams
  const inv = await getSaleInvoiceById(id)
  if (!inv) notFound()

  const settings = await prisma.setting.findMany({
    where: { key: { in: ["store_name", "store_address", "store_phone"] } }
  })
  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  const storeName = settingMap.store_name ?? "Grosir"
  const storeAddress = settingMap.store_address ?? ""
  const storePhone = settingMap.store_phone ?? ""

  const width = sp.w === "58" ? 220 : sp.w === "a4" ? 640 : 300
  const autoprint = sp.autoprint !== "0"
  const totalQty = inv.items.reduce((sum, item) => sum + Number(item.qty), 0)
  const isVoid = inv.status === "VOID" || !!inv.voidedAt
  const remaining = Number(inv.total) - Number(inv.paidAmount)

  return (
    <div className="receipt-root" style={{ maxWidth: width }}>
      <style>{`
        .receipt-root { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; margin: 0 auto; padding: 12px; font-size: 12px; line-height: 1.45; color: #000; }
        .receipt-root .center { text-align: center; }
        .receipt-root .right { text-align: right; }
        .receipt-root hr { border: 0; border-top: 1px dashed #999; margin: 8px 0; }
        .receipt-root table { width: 100%; border-collapse: collapse; }
        .receipt-root .item-row td { vertical-align: top; padding: 2px 0; }
        .receipt-root .item-name { font-size: 11px; }
        .receipt-root .muted { color: #555; font-size: 10px; }
        .receipt-root .void { border: 2px solid #000; padding: 4px; text-align: center; font-weight: 700; letter-spacing: 1px; margin: 8px 0; }
        @page { margin: 4mm; }
        @media print {
          .receipt-root { padding: 0; max-width: none; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      {autoprint && (
        <script
          dangerouslySetInnerHTML={{
            __html: "window.addEventListener('load', function () { setTimeout(function () { window.print() }, 150) })"
          }}
        />
      )}

      <div className="center">
        <strong>{storeName}</strong>
        {storeAddress && <div className="muted">{storeAddress}</div>}
        {storePhone && <div className="muted">{storePhone}</div>}
      </div>
      <hr />

      {isVoid && <div className="void">STRUK DIBATALKAN</div>}

      <div>
        {inv.code}
        <span className="right" style={{ float: "right" }}>
          {formatDateTime(inv.postedAt)}
        </span>
      </div>
      <div className="muted">
        Kasir: {inv.createdBy.name}
        <br />
        Customer: {inv.customer?.name ?? "Walk-in"}
        <br />
        Gudang: {inv.warehouse.name}
      </div>
      <hr />

      <table>
        <tbody>
          {inv.items.map((item) => (
            <tr key={item.id} className="item-row">
              <td className="item-name">
                {item.productUnit.product.name}
                <br />
                <span className="muted">
                  {item.productUnit.product.sku} · {Number(item.qty)} {item.productUnit.unit.name} @{" "}
                  {formatIDR(Number(item.price))}
                </span>
                {Number(item.discount) > 0 && (
                  <>
                    <br />
                    <span className="muted">Diskon item {formatIDR(Number(item.discount))}</span>
                  </>
                )}
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
            <td>Total item</td>
            <td className="right">
              {totalQty} ({inv.items.length} baris)
            </td>
          </tr>
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
          {Number(inv.tax) > 0 && (
            <tr>
              <td>Pajak</td>
              <td className="right">{formatIDR(Number(inv.tax))}</td>
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
          {remaining > 0 && inv.saleType === "CREDIT" && (
            <>
              <tr>
                <td>Sisa</td>
                <td className="right">{formatIDR(remaining)}</td>
              </tr>
              <tr>
                <td>Jatuh tempo</td>
                <td className="right">{inv.dueDate ? formatDateTime(inv.dueDate) : "-"}</td>
              </tr>
            </>
          )}
          <tr>
            <td>Metode</td>
            <td className="right">
              {inv.paymentMethod ? PAYMENT_LABEL[inv.paymentMethod] ?? inv.paymentMethod : inv.saleType}
              {inv.paymentRefNo ? ` · ${inv.paymentRefNo}` : ""}
            </td>
          </tr>
          <tr>
            <td>Status</td>
            <td className="right">{STATUS_LABEL[inv.status] ?? inv.status}</td>
          </tr>
        </tbody>
      </table>

      {inv.note && (
        <>
          <hr />
          <div className="muted">Catatan: {inv.note}</div>
        </>
      )}
      {isVoid && inv.voidReason && <div className="muted">Alasan void: {inv.voidReason}</div>}

      <hr />
      <div className="center">
        Terima kasih
        <br />
        Selamat berbelanja kembali
      </div>
      <div className="center muted" style={{ marginTop: 6, letterSpacing: 1 }}>
        {inv.code}
      </div>

      <PrintTrigger />
    </div>
  )
}
