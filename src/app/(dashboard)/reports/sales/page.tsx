import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getSalesReport } from "@/modules/sale-pos/queries"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDate } from "@/lib/date"
import { formatIDR } from "@/lib/money"
import { PrintReportButton } from "./print-button"

const DAY = 24 * 60 * 60 * 1000

function defaultRange() {
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  const from = new Date(Date.now() - 6 * DAY)
  from.setHours(0, 0, 0, 0)
  return { from, to }
}

export default async function SalesReportPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("sale.read")) redirect("/forbidden")

  const { from: defaultFrom, to: defaultTo } = defaultRange()
  const fromValue = defaultFrom.toISOString().slice(0, 10)
  const toValue = defaultTo.toISOString().slice(0, 10)

  const from = new Date(fromValue)
  const to = new Date(toValue)
  const { items, summary } = await getSalesReport({ dateFrom: from, dateTo: to })

  const grandTotal = items.reduce((acc, it) => acc + it.total, 0)
  const grandCount = items.reduce((acc, it) => acc + it.count, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Penjualan"
        description={`Ringkasan penjualan dari ${formatDate(from)} hingga ${formatDate(to)}`}
        actions={<PrintReportButton />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{summary.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Total Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatIDR(grandTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Tunai Diterima</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatIDR(summary.cash)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Rata-rata / Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatIDR(grandCount ? grandTotal / grandCount : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail per Tanggal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pl-4">Tanggal</th>
                  <th className="pb-3 pr-4 text-right">Transaksi</th>
                  <th className="pb-3 pr-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.length === 0 ? (
                  <tr>
                    <td className="py-8 pl-4 text-center text-muted-foreground" colSpan={3}>
                      Tidak ada penjualan pada rentang tanggal ini.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.date} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 pl-4 font-medium">{formatDate(new Date(it.date))}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{it.count}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{formatIDR(it.total)}</td>
                    </tr>
                  ))
                )}
                <tr className="border-t border-border font-bold bg-muted/50">
                  <td className="py-3 pl-4">Total</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{grandCount}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{formatIDR(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
