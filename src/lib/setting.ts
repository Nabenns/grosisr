import type { Prisma, PrismaClient } from "@prisma/client"

type Db = PrismaClient | Prisma.TransactionClient

export async function getSetting(db: Db, key: string): Promise<string | null> {
  const row = await db.setting.findUnique({ where: { key } })
  return row?.value ?? null
}

export async function getBooleanSetting(
  db: Db,
  key: string,
  defaultValue = false
): Promise<boolean> {
  const v = await getSetting(db, key)
  if (v === null) return defaultValue
  return v === "true"
}
