import { describe, it, expect, beforeEach } from "vitest"
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended"
import type { Prisma } from "@prisma/client"
import { applyStockMovement } from "@/lib/stock-movement"
import { AppError } from "@/lib/errors"

type Tx = Prisma.TransactionClient
let tx: DeepMockProxy<Tx>

beforeEach(() => {
  tx = mockDeep<Tx>()
  mockReset(tx)
})

describe("applyStockMovement", () => {
  const baseParams = {
    productId: "p1",
    warehouseId: "w1",
    refType: "Test",
    refId: "r1",
    actorId: "u1"
  }

  it("rejects qty <= 0", async () => {
    await expect(
      applyStockMovement(tx, {
        ...baseParams,
        qtyInBase: 0,
        direction: "IN",
        movementType: "PURCHASE"
      })
    ).rejects.toBeInstanceOf(AppError)
  })

  it("computes new balance from existing row + IN direction", async () => {
    tx.$queryRawUnsafe.mockResolvedValue([{ qty_in_base: "100" }] as never)
    tx.stockBalance.upsert.mockResolvedValue({} as never)
    tx.stockMovement.create.mockResolvedValue({} as never)
    const next = await applyStockMovement(tx, {
      ...baseParams,
      qtyInBase: 50,
      direction: "IN",
      movementType: "PURCHASE"
    })
    expect(next.toNumber()).toBe(150)
  })

  it("computes new balance OUT direction", async () => {
    tx.$queryRawUnsafe.mockResolvedValue([{ qty_in_base: "100" }] as never)
    tx.stockBalance.upsert.mockResolvedValue({} as never)
    tx.stockMovement.create.mockResolvedValue({} as never)
    const next = await applyStockMovement(tx, {
      ...baseParams,
      qtyInBase: 30,
      direction: "OUT",
      movementType: "SALE"
    })
    expect(next.toNumber()).toBe(70)
  })

  it("creates balance from zero when no row exists", async () => {
    tx.$queryRawUnsafe.mockResolvedValue([] as never)
    tx.stockBalance.upsert.mockResolvedValue({} as never)
    tx.stockMovement.create.mockResolvedValue({} as never)
    const next = await applyStockMovement(tx, {
      ...baseParams,
      qtyInBase: 25,
      direction: "IN",
      movementType: "PURCHASE"
    })
    expect(next.toNumber()).toBe(25)
  })

  it("throws on insufficient stock when OUT and no allowNegative", async () => {
    tx.$queryRawUnsafe.mockResolvedValue([{ qty_in_base: "10" }] as never)
    await expect(
      applyStockMovement(tx, {
        ...baseParams,
        qtyInBase: 50,
        direction: "OUT",
        movementType: "SALE"
      })
    ).rejects.toBeInstanceOf(AppError)
  })

  it("allows negative balance when allowNegative=true", async () => {
    tx.$queryRawUnsafe.mockResolvedValue([{ qty_in_base: "10" }] as never)
    tx.stockBalance.upsert.mockResolvedValue({} as never)
    tx.stockMovement.create.mockResolvedValue({} as never)
    const next = await applyStockMovement(tx, {
      ...baseParams,
      qtyInBase: 50,
      direction: "OUT",
      movementType: "SALE",
      allowNegative: true
    })
    expect(next.toNumber()).toBe(-40)
  })

  it("allows negative balance for ADJUSTMENT without flag", async () => {
    tx.$queryRawUnsafe.mockResolvedValue([{ qty_in_base: "5" }] as never)
    tx.stockBalance.upsert.mockResolvedValue({} as never)
    tx.stockMovement.create.mockResolvedValue({} as never)
    const next = await applyStockMovement(tx, {
      ...baseParams,
      qtyInBase: 10,
      direction: "OUT",
      movementType: "ADJUSTMENT"
    })
    expect(next.toNumber()).toBe(-5)
  })
})
