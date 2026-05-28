import { z } from "zod"

export const poItemSchema = z.object({
  id: z.string().cuid().optional(),
  productUnitId: z.string().cuid(),
  qty: z.coerce.number().positive(),
  price: z.coerce.number().min(0),
  discount: z.coerce.number().min(0)
})

export const createPOSchema = z.object({
  supplierId: z.string().cuid(),
  warehouseId: z.string().cuid(),
  orderDate: z.coerce.date(),
  expectedDate: z.coerce.date().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  items: z.array(poItemSchema).min(1)
})

export const updatePOSchema = createPOSchema.extend({
  id: z.string().cuid()
})

export type CreatePOInput = z.infer<typeof createPOSchema>
export type UpdatePOInput = z.infer<typeof updatePOSchema>
