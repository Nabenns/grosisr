import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Award, BookmarkX, Pencil } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listBrands } from "@/modules/master-brand/queries"
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
  productCount: number
}

export default async function BrandsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string; sortBy?: string; sortDir?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("brand.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const sortBy = sp.sortBy
  const sortDir = sp.sortDir === "desc" ? "desc" : "asc"
  const { items, total, pageSize } = await listBrands({ q: sp.q, page, sortBy, sortDir })

  const rows: Row[] = items.map((b) => ({
    id: b.id,
    name: b.name,
    isActive: b.isActive,
    productCount: b._count.products
  }))

  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: "name",
      header: "Nama",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>
    },
    {
      accessorKey: "productCount",
      header: "Jumlah Produk",
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">{row.original.productCount}</span>
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
        <Link href={`/master/brands/${row.original.id}/edit` as never}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
  ]

  const canWrite = session.user.permissionKeys.includes("brand.write")
  return (
    <div>
      <PageHeader
        title="Brand"
        description={`${total} brand terdaftar${sp.q ? ` untuk pencarian "${sp.q}"` : ""}`}
        actions={
          canWrite ? (
            <Link href={"/master/brands/new" as never}>
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
          <DataTableToolbar searchPlaceholder="Cari brand..." />
        </div>
        <div className="border-t">
          <DataTable
            columns={columns}
            data={rows}
            sortable
            rowClassName={() => "border-b last:border-0"}
            emptyState={
              <EmptyState
                icon={sp.q ? <BookmarkX /> : <Award />}
                title={sp.q ? "Brand tidak ditemukan" : "Belum ada brand"}
                description={
                  sp.q
                    ? `Tidak ada brand yang cocok dengan "${sp.q}".`
                    : "Tambahkan brand atau merk produk Anda."
                }
                action={
                  canWrite ? (
                    <Link href={"/master/brands/new" as never}>
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
