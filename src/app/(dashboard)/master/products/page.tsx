import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Eye } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listProducts } from "@/modules/master-product/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Pagination } from "@/components/data-table/pagination"
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
  searchParams: Promise<{ q?: string; categoryId?: string; status?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("product.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const status = (sp.status as "active" | "inactive" | "all") ?? "active"
  const { items, total, pageSize } = await listProducts({
    q: sp.q,
    categoryId: sp.categoryId,
    status,
    page
  })

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
    { accessorKey: "sku", header: "SKU" },
    { accessorKey: "name", header: "Nama" },
    { accessorKey: "category", header: "Kategori" },
    {
      accessorKey: "brand",
      header: "Brand",
      cell: ({ row }) => row.original.brand ?? "-"
    },
    {
      accessorKey: "defaultSalePrice",
      header: "Harga Jual",
      cell: ({ row }) => formatIDR(row.original.defaultSalePrice)
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (row.original.isActive ? "Aktif" : "Nonaktif")
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <Link href={`/master/products/${row.original.id}` as never}>
          <Button variant="ghost" size="sm">
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
      <DataTable columns={columns} data={rows} />
      <Pagination total={total} page={page} pageSize={pageSize} />
    </div>
  )
}
