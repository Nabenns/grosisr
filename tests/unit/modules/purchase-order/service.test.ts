import { describe, it, expect } from "vitest"
import { computePOTotal } from "@/modules/purchase-order/service"

describe("computePOTotal", () => {
  it("sums item subtotals net of per-unit discount", () => {
    expect(
      computePOTotal([
        { qty: 10, price: 1000, discount: 100 }, // (1000-100)*10 = 9000
        { qty: 5, price: 500, discount: 0 } // 2500
      ]).toNumber()
    ).toBe(11500)
  })

  it("handles zero items", () => {
    expect(computePOTotal([]).toNumber()).toBe(0)
  })

  it("handles fractional discount", () => {
    expect(
      computePOTotal([{ qty: 4, price: 100, discount: 25 }]).toNumber()
    ).toBe(300)
  })
})
