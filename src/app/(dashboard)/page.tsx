import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  BanknoteArrowDown,
  Barcode,
  Calculator,
  CircleAlert,
  Package,
  ReceiptText,
  Truck,
  Warehouse,
  ClipboardList
} from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import "dayjs/locale/id"
import { formatIDR } from "@/lib/money"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale("id")

const TZ = process.env.APP_TIMEZONE ?? "Asia/Jakarta"
const REDUCED_STOCK_LIMIT = 6

const SALE_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  UNPAID: "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/25",
  PARTIAL: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
  PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/25",
  VOID: "bg-destructive/10 text-destructive border-destructive/25"
}

const SALE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  UNPAID: "Belum Bayar",
  PARTIAL: "Sebagian",
  PAID: "Lunas",
  VOID: "Void"
}

const QUICK_ACTIONS = [
  {
    href: "/sale/pos",
    icon: Calculator,
    title: "Buka Kasir",
    desc: "Transaksi penjualan tunai",
    accent: "text-primary"
  },
  {
    href: "/purchase/orders/new",
    icon: Truck,
    title: "Buat Pesanan Pembelian",
    desc: "Pesan stok ke supplier",
    accent: "text-foreground"
  },
  {
    href: "/inventory/transfers/new",
    icon: Warehouse,
    title: "Transfer Antar Gudang",
    desc: "Pindahkan stok",
    accent: "text-foreground"
  },
  {
    href: "/inventory/adjustments/new",
    icon: ClipboardList,
    title: "Stok Opname",
    desc: "Selaraskan stok fisik",
    accent: "text-foreground"
  }
] as const

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const cookieStore = await cookies()
  const warehouseCookie = cookieStore.get("current_warehouse")?.value
  const accessibleWarehouses = session.user.warehouseIds ?? []
  const currentWarehouseId =
    warehouseCookie && accessibleWarehouses.includes(warehouseCookie)
      ? warehouseCookie
      : session.user.defaultWarehouseId ?? accessibleWarehouses[0] ?? null

  const todayStart = dayjs().tz(TZ).startOf("day").utc().toDate()
  const todayEnd = dayjs().tz(TZ).endOf("day").utc().toDate()
  const yesterdayStart = dayjs().tz(TZ).subtract(1, "day").startOf("day").utc().toDate()
  const yesterdayEnd = dayjs().tz(TZ).subtract(1, "day").endOf("day").utc().toDate()

  const postable = { NOT: { status: "VOID" as const } }

  const [
    todayAgg,
    yesterdayAgg,
    itemsSoldAgg,
    recentInvoices,
    lowStockRaw,
    productCount,
    customerCount,
    supplierCount
  ] = await Promise.all([
    prisma.saleInvoice.aggregate({
      _sum: { total: true },
      _count: true,
      where: { ...postable, postedAt: { gte: todayStart, lte: todayEnd } }
    }),
    prisma.saleInvoice.aggregate({
      _sum: { total: true },
      _count: true,
      where: { ...postable, postedAt: { gte: yesterdayStart, lte: yesterdayEnd } }
    }),
    prisma.saleInvoiceItem.aggregate({
      _sum: { qty: true },
      where: {
        invoice: { ...postable, postedAt: { gte: todayStart, lte: todayEnd } }
      }
    }),
    prisma.saleInvoice.findMany({
      where: postable,
      orderBy: { postedAt: "desc" },
      take: 6,
      select: {
        id: true,
        code: true,
        total: true,
        status: true,
        saleType: true,
        postedAt: true,
        customer: { select: { name: true } },
        createdBy: { select: { name: true } }
      }
    }),
    prisma.stockBalance.findMany({
      where: {
        product: { deletedAt: null, isActive: true },
        ...(currentWarehouseId ? { warehouseId: currentWarehouseId } : {})
      },
      select: {
        qtyInBase: true,
        minStock: true,
        product: { select: { id: true, name: true, sku: true, minStock: true } },
        warehouse: { select: { name: true } }
      },
      take: 500
    }),
    prisma.product.count({ where: { deletedAt: null, isActive: true } }),
    prisma.customer.count({ where: { deletedAt: null, isActive: true } }),
    prisma.supplier.count({ where: { deletedAt: null, isActive: true } })
  ])

  const omzetToday = Number(todayAgg._sum.total ?? 0)
  const omzetYesterday = Number(yesterdayAgg._sum.total ?? 0)
  const trxToday = todayAgg._count
  const trxYesterday = yesterdayAgg._count
  const itemsSold = Number(itemsSoldAgg._sum.qty ?? 0)

  const omzetDelta =
    omzetYesterday > 0
      ? Number((((omzetToday - omzetYesterday) / omzetYesterday) * 100).toFixed(1))
      : null
  const trxDelta =
    trxYesterday > 0 ? Math.round(((trxToday - trxYesterday) / trxYesterday) * 100) : null

  const lowStock = lowStockRaw
    .map((r) => {
      const minStock = r.minStock ?? r.product.minStock
      const qty = Number(r.qtyInBase)
      return {
        productId: r.product.id,
        name: r.product.name,
        sku: r.product.sku,
        warehouse: r.warehouse.name,
        qty,
        minStock,
        ratio: qty / Math.max(minStock, 1)
      }
    })
    .filter((r) => r.qty < r.minStock)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, REDUCED_STOCK_LIMIT)

  const todayLabel = dayjs().tz(TZ).format("dddd, DD MMMM YYYY")

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Operating Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {todayLabel} · Data real-time seluruh gudang
          </p>
        </div>
        <Link
          href="/sale/pos"
          className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
        >
          <Calculator className="size-4" />
          Buka Kasir
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="py-4">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Omzet Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold tabular-nums tracking-tight">
              {formatIDR(omzetToday)}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {omzetDelta !== null && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 font-medium",
                    omzetDelta >= 0
                      ? "text-emerald-600 dark:text-emerald-500"
                      : "text-destructive"
                  )}
                >
                  {omzetDelta >= 0 ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
                  {Math.abs(omzetDelta)}%
                </span>
              )}
              <span>vs kemarin {formatIDR(omzetYesterday)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Transaksi Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold tabular-nums tracking-tight">{trxToday}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {trxDelta !== null && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 font-medium",
                    trxDelta >= 0
                      ? "text-emerald-600 dark:text-emerald-500"
                      : "text-destructive"
                  )}
                >
                  {trxDelta >= 0 ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
                  {Math.abs(trxDelta)}%
                </span>
              )}
              <span>vs kemarin {trxYesterday}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Item Terjual Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold tabular-nums tracking-tight">
              {itemsSold.toLocaleString("id-ID")}
            </div>
            <div className="text-xs text-muted-foreground">unit terkirim (semua gudang)</div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Stok Kritis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold tabular-nums tracking-tight">
              {lowStock.length}
              {lowStock.length >= REDUCED_STOCK_LIMIT && (
                <span className="text-base font-normal text-muted-foreground">+</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              <Link href="/inventory/stock" className="text-primary hover:underline">
                Tinjau daftar&nbsp;→
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low stock breakdown + quick actions */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CircleAlert className="size-4 text-destructive" />
              Stok di Bawah Minimum
            </CardTitle>
            <Link
              href="/inventory/stock"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "h-7 gap-1 text-xs text-muted-foreground"
              )}
            >
              Semua stok
              <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-1">
            {lowStock.length === 0 ? (
              <div className="flex items-center gap-2 px-6 pb-4 text-sm text-muted-foreground">
                <Package className="size-4" />
                Semua stok aman — tidak ada produk di bawah minimum.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Produk</TableHead>
                    <TableHead>Gudang</TableHead>
                    <TableHead className="text-right">Sisa</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="pr-6 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.map((row) => (
                    <TableRow key={`${row.productId}-${row.warehouse}`}>
                      <TableCell className="pl-6">
                        <div className="font-medium leading-tight">{row.name}</div>
                        <div className="text-xs tabular-nums text-muted-foreground">{row.sku}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.warehouse}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-destructive">
                        {row.qty.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.minStock.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Link
                          href="/purchase/orders/new"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "h-7 text-xs"
                          )}
                        >
                          <BanknoteArrowDown className="size-3" />
                          Restok
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Pintasan Operasional</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors hover:bg-accent"
              >
                <action.icon className={cn("size-4 shrink-0", action.accent)} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight">{action.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{action.desc}</div>
                </div>
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
            <div className="mt-1 grid grid-cols-3 gap-2 border-t pt-3 text-center">
              <div>
                <div className="text-sm font-semibold tabular-nums">{productCount}</div>
                <div className="text-[11px] text-muted-foreground">Produk</div>
              </div>
              <div>
                <div className="text-sm font-semibold tabular-nums">{customerCount}</div>
                <div className="text-[11px] text-muted-foreground">Customer</div>
              </div>
              <div>
                <div className="text-sm font-semibold tabular-nums">{supplierCount}</div>
                <div className="text-[11px] text-muted-foreground">Supplier</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest transactions */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ReceiptText className="size-4 text-muted-foreground" />
            Transaksi Terakhir
          </CardTitle>
          <Link
            href="/sale/invoices"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-7 gap-1 text-xs text-muted-foreground"
            )}
          >
            Semua faktur
            <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent className="px-0 pb-1">
          {recentInvoices.length === 0 ? (
            <div className="flex items-center gap-2 px-6 pb-4 text-sm text-muted-foreground">
              <Barcode className="size-4" />
              Belum ada penjualan tercatat. Mulai dari{" "}
              <Link href="/sale/pos" className="text-primary hover:underline">
                Kasir
              </Link>
              .
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">No. Faktur</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="pr-6 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="pl-6">
                      <Link
                        href={`/sale/invoices/${inv.id}`}
                        className="font-medium tabular-nums hover:text-primary hover:underline"
                      >
                        {inv.code}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {inv.createdBy?.name ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {inv.customer?.name ?? (
                        <span className="italic text-muted-foreground">Umum</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] font-normal">
                        {inv.saleType === "CREDIT" ? "Kredit" : "Tunai"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {dayjs(inv.postedAt).tz(TZ).format("DD MMM HH:mm")}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatIDR(inv.total)}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-medium",
                          SALE_STATUS_STYLES[inv.status] ?? ""
                        )}
                      >
                        {SALE_STATUS_LABEL[inv.status] ?? inv.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
