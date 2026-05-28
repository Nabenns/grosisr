import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Pencil } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listCustomers } from "@/modules/master-customer/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Pagination } from "@/components/data-table/pagination"
import { formatIDR } from "@/lib/money"

interface Row {
  id: string
  code: string
  name: string
  phone: string | null
  customerType: "RESELLER" | "RETAIL"
  creditLimit: number
  isActive: boolean
}

export default async function CustomersPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("customer.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const { items, total, pageSize } = await listCustomers({ q: sp.q, page })

  const rows: Row[] = items.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    phone: c.phone,
    customerType: c.customerType,
    creditLimit: Number(c.creditLimit),
    isActive: c.isActive
  }))

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "code", header: "Kode" },
    { accessorKey: "name", header: "Nama" },
    {
      accessorKey: "customerType",
      header: "Tipe",
      cell: ({ row }) => (row.original.customerType === "RESELLER" ? "Reseller" : "Retail")
    },
    {
      accessorKey: "creditLimit",
      header: "Limit Kredit",
      cell: ({ row }) => formatIDR(row.original.creditLimit)
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
        <Link href={`/master/customers/${row.original.id}/edit` as never}>
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
  ]

  const canWrite = session.user.permissionKeys.includes("customer.write")
  return (
    <div>
      <PageHeader
        title="Customer"
        actions={
          canWrite ? (
            <Link href={"/master/customers/new" as never}>
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
