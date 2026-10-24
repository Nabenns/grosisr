import { prisma } from "@/lib/db"

export interface StockSnapshot {
  /** Number of products whose stock is below the effective minimum. */
  lowStock: number
  /** Monotonic-ish counter used by clients to detect "something changed". */
  movements: number
  at: string
}

/**
 * Cheap snapshot used by the realtime stock stream.
 * `movements` acts as a version token: any posting (sale, purchase, opname,
 * transfer, adjustment) inserts a StockMovement row, so a change there means
 * stock numbers moved.
 */
export async function getStockSnapshot(): Promise<StockSnapshot> {
  const [low, movements] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "StockBalance" sb
      JOIN "Product" p ON p."id" = sb."productId"
      WHERE p."deletedAt" IS NULL
        AND sb."qtyInBase" < COALESCE(sb."minStock", p."minStock")
    `,
    prisma.stockMovement.count()
  ])

  return {
    lowStock: Number(low[0]?.count ?? 0),
    movements,
    at: new Date().toISOString()
  }
}
