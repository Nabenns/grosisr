import { describe, it, expect } from "vitest"
import { postSaleSchema } from "@/modules/sale-pos/schema"

describe("postSaleSchema validation", () => {
  it("accepts valid CASH sale", () => {
    const r = postSaleSchema.safeParse({
      warehouseId: "ckabcde0000000000000000000",
      saleType: "CASH",
      invoiceDate: new Date(),
      discountAmount: 0,
      taxAmount: 0,
      paymentMethod: "TUNAI",
      paidAmount: 5000,
      idempotencyKey: "k1",
      items: [
        {
          productUnitId: "ckabcde0000000000000000001",
          qty: 1,
          price: 5000,
          discount: 0
        }
      ]
    })
    expect(r.success).toBe(true)
  })

  it("rejects empty items", () => {
    const r = postSaleSchema.safeParse({
      warehouseId: "ckabcde0000000000000000000",
      saleType: "CASH",
      invoiceDate: new Date(),
      discountAmount: 0,
      taxAmount: 0,
      paidAmount: 0,
      idempotencyKey: "k1",
      items: []
    })
    expect(r.success).toBe(false)
  })

  it("rejects missing idempotencyKey", () => {
    const r = postSaleSchema.safeParse({
      warehouseId: "ckabcde0000000000000000000",
      saleType: "CASH",
      invoiceDate: new Date(),
      discountAmount: 0,
      taxAmount: 0,
      paidAmount: 5000,
      items: [
        {
          productUnitId: "ckabcde0000000000000000001",
          qty: 1,
          price: 5000,
          discount: 0
        }
      ]
    })
    expect(r.success).toBe(false)
  })

  it("rejects negative paid", () => {
    const r = postSaleSchema.safeParse({
      warehouseId: "ckabcde0000000000000000000",
      saleType: "CASH",
      invoiceDate: new Date(),
      discountAmount: 0,
      taxAmount: 0,
      paidAmount: -1,
      idempotencyKey: "k1",
      items: [
        {
          productUnitId: "ckabcde0000000000000000001",
          qty: 1,
          price: 5000,
          discount: 0
        }
      ]
    })
    expect(r.success).toBe(false)
  })
})
