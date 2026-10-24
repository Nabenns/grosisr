import { redirect } from "next/navigation"
import Link from "next/link"
import { Download } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import {
  getAuditActors,
  getDistinctActions,
  getDistinctEntities,
  listAuditLogs
} from "@/modules/settings-audit/queries"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { Pagination } from "@/components/data-table/pagination"
import { Button, buttonVariants } from "@/components/ui/button"
import { formatDateTime } from "@/lib/date"
import { cn } from "@/lib/utils"
import { AuditDiffDialog } from "./audit-diff-dialog"

interface Row {
  id: string
  occurredAt: Date
  actor: string
  entity: string
  entityId: string
  action: string
  diff: unknown
}

const ACTION_STYLE: Record<string, string> = {
  CREATE: "text-emerald-600",
  UPDATE: "text-amber-600",
  DELETE: "text-destructive",
  POST: "text-sky-600",
  VOID: "text-destructive"
}

export default async function AuditLogPage({
  searchParams
}: {
  searchParams: Promise<{
    entity?: string
    action?: string
    actor?: string
    q?: string
    from?: string
    to?: string
    page?: string
  }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("audit.read")) redirect("/forbidden")

  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? "1") || 1)

  const [entities, actions, actors] = await Promise.all([
    getDistinctEntities(),
    getDistinctActions(),
    getAuditActors()
  ])

  const { items, total, pageSize } = await listAuditLogs({
    entity: sp.entity,
    action: sp.action,
    actorUserId: sp.actor,
    q: sp.q,
    fromDate: sp.from ? new Date(`${sp.from}T00:00:00`) : undefined,
    toDate: sp.to ? new Date(`${sp.to}T23:59:59.999`) : undefined,
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
      header: "Waktu",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs tabular-nums">
          {formatDateTime(row.original.occurredAt)}
        </span>
      )
    },
    { accessorKey: "actor", header: "Aktor" },
    {
      accessorKey: "entity",
      header: "Entity",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.entity}</span>
    },
    {
      accessorKey: "entityId",
      header: "Entity ID",
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-muted-foreground">{row.original.entityId}</span>
      )
    },
    {
      accessorKey: "action",
      header: "Aksi",
      cell: ({ row }) => (
        <span className={cn("text-xs font-medium", ACTION_STYLE[row.original.action])}>
          {row.original.action}
        </span>
      )
    },
    {
      id: "diff",
      header: "Detail",
      cell: ({ row }) => (
        <AuditDiffDialog diff={row.original.diff} label={`${row.original.entity} ${row.original.entityId}`} />
      )
    }
  ]

  const exportQuery = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (value && key !== "page") exportQuery.set(key, String(value))
  }
  const exportHref = `/settings/audit-log/export${exportQuery.size ? `?${exportQuery.toString()}` : ""}`

  return (
    <div>
      <PageHeader
        title="Activity Log"
        description="Riwayat aksi user (mutasi master data, transaksi, dan settings)."
        actions={
          <Link href={exportHref as never} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
            <Download className="h-4 w-4" />
            Ekspor CSV
          </Link>
        }
      />

      <DataTableToolbar
        searchPlaceholder="Cari entity ID..."
        filters={[
          {
            key: "entity",
            label: "Entity",
            options: entities.map((e) => ({ label: e, value: e }))
          },
          {
            key: "action",
            label: "Aksi",
            options: actions.map((a) => ({ label: a, value: a }))
          },
          {
            key: "actor",
            label: "Aktor",
            options: actors.map((a) => ({ label: a.name || a.username, value: a.id }))
          }
        ]}
        dates={{ fromKey: "from", toKey: "to", label: "Tanggal" }}
      />

      <DataTable columns={columns} data={rows} />
      <Pagination total={total} page={page} pageSize={pageSize} />
    </div>
  )
}
