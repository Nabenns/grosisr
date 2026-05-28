import { describe, it, expect } from "vitest"
import { computeDiff } from "@/lib/audit"

describe("computeDiff", () => {
  it("captures changed fields only", () => {
    const before = { name: "Old", price: 100, isActive: true }
    const after = { name: "New", price: 100, isActive: true }
    expect(computeDiff(before, after)).toEqual({ name: ["Old", "New"] })
  })

  it("captures added field", () => {
    expect(computeDiff({ a: 1 }, { a: 1, b: 2 })).toEqual({ b: [undefined, 2] })
  })

  it("captures removed field", () => {
    expect(computeDiff({ a: 1, b: 2 }, { a: 1 })).toEqual({ b: [2, undefined] })
  })

  it("returns empty for identical", () => {
    expect(computeDiff({ x: "same" }, { x: "same" })).toEqual({})
  })

  it("returns empty for both null/undefined", () => {
    expect(computeDiff(null, null)).toEqual({})
    expect(computeDiff(undefined, undefined)).toEqual({})
  })
})
