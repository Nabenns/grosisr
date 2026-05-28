import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Pencil } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listSuppliers } from "@/modules/master-supplier/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Pagination } from "@/components/data-table/pagination"

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
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("supplier.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const { items, total, pageSize } = await listSuppliers({ q: sp.q, page })

  const rows: Row[] = items.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    phone: s.phone,
    termOfPaymentDays: s.termOfPaymentDays,
    isActive: s.isActive
  }))

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "code", header: "Kode" },
    { accessorKey: "name", header: "Nama" },
    { accessorKey: "phone", header: "Telepon", cell: ({ row }) => row.original.phone ?? "-" },
    { accessorKey: "termOfPaymentDays", header: "Termin (hari)" },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (row.original.isActive ? "Aktif" : "Nonaktif")
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <Link href={`/master/suppliers/${row.original.id}/edit` as never}>
          <Button variant="ghost" size="sm">
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
      <DataTable columns={columns} data={rows} />
      <Pagination total={total} page={page} pageSize={pageSize} />
    </div>
  )
}
