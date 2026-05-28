import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Pencil } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listUsers } from "@/modules/users/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Pagination } from "@/components/data-table/pagination"

interface Row {
  id: string
  username: string
  name: string
  email: string | null
  roles: string
  isActive: boolean
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("user.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const { items, total, pageSize } = await listUsers({ q: sp.q, page })

  const rows: Row[] = items.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    roles: u.roles.map((r) => r.role.name).join(", "),
    isActive: u.isActive
  }))

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "username", header: "Username" },
    { accessorKey: "name", header: "Nama" },
    { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email ?? "-" },
    { accessorKey: "roles", header: "Role" },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (row.original.isActive ? "Aktif" : "Nonaktif")
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <Link href={`/settings/users/${row.original.id}/edit` as never}>
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
  ]

  const canWrite = session.user.permissionKeys.includes("user.write")
  return (
    <div>
      <PageHeader
        title="Pengguna"
        actions={
          canWrite ? (
            <Link href={"/settings/users/new" as never}>
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
