import { describe, it, expect, beforeEach } from "vitest"
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended"
import type { Prisma } from "@prisma/client"
import { postAdjustment, cancelAdjustment } from "@/modules/inventory-adjustment/service"
import { AppError } from "@/lib/errors"

type Tx = Prisma.TransactionClient
let tx: DeepMockProxy<Tx>

beforeEach(() => {
  tx = mockDeep<Tx>()
  mockReset(tx)
})

describe("postAdjustment", () => {
  it("throws if adjustment not found", async () => {
    tx.stockAdjustment.findUnique.mockResolvedValue(null)
    await expect(postAdjustment(tx, "x", "u1")).rejects.toBeInstanceOf(AppError)
  })

  it("rejects if already POSTED", async () => {
    tx.stockAdjustment.findUnique.mockResolvedValue({
      id: "a1",
      status: "POSTED",
      reason: "RUSAK",
      warehouseId: "w1",
      note: null,
      items: []
    } as never)
    await expect(postAdjustment(tx, "a1", "u1")).rejects.toBeInstanceOf(AppError)
  })

  it("rejects if CANCELLED", async () => {
    tx.stockAdjustment.findUnique.mockResolvedValue({
      id: "a1",
      status: "CANCELLED",
      reason: "RUSAK",
      warehouseId: "w1",
      note: null,
      items: []
    } as never)
    await expect(postAdjustment(tx, "a1", "u1")).rejects.toBeInstanceOf(AppError)
  })
})

describe("cancelAdjustment", () => {
  it("rejects non-DRAFT", async () => {
    tx.stockAdjustment.findUnique.mockResolvedValue({
      id: "a1",
      status: "POSTED"
    } as never)
    await expect(cancelAdjustment(tx, "a1")).rejects.toBeInstanceOf(AppError)
  })

  it("succeeds for DRAFT", async () => {
    tx.stockAdjustment.findUnique.mockResolvedValue({
      id: "a1",
      status: "DRAFT"
    } as never)
    tx.stockAdjustment.update.mockResolvedValue({
      id: "a1",
      status: "CANCELLED"
    } as never)
    const result = await cancelAdjustment(tx, "a1")
    expect(result.status).toBe("CANCELLED")
  })
})
