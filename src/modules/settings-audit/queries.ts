import { prisma } from "@/lib/db"

export interface AuditListParams {
  entity?: string
  actorUserId?: string
  action?: string
  fromDate?: Date
  toDate?: Date
  q?: string
  page?: number
  pageSize?: number
}

function buildWhere(params: AuditListParams) {
  const { entity, actorUserId, action, fromDate, toDate, q } = params
  const where: Record<string, unknown> = {}
  if (entity) where.entity = entity
  if (actorUserId) where.actorUserId = actorUserId
  if (action) where.action = action
  if (q) where.entityId = { contains: q, mode: "insensitive" }
  if (fromDate || toDate) {
    where.occurredAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {})
    }
  }
  return where
}

export async function listAuditLogs(params: AuditListParams) {
  const { page = 1, pageSize = 50 } = params
  const where = buildWhere(params)
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, username: true, name: true } } },
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.auditLog.count({ where })
  ])
  return { items, total, page, pageSize }
}

/** Rows for CSV export — capped so a huge range cannot exhaust memory. */
export async function listAuditLogsForExport(params: AuditListParams) {
  return prisma.auditLog.findMany({
    where: buildWhere(params),
    include: { actor: { select: { username: true, name: true } } },
    orderBy: { occurredAt: "desc" },
    take: 5000
  })
}

export async function getDistinctEntities() {
  const result = await prisma.auditLog.findMany({
    distinct: ["entity"],
    select: { entity: true }
  })
  return result.map((r) => r.entity).sort()
}

export async function getDistinctActions() {
  const result = await prisma.auditLog.findMany({
    distinct: ["action"],
    select: { action: true }
  })
  return result.map((r) => r.action).sort()
}

export async function getAuditActors() {
  const rows = await prisma.auditLog.findMany({
    distinct: ["actorUserId"],
    select: { actor: { select: { id: true, username: true, name: true } } }
  })
  return rows
    .map((r) => r.actor)
    .sort((a, b) => (a.name || a.username).localeCompare(b.name || b.username))
}
