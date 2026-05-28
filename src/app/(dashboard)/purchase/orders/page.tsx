import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Eye } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listPOs } from "@/modules/purchase-order/queries"
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
  warehouseName: string
  orderDate: Date
  total: number
  status: string
}

export default async function POsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("purchase.po.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const { items, total, pageSize } = await listPOs({ status: sp.status, page })

  const rows: Row[] = items.map((po) => ({
    id: po.id,
    code: po.code,
    supplierName: po.supplier.name,
    warehouseName: po.warehouse.name,
    orderDate: po.orderDate,
    total: Number(po.total),
    status: po.status
  }))

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "code", header: "Kode" },
    { accessorKey: "supplierName", header: "Supplier" },
    { accessorKey: "warehouseName", header: "Gudang" },
    {
      accessorKey: "orderDate",
      header: "Tgl Pesan",
      cell: ({ row }) => formatDate(row.original.orderDate)
    },
    { accessorKey: "total", header: "Total", cell: ({ row }) => formatIDR(row.original.total) },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status
        const color =
          s === "COMPLETED"
            ? "text-emerald-600"
            : s === "CANCELLED"
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
        <Link href={`/purchase/orders/${row.original.id}` as never}>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
  ]

  const canWrite = session.user.permissionKeys.includes("purchase.po.write")
  return (
    <div>
      <PageHeader
        title="Purchase Order"
        description="Pesanan ke supplier. DRAFT -> SENT -> PARTIAL/COMPLETED via faktur pembelian."
        actions={
          canWrite ? (
            <Link href={"/purchase/orders/new" as never}>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Tambah PO
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
