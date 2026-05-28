import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Eye } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listPurchaseInvoices } from "@/modules/purchase-invoice/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Pagination } from "@/components/data-table/pagination"
import { formatDate } from "@/lib/date"
import { formatIDR } from "@/lib/money"

interface Row {
  id: string
  code: string
  supplierName: string
  invoiceDate: Date
  dueDate: Date
  total: number
  paidAmount: number
  status: string
  poCode: string | null
}

export default async function PInvsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("purchase.invoice.read"))
    redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const { items, total, pageSize } = await listPurchaseInvoices({
    status: sp.status,
    page
  })

  const rows: Row[] = items.map((inv) => ({
    id: inv.id,
    code: inv.code,
    supplierName: inv.supplier.name,
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    total: Number(inv.total),
    paidAmount: Number(inv.paidAmount),
    status: inv.status,
    poCode: inv.po?.code ?? null
  }))

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "code", header: "Kode" },
    { accessorKey: "supplierName", header: "Supplier" },
    { accessorKey: "poCode", header: "PO", cell: ({ row }) => row.original.poCode ?? "-" },
    {
      accessorKey: "invoiceDate",
      header: "Tgl Faktur",
      cell: ({ row }) => formatDate(row.original.invoiceDate)
    },
    {
      accessorKey: "dueDate",
      header: "Jatuh Tempo",
      cell: ({ row }) => formatDate(row.original.dueDate)
    },
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
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <Link href={`/purchase/invoices/${row.original.id}` as never}>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
  ]

  const canWrite = session.user.permissionKeys.includes("purchase.invoice.write")
  return (
    <div>
      <PageHeader
        title="Faktur Pembelian"
        description="Posting faktur menambah stok + membuat hutang ke supplier."
        actions={
          canWrite ? (
            <Link href={"/purchase/invoices/new" as never}>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Tambah Faktur
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
