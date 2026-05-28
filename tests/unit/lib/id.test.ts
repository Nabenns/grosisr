import { describe, it, expect } from "vitest"
import { generateCode, generateMasterCode } from "@/lib/id"

describe("code generators", () => {
  it("formats document code", () => {
    expect(generateCode("INV", 1, "202605")).toBe("INV-202605-0001")
    expect(generateCode("INV", 9999, "202605")).toBe("INV-202605-9999")
  })
  it("formats master code", () => {
    expect(generateMasterCode("SUP", 1)).toBe("SUP-00001")
  })
})
