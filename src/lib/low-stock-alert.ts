import { prisma } from "@/lib/db"
import { getBooleanSetting } from "@/lib/setting"
import { escapeHtml, sendTelegramMessage } from "@/lib/notify/telegram"

export interface LowStockHit {
  productId: string
  sku: string
  name: string
  unit: string
  warehouse: string
  qty: number
  minStock: number
}

/** Product+warehouse pairs already alerted, with the time they were sent. */
const alertedAt = new Map<string, number>()
const COOLDOWN_MS = 6 * 60 * 60 * 1000

/**
 * Returns the balances of `productIds` in `warehouseId` that sit below their
 * minimum stock (per-warehouse override, else the product default).
 */
export async function findLowStock(
  warehouseId: string,
  productIds: string[]
): Promise<LowStockHit[]> {
  if (productIds.length === 0) return []

  const rows = await prisma.stockBalance.findMany({
    where: { warehouseId, productId: { in: productIds } },
    include: {
      product: { select: { sku: true, name: true, minStock: true, baseUnit: { select: { name: true } } } },
      warehouse: { select: { name: true } }
    }
  })

  const hits: LowStockHit[] = []
  for (const row of rows) {
    const minStock = row.minStock ?? row.product.minStock
    const qty = Number(row.qtyInBase)
    if (minStock > 0 && qty < minStock) {
      hits.push({
        productId: row.productId,
        sku: row.product.sku,
        name: row.product.name,
        unit: row.product.baseUnit.name,
        warehouse: row.warehouse.name,
        qty,
        minStock
      })
    }
  }
  return hits.sort((a, b) => a.qty - b.qty)
}

export function formatLowStockMessage(hits: LowStockHit[]): string {
  const lines = hits.map(
    (h) =>
      `• <b>${escapeHtml(h.sku)}</b> ${escapeHtml(h.name)} — sisa <b>${h.qty}</b> ${escapeHtml(
        h.unit
      )} (min ${h.minStock})`
  )
  return [
    "⚠️ <b>Stok Menipis</b>",
    `<i>${escapeHtml(hits[0]?.warehouse ?? "")}</i>`,
    "",
    ...lines,
    "",
    "Segera lakukan pembelian atau transfer stok."
  ].join("\n")
}

/**
 * Fire-and-forget low-stock notifier. Call it AFTER the stock transaction has
 * committed: it never throws and never blocks the caller's response.
 *
 * Each product/warehouse pair is alerted at most once per cooldown window so a
 * busy POS session doesn't spam the chat.
 */
export async function notifyLowStock(warehouseId: string, productIds: string[]): Promise<void> {
  try {
    const enabled = await getBooleanSetting(prisma, "low_stock_alert_enabled", true)
    if (!enabled) return

    const hits = await findLowStock(warehouseId, productIds)
    if (hits.length === 0) return

    const now = Date.now()
    const fresh = hits.filter((h) => {
      const key = `${h.warehouse}:${h.productId}`
      const last = alertedAt.get(key)
      return !last || now - last > COOLDOWN_MS
    })
    if (fresh.length === 0) return

    const result = await sendTelegramMessage(formatLowStockMessage(fresh))
    if (!result.ok) {
      console.warn("[low-stock] telegram alert gagal:", result.error)
      return
    }
    for (const h of fresh) alertedAt.set(`${h.warehouse}:${h.productId}`, now)
  } catch (err) {
    console.warn("[low-stock] alert error:", err)
  }
}

/** Test hook: clears the cooldown map (used by unit tests). */
export function resetLowStockCooldown() {
  alertedAt.clear()
}
