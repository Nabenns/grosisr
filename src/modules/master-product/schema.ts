import { z } from "zod"

export const productUnitSchema = z.object({
  id: z.string().cuid().optional(),
  unitId: z.string().cuid(),
  conversionToBase: z.coerce.number().positive("Konversi harus > 0"),
  barcode: z.string().trim().max(50).nullable().optional(),
  purchasePrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
  isDefaultPurchase: z.boolean(),
  isDefaultSale: z.boolean()
})

export const createProductSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .min(1, "SKU wajib diisi")
      .max(50)
      .regex(/^[A-Z0-9_-]+$/i, "Hanya huruf, angka, _, -"),
    name: z.string().trim().min(1, "Nama wajib diisi").max(200),
    categoryId: z.string().cuid(),
    brandId: z.string().cuid().nullable().optional(),
    baseUnitId: z.string().cuid(),
    description: z.string().max(1000).nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
    hasCukai: z.boolean(),
    hasHet: z.boolean(),
    hetPrice: z.coerce.number().min(0).nullable().optional(),
    minStock: z.coerce.number().int().min(0),
    units: z.array(productUnitSchema).min(1, "Minimal 1 satuan")
  })
  .refine(
    (d) =>
      !d.hasHet ||
      (d.hetPrice !== null && d.hetPrice !== undefined && d.hetPrice > 0),
    {
      message: "HET price wajib jika hasHet=true",
      path: ["hetPrice"]
    }
  )
  .refine(
    (d) =>
      d.units.some((u) => u.unitId === d.baseUnitId && Number(u.conversionToBase) === 1),
    {
      message: "Base unit harus ada di units dengan conversion=1",
      path: ["units"]
    }
  )
  .refine((d) => d.units.filter((u) => u.isDefaultSale).length === 1, {
    message: "Harus pilih tepat 1 default jual",
    path: ["units"]
  })
  .refine((d) => d.units.filter((u) => u.isDefaultPurchase).length === 1, {
    message: "Harus pilih tepat 1 default beli",
    path: ["units"]
  })

export const updateProductSchema = createProductSchema.and(
  z.object({
    id: z.string().cuid(),
    version: z.number().int().min(0)
  })
)

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
