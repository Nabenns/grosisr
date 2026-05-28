import type { Prisma, PrismaClient } from "@prisma/client"
import Decimal from "decimal.js"
import { AppError } from "@/lib/errors"
import type { CreateProductInput, UpdateProductInput } from "./schema"

type Db = PrismaClient | Prisma.TransactionClient

interface UnitInput {
  conversionToBase: number
  salePrice: number
}

export function validateHetCompliance(
  input: { hasHet: boolean; hetPrice?: number | null; units: UnitInput[] },
  allowOverride: boolean
) {
  if (!input.hasHet || !input.hetPrice) return
  for (const u of input.units) {
    const perBase = new Decimal(u.salePrice).div(u.conversionToBase)
    const het = new Decimal(input.hetPrice)
    if (perBase.gt(het) && !allowOverride) {
      throw new AppError(
        "HET_VIOLATION",
        `Harga jual per base unit (Rp ${perBase.toFixed(2)}) melebihi HET (Rp ${het.toFixed(2)}). Butuh override permission.`,
        { units: "HET violation" }
      )
    }
  }
}

async function ensureBarcodeUnique(db: Db, barcodes: (string | null | undefined)[], excludeProductId?: string) {
  const list = barcodes.filter((b): b is string => !!b && b.length > 0)
  if (list.length === 0) return
  const dup = await db.productUnit.findFirst({
    where: {
      barcode: { in: list },
      ...(excludeProductId ? { product: { id: { not: excludeProductId } } } : {})
    },
    include: { product: { select: { name: true, sku: true } } }
  })
  if (dup) {
    throw new AppError("INVALID_INPUT", `Barcode ${dup.barcode} sudah dipakai produk ${dup.product.name}`)
  }
}

export async function createProduct(db: Db, input: CreateProductInput, opts: { allowHetOverride: boolean }) {
  validateHetCompliance(input, opts.allowHetOverride)

  const dupSku = await db.product.findFirst({
    where: { sku: input.sku, deletedAt: null }
  })
  if (dupSku) throw new AppError("INVALID_INPUT", "SKU sudah ada", { sku: "Duplikat" })

  await ensureBarcodeUnique(
    db,
    input.units.map((u) => u.barcode)
  )

  return db.product.create({
    data: {
      sku: input.sku,
      name: input.name,
      categoryId: input.categoryId,
      brandId: input.brandId ?? null,
      baseUnitId: input.baseUnitId,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      hasCukai: input.hasCukai,
      hasHet: input.hasHet,
      hetPrice: input.hetPrice ? new Decimal(input.hetPrice) : null,
      minStock: input.minStock,
      units: {
        create: input.units.map((u) => ({
          unitId: u.unitId,
          conversionToBase: new Decimal(u.conversionToBase),
          barcode: u.barcode || null,
          purchasePrice: new Decimal(u.purchasePrice),
          salePrice: new Decimal(u.salePrice),
          isDefaultPurchase: u.isDefaultPurchase,
          isDefaultSale: u.isDefaultSale
        }))
      }
    },
    include: { units: true }
  })
}

export async function updateProduct(db: Db, input: UpdateProductInput, opts: { allowHetOverride: boolean }) {
  const current = await db.product.findUnique({
    where: { id: input.id },
    include: { units: true }
  })
  if (!current || current.deletedAt) throw new AppError("NOT_FOUND", "Produk tidak ditemukan")
  if (current.version !== input.version) {
    throw new AppError("CONFLICT_VERSION", "Data sudah diubah orang lain, refresh dan coba lagi")
  }

  validateHetCompliance(input, opts.allowHetOverride)
  await ensureBarcodeUnique(
    db,
    input.units.map((u) => u.barcode),
    input.id
  )

  const incomingUnitIds = new Set(input.units.filter((u) => u.id).map((u) => u.id as string))
  const toDelete = current.units.filter((cu) => !incomingUnitIds.has(cu.id)).map((u) => u.id)

  if (toDelete.length > 0) {
    await db.productUnit.deleteMany({ where: { id: { in: toDelete } } })
  }

  const product = await db.product.update({
    where: { id: input.id },
    data: {
      sku: input.sku,
      name: input.name,
      categoryId: input.categoryId,
      brandId: input.brandId ?? null,
      baseUnitId: input.baseUnitId,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      hasCukai: input.hasCukai,
      hasHet: input.hasHet,
      hetPrice: input.hetPrice ? new Decimal(input.hetPrice) : null,
      minStock: input.minStock,
      version: { increment: 1 }
    }
  })

  for (const u of input.units) {
    if (u.id) {
      await db.productUnit.update({
        where: { id: u.id },
        data: {
          unitId: u.unitId,
          conversionToBase: new Decimal(u.conversionToBase),
          barcode: u.barcode || null,
          purchasePrice: new Decimal(u.purchasePrice),
          salePrice: new Decimal(u.salePrice),
          isDefaultPurchase: u.isDefaultPurchase,
          isDefaultSale: u.isDefaultSale
        }
      })
    } else {
      await db.productUnit.create({
        data: {
          productId: input.id,
          unitId: u.unitId,
          conversionToBase: new Decimal(u.conversionToBase),
          barcode: u.barcode || null,
          purchasePrice: new Decimal(u.purchasePrice),
          salePrice: new Decimal(u.salePrice),
          isDefaultPurchase: u.isDefaultPurchase,
          isDefaultSale: u.isDefaultSale
        }
      })
    }
  }

  return product
}

export async function softDeleteProduct(db: Db, id: string) {
  const current = await db.product.findUnique({ where: { id } })
  if (!current || current.deletedAt) throw new AppError("NOT_FOUND", "Produk tidak ditemukan")
  // M2 will add stock movement guards.
  return db.product.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false, version: { increment: 1 } }
  })
}
