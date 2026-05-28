import { describe, it, expect, beforeEach } from "vitest"
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended"
import type { PrismaClient } from "@prisma/client"
import {
  createCategory,
  updateCategory,
  softDeleteCategory
} from "@/modules/master-category/service"
import { AppError } from "@/lib/errors"

let prisma: DeepMockProxy<PrismaClient>

beforeEach(() => {
  prisma = mockDeep<PrismaClient>()
  mockReset(prisma)
})

describe("createCategory", () => {
  it("creates root category", async () => {
    prisma.category.findFirst.mockResolvedValue(null)
    prisma.category.create.mockResolvedValue({
      id: "c1",
      name: "Rokok",
      parentId: null,
      isActive: true
    } as never)
    const result = await createCategory(prisma, { name: "Rokok" })
    expect(result.name).toBe("Rokok")
    expect(prisma.category.create).toHaveBeenCalled()
  })

  it("rejects duplicate at same level", async () => {
    prisma.category.findFirst.mockResolvedValue({ id: "x", name: "Rokok" } as never)
    await expect(createCategory(prisma, { name: "Rokok" })).rejects.toBeInstanceOf(AppError)
  })

  it("rejects depth > 3", async () => {
    prisma.category.findUnique
      .mockResolvedValueOnce({ parentId: "p2" } as never)
      .mockResolvedValueOnce({ parentId: "p1" } as never)
      .mockResolvedValueOnce({ parentId: null } as never)
    await expect(
      createCategory(prisma, { name: "x", parentId: "p3" })
    ).rejects.toBeInstanceOf(AppError)
  })
})

describe("updateCategory", () => {
  it("rejects self-parent", async () => {
    prisma.category.findUnique.mockResolvedValue({ id: "c1", deletedAt: null } as never)
    await expect(
      updateCategory(prisma, { id: "c1", name: "x", parentId: "c1" })
    ).rejects.toBeInstanceOf(AppError)
  })

  it("rejects when not found", async () => {
    prisma.category.findUnique.mockResolvedValue(null)
    await expect(updateCategory(prisma, { id: "c1", name: "x" })).rejects.toBeInstanceOf(AppError)
  })
})

describe("softDeleteCategory", () => {
  it("rejects when has active products", async () => {
    prisma.product.count.mockResolvedValue(5)
    await expect(softDeleteCategory(prisma, "c1")).rejects.toBeInstanceOf(AppError)
  })

  it("rejects when has active children", async () => {
    prisma.product.count.mockResolvedValue(0)
    prisma.category.count.mockResolvedValue(2)
    await expect(softDeleteCategory(prisma, "c1")).rejects.toBeInstanceOf(AppError)
  })

  it("succeeds when empty", async () => {
    prisma.product.count.mockResolvedValue(0)
    prisma.category.count.mockResolvedValue(0)
    prisma.category.update.mockResolvedValue({ id: "c1", deletedAt: new Date() } as never)
    const result = await softDeleteCategory(prisma, "c1")
    expect(result.deletedAt).toBeInstanceOf(Date)
  })
})
