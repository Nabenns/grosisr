import type { Prisma, PrismaClient } from "@prisma/client"
import { generateCode } from "./id"
import { formatYearMonth } from "./date"

type Db = PrismaClient | Prisma.TransactionClient

/**
 * Atomically increment a counter and return the formatted document code.
 * Format: {PREFIX}-{YYYYMM}-{seq:04}, e.g. "INV-202605-0001"
 *
 * Counter key: {TYPE}_{YYYYMM} so each month restarts from 0001.
 */
export async function nextDocumentCode(
  db: Db,
  type: string,
  prefix: string,
  date: Date = new Date()
): Promise<string> {
  const ym = formatYearMonth(date)
  const key = `${type}_${ym}`
  const result = await db.$queryRawUnsafe<{ value: number }[]>(
    `INSERT INTO "Counter" (key, value) VALUES ($1, 1)
     ON CONFLICT (key) DO UPDATE SET value = "Counter".value + 1
     RETURNING value`,
    key
  )
  const seq = result[0]?.value ?? 1
  return generateCode(prefix, seq, ym)
}

export const DOC_TYPES = {
  PO: { type: "PURCHASE_ORDER", prefix: "PO" },
  PINV: { type: "PURCHASE_INVOICE", prefix: "INV" },
  SALE: { type: "SALE", prefix: "SO" },
  ADJ: { type: "STOCK_ADJUSTMENT", prefix: "ADJ" },
  XFR: { type: "STOCK_TRANSFER", prefix: "XFR" },
  PRET: { type: "PURCHASE_RETURN", prefix: "RTNB" },
  SRET: { type: "SALE_RETURN", prefix: "RTNJ" }
} as const
