import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Warehouse as WarehouseIcon, Building, Pencil } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listWarehouses } from "@/modules/master-warehouse/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { Pagination } from "@/components/data-table/pagination"
import { EmptyState } from "@/components/empty-state"

interface Row {
  id: string
  code: string
  name: string
  address: string | null
  isDefault: boolean
  isActive: boolean
}

export default async function WarehousesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string; sortBy?: string; sortDir?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("warehouse.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const sortBy = sp.sortBy
  const sortDir = sp.sortDir === "desc" ? "desc" : "asc"
  const { items, total, pageSize } = await listWarehouses({ q: sp.q, page, sortBy, sortDir })

  const rows: Row[] = items.map((w) => ({
    id: w.id,
    code: w.code,
    name: w.name,
    address: w.address,
    isDefault: w.isDefault,
    isActive: w.isActive
  }))

  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: "code",
      header: "Kode",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span>
      )
    },
    {
      accessorKey: "name",
      header: "Nama Gudang",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.name}</span>
          {row.original.isDefault && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Utama
            </Badge>
          )}
        </div>
      )
    },
    {
      accessorKey: "address",
      header: "Alamat",
      cell: ({ row }) => row.original.address ?? <span className="text-muted-foreground">-</span>
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="success">Aktif</Badge>
        ) : (
          <Badge variant="secondary">Nonaktif</Badge>
        )
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Link href={`/master/warehouses/${row.original.id}/edit` as never}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
  ]

  const canWrite = session.user.permissionKeys.includes("warehouse.write")
  return (
    <div>
      <PageHeader
        title="Gudang"
        description={`${total} lokasi gudang${sp.q ? ` untuk pencarian "${sp.q}"` : ""}`}
        actions={
          canWrite ? (
            <Link href={"/master/warehouses/new" as never}>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Tambah
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="px-4 pt-4">
          <DataTableToolbar searchPlaceholder="Cari nama atau kode gudang..." />
        </div>
        <div className="border-t">
          <DataTable
            columns={columns}
            data={rows}
            sortable
            rowClassName={() => "border-b last:border-0"}
            emptyState={
              <EmptyState
                icon={sp.q ? <Building /> : <WarehouseIcon />}
                title={sp.q ? "Gudang tidak ditemukan" : "Belum ada gudang"}
                description={
                  sp.q
                    ? `Tidak ada gudang yang cocok dengan "${sp.q}".`
                    : "Tambahkan gudang untuk mulai melacak persediaan fisik stok."
                }
                action={
                  canWrite ? (
                    <Link href={"/master/warehouses/new" as never}>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Tambah
                      </Button>
                    </Link>
                  ) : null
                }
              />
            }
          />
        </div>
      </div>

      {total > 0 && (
        <div className="mt-4">
          <Pagination total={total} page={page} pageSize={pageSize} />
        </div>
      )}
    </div>
  )
}
