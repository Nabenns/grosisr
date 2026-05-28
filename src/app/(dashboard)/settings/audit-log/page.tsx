import { redirect } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listAuditLogs } from "@/modules/settings-audit/queries"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { Pagination } from "@/components/data-table/pagination"
import { formatDateTime } from "@/lib/date"

interface Row {
  id: string
  occurredAt: Date
  actor: string
  entity: string
  entityId: string
  action: string
  diff: unknown
}

export default async function AuditLogPage({
  searchParams
}: {
  searchParams: Promise<{ entity?: string; action?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("audit.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Number(sp.page ?? "1")
  const { items, total, pageSize } = await listAuditLogs({
    entity: sp.entity,
    action: sp.action,
    page
  })

  const rows: Row[] = items.map((a) => ({
    id: a.id,
    occurredAt: a.occurredAt,
    actor: a.actor.name || a.actor.username,
    entity: a.entity,
    entityId: a.entityId,
    action: a.action,
    diff: a.diffJson
  }))

  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: "occurredAt",
      header: "Tanggal",
      cell: ({ row }) => formatDateTime(row.original.occurredAt)
    },
    { accessorKey: "actor", header: "Aktor" },
    { accessorKey: "entity", header: "Entity" },
    { accessorKey: "entityId", header: "Entity ID" },
    { accessorKey: "action", header: "Action" },
    {
      id: "diff",
      header: "Detail",
      cell: ({ row }) => {
        const diff = row.original.diff
        if (!diff) return "-"
        const text = JSON.stringify(diff)
        return (
          <span className="text-xs font-mono text-muted-foreground" title={text}>
            {text.length > 80 ? text.slice(0, 80) + "..." : text}
          </span>
        )
      }
    }
  ]

  return (
    <div>
      <PageHeader
        title="Activity Log"
        description="Riwayat aksi user (mutation pada master data, transaksi, dan settings)."
      />
      <DataTable columns={columns} data={rows} />
      <Pagination total={total} page={page} pageSize={pageSize} />
    </div>
  )
}
