import { Prisma, AuditAction } from "@prisma/client"
import { prisma } from "./db"

export interface AuditInput {
  actorUserId: string
  entity: string
  entityId: string
  action: AuditAction
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  tx?: Prisma.TransactionClient
}

export function computeDiff(
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null
): Record<string, [unknown, unknown]> {
  if (!before && !after) return {}
  const all = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  const diff: Record<string, [unknown, unknown]> = {}
  for (const k of all) {
    const a = before?.[k]
    const b = after?.[k]
    const aJson = JSON.stringify(a)
    const bJson = JSON.stringify(b)
    if (aJson !== bJson) diff[k] = [a, b]
  }
  return diff
}

export async function audit(input: AuditInput): Promise<void> {
  const client = input.tx ?? prisma
  const diff = computeDiff(input.before, input.after)
  const diffJson =
    Object.keys(diff).length > 0
      ? (diff as unknown as Prisma.InputJsonValue)
      : input.before
        ? (input.before as unknown as Prisma.InputJsonValue)
        : input.after
          ? (input.after as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull

  await client.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      diffJson
    }
  })
}

export { AuditAction }
