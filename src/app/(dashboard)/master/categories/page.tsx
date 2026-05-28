import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Pencil } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listCategories } from "@/modules/master-category/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Pagination } from "@/components/data-table/pagination"

interface Row {
  id: string
  name: string
  parentName: string | null
  isActive: boolean
  productCount: number
}

export default async function CategoriesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("category.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const { items, total, pageSize } = await listCategories({ q: sp.q, page })

  const rows: Row[] = items.map((c) => ({
    id: c.id,
    name: c.name,
    parentName: c.parent?.name ?? null,
    isActive: c.isActive,
    productCount: c._count.products
  }))

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "name", header: "Nama" },
    {
      accessorKey: "parentName",
      header: "Parent",
      cell: ({ row }) => row.original.parentName ?? "-"
    },
    { accessorKey: "productCount", header: "Jumlah Produk" },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (row.original.isActive ? "Aktif" : "Nonaktif")
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <Link href={`/master/categories/${row.original.id}/edit` as never}>
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
  ]

  const canWrite = session.user.permissionKeys.includes("category.write")
  return (
    <div>
      <PageHeader
        title="Kategori"
        actions={
          canWrite ? (
            <Link href={"/master/categories/new" as never}>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Tambah
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
