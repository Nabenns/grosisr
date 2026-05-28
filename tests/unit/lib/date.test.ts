import { describe, it, expect } from "vitest"
import { formatDate, formatYearMonth } from "@/lib/date"

describe("date format", () => {
  it("formats date in Indonesian", () => {
    expect(formatDate("2026-05-28T00:00:00Z")).toMatch(/28 Mei 2026|29 Mei 2026/)
  })
  it("formats year month", () => {
    expect(formatYearMonth("2026-05-28T05:00:00Z")).toBe("202605")
  })
})
