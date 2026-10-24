import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listAuditLogsForExport } from "@/modules/settings-audit/queries"

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const text = typeof value === "string" ? value : JSON.stringify(value)
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!session.user.permissionKeys.includes("audit.read")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")

  const rows = await listAuditLogsForExport({
    entity: url.searchParams.get("entity") ?? undefined,
    action: url.searchParams.get("action") ?? undefined,
    actorUserId: url.searchParams.get("actor") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    fromDate: from ? new Date(`${from}T00:00:00`) : undefined,
    toDate: to ? new Date(`${to}T23:59:59.999`) : undefined
  })

  const header = ["waktu", "aktor", "username", "entity", "entity_id", "aksi", "diff"]
  const lines = [header.join(",")]
  for (const row of rows) {
    lines.push(
      [
        csvCell(row.occurredAt.toISOString()),
        csvCell(row.actor.name || row.actor.username),
        csvCell(row.actor.username),
        csvCell(row.entity),
        csvCell(row.entityId),
        csvCell(row.action),
        csvCell(row.diffJson)
      ].join(",")
    )
  }

  // BOM keeps Excel happy with UTF-8 names.
  const body = `\ufeff${lines.join("\r\n")}`
  const stamp = new Date().toISOString().slice(0, 10)

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${stamp}.csv"`,
      "Cache-Control": "no-store"
    }
  })
}
