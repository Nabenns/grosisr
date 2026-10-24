import { describe, it, expect, beforeEach, vi } from "vitest"

vi.mock("@/lib/db", () => ({
  prisma: {
    stockBalance: { findMany: vi.fn() },
    setting: { findUnique: vi.fn(), findMany: vi.fn() }
  }
}))

vi.mock("@/lib/notify/telegram", () => ({
  sendTelegramMessage: vi.fn(),
  escapeHtml: (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}))

import { prisma } from "@/lib/db"
import { sendTelegramMessage } from "@/lib/notify/telegram"
import {
  findLowStock,
  formatLowStockMessage,
  notifyLowStock,
  resetLowStockCooldown,
  type LowStockHit
} from "@/lib/low-stock-alert"

const balance = (over: Record<string, unknown> = {}) => ({
  productId: "p1",
  warehouseId: "w1",
  qtyInBase: 3,
  minStock: null,
  product: { sku: "MIE-001", name: "Indomie Goreng", minStock: 5, baseUnit: { name: "pcs" } },
  warehouse: { name: "Gudang Utama" },
  ...over
})

describe("findLowStock", () => {
  beforeEach(() => {
    vi.mocked(prisma.stockBalance.findMany).mockReset()
  })

  it("returns nothing when no product ids are given", async () => {
    expect(await findLowStock("w1", [])).toEqual([])
    expect(prisma.stockBalance.findMany).not.toHaveBeenCalled()
  })

  it("flags a balance below the product default minimum", async () => {
    vi.mocked(prisma.stockBalance.findMany).mockResolvedValue([balance()] as never)
    const hits = await findLowStock("w1", ["p1"])
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ sku: "MIE-001", qty: 3, minStock: 5, unit: "pcs" })
  })

  it("prefers the per-warehouse minimum override", async () => {
    vi.mocked(prisma.stockBalance.findMany).mockResolvedValue([balance({ minStock: 2 })] as never)
    expect(await findLowStock("w1", ["p1"])).toEqual([])
  })

  it("ignores products without a minimum stock", async () => {
    vi.mocked(prisma.stockBalance.findMany).mockResolvedValue([
      balance({ product: { sku: "X", name: "X", minStock: 0, baseUnit: { name: "pcs" } } })
    ] as never)
    expect(await findLowStock("w1", ["p1"])).toEqual([])
  })
})

describe("formatLowStockMessage", () => {
  const hit: LowStockHit = {
    productId: "p1",
    sku: "MIE-001",
    name: "Indomie <Goreng>",
    unit: "pcs",
    warehouse: "Gudang Utama",
    qty: 3,
    minStock: 5
  }

  it("renders warehouse, item and remaining qty, escaping HTML", () => {
    const msg = formatLowStockMessage([hit])
    expect(msg).toContain("Stok Menipis")
    expect(msg).toContain("Gudang Utama")
    expect(msg).toContain("MIE-001")
    expect(msg).toContain("Indomie &lt;Goreng&gt;")
    expect(msg).toContain("sisa <b>3</b>")
  })
})

describe("notifyLowStock", () => {
  beforeEach(() => {
    resetLowStockCooldown()
    vi.mocked(prisma.stockBalance.findMany).mockReset()
    vi.mocked(prisma.setting.findUnique).mockReset()
    vi.mocked(sendTelegramMessage).mockReset()
    vi.mocked(prisma.setting.findUnique).mockResolvedValue({ key: "low_stock_alert_enabled", value: "true" } as never)
  })

  it("does not call Telegram when alerts are disabled", async () => {
    vi.mocked(prisma.setting.findUnique).mockResolvedValue({ key: "low_stock_alert_enabled", value: "false" } as never)
    vi.mocked(prisma.stockBalance.findMany).mockResolvedValue([balance()] as never)
    await notifyLowStock("w1", ["p1"])
    expect(sendTelegramMessage).not.toHaveBeenCalled()
  })

  it("sends once and then respects the cooldown", async () => {
    vi.mocked(prisma.stockBalance.findMany).mockResolvedValue([balance()] as never)
    vi.mocked(sendTelegramMessage).mockResolvedValue({ ok: true })

    await notifyLowStock("w1", ["p1"])
    await notifyLowStock("w1", ["p1"])

    expect(sendTelegramMessage).toHaveBeenCalledTimes(1)
  })

  it("keeps the cooldown open when the send fails", async () => {
    vi.mocked(prisma.stockBalance.findMany).mockResolvedValue([balance()] as never)
    vi.mocked(sendTelegramMessage).mockResolvedValue({ ok: false, error: "boom" })

    await notifyLowStock("w1", ["p1"])
    await notifyLowStock("w1", ["p1"])

    expect(sendTelegramMessage).toHaveBeenCalledTimes(2)
  })

  it("never throws when the database fails", async () => {
    vi.mocked(prisma.stockBalance.findMany).mockRejectedValue(new Error("db down"))
    await expect(notifyLowStock("w1", ["p1"])).resolves.toBeUndefined()
  })
})
