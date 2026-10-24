import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Eye, PackageSearch } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { listProducts } from "@/modules/master-product/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { Pagination } from "@/components/data-table/pagination"
import { EmptyState } from "@/components/empty-state"
import { formatIDR } from "@/lib/money"

interface Row {
  id: string
  sku: string
  name: string
  category: string
  brand: string | null
  defaultSalePrice: number
  isActive: boolean
}

export default async function ProductsListPage({
  searchParams
}: {
  searchParams: Promise<{
    q?: string
    categoryId?: string
    status?: string
    page?: string
    sortBy?: string
    sortDir?: string
  }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("product.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const status = (sp.status as "active" | "inactive" | "all") ?? "active"
  const sortBy = sp.sortBy
  const sortDir = sp.sortDir === "desc" ? "desc" : "asc"

  const [{ items, total, pageSize }, categories] = await Promise.all([
    listProducts({ q: sp.q, categoryId: sp.categoryId, status, page, sortBy, sortDir }),
    prisma.category.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ])

  const rows: Row[] = items.map((p) => {
    const defSale = p.units.find((u) => u.isDefaultSale) ?? p.units[0]
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category.name,
      brand: p.brand?.name ?? null,
      defaultSalePrice: defSale ? Number(defSale.salePrice) : 0,
      isActive: p.isActive
    }
  })

  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.sku}</span>
      )
    },
    {
      accessorKey: "name",
      header: "Nama",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>
    },
    { accessorKey: "category", header: "Kategori" },
    {
      accessorKey: "brand",
      header: "Brand",
      cell: ({ row }) => row.original.brand ?? <span className="text-muted-foreground">-</span>
    },
    {
      accessorKey: "defaultSalePrice",
      header: "Harga Jual",
      cell: ({ row }) => (
        <span className="tabular-nums">{formatIDR(row.original.defaultSalePrice)}</span>
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
        <Link href={`/master/products/${row.original.id}` as never}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
  ]

  const canWrite = session.user.permissionKeys.includes("product.write")
  return (
    <div>
      <PageHeader
        title="Produk"
        description={`${total} produk terdaftar${sp.q ? ` untuk pencarian "${sp.q}"` : ""}`}
        actions={
          canWrite ? (
            <Link href={"/master/products/new" as never}>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Tambah Produk
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="px-4 pt-4">
          <DataTableToolbar
            searchPlaceholder="Cari nama, SKU, atau barcode..."
            filters={[
              {
                key: "categoryId",
                label: "Kategori",
                allLabel: "Semua kategori",
                options: categories.map((c) => ({ label: c.name, value: c.id }))
              },
              {
                key: "status",
                label: "Status",
                allLabel: "Semua status",
                options: [
                  { label: "Aktif", value: "active" },
                  { label: "Nonaktif", value: "inactive" }
                ]
              }
            ]}
          />
        </div>
        <div className="border-t">
          <DataTable
            columns={columns}
            data={rows}
            sortable
            rowClassName={() => "border-b last:border-0"}
            emptyState={
              <EmptyState
                icon={<PackageSearch />}
                title={sp.q ? "Produk tidak ditemukan" : "Belum ada produk"}
                description={
                  sp.q
                    ? `Tidak ada produk yang cocok dengan "${sp.q}". Coba kata kunci lain.`
                    : "Tambahkan produk pertama untuk mulai mencatat stok dan penjualan."
                }
                action={
                  canWrite ? (
                    <Link href={"/master/products/new" as never}>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Tambah Produk
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
