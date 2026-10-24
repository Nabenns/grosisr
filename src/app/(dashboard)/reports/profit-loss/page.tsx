import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, Percent, Receipt, ShoppingBag, Wallet } from "lucide-react"
import { auth } from "@/lib/auth"
import { getProfitLossReport } from "@/modules/reports/queries"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDate } from "@/lib/date"
import { formatIDR } from "@/lib/money"
import { cn } from "@/lib/utils"
import { ProfitChart, TopProductChart } from "./profit-chart"

const DAY = 24 * 60 * 60 * 1000

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default async function ProfitLossPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("sale.read")) redirect("/forbidden")

  const params = await searchParams
  const today = new Date()
  const defaultFrom = new Date(today.getTime() - 29 * DAY)
  const fromValue = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") ? params.from! : isoDay(defaultFrom)
  const toValue = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "") ? params.to! : isoDay(today)

  const from = new Date(`${fromValue}T00:00:00`)
  const to = new Date(`${toValue}T23:59:59.999`)
  const report = await getProfitLossReport({ dateFrom: from, dateTo: to })
  const { summary, daily, topProducts } = report

  const profitUp = summary.profit >= 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Laba Rugi"
        description={`Omzet, HPP, dan laba kotor dari ${formatDate(from)} hingga ${formatDate(to)}`}
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="space-y-1">
          <Label htmlFor="from" className="text-xs text-muted-foreground">
            Dari tanggal
          </Label>
          <Input id="from" name="from" type="date" defaultValue={fromValue} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to" className="text-xs text-muted-foreground">
            Sampai tanggal
          </Label>
          <Input id="to" name="to" type="date" defaultValue={toValue} className="w-40" />
        </div>
        <Button type="submit" variant="secondary">
          Terapkan
        </Button>
        <Link href="/reports/profit-loss" className={cn(buttonVariants({ variant: "ghost" }))}>
          Reset
        </Link>
      </form>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Omzet</CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums" data-testid="pl-revenue">
              {formatIDR(summary.revenue)}
            </div>
            <p className="text-xs text-muted-foreground">{summary.invoiceCount} transaksi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">HPP (estimasi)</CardTitle>
            <ShoppingBag className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums" data-testid="pl-cogs">
              {formatIDR(summary.cogs)}
            </div>
            <p className="text-xs text-muted-foreground">harga beli unit saat ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Laba Kotor</CardTitle>
            {profitUp ? (
              <ArrowUpRight className="size-4 text-emerald-600" />
            ) : (
              <ArrowDownRight className="size-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold tabular-nums ${profitUp ? "text-emerald-600" : "text-red-600"}`}
              data-testid="pl-profit"
            >
              {formatIDR(summary.profit)}
            </div>
            <p className="text-xs text-muted-foreground">
              rata-rata {formatIDR(summary.avgPerInvoice)}/transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Margin</CardTitle>
            <Percent className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums" data-testid="pl-margin">
              {summary.margin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              <Receipt className="mr-1 inline size-3" />
              {daily.length} hari ada penjualan
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Omzet vs Laba Kotor</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitChart data={daily} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Laba per Produk (top 7)</CardTitle>
          </CardHeader>
          <CardContent>
            <TopProductChart data={topProducts} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Produk Paling Menguntungkan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">SKU</th>
                  <th className="px-4 py-2 font-medium">Produk</th>
                  <th className="px-4 py-2 text-right font-medium">Qty</th>
                  <th className="px-4 py-2 text-right font-medium">Omzet</th>
                  <th className="px-4 py-2 text-right font-medium">Laba</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      Belum ada penjualan pada rentang ini.
                    </td>
                  </tr>
                )}
                {topProducts.map((row) => (
                  <tr key={row.sku} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{row.sku}</td>
                    <td className="px-4 py-2">{row.name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.qty}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatIDR(row.revenue)}</td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums ${
                        row.profit >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {formatIDR(row.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
