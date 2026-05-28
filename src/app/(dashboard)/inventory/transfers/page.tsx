import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Eye } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listTransfers } from "@/modules/inventory-transfer/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Pagination } from "@/components/data-table/pagination"
import { formatDateTime } from "@/lib/date"

interface Row {
  id: string
  code: string
  fromName: string
  toName: string
  status: string
  createdBy: string
  createdAt: Date
  itemCount: number
}

export default async function TransfersPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("inventory.transfer.create"))
    redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const { items, total, pageSize } = await listTransfers({ status: sp.status, page })

  const rows: Row[] = items.map((t) => ({
    id: t.id,
    code: t.code,
    fromName: t.fromWarehouse.name,
    toName: t.toWarehouse.name,
    status: t.status,
    createdBy: t.createdBy.name,
    createdAt: t.createdAt,
    itemCount: t._count.items
  }))

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "code", header: "Kode" },
    { accessorKey: "fromName", header: "Dari" },
    { accessorKey: "toName", header: "Ke" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status
        const color =
          s === "COMPLETED"
            ? "text-emerald-600"
            : s === "IN_TRANSIT"
              ? "text-amber-600"
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
        <Link href={`/inventory/transfers/${row.original.id}` as never}>
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
        title="Mutasi Antar Gudang"
        description="Transfer stok antar gudang. Alur: DRAFT -> Kirim (IN_TRANSIT) -> Terima (COMPLETED)."
        actions={
          <Link href={"/inventory/transfers/new" as never}>
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
