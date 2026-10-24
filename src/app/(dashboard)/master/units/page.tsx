import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Ruler, Slash, Pencil } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listUnits } from "@/modules/master-unit/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { Pagination } from "@/components/data-table/pagination"
import { EmptyState } from "@/components/empty-state"

interface Row {
  id: string
  name: string
  isActive: boolean
}

export default async function UnitsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string; sortBy?: string; sortDir?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("unit.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const sortBy = sp.sortBy
  const sortDir = sp.sortDir === "desc" ? "desc" : "asc"
  const { items, total, pageSize } = await listUnits({ q: sp.q, page, sortBy, sortDir })

  const rows: Row[] = items.map((u) => ({
    id: u.id,
    name: u.name,
    isActive: u.isActive
  }))

  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: "name",
      header: "Nama Satuan",
      cell: ({ row }) => <span className="font-medium font-mono text-sm">{row.original.name}</span>
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
        <Link href={`/master/units/${row.original.id}/edit` as never}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
  ]

  const canWrite = session.user.permissionKeys.includes("unit.write")
  return (
    <div>
      <PageHeader
        title="Satuan"
        description={`${total} satuan terdaftar${sp.q ? ` untuk pencarian "${sp.q}"` : ""}`}
        actions={
          canWrite ? (
            <Link href={"/master/units/new" as never}>
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
          <DataTableToolbar searchPlaceholder="Cari satuan..." />
        </div>
        <div className="border-t">
          <DataTable
            columns={columns}
            data={rows}
            sortable
            rowClassName={() => "border-b last:border-0"}
            emptyState={
              <EmptyState
                icon={sp.q ? <Slash /> : <Ruler />}
                title={sp.q ? "Satuan tidak ditemukan" : "Belum ada satuan"}
                description={
                  sp.q
                    ? `Tidak ada satuan yang cocok dengan "${sp.q}".`
                    : "Tambahkan satuan seperti PCS, DUS, PACK untuk konversi harga bertingkat."
                }
                action={
                  canWrite ? (
                    <Link href={"/master/units/new" as never}>
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
