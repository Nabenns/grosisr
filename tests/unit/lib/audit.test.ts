import { describe, it, expect } from "vitest"
import { computeDiff } from "@/lib/audit"

describe("computeDiff", () => {
  it("captures changed fields only", () => {
    const before = { name: "Old", price: 100, isActive: true }
    const after = { name: "New", price: 100, isActive: true }
    expect(computeDiff(before, after)).toEqual({ name: ["Old", "New"] })
  })

  // Sisi yang tidak ada dinormalisasi ke null, bukan undefined: diff disimpan
  // sebagai JSONB, dan JSON.stringify mengubah undefined di dalam array jadi
  // null. Menyimpan undefined berarti nilai yang dibaca balik dari DB beda
  // dengan nilai yang diuji di sini.
  it("captures added field", () => {
    expect(computeDiff({ a: 1 }, { a: 1, b: 2 })).toEqual({ b: [null, 2] })
  })

  it("captures removed field", () => {
    expect(computeDiff({ a: 1, b: 2 }, { a: 1 })).toEqual({ b: [2, null] })
  })

  // Catatan: field yang dihapus dan field yang di-set null sama-sama
  // tercatat sebagai [nilaiLama, null] — JSONB tidak membedakan keduanya.
  it("records explicit null the same as a removed field", () => {
    expect(computeDiff({ a: 1, b: 2 }, { a: 1, b: null })).toEqual({ b: [2, null] })
  })

  it("returns empty for identical", () => {
    expect(computeDiff({ x: "same" }, { x: "same" })).toEqual({})
  })

  it("returns empty for both null/undefined", () => {
    expect(computeDiff(null, null)).toEqual({})
    expect(computeDiff(undefined, undefined)).toEqual({})
  })
})
