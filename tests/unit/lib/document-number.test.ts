import { describe, it, expect, beforeEach } from "vitest"
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended"
import type { PrismaClient } from "@prisma/client"
import { nextDocumentCode, DOC_TYPES } from "@/lib/document-number"

let prisma: DeepMockProxy<PrismaClient>

beforeEach(() => {
  prisma = mockDeep<PrismaClient>()
  mockReset(prisma)
})

describe("nextDocumentCode", () => {
  it("formats with current year-month and incremented sequence", async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([{ value: 1 }] as never)
    const result = await nextDocumentCode(
      prisma,
      DOC_TYPES.SALE.type,
      DOC_TYPES.SALE.prefix,
      new Date("2026-05-28T05:00:00Z")
    )
    expect(result).toBe("SO-202605-0001")
  })

  it("uses returned sequence value", async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([{ value: 9999 }] as never)
    const result = await nextDocumentCode(
      prisma,
      DOC_TYPES.PO.type,
      DOC_TYPES.PO.prefix,
      new Date("2026-05-28T05:00:00Z")
    )
    expect(result).toBe("PO-202605-9999")
  })

  it("calls $queryRawUnsafe with correct key format", async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([{ value: 1 }] as never)
    await nextDocumentCode(prisma, "SALE", "SO", new Date("2026-05-28T05:00:00Z"))
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(expect.any(String), "SALE_202605")
  })
})
