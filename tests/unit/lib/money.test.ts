import { describe, it, expect } from "vitest"
import { formatIDR, toDecimal } from "@/lib/money"

describe("formatIDR", () => {
  it("formats integer", () => {
    expect(formatIDR(1234567)).toBe("Rp 1.234.567")
  })
  it("formats zero", () => {
    expect(formatIDR(0)).toBe("Rp 0")
  })
  it("formats negative", () => {
    expect(formatIDR(-1500)).toBe("Rp -1.500")
  })
  it("accepts string and decimal", () => {
    expect(formatIDR("100000")).toBe("Rp 100.000")
    expect(formatIDR(toDecimal("99.5"))).toBe("Rp 100")
  })
})
