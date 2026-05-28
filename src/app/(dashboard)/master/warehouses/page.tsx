import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Pencil } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listWarehouses } from "@/modules/master-warehouse/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Pagination } from "@/components/data-table/pagination"

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
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("warehouse.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const { items, total, pageSize } = await listWarehouses({ q: sp.q, page })

  const rows: Row[] = items.map((w) => ({
    id: w.id,
    code: w.code,
    name: w.name,
    address: w.address,
    isDefault: w.isDefault,
    isActive: w.isActive
  }))

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "code", header: "Kode" },
    { accessorKey: "name", header: "Nama" },
    {
      accessorKey: "address",
      header: "Alamat",
      cell: ({ row }) => row.original.address ?? "-"
    },
    {
      accessorKey: "isDefault",
      header: "Default",
      cell: ({ row }) => (row.original.isDefault ? "Ya" : "")
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
        <Link href={`/master/warehouses/${row.original.id}/edit` as never}>
          <Button variant="ghost" size="sm">
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
      <DataTable columns={columns} data={rows} />
      <Pagination total={total} page={page} pageSize={pageSize} />
    </div>
  )
}
