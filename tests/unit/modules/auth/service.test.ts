import { describe, it, expect } from "vitest"
import { hasPermission } from "@/modules/auth/service"

describe("hasPermission", () => {
  it("returns true when permission exists", () => {
    expect(hasPermission(["product.read", "product.write"], "product.read")).toBe(true)
  })
  it("returns false when permission missing", () => {
    expect(hasPermission(["product.read"], "product.delete")).toBe(false)
  })
})
