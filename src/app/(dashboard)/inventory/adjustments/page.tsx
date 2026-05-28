import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Eye } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listAdjustments } from "@/modules/inventory-adjustment/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Pagination } from "@/components/data-table/pagination"
import { formatDateTime } from "@/lib/date"

interface Row {
  id: string
  code: string
  warehouseName: string
  reason: string
  status: string
  createdBy: string
  createdAt: Date
  itemCount: number
}

export default async function AdjustmentsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("inventory.adjustment.create"))
    redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const { items, total, pageSize } = await listAdjustments({
    status: sp.status,
    page
  })

  const rows: Row[] = items.map((a) => ({
    id: a.id,
    code: a.code,
    warehouseName: a.warehouse.name,
    reason: a.reason,
    status: a.status,
    createdBy: a.createdBy.name,
    createdAt: a.createdAt,
    itemCount: a._count.items
  }))

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "code", header: "Kode" },
    { accessorKey: "warehouseName", header: "Gudang" },
    { accessorKey: "reason", header: "Alasan" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status
        const color =
          s === "POSTED"
            ? "text-emerald-600"
            : s === "CANCELLED"
              ? "text-destructive"
              : "text-muted-foreground"
        return <span className={color}>{s}</span>
      }
    },
    { accessorKey: "itemCount", header: "Item" },
    { accessorKey: "createdBy", header: "Dibuat oleh" },
    {
      accessorKey: "createdAt",
      header: "Tanggal",
      cell: ({ row }) => formatDateTime(row.original.createdAt)
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <Link href={`/inventory/adjustments/${row.original.id}` as never}>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
  ]

  return (
    <div>
      <PageHeader
        title="Penyesuaian Stok"
        description="Koreksi stok karena rusak/hilang/opname/dll. Status DRAFT bisa di-review sebelum posting."
        actions={
          <Link href={"/inventory/adjustments/new" as never}>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Tambah
            </Button>
          </Link>
        }
      />
      <DataTable columns={columns} data={rows} />
      <Pagination total={total} page={page} pageSize={pageSize} />
    </div>
  )
}
