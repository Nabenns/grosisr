import Link from "next/link"
import { redirect } from "next/navigation"
import { Eye, Plus } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listSaleInvoices } from "@/modules/sale-pos/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Pagination } from "@/components/data-table/pagination"
import { formatDate } from "@/lib/date"
import { formatIDR } from "@/lib/money"

interface Row {
  id: string
  code: string
  customer: string
  invoiceDate: Date
  total: number
  paidAmount: number
  status: string
  saleType: string
  createdBy: string
}

export default async function SaleInvoicesPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("sale.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const { items, total, pageSize } = await listSaleInvoices({ status: sp.status, page })

  const rows: Row[] = items.map((inv) => ({
    id: inv.id,
    code: inv.code,
    customer: inv.customer?.name ?? "Walk-in",
    invoiceDate: inv.invoiceDate,
    total: Number(inv.total),
    paidAmount: Number(inv.paidAmount),
    status: inv.status,
    saleType: inv.saleType,
    createdBy: inv.createdBy.name
  }))

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "code", header: "Kode" },
    {
      accessorKey: "invoiceDate",
      header: "Tgl",
      cell: ({ row }) => formatDate(row.original.invoiceDate)
    },
    { accessorKey: "customer", header: "Customer" },
    { accessorKey: "saleType", header: "Tipe" },
    { accessorKey: "total", header: "Total", cell: ({ row }) => formatIDR(row.original.total) },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status
        const color =
          s === "PAID"
            ? "text-emerald-600"
            : s === "VOID"
              ? "text-destructive"
              : s === "PARTIAL"
                ? "text-amber-600"
                : "text-muted-foreground"
        return <span className={color}>{s}</span>
      }
    },
    { accessorKey: "createdBy", header: "Kasir" },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <Link href={`/sale/invoices/${row.original.id}` as never}>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
  ]

  const canPos = session.user.permissionKeys.includes("sale.write")
  return (
    <div>
      <PageHeader
        title="Faktur Penjualan"
        description="Riwayat penjualan dari POS."
        actions={
          canPos ? (
            <Link href={"/sale/pos" as never}>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Buka POS
              </Button>
            </Link>
          ) : null
        }
      />
      <DataTable columns={columns} data={rows} />
      <Pagination total={total} page={page} pageSize={pageSize} />
    </div>
  )
}
