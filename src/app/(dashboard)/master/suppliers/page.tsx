import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Truck, Building2, Pencil } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listSuppliers } from "@/modules/master-supplier/queries"
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
  phone: string | null
  termOfPaymentDays: number
  isActive: boolean
}

export default async function SuppliersPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string; sortBy?: string; sortDir?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("supplier.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const sortBy = sp.sortBy
  const sortDir = sp.sortDir === "desc" ? "desc" : "asc"
  const { items, total, pageSize } = await listSuppliers({ q: sp.q, page, sortBy, sortDir })

  const rows: Row[] = items.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    phone: s.phone,
    termOfPaymentDays: s.termOfPaymentDays,
    isActive: s.isActive
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
      header: "Nama Supplier",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>
    },
    {
      accessorKey: "phone",
      header: "Telepon",
      cell: ({ row }) => row.original.phone ?? <span className="text-muted-foreground">-</span>
    },
    {
      accessorKey: "termOfPaymentDays",
      header: "Termin",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.termOfPaymentDays > 0 ? `${row.original.termOfPaymentDays} hari` : "COD (Tunai)"}
        </span>
      )
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
        <Link href={`/master/suppliers/${row.original.id}/edit` as never}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
  ]

  const canWrite = session.user.permissionKeys.includes("supplier.write")
  return (
    <div>
      <PageHeader
        title="Supplier"
        description={`${total} pemasok terdaftar${sp.q ? ` untuk pencarian "${sp.q}"` : ""}`}
        actions={
          canWrite ? (
            <Link href={"/master/suppliers/new" as never}>
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
          <DataTableToolbar searchPlaceholder="Cari nama, kode, atau telepon..." />
        </div>
        <div className="border-t">
          <DataTable
            columns={columns}
            data={rows}
            sortable
            rowClassName={() => "border-b last:border-0"}
            emptyState={
              <EmptyState
                icon={sp.q ? <Building2 /> : <Truck />}
                title={sp.q ? "Supplier tidak ditemukan" : "Belum ada pemasok"}
                description={
                  sp.q
                    ? `Tidak ada supplier yang cocok dengan "${sp.q}".`
                    : "Tambahkan pemasok untuk mulai mencatat pembelian dan stok masuk."
                }
                action={
                  canWrite ? (
                    <Link href={"/master/suppliers/new" as never}>
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
