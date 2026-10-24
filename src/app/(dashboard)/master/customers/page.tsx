import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Users, UserX, Pencil } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listCustomers } from "@/modules/master-customer/queries"
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
  searchParams: Promise<{ q?: string; page?: string; sortBy?: string; sortDir?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("customer.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const sortBy = sp.sortBy
  const sortDir = sp.sortDir === "desc" ? "desc" : "asc"
  const { items, total, pageSize } = await listCustomers({ q: sp.q, page, sortBy, sortDir })

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
    {
      accessorKey: "code",
      header: "Kode",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span>
      )
    },
    {
      accessorKey: "name",
      header: "Nama",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>
    },
    {
      accessorKey: "phone",
      header: "Telepon",
      cell: ({ row }) => row.original.phone ?? <span className="text-muted-foreground">-</span>
    },
    {
      accessorKey: "customerType",
      header: "Tipe",
      cell: ({ row }) => (
        <Badge variant={row.original.customerType === "RESELLER" ? "default" : "secondary"}>
          {row.original.customerType === "RESELLER" ? "Reseller" : "Retail"}
        </Badge>
      )
    },
    {
      accessorKey: "creditLimit",
      header: "Limit Kredit",
      cell: ({ row }) => (
        <span className="tabular-nums">{formatIDR(row.original.creditLimit)}</span>
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
        <Link href={`/master/customers/${row.original.id}/edit` as never}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
        title="Pelanggan"
        description={`${total} pelanggan terdaftar${sp.q ? ` untuk pencarian "${sp.q}"` : ""}`}
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
                icon={sp.q ? <UserX /> : <Users />}
                title={sp.q ? "Pelanggan tidak ditemukan" : "Belum ada pelanggan"}
                description={
                  sp.q
                    ? `Tidak ada pelanggan yang cocok dengan "${sp.q}". Coba kata kunci lain.`
                    : "Tambahkan pelanggan untuk mulai mencatat penjualan grosir dan eceran."
                }
                action={
                  canWrite ? (
                    <Link href={"/master/customers/new" as never}>
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
