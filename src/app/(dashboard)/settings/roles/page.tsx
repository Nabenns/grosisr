import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Pencil } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listRoles } from "@/modules/settings-role/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"

interface Row {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  userCount: number
  permissionCount: number
}

export default async function RolesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("role.write")) redirect("/forbidden")

  const items = await listRoles()
  const rows: Row[] = items.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    userCount: r._count.users,
    permissionCount: r._count.permissions
  }))

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "name", header: "Nama" },
    {
      accessorKey: "description",
      header: "Deskripsi",
      cell: ({ row }) => row.original.description ?? "-"
    },
    { accessorKey: "userCount", header: "User" },
    { accessorKey: "permissionCount", header: "Permissions" },
    {
      accessorKey: "isSystem",
      header: "Sistem",
      cell: ({ row }) => (row.original.isSystem ? "Ya" : "")
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <Link href={`/settings/roles/${row.original.id}/edit` as never}>
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
  ]

  return (
    <div>
      <PageHeader
        title="Role"
        actions={
          <Link href={"/settings/roles/new" as never}>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Tambah
            </Button>
          </Link>
        }
      />
      <DataTable columns={columns} data={rows} />
    </div>
  )
}
