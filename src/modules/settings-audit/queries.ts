import { prisma } from "@/lib/db"

export interface AuditListParams {
  entity?: string
  actorUserId?: string
  action?: string
  fromDate?: Date
  toDate?: Date
  page?: number
  pageSize?: number
}

export async function listAuditLogs(params: AuditListParams) {
  const { entity, actorUserId, action, fromDate, toDate, page = 1, pageSize = 50 } = params
  const where: Record<string, unknown> = {}
  if (entity) where.entity = entity
  if (actorUserId) where.actorUserId = actorUserId
  if (action) where.action = action
  if (fromDate || toDate) {
    where.occurredAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {})
    }
  }
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

export async function getDistinctEntities() {
  const result = await prisma.auditLog.findMany({
    distinct: ["entity"],
    select: { entity: true }
  })
  return result.map((r) => r.entity).sort()
}
